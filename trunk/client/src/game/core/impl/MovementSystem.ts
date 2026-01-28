/**
 * 移动系统 - 参考 War3 设计
 * 
 * 核心逻辑：
 * 1. 总是先尝试直线移动
 * 2. 每帧检查前方 obstacleCheckDistance 内的障碍
 * 3. 碰到障碍自动切换到 A* 寻路
 * 4. 在 A* 跟随中每帧尝试切回直线
 * 
 * 模块依赖：
 * - PathfindingSystem: A* 寻路 + 路径平滑
 * - StraightMovementSystem: 直线移动 + 前方障碍检查
 * - PathFollowingSystem: A* 路径跟随 + 动态切回直线
 * - ObstacleDetection: 视线检查工具
 */

import { GameSystem } from './GameSystemBase';
import { PathfindingSystem, type FlowField, type PathNode } from './PathfindingSystem';
import { StraightMovementSystem } from './StraightMovementSystem';
import { PathFollowingSystem } from './PathFollowingSystem';
import { ObstacleDetection } from './ObstacleDetection';
import { AvoidanceSystem } from './AvoidanceSystem';
import { SteeringBehavior, type AgentState, type SteeringOutput } from './SteeringBehavior';
import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import type { GameMap } from './Map';

/**
 * 寻路模式
 */
export enum PathfindingMode {
    AStar = 'astar',        // A* 寻路
    FlowField = 'flowfield' // Flow Field 流场寻路
}

/**
 * 移动状态
 */
enum MoveState {
    Idle = 'idle',
    MovingStraight = 'moving_straight',  // 直线移动阶段
    Moving = 'moving',                    // 路径跟随阶段
    Turning = 'turning',
    Blocked = 'blocked',
    Arrived = 'arrived',
}

/**
 * 移动指令
 */
interface MoveCommand {
    actorId: string;
    targetX: number;
    targetZ: number;
    targetY?: number;
    speed: number;
    arrivalRadius?: number; // 到达半径（米）
    turnSpeed?: number;     // 转向速度（度/秒）
}

/**
 * 移动状态数据
 */
interface MoveData {
    actor: Actor;
    state: MoveState;
    path: PathNode[];        // 完整路径
    currentPathIndex: number; // 当前路径点索引
    targetX: number;
    targetZ: number;
    targetY: number;
    speed: number;
    arrivalRadius: number;
    turnSpeed: number;
    targetAngle: number;     // 目标朝向（度）
    isPathSmoothed: boolean; // 路径是否已平滑
    obstacleCheckDistance: number; // 障碍检测距离（米）
    
    // 直线移动阶段数据
    tryStraightMove?: boolean;     // 是否尝试直线移动
    straightLineTarget?: { x: number; z: number }; // 直线目标点
    stuckTime?: number;           // 卡住时长（秒）
    lastFrameDistance?: number;   // 上一帧的距离（用于检测是否有进展）
    lastPos?: { x: number; z: number }; // 上一帧的位置（用于检测是否有移动）
    lastTangentDir?: { x: number; z: number }; // 上一帧成功的切线方向（用于平滑贴墙滑动）
    wallStuckFrames?: number;      // 连续贴墙帧数（用于禁用避让力）
    blockedCount?: number;         // 连续被阻挡次数（移动距离很小）
    pauseFrames?: number;          // 暂停剩余帧数（被阻挡后休息）
    slideDistance?: number;        // 累计滑动距离（用于检测方向偏离）
    
    // Steering Behavior 数据
    velocity?: { x: number; z: number }; // 当前速度向量（用于 Steering Behavior）
    maxForce?: number;                // 最大转向力
    maxAngularSpeed?: number;         // 最大角速度（度/秒）

}

/**
 * 移动系统（主协调器）
 */
export class MovementSystem extends GameSystem {
    private _game: Game;
    private _map: GameMap | null = null;
    private _moveData: Map<string, MoveData> = new Map();
    
    // 配置参数
    private _defaultArrivalRadius = 0.1;  // 默认到达半径（米）
    private _defaultTurnSpeed = 360;      // 默认转向速度（度/秒）
    private _defaultObstacleCheckDistance = 3; // 默认障碍检测距离（米）
    
