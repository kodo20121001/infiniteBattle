import { Configs } from "../../common/Configs";
import { BuildingAbilityConfig } from "./BuildingAbilityConfig";

/**
 * 建筑基础数据
 */
export interface BuildingBaseData {
    hp: number;                                 // 当前生命值
    hpMax: number;                              // 最大生命值
    cost: {                                      // 建造成本
        gold: number;                            // 金币消耗
        wood: number;                            // 木材消耗
    };
    buildTime: number;                          // 建造时间（秒）
    occupiedCells: Array<[number, number]>;     // 占用格子坐标列表，相对于中心点(0,0)
    armor: number;                              // 护甲值
    armorType: string;                          // 护甲类型：light, medium, heavy, fortified
}

/**
 * 建筑配置
 */
export interface BuildingConfig {
    id: string;                                 // 建筑ID
    name: string;                               // 建筑名称
    description: string;                        // 建筑描述
    modelId: string;                            // 模型ID（关联到 model.json）
    icon: string;                               // 图标路径
    baseData: BuildingBaseData;                 // 基础数据
    abilities: BuildingAbilityConfig[];         // 能力列表
}

/**
 * 建筑类型枚举
 */
export enum BuildingType {
    Production = 'production',      // 生产建筑
    Defense = 'defense',            // 防御建筑
    Resource = 'resource',          // 资源建筑
    MainBase = 'main_base',         // 主基地
    HeroAltar = 'hero_altar',       // 英雄祭坛
    Tech = 'tech',                  // 科技建筑
    Special = 'special'             // 特殊建筑
}

/**
 * 护甲类型枚举
 */
export enum ArmorType {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
    Fortified = 'fortified'
}

/**
 * 获取所有建筑配置
 * @returns 建筑配置数组
 */
export function getBuildingConfigs(): BuildingConfig[] {
    const table = Configs.Get('building');
    if (!table) return [];
    return Array.isArray(table) ? table : Object.values(table);
}

/**
 * 根据ID获取建筑配置
 * @param id 建筑ID
 * @returns 建筑配置，如果不存在返回 undefined
 */
export function getBuildingConfig(id: string): BuildingConfig | undefined {
    const configs = getBuildingConfigs();
    return configs.find(c => c.id === id);
}

/**
 * 根据模型ID获取建筑配置列表
 * @param modelId 模型ID
 * @returns 使用该模型的所有建筑配置
 */
export function getBuildingConfigsByModel(modelId: string): BuildingConfig[] {
    const configs = getBuildingConfigs();
    return configs.filter(c => c.modelId === modelId);
}

/**
 * 检查建筑是否拥有指定能力
 * @param building 建筑配置
 * @param abilityType 能力类型
 * @returns 如果建筑拥有该能力返回 true
 */
export function hasAbility(building: BuildingConfig, abilityType: string): boolean {
    return building.abilities.some(a => a.type === abilityType);
}

/**
 * 获取建筑的指定能力配置
 * @param building 建筑配置
 * @param abilityType 能力类型
 * @returns 能力配置，如果不存在返回 undefined
 */
export function getAbility(building: BuildingConfig, abilityType: string): BuildingAbilityConfig | undefined {
    return building.abilities.find(a => a.type === abilityType);
}

/**
 * 计算建筑占用的格子范围
 * @param building 建筑配置
 * @returns { minX, maxX, minY, maxY } 格子范围
 */
export function getBuildingBounds(building: BuildingConfig): { 
    minX: number; 
    maxX: number; 
    minY: number; 
    maxY: number; 
} {
    const cells = building.baseData.occupiedCells;
    if (cells.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    let minX = cells[0][0];
    let maxX = cells[0][0];
    let minY = cells[0][1];
    let maxY = cells[0][1];

    cells.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });

    return { minX, maxX, minY, maxY };
}

/**
 * 获取建筑占用的格子数量
 * @param building 建筑配置
 * @returns 占用格子数量
 */
