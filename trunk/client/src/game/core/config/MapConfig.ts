import { Configs } from "../../common/Configs";

/**
 * 触发区域类型枚举
 */
export enum TriggerAreaType {
    Circle = 'circle',         // 圆形
    Rectangle = 'rectangle',   // 矩形
    Grid = 'grid'             // 格子
}

/**
 * 点定义
 */
export interface MapPoint {
    id?: number;              // 点ID（可选，但建议设置便于关联）
    x: number;                 // X坐标
    y: number;                 // Y坐标
}

/**
 * 路径定义
 */
export interface MapPath {
    id: number;                // 路径ID
    name: string;              // 路径名称
    points: MapPoint[];        // 路径点列表
    closed?: boolean;          // 是否闭合
}

/**
 * 圆形触发区域
 */
export interface CircleTriggerArea {
    type: TriggerAreaType.Circle;
    id: number;                // 区域ID
    name: string;              // 区域名称
    center: MapPoint;          // 圆心
    radius: number;            // 半径
    data?: any;                // 额外数据
}

/**
 * 矩形触发区域
 */
export interface RectangleTriggerArea {
    type: TriggerAreaType.Rectangle;
    id: number;                // 区域ID
    name: string;              // 区域名称
    x: number;                 // 左上角X坐标
    y: number;                 // 左上角Y坐标
    width: number;             // 宽度
    height: number;            // 高度
    data?: any;                // 额外数据
}

/**
 * 格子触发区域
 */
export interface GridTriggerArea {
    type: TriggerAreaType.Grid;
    id: number;                // 区域ID
    name: string;              // 区域名称
    gridIndices: number[];     // 格子索引列表
    data?: any;                // 额外数据
}

/**
 * 触发区域联合类型
 */
export type TriggerArea = CircleTriggerArea | RectangleTriggerArea | GridTriggerArea;

/**
 * 格子信息
 */
// 阻挡格索引列表，存储不可行走的格子索引（0 到 宽*高-1）
export type GridCell = number;

/**
 * 图片树节点
 */
export interface ImageNode {
    id: number;                // 节点ID
    name: string;              // 节点名称
    path?: string;             // 图片路径
    x: number;                 // X坐标
    y: number;                 // Y坐标
    width?: number;            // 宽度
    height?: number;           // 高度
    rotation?: number;         // 旋转角度
    scale?: number;            // 缩放
    alpha?: number;            // 透明度
    visible?: boolean;         // 是否可见
    children?: ImageNode[];    // 子节点
}

/**
 * 地图配置
 */
export class MapConfig {
    id: number;                // 地图ID
    name: string;              // 地图名称
    
    // 地图尺寸
    mapWidth: number;          // 地图宽度
    mapHeight: number;         // 地图高度
    
    // 格子尺寸
    gridWidth: number;         // 单个格子宽度
    gridHeight: number;        // 单个格子高度
    
    // 图片树结构
    imageTree?: ImageNode[];   // 图片树根节点列表
    
    // 点列表
    points?: MapPoint[];       // 地图上的关键点列表
    
    // 路径列表
    paths?: MapPath[];         // 地图路径列表
    
    // 触发区域列表
    triggerAreas?: TriggerArea[]; // 触发区域列表
    
    // 阻挡格列表
    gridCells: GridCell[];     // 阻挡格索引列表

    constructor(id: number, name: string, mapWidth: number, mapHeight: number, 
                gridWidth: number, gridHeight: number, gridCells: GridCell[],
                imageTree?: ImageNode[], points?: MapPoint[], paths?: MapPath[],
                triggerAreas?: TriggerArea[]) {
        this.id = id;
        this.name = name;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.gridCells = gridCells;
        this.imageTree = imageTree;
        this.points = points;
        this.paths = paths;
        this.triggerAreas = triggerAreas;
    }
}

// 避免循环依赖，后续动态导入
/**
 * 根据 ID 获取地图配置
 */
export function getMapConfig(id: number): MapConfig | undefined {
    const table = Configs.Get('map');
    if (!table) return undefined;
    if (Array.isArray(table)) return (table as MapConfig[]).find(c => c.id === id);
    return (table as Record<number, MapConfig>)[id];
}

/**
 * 获取所有地图配置
 */
export function getMapConfigs(): MapConfig[] | Record<number, MapConfig> {
    const table = Configs.Get('map');
    return table || [];
}

/**
 * 根据坐标获取格子索引
 */
export function getGridIndex(x: number, y: number, mapConfig: MapConfig): number {
    const gridX = Math.floor(x / mapConfig.gridWidth);
    const gridY = Math.floor(y / mapConfig.gridHeight);
    const gridColCount = Math.floor(mapConfig.mapWidth / mapConfig.gridWidth);
    return gridY * gridColCount + gridX;
}

/**
 * 根据格子索引获取格子中心坐标
 */
export function getGridCenter(index: number, mapConfig: MapConfig): MapPoint {
    const gridColCount = Math.floor(mapConfig.mapWidth / mapConfig.gridWidth);
    const gridX = index % gridColCount;
    const gridY = Math.floor(index / gridColCount);
    return {
        x: gridX * mapConfig.gridWidth + mapConfig.gridWidth / 2,
        y: gridY * mapConfig.gridHeight + mapConfig.gridHeight / 2
    };
}

/**
 * 检查点是否在触发区域内
 */
export function isPointInTriggerArea(point: MapPoint, area: TriggerArea): boolean {
    switch (area.type) {
        case TriggerAreaType.Circle: {
            const dx = point.x - area.center.x;
            const dy = point.y - area.center.y;
            return dx * dx + dy * dy <= area.radius * area.radius;
        }
        case TriggerAreaType.Rectangle: {
            return point.x >= area.x 
                && point.x <= area.x + area.width
                && point.y >= area.y
                && point.y <= area.y + area.height;
        }
        case TriggerAreaType.Grid: {
            // 需要地图配置来计算格子索引
            // 这里只检查是否在格子列表中
            return false; // 需要外部传入mapConfig来实现
        }
        default:
            return false;
    }
}
