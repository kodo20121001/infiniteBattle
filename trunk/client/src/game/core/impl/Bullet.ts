import { Actor, ActorType } from './Actor';
import { FixedVector3 } from '../base/fixed/FixedVector3';
import { BulletFlightController, type BulletFlightConfig } from './BulletFlightController';
import type {
    BulletActionConfig,
    BulletActionType,
    BulletConfig,
    BulletConditionConfig,
    BulletConditionType,
    BulletSegmentConfig,
    BulletTriggerEventType,
} from '../config/BulletConfig';

type VectorLike = { x: number; y: number; z?: number };

export type BulletEventType = 'bulletStarted' | 'bulletEnded' | 'triggerFired';

/**
 * 运行时上下文，供触发器/条件/行为取数据或访问系统。
 */
export interface BulletRuntimeContext {
    /** 可用于查询单位位置 */
    getPositionByActorNo?: (actorNo: number | string) => VectorLike | null;
    /** 可用于造成伤害 */
    causeDamage?: (attackerId: string, targetId: string, damage: number) => boolean;
    /** 可用于通知外部命中/结束 */
    onBulletEnd?: (data: { bulletId: string; reason?: string }) => void;
    /** 运行时默认目标（无需写回配置） */
    defaultTargetActorNo?: number | string;
    defaultTargetPosition?: VectorLike;
    /** 子弹结束原因（运行时附加） */
    reason?: string;
}

/**
 * 子弹实现：继承 Actor，内置触发器驱动，行为参考 LevelManager 的触发执行模式。
 */
export class Bullet extends Actor {
    private _config: BulletConfig;
    private _segments: BulletSegmentConfig[];
    private _listeners: Map<BulletEventType, Set<(data: any) => void>> = new Map();
    private _elapsed: number = 0;
    private _flightController: BulletFlightController | null = null;
    private _runtimeCtx: BulletRuntimeContext | undefined;

    constructor(actorNo: string, config: BulletConfig, campId: number, position: FixedVector3 = new FixedVector3(0, 0, 0)) {
        super(actorNo, ActorType.Bullet, config.modelId, campId, position);
        this._config = config;
        this._segments = config.segments || [];
    }

    /**
    * 启动子弹，触发 bulletStart 逻辑。
    */
    start(ctx?: BulletRuntimeContext): void {
        this._runtimeCtx = ctx;
        this._elapsed = 0;
        this.setActive(true);
        this._runEventTriggers('bulletStart', ctx);
        this._emit('bulletStarted', { bulletId: this.actorNo });
        super.start();
    }

    /**
     * 标记子弹结束，触发 bulletEnd 逻辑。
     */
    end(reason?: string): void {
        if (!this.isActive()) return;
        this.setActive(false);
        const ctx = this._runtimeCtx;
        this._runEventTriggers('bulletEnd', { ...(ctx || {}), reason });
        this._emit('bulletEnded', { bulletId: this.actorNo, reason });
        ctx?.onBulletEnd?.({ bulletId: this.actorNo, reason });
    }

    override update(deltaTime: number): void {
        if (!this.isActive()) return;
        this._elapsed += deltaTime;
        if (this._flightController?.isActive()) {
            this._updateFlight(deltaTime);
        }
    }

    /**
     * 获取当前目标位置（用于渲染系统访问）
     */
    getTargetPosition(): VectorLike | null {
        return this._resolveTargetPosition({}, this._runtimeCtx);
    }

    /**
     * 获取运行时上下文（用于渲染系统访问）
     */
    getRuntimeContext(): BulletRuntimeContext | undefined {
        return this._runtimeCtx;
    }

