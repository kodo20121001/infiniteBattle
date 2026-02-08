import { Configs } from "../../common/Configs";

/**
 * 建筑能力字段定义
 */
export interface AbilityFieldDef {
    key: string;                    // 字段键名
    label: string;                  // 显示标签
    type: 'number' | 'string' | 'boolean' | 'select' | 'multiSelect' | 'array'; // 字段类型
    default: any;                   // 默认值
    min?: number;                   // 最小值（number类型）
    max?: number;                   // 最大值（number类型）
    step?: number;                  // 步进值（number类型）
    options?: string[];             // 选项列表（select/multiSelect类型）
    itemType?: string;              // 数组项类型（array类型）
    description?: string;           // 字段描述
}

/**
 * 建筑能力定义
 */
export interface BuildingAbilityDef {
    name: string;                   // 能力名称
    description: string;            // 能力描述
    icon: string;                   // 图标（emoji）
    fields: AbilityFieldDef[];      // 配置字段列表
}

/**
 * 建筑能力配置（实例）
 */
export interface BuildingAbilityConfig {
    type: string;                   // 能力类型（对应 BuildingAbilityDef 的 key）
    config: Record<string, any>;    // 能力配置数据
}

/**
 * 建筑能力类型枚举
 */
export enum BuildingAbilityType {
    ProductionQueue = 'ProductionQueue',       // 生产队列
    HeroAltar = 'HeroAltar',                   // 英雄祭坛
    TechResearcher = 'TechResearcher',         // 科技研发
    TurretAttack = 'TurretAttack',             // 炮塔攻击
    ResourceCollector = 'ResourceCollector',   // 资源采集点
    ResourceGenerator = 'ResourceGenerator',   // 资源生成
    SupplyProvider = 'SupplyProvider',         // 人口供给
    Aura = 'Aura',                             // 光环效果
    DefenseSystem = 'DefenseSystem',           // 防御系统
    Teleporter = 'Teleporter'                  // 传送门
}

/**
 * 获取所有建筑能力定义
 * @returns 建筑能力定义表（键为能力类型）
 */
export function getBuildingAbilityDefs(): Record<string, BuildingAbilityDef> {
    const table = Configs.Get('building_ability');
    return table || {};
}

/**
 * 获取指定建筑能力定义
 * @param type 能力类型
 * @returns 能力定义，如果不存在返回 undefined
 */
export function getBuildingAbilityDef(type: string): BuildingAbilityDef | undefined {
    const defs = getBuildingAbilityDefs();
    return defs[type];
}

/**
 * 检查能力是否存在
 * @param type 能力类型
 * @returns 如果能力定义存在返回 true
 */
export function hasAbilityDef(type: string): boolean {
    return getBuildingAbilityDef(type) !== undefined;
}

/**
 * 获取能力配置的默认值
 * @param type 能力类型
 * @returns 包含所有字段默认值的配置对象
 */
export function getDefaultAbilityConfig(type: string): Record<string, any> {
    const def = getBuildingAbilityDef(type);
    if (!def) return {};
    
    const config: Record<string, any> = {};
    def.fields.forEach(field => {
        config[field.key] = field.default;
    });
    return config;
}

/**
 * 验证能力配置
 * @param type 能力类型
 * @param config 配置数据
 * @returns 验证结果 { valid: boolean, errors: string[] }
 */
export function validateAbilityConfig(
    type: string, 
    config: Record<string, any>
): { valid: boolean; errors: string[] } {
    const def = getBuildingAbilityDef(type);
    if (!def) {
        return { valid: false, errors: [`Unknown ability type: ${type}`] };
    }

    const errors: string[] = [];

    def.fields.forEach(field => {
        const value = config[field.key];

        // 检查必填字段
        if (value === undefined || value === null) {
            if (field.default === undefined) {
                errors.push(`Missing required field: ${field.key}`);
            }
            return;
        }

        // 类型检查
        switch (field.type) {
            case 'number':
                if (typeof value !== 'number') {
                    errors.push(`Field ${field.key} must be a number`);
                } else {
                    if (field.min !== undefined && value < field.min) {
                        errors.push(`Field ${field.key} must be >= ${field.min}`);
                    }
                    if (field.max !== undefined && value > field.max) {
                        errors.push(`Field ${field.key} must be <= ${field.max}`);
                    }
                }
                break;
            
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`Field ${field.key} must be a string`);
                }
                break;
            
            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`Field ${field.key} must be a boolean`);
                }
                break;
            
            case 'select':
                if (field.options && !field.options.includes(value)) {
                    errors.push(`Field ${field.key} must be one of: ${field.options.join(', ')}`);
                }
                break;
            
            case 'multiSelect':
                if (!Array.isArray(value)) {
                    errors.push(`Field ${field.key} must be an array`);
                } else if (field.options) {
                    value.forEach(v => {
                        if (!field.options!.includes(v)) {
                            errors.push(`Field ${field.key} contains invalid value: ${v}`);
                        }
                    });
                }
                break;
            
            case 'array':
                if (!Array.isArray(value)) {
                    errors.push(`Field ${field.key} must be an array`);
                }
                break;
        }
    });

    return { valid: errors.length === 0, errors };
}
