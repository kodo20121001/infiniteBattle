/**
 * 移动系统 - 参考 War3 设计
 * 
 * 功能模块：
 * 1. 寻路层：A* 寻路算法
 * 2. 路径跟随：沿路径点移动
 * 3. 转向系统：平滑转向
 * 4. 避让系统：单位间碰撞避让
 * 5. 到达判定：目标接近处理
 */

import { GameSystem } from './GameSystemBase';
import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import type { GameMap } from './Map';

/**
 * 路径点
 */
interface PathNode {
    x: number;
    y: number; // 高度
    z: number; // 深度
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
}

/**
 * A* 寻路节点
 */
interface AStarNode {
    x: number;
    z: number;
    g: number; // 起点到当前点的实际代价
    h: number; // 当前点到终点的启发式估计
    f: number; // f = g + h
    parent: AStarNode | null;
}

/**
 * 移动系统
 */
export class MovementSystem extends GameSystem {
    private _game: Game;
    private _map: GameMap | null = null;
    private _moveData: Map<string, MoveData> = new Map();
    
    // 配置参数
    private _defaultArrivalRadius = 0.1;  // 默认到达半径（米）- 减小以更精确跟随路径
    private _defaultTurnSpeed = 360;      // 默认转向速度（度/秒）
    private _defaultObstacleCheckDistance = 3; // 默认障碍检测距离（米）
    private _pathSmoothRadius = 1.0;      // 路径平滑半径
    private _collisionRadius = 0.5;       // 碰撞半径
    
    constructor(game: Game) {
        super(game);
        this._game = game;
    }