    on(eventType: BulletEventType, listener: (data: any) => void): () => void {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, new Set());
        }
        this._listeners.get(eventType)!.add(listener);
        return () => this.off(eventType, listener);
    }

    off(eventType: BulletEventType, listener: (data: any) => void): void {
        this._listeners.get(eventType)?.delete(listener);
    }

    private _runEventTriggers(eventType: BulletTriggerEventType, ctx: BulletRuntimeContext | undefined): void {
        if (this._segments.length === 0) return;
        const matchedSegments = this._segments.filter(seg => seg.triggers?.some(t => t.eventType === eventType));
        for (const segment of matchedSegments) {
            for (const trigger of segment.triggers || []) {
                if (trigger.eventType !== eventType) continue;

                // 检查条件
                const conditions = trigger.conditions ?? [];
                if (!this._checkConditions(conditions, ctx)) continue;

                // 执行行为
                const actions = trigger.actions ?? [];
                for (const action of actions) {
                    this._executeAction(action, ctx);
                }

                this._emit('triggerFired', { segmentId: segment.id, eventType });
            }
        }
    }

    private _executeAction(action: BulletActionConfig, ctx: BulletRuntimeContext | undefined): void {
        switch (action.type as BulletActionType) {
            case 'bulletFlyToTarget':
                this._handleFlyToTarget(action.params, ctx);
                break;
            case 'bulletDamage':
                this._handleBulletDamage(action.params, ctx);
                break;
            case 'customAction':
            default:
                console.warn(`[Bullet] Unsupported action type: ${action.type}`);
                break;
        }
    }

    private _handleFlyToTarget(params: any, ctx: BulletRuntimeContext | undefined): void {
        const speed = params?.speed ?? 5;
        const acceleration = params?.acceleration ?? 0;
        const maxSpeed = params?.maxSpeed;
        const arc = params?.arc ?? 0;
        const homing = params?.homing ?? false;
        const homingRate = params?.homingRate ?? 180;
        const collisionRadius = params?.collisionRadius ?? 0.1;
        const stopOnHit = params?.stopOnHit !== false;
        
        const targetPos = this._resolveTargetPosition(params, ctx);
        if (!targetPos && !params?.targetActorNo) {
            console.warn('[Bullet] bulletFlyToTarget: no target');
            return;
        }

        const flightConfig: BulletFlightConfig = {
            targetActorNo: params?.targetActorNo,
            targetPosition: targetPos || undefined,
            speed,
            acceleration,
            maxSpeed,
            arc,
            homing,
            homingRate,
            collisionRadius,
            stopOnHit
        };

        const getTargetPos = (unitNo?: number) => {
            if (unitNo !== undefined && ctx?.getPositionByActorNo) {
                return ctx.getPositionByActorNo(unitNo);
            }
            return targetPos;
        };

        this._flightController = new BulletFlightController(
            flightConfig,
            this.getPosition(),
            getTargetPos
        );
    }

    private _handleBulletDamage(params: any, ctx: BulletRuntimeContext | undefined): void {
        if (!ctx?.causeDamage) {
            console.warn('[Bullet] bulletDamage: causeDamage not available in context');
            return;
        }

        // TODO: 支持triggerType='range'的范围伤害
        // 目前只实现了triggerType='target'的单体伤害
        
        // 获取目标ID（从ctx的defaultTargetActorNo获取）
        const targetId = ctx.defaultTargetActorNo;
        if (!targetId) {
            console.warn('[Bullet] bulletDamage: no target specified');
            return;
        }

        // 计算伤害值（参考SkillSystem._applyDamageEvent）
        let damage = params?.damageValue || 0;
        
        // 注意：子弹没有skill.table，所以damageKey和damageRatioKey暂时无法使用
        // 如果需要支持，需要在runtime context中传递table
        if (params?.damageKey) {
            console.warn('[Bullet] bulletDamage: damageKey not supported yet (no skill table in bullet context)');
        }

        // 应用伤害倍率
        if (params?.damageRatio) {
            damage *= params.damageRatio;
        }
        if (params?.damageRatioKey) {
            console.warn('[Bullet] bulletDamage: damageRatioKey not supported yet (no skill table in bullet context)');
        }

        if (damage <= 0) {
            console.warn('[Bullet] bulletDamage: damage is 0 or negative');
            return;
        }

        console.log(`[Bullet] ${this.actorNo} dealing ${Math.floor(damage)} damage to ${targetId}`);
        const success = ctx.causeDamage(this.actorNo, String(targetId), Math.floor(damage));
        console.log(`[Bullet] Damage result: ${success ? 'success' : 'failed'}`);
    }

    private _updateFlight(deltaTime: number): void {
        if (!this._flightController) return;
        
        const moveVec = this._flightController.update(this.getPosition(), deltaTime);
        
        if (!moveVec) {
            // 飞行结束（命中或丢失目标）
            if (this._flightController.shouldStopOnHit()) {
                console.log(`[Bullet] ${this.actorNo} collision detected! Triggering bulletHit and end('hit')`);
                // 先触发击中事件
                this._runEventTriggers('bulletHit', this._runtimeCtx);
                // 再触发结束事件
                this.end('hit');
            }
            return;
        }

        // 根据移动方向更新朝向（俯视角：X-Z 平面）
        if (Math.abs(moveVec.dx) > 0.0001 || Math.abs(moveVec.dz) > 0.0001) {
            // 反向 X 轴以匹配游戏坐标系的镜像
            const angleRad = Math.atan2(moveVec.dz, -moveVec.dx);
            const angleDeg = angleRad * (180 / Math.PI);
            this.setRotation(angleDeg);
        }

        this.move(moveVec.dx, moveVec.dy, moveVec.dz);
    }

    private _resolveTargetPosition(params: any, ctx: BulletRuntimeContext | undefined): VectorLike | null {
        if (params?.targetPosition) {
            return params.targetPosition;
        }
        if (params?.targetActorNo && ctx?.getPositionByActorNo) {
            return ctx.getPositionByActorNo(params.targetActorNo) || null;
        }
        if (ctx?.defaultTargetActorNo !== undefined && ctx.getPositionByActorNo) {
            return ctx.getPositionByActorNo(ctx.defaultTargetActorNo) || null;
        }
        if (ctx?.defaultTargetPosition) {
            return ctx.defaultTargetPosition;
        }
        return null;
    }

    private _checkConditions(conditions: BulletConditionConfig[], ctx: BulletRuntimeContext | undefined): boolean {
        for (const cond of conditions) {
            if (!this._checkCondition(cond, ctx)) {
                return false;
            }
        }
        return true;
    }

    private _checkCondition(condition: BulletConditionConfig, ctx: BulletRuntimeContext | undefined): boolean {
        switch (condition.type as BulletConditionType) {
            case 'bulletLifetimeGreater':
                return this._elapsed >= (condition.params as any).lifetimeSec;
            case 'bulletDistanceLess': {
                const p = condition.params as any;
                const target = p.targetPosition || (p.targetActorNo ? ctx?.getPositionByActorNo?.(p.targetActorNo) : null);
                if (!target) return false;
                const pos = this.getPosition();
                const dx = target.x - pos.x;
                const dy = target.y - pos.y;
                const dz = (target.z ?? 0) - pos.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                return dist <= p.maxDistance;
            }
            case 'customCondition':
            default:
                console.warn(`[Bullet] Unsupported condition type: ${condition.type}`);
                return false;
        }
    }

    private _emit(eventType: BulletEventType, data: any): void {
        const listeners = this._listeners.get(eventType);
        if (!listeners) return;
        for (const listener of listeners) {
            try {
                listener(data);
            } catch (err) {
                console.error(`[Bullet] listener error for ${eventType}:`, err);
            }
        }
    }
}