    // 寻路模式开关
    private _pathfindingMode: PathfindingMode = PathfindingMode.AStar; // 默认使用 A* 寻路
    
    // Steering Behavior 开关和参数
    private _enableSteeringBehavior: boolean = false; // 默认关闭 Steering Behavior
    private _defaultMaxForce = 10.0;          // 默认最大转向力
    private _defaultMaxAngularSpeed = 180;     // 默认最大角速度（度/秒）
    private _defaultSlowRadius = 3.0;          // 默认减速半径（米）
    
    constructor(game: Game) {
        super(game);
        this._game = game;
    }

    /**
     * 设置寻路模式
     * @param mode 寻路模式：'astar' 或 'flowfield'
     */
    setPathfindingMode(mode: PathfindingMode): void {
        this._pathfindingMode = mode;
        console.log(`[MovementSystem] Pathfinding mode set to: ${mode}`);
    }

    /**
     * 获取当前寻路模式
     */
    getPathfindingMode(): PathfindingMode {
        return this._pathfindingMode;
    }

    /**
     * 设置是否启用 Steering Behavior
     * @param enabled 是否启用
     */
    setSteeringBehaviorEnabled(enabled: boolean): void {
        this._enableSteeringBehavior = enabled;
        console.log(`[MovementSystem] Steering Behavior ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * 获取是否启用 Steering Behavior
     */
    isSteeringBehaviorEnabled(): boolean {
        return this._enableSteeringBehavior;
    }

    /**
     * 在应用位移前进行地图安全校验：
     * - 边界夹紧（考虑单位半径）
     * - 目标点可行走检查
     * - 线段视线检查（防止穿入墙体）
     * 
     * 参数 onlyDirect: 若为 true，只尝试直线缩短，不尝试切线滑动
     * 用于"未卡住"的情况下，避免不必要的方向搜索
     */
    private _safeMove(actor: Actor, dir: { x: number; z: number }, dist: number, lastTangent?: { x: number; z: number }, onlyDirect: boolean = false): { x: number; z: number } {
        const pos = actor.getPosition();
        const r = actor.getRadius();
        const map = this._map;
        let step = dist;

        const clampTarget = (tx: number, tz: number) => {
            if (!map) return { x: tx, z: tz };
            const w = map.getWidth();
            const h = map.getHeight();
            const clampedX = Math.min(Math.max(tx, r), w - r);
            const clampedZ = Math.min(Math.max(tz, r), h - r);
            return { x: clampedX, z: clampedZ };
        };

        const isStepValid = (tx: number, tz: number) => {
            if (!map) return true;
            if (!map.isWalkable(tx, tz)) return false;
            const los = ObstacleDetection.hasLineOfSight(
                { x: pos.x, y: pos.y, z: pos.z },
                { x: tx, y: pos.y, z: tz },
                map
            );
            return los;
        };

        // 1. 尝试原始步长
        let targetX = pos.x + dir.x * step;
        let targetZ = pos.z + dir.z * step;
        ({ x: targetX, z: targetZ } = clampTarget(targetX, targetZ));
        if (isStepValid(targetX, targetZ)) {
            return { x: targetX - pos.x, z: targetZ - pos.z };
        }

        // 2. 二分缩短步长，最多尝试 3 次
        for (let i = 0; i < 3; i++) {
            step *= 0.5;
            targetX = pos.x + dir.x * step;
            targetZ = pos.z + dir.z * step;
            ({ x: targetX, z: targetZ } = clampTarget(targetX, targetZ));
            if (isStepValid(targetX, targetZ)) {
                return { x: targetX - pos.x, z: targetZ - pos.z };
            }
        }

        // 如果只尝试直线（未卡住的情况），放弃
        if (onlyDirect) {
            return { x: 0, z: 0 };
        }

        // 3. 直线全部失败，只在卡住后才尝试沿切线滑动
        // 优先使用上一帧成功的切线方向（减少抖动）
        const smallStep = dist / 3;
        const tangentDirs = lastTangent 
            ? [lastTangent, { x: -lastTangent.x, z: -lastTangent.z }, { x: -dir.z, z: dir.x }, { x: dir.z, z: -dir.x }]
            : [{ x: -dir.z, z: dir.x }, { x: dir.z, z: -dir.x }];

        for (const tangent of tangentDirs) {
            targetX = pos.x + tangent.x * smallStep;
            targetZ = pos.z + tangent.z * smallStep;
            ({ x: targetX, z: targetZ } = clampTarget(targetX, targetZ));
            if (isStepValid(targetX, targetZ)) {
                // 记录成功的切线方向，返回时带上
                const delta = { x: targetX - pos.x, z: targetZ - pos.z };
                (delta as any).tangentDir = tangent;
                return delta;
            }
        }

        // 放弃移动
        return { x: 0, z: 0 };
    }

    /**
     * 获取单位的障碍检测距离
     */
    private _getObstacleCheckDistance(actor: Actor): number {
        const unitConfig = actor.getUnitConfig();
        if (unitConfig && unitConfig.obstacleCheckDistance !== undefined && unitConfig.obstacleCheckDistance > 0) {
            return unitConfig.obstacleCheckDistance;
        }
        return this._defaultObstacleCheckDistance;
    }

    /**
     * 设置地图引用
     */
    setMap(map: GameMap): void {
        this._map = map;
    }

    init(): void {
        console.log('[MovementSystem] Initialized');
    }

    update(deltaTime: number): void {
        // 预留给非固定帧更新
    }

    fixedUpdate(fixedDeltaTime: number): void {
        // fixedDeltaTime 已为秒
        for (const [actorId, data] of this._moveData) {
            if (!data.actor.isActive() || data.actor.isDead()) {
                this._moveData.delete(actorId);
                continue;
            }

            switch (data.state) {
                case MoveState.MovingStraight:
                    this._updateStraightMove(data, fixedDeltaTime);
                    break;
                case MoveState.Moving:
                    this._updateMoving(data, fixedDeltaTime);
                    break;
                case MoveState.Turning:
                    this._updateTurning(data, fixedDeltaTime);
                    break;
                case MoveState.Blocked:
                    // 被阻挡后，继续尝试直线移动或等待
                    this._updateBlocked(data, fixedDeltaTime);
                    break;
                case MoveState.Arrived:
                    this._moveData.delete(actorId);
                    break;
            }
        }
    }

    /**
     * 移动到目标位置
     */
    moveTo(command: MoveCommand): boolean {
        const actor = this._game.getActor(command.actorId);
        if (!actor) {
            console.warn(`[MovementSystem] Actor ${command.actorId} not found`);
            return false;
        }

        const pos = actor.getPosition();
        const obstacleCheckDistance = this._getObstacleCheckDistance(actor);
        console.log(`[moveTo] Unit ${command.actorId} from (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) to (${command.targetX.toFixed(1)}, ${command.targetZ.toFixed(1)}), entering MovingStraight`);
        
        const moveData: MoveData = {
            actor,
            state: MoveState.MovingStraight,
            path: [],
            currentPathIndex: 0,
            targetX: command.targetX,
            targetZ: command.targetZ,
            targetY: command.targetY ?? 0,
            speed: command.speed,
            arrivalRadius: command.arrivalRadius ?? this._defaultArrivalRadius,
            turnSpeed: command.turnSpeed ?? this._defaultTurnSpeed,
            targetAngle: 0,
            isPathSmoothed: false,
            obstacleCheckDistance: obstacleCheckDistance,
            tryStraightMove: true,
            straightLineTarget: { x: command.targetX, z: command.targetZ },
            stuckTime: 0,
            lastFrameDistance: Number.MAX_VALUE,
            lastPos: { x: pos.x, z: pos.z }, // 初始化进度追踪
            // Steering Behavior 初始化
            velocity: { x: 0, z: 0 },
            maxForce: this._defaultMaxForce,
            maxAngularSpeed: this._defaultMaxAngularSpeed,
        };
        
        this._moveData.set(command.actorId, moveData);
        return true;
    }

    /**
     * 更新直线移动 - 简化版本
     * 逻辑：
     * 1. 检查前方是否有障碍
     * 2. 没有障碍：直接移动 + 滑动
     * 3. 有障碍：切换到 A* 寻路
     */
    private _updateStraightMove(data: MoveData, deltaSeconds: number): void {
        const pos = data.actor.getPosition();
        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // 到达目标
        if (distance < data.arrivalRadius) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }
        
        // 检查前方障碍
        const checkDistance = data.obstacleCheckDistance;
        const checkRatio = Math.min(1, checkDistance / distance);
        const checkX = pos.x + dx * checkRatio;
        const checkZ = pos.z + dz * checkRatio;
        
        const canContinue = ObstacleDetection.hasLineOfSight(
            { x: pos.x, y: pos.y, z: pos.z },
            { x: checkX, y: pos.y, z: checkZ },
            this._map
        );
        
        // 有障碍 -> 根据寻路模式切换到对应的寻路方式
        if (!canContinue) {
            if (this._pathfindingMode === PathfindingMode.AStar) {
                console.log(`[_updateStraightMove] >>> OBSTACLE! Unit ${data.actor.id} switching to A*`);
                this._switchToPathfinding(data);
            } else {
                console.log(`[_updateStraightMove] >>> OBSTACLE! Unit ${data.actor.id} switching to FlowField`);
                this._switchToFlowField(data);
            }
            return;
        }
        
        // 使用 Steering Behavior 或传统移动逻辑
        let moveDir: { x: number; z: number };
        let moveDistance: number;
        
        if (this._enableSteeringBehavior) {
            // 使用 Steering Behavior - Arrive
            const agentState: AgentState = {
                position: { x: pos.x, z: pos.z },
                velocity: data.velocity ?? { x: 0, z: 0 },
                rotation: data.actor.getRotation(),
                maxSpeed: data.speed,
                maxForce: data.maxForce ?? this._defaultMaxForce,
                maxAngularSpeed: data.maxAngularSpeed ?? this._defaultMaxAngularSpeed,
                radius: data.actor.getRadius(),
            };
            
            const target = { x: data.targetX, z: data.targetZ };
            const steering = SteeringBehavior.arrive(
                agentState,
                target,
                this._defaultSlowRadius,
                data.arrivalRadius
            );
            
            // 应用转向力到速度
            if (data.velocity) {
                data.velocity.x += steering.linear.x * deltaSeconds;
                data.velocity.z += steering.linear.z * deltaSeconds;
                
                // 限制速度大小
                const velLen = Math.sqrt(data.velocity.x * data.velocity.x + data.velocity.z * data.velocity.z);
                if (velLen > data.speed) {
                    data.velocity.x = (data.velocity.x / velLen) * data.speed;
                    data.velocity.z = (data.velocity.z / velLen) * data.speed;
                }
            } else {
                data.velocity = { x: steering.linear.x * deltaSeconds, z: steering.linear.z * deltaSeconds };
            }
            
            // 应用角转向力
            if (Math.abs(steering.angular) > 0.1) {
                const currentAngle = data.actor.getRotation();
                const newAngle = currentAngle + steering.angular * deltaSeconds;
                data.actor.setRotation(newAngle);
            }
            
            // 计算移动距离和方向
            moveDistance = Math.sqrt(data.velocity.x * data.velocity.x + data.velocity.z * data.velocity.z) * deltaSeconds;
            moveDir = data.velocity.x !== 0 || data.velocity.z !== 0
                ? SteeringBehavior.normalize(data.velocity)
                : { x: dx / distance, z: dz / distance };
        } else {
            // 使用传统移动逻辑
            moveDir = { x: dx / distance, z: dz / distance };
            moveDistance = data.speed * deltaSeconds;
        }
        
        // 滑动（接触其他单位时自动绕过）
        const slide = AvoidanceSystem.trySlideOnContact(data.actor, moveDir, moveDistance, this._game);
        
        // 执行移动
        const delta = this._safeMove(data.actor, slide.dir, slide.dist, data.lastTangentDir, false);
        data.actor.move(delta.x, 0, delta.z);
        
        // 更新朝向（仅在传统模式下更新，Steering Behavior 模式下已在上面更新）
        if (!this._enableSteeringBehavior) {
            const targetAngle = Math.atan2(slide.dir.z, slide.dir.x) * (180 / Math.PI);
            this._updateRotation(data.actor, targetAngle, data.turnSpeed, deltaSeconds);
        }
    }

    /**
     * 切换为寻路（根据模式选择 A* 或 Flow Field）
     */
    private _switchToPathfinding(data: MoveData): void {
        if (this._pathfindingMode === PathfindingMode.AStar) {
            this._switchToAStar(data);
        } else {
            this._switchToFlowField(data);
        }
    }

    /**
     * 切换为 A* 寻路
     */
    private _switchToAStar(data: MoveData): void {
        const path = PathfindingSystem.findPath(data.actor, data.targetX, data.targetZ, this._map);
        
        if (!path || path.length === 0) {
            console.log(`[_switchToAStar] >>> BLOCKED! Unit ${data.actor.id} no path found`);
            data.state = MoveState.Blocked;
            return;
        }
        
        const smoothedPath = PathfindingSystem.smoothPath(path, this._map!);
        const pos = data.actor.getPosition();
        smoothedPath.unshift({ x: pos.x, y: pos.y, z: pos.z });
        
        // 移除近距离的中间点
        if (smoothedPath.length > 2) {
            const p1 = smoothedPath[1];
            const p2 = smoothedPath[2];
            const dist1 = Math.sqrt(Math.pow(p1.x - pos.x, 2) + Math.pow(p1.z - pos.z, 2));
            const dist2 = Math.sqrt(Math.pow(p2.x - pos.x, 2) + Math.pow(p2.z - pos.z, 2));
            
            if (dist1 < 0.4 && dist2 > dist1) {
                smoothedPath.splice(1, 1);
            }
        }
        
        data.state = MoveState.Moving;
        data.path = smoothedPath;
        data.currentPathIndex = 0;
        data.isPathSmoothed = true;
        
        // 初始化 Steering Behavior 参数
        if (!data.velocity) {
            data.velocity = { x: 0, z: 0 };
        }
        if (!data.maxForce) {
            data.maxForce = this._defaultMaxForce;
        }
        if (!data.maxAngularSpeed) {
            data.maxAngularSpeed = this._defaultMaxAngularSpeed;
        }
    }

    /**
     * 切换为 Flow Field 流场寻路
     */
    private _switchToFlowField(data: MoveData): void {
        if (!this._map) {
            console.warn(`[_switchToFlowField] Map not set`);
            data.state = MoveState.Blocked;
            return;
        }

        const flowField = PathfindingSystem.generateFlowField(
            data.targetX,
            data.targetZ,
            this._map,
            true // 使用缓存
        );

        if (!flowField) {
            console.log(`[_switchToFlowField] >>> BLOCKED! Unit ${data.actor.id} cannot generate FlowField`);
            data.state = MoveState.Blocked;
            return;
        }

        // 检查单位是否在流场可达范围内
        const pos = data.actor.getPosition();
        if (!PathfindingSystem.isReachableInFlowField(pos.x, pos.z, flowField)) {
            console.log(`[_switchToFlowField] >>> UNREACHABLE! Unit ${data.actor.id} not reachable in FlowField`);
            data.state = MoveState.Blocked;
            return;
        }

        data.state = MoveState.Moving;
        (data as any).flowField = flowField; // 临时使用 any，后续可以扩展 MoveData 接口
        data.path = []; // Flow Field 模式下不需要 path
        data.currentPathIndex = 0;
        
        // 初始化 Steering Behavior 参数
        if (!data.velocity) {
            data.velocity = { x: 0, z: 0 };
        }
        if (!data.maxForce) {
            data.maxForce = this._defaultMaxForce;
        }
        if (!data.maxAngularSpeed) {
            data.maxAngularSpeed = this._defaultMaxAngularSpeed;
        }
    }

    /**
     * 更新路径跟随
     */
    /**
     * 更新移动（支持 A* 和 Flow Field 两种模式）
     * 
     * A* 模式逻辑：
     * 1. 跟随路径节点
     * 2. 每帧尝试直线到最终目标
     * 
     * Flow Field 模式逻辑：
     * 1. 查询当前位置的流场方向
     * 2. 沿流场方向移动
     */
    private _updateMoving(data: MoveData, deltaSeconds: number): void {
        const pos = data.actor.getPosition();
        const flowField = (data as any).flowField as FlowField | undefined;

        // Flow Field 模式
        if (flowField) {
            this._updateFlowFieldMove(data, flowField, deltaSeconds);
            return;
        }

        // A* 模式
        this._updateAStarMove(data, deltaSeconds);
    }

    /**
     * A* 路径跟随
     */
    private _updateAStarMove(data: MoveData, deltaSeconds: number): void {
        const pos = data.actor.getPosition();
        
        // 路径已完成
        if (data.currentPathIndex >= data.path.length) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }

        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distToTarget = Math.sqrt(dx * dx + dz * dz);
        
        // 到达目标
        if (distToTarget < data.arrivalRadius) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }
        
        // 尝试直线到最终目标
        const checkDistance = data.obstacleCheckDistance;
        const checkRatio = Math.min(1, checkDistance / distToTarget);
        const checkX = pos.x + dx * checkRatio;
        const checkZ = pos.z + dz * checkRatio;
        
        const canContinue = ObstacleDetection.hasLineOfSight(
            { x: pos.x, y: pos.y, z: pos.z },
            { x: checkX, y: pos.y, z: checkZ },
            this._map
        );
        
        if (canContinue) {
            console.log(`[_updateAStarMove] Unit ${data.actor.id} >>> Switching back to straight line`);
            data.state = MoveState.MovingStraight;
            data.straightLineTarget = { x: data.targetX, z: data.targetZ };
            return;
        }

        // 跟随当前路径节点
        const targetNode = data.path[data.currentPathIndex];
        const dxToNode = targetNode.x - pos.x;
        const dzToNode = targetNode.z - pos.z;
        const distanceToNode = Math.sqrt(dxToNode * dxToNode + dzToNode * dzToNode);

        // 到达路径点
        if (distanceToNode < data.arrivalRadius) {
            data.currentPathIndex++;
            return;
        }

        // 使用 Steering Behavior 或传统移动逻辑
        let moveDir: { x: number; z: number };
        let moveDistance: number;
        
        if (this._enableSteeringBehavior) {
            // 使用 Steering Behavior - Seek
            const agentState: AgentState = {
                position: { x: pos.x, z: pos.z },
                velocity: data.velocity ?? { x: 0, z: 0 },
                rotation: data.actor.getRotation(),
                maxSpeed: data.speed,
                maxForce: data.maxForce ?? this._defaultMaxForce,
                maxAngularSpeed: data.maxAngularSpeed ?? this._defaultMaxAngularSpeed,
                radius: data.actor.getRadius(),
            };
            
            const steering = SteeringBehavior.seek(agentState, { x: targetNode.x, z: targetNode.z });
            
            // 应用转向力到速度
            if (data.velocity) {
                data.velocity.x += steering.linear.x * deltaSeconds;
                data.velocity.z += steering.linear.z * deltaSeconds;
                
                const velLen = Math.sqrt(data.velocity.x * data.velocity.x + data.velocity.z * data.velocity.z);
                if (velLen > data.speed) {
                    data.velocity.x = (data.velocity.x / velLen) * data.speed;
                    data.velocity.z = (data.velocity.z / velLen) * data.speed;
                }
            } else {
                data.velocity = { x: steering.linear.x * deltaSeconds, z: steering.linear.z * deltaSeconds };
            }
            
            // 应用角转向力
            if (Math.abs(steering.angular) > 0.1) {
                const currentAngle = data.actor.getRotation();
                const newAngle = currentAngle + steering.angular * deltaSeconds;
                data.actor.setRotation(newAngle);
            }
            
            moveDistance = Math.sqrt(data.velocity.x * data.velocity.x + data.velocity.z * data.velocity.z) * deltaSeconds;
            const dirX = dxToNode / distanceToNode;
            const dirZ = dzToNode / distanceToNode;
            moveDir = data.velocity.x !== 0 || data.velocity.z !== 0
                ? SteeringBehavior.normalize(data.velocity)
                : { x: dirX, z: dirZ };
        } else {
            // 传统移动逻辑
            const dirX = dxToNode / distanceToNode;
            const dirZ = dzToNode / distanceToNode;
            moveDistance = data.speed * deltaSeconds;
            moveDir = { x: dirX, z: dirZ };
        }
        
        const slide = AvoidanceSystem.trySlideOnContact(data.actor, moveDir, moveDistance, this._game);
        const delta = this._safeMove(data.actor, slide.dir, slide.dist, data.lastTangentDir, false);
        
        data.actor.move(delta.x, 0, delta.z);

        // 更新朝向（仅在传统模式下更新，Steering Behavior 模式下已在上面更新）
        if (!this._enableSteeringBehavior) {
            const targetAngle = Math.atan2(slide.dir.z, slide.dir.x) * (180 / Math.PI);
            this._updateRotation(data.actor, targetAngle, data.turnSpeed, deltaSeconds);
        }
    }

    /**
     * Flow Field 流场移动
     */
    private _updateFlowFieldMove(data: MoveData, flowField: FlowField, deltaSeconds: number): void {
        const pos = data.actor.getPosition();
        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // 到达目标
        if (distance < data.arrivalRadius) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }

        // 接近目标时切换到直线移动（更精确的最后几步）
        const switchToStraightDistance = data.obstacleCheckDistance * 1.5;
        if (distance < switchToStraightDistance) {
            // 检查是否可以直线到达
            const checkDistance = data.obstacleCheckDistance;
            const checkRatio = Math.min(1, checkDistance / distance);
            const checkX = pos.x + dx * checkRatio;
            const checkZ = pos.z + dz * checkRatio;
            
            const canContinue = ObstacleDetection.hasLineOfSight(
                { x: pos.x, y: pos.y, z: pos.z },
                { x: checkX, y: pos.y, z: checkZ },
                this._map
            );
            
            if (canContinue) {
                console.log(`[_updateFlowFieldMove] Unit ${data.actor.id} >>> Near target, switching to straight line`);
                data.state = MoveState.MovingStraight;
                return;
            }
        }

        // 从流场获取移动方向
        const flowDir = PathfindingSystem.getFlowDirectionInterpolated(pos.x, pos.z, flowField);
        if (!flowDir) {
            console.warn(`[_updateFlowFieldMove] Unit ${data.actor.id} cannot get flow direction, regenerating...`);
            this._switchToFlowField(data);
            return;
        }

        // 使用 Steering Behavior 或传统移动逻辑
        let moveDir: { x: number; z: number };
        let moveDistance: number;
        
        if (this._enableSteeringBehavior) {
            // 使用 Steering Behavior - Follow Flow Field
            const agentState: AgentState = {
                position: { x: pos.x, z: pos.z },
                velocity: data.velocity ?? { x: 0, z: 0 },
                rotation: data.actor.getRotation(),
                maxSpeed: data.speed,
                maxForce: data.maxForce ?? this._defaultMaxForce,
                maxAngularSpeed: data.maxAngularSpeed ?? this._defaultMaxAngularSpeed,
                radius: data.actor.getRadius(),
            };
            
            const steering = SteeringBehavior.followFlowField(agentState, flowDir);
            
            // 应用转向力到速度
            if (data.velocity) {
                data.velocity.x += steering.linear.x * deltaSeconds;
                data.velocity.z += steering.linear.z * deltaSeconds;
                
                const velLen = Math.sqrt(data.velocity.x * data.velocity.x + data.velocity.z * data.velocity.z);
                if (velLen > data.speed) {
                    data.velocity.x = (data.velocity.x / velLen) * data.speed;
                    data.velocity.z = (data.velocity.z / velLen) * data.speed;
                }
            } else {
                data.velocity = { x: steering.linear.x * deltaSeconds, z: steering.linear.z * deltaSeconds };
            }
            
            // 应用角转向力
            if (Math.abs(steering.angular) > 0.1) {
                const currentAngle = data.actor.getRotation();
                const newAngle = currentAngle + steering.angular * deltaSeconds;
                data.actor.setRotation(newAngle);
            }
            
            moveDistance = Math.sqrt(data.velocity.x * data.velocity.x + data.velocity.z * data.velocity.z) * deltaSeconds;
            moveDir = data.velocity.x !== 0 || data.velocity.z !== 0
                ? SteeringBehavior.normalize(data.velocity)
                : flowDir;
        } else {
            // 传统移动逻辑
            moveDistance = data.speed * deltaSeconds;
            moveDir = flowDir;
        }
        
        // 滑动（接触其他单位时自动绕过）
        const slide = AvoidanceSystem.trySlideOnContact(data.actor, moveDir, moveDistance, this._game);
        
        // 执行移动
        const delta = this._safeMove(data.actor, slide.dir, slide.dist, data.lastTangentDir, false);
        data.actor.move(delta.x, 0, delta.z);
        
        // 更新朝向（仅在传统模式下更新，Steering Behavior 模式下已在上面更新）
        if (!this._enableSteeringBehavior) {
            const targetAngle = Math.atan2(slide.dir.z, slide.dir.x) * (180 / Math.PI);
            this._updateRotation(data.actor, targetAngle, data.turnSpeed, deltaSeconds);
        }
    }

    /**
     * 更新被阻挡状态：每帧尝试滑动移动，同时定期重新规划路径
     */
    /**
     * 更新完全阻挡状态 - 简化版本
     * 逻辑：
     * 1. 尝试切线滑动（可能逐步绕过）
     * 2. 每帧检查是否能切回直线
     */
    private _updateBlocked(data: MoveData, deltaSeconds: number): void {
        const pos = data.actor.getPosition();
        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // 到达目标
        if (distance < data.arrivalRadius) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }
        
        // 检查是否能切回直线移动
        const checkDistance = data.obstacleCheckDistance;
        const checkRatio = Math.min(1, checkDistance / distance);
        const checkX = pos.x + dx * checkRatio;
        const checkZ = pos.z + dz * checkRatio;
        
        const canContinue = ObstacleDetection.hasLineOfSight(
            { x: pos.x, y: pos.y, z: pos.z },
            { x: checkX, y: pos.y, z: checkZ },
            this._map
        );
        
        if (canContinue) {
            console.log(`[_updateBlocked] Unit ${data.actor.id} >>> Obstacle cleared! Switching back to straight line`);
            data.state = MoveState.MovingStraight;
            return;
        }
        
        // 仍然被阻挡，尝试切线滑动
        const moveDistance = data.speed * deltaSeconds;
        const dirX = dx / distance;
        const dirZ = dz / distance;
        
        const slide = AvoidanceSystem.trySlideOnContact(data.actor, { x: dirX, z: dirZ }, moveDistance, this._game);
        const delta = this._safeMove(data.actor, slide.dir, slide.dist, data.lastTangentDir, false);
        
        // 有微小进展就继续
        const moveDist = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
        if (moveDist > 0.0001) {
            data.actor.move(delta.x, 0, delta.z);
        }
    }

    /**
     * 更新转向状态
     */
    private _updateTurning(data: MoveData, deltaSeconds: number): void {
        const currentAngle = data.actor.getRotation();
        const deltaAngle = this._getShortestAngleDelta(currentAngle, data.targetAngle);
        
        if (Math.abs(deltaAngle) < 1) {
            data.actor.setRotation(data.targetAngle);
            data.state = MoveState.Moving;
        } else {
            const turnAmount = Math.min(Math.abs(deltaAngle), data.turnSpeed * deltaSeconds);
            const newAngle = currentAngle + Math.sign(deltaAngle) * turnAmount;
            data.actor.setRotation(newAngle);
        }
    }

    /**
     * 平滑更新旋转
     */
    private _updateRotation(actor: Actor, targetAngle: number, turnSpeed: number, deltaSeconds: number): void {
        const currentAngle = actor.getRotation();
        const deltaAngle = this._getShortestAngleDelta(currentAngle, targetAngle);
        
        if (Math.abs(deltaAngle) < 1) {
            actor.setRotation(targetAngle);
        } else {
            const turnAmount = Math.min(Math.abs(deltaAngle), turnSpeed * deltaSeconds);
            const newAngle = currentAngle + Math.sign(deltaAngle) * turnAmount;
            actor.setRotation(newAngle);
        }
    }

    /**
     * 获取最短角度差
     */
    private _getShortestAngleDelta(from: number, to: number): number {
        let delta = to - from;
        while (delta > 180) delta -= 360;
        while (delta < -180) delta += 360;
        return delta;
    }

    /**
     * 停止移动
     */
    stopMove(actorId: string): void {
        this._moveData.delete(actorId);
    }

    /**
     * 检查单位是否在移动
     */
    isMoving(actorId: string): boolean {
        const data = this._moveData.get(actorId);
        return data?.state === MoveState.Moving || data?.state === MoveState.Turning;
    }

    /**
     * 获取移动状态
     */
    getMoveState(actorId: string): MoveState | null {
        return this._moveData.get(actorId)?.state ?? null;
    }

    destroy(): void {
        this._moveData.clear();
    }
}