    /**
     * 获取单位的障碍检测距离
     */
    private _getObstacleCheckDistance(actor: Actor): number {
        // 首先尝试从单位配置读取
        const unitConfig = actor.getUnitConfig();
        if (unitConfig && unitConfig.obstacleCheckDistance !== undefined && unitConfig.obstacleCheckDistance > 0) {
            return unitConfig.obstacleCheckDistance;
        }
        // 否则使用默认值
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
        const deltaSeconds = fixedDeltaTime / 1000;
        
        for (const [actorId, data] of this._moveData) {
            if (!data.actor.isActive() || data.actor.isDead()) {
                this._moveData.delete(actorId);
                continue;
            }

            switch (data.state) {
                case MoveState.MovingStraight:
                    this._updateStraightMove(data, deltaSeconds);
                    break;
                case MoveState.Moving:
                    this._updateMoving(data, deltaSeconds);
                    break;
                case MoveState.Turning:
                    this._updateTurning(data, deltaSeconds);
                    break;
                case MoveState.Blocked:
                case MoveState.Arrived:
                    // 这些状态在update中会被删除
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

        // 如果没有地图，直接线性移动
        if (!this._map) {
            return this._moveDirectly(command);
        }

        const pos = actor.getPosition();
        
        // War3风格：总是先尝试直线走，碰到障碍再自动切换A*
        // 不用初始的全路线检查，而是依赖逐帧的前方障碍检查
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
        };
        
        this._moveData.set(command.actorId, moveData);
        return true;
    }

    /**
     * 直接移动（无寻路）
     */
    private _moveDirectly(command: MoveCommand): boolean {
        const actor = this._game.getActor(command.actorId);
        if (!actor) return false;

        const obstacleCheckDistance = this._getObstacleCheckDistance(actor);
        const pos = actor.getPosition();
        const moveData: MoveData = {
            actor,
            state: MoveState.Moving,
            path: [
                { x: pos.x, y: pos.y, z: pos.z },
                { x: command.targetX, y: command.targetY ?? 0, z: command.targetZ }
            ],
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
        };

        this._moveData.set(command.actorId, moveData);
        return true;
    }

    /**
     * A* 寻路
     */
    private _findPath(actor: Actor, targetX: number, targetZ: number): PathNode[] | null {
        if (!this._map) return null;

        const mapConfig = this._map.getConfig();
        const gridWidth = mapConfig.gridWidth ?? 1;
        const gridHeight = mapConfig.gridHeight ?? 1;
        const colCount = mapConfig.colCount ?? 0;
        const rowCount = mapConfig.rowCount ?? 0;

        if (colCount <= 0 || rowCount <= 0) {
            console.warn('[MovementSystem] Invalid map grid config');
            return null;
        }

        const pos = actor.getPosition();
        const startCol = Math.floor(pos.x / gridWidth);
        const startRow = Math.floor(pos.z / gridHeight);
        const endCol = Math.floor(targetX / gridWidth);
        const endRow = Math.floor(targetZ / gridHeight);

        // 边界检查
        if (startCol < 0 || startCol >= colCount || startRow < 0 || startRow >= rowCount ||
            endCol < 0 || endCol >= colCount || endRow < 0 || endRow >= rowCount) {
            console.warn('[MovementSystem] Start or end position out of bounds');
            return null;
        }

        // 检查终点是否可行走
        const targetWalkable = this._map.isWalkable(targetX, targetZ);
        if (!targetWalkable) {
            console.warn('[MovementSystem] Target position is blocked');
            return null;
        }

        // A* 算法
        const openList: AStarNode[] = [];
        const closedSet = new Set<string>();
        
        const startNode: AStarNode = {
            x: startCol,
            z: startRow,
            g: 0,
            h: this._heuristic(startCol, startRow, endCol, endRow),
            f: 0,
            parent: null,
        };
        startNode.f = startNode.g + startNode.h;
        openList.push(startNode);

        while (openList.length > 0) {
            // 找到 f 值最小的节点
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) {
                    currentIndex = i;
                }
            }

            const current = openList[currentIndex];
            
            // 到达终点
            if (current.x === endCol && current.z === endRow) {
                return this._reconstructPath(current, gridWidth, gridHeight);
            }

            // 移到 closed 集合
            openList.splice(currentIndex, 1);
            closedSet.add(`${current.x},${current.z}`);

            // 检查相邻节点（8方向）
            const neighbors = this._getNeighbors(current.x, current.z, colCount, rowCount);
            
            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.z}`;
                if (closedSet.has(key)) continue;

                // 检查是否可行走
                const worldX = neighbor.x * gridWidth + gridWidth / 2;
                const worldZ = neighbor.z * gridHeight + gridHeight / 2;
                const walkable = this._map.isWalkable(worldX, worldZ);
                if (!walkable) {
                    continue;
                }

                const isDiagonal = neighbor.x !== current.x && neighbor.z !== current.z;
                const moveCost = isDiagonal ? 1.414 : 1.0;
                const tentativeG = current.g + moveCost;

                // 查找是否已在 open 列表
                let existingNode = openList.find(n => n.x === neighbor.x && n.z === neighbor.z);
                
                if (!existingNode) {
                    const newNode: AStarNode = {
                        x: neighbor.x,
                        z: neighbor.z,
                        g: tentativeG,
                        h: this._heuristic(neighbor.x, neighbor.z, endCol, endRow),
                        f: 0,
                        parent: current,
                    };
                    newNode.f = newNode.g + newNode.h;
                    openList.push(newNode);
                } else if (tentativeG < existingNode.g) {
                    existingNode.g = tentativeG;
                    existingNode.f = existingNode.g + existingNode.h;
                    existingNode.parent = current;
                }
            }
        }

        console.warn('[MovementSystem] No path found');
        return null;
    }

    /**
     * 启发式函数（曼哈顿距离）
     */
    private _heuristic(x1: number, z1: number, x2: number, z2: number): number {
        return Math.abs(x1 - x2) + Math.abs(z1 - z2);
    }

    /**
     * 获取相邻节点（8方向）
     */
    private _getNeighbors(x: number, z: number, colCount: number, rowCount: number): Array<{ x: number; z: number }> {
        const neighbors: Array<{ x: number; z: number }> = [];
        const directions = [
            { dx: -1, dz: 0 },  // 左
            { dx: 1, dz: 0 },   // 右
            { dx: 0, dz: -1 },  // 上
            { dx: 0, dz: 1 },   // 下
            { dx: -1, dz: -1 }, // 左上
            { dx: 1, dz: -1 },  // 右上
            { dx: -1, dz: 1 },  // 左下
            { dx: 1, dz: 1 },   // 右下
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const nz = z + dir.dz;
            if (nx >= 0 && nx < colCount && nz >= 0 && nz < rowCount) {
                neighbors.push({ x: nx, z: nz });
            }
        }

        return neighbors;
    }

    /**
     * 重建路径
     */
    private _reconstructPath(endNode: AStarNode, gridWidth: number, gridHeight: number): PathNode[] {
        const path: PathNode[] = [];
        let current: AStarNode | null = endNode;

        while (current) {
            // 转换为世界坐标（格子中心）
            const worldX = current.x * gridWidth + gridWidth / 2;
            const worldZ = current.z * gridHeight + gridHeight / 2;
            path.unshift({ x: worldX, y: 0, z: worldZ });
            current = current.parent;
        }

        return path;
    }

    /**
     * 路径平滑
     */
    private _smoothPath(path: PathNode[]): PathNode[] {
        if (path.length <= 2) return path;

        const smoothed: PathNode[] = [path[0]];
        let current = 0;

        while (current < path.length - 1) {
            let farthest = current + 1;
            
            // 找到最远的可见点
            for (let i = current + 2; i < path.length; i++) {
                if (this._hasLineOfSight(path[current], path[i])) {
                    farthest = i;
                } else {
                    break;
                }
            }

            smoothed.push(path[farthest]);
            current = farthest;
        }

        return smoothed;
    }

    /**
     * 检查两点间是否有直线视线
     * 使用DDA算法遍历直线经过的每一个格子
     */
    private _hasLineOfSight(from: PathNode, to: PathNode): boolean {
        if (!this._map) return true;

        const mapConfig = this._map.getConfig();
        const gridWidth = mapConfig.gridWidth ?? 1;
        const gridHeight = mapConfig.gridHeight ?? 1;

        // 转换为格子坐标（格子左上角）
        let x0 = Math.floor(from.x / gridWidth);
        let y0 = Math.floor(from.z / gridHeight);
        let x1 = Math.floor(to.x / gridWidth);
        let y1 = Math.floor(to.z / gridHeight);

        // DDA算法：遍历直线经过的所有格子
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;

        // 主循环遍历
        let err = dx - dy;
        let x = x0;
        let y = y0;
        const visitedCells = new Set<string>();

        while (true) {
            const cellKey = `${x},${y}`;
            if (!visitedCells.has(cellKey)) {
                visitedCells.add(cellKey);
                
                // 检查这个格子是否可行走
                const checkX = x * gridWidth + gridWidth / 2;
                const checkZ = y * gridHeight + gridHeight / 2;
                
                if (!this._map.isWalkable(checkX, checkZ)) {
                    return false;
                }
            }

            if (x === x1 && y === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return true;
    }

    /**
     * 更新直线移动状态（War3风格）
     * 每帧检测前方距离内是否有障碍，有则立即切换到A*寻路
     * 距离来自单位配置（obstacleCheckDistance），不同单位可以有不同的"视线距离"
     */
    private _updateStraightMove(data: MoveData, deltaSeconds: number): void {
        const pos = data.actor.getPosition();
        
        // 检查是否已到达最终目标
        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < data.arrivalRadius) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }
        
        // 每帧检测前方是否被阻挡
        // 检查沿着移动方向一小段距离内是否能通过
        const checkDistance = data.obstacleCheckDistance; // 从单位配置读取
        const checkRatio = Math.min(1, checkDistance / distance);
        const checkX = pos.x + dx * checkRatio;
        const checkZ = pos.z + dz * checkRatio;
        
        const canContinue = this._hasLineOfSight(
            { x: pos.x, y: pos.y, z: pos.z },
            { x: checkX, y: pos.y, z: checkZ }
        );
        
        // 前方被阻挡，切换到A*寻路
        if (!canContinue) {
            console.log(`[_updateStraightMove] >>> OBSTACLE DETECTED! Unit ${data.actor.id}, switching to A*`);
            this._switchToPathfinding(data);
            return;
        }
        
        // 继续直线移动（朝向最终目标）
        const moveDistance = data.speed * deltaSeconds;
        const moveRatio = Math.min(1, moveDistance / distance);
        data.actor.move(dx * moveRatio, 0, dz * moveRatio);
        
        // 更新朝向（朝向最终目标）
        const targetAngle = Math.atan2(dz, dx) * (180 / Math.PI);
        this._updateRotation(data.actor, targetAngle, data.turnSpeed, deltaSeconds);
    }

    /**
     * 切换为A*寻路
     */
    private _switchToPathfinding(data: MoveData): void {
        const pos = data.actor.getPosition();
        
        const path = this._findPath(data.actor, data.targetX, data.targetZ);
        
        if (!path || path.length === 0) {
            console.log(`[_switchToPathfinding] >>> BLOCKED! Unit ${data.actor.id} no path found`);
            data.state = MoveState.Blocked;
            return;
        }
        
        // 路径平滑
        const smoothedPath = this._smoothPath(path);
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
        
        // 切换到路径跟随状态
        data.state = MoveState.Moving;
        data.path = smoothedPath;
        data.currentPathIndex = 0;
        data.isPathSmoothed = true;
    }

    /**
     * 更新移动状态
     */
    private _updateMoving(data: MoveData, deltaSeconds: number): void {
        const pos = data.actor.getPosition();
        
        // 获取当前目标路径点
        if (data.currentPathIndex >= data.path.length) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }

        // War3风格优化：在A*路径跟随中，每帧尝试直线到最终目标
        // 这样可以在障碍消失或位置变化后立即改为直线移动
        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distToTarget = Math.sqrt(dx * dx + dz * dz);
        
        // 检查是否已到达目标
        if (distToTarget < data.arrivalRadius) {
            data.state = MoveState.Arrived;
            this._moveData.delete(data.actor.id);
            return;
        }
        
        // 尝试直线到最终目标
        if (this._hasLineOfSight(
            { x: pos.x, y: pos.y, z: pos.z },
            { x: data.targetX, y: pos.y, z: data.targetZ }
        )) {
            // 检查前方是否有障碍（保持与 _updateStraightMove 的一致性）
            const checkDistance = data.obstacleCheckDistance;
            const checkRatio = Math.min(1, checkDistance / distToTarget);
            const checkX = pos.x + dx * checkRatio;
            const checkZ = pos.z + dz * checkRatio;
            
            const canContinue = this._hasLineOfSight(
                { x: pos.x, y: pos.y, z: pos.z },
                { x: checkX, y: pos.y, z: checkZ }
            );
            
            // 前方没有障碍，才切回直线移动
            if (canContinue) {
                console.log(`[_updateMoving] Unit ${data.actor.id} >>> SWITCHING BACK to straight line`);
                data.state = MoveState.MovingStraight;
                data.straightLineTarget = { x: data.targetX, z: data.targetZ };
                return;
            }
        }

        // 继续按A*路径跟随
        const targetNode = data.path[data.currentPathIndex];
        const dxToNode = targetNode.x - pos.x;
        const dzToNode = targetNode.z - pos.z;
        const distanceToNode = Math.sqrt(dxToNode * dxToNode + dzToNode * dzToNode);

        // 到达当前路径点
        if (distanceToNode < data.arrivalRadius) {
            data.currentPathIndex++;
            if (data.currentPathIndex >= data.path.length) {
                data.state = MoveState.Arrived;
                this._moveData.delete(data.actor.id);
            }
            return;
        }

        // 计算移动
        const moveDistance = data.speed * deltaSeconds;
        const moveRatio = Math.min(1, moveDistance / distanceToNode);
        
        data.actor.move(dxToNode * moveRatio, 0, dzToNode * moveRatio);

        // 更新朝向（朝向当前路径点）
        const targetAngle = Math.atan2(dzToNode, dxToNode) * (180 / Math.PI);
        this._updateRotation(data.actor, targetAngle, data.turnSpeed, deltaSeconds);
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
