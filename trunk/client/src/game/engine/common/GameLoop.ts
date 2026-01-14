/**
 * GameLoop - 游戏循环类
 * 管理游戏的主循环、帧率控制和生命周期
 */
export class GameLoop {
    private _isRunning = false;
    private _isPaused = false;
    private _animationFrameId: number | null = null;
    
    private _lastFrameTime = 0;
    private _deltaTime = 0;
    private _fps = 60;
    private _frameInterval = 1000 / 60; // 默认 60 FPS
    
    private _frameCount = 0;
    private _fpsUpdateTime = 0;
    private _currentFps = 0;

    // 生命周期回调
    private _updateCallback: ((deltaTime: number) => void) | null = null;
    private _renderCallback: ((deltaTime: number) => void) | null = null;
    private _fixedUpdateCallback: ((fixedDeltaTime: number) => void) | null = null;

    // 固定更新
    private _fixedTimeStep = 1000 / 60; // 固定时间步长（默认 60 FPS）
    private _accumulator = 0;

    constructor(targetFps = 60) {
        this.setTargetFps(targetFps);
    }

    /**
     * 设置目标帧率
     */
    setTargetFps(fps: number): void {
        this._fps = fps;
        this._frameInterval = 1000 / fps;
    }

    /**
     * 设置固定更新时间步长
     */
    setFixedTimeStep(fps: number): void {
        this._fixedTimeStep = 1000 / fps;
    }

    /**
     * 设置更新回调
     */
    onUpdate(callback: (deltaTime: number) => void): void {
        this._updateCallback = callback;
    }

    /**
     * 设置渲染回调
     */
    onRender(callback: (deltaTime: number) => void): void {
        this._renderCallback = callback;
    }

    /**
     * 设置固定更新回调（物理更新等）
     */
    onFixedUpdate(callback: (fixedDeltaTime: number) => void): void {
        this._fixedUpdateCallback = callback;
    }

    /**
     * 启动游戏循环
     */
    start(): void {
        if (this._isRunning) {
            console.warn('GameLoop is already running');
            return;
        }

        this._isRunning = true;
        this._isPaused = false;
        this._lastFrameTime = performance.now();
        this._fpsUpdateTime = this._lastFrameTime;
        this._frameCount = 0;
        this._accumulator = 0;

        this._loop(this._lastFrameTime);
    }

    /**
     * 暂停游戏循环
     */
    pause(): void {
        this._isPaused = true;
    }

    /**
     * 恢复游戏循环
     */
    resume(): void {
        if (!this._isRunning) {
            this.start();
            return;
        }
        this._isPaused = false;
        this._lastFrameTime = performance.now();
    }

    /**
     * 停止游戏循环
     */
    stop(): void {
        this._isRunning = false;
        this._isPaused = false;
        
        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }

    /**
     * 主循环
     */
    private _loop(currentTime: number): void {
        if (!this._isRunning) return;

        // 请求下一帧
        this._animationFrameId = requestAnimationFrame((time) => this._loop(time));

        // 如果暂停，跳过更新
        if (this._isPaused) {
            this._lastFrameTime = currentTime;
            return;
        }

        // 计算 deltaTime (毫秒)
        this._deltaTime = currentTime - this._lastFrameTime;
        this._lastFrameTime = currentTime;

        // 限制 deltaTime，防止出现过大的时间跳跃
        if (this._deltaTime > 100) {
            this._deltaTime = 100;
        }

        // 固定更新（用于物理等需要固定时间步长的逻辑）
        if (this._fixedUpdateCallback) {
            this._accumulator += this._deltaTime;
            while (this._accumulator >= this._fixedTimeStep) {
                this._fixedUpdateCallback(this._fixedTimeStep);
                this._accumulator -= this._fixedTimeStep;
            }
        }

        // 逻辑更新
        if (this._updateCallback) {
            this._updateCallback(this._deltaTime);
        }

        // 渲染
        if (this._renderCallback) {
            this._renderCallback(this._deltaTime);
        }

        // 更新 FPS 统计
        this._updateFps(currentTime);
    }

    /**
     * 更新 FPS 统计
     */
    private _updateFps(currentTime: number): void {
        this._frameCount++;
        
        if (currentTime - this._fpsUpdateTime >= 1000) {
            this._currentFps = Math.round((this._frameCount * 1000) / (currentTime - this._fpsUpdateTime));
            this._frameCount = 0;
            this._fpsUpdateTime = currentTime;
        }
    }

    /**
     * 获取当前 FPS
     */
    get currentFps(): number {
        return this._currentFps;
    }

    /**
     * 获取 deltaTime（毫秒）
     */
    get deltaTime(): number {
        return this._deltaTime;
    }

    /**
     * 获取 deltaTime（秒）
     */
    get deltaTimeSeconds(): number {
        return this._deltaTime / 1000;
    }

    /**
     * 是否正在运行
     */
    get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * 是否暂停
     */
    get isPaused(): boolean {
        return this._isPaused;
    }
}
