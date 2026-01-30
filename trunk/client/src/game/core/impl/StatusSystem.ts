import { GameSystem } from './GameSystemBase';

export interface ActorStatusData {
    isIdle: boolean;
    isWalk: boolean;
    isTurnRound: boolean;
    isCast: boolean;
    isDie: boolean;
}

/**
 * 状态系统：保存角色通用状态数据（不涉及动画映射）
 */
export class StatusSystem extends GameSystem {
    private _states: Map<string, ActorStatusData> = new Map();

    init(): void {}

    update(deltaTime: number): void {}

    fixedUpdate(fixedDeltaTime: number): void {}

    destroy(): void {
        this._states.clear();
    }

    get(actorId: string): ActorStatusData | null {
        return this._states.get(actorId) ?? null;
    }

    clear(actorId: string): void {
        this._states.delete(actorId);
    }

    setIdle(actorId: string): void {
        this._setState(actorId, 'idle');
    }

    setWalk(actorId: string): void {
        this._setState(actorId, 'walk');
    }

    setTurnRound(actorId: string): void {
        this._setState(actorId, 'turnRound');
    }

    setCast(actorId: string): void {
        this._setState(actorId, 'cast');
    }

    setDie(actorId: string): void {
        this._setState(actorId, 'die');
    }

    private _setState(actorId: string, state: 'idle' | 'walk' | 'turnRound' | 'cast' | 'die'): void {
        const data = this._states.get(actorId) ?? {
            isIdle: true,
            isWalk: false,
            isTurnRound: false,
            isCast: false,
            isDie: false,
        };

        data.isIdle = false;
        data.isWalk = false;
        data.isTurnRound = false;
        data.isCast = false;
        data.isDie = false;

        switch (state) {
            case 'idle':
                data.isIdle = true;
                break;
            case 'walk':
                data.isWalk = true;
                break;
            case 'turnRound':
                data.isTurnRound = true;
                break;
            case 'cast':
                data.isCast = true;
                break;
            case 'die':
                data.isDie = true;
                break;
        }

        this._states.set(actorId, data);
    }
}