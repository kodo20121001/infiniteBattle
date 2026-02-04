/**
 * 地图管理类
 * 负责加载和管理地图配置、背景图像和地图元素
 */

import * as THREE from 'three';
import { Sprite2D } from '../../engine/base/Sprite2D';
import { SpriteManager } from '../../engine/common/SpriteManager';
import type { Camera } from '../../engine/base/Camera';

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
    width?: number;  // 图片宽度（米）
    height?: number; // 图片高度（米）
    children?: MapImageNode[]; // 子节点
    scale?: number;  // 缩放比例
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
    private _spriteManager: SpriteManager;
    private _blockedCells: Set<number> = new Set();
    private _camera?: Camera;

    constructor(config: MapConfig, spriteManager: SpriteManager, camera?: Camera) {
        this._config = config;
        this._spriteManager = spriteManager;
        this._camera = camera;

        // 预计算列/行数
        const gw = config.gridWidth || 0;
        const gh = config.gridHeight || 0;
        if (gw > 0 && gh > 0 && config.mapWidth && config.mapHeight) {
            this._config.colCount = config.colCount ?? Math.floor(config.mapWidth / gw);
            this._config.rowCount = config.rowCount ?? Math.floor(config.mapHeight / gh);
        }

        // 初始化阻挡格
        if (config.gridCells) {
            config.gridCells.forEach((idx) => {
                if (typeof idx === 'number' && idx >= 0) this._blockedCells.add(idx);
            });
        }

        // 根据地图尺寸初始化相机（如果提供）
        if (this._camera) {
            const mapWidth = config.mapWidth || 1;
            const mapHeight = config.mapHeight || 1;
            this._camera.setOrthoHeight(mapHeight);
            this._camera.setPosition(mapWidth / 2, 50, mapHeight / 2);
            this._camera.setZoom(1);
        }
    }

    /**
     * 应用精灵变换（位置、尺寸、旋转）
     */
    private applySpriteTransform(sprite: Sprite2D, imageNode: MapImageNode, img: HTMLImageElement): void {
        const widthMeters = imageNode.width ?? img.width;
        const heightMeters = imageNode.height ?? img.height;
        
        sprite.setSize(widthMeters, heightMeters);
        sprite.setAnchor(0.5, 0.5);
        sprite.setPosition(
            imageNode.x + widthMeters / 2,
            0,
            imageNode.y + heightMeters / 2
        );
        
        const mesh = sprite.getThreeMesh();
        if (mesh) {
            mesh.rotation.x = -Math.PI / 2;
            const mat = mesh.material;
            const tex = Array.isArray(mat)
                ? (mat[0] as THREE.MeshBasicMaterial)?.map
                : (mat as THREE.MeshBasicMaterial)?.map;
            if (tex) {
                tex.flipY = false;
                tex.needsUpdate = true;
            }
        }
    }

    /**
     * 加载单个图片节点
     */
    private loadImageNode(imageNode: MapImageNode, spriteId: string): Promise<void> {
        return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                const sprite = new Sprite2D(img, 1, 1);
                this.applySpriteTransform(sprite, imageNode, img);
                this._spriteManager.add(spriteId, sprite);
                resolve();
            };
            img.onerror = () => {
                console.warn(`✗ Failed: ${imageNode.path}`);
                resolve();
            };
            img.crossOrigin = 'anonymous';
            img.src = imageNode.path;
        });
    }

    /**
     * 更新已存在的sprite
     */
    private updateExistingSprite(sprite: Sprite2D, imageNode: MapImageNode, spriteId: string): Promise<void> {
        return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.applySpriteTransform(sprite, imageNode, img);
                resolve();
            };
            img.onerror = () => resolve();
            img.crossOrigin = 'anonymous';
            img.src = imageNode.path;
        });
    }

    /**
     * 加载地图图片
     */
    async loadImages(): Promise<void> {
        if (!this._config.imageTree?.length) {
            console.log('No images to load');
            return;
        }

        console.log(`Loading ${this._config.imageTree.length} images...`);
        const promises: Promise<void>[] = [];
        
        const processTree = (nodes: MapImageNode[]) => {
            for (const node of nodes) {
                const spriteId = `bg_${node.id}`;
                promises.push(this.loadImageNode(node, spriteId));
                if (node.children?.length) {
                    processTree(node.children);
                }
            }
        };

        processTree(this._config.imageTree);
        await Promise.all(promises);
    }

    /**
     * 更新图片显示（尺寸/位置/新增/删除）
     */
    async updateImages(imageTree?: MapImageNode[]): Promise<void> {
        if (!imageTree) return;
        
        const promises: Promise<void>[] = [];

        const processTree = (nodes: MapImageNode[]) => {
            for (const node of nodes) {
                const spriteId = `bg_${node.id}`;
                const existingSprite = this._spriteManager.get(spriteId) as Sprite2D | undefined;
                
                promises.push(
                    existingSprite
                        ? this.updateExistingSprite(existingSprite, node, spriteId)
                        : this.loadImageNode(node, spriteId)
                );
                
                if (node.children?.length) {
                    processTree(node.children);
                }
            }
        };

        processTree(imageTree);
        await Promise.all(promises);
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
     * 调用导出函数避免代码重复（世界 X/Z）
     */
    worldToGrid(x: number, z: number): { col: number; row: number; index: number } | null {
        return worldToGrid(x, z, this._config);
    }

    /**
     * 判断指定世界坐标是否可行走
     */
    isWalkable(x: number, z: number): boolean {
        const grid = this.worldToGrid(x, z);
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
        // 不需要做什么，sprite由spriteManager管理
    }
}

