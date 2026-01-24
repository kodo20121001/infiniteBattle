/**
 * 游戏开发工具类
 * 提供常用的游戏逻辑辅助函数
 */

import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import type { Unit } from './Unit';
import { FixedVector2 } from '../base/fixed/FixedVector2';

/**
 * 距离和方向计算工�?
 */
export class DistanceUtils {
    /**
     * 计算平面距离（地面距离）
     */
    static distance2D(a: FixedVector2, b: FixedVector2): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 计算平面距离的平方（避免开方运算）
     */
    static distanceSquared2D(a: FixedVector2, b: FixedVector2): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }

    /**
     * 计算�?a 指向 b 的角度（度数�?
     */
    static directionAngle(a: FixedVector2, b: FixedVector2): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    /**
     * 计算�?a 指向 b 的方向单位向�?
     */
    static directionVector(a: FixedVector2, b: FixedVector2): { x: number; y: number } {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return { x: 0, y: 0 };
        return { x: dx / dist, y: dy / dist };
    }

    /**
     * 检查两个角色是否在视野范围�?
     */
    static isInSight(observer: Actor, target: Actor, sightRange: number): boolean {
        const dist = DistanceUtils.distance2D(observer.getPosition(), target.getPosition());
        return dist <= sightRange;
    }
}

/**
 * 游戏查询工具
 */
export class QueryUtils {
    /**
     * 查询某阵营范围内的敌方单�?
     */
    static findEnemyUnitsInRange(
        game: Game,
        sourceCampId: number,
        position: FixedVector2,
        range: number
    ): Unit[] {
        const result: Unit[] = [];
        const actors = game.getActors();

        for (const actor of actors) {
            // 跳过友方和相同阵�?
            if (actor.campId === sourceCampId) continue;

            const dist = DistanceUtils.distance2D(actor.getPosition(), position);
            if (dist <= range) {
                result.push(actor as Unit);
            }
        }

        return result;
    }

    /**
     * 查询某阵营范围内的友方单�?
     */
    static findAllyUnitsInRange(
        game: Game,
        sourceCampId: number,
        position: FixedVector2,
        range: number
    ): Unit[] {
        const result: Unit[] = [];
        const actors = game.getActors();

        for (const actor of actors) {
            // 只查询友�?
            if (actor.campId !== sourceCampId) continue;

            const dist = DistanceUtils.distance2D(actor.getPosition(), position);
            if (dist <= range) {
                result.push(actor as Unit);
            }
        }

        return result;
    }

    /**
     * 查询范围内的所有单�?
     */
    static findUnitsInRange(game: Game, position: FixedVector2, range: number): Actor[] {
        const result: Actor[] = [];
        const actors = game.getActors();

        for (const actor of actors) {
            const dist = DistanceUtils.distance2D(actor.getPosition(), position);
            if (dist <= range) {
                result.push(actor);
            }
        }

        return result;
    }

    /**
     * 查询最近的敌方单位
     */
    static findNearestEnemy(
        game: Game,
        sourceCampId: number,
        position: FixedVector2
    ): Unit | null {
        let nearest: Unit | null = null;
        let minDist = Infinity;
        const actors = game.getActors();

        for (const actor of actors) {
            if (actor.campId === sourceCampId) continue;

            const dist = DistanceUtils.distance2D(actor.getPosition(), position);
            if (dist < minDist) {
                minDist = dist;
                nearest = actor as Unit;
            }
        }

        return nearest;
    }

    /**
     * 按距离排序单�?
     */
    static sortActorsByDistance(actors: Actor[], position: FixedVector2): Actor[] {
        return [...actors].sort((a, b) => {
            const distA = DistanceUtils.distance2D(a.getPosition(), position);
            const distB = DistanceUtils.distance2D(b.getPosition(), position);
            return distA - distB;
        });
    }
}

/**
 * 游戏事件辅助工具
 */
export class EventUtils {
    /**
     * 广播伤害事件
     */
    static broadcastDamageEvent(
        game: Game,
        attackerId: string,
        targetId: string,
        damage: number
    ): void {
        const eventSystem = game.getSystem('event') as any;
        if (eventSystem) {
            eventSystem.emit('onDamage', {
                attackerId,
                targetId,
                damage,
                frameIndex: game.getGameState().getFrameIndex(),
            });
        }
    }

    /**
     * 广播单位死亡事件
     */
    static broadcastUnitDeathEvent(game: Game, unitId: string, killerId?: string): void {
        const eventSystem = game.getSystem('event') as any;
        if (eventSystem) {
            eventSystem.emit('onUnitDeath', {
                unitId,
                killerId,
                frameIndex: game.getGameState().getFrameIndex(),
            });
        }
    }

    /**
     * 广播移动事件
     */
    static broadcastMoveEvent(
        game: Game,
        actorId: string,
        targetX: number,
        targetY: number
    ): void {
        const eventSystem = game.getSystem('event') as any;
        if (eventSystem) {
            eventSystem.emit('onMove', {
                actorId,
                targetX,
                targetY,
                frameIndex: game.getGameState().getFrameIndex(),
            });
        }
    }

    /**
     * 广播位移事件（相对位移）
     */
    static broadcastMoveByEvent(
        game: Game,
        actorId: string,
        distance: number,
        angle: number
    ): void {
        const eventSystem = game.getSystem('event') as any;
        if (eventSystem) {
            eventSystem.emit('onMoveBy', {
                actorId,
                distance,
                angle,
                frameIndex: game.getGameState().getFrameIndex(),
            });
        }
    }
}

/**
 * 随机数工具（帧同步友好）
 * 支持相同种子生成相同随机序列
 */
export class RandomUtils {
    private static _seed: number = 1;

    /**
     * 设置随机种子（用于帧同步�?
     */
    static setSeed(seed: number): void {
        RandomUtils._seed = seed;
    }

    /**
     * 获取当前种子
     */
    static getSeed(): number {
        return RandomUtils._seed;
    }

    /**
     * 线性同余生成器（确定性随机数�?
     * 用于帧同步，确保所有客户端和服务器产生相同的随机序�?
     */
    private static _lcg(): number {
        RandomUtils._seed = (RandomUtils._seed * 1664525 + 1013904223) >>> 0;
        return RandomUtils._seed / 0xffffffff;
    }

    /**
     * 获取 [0, 1) 范围的随机数
     */
    static random(): number {
        return RandomUtils._lcg();
    }

    /**
     * 获取 [min, max) 范围的随机整�?
     */
    static randomInt(min: number, max: number): number {
        const range = max - min;
        return Math.floor(RandomUtils._lcg() * range) + min;
    }

    /**
     * 获取 [min, max) 范围的随机浮点数
     */
    static randomFloat(min: number, max: number): number {
        const range = max - min;
        return RandomUtils._lcg() * range + min;
    }

    /**
     * 从数组中随机选择一个元�?
     */
    static choice<T>(array: T[]): T {
        return array[RandomUtils.randomInt(0, array.length)];
    }

    /**
     * 计算概率是否触发
     */
    static chance(probability: number): boolean {
        return RandomUtils._lcg() < probability;
    }
}

/**
 * 动画时间管理
 */
export class AnimationUtils {
    /**
     * 计算动画帧号
     */
    static getAnimationFrame(
        frameIndex: number,
        totalFrames: number,
        duration: number
    ): number {
        const framesPerFrame = duration / totalFrames;
        return Math.floor(frameIndex / framesPerFrame) % totalFrames;
    }

    /**
     * 计算动画进度 (0-1)
     */
    static getAnimationProgress(
        frameIndex: number,
        duration: number
    ): number {
        const progress = (frameIndex % duration) / duration;
        return Math.min(1, progress);
    }

    /**
     * 缓动函数 - 线�?
     */
    static easeLinear(t: number): number {
        return t;
    }

    /**
     * 缓动函数 - 加速（二次�?
     */
    static easeInQuad(t: number): number {
        return t * t;
    }

    /**
     * 缓动函数 - 减速（二次�?
     */
    static easeOutQuad(t: number): number {
        return t * (2 - t);
    }

    /**
     * 缓动函数 - 加速减速（二次�?
     */
    static easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
}

/**
 * 数学工具
 */
export class MathUtils {
    /**
     * 将角度限制在 [0, 360) 范围�?
     */
    static normalizeAngle(angle: number): number {
        angle = angle % 360;
        return angle < 0 ? angle + 360 : angle;
    }

    /**
     * 计算两个角度的差值（-180 �?180�?
     */
    static angleDifference(a: number, b: number): number {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }

    /**
     * 线性插�?
     */
    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    /**
     * 限制值在范围�?
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 平滑阶跃函数
     */
    static smoothstep(edge0: number, edge1: number, x: number): number {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }
}

