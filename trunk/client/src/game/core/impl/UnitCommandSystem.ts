/**
 * 单位指令系统
 * 支持基础命令：Idle、Stop、MoveTo、AttackMove、HoldPosition、Guard
 * 简化版本：用于演示关卡，让单位可自动施放技能和保持站位
 */

import { GameSystem } from './GameSystem';
import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import { SkillSystem } from './SkillSystem';
import { MovementSystem } from './MovementSystem';
import { getSkillConfig } from '../config/SkillConfig';

export type UnitCommandType = 'Idle' | 'Stop' | 'MoveTo' | 'AttackMove' | 'HoldPosition' | 'Guard';

export interface UnitCommand {
    type: UnitCommandType;
    targetPos?: { x: number; y: number }; // 俯视平面坐标（x, z=y）
    guardPos?: { x: number; y: number };  // 守卫原点
    visionRadius?: number;                // 视野半径
}

interface CommandState {
    command: UnitCommand;
    hasIssuedMove?: boolean;
    hasStoppedOnce?: boolean;
    lastChaseTargetPos?: { x: number; z: number };
}

interface AutoSkill {
    skillConfig: any;          // 直接复用编辑器传入的 skillConfig
    cooldown: number;          // 冷却（秒）
    lastCastTime: number;      // 上次施放时间（秒）
    castRange: number;         // 施法距离
}

interface BaseAttack {
    lastAttackTime: number;    // 上次攻击时间（秒）
}

export class UnitCommandSystem extends GameSystem {
    private _commands: Map<string, CommandState> = new Map();
    private _autoSkills: Map<string, AutoSkill> = new Map();
    private _baseAttacks: Map<string, BaseAttack> = new Map();
    private _game: Game;

    constructor(game: Game) {
        super(game);
        this._game = game;
    }

    init(): void {}

    update(deltaTime: number): void {}

    fixedUpdate(fixedDeltaTime: number): void {
        const actors = this._game.getActors();
        const movement = this._game.getSystem<MovementSystem>('movement');
        const skillSystem = this._game.getSystem<SkillSystem>('skill');

        const nowSeconds = this._game.getGameState().getElapsedTime();

        for (const actor of actors) {
            const state = this._commands.get(actor.id);
            if (!state) continue;

            const cmd = state.command;

            // 处理自动施法：守卫 / 攻击移动 / 原地防守
            if (skillSystem) {
                const autoSkill = this._autoSkills.get(actor.id);
                if (autoSkill) {
                    const target = this._findNearestEnemy(actor, autoSkill.castRange || 300);
                    if (target && nowSeconds - autoSkill.lastCastTime >= autoSkill.cooldown) {
                        this._tryCastSkill(skillSystem, actor, target, autoSkill.skillConfig);
                        autoSkill.lastCastTime = nowSeconds;
                    }
                }
                
                // 处理基础攻击（HoldPosition / Guard 时自动攻击）
                if ((cmd.type === 'HoldPosition' || cmd.type === 'Guard') && !autoSkill) {
                    this._tryBaseAttack(skillSystem, actor, nowSeconds);
                }
            }

            // 移动类命令 - 使用新的 MovementSystem
            if (cmd.type === 'MoveTo' || cmd.type === 'AttackMove') {
                // AttackMove：寻找视野内敌人并追击/施法
                let shouldIssueMoveCommand = true;
                
                if (cmd.type === 'AttackMove' && movement && skillSystem) {
                    const unitCfg = actor.getUnitConfig();
                    const sightRange = unitCfg?.sightRange ?? 0;
                    const attackSkillId = actor.getAttackSkillId();
                    
                    const skillConfig = attackSkillId > 0 ? getSkillConfig(attackSkillId) : undefined;
                    const castRange = skillConfig?.castRange ?? 5;

                    if (sightRange > 0) {
                        const enemy = this._findNearestEnemy(actor, sightRange);
                        
                        if (enemy) {
                            const pos = actor.getPosition();
                            const targetPos = enemy.getPosition();
                            const dx = targetPos.x - pos.x;
                            const dz = targetPos.z - pos.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);

                            if (dist > castRange) {
                                const last = state.lastChaseTargetPos;
                                const movedEnough = !last || Math.hypot(targetPos.x - last.x, targetPos.z - last.z) > 0.5;
                                if (movedEnough) {
                                    movement.moveTo({
                                        actorId: actor.id,
                                        targetX: targetPos.x,
                                        targetZ: targetPos.z,
                                        speed: actor.getSpeed(),
                                    });
                                    state.lastChaseTargetPos = { x: targetPos.x, z: targetPos.z };
                                }
                            } else {
                                // 距离足够，停止移动并施放技能
                                if (movement.stopMove) {
                                    movement.stopMove(actor.id);
                                }
                                this._tryBaseAttack(skillSystem, actor, nowSeconds, enemy);
                            }
                            // 已处理敌人，不再发送目标点移动
                            shouldIssueMoveCommand = false;
                        }
                    }
                }

                // 普通移动或没有敌人时，继续原目标
                if (shouldIssueMoveCommand && !state.hasIssuedMove && movement && cmd.targetPos) {
                    const speed = actor.getSpeed();
                    movement.moveTo({
                        actorId: actor.id,
                        targetX: cmd.targetPos.x,
                        targetZ: cmd.targetPos.y,
                        speed,
                    });
                    state.hasIssuedMove = true;
                }
            }

            // 守卫：回到守卫点
            if (cmd.type === 'Guard' && movement) {
                const guardPos = cmd.guardPos;
                if (guardPos) {
                    const pos = actor.getPosition();
                    const dx = guardPos.x - pos.x;
                    const dz = guardPos.y - pos.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist > 1) {
                        movement.moveTo({
                            actorId: actor.id,
                            targetX: guardPos.x,
                            targetZ: guardPos.y,
                            speed: actor.getSpeed(),
                        });
                    }
                }
            }

            // HoldPosition：不做移动，保持原位（移动由外部打断）
            if (cmd.type === 'HoldPosition') {
                // 只在进入命令时停一次，让技能驱动的位移（如 moveBy）不被持续打断
                if (movement && !state.hasStoppedOnce) {
                    movement.stopMove(actor.id);
                    state.hasStoppedOnce = true;
                }
            }

            // Stop / Idle：清除移动
            if (cmd.type === 'Stop' || cmd.type === 'Idle') {
                if (movement && !state.hasStoppedOnce) {
                    movement.stopMove(actor.id);
                    state.hasStoppedOnce = true;
                }
            }
        }
    }

    destroy(): void {
        this._commands.clear();
        this._autoSkills.clear();
        this._baseAttacks.clear();
    }

    /**
     * 下达指令
     */
    issueCommand(actorId: string, command: UnitCommand): void {
        this._commands.set(actorId, { command, hasIssuedMove: false });
        if (command.type === 'Stop' || command.type === 'Idle') {
            const movement = this._game.getSystem<MovementSystem>('movement');
            movement?.stopMove(actorId);
        }
    }

    /**
     * 设置自动施法
     */
    setAutoSkill(actorId: string, skillConfig: any, options?: { cooldown?: number; castRange?: number }): void {
        this._autoSkills.set(actorId, {
            skillConfig,
            cooldown: options?.cooldown ?? 2,
            lastCastTime: -999,
            castRange: options?.castRange ?? 300,
        });
    }

    /**
     * 找到最近的敌对单位
     */
    private _findNearestEnemy(actor: Actor, radius: number): Actor | null {
        const actors = this._game.getActors();
        let best: Actor | null = null;
        let bestDist = Number.MAX_VALUE;

        for (const other of actors) {
            if (other.campId === actor.campId || other.isDead()) continue;
            const posA = actor.getPosition();
            const posB = other.getPosition();
            const dx = posB.x - posA.x;
            const dz = posB.z - posA.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= radius && dist < bestDist) {
                best = other;
                bestDist = dist;
            }
        }
        return best;
    }

    /**
     * 尝试施放技能
     */
    private _tryCastSkill(skillSystem: SkillSystem, caster: Actor, target: Actor, skillConfig: any): void {
        if (!skillConfig) return;
        // 直接使用 skillConfig 作为行为配置，不通过 ID 查表
        skillSystem.castSkill({
            caster,
            target,
            skillId: skillConfig.id || 0,
            skillData: skillConfig,
            behaviorConfig: skillConfig,
        });
    }

    /**
     * 尝试基础攻击（使用 attackSkillId）
     */
    private _tryBaseAttack(skillSystem: SkillSystem, actor: Actor, nowSeconds: number, targetOverride?: Actor): void {
        const attackSkillId = actor.getAttackSkillId();
        if (attackSkillId <= 0) return;

        // 初始化该单位的攻击状态
        if (!this._baseAttacks.has(actor.id)) {
            this._baseAttacks.set(actor.id, { lastAttackTime: -999 });
        }

        const attackState = this._baseAttacks.get(actor.id)!;

        // 读取施放距离
        const skillConfig = getSkillConfig(attackSkillId);
        const castRange = skillConfig?.castRange ?? 300;
        
        // 查找目标
        const target = targetOverride ?? this._findNearestEnemy(actor, castRange);
        if (!target) return;

        // 攻击冷却（固定 1 秒）
        const attackCooldown = 1.0;
        const elapsed = nowSeconds - attackState.lastAttackTime;
        
        // 首次攻击或冷却结束
        const isFirstAttack = attackState.lastAttackTime < 0;
        const canAttack = isFirstAttack || elapsed >= attackCooldown;
        
        if (canAttack) {
            skillSystem.castSkill({
                caster: actor,
                target,
                skillId: attackSkillId
            });
            attackState.lastAttackTime = nowSeconds;
        }
    }
}