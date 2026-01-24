/**
 * 地图管理类
 * 负责加载和管理地图配置、背景图像和地图元素
 */

import { Sprite2D } from '../../engine/base/Sprite2D';
import { SpriteManager } from '../../engine/common/SpriteManager';

export interface MapPoint {
    id: string | number;
    x: number;  // 水平（米）
    y: number;  // 高度（米）
    z: number;  // 深度（米）
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
    mapWidth?: number;        // 地图宽度（米）
    mapHeight?: number;       // 地图高度（米）
    gridWidth?: number;       // 格子宽度（米）
    gridHeight?: number;      // 格子高度（米）
    colCount?: number;        // 网格列数（预计算）
    rowCount?: number;        // 网格行数（预计算）
    pixelsPerMeterX?: number;  // 横轴：1米对应多少像素（默认32）
    pixelsPerMeterY?: number;  // 纵轴：1米对应多少像素（默认16，斜45度俯视）
    viewportWidth?: number;    // 视口宽度（像素，默认800）
    viewportHeight?: number;   // 视口高度（像素，默认600）
    cameraX?: number;          // 相机初始X位置（世界坐标，米）
    cameraY?: number;          // 相机初始Y位置（世界坐标，米）
    cameraZ?: number;          // 相机初始Z位置（世界坐标，米）
    imageTree?: MapImageNode[];
    points?: MapPoint[];
    paths?: any[];
    triggerAreas?: any[];
    gridCells?: number[];      // 阻挡格索引列表（0-based，行主序）
}

/**
 * 游戏地图类
 */
export class GameMap {
    private _config: MapConfig;
    private _backgroundSprites: globalThis.Map<string, Sprite2D> = new globalThis.Map();
    private _spriteManager: SpriteManager;
    private _loadedImages: globalThis.Map<string, HTMLImageElement> = new globalThis.Map();
    private _blockedCells: Set<number> = new Set();

    constructor(config: MapConfig, spriteManager: SpriteManager) {
        this._config = config;
        this._spriteManager = spriteManager;

        // 预计算列/行数，若配置中未提供则按尺寸与格子大小推算并写回配置
        const gw = config.gridWidth || 0;
        const gh = config.gridHeight || 0;
        if (gw > 0 && gh > 0 && config.mapWidth && config.mapHeight) {
            const colCount = config.colCount ?? Math.floor(config.mapWidth / gw);
            const rowCount = config.rowCount ?? Math.floor(config.mapHeight / gh);
            this._config.colCount = colCount;
            this._config.rowCount = rowCount;
        }

        if (config.gridCells && Array.isArray(config.gridCells)) {
            config.gridCells.forEach((idx) => {
                if (typeof idx === 'number' && idx >= 0) this._blockedCells.add(idx);
            });
        }
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
                    sprite.setAnchor(0, 0);
                    sprite.setPosition(imageNode.x || 0, imageNode.y || 0, -100);
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
     * 将世界坐标转换为网格索引
     * @returns { col, row, index } 或 null（越界或配置缺失）
     */
    worldToGrid(x: number, y: number): { col: number; row: number; index: number } | null {
        const gw = this._config.gridWidth!;
        const gh = this._config.gridHeight!;
        const colCount = this._config.colCount!;
        const rowCount = this._config.rowCount!;

        const col = Math.floor(x / gw);
        const row = Math.floor(y / gh);
        if (col < 0 || row < 0 || col >= colCount || row >= rowCount) return null;

        const index = row * colCount + col;
        return { col, row, index };
    }

    /**
     * 判断指定世界坐标是否可行走
     */
    isWalkable(x: number, y: number): boolean {
        const grid = this.worldToGrid(x, y);
        if (!grid) return false; // 越界或配置不完整
        return !this._blockedCells.has(grid.index);
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
