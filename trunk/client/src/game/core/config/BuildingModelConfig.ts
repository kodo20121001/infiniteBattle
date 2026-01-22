import { Configs } from "../../common/Configs";

export interface BuildingModelConfig {
    id: number;                 // 模型ID
    name: string;               // 模型名称
    gridWidth: number;          // 地图格子宽
    gridHeight: number;         // 地图格子高
    imagePath: string;          // 图片路径
    anchorX: number;            // 锚点X（像素，中心点到图片左上角的向量）
    anchorY: number;            // 锚点Y（像素，中心点到图片左上角的向量）
    occupiedCells: Array<[number, number]>; // 占格坐标，中心格子为 [0,0]
}

export function getBuildingModelConfig(id: number): BuildingModelConfig | undefined {
    const table = Configs.Get('building_model');
    if (!table) return undefined;
    if (Array.isArray(table)) return (table as BuildingModelConfig[]).find(c => c.id === id);
    return (table as Record<number, BuildingModelConfig>)[id];
}

export function getBuildingModelConfigs(): BuildingModelConfig[] | Record<number, BuildingModelConfig> {
    const table = Configs.Get('building_model');
    return table || [];
}
