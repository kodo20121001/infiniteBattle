/**
 * Camera2D - 2D 相机类
 * 使用世界坐标（含z深度），用于控制游戏视图
 * - position：相机在世界中的位置（世界坐标 x, y, z）
 * - zoom：缩放倍数
 */

import { Vector3 } from './Vector3';

export class Camera2D {
    private _position = new Vector3(0, 0, 0);
    private _targetPosition = new Vector3(0, 0, 0);
    private _zoom = 1;
    private _smoothing = 0.15; // 平滑跟随系数 (0-1)

    // 边界限制
    private bounds = {
        minX: -Infinity,
        maxX: Infinity,
        minY: -Infinity,
        maxY: Infinity
    };

    // 视口尺寸（屏幕尺寸）
    private viewport = {
        width: 0,
        height: 0
    };

    constructor(viewportWidth = 800, viewportHeight = 600) {
        this.viewport.width = viewportWidth;
        this.viewport.height = viewportHeight;
    }

    /**
     * 设置视口尺寸
     */
    setViewport(width: number, height: number): void {
        this.viewport.width = width;
        this.viewport.height = height;
    }

    /**
     * 获取位置（世界坐标）
     */
    get position(): Vector3 {
        return this._position;
    }

    /**
     * 设置相机位置（立即）
     */
    setPosition(x: number, y: number, z: number = 0): void {
        this._position.x = this.clampX(x);
        this._position.y = this.clampY(y);
        this._position.z = z;
        this._targetPosition.x = this._position.x;
        this._targetPosition.y = this._position.y;
        this._targetPosition.z = this._position.z;
    }

    /**
     * 设置目标位置（用于平滑跟随）
     */
    setTarget(x: number, y: number, z: number = 0): void {
        this._targetPosition.x = x;
        this._targetPosition.y = y;
        this._targetPosition.z = z;
    }

    /**
     * 获取缩放
     */
    get zoom(): number {
        return this._zoom;
    }

    /**
     * 设置缩放
     */
    setZoom(zoom: number): void {
        this._zoom = Math.max(0.1, Math.min(10, zoom));
    }

    /**
     * 设置平滑系数
     */
    set smoothing(value: number) {
        this._smoothing = Math.max(0, Math.min(1, value));
    }

    get smoothing(): number {
        return this._smoothing;
    }

    /**
     * 设置相机边界（世界坐标）
     */
    setBounds(minX: number, maxX: number, minY: number, maxY: number): void {
        this.bounds.minX = minX;
        this.bounds.maxX = maxX;
        this.bounds.minY = minY;
        this.bounds.maxY = maxY;
    }

    /**
     * 更新相机位置（平滑跟随）
     */
    update(deltaTime = 1): void {
        if (this._smoothing > 0) {
            // 平滑插值
            const lerpFactor = Math.min(1, this._smoothing * deltaTime * 60 / 1000);
            this._position.x += (this._targetPosition.x - this._position.x) * lerpFactor;
            this._position.y += (this._targetPosition.y - this._position.y) * lerpFactor;
        } else {
            // 立即跟随
            this._position.x = this._targetPosition.x;
            this._position.y = this._targetPosition.y;
        }

        // 应用边界限制
        this._position.x = this.clampX(this._position.x);
        this._position.y = this.clampY(this._position.y);
    }

    /**
     * 立即跟随到目标（无平滑）
     */
    snapToTarget(): void {
        this._position.x = this.clampX(this._targetPosition.x);
        this._position.y = this.clampY(this._targetPosition.y);
    }

    /**
     * 世界坐标转屏幕坐标
     */
    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        const centerX = this.viewport.width / 2;
        const centerY = this.viewport.height / 2;

        return {
            x: (worldX - this._position.x) * this._zoom + centerX,
            y: (worldY - this._position.y) * this._zoom + centerY
        };
    }

    /**
     * 屏幕坐标转世界坐标
     */
    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const centerX = this.viewport.width / 2;
        const centerY = this.viewport.height / 2;

        return {
            x: (screenX - centerX) / this._zoom + this._position.x,
            y: (screenY - centerY) / this._zoom + this._position.y
        };
    }

    /**
     * 限制 X 坐标在边界内
     */
    private clampX(x: number): number {
        return Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
    }

    /**
     * 限制 Y 坐标在边界内
     */
    private clampY(y: number): number {
        return Math.max(this.bounds.minY, Math.min(this.bounds.maxY, y));
    }

    /**
     * 重置相机
     */
    reset(): void {
        this._position = new Vector3(0, 0, 0);
        this._targetPosition = new Vector3(0, 0, 0);
        this._zoom = 1;
    }

    /**
     * 移动相机（相对位移）
     */
    move(dx: number, dy: number): void {
        this.setPosition(this._position.x + dx, this._position.y + dy);
    }

    /**
     * 缩放相机（相对缩放）
     */
    addZoom(delta: number): void {
        this.setZoom(this._zoom + delta);
    }
}
