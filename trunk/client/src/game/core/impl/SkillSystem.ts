/**
 * 技能系统
 * 负责技能的加载、解析、释放和效果应用
 */

import type { Actor } from './Actor';
import type { Game } from './GameSystem';
import { GameSystem } from './GameSystemBase';
import { EventUtils } from './GameUtils';
import { Bullet } from './Bullet';
import { Configs } from '../../common/Configs';
import type { SkillBehaviorConfig, SkillBehaviorEvent } from '../config/SkillBehaviorConfig';
import { getSkillBehaviorConfig } from '../config/SkillBehaviorConfig';
import { getSkillConfig, type SkillConfig } from '../config/SkillConfig';
import type { StatusSystem } from './StatusSystem';

/**
 * 技能执行上下文
 */
export interface SkillContext {
    caster: Actor;          // 释放者
    target?: Actor;         // 目标单位（可选）
    skillId: number;        // 技能ID
    skillData?: SkillConfig; // 技能参数表
    behaviorConfig?: SkillBehaviorConfig; // 技能行为配置
}

/**
 * 技能系统
 * 集成技能配置、事件处理、效果应用
 */
export class SkillSystem extends GameSystem {
    /**
     * 活跃的技能释放任务
     * key: 释放者ID_技能ID，value: 延迟任务ID数组
     */
    private _activeSkillCasts: Map<string, ReturnType<typeof setTimeout>[]> = new Map();

    init(): void {
        // 初始化逻辑
    }

    update(deltaTime: number): void {
        // 更新逻辑
    }

    fixedUpdate(fixedDeltaTime: number): void {
        // 固定帧更新逻辑
    }

    /**
     * 释放技能
     * @param context 技能执行上下文
     */
    castSkill(context: SkillContext): void {
        const { caster, target, skillId, skillData: passedSkillData, behaviorConfig: passedBehaviorConfig } = context;

        // 获取技能配置（优先用传入的，再从配置表查）
        let skillData = passedSkillData;
        if (!skillData) {
            skillData = getSkillConfig(skillId);
            if (!skillData) {
                console.warn(`Skill not found: ${skillId}`);
                return;
            }
        }

        // 获取技能行为配置（优先用传入的，再从配置表查）
        let behaviorConfig = passedBehaviorConfig;
        if (!behaviorConfig) {
            behaviorConfig = getSkillBehaviorConfig(skillData.skillBehaviorId);
            if (!behaviorConfig) {
                console.warn(`Skill behavior not found: ${skillData.skillBehaviorId}`);
                return;
            }
        }

        // 执行技能
        this._executeSkill({
            caster,
            target,
            skillId,
            skillData,
            behaviorConfig,
        });
    }

    /**
     * 执行技能（内部方法）
     */
    private _executeSkill(context: SkillContext): void {
        const { caster, target, skillData, behaviorConfig } = context;

        if (!skillData || !behaviorConfig) return;

        // 切换施法动画状态（仅 Unit）
        const statusSystem = this.game.getSystem<StatusSystem>('status');
        statusSystem?.setCast(caster.id);
        const maxDelay = this._getMaxEventTime(behaviorConfig);
        const restoreDelayMs = Math.max(0, maxDelay) * 1000;
        setTimeout(() => {
            if (!caster.isDead()) {
                statusSystem?.setIdle(caster.id);
            }
        }, restoreDelayMs);

        // 遍历所有分段
        for (const segment of behaviorConfig.segments) {
            // 遍历分段内的所有事件
            for (const event of segment.events) {
                this._scheduleEvent(caster, target, event, skillData);
            }
        }
    }

    /**
     * 获取技能行为中最大的事件时间（秒）
     */
    private _getMaxEventTime(behaviorConfig: SkillBehaviorConfig): number {
        let maxTime = 0;
        for (const segment of behaviorConfig.segments) {
            for (const event of segment.events) {
                const t = event.time ?? 0;
                if (t > maxTime) maxTime = t;
            }
        }
        return maxTime;
    }

