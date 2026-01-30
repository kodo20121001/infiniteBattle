import { Configs } from "../../common/Configs";

/**
 * 单位配置
 */
export interface UnitConfig {
    id: number;                // 单位ID
    name: string;              // 单位名称
    modelId: string;           // 对应的模型ID
    skillIds: number[];        // 技能ID列表
    attackSkillId: number;     // 基础攻击技能ID
    hitY: number;              // 受击点高度
    sightRange: number;        // 视野范围
    moveSpeed?: number;        // 移动速度（覆盖模型速度）
    obstacleCheckDistance?: number; // 障碍检测距离（米），默认0.5
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
