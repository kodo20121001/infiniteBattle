/**
 * 游戏系统基类（分离以避免循环依赖）
 */

import type { Game } from './GameSystem';

export abstract class GameSystem {
    protected game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    abstract init(): void;
    abstract update(deltaTime: number): void;
    abstract fixedUpdate(fixedDeltaTime: number): void;
    abstract destroy(): void;
}