    /**
     * 调度事件执行（带时间延迟）
     * 内部统一使用秒(s)作为时间单位
     */
    private _scheduleEvent(
        caster: Actor,
        target: Actor | undefined,
        event: SkillBehaviorEvent,
        skillData: SkillConfig
    ): void {
        // event.time 单位为秒，需要转换为毫秒用于 setTimeout
        const delayInSeconds = event.time || 0;
        const delayInMilliseconds = delayInSeconds * 1000;
        const taskKey = `${caster.id}_${skillData.id}`;

        // 创建延迟任务
        const timeoutId = setTimeout(() => {
            this._applyEvent(caster, target, event, skillData);

            // 清理任务
            const tasks = this._activeSkillCasts.get(taskKey);
            if (tasks) {
                const index = tasks.indexOf(timeoutId);
                if (index > -1) {
                    tasks.splice(index, 1);
                }
                if (tasks.length === 0) {
                    this._activeSkillCasts.delete(taskKey);
                }
            }
        }, delayInMilliseconds);

        // 记录任务
        if (!this._activeSkillCasts.has(taskKey)) {
            this._activeSkillCasts.set(taskKey, []);
        }
        this._activeSkillCasts.get(taskKey)!.push(timeoutId);
    }

    /**
     * 应用事件效果
     */
    private _applyEvent(
        caster: Actor,
        target: Actor | undefined,
        event: SkillBehaviorEvent,
        skillData: SkillConfig
    ): void {
        const { type, data } = event;
        // 容错：兼容编辑器填写的大小写差异（例如 moveby / moveBy）
        const normalizedType = (type || '').toLowerCase();

        switch (normalizedType) {
            case 'damage':
                this._applyDamageEvent(caster, target, data, skillData);
                break;

            case 'moveby':
                this._applyMoveByEvent(caster, data, skillData);
                break;

            case 'bullet':
                this._applyBulletEvent(caster, target, data, skillData);
                break;

            case 'effect':
            case 'shake':
            case 'sound':
            case 'animation':
                // 其他事件类型可在这里实现
                console.log(`Event type ${type} not yet implemented`);
                break;

            case 'end':
                console.log('Skill ended');
                break;

            default:
                console.warn(`Unknown event type: ${type}`);
        }
    }

    /**
     * 应用伤害事件
     */
    private _applyDamageEvent(
        caster: Actor,
        target: Actor | undefined,
        data: any,
        skillData: SkillConfig
    ): void {
        if (!target) return;

        // 获取伤害值（优先使用参数表，否则使用配置中的固定值）
        let damage = data.damageValue || 0;
        if (data.damageKey && skillData.table) {
            const tableValue = skillData.table[data.damageKey];
            if (typeof tableValue === 'number') {
                damage = tableValue;
            }
        }

        // 应用伤害倍率（如果存在）
        if (data.damageRatio) {
            damage *= data.damageRatio;
        }
        if (data.damageRatioKey && skillData.table) {
            const ratioValue = skillData.table[data.damageRatioKey];
            if (typeof ratioValue === 'number') {
                damage *= ratioValue;
            }
        }

        // 通过伤害系统应用伤害
        const damageSystem = this.game.getSystem('damage') as any;
        if (damageSystem && damage > 0) {
            damageSystem.causeDamage(caster.id, target.id, Math.floor(damage));
            EventUtils.broadcastDamageEvent(this.game, caster.id, target.id, Math.floor(damage));
        }
    }

