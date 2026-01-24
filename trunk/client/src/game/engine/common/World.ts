import { Camera2D } from '../base/Camera2D';
import { Renderer } from './Renderer';
import { SpriteManager } from './SpriteManager';


/**
 * World - 游戏世界管理类（可多实例）
 * 管理渲染器、精灵管理器、相机和主循环
 */
export class World {
    readonly spriteManager: SpriteManager;
    readonly renderer: Renderer;
    readonly camera: Camera2D;

    private _isRunning = false;
    private _isPaused = false;
    private _animationFrameId: number | null = null;
    private _lastFrameTime = 0;
    private _deltaTime = 0;
    private _fps = 60;
    private _frameInterval = 1000 / 60;
    private _frameCount = 0;
    private _fpsUpdateTime = 0;
    private _currentFps = 0;
    private _fixedTimeStep = 1000 / 60;
    private _accumulator = 0;

    // 生命周期回调
    private _updateCallback: ((deltaTime: number) => void) | null = null;
    private _renderCallback: ((deltaTime: number) => void) | null = null;
    private _fixedUpdateCallback: ((fixedDeltaTime: number) => void) | null = null;

    constructor(
        canvas: HTMLCanvasElement,
        width: number = 800,
        height: number = 600,
        targetFps: number = 60
    ) {
        this.camera = new Camera2D(width, height);
        this.spriteManager = new SpriteManager();
        this.renderer = new Renderer(canvas, this.camera, this.spriteManager);
        this.setTargetFps(targetFps);
    }

    setTargetFps(fps: number): void {
        this._fps = fps;
        this._frameInterval = 1000 / fps;
    }

    setFixedTimeStep(fps: number): void {
        this._fixedTimeStep = 1000 / fps;
    }

    onUpdate(callback: (deltaTime: number) => void): void {
        this._updateCallback = callback;
    }

    onRender(callback: (deltaTime: number) => void): void {
        this._renderCallback = callback;
    }

    onFixedUpdate(callback: (fixedDeltaTime: number) => void): void {
        this._fixedUpdateCallback = callback;
    }

    start(): void {
        if (this._isRunning) {
            console.warn('World loop is already running');
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

    pause(): void {
        this._isPaused = true;
    }

    resume(): void {
        if (!this._isRunning) {
            this.start();
            return;
        }
        this._isPaused = false;
        this._lastFrameTime = performance.now();
    }

    stop(): void {
        this._isRunning = false;
        this._isPaused = false;
        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }

    private _loop(currentTime: number): void {
        if (!this._isRunning) return;
        this._animationFrameId = requestAnimationFrame((time) => this._loop(time));
        if (this._isPaused) {
            this._lastFrameTime = currentTime;
            return;
        }
        this._deltaTime = currentTime - this._lastFrameTime;
        this._lastFrameTime = currentTime;
        if (this._deltaTime > 100) this._deltaTime = 100;
        // 固定更新
        if (this._fixedUpdateCallback) {
            this._accumulator += this._deltaTime;
            while (this._accumulator >= this._fixedTimeStep) {
                this._fixedUpdateCallback(this._fixedTimeStep);
                this._accumulator -= this._fixedTimeStep;
            }
        }
        // World自己的update逻辑
        this.update();
        // 逻辑更新
        if (this._updateCallback) {
            this._updateCallback(this._deltaTime);
        }
        // 渲染
        if (this._renderCallback) {
            this._renderCallback(this._deltaTime);
        }
        this._updateFps(currentTime);
    }

    private _updateFps(currentTime: number): void {
        this._frameCount++;
        if (currentTime - this._fpsUpdateTime >= 1000) {
            this._currentFps = Math.round((this._frameCount * 1000) / (currentTime - this._fpsUpdateTime));
            this._frameCount = 0;
            this._fpsUpdateTime = currentTime;
        }
    }

    get currentFps(): number {
        return this._currentFps;
    }
    get deltaTime(): number {
        return this._deltaTime;
    }
    get deltaTimeSeconds(): number {
        return this._deltaTime / 1000;
    }
    get isRunning(): boolean {
        return this._isRunning;
    }
    get isPaused(): boolean {
        return this._isPaused;
    }

    // 兼容旧接口：每帧手动调用
    update(): void {
        this.spriteManager.update();
        this.renderer.render();
    }

    destroy(): void {
        this.stop();
        this.renderer.destroy();
        this.spriteManager.clear();
    }

    setViewport(width: number, height: number): void {
        this.camera.setViewport(width, height);
        this.renderer.resize(width, height);
    }

    getCamera(): Camera2D {
        return this.camera;
    }
    getSpriteManager(): SpriteManager {
        return this.spriteManager;
    }
    getRenderer(): Renderer {
        return this.renderer;
    }
}
