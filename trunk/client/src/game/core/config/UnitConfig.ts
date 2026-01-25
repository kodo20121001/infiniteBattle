import { Configs } from "../../common/Configs";

/**
 * 单位配置
 */
export interface UnitConfig {
    id: number;                // 单位ID
    name: string;              // 单位名称
    modelId: number;           // 对应的模型ID
    skillIds: number[];        // 技能ID列表
    attackSkillId: number;     // 基础攻击技能ID
    hitY: number;              // 受击点高度
    sightRange: number;        // 视野范围
    obstacleCheckDistance?: number; // 障碍检测距离（米），默认0.5
    // 单位避让配置（可选）
    avoidanceEnabled?: boolean;        // 是否启用单位避让
    avoidanceRangeFactor?: number;     // 邻居检测范围系数（相对自身半径）
    separationStrength?: number;       // 分离力混合权重（0-1）
    slideEnabled?: boolean;            // 是否启用接触滑动兜底
    slideFactor?: number;              // 滑动距离缩放（0-1）
    safeMargin?: number;               // 轻微安全边距（米）
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
