import type { FixedVector3 } from '../base/fixed/FixedVector3';

type VectorLike = { x: number; y: number; z?: number };

/**
 * 子弹飞行状态配置
 */
export interface BulletFlightConfig {
    /** 目标单位ID（动态追踪） */
    targetActorNo?: number;
    /** 目标位置（静态目标） */
    targetPosition?: VectorLike;
    /** 初始速度 */
    speed: number;
    /** 加速度 */
    acceleration: number;
    /** 最高速度限制 */
    maxSpeed?: number;
    /** 抛物线弧度高度（0=直线） */
    arc: number;
    /** 是否启用导弹追踪 */
    homing: boolean;
    /** 追踪转向速率（度/秒） */
    homingRate: number;
    /** 碰撞检测半径 */
    collisionRadius: number;
    /** 命中后是否停止 */
    stopOnHit: boolean;
}

/**
 * 飞行运行时状态
 */
interface FlightRuntimeState {
    /** 当前速度 */
    currentSpeed: number;
    /** 当前方向（归一化向量） */
    direction: { x: number; y: number; z: number };
    /** 起点位置（用于抛物线计算） */
    startPosition: VectorLike;
    /** 飞行总距离（用于抛物线计算） */
    totalDistance: number;
    /** 已飞行距离 */
    traveledDistance: number;
    /** 是否激活 */
    active: boolean;
}

/**
 * 子弹飞行控制器
 * 负责处理子弹的复杂飞行逻辑：直线、抛物线、导弹追踪、碰撞检测等
 */
export class BulletFlightController {
    private _config: BulletFlightConfig;
    private _state: FlightRuntimeState;
    private _getTargetPosition: (unitId?: number) => VectorLike | null;

    constructor(
        config: BulletFlightConfig,
        startPosition: VectorLike,
        getTargetPosition: (unitId?: number) => VectorLike | null
    ) {
        this._config = config;
        this._getTargetPosition = getTargetPosition;

        const target = this._resolveCurrentTarget();
        const direction = this._calculateDirection(startPosition, target);
        const totalDistance = this._calculateDistance(startPosition, target);

        this._state = {
            currentSpeed: config.speed,
            direction,
            startPosition: { ...startPosition },
            totalDistance,
            traveledDistance: 0,
            active: true
        };
    }

    /**
     * 更新飞行状态
     * @returns 移动向量 { dx, dy, dz } 或 null（结束飞行）
     */
    update(currentPosition: VectorLike, deltaTime: number): { dx: number; dy: number; dz: number } | null {
        if (!this._state.active) return null;

        const target = this._resolveCurrentTarget();
        if (!target) {
            this._state.active = false;
            return null;
        }

        // 检查碰撞
        if (this._checkCollision(currentPosition, target)) {
            this._state.active = false;
            return null;
        }

        // 更新速度（加速度）
        this._updateSpeed(deltaTime);

        // 计算移动距离
        const moveDist = this._state.currentSpeed * deltaTime;
        this._state.traveledDistance += moveDist;

        // 导弹追踪：动态调整方向
        if (this._config.homing) {
            this._updateHomingDirection(currentPosition, target, deltaTime);
        }

        // 计算基础移动向量
        let dx = this._state.direction.x * moveDist;
        let dy = this._state.direction.y * moveDist;
        let dz = this._state.direction.z * moveDist;

        // 抛物线：添加垂直偏移
        if (this._config.arc !== 0) {
            const arcOffset = this._calculateArcOffset();
            dz += arcOffset * deltaTime; // 将偏移量应用到垂直分量
        }

        return { dx, dy, dz };
    }

    isActive(): boolean {
        return this._state.active;
    }

    shouldStopOnHit(): boolean {
        return this._config.stopOnHit;
    }

    private _resolveCurrentTarget(): VectorLike | null {
        // 优先追踪动态目标
        if (this._config.targetActorNo !== undefined) {
            const pos = this._getTargetPosition(this._config.targetActorNo);
            if (pos) return pos;
        }
        // 静态目标
        return this._config.targetPosition || null;
    }

    private _updateSpeed(deltaTime: number): void {
        this._state.currentSpeed += this._config.acceleration * deltaTime;
        if (this._config.maxSpeed !== undefined) {
            this._state.currentSpeed = Math.min(this._state.currentSpeed, this._config.maxSpeed);
        }
    }

    private _updateHomingDirection(currentPos: VectorLike, target: VectorLike, deltaTime: number): void {
        const targetDir = this._calculateDirection(currentPos, target);
        
        // 计算转向角度限制（基于homingRate）
        const maxTurnRadians = (this._config.homingRate * Math.PI / 180) * deltaTime;
        
        // 计算当前方向与目标方向的夹角
        const dot = this._state.direction.x * targetDir.x + 
                    this._state.direction.y * targetDir.y + 
                    this._state.direction.z * targetDir.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        if (angle <= maxTurnRadians) {
            // 直接转向目标
            this._state.direction = targetDir;
        } else {
            // 按最大转向速率插值
            const t = maxTurnRadians / angle;
            this._state.direction = this._normalizeVector({
                x: this._state.direction.x + (targetDir.x - this._state.direction.x) * t,
                y: this._state.direction.y + (targetDir.y - this._state.direction.y) * t,
                z: this._state.direction.z + (targetDir.z - this._state.direction.z) * t
            });
        }
    }

    private _calculateArcOffset(): number {
        if (this._state.totalDistance <= 0) return 0;
        
        // 抛物线公式：高度 = 4 * arc * t * (1 - t)
        // t 是飞行进度 [0, 1]
        const progress = Math.min(1, this._state.traveledDistance / this._state.totalDistance);
        const arcHeight = 4 * this._config.arc * progress * (1 - progress);
        
        // 返回相对于直线路径的垂直偏移增量
        const prevProgress = Math.max(0, (this._state.traveledDistance - this._state.currentSpeed * 0.016) / this._state.totalDistance);
        const prevArcHeight = 4 * this._config.arc * prevProgress * (1 - prevProgress);
        
        return (arcHeight - prevArcHeight) / 0.016; // 转换为速度
    }

    private _checkCollision(currentPos: VectorLike, target: VectorLike): boolean {
        if (this._config.collisionRadius <= 0) {
            // 使用默认的近距离判定
            const distSq = this._calculateDistanceSq(currentPos, target);
            return distSq <= 0.01;
        }
        
        const dist = this._calculateDistance(currentPos, target);
        return dist <= this._config.collisionRadius;
    }

    private _calculateDirection(from: VectorLike, to: VectorLike | null): { x: number; y: number; z: number } {
        if (!to) return { x: 1, y: 0, z: 0 };
        
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = (to.z ?? 0) - (from.z ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < 0.001) return { x: 1, y: 0, z: 0 };
        
        return {
            x: dx / dist,
            y: dy / dist,
            z: dz / dist
        };
    }

    private _calculateDistance(from: VectorLike, to: VectorLike | null): number {
        if (!to) return 0;
        return Math.sqrt(this._calculateDistanceSq(from, to));
    }

    private _calculateDistanceSq(from: VectorLike, to: VectorLike): number {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = (to.z ?? 0) - (from.z ?? 0);
        return dx * dx + dy * dy + dz * dz;
    }

    private _normalizeVector(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len < 0.001) return { x: 1, y: 0, z: 0 };
        return {
            x: v.x / len,
            y: v.y / len,
            z: v.z / len
        };
    }
}
