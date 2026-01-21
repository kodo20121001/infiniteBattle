/**
 * Time - 时间管理类
 * 用于管理游戏中的时间相关数据
 */
export class Time {
    private static _deltaTime: number = 0;
    private static _time: number = 0;
    private static _frameCount: number = 0;
    private static _timeScale: number = 1;
    private static _lastFrameTime: number = 0;

    /**
     * 上一帧到这一帧的时间间隔（秒）
     */
    static get deltaTime(): number {
        return this._deltaTime;
    }

    /**
     * 上一帧到这一帧的时间间隔（毫秒）
     */
    static get deltaTimeMs(): number {
        return this._deltaTime * 1000;
    }

    /**
     * 游戏开始以来的总时间（秒）
     */
    static get time(): number {
        return this._time;
    }

    /**
     * 游戏开始以来的总时间（毫秒）
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
     * 真实的 delta time（不受 timeScale 影响）
     */
    static get unscaledDeltaTime(): number {
        return this._deltaTime / this._timeScale;
    }

    /**
     * 当前帧率（FPS）
     */
    static get fps(): number {
        return this._deltaTime > 0 ? 1 / this._deltaTime : 0;
    }

    /**
     * 更新时间（内部调用）
     * @param currentTime 当前时间戳（毫秒）
     */
    static update(currentTime: number): void {
        if (this._lastFrameTime === 0) {
            this._lastFrameTime = currentTime;
            return;
        }

        const realDelta = (currentTime - this._lastFrameTime) / 1000;
        this._deltaTime = realDelta * this._timeScale;
        this._time += this._deltaTime;
        this._frameCount++;
        this._lastFrameTime = currentTime;
    }

    /**
     * 重置时间系统
     */
    static reset(): void {
        this._deltaTime = 0;
        this._time = 0;
        this._frameCount = 0;
        this._lastFrameTime = 0;
    }
}
