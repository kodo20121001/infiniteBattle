import * as THREE from 'three';
import { Texture } from './Texture';
import { Sprite } from './Sprite';
import { Vector2 } from './Vector2';
import { assets } from '../common/Assets';
import { perfMonitor } from '../common/PerformanceMonitor';

/**
 * Sprite2D - 2D 精灵类
 * 使用 Three.js 进行渲染，持有自己的网格和材质
 * 位置使用3D坐标（x, y, z），z坐标用于深度排序
 */
export class Sprite2D extends Sprite {
    protected _texture: Texture | null = null;
    protected _tint: string | null = null;
    protected _anchor: Vector2 = new Vector2(0.5, 0.5);  // 2D 特有的锚点
    protected _rotation2D = 0;  // 2D 特有的旋转（单个角度，绕Z轴）
    protected _width: number = 0;  // 精灵宽度（米）
    protected _height: number = 0; // 精灵高度（米）

    // Three.js 渲染对象
    private threeGeometry: THREE.PlaneGeometry | null = null;
    private threeMaterial: THREE.MeshBasicMaterial | null = null;
    private threeMesh: THREE.Mesh | null = null;
    private threeTexture: THREE.Texture | null = null;
    private currentImageId: string | null = null;  // 用于追踪当前纹理的 ID
    private usedImageIds: Set<string> = new Set(); // 记录使用过的纹理ID，避免动画切帧反复创建

