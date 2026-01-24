/**
 * 游戏状态管理
 * 记录帧同步游戏的完整状态
 */

export enum GameStateEnum {
    /** 初始化中 */
    Initializing = 'initializing',
    /** 运行中 */
    Running = 'running',
    /** 暂停中 */
    Paused = 'paused',
    /** 已结束 */
    Finished = 'finished',
}

export interface GameSnapshot {
    /** 当前帧号 */
    frameIndex: number;
    /** 游戏状态 */
    gameState: GameStateEnum;
    /** 时间戳 */
    timestamp: number;
    /** 游戏数据快照 */
    data: Record<string, any>;
}

/**
 * 游戏状态管理器
 */
export class GameState {
    private _frameIndex: number = 0;
    private _gameState: GameStateEnum = GameStateEnum.Initializing;
    private _startTime: number = 0;
    private _pauseTime: number = 0;
    private _totalPausedTime: number = 0;
    private _data: Record<string, any> = {};

    constructor() {
        this._startTime = Date.now();
    }

    /**
     * 初始化游戏状态
     */
    init(): void {
        this._gameState = GameStateEnum.Running;
        this._frameIndex = 0;
        this._startTime = Date.now();
        this._totalPausedTime = 0;
    }

    /**
     * 推进一帧
     */
    nextFrame(): void {
        if (this._gameState === GameStateEnum.Running) {
            this._frameIndex++;
        }
    }

    /**
     * 暂停游戏
     */
    pause(): void {
        if (this._gameState === GameStateEnum.Running) {
            this._gameState = GameStateEnum.Paused;
            this._pauseTime = Date.now();
        }
    }

    /**
     * 恢复游戏
     */
    resume(): void {
        if (this._gameState === GameStateEnum.Paused) {
            this._gameState = GameStateEnum.Running;
            this._totalPausedTime += Date.now() - this._pauseTime;
        }
    }

    /**
     * 结束游戏
     */
    finish(): void {
        this._gameState = GameStateEnum.Finished;
    }

    /**
     * 获取当前帧号
     */
    getFrameIndex(): number {
        return this._frameIndex;
    }

    /**
     * 获取当前游戏状态
     */
    getGameState(): GameStateEnum {
        return this._gameState;
    }

    /**
     * 获取已运行时间（毫秒）
     */
    getElapsedTime(): number {
        if (this._gameState === GameStateEnum.Finished) {
            return this._pauseTime - this._startTime - this._totalPausedTime;
        }
        return Date.now() - this._startTime - this._totalPausedTime;
    }

    /**
     * 获取游戏数据快照
     */
    getSnapshot(): GameSnapshot {
        return {
            frameIndex: this._frameIndex,
            gameState: this._gameState,
            timestamp: Date.now(),
            data: { ...this._data },
        };
    }

    /**
     * 设置自定义数据
     */
    setData(key: string, value: any): void {
        this._data[key] = value;
    }

    /**
     * 获取自定义数据
     */
    getData<T = any>(key: string): T | undefined {
        return this._data[key] as T;
    }

    /**
     * 清除自定义数据
     */
    clearData(key: string): void {
        delete this._data[key];
    }

    /**
     * 重置状态
     */
    reset(): void {
        this._frameIndex = 0;
        this._gameState = GameStateEnum.Initializing;
        this._startTime = Date.now();
        this._pauseTime = 0;
        this._totalPausedTime = 0;
        this._data = {};
    }
}
