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
    getPositionByUnitId?: (unitId: string | number) => VectorLike | null;
    /** 可用于通知外部命中/结束 */
    onBulletEnd?: (data: { bulletId: string; reason?: string }) => void;
    /** 运行时默认目标（无需写回配置） */
    defaultTargetUnitId?: number | string;
    defaultTargetPosition?: VectorLike;
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

    constructor(id: string, config: BulletConfig, campId: number, position: FixedVector3 = new FixedVector3(0, 0, 0)) {
        super(id, ActorType.Bullet, config.modelId, config.id, campId, position);
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
        this._emit('bulletStarted', { bulletId: this.id });
    }

    /**
     * 标记子弹结束，触发 bulletEnd 逻辑。
     */
    end(reason?: string): void {
        if (!this.isActive()) return;
        this.setActive(false);
        const ctx = this._runtimeCtx;
        this._runEventTriggers('bulletEnd', { ...(ctx || {}), reason });
        this._emit('bulletEnded', { bulletId: this.id, reason });
        ctx?.onBulletEnd?.({ bulletId: this.id, reason });
    }

    override update(deltaTime: number): void {
        if (!this.isActive()) return;
        this._elapsed += deltaTime;
        if (this._flightController?.isActive()) {
            this._updateFlight(deltaTime);
        }
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

                // 优先使用触发器自带条件/行为，兼容旧版分段级条件/行为
                const conditions = trigger.conditions ?? segment.conditions ?? [];
                if (!this._checkConditions(conditions, ctx)) continue;

                const actions = trigger.actions ?? segment.actions ?? [];
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
        if (!targetPos && !params?.targetUnitId) {
            console.warn('[Bullet] bulletFlyToTarget: no target');
            return;
        }

        const flightConfig: BulletFlightConfig = {
            targetUnitId: params?.targetUnitId,
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

        const getTargetPos = (unitId?: string | number) => {
            if (unitId !== undefined && ctx?.getPositionByUnitId) {
                return ctx.getPositionByUnitId(unitId);
            }
            return targetPos;
        };

        this._flightController = new BulletFlightController(
            flightConfig,
            this.getPosition(),
            getTargetPos
        );
    }

    private _updateFlight(deltaTime: number): void {
        if (!this._flightController) return;
        
        const moveVec = this._flightController.update(this.getPosition(), deltaTime);
        
        if (!moveVec) {
            // 飞行结束（命中或丢失目标）
            if (this._flightController.shouldStopOnHit()) {
                this.end('hit');
            }
            return;
        }

        this.move(moveVec.dx, moveVec.dy, moveVec.dz);
    }

    private _resolveTargetPosition(params: any, ctx: BulletRuntimeContext | undefined): VectorLike | null {
        if (params?.targetPosition) {
            return params.targetPosition;
        }
        if (params?.targetUnitId && ctx?.getPositionByUnitId) {
            return ctx.getPositionByUnitId(params.targetUnitId) || null;
        }
        if (ctx?.defaultTargetUnitId !== undefined && ctx.getPositionByUnitId) {
            return ctx.getPositionByUnitId(ctx.defaultTargetUnitId) || null;
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
                const target = p.targetPosition || (p.targetUnitId ? ctx?.getPositionByUnitId?.(p.targetUnitId) : null);
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
