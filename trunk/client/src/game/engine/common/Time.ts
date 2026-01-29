/**
 * Time - 时间管理类
 * 用于管理游戏中的时间相关数据
 * 注意：所有时间单位统一使用秒（seconds）
 */
export class Time {
    private static _deltaTime: number = 0; // 秒，受timeScale影响
    private static _unscaledDeltaTime: number = 0; // 秒，真实时间间隔
    private static _time: number = 0; // 秒
    private static _frameCount: number = 0;
    private static _timeScale: number = 1;

    /**
     * 上一帧到这一帧的时间间隔（秒，受timeScale影响）
     */
    static get deltaTime(): number {
        return this._deltaTime;
    }

    /**
     * 上一帧到这一帧的时间间隔（毫秒，受timeScale影响）
     */
    static get deltaTimeMs(): number {
        return this._deltaTime * 1000;
    }

    /**
     * 游戏开始以来的总时间（秒，受timeScale影响）
     */
    static get time(): number {
        return this._time;
    }

    /**
     * 游戏开始以来的总时间（毫秒，受timeScale影响）
     */
    static get timeMs(): number {
        return this._time * 1000;
    }

    /**
     * 游戏开始以来的总帧数
     */
    static get frameCount(): number {
        return this._frameCount;
    }

    /**
     * 时间缩放，用于慢动作或快进效果（默认为 1）
     */
    static get timeScale(): number {
        return this._timeScale;
    }

    static set timeScale(value: number) {
        this._timeScale = Math.max(0, value);
    }

    /**
     * 真实的 delta time（秒，不受 timeScale 影响）
     */
    static get unscaledDeltaTime(): number {
        return this._unscaledDeltaTime;
    }

    /**
     * 当前帧率（FPS，基于真实时间）
     */
    static get fps(): number {
        return this._unscaledDeltaTime > 0 ? 1 / this._unscaledDeltaTime : 0;
    }

    /**
     * 更新时间（内部调用）
     * @param deltaTimeSeconds 上一帧的真实时间间隔（秒）
     */
    static update(deltaTimeSeconds: number): void {
        this._unscaledDeltaTime = deltaTimeSeconds;
        this._deltaTime = deltaTimeSeconds * this._timeScale;
        this._time += this._deltaTime;
        this._frameCount++;
    }

    /**
     * 重置时间系统
     */
    static reset(): void {
        this._deltaTime = 0;
        this._time = 0;
        this._frameCount = 0;
    }
}
