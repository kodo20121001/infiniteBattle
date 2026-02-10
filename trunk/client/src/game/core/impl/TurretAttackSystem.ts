/**
 * 炮塔攻击系统
 * 自动为带有 TurretAttack 配置的建筑进行攻击
 */

import { GameSystem } from './GameSystemBase';
import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import { ActorType } from './Actor';
import { Building } from './Building';
import { SkillSystem } from './SkillSystem';
import { getSkillConfig } from '../config/SkillConfig';

export class TurretAttackSystem extends GameSystem {
    private _lastAttackTimes: Map<string, number> = new Map();

    constructor(game: Game) {
        super(game);
    }

    init(): void {
        // 初始化
    }

    update(deltaTime: number): void {
        const skillSystem = this.game.getSystem<SkillSystem>('skill');
        if (!skillSystem) return;

        const nowSeconds = this.game.getGameState().getElapsedTime();
        const actors = this.game.getActors();

        for (const actor of actors) {
            if (actor.actorType !== ActorType.Building) continue;
            const building = actor as Building;
            this._tryTurretAttack(building, skillSystem, nowSeconds);
        }
    }

    fixedUpdate(fixedDeltaTime: number): void {
        // 系统无需固定帧更新
    }

    destroy(): void {
        this._lastAttackTimes.clear();
    }

    private _tryTurretAttack(building: Building, skillSystem: SkillSystem, nowSeconds: number): void {
        const turretConfig = building.getTurretAttackConfig();
        if (!turretConfig) return;

        const attackSkillId = building.getAttackSkillId();
        if (attackSkillId <= 0) return;

        const range = turretConfig.range > 0 ? turretConfig.range : 300;
        const attackSpeed = turretConfig.attackSpeed > 0 ? turretConfig.attackSpeed : 1;
        const cooldown = 1 / attackSpeed;

        if (!this._lastAttackTimes.has(building.actorNo)) {
            this._lastAttackTimes.set(building.actorNo, -999);
        }

        const lastAttackTime = this._lastAttackTimes.get(building.actorNo) || -999;
        if (nowSeconds - lastAttackTime < cooldown) return;

        const target = this._findNearestEnemy(building, range);
        if (!target) return;

        const skillConfig = getSkillConfig(attackSkillId);
        if (!skillConfig) return;

        skillSystem.castSkill({
            caster: building,
            target,
            skillId: attackSkillId
        });

        this._lastAttackTimes.set(building.actorNo, nowSeconds);
    }

    private _findNearestEnemy(actor: Actor, radius: number): Actor | undefined {
        const actors = this.game.getActors();
        let best: Actor | undefined;
        let bestDist = Number.MAX_VALUE;

        const posA = actor.getPosition();
        for (const other of actors) {
            if (other.actorType !== ActorType.Unit && other.actorType !== ActorType.Building) continue;
            if (other.campId === actor.campId || other.isDead()) continue;
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
}
