import { GameSystem } from './GameSystemBase';
import type { StatusSystem } from './StatusSystem';

/**
 * 动画系统：根据状态系统数据映射到动画片段
 */
export class AnimationSystem extends GameSystem {
    init(): void {}

    update(deltaTime: number): void {}

    fixedUpdate(fixedDeltaTime: number): void {}

    destroy(): void {}

    /**
     * 获取当前应播放的动画片段名称
     */
    getClipName(actorId: string): string | null {
        const statusSystem = this.game.getSystem<StatusSystem>('status');
        const state = statusSystem?.get(actorId) ?? null;
        if (!state) return null;
        if (state.isDie) return 'die';
        if (state.isCast) return 'attack';
        if (state.isWalk || state.isTurnRound) return 'move';
        if (state.isIdle) return 'idle';
        return 'idle';
    }
}