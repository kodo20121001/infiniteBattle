/**
 * 单位指令系统
 * 支持基础命令：Idle、Stop、MoveTo、AttackMove、HoldPosition、Guard
 * 简化版本：用于演示关卡，让单位可自动施放技能和保持站位
 */

import { GameSystem } from './GameSystem';
import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import { ActorType } from './Actor';
import { SkillSystem } from './SkillSystem';
import { MovementSystem } from './MovementSystem';
import { getSkillConfig } from '../config/SkillConfig';
import type { MapPath } from '../config/MapConfig';
import { Configs } from '../../common/Configs';

export type UnitCommandType = 'Idle' | 'Stop' | 'MoveTo' | 'AttackMove' | 'HoldPosition' | 'Guard' | 'AttackMovePath';

export interface UnitCommand {
    type: UnitCommandType;
    targetPos?: { x: number; z: number }; // 目标位置
    guardPos?: { x: number; z: number };  // 守卫原点
    visionRadius?: number;                // 视野半径
    
    // AttackMovePath 参数（由外部指定）
    pathId?: number;           // 路径ID
    startIndex?: number;       // 起始点索引
    direction?: 1 | -1;        // 方向：1=正向，-1=反向
}

interface CommandState {
    command: UnitCommand;
    hasIssuedMove?: boolean;
    hasStoppedOnce?: boolean;
    lastChaseTargetPos?: { x: number; z: number };
    lastTrackedPos?: { x: number; z: number };  // 为了追踪位置变化
    
    // AttackMovePath 状态
    currentPathIndex?: number;  // 当前目标点索引
    pathPoints?: Array<{ x: number; z: number }>;  // 缓存的路径点
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
            if (actor.actorType !== ActorType.Unit) continue;
            const state = this._commands.get(actor.actorNo);
            if (!state) continue;

            const cmd = state.command;