    /**
     * 应用子弹事件
     */
    private _applyBulletEvent(
        caster: Actor,
        target: Actor | undefined,
        data: any,
        skillData: SkillConfig
    ): void {
        const bulletId = data.bulletId;
        if (!bulletId) {
            console.warn('[SkillSystem] Bullet event missing bulletId');
            return;
        }

        // 获取子弹配置
        const bulletConfigs = Configs.Get('bullet');
        if (!bulletConfigs || !bulletConfigs[bulletId]) {
            console.warn(`[SkillSystem] Bullet config not found: ${bulletId}`);
            return;
        }
        const bulletConfig = bulletConfigs[bulletId];

        // 确定发射位置
        // 修复：避免 position 引用共享，需 clone
        const startPos = data.fromCaster ? caster.getPosition().clone() : { x: 0, y: 0, z: 0 };

        // 确定目标位置或目标单位
        let targetActorNo: string | number | undefined;
        let targetPosition: { x: number; y: number; z?: number } | undefined;

        if (data.toTarget && target) {
            // 使用实例ID便于跟踪移动目标
            targetActorNo = target.id;
            targetPosition = target.getPosition();
        } else if (data.targetActorNo) {
            targetActorNo = data.targetActorNo;
        } else if (data.targetPosition) {
            targetPosition = data.targetPosition;
        }

        // 若缺少目标，则默认沿施法者朝向前方 1 米，避免无目标导致子弹不发射
        if (!targetActorNo && !targetPosition) {
            const pos = caster.getPosition();
            targetPosition = { x: pos.x + 1, y: pos.y, z: pos.z };
        }

        // 创建子弹（不改全局配置，目标通过 runtime ctx 传递）
        const bulletId_str = `bullet_${caster.id}_${Date.now()}_${Math.random()}`;
        const bullet = new Bullet(bulletId_str, bulletConfig, caster.campId, startPos);

        // 启动子弹，传递运行时上下文
        bullet.start({
            getPositionByActorNo: (actorNo: number) => {
                // 从游戏中查找单位位置（通过实例ID）
                const actor = this.game.getActor(String(actorNo));
                return actor ? actor.getPosition() : null;
            },
            defaultTargetActorNo: targetActorNo,
            defaultTargetPosition: targetPosition,
            onBulletEnd: (data: any) => {
                console.log('[SkillSystem] Bullet ended:', data);
                // 移除子弹
                (this.game as any).removeActor?.(bullet.id);
            }
        });

        // 将子弹添加到游戏系统
        (this.game as any).addActor?.(bullet);
    }

    /**
     * 应用位移事件
     * 内部统一使用秒(s)作为时间单位
     */
    private _applyMoveByEvent(
        caster: Actor,
        data: any,
        skillData: SkillConfig
    ): void {
        // 获取距离值
        let distance = data.distance || 0;
        if (data.distanceKey && skillData.table) {
            const tableValue = skillData.table[data.distanceKey];
            if (typeof tableValue === 'number') {
                distance = tableValue;
            }
        }

        // 获取角度值
        let angle = data.angle || 0;
        if (data.angleKey && skillData.table) {
            const tableValue = skillData.table[data.angleKey];
            if (typeof tableValue === 'number') {
                angle = tableValue;
            }
        }

        // 获取持续时间（秒）
        let duration = data.duration || 0;

        // 应用位移
        if (distance !== 0) {
            const moveBySystem = this.game.getSystem('moveBy') as any;
            const movementSystem = this.game.getSystem('movement') as any;
            
            if (duration > 0 && movementSystem) {
                // 使用移动系统进行插值移动
                const radians = angle * (Math.PI / 180);
                const dx = distance * Math.cos(radians);
                const dz = distance * Math.sin(radians);
                const targetPos = caster.getPosition();
                const targetX = targetPos.x + dx;
                const targetZ = targetPos.z + dz;
                // speed 单位为 单位/秒
                const speed = distance / duration;
                movementSystem.moveTo({
                    actorId: caster.id,
                    targetX,
                    targetZ,
                    speed,
                    arrivalRadius: 0.1,
                });
            } else if (moveBySystem) {
                // 瞬间位移
                moveBySystem.applyMoveBy(caster, distance, angle);
            }

            EventUtils.broadcastMoveByEvent(this.game, caster.id, distance, angle);
        }
    }

    /**
     * 停止单位的所有技能释放
     */
    cancelSkillCasts(casterActorId: string): void {
        // 查找所有包含该释放者的任务
        const keysToDelete: string[] = [];

        for (const [key, tasks] of this._activeSkillCasts) {
            if (key.startsWith(`${casterActorId}_`)) {
                // 清理该释放者的所有延迟任务
                for (const timeoutId of tasks) {
                    clearTimeout(timeoutId);
                }
                keysToDelete.push(key);
            }
        }

        // 删除已清理的任务记录
        for (const key of keysToDelete) {
            this._activeSkillCasts.delete(key);
        }
    }

    destroy(): void {
        // 清理所有延迟任务
        for (const tasks of this._activeSkillCasts.values()) {
            for (const timeoutId of tasks) {
                clearTimeout(timeoutId);
            }
        }
        this._activeSkillCasts.clear();
    }
}
