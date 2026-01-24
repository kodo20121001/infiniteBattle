/**
 * 地图管理类
 * 负责加载和管理地图配置、背景图像和地图元素
 */

import { Sprite2D } from '../../engine/base/Sprite2D';
import { SpriteManager } from '../../engine/common/SpriteManager';

export interface MapPoint {
    id: string | number;
    x: number;
    y: number;
}

export interface MapImageNode {
    id: string | number;
    name: string;
    x: number;
    y: number;
    path: string;
}

export interface MapConfig {
    id: number;
    name: string;
    mapWidth?: number;
    mapHeight?: number;
    gridWidth?: number;
    gridHeight?: number;
    imageTree?: MapImageNode[];
    points?: MapPoint[];
    paths?: any[];
    triggerAreas?: any[];
    gridCells?: any[];
}

/**
 * 游戏地图类
 */
export class GameMap {
    private _config: MapConfig;
    private _backgroundSprites: globalThis.Map<string, Sprite2D> = new globalThis.Map();
    private _spriteManager: SpriteManager;
    private _loadedImages: globalThis.Map<string, HTMLImageElement> = new globalThis.Map();

    constructor(config: MapConfig, spriteManager: SpriteManager) {
        this._config = config;
        this._spriteManager = spriteManager;
    }

    /**
     * 加载地图背景图像
     */
    async loadBackgrounds(): Promise<void> {
        if (!this._config.imageTree || this._config.imageTree.length === 0) {
            console.log('No background images to load');
            return;
        }

        console.log(`Loading ${this._config.imageTree.length} background images...`);
        const loadPromises = this._config.imageTree.map((imageNode) => {
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    console.log(`✓ Loaded image: ${imageNode.path}`);
                    const sprite = new Sprite2D(img);
                    sprite.setPosition(imageNode.x || 0, imageNode.y || 0, -100); // z = -100 放在后面
                    const spriteId = `bg_${imageNode.id}`;
                    this._spriteManager.add(spriteId, sprite);
                    this._backgroundSprites.set(spriteId, sprite);
                    this._loadedImages.set(spriteId, img);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`✗ Failed to load map image: ${imageNode.path}`);
                    resolve(); // 继续加载其他图像
                };
                img.crossOrigin = 'anonymous';
                img.src = imageNode.path;
                console.log(`Loading image: ${imageNode.path}`);
            });
        });

        await Promise.all(loadPromises);
        console.log('All background images loaded');
    }

    /**
     * 获取地图宽度
     */
    getWidth(): number {
        return this._config.mapWidth || 1000;
    }

    /**
     * 获取地图高度
     */
    getHeight(): number {
        return this._config.mapHeight || 1000;
    }

    /**
     * 获取地图配置
     */
    getConfig(): MapConfig {
        return this._config;
    }

    /**
     * 获取指定ID的点位
     */
    getPoint(pointId: string | number): MapPoint | undefined {
        return this._config.points?.find((p) => p.id === pointId);
    }

    /**
     * 获取所有点位
     */
    getPoints(): MapPoint[] {
        return this._config.points || [];
    }

    /**
     * 清理地图资源
     */
    dispose(): void {
        // 移除背景 sprite
        for (const spriteId of this._backgroundSprites.keys()) {
            // 这里可以调用 spriteManager.remove(spriteId) 如果有此方法
        }
        this._backgroundSprites.clear();
        this._loadedImages.clear();
    }
}