/**
 * 世界坐标转网格坐标（工具函数）
 * 左下角为原点：世界 X 向右，世界 Z 向上
 * @param worldX 世界坐标 X
 * @param worldZ 世界坐标 Z（对应深度）
 * @param config 地图配置
 * @returns { col, row, index } 或 null（越界或配置缺失）
 */
export const worldToGrid = (
    worldX: number,
    worldZ: number,
    config: MapConfig
): { col: number; row: number; index: number } | null => {
    if (!config.gridWidth || !config.gridHeight || !config.colCount || !config.rowCount || !config.mapHeight) {
        return null;
    }

    const col = Math.floor(worldX / config.gridWidth);
    const row = Math.floor(worldZ / config.gridHeight);
    
    if (col < 0 || row < 0 || col >= config.colCount || row >= config.rowCount) {
        return null;
    }

    const index = row * config.colCount + col;
    return { col, row, index };
};

/**
 * 网格坐标转世界坐标（工具函数，格子中心点）
 * 左下角为原点：世界 X 向右，世界 Z 向上
 * @param col 格子列号
 * @param row 格子行号
 * @param config 地图配置
 * @returns { x, z } 世界坐标（格子中心点）或 null（越界或配置缺失）
 */
export const gridToWorld = (
    col: number,
    row: number,
    config: MapConfig
): { x: number; z: number } | null => {
    if (!config.gridWidth || !config.gridHeight || !config.colCount || !config.rowCount || !config.mapHeight) {
        return null;
    }

    if (col < 0 || row < 0 || col >= config.colCount || row >= config.rowCount) {
        return null;
    }

    // 返回格子中心点
    const x = (col + 0.5) * config.gridWidth;
    const z = (row + 0.5) * config.gridHeight;

    return { x, z };
};

/**
 * 网格索引转世界坐标（工具函数）
 * @param index 格子索引
 * @param config 地图配置
 * @returns { x, z } 世界坐标或 null（越界或配置缺失）
 */
export const gridIndexToWorld = (
    index: number,
    config: MapConfig
): { x: number; z: number } | null => {
    if (!config.colCount || !config.rowCount) {
        return null;
    }

    if (index < 0 || index >= config.colCount * config.rowCount) {
        return null;
    }

    const col = index % config.colCount;
    const row = Math.floor(index / config.colCount);

    return gridToWorld(col, row, config);
};

/**
 * 判断指定世界坐标是否被阻挡（工具函数）
 * @param worldX 世界坐标 X
 * @param worldY 世界坐标 Y（对应 Z 深度）
 * @param config 地图配置
 * @returns true 表示可行走，false 表示被阻挡或越界
 */
export const isGridWalkable = (
    worldX: number,
    worldY: number,
    config: MapConfig
): boolean => {
    const grid = worldToGrid(worldX, worldY, config);
    if (!grid) return false;
    
    const blockedCells = config.gridCells || [];
    return !blockedCells.includes(grid.index);
};
/**
 * 计算世界坐标所属的格子 ID（0.5 x 0.5 格子）
 * @param worldX 世界坐标 X
 * @param worldZ 世界坐标 Z
 * @param mapWidth 地图宽度
 * @param gridCellSize 格子大小（默认0.5）
 * @returns 格子信息 {gridX, gridZ, gridId}
 */
export const calculateGridId = (
    worldX: number,
    worldZ: number,
    mapWidth: number,
    gridCellSize: number = 0.5
): { gridX: number; gridZ: number; gridId: number } => {
    const gridX = Math.floor(worldX / gridCellSize);
    const gridZ = Math.floor(worldZ / gridCellSize);
    const gridId = gridZ * Math.ceil(mapWidth / gridCellSize) + gridX;
    return { gridX, gridZ, gridId };
};

/**
 * 从格子 ID 还原为格子坐标（0.5 x 0.5 格子）
 * @param gridId 格子 ID
 * @param mapWidth 地图宽度
 * @param gridCellSize 格子大小（默认0.5）
 * @returns 格子坐标 {gridX, gridZ}
 */
export const getGridCoordinates = (
    gridId: number,
    mapWidth: number,
    gridCellSize: number = 0.5
): { gridX: number; gridZ: number } => {
    const colCount = Math.ceil(mapWidth / gridCellSize);
    const gridZ = Math.floor(gridId / colCount);
    const gridX = gridId % colCount;
    return { gridX, gridZ };
};