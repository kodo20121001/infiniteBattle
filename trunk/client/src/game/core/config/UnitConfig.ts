import { Configs } from "../../common/Configs";

/**
 * 单位配置
 */
export interface UnitConfig {
    id: number;                // 单位ID
    name: string;              // 单位名称
    modelId: number;           // 对应的模型ID
    skillIds: number[];        // 技能ID列表
    hitY: number;              // 受击点高度
    sightRange: number;        // 视野范围
}

/**
 * 根据 ID 获取单位配置
 */
export function getUnitConfig(id: number): UnitConfig | undefined {
    const configs = getUnitConfigs();
    if (Array.isArray(configs)) {
        return (configs as UnitConfig[]).find(c => c.id === id);
    }
    return (configs as Record<number, UnitConfig>)[id];
}

/**
 * 获取所有单位配置
 */
export function getUnitConfigs(): UnitConfig[] | Record<number, UnitConfig> {
    const table = Configs.Get('unit');
    return table || [];
}
