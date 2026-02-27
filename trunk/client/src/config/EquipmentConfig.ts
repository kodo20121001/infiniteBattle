import { EquipmentType, EquipmentRarity } from '../data/Equipment';

export interface EquipmentConfig {
    id: string;             // 装备配置ID
    name: string;           // 装备名称
    type: EquipmentType;    // 装备类型
    icon: string;           // 图标名称 (对应 UI 中的 icon 字段)
    description: string;    // 装备描述
    tier: number;           // 默认阶级
    rarity: EquipmentRarity;// 默认稀有度
    baseStats: {            // 基础属性
        attack?: number;    // 攻击力
        defense?: number;   // 防御力
        hp?: number;        // 生命值
        speed?: number;     // 速度
    };
}