export function getBuildingCellCount(building: BuildingConfig): number {
    return building.baseData.occupiedCells.length;
}

/**
 * 检查建筑是否占用指定格子
 * @param building 建筑配置
 * @param x 格子X坐标
 * @param y 格子Y坐标
 * @returns 如果占用该格子返回 true
 */
export function occupiesCell(building: BuildingConfig, x: number, y: number): boolean {
    return building.baseData.occupiedCells.some(([cx, cy]) => cx === x && cy === y);
}

/**
 * 计算建筑的总建造成本
 * @param building 建筑配置
 * @returns { gold, wood, total } 成本信息
 */
export function getBuildingCost(building: BuildingConfig): { 
    gold: number; 
    wood: number; 
    total: number; 
} {
    const { gold, wood } = building.baseData.cost;
    return { gold, wood, total: gold + wood };
}

/**
 * 获取护甲类型对应的伤害减免系数
 * @param armorType 护甲类型
 * @param damageType 伤害类型
 * @returns 伤害减免系数（1.0 = 100%伤害，0.5 = 50%伤害）
 */
export function getArmorMultiplier(armorType: string, damageType: string): number {
    // 伤害类型表（参考魔兽争霸III）
    const multipliers: Record<string, Record<string, number>> = {
        'light': {
            'normal': 1.0,
            'pierce': 2.0,
            'siege': 1.0,
            'magic': 0.75,
            'chaos': 1.0
        },
        'medium': {
            'normal': 1.5,
            'pierce': 0.75,
            'siege': 0.5,
            'magic': 1.0,
            'chaos': 1.0
        },
        'heavy': {
            'normal': 1.0,
            'pierce': 0.75,
            'siege': 0.5,
            'magic': 1.25,
            'chaos': 1.0
        },
        'fortified': {
            'normal': 0.5,
            'pierce': 0.35,
            'siege': 1.5,
            'magic': 0.5,
            'chaos': 1.0
        }
    };

    return multipliers[armorType]?.[damageType] ?? 1.0;
}

/**
 * 计算实际伤害
 * @param baseDamage 基础伤害
 * @param armor 护甲值
 * @param armorType 护甲类型
 * @param damageType 伤害类型
 * @returns 实际伤害值
 */
export function calculateDamage(
    baseDamage: number, 
    armor: number, 
    armorType: string, 
    damageType: string
): number {
    // 护甲减伤公式：damage = baseDamage * armorMultiplier * (1 - armor * 0.06 / (1 + armor * 0.06))
    const armorMultiplier = getArmorMultiplier(armorType, damageType);
    const armorReduction = 1 - (armor * 0.06) / (1 + armor * 0.06);
    return baseDamage * armorMultiplier * armorReduction;
}

/**
 * 验证建筑配置
 * @param building 建筑配置
 * @returns 验证结果 { valid: boolean, errors: string[] }
 */
export function validateBuildingConfig(building: BuildingConfig): { 
    valid: boolean; 
    errors: string[] 
} {
    const errors: string[] = [];

    // 检查基本字段
    if (!building.id) errors.push('Missing building id');
    if (!building.name) errors.push('Missing building name');
    if (!building.modelId) errors.push('Missing modelId');

    // 检查基础数据
    if (!building.baseData) {
        errors.push('Missing baseData');
    } else {
        if (building.baseData.hp <= 0) errors.push('HP must be > 0');
        if (building.baseData.hpMax <= 0) errors.push('Max HP must be > 0');
        if (building.baseData.hp > building.baseData.hpMax) errors.push('HP cannot exceed Max HP');
        if (building.baseData.buildTime < 0) errors.push('Build time cannot be negative');
        if (!building.baseData.occupiedCells || building.baseData.occupiedCells.length === 0) {
            errors.push('occupiedCells cannot be empty');
        }
    }

    return { valid: errors.length === 0, errors };
}
