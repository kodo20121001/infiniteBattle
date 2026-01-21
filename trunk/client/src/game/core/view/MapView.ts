import { Runtime } from "../Runtime";
import { getMapConfig, MapConfig } from "../config/MapConfig";
import type { ImageNode } from "../config/MapConfig";
import { assets } from "../../engine/common/Assets";
import { World } from "../../engine/common/World";
import { Sprite2D } from "../../engine/base/Sprite2D";
import { Vector2 } from "../../engine/base/Vector2";

export class MapView {
    private mapId: number = 1; // 写死地图ID为1
    private mapConfig: MapConfig | undefined;
    private imageCache: Map<string, HTMLImageElement> = new Map();
    private spriteMap: Map<string, Sprite2D> = new Map(); // 存储创建的精灵
    private loadedImages: number = 0;
    private totalImages: number = 0;
    actor: any = null; // 游戏中的 actor 对象

    constructor() {
    }

    /**
     * 初始化地图视图
     */
    async Start() {
        try {
            // 获取地图配置
            this.mapConfig = getMapConfig(this.mapId);
            if (!this.mapConfig) {
                console.warn(`地图配置 ID ${this.mapId} 未找到，可能配置还未加载`);
                return;
            }

            console.log('MapView Start:', this.mapConfig);

            // 统计需要加载的图片数量
            this.totalImages = this.countImageNodes(this.mapConfig.imageTree || []);

            // 如果没有图片则直接返回
            if (this.totalImages === 0) {
                console.log('地图没有配置图片');
                return;
            }

            // 预加载所有图片
            await this.preloadImages(this.mapConfig.imageTree || []);

            // 创建精灵树
            this.createSpriteTree(this.mapConfig.imageTree || []);
        } catch (error) {
            console.error('MapView 初始化失败:', error);
        }
    }

    /**
     * 创建精灵树（递归）
     */
    private createSpriteTree(nodes: ImageNode[], parentSprite?: Sprite2D, parentId: string = 'map') {
        let spriteIndex = 0;
        
        for (const node of nodes) {
            const spriteId = `${parentId}_node_${spriteIndex}`;
            
            if (node.path) {
                const img = this.imageCache.get(node.path);
                if (img) {
                    // 创建精灵
                    const sprite = new Sprite2D(img);
                    sprite.setPosition(node.x, node.y, 0);
                    
                    // 设置缩放
                    if (node.scale !== undefined) {
                        sprite.setScale(node.scale, node.scale);
                    }
                    
                    // 设置旋转
                    if (node.rotation !== undefined) {
                        sprite.rotation = (node.rotation * Math.PI) / 180;
                    }
                    
                    // 设置透明度
                    if (node.alpha !== undefined) {
                        sprite.alpha = node.alpha;
                    }
                    
                    // 添加到 World
                    try {
                        const world = World.getInstance();
                        world.getSpriteManager().add(spriteId, sprite);
                        this.spriteMap.set(spriteId, sprite);
                    } catch (err) {
                        console.warn('Failed to add sprite to World:', err);
                    }
                }
            }
            
            // 递归处理子节点
            if (node.children && node.children.length > 0) {
                this.createSpriteTree(node.children, undefined, `${spriteId}_children`);
            }
            
            spriteIndex++;
        }
    }

    /**
     * 统计图片节点数量
     */
    private countImageNodes(nodes: ImageNode[]): number {
        let count = 0;
        for (const node of nodes) {
            if (node.path) count++;
            if (node.children && node.children.length > 0) {
                count += this.countImageNodes(node.children);
            }
        }
        return count;
    }

    /**
     * 预加载所有图片
     */
    private async preloadImages(nodes: ImageNode[]): Promise<void> {
        const promises: Promise<void>[] = [];

        const walk = (nodeList: ImageNode[]) => {
            for (const node of nodeList) {
                if (node.path && !this.imageCache.has(node.path)) {
                    promises.push(this.loadImage(node.path));
                }
                if (node.children && node.children.length > 0) {
                    walk(node.children);
                }
            }
        };

        walk(nodes);
        await Promise.all(promises);
    }

    /**
     * 加载单个图片
     */
    private async loadImage(path: string): Promise<void> {
        try {
            const img = await assets.getImage(path);
            this.imageCache.set(path, img);
            this.loadedImages++;
            console.log(`加载图片 ${this.loadedImages}/${this.totalImages}: ${path}`);
        } catch (error) {
            console.warn(`加载图片失败: ${path}`, error);
            this.loadedImages++;
        }
    }

    /**
     * 更新地图视图
     */
    Update() {
        // 精灵通过 World 更新，这里不需要做任何事
    }

    /**
     * 销毁地图视图
     */
    onDestroy() {
        // 从 World 移除所有精灵
        try {
            const world = World.getInstance();
            const spriteManager = world.getSpriteManager();
            for (const [id] of this.spriteMap) {
                spriteManager.remove(id);
            }
        } catch (err) {
            console.warn('Failed to remove sprites from World:', err);
        }

        // 释放 Assets 资源
        for (const path of this.imageCache.keys()) {
            assets.release('image', path);
        }

        // 清理缓存
        this.imageCache.clear();
        this.spriteMap.clear();
    }

    /**
     * 获取地图配置
     */
    getMapConfig(): MapConfig | undefined {
        return this.mapConfig;
    }

    /**
     * 获取地图ID
     */
    getMapId(): number {
        return this.mapId;
    }

    /**
     * 设置地图ID
     */
    setMapId(id: number) {
        this.mapId = id;
    }

    /**
     * 获取画布
     */
    getCanvas(): HTMLCanvasElement | null {
        return null; // MapView 现在不使用 canvas，由 World 管理
    }
}