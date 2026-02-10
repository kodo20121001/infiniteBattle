import * as THREE from 'three';
import { Camera } from '../base/Camera';
import { SpriteManager } from './SpriteManager';
import { perfMonitor } from './PerformanceMonitor';

/**
 * Renderer - Three.js 3D 渲染器
 * 统一管理渲染流程，使用 Three.js 渲染精灵管理器中的元素
 */
export class Renderer {
    private canvas: HTMLCanvasElement;
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private camera: Camera;
    private spriteManager: SpriteManager;
    
    private _backgroundColor = { r: 0, g: 0, b: 0, a: 1 };
    private _clearBeforeRender = true;
    private _gridObject: THREE.Object3D | null = null;
    private _pointObjects: Map<string | number, THREE.Object3D> = new Map();

    constructor(
        canvas: HTMLCanvasElement,
        camera: Camera,
        spriteManager: SpriteManager
    ) {
        this.canvas = canvas;
        this.camera = camera;
        this.spriteManager = spriteManager;

        // 创建 Three.js 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);  // 深蓝色背景，参照CoordinateTester

        // 创建 WebGL 渲染器
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(new THREE.Color(0x0f172a), 1);  // 深蓝色
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;


        // 添加基础光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
    }

    /**
     * 设置背景色 (格式: '#RRGGBB' 或 'rgb(r, g, b)')
     */
    setBackgroundColor(color: string): void {
        const rgb = this.parseColor(color);
        this._backgroundColor = { 
            r: rgb.r / 255, 
            g: rgb.g / 255, 
            b: rgb.b / 255, 
            a: 1 
        };
        this.scene.background = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
        this.renderer.setClearColor(new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255), 1);
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
        // 默认黑色
        return { r: 0, g: 0, b: 0 };
    }

    /**
     * 设置是否在渲染前清屏
     */
    setClearBeforeRender(clear: boolean): void {
        this._clearBeforeRender = clear;
    }

    /**
     * 更新 Canvas 尺寸
     */
    resize(width: number, height: number): void {
        this.renderer.setSize(width, height);
        this.camera.resize(width, height);
    }

    /**
     * 渲染一帧
     * 优化：不再每帧删除/添加 sprite 到场景
     * 改为：sprite 添加到场景一次，通过改变位置/可见性更新
     */
    render(): void {
        perfMonitor.increment('Renderer.render');
        perfMonitor.set('Renderer.sceneObjects', this.scene.children.length);
        
        // 清理已销毁的 sprite（它们的 mesh 已在 dispose 中移除）
        const sprites = this.spriteManager.getAll();
        perfMonitor.set('Renderer.sprites', sprites.length);
        
        // 按深度排序（更新 z-index，但不重建场景结构）
        this.spriteManager.sortByZIndex((sprite) => sprite.position.z);

        // 更新所有 sprite 对象的场景关联
        for (const sprite of sprites) {
            if (sprite.destroyed) continue;

            // Sprite2D
            if ('getThreeMesh' in sprite && typeof (sprite as any).getThreeMesh === 'function') {
                const mesh = (sprite as any).getThreeMesh();
                if (mesh) {
                    // 确保 mesh 在场景中（只在第一次添加时）
                    if (mesh.parent !== this.scene) {
                        perfMonitor.increment('Renderer.spriteAdd');
                        mesh.userData.isSpriteQuad = true;
                        this.scene.add(mesh);
                    }
                }
            }

            // Sprite3D
            if ('getThreeGroup' in sprite && typeof (sprite as any).getThreeGroup === 'function') {
                const group = (sprite as any).getThreeGroup();
                if (group) {
                    if (group.parent !== this.scene) {
                        group.userData.isSprite3D = true;
                        this.scene.add(group);
                    }
                }
            }

            // 基础 Sprite（插件系统）
            if ('getThreeObject' in sprite && typeof (sprite as any).getThreeObject === 'function') {
                if (!('getThreeMesh' in sprite) && !('getThreeGroup' in sprite)) {
                    const obj = (sprite as any).getThreeObject();
                    if (obj) {
                        if (obj.parent !== this.scene) {
                            obj.userData.isSpriteObject = true;
                            this.scene.add(obj);
                        }
                    }
                }
            }
        }

        // 清屏并渲染
        if (this._clearBeforeRender) {
            this.renderer.clear();
        }

        const threeCamera = this.camera.getThreeCamera();
        this.renderer.render(this.scene, threeCamera);
    }

    /**
     * 清屏
     */
    clear(): void {
        this.renderer.clear();
    }

    /**
     * 添加 3D 对象到场景（用于 3D 扩展）
     */
    addToScene(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    /**
     * 从场景移除 3D 对象
     */
    removeFromScene(object: THREE.Object3D): void {
        this.scene.remove(object);
    }

    /**
     * 获取 Three.js 场景
     */
    getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * 获取 Three.js 渲染器
     */
    getThreeRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    /**
     * 获取 Three.js 相机
     */
    getThreeCamera(): THREE.OrthographicCamera {
        return this.camera.getThreeCamera();
    }

    /**
     * 渲染 UI 层（不受相机影响）
     */
    renderUI(callback: (ctx: CanvasRenderingContext2D) => void): void {
        console.warn('renderUI with Three.js requires a separate 2D canvas overlay');
    }

    /**
     * 获取 Canvas
     */
    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * 获取相机
     */
    getCamera(): Camera {
        return this.camera;
    }

    /**
     * 获取精灵管理器
     */
    getSpriteManager(): SpriteManager {
        return this.spriteManager;
    }

    /**
     * 销毁渲染器并释放资源
     */
    destroy(): void {
        this.scene.clear();
        this.renderer.dispose();
    }

    /**
     * 显示网格（0.5 x 0.5）
     */
    showGrid(mapWidth: number, mapHeight: number): void {
        // 移除旧网格
        if (this._gridObject) {
            this.scene.remove(this._gridObject);
            this._gridObject = null;
        }

        // 创建新网格
        const gridSize = Math.max(mapWidth, mapHeight);
        const gridCellSize = 0.5;
        const gridDivisions = Math.ceil(gridSize / gridCellSize);
        const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x222222);
        gridHelper.position.set(mapWidth / 2, 0, mapHeight / 2);
        
        this.scene.add(gridHelper);
        this._gridObject = gridHelper;
    }

    /**
     * 隐藏网格
     */
    hideGrid(): void {
        if (this._gridObject) {
            this.scene.remove(this._gridObject);
            this._gridObject = null;
        }
    }

    /**
     * 添加地图点标记
     * @param id 点的ID
     * @param x 世界坐标 X
     * @param y 世界坐标 Y（高度）
     * @param z 世界坐标 Z
     * @param color 颜色（16进制）
     * @param size 大小（米）
     */
    addPointMarker(id: string | number, x: number, y: number, z: number, color: number = 0xff0000, size: number = 0.5): void {
        // 移除旧标记
        this.removePointMarker(id);

        // 创建球体标记
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z);
        
        this.scene.add(sphere);
        this._pointObjects.set(id, sphere);
    }

    /**
     * 添加方块标记（用于坐标系角点）
     */
    addCubeMarker(id: string | number, x: number, y: number, z: number, color: number = 0xff0000, size: number = 0.6, height: number = 0.3): void {
        this.removePointMarker(id);

        const geometry = new THREE.BoxGeometry(size, height, size);
        const material = new THREE.MeshBasicMaterial({ color });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);

        this.scene.add(cube);
        this._pointObjects.set(id, cube);
    }

    /**
     * 移除地图点标记
     * @param id 点的ID
     */
    removePointMarker(id: string | number): void {
        const pointObject = this._pointObjects.get(id);
        if (pointObject) {
            this.scene.remove(pointObject);
            this._pointObjects.delete(id);
        }
    }

    /**
     * 清除所有点标记
     */
    clearPointMarkers(): void {
        this._pointObjects.forEach(pointObject => {
            this.scene.remove(pointObject);
        });
        this._pointObjects.clear();
    }
}
