/**
 * 2D Camera 相机类
 * 用于控制视图的位置和缩放
 */
export class Camera2D {
    position = { x: 0, y: 0 };
    zoom = 1;
    smoothing = 0.1; // 相机平滑跟随系数
    
    // 目标位置（用于平滑跟随）
    targetPosition = { x: 0, y: 0 };
    
    // 边界限制
    bounds = {
        minX: -Infinity,
        maxX: Infinity,
        minY: -Infinity,
        maxY: Infinity
    };

    // PIXI.Container reference for camera transform
    container = null;

    constructor(container = null) {
        this.container = container;
    }

    /**
     * 设置相机位置
     */
    setPosition(x, y) {
        this.position.x = this.clampX(x);
        this.position.y = this.clampY(y);
        this.updateTransform();
    }

    /**
     * 设置目标位置（用于平滑跟随）
     */
    setTarget(x, y) {
        this.targetPosition.x = x;
        this.targetPosition.y = y;
    }

    /**
     * 设置缩放级别
     */
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(10, zoom)); // 限制缩放范围
        this.updateTransform();
    }

    /**
     * 设置相机边界
     */
    setBounds(minX, maxX, minY, maxY) {
        this.bounds.minX = minX;
        this.bounds.maxX = maxX;
        this.bounds.minY = minY;
        this.bounds.maxY = maxY;
    }

    /**
     * 平滑跟随更新
     */
    update(deltaTime = 1) {
        // 使用插值实现平滑跟随
        const smoothFactor = Math.min(1, this.smoothing * deltaTime);
        
        this.position.x += (this.targetPosition.x - this.position.x) * smoothFactor;
        this.position.y += (this.targetPosition.y - this.position.y) * smoothFactor;

        // 应用边界限制
        this.position.x = this.clampX(this.position.x);
        this.position.y = this.clampY(this.position.y);

        this.updateTransform();
    }

    /**
     * 立即跟随到目标位置（无平滑）
     */
    snapToTarget() {
        this.position.x = this.clampX(this.targetPosition.x);
        this.position.y = this.clampY(this.targetPosition.y);
        this.updateTransform();
    }

    /**
     * 更新容器变换
     */
    updateTransform() {
        if (this.container) {
            // 相机的位置实际上是场景的反向移动
            this.container.position.set(-this.position.x, -this.position.y);
            this.container.scale.set(this.zoom, this.zoom);
        }
    }

    /**
     * 世界坐标转屏幕坐标
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.position.x) * this.zoom,
            y: (worldY - this.position.y) * this.zoom
        };
    }

    /**
     * 屏幕坐标转世界坐标
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX / this.zoom + this.position.x,
            y: screenY / this.zoom + this.position.y
        };
    }

    /**
     * 限制 X 坐标在边界内
     */
    private clampX(x) {
        return Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
    }

    /**
     * 限制 Y 坐标在边界内
     */
    private clampY(y) {
        return Math.max(this.bounds.minY, Math.min(this.bounds.maxY, y));
    }

    /**
     * 重置相机
     */
    reset() {
        this.position = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.zoom = 1;
        this.updateTransform();
    }
}