    constructor(imageOrTexture?: HTMLImageElement | HTMLCanvasElement | Texture, width?: number, height?: number, blackboard: Record<string, any> = {}) {
        super(blackboard);
        if (imageOrTexture) {
            if (imageOrTexture instanceof Texture) {
                this._texture = imageOrTexture;
            } else {
                this._texture = new Texture(imageOrTexture);
            }

            if (width === undefined || height === undefined) {
                throw new Error('Sprite2D requires width and height in meters.');
            }
            if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                throw new Error('Sprite2D requires positive width and height in meters.');
            }
            this._width = width;
            this._height = height;
            this.createThreeMesh();
        }
    }

    /**
     * 创建 Three.js 网格
     */
    private createThreeMesh(): void {
        if (!this._texture) return;

        perfMonitor.increment('Sprite2D.createMesh');

        // 销毁旧的网格
        this.destroyThreeMesh();

        if (this._width <= 0 || this._height <= 0) {
            throw new Error('Sprite2D requires width and height in meters before creating mesh.');
        }
        
        // 创建几何体（使用米单位）
        this.threeGeometry = new THREE.PlaneGeometry(this._width, this._height);
        
        // 创建纹理（使用缓存避免重复创建）
        const image = this._texture.getImage();
        const imageId = this._texture.getImageId();
        this.currentImageId = imageId;
        this.threeTexture = assets.getThreeTexture(image, imageId) as THREE.Texture;
        this.usedImageIds.add(imageId);

        // 创建材质
        this.threeMaterial = new THREE.MeshBasicMaterial({
            map: this.threeTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        // 创建网格
        this.threeMesh = new THREE.Mesh(this.threeGeometry, this.threeMaterial);
        // 设置旋转以匹配俯视角度（与地图网格相同）
        this.threeMesh.rotation.x = Math.PI / 2;
        // 赋值给 _threeObject
        this._threeObject = this.threeMesh;
        this.updateThreeMesh();
    }

    /**
     * 更新 Three.js 网格的变换（实现基类的抽象方法）
     */
    protected onTransformChanged(): void {
        this.updateThreeMesh();
    }

    /**
     * 更新 Three.js 网格的变换
     */
    private updateThreeMesh(): void {
        if (!this.threeMesh || !this._texture) return;

        perfMonitor.increment('Sprite2D.updateMesh');

        // 设置位置
        // 坐标系：原点在左下角，X向右，Y向上（米单位）
        // 锚点 (0, 0) = 左下角，(1, 1) = 右上角
        // PlaneGeometry 中心在原点，需要根据锚点偏移
        let offsetX = 0;
        let offsetY = 0;
        if (this._texture) {
            // VERSION: anchor-fix-v2
            // anchor.x: 0=左边(需要右移半宽), 0.5=中心(不偏移), 1=右边(需要左移半宽)
            offsetX = (0.5 - this._anchor.x) * this._width;
            // anchor.y: 0=底部(需要上移半高), 0.5=中心(不偏移), 1=顶部(需要下移半高)
            offsetY = (0.5 - this._anchor.y) * this._height;
        }
        const finalX = this._position.x + offsetX;
        const finalY = this._position.y + offsetY;
        const finalZ = this._position.z;
        
        this.threeMesh.position.x = finalX;
        this.threeMesh.position.y = finalY;
        this.threeMesh.position.z = finalZ;

        // 设置缩放（3个轴都设置）
        this.threeMesh.scale.set(this._scale.x, this._scale.y, this._scale.z);

        // 设置旋转（加上初始旋转，反向 Z 轴旋转以匹配游戏坐标系）
        this.threeMesh.rotation.z = -(this._rotation2D + this._initialRotation.z);

        // 设置透明度
        if (this.threeMaterial) {
            this.threeMaterial.opacity = this._alpha;
        }

        // 设置可见性
        this.threeMesh.visible = this._visible;

        // 锚点偏移已通过 mesh.position 处理，避免几何体重复平移
    }

    /**
     * 清理资源
     */
    dispose(): void {
        // 从场景中移除 mesh（如果在场景中）
        if (this.threeMesh && this.threeMesh.parent) {
            this.threeMesh.parent.remove(this.threeMesh);
        }
        this.destroyThreeMesh();
    }

    /**
     * 销毁 Three.js 网格
     */
    private destroyThreeMesh(): void {
        if (this.threeGeometry) {
            this.threeGeometry.dispose();
            this.threeGeometry = null;
        }
        if (this.threeMaterial) {
            this.threeMaterial.dispose();
            this.threeMaterial = null;
        }
        // 释放纹理的缓存引用（由 Assets 管理，不直接 dispose）
        if (this.usedImageIds.size > 0) {
            for (const imageId of this.usedImageIds) {
                assets.releaseThreeTexture(imageId);
            }
            this.usedImageIds.clear();
        }
        this.currentImageId = null;
        this.threeTexture = null;
        this.threeMesh = null;
        this._threeObject = null;
    }

    /**
    * 设置精灵尺寸（米单位）
     */
    setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;
        this.createThreeMesh(); // 重新创建网格以应用新尺寸
    }

    /**
     * 设置图像或纹理
     */
    setImage(imageOrTexture: HTMLImageElement | HTMLCanvasElement | Texture): void {
        if (imageOrTexture instanceof Texture) {
            this._texture = imageOrTexture;
        } else {
            this._texture = new Texture(imageOrTexture);
        }
        this.createThreeMesh();
    }

    /**
     * 设置纹理（内部方法，只更新 material 的贴图，不重建 mesh）
     * 用于动画帧切换，性能优于 setTexture
     */
    setThreeTextureOnly(texture: THREE.Texture | THREE.CanvasTexture): void {
        if (this.threeMaterial && texture) {
            this.threeMaterial.map = texture;
            this.threeMaterial.needsUpdate = true;
        }
        this.threeTexture = texture;
    }

    /**
     * 高效的纹理更新方法（用于动画帧切换）
     * 避免重建 mesh，只更新 material 贴图
     */
    updateFrameTexture(newTexture: Texture): void {
        if (!newTexture) return;

        // 更新为新纹理
        this._texture = newTexture;
        const image = newTexture.getImage();
        const imageId = newTexture.getImageId();
        this.currentImageId = imageId;
        this.usedImageIds.add(imageId);

        // 直接更新 THREE 材质中的纹理，避免重建 mesh
        const threeTexture = assets.getThreeTexture(image, imageId);
        this.setThreeTextureOnly(threeTexture as THREE.Texture);
    }

    /**
     * 设置纹理
     */
    setTexture(texture: Texture): void {
        this._texture = texture;
        this.createThreeMesh();
    }

    /**
     * 获取纹理
     */
    getTexture(): Texture | null {
        return this._texture;
    }

    /**
     * 设置位置（覆盖基类方法以添加日志）
     */
    setPosition(x: number, y: number, z: number = 0): void {
        super.setPosition(x, y, z);
    }

    /**
     * 锚点 (0-1) - 2D 特有属性
     * (0, 0) = 左下角, (0.5, 0.5) = 中心, (1, 1) = 右上角
     */
    get anchor(): Vector2 {
        return this._anchor;
    }

    set anchor(value: Vector2) {
        this._anchor = value.clone();
        this.updateThreeMesh();
    }

    setAnchor(x: number, y: number): void {
        this._anchor.x = x;
        this._anchor.y = y;
        this.updateThreeMesh();
    }

    getAnchor(): Vector2 {
        return this._anchor;
    }

    /**
     * 旋转Z轴 - 2D 特有属性（角度，自动转换为弧度）
     */
    get rotationZ(): number {
        return this._rotation2D;
    }

    set rotationZ(value: number) {
        const radians = value * (Math.PI / 180);
        // 优化：只在旋转改变时才触发更新
        if (this._rotation2D === radians) {
            return;
        }
        this._rotation2D = radians;
        this.updateThreeMesh();
    }


    /**
    * 尺寸（米单位）
     */
    get width(): number {
        return this._width * this._scale.x;
    }

    get height(): number {
        return this._height * this._scale.y;
    }

    /**
     * 设置色调（CSS 颜色字符串）
     */
    setTint(color: string): void {
        this._tint = color;
        if (this.threeMaterial) {
            const rgb = this.parseColor(color);
            this.threeMaterial.color.setRGB(rgb.r / 255, rgb.g / 255, rgb.b / 255);
        }
    }

    /**
     * 获取 Three.js 网格
     */
    getThreeMesh(): THREE.Mesh | null {
        return this.threeMesh;
    }

    /**
     * 解析颜色字符串
     */
    private parseColor(color: string): { r: number; g: number; b: number } {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            };
        }
        return { r: 255, g: 255, b: 255 };
    }

    /**
     * 销毁
     */
    destroy(): void {
        if (!this._destroyed) {
            this.destroyThreeMesh();
            this._texture = null;
            this._destroyed = true;
        }
    }

    /**
     * 静态方法：从 JSON 配置文件加载 2D 图片精灵
     * @param jsonPath 配置文件路径（/unit/{modelId}.json）
     * @param blackboard 黑板对象
     * @returns 创建的 Sprite2D 实例
     */
    static async create(jsonPath: string, blackboard: Record<string, any> = {}): Promise<Sprite2D> {
        const isImagePath = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(jsonPath);
        if (isImagePath) {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error(`Failed to load image: ${jsonPath}`));
                image.src = jsonPath;
            });

            const width = img.width / 10;
            const height = img.height / 10;
            return new Sprite2D(img, width, height, blackboard);
        }

        try {
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${jsonPath}: ${response.statusText}`);
            }
            const config = await response.json();

            // 从配置中提取基本信息
            const imagePath = config.image || config.texture;
            if (!imagePath) {
                throw new Error(`No image/texture property found in ${jsonPath}`);
            }

            const width = config.width ?? 1;
            const height = config.height ?? 1;

            // 加载图片
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
                image.src = imagePath;
            });

            // 创建 Sprite2D 实例
            const sprite = new Sprite2D(img, width, height, blackboard);
            return sprite;
        } catch (error) {
            throw new Error(`Failed to create Sprite2D from ${jsonPath}: ${error}`);
        }
    }
}
