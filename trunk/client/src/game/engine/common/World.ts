import { Camera2D } from '../base/Camera2D';
import { Renderer } from './Renderer';
import { SpriteManager } from './SpriteManager';

/**
 * World - 游戏世界管理类
 * 全局唯一的单例，管理渲染器、精灵管理器和相机
 */
export class World {
    private static _instance: World | null = null;

    readonly spriteManager: SpriteManager;
    readonly renderer: Renderer;
    readonly camera: Camera2D;

    private constructor(
        canvas: HTMLCanvasElement,
        width: number = 800,
        height: number = 600
    ) {
        // 初始化相机
        this.camera = new Camera2D(width, height);

        // 初始化精灵管理器
        this.spriteManager = new SpriteManager();

        // 初始化渲染器
        this.renderer = new Renderer(canvas, this.camera, this.spriteManager);
    }

    /**
     * 初始化 World（单例）
     */
    static initialize(canvas: HTMLCanvasElement, width: number = 800, height: number = 600): World {
        if (World._instance) {
            console.warn('World already initialized');
            return World._instance;
        }
        World._instance = new World(canvas, width, height);
        return World._instance;
    }

    /**
     * 获取 World 实例
     */
    static getInstance(): World {
        if (!World._instance) {
            throw new Error('World not initialized. Call World.initialize() first.');
        }
        return World._instance;
    }

    /**
     * 更新世界（每帧调用）
     */
    update(): void {
        this.spriteManager.update();
        this.renderer.render();
    }

    /**
     * 销毁世界
     */
    destroy(): void {
        this.renderer.destroy();
        this.spriteManager.clear();
        World._instance = null;
    }

    /**
     * 设置视口大小
     */
    setViewport(width: number, height: number): void {
        this.camera.setViewport(width, height);
        this.renderer.setViewport(width, height);
    }

    /**
     * 获取相机
     */
    getCamera(): Camera2D {
        return this.camera;
    }

    /**
     * 获取精灵管理器
     */
    getSpriteManager(): SpriteManager {
        return this.spriteManager;
    }

    /**
     * 获取渲染器
     */
    getRenderer(): Renderer {
        return this.renderer;
    }
}
