/**
 * 死亡系统
 * 统一处理死亡状态与清理
 */

import { GameSystem } from './GameSystemBase';
import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import type { StatusSystem } from './StatusSystem';

export class DeathSystem extends GameSystem {
    private _deathTimes: Map<string, number> = new Map();
    private _removeDelaySeconds = 0.5;

    constructor(game: Game) {
        super(game);
    }

    init(): void {
        // 初始化
    }

    update(deltaTime: number): void {
        const nowSeconds = this.game.getGameState().getElapsedTime();
        const statusSystem = this.game.getSystem<StatusSystem>('status');
        const actors = this.game.getActors();

        for (const actor of actors) {
            this._handleActorDeath(actor, nowSeconds, statusSystem);
        }
    }

    fixedUpdate(fixedDeltaTime: number): void {
        // 系统无需固定帧更新
    }

    destroy(): void {
        this._deathTimes.clear();
    }

    private _handleActorDeath(actor: Actor, nowSeconds: number, statusSystem?: StatusSystem): void {
        if (!actor.isDead()) return;

        if (!this._deathTimes.has(actor.actorNo)) {
            this._deathTimes.set(actor.actorNo, nowSeconds);
            if (statusSystem) {
                statusSystem.setDie(actor.actorNo);
            }
            return;
        }

        const deathTime = this._deathTimes.get(actor.actorNo) ?? nowSeconds;
        if (nowSeconds - deathTime >= this._removeDelaySeconds) {
            this._deathTimes.delete(actor.actorNo);
            this.game.removeActor(actor.actorNo);
        }
    }
}