            // 处理自动施法：守卫 / 攻击移动 / 原地防守
            if (skillSystem) {
                const autoSkill = this._autoSkills.get(actor.actorNo);
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

            // AttackMovePath：沿路径攻击移动
            if (cmd.type === 'AttackMovePath') {
                this._handleAttackMovePath(actor, state, movement, skillSystem, nowSeconds);
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
                                        actorId: actor.actorNo,
                                        targetX: targetPos.x,
                                        targetZ: targetPos.z,
                                        speed: actor.getSpeed(),
                                    });
                                    state.lastChaseTargetPos = { x: targetPos.x, z: targetPos.z };
                                }
                            } else {
                                // 距离足够，停止移动并施放技能
                                if (movement.stopMove) {
                                    movement.stopMove(actor.actorNo);
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
                        actorId: actor.actorNo,
                        targetX: cmd.targetPos.x,
                        targetZ: cmd.targetPos.z,
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
                    const dz = guardPos.z - pos.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist > 1) {
                        movement.moveTo({
                            actorId: actor.actorNo,
                            targetX: guardPos.x,
                            targetZ: guardPos.z,
                            speed: actor.getSpeed(),
                        });
                    }
                }
            }

            // HoldPosition：不做移动，保持原位（移动由外部打断）
            if (cmd.type === 'HoldPosition') {
                // 只在进入命令时停一次，让技能驱动的位移（如 moveBy）不被持续打断
                if (movement && !state.hasStoppedOnce) {
                    movement.stopMove(actor.actorNo);
                    state.hasStoppedOnce = true;
                }
            }

            // Stop / Idle：清除移动
            if (cmd.type === 'Stop' || cmd.type === 'Idle') {
                if (movement && !state.hasStoppedOnce) {
                    movement.stopMove(actor.actorNo);
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
        const state: CommandState = { command, hasIssuedMove: false };
        
        // 初始化 AttackMovePath 状态
        if (command.type === 'AttackMovePath' && command.pathId !== undefined) {
            const pathPoints = this._loadPathPoints(command.pathId);
            if (pathPoints) {
                state.pathPoints = pathPoints;
                
                // 如果没有指定起始点，根据方向自动查找
                if (command.startIndex === undefined) {
                    const actor = this._game.getActors().find(a => a.actorNo === actorId);
                    if (actor) {
                        const direction = command.direction ?? 1;
                        const startIndex = this._findPathStartIndex(actor.getPosition(), pathPoints, direction);
                        state.currentPathIndex = startIndex;
                    }
                } else {
                    state.currentPathIndex = command.startIndex;
                }
            }
        }
        
        this._commands.set(actorId, state);
        
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
            if (other.actorType !== ActorType.Unit && other.actorType !== ActorType.Building) continue;
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
     * 加载路径点
     */
    private _loadPathPoints(pathId: number): Array<{ x: number; z: number }> | null {
        const levelManager = this._game.getLevelManager();
        if (!levelManager) {
            console.warn('[UnitCommandSystem] _loadPathPoints: levelManager not found');
            return null;
        }
        
        const sceneManager = levelManager.getSceneManager();
        const mapConfig = sceneManager?.getMapConfig();
        if (!mapConfig || !mapConfig.paths) return null;
        
        const path = mapConfig.paths.find((p: MapPath) => p.id === pathId);
        if (!path || !path.points) return null;
        
        return path.points.map(p => ({ x: p.x, z: p.z }));
    }

    /**
     * 查找路径起始点索引
     * @param unitPos 单位当前位置
     * @param pathPoints 路径点数组
     * @param direction 方向：1=找z大于单位的第一个点，-1=找z小于单位的第一个点
     */
    private _findPathStartIndex(
        unitPos: { x: number; y: number; z: number },
        pathPoints: Array<{ x: number; z: number }>,
        direction: 1 | -1
    ): number {
        if (direction === 1) {
            // 正向：找第一个 z > unitPos.z 的点
            for (let i = 0; i < pathPoints.length; i++) {
                if (pathPoints[i].z > unitPos.z) {
                    return i;
                }
            }
            // 没找到，返回最后一个点
            return pathPoints.length - 1;
        } else {
            // 反向：找第一个 z < unitPos.z 的点（从后往前找）
            for (let i = pathPoints.length - 1; i >= 0; i--) {
                if (pathPoints[i].z < unitPos.z) {
                    return i;
                }
            }
            // 没找到，返回第一个点
            return 0;
        }
    }

    /**
     * 处理 AttackMovePath 命令
     */
    private _handleAttackMovePath(
        actor: Actor,
        state: CommandState,
        movement: MovementSystem | null,
        skillSystem: SkillSystem | null,
        nowSeconds: number
    ): void {
        const cmd = state.command;
        
        // 初始化移动追踪
        if (!state.lastTrackedPos) {
            state.lastTrackedPos = actor.getPosition();
        }
        
        if (!state.pathPoints || state.currentPathIndex === undefined || !movement) {
            if (!state.pathPoints) console.warn(`[AttackMovePath] unit ${actor.actorNo}: no pathPoints`);
            if (state.currentPathIndex === undefined) console.warn(`[AttackMovePath] unit ${actor.actorNo}: no currentPathIndex`);
            if (!movement) console.warn('[AttackMovePath] no movement system');
            return;
        }
        
        const direction = cmd.direction ?? 1;
        const pathPoints = state.pathPoints;
        const currentIndex = state.currentPathIndex;
        
        // 检查是否到达路径终点
        if (currentIndex < 0 || currentIndex >= pathPoints.length) {
            console.warn(`[AttackMovePath] unit ${actor.actorNo}: index out of range ${currentIndex}, pathLength=${pathPoints.length}`);
            return;
        }
        
        const targetPoint = pathPoints[currentIndex];
        const pos = actor.getPosition();
        
        // 处理敌人（类似 AttackMove）
        let shouldMoveToWaypoint = true;
        
        if (skillSystem) {
            const unitCfg = actor.getUnitConfig();
            const sightRange = unitCfg?.sightRange ?? 0;
            const attackSkillId = actor.getAttackSkillId();
            const skillConfig = attackSkillId > 0 ? getSkillConfig(attackSkillId) : undefined;
            const castRange = skillConfig?.castRange ?? 5;
            
            if (sightRange > 0) {
                const enemy = this._findNearestEnemy(actor, sightRange);
                if (enemy) {
                    const targetPos = enemy.getPosition();
                    const dx = targetPos.x - pos.x;
                    const dz = targetPos.z - pos.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    
                    if (dist > castRange) {
                        // 追击敌人
                        const last = state.lastChaseTargetPos;
                        const movedEnough = !last || Math.hypot(targetPos.x - last.x, targetPos.z - last.z) > 0.5;
                        if (movedEnough) {
                            movement.moveTo({
                                actorId: actor.actorNo,
                                targetX: targetPos.x,
                                targetZ: targetPos.z,
                                speed: actor.getSpeed(),
                            });
                            state.lastChaseTargetPos = { x: targetPos.x, z: targetPos.z };
                        }
                    } else {
                        // 停下攻击
                        movement.stopMove(actor.actorNo);
                        this._tryBaseAttack(skillSystem, actor, nowSeconds, enemy);
                    }
                    shouldMoveToWaypoint = false;
                }
            }
        }
        
        // 没有敌人时，移动到路点
        if (shouldMoveToWaypoint) {
            const dx = targetPoint.x - pos.x;
            const dz = targetPoint.z - pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // 到达当前路点，前进到下一个
            if (dist < 1.5) {
                const nextIndex = currentIndex + direction;
                if (nextIndex >= 0 && nextIndex < pathPoints.length) {
                    state.currentPathIndex = nextIndex;
                }
            } else {
                // 移动到当前路点
                movement.moveTo({
                    actorId: actor.actorNo,
                    targetX: targetPoint.x,
                    targetZ: targetPoint.z,
                    speed: actor.getSpeed(),
                });
            }
        }
        
        // 更新位置追踪
        state.lastTrackedPos = actor.getPosition();
    }

    /**
     * 尝试基础攻击（使用 attackSkillId）
     */
    private _tryBaseAttack(skillSystem: SkillSystem, actor: Actor, nowSeconds: number, targetOverride?: Actor): void {
        const attackSkillId = actor.getAttackSkillId();
        if (attackSkillId <= 0) return;

        // 初始化该单位的攻击状态
        if (!this._baseAttacks.has(actor.actorNo)) {
            this._baseAttacks.set(actor.actorNo, { lastAttackTime: -999 });
        }

        const attackState = this._baseAttacks.get(actor.actorNo)!;

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