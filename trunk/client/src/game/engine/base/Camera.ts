/**
 * Camera - 游戏相机类
 * 基于 Three.js 的渲染相机，管理视口、位置和缩放
 * - position：相机在世界中的位置（世界坐标 x, y, z）
 * - zoom：缩放倍数
 * - 内部使用 Three.js 的正交相机进行渲染
 */

import * as THREE from 'three';
import { Vector3 } from './Vector3';

export class Camera {
    private _position = new Vector3(0, 0, 0);
    private _targetPosition = new Vector3(0, 0, 0);
    private _zoom = 1;
    private _smoothing = 0.15; // 平滑跟随系数 (0-1)
    private _orthoHeight = 100;  // 正交相机的视锥高度（世界坐标），默认100米
    private _mode: 'game' | 'free' = 'game';
    private _freeSpeed = 12; // 自由相机移动速度（米/秒）
    private _freeKeys = new Set<string>();
    private _savedGameState: { x: number; z: number; orthoHeight: number; zoom: number } | null = null;
    
    // Three.js 相机
    private threeCamera: THREE.OrthographicCamera;

    // 视口尺寸（屏幕尺寸）
    private viewport = {
        width: 0,
        height: 0
    };

    constructor(viewportWidth = 800, viewportHeight = 600) {
        this.viewport.width = viewportWidth;
        this.viewport.height = viewportHeight;
        
        // 创建 Three.js 正交相机
        // near/far 参数需要足够大以容纳整个场景（包括Y=50的相机位置）
        this.threeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
        
        // 设置俯视图：up 向量指向 +Z（屏幕上方）
        this.threeCamera.up.set(0, 0, 1);
        
        this.updateThreeCamera();
    }

    /**
     * 设置视口尺寸
     */
    setViewport(width: number, height: number): void {
        this.viewport.width = width;
        this.viewport.height = height;
        this.updateThreeCamera();
    }

    /**
     * 调整相机视口（允许相机自行处理视口逻辑）
     */
    resize(width: number, height: number): void {
        this.setViewport(width, height);
    }

    /**
     * 获取位置（世界坐标，返回副本）
     */
    get position(): Vector3 {
        return new Vector3(this._position.x, this._position.y, this._position.z);
    }

    /**
     * 设置相机位置（立即）
     */
    setPosition(x: number, y: number, z: number = 0): void {
        this._position.x = x;
        this._position.y = y;
        this._position.z = z;
        this._targetPosition.x = this._position.x;
        this._targetPosition.y = this._position.y;
        this._targetPosition.z = this._position.z;
        this.updateThreeCamera();
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
        this.updateThreeCamera();
    }

    /**
     * 设置正交相机的视锥高度（世界坐标）
     * 用于CoordinateTester等场景，其中需要精确控制视锥大小
     */
    setOrthoHeight(height: number): void {
        this._orthoHeight = Math.max(0.1, height);
        this.updateThreeCamera();
    }

    /**
     * 设置相机模式
     */
    setMode(mode: 'game' | 'free'): void {
        if (this._mode === mode) return;

        if (mode === 'free') {
            // 保存游戏模式状态
            this._savedGameState = {
                x: this._position.x,
                z: this._position.z,
                orthoHeight: this._orthoHeight,
                zoom: this._zoom
            };
        } else if (mode === 'game' && this._savedGameState) {
            // 恢复游戏模式状态
            this._orthoHeight = this._savedGameState.orthoHeight;
            this._zoom = this._savedGameState.zoom;
            this.setPosition(this._savedGameState.x, this._position.y, this._savedGameState.z);
        }

        this._freeKeys.clear();
        this._mode = mode;
    }

    /**
     * 获取当前相机模式
     */
    getMode(): 'game' | 'free' {
        return this._mode;
    }

    /**
     * 设置自由相机按键状态
     */
    setFreeKey(key: string, isDown: boolean): void {
        const normalized = key.toLowerCase();
        if (!['w', 'a', 's', 'd'].includes(normalized)) return;
        if (isDown) {
            this._freeKeys.add(normalized);
        } else {
            this._freeKeys.delete(normalized);
        }
    }

    /**
     * 设置自由相机移动速度
     */
    setFreeSpeed(speed: number): void {
        this._freeSpeed = Math.max(0.1, speed);
    }


    /**
     * 获取当前的正交视锥高度
     */
    getOrthoHeight(): number {
        return this._orthoHeight;
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
     * 更新相机位置（平滑跟随或自由移动）
     */
    update(deltaTime = 1): void {
        if (this._mode === 'free') {
            // 自由相机模式：WASD控制
            this.updateFreeCamera(deltaTime);
        } else {
            // 游戏模式：平滑跟随
            if (this._smoothing > 0) {
                // 平滑插值
                const lerpFactor = Math.min(1, this._smoothing * deltaTime * 60);
                this._position.x += (this._targetPosition.x - this._position.x) * lerpFactor;
                this._position.y += (this._targetPosition.y - this._position.y) * lerpFactor;
            } else {
                // 立即跟随
                this._position.x = this._targetPosition.x;
                this._position.y = this._targetPosition.y;
            }
        }

        // 更新 three.js 相机
        this.updateThreeCamera();
    }

    /**
     * 更新自由相机移动
     */
    private updateFreeCamera(deltaTime: number): void {
        if (this._freeKeys.size === 0) return;

        const speed = this._freeSpeed;
        let dx = 0;
        let dz = 0;

        if (this._freeKeys.has('w')) dz += speed * deltaTime;
        if (this._freeKeys.has('s')) dz -= speed * deltaTime;
        if (this._freeKeys.has('a')) dx -= speed * deltaTime;
        if (this._freeKeys.has('d')) dx += speed * deltaTime;

        if (dx !== 0 || dz !== 0) {
            this._position.x += dx;
            this._position.z += dz;
        }
    }

    /**
     * 更新 Three.js 相机的视口矩阵
     * 俯视图：Camera 看向 X-Z 平面，Y 是固定高度
     */
    /**
     * 更新 Three.js 相机的视口矩阵
     * 俯视图：视锥固定在世界原点周围，不随Camera位置移动
     */
    private updateThreeCamera(): void {
        // 计算视锥大小（参照 CoordinateTester 的算法）
        // viewHeight = orthoHeight / zoom
        const aspect = this.viewport.width / this.viewport.height;
        const viewHeight = this._orthoHeight / this._zoom;
        const viewWidth = viewHeight * aspect;

        // 设置投影矩阵（按 CoordinateTester：left > right 反转 X 轴）
        this.threeCamera.left = viewWidth / 2;
        this.threeCamera.right = -viewWidth / 2;
        this.threeCamera.top = viewHeight / 2;
        this.threeCamera.bottom = -viewHeight / 2;
        
        // 更新相机位置指向
        this.threeCamera.position.x = this._position.x;
        this.threeCamera.position.y = 50;  // 固定高度
        this.threeCamera.position.z = this._position.z;
        this.threeCamera.lookAt(this._position.x, 0, this._position.z);
        
        this.threeCamera.updateProjectionMatrix();
    }

    /**
     * 立即跟随到目标（无平滑）
     */
    snapToTarget(): void {
        this._position.x = this._targetPosition.x;
        this._position.y = this._targetPosition.y;
    }

    /**
     * Canvas 坐标转世界坐标（俯视图）
     * 参考CoordinateTester中的算法
     * @param canvasX Canvas X 坐标（像素）
     * @param canvasY Canvas Y 坐标（像素）
     * @param worldY 世界 Y 坐标（高度），默认为 0
     * @returns 世界坐标 {x, y, z}
     */
    canvasToWorld(canvasX: number, canvasY: number, worldY: number = 0): { x: number; y: number; z: number } {
        // Canvas 像素坐标转 NDC 坐标 [-1, 1]
        const ndcX = (canvasX / this.viewport.width) * 2 - 1;
        const ndcY = -(canvasY / this.viewport.height) * 2 + 1;

        // 计算视锥大小（参照CoordinateTester）
        const aspect = this.viewport.width / this.viewport.height;
        const viewHeight = this._orthoHeight / this._zoom;
        const viewWidth = viewHeight * aspect;

        // 从相机位置计算世界坐标（参照CoordinateTester的算法）
        const worldX = this._position.x + ndcX * viewWidth / 2;
        const worldZ = this._position.z + ndcY * viewHeight / 2;

        return { x: worldX, y: worldY, z: worldZ };
    }

    /**
     * 世界坐标转 Canvas 坐标（俯视图）
     * @param worldX 世界 X 坐标
     * @param worldY 世界 Y 坐标（高度）
     * @param worldZ 世界 Z 坐标（深度）
     * @returns Canvas 坐标 {x, y}
     */
    worldToCanvas(worldX: number, worldY: number, worldZ: number): { x: number; y: number } {
        // 计算相对于相机的偏移
        const dX = worldX - this._position.x;
        const dZ = worldZ - this._position.z;

        // 计算视锥大小
        const aspect = this.viewport.width / this.viewport.height;
        const viewHeight = this._orthoHeight / this._zoom;
        const viewWidth = viewHeight * aspect;

        // 转换为 NDC 坐标
        const ndcX = dX / (viewWidth / 2);
        const ndcY = dZ / (viewHeight / 2);

        // NDC 转换为 Canvas 像素坐标
        const canvasX = ((ndcX + 1) * this.viewport.width) / 2;
        const canvasY = ((1 - ndcY) * this.viewport.height) / 2;

        return { x: canvasX, y: canvasY };
    }

    /**
     * 重置相机
     */
    reset(): void {
        this._position = new Vector3(0, 0, 0);
        this._targetPosition = new Vector3(0, 0, 0);
        this._zoom = 1;
        this.updateThreeCamera();
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

    /**
     * 屏幕坐标转世界坐标
     * Screen 坐标是相对于浏览器视口，需要减去 Canvas 相对于视口的偏移得到 Canvas 坐标
     * @param screenX 屏幕 X 坐标（相对于视口）
     * @param screenY 屏幕 Y 坐标（相对于视口）
     * @param canvasOffsetX Canvas 左上角的屏幕 X 坐标
     * @param canvasOffsetY Canvas 左上角的屏幕 Y 坐标
     * @param worldY 世界 Y 坐标（高度），默认为 0
     * @returns 世界坐标 {x, y, z}
     */
    screenToWorld(
        screenX: number,
        screenY: number,
        canvasOffsetX: number,
        canvasOffsetY: number,
        worldY: number = 0
    ): { x: number; y: number; z: number } {
        // 屏幕坐标转 Canvas 坐标
        const canvasX = screenX - canvasOffsetX;
        const canvasY = screenY - canvasOffsetY;
        
        // 使用既有的 Canvas 转世界方法
        return this.canvasToWorld(canvasX, canvasY, worldY);
    }

    /**
     * 世界坐标转屏幕坐标
     * @param worldX 世界 X 坐标
     * @param worldY 世界 Y 坐标（高度）
     * @param worldZ 世界 Z 坐标
     * @param canvasOffsetX Canvas 左上角的屏幕 X 坐标
     * @param canvasOffsetY Canvas 左上角的屏幕 Y 坐标
     * @returns 屏幕坐标 {x, y}
     */
    worldToScreen(
        worldX: number,
        worldY: number,
        worldZ: number,
        canvasOffsetX: number,
        canvasOffsetY: number
    ): { x: number; y: number } {
        // 使用既有的世界转 Canvas 方法
        const canvasPos = this.worldToCanvas(worldX, worldY, worldZ);
        
        // Canvas 坐标转屏幕坐标
        return {
            x: canvasPos.x + canvasOffsetX,
            y: canvasPos.y + canvasOffsetY
        };
    }

    /**
     * 获取 Three.js 相机
     */
    getThreeCamera(): THREE.OrthographicCamera {
        return this.threeCamera;
    }
}
