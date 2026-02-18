export enum EquipmentType {
    WEAPON = 'weapon',       // 武器
    ARMOR = 'armor',         // 护甲
    ACCESSORY = 'accessory', // 饰品
    BOOTS = 'boots'          // 靴子
}

export enum EquipmentRarity {
    COMMON = 'common',       // 普通
    UNCOMMON = 'uncommon',   // 优秀
    RARE = 'rare',           // 稀有
    EPIC = 'epic',           // 史诗
    LEGENDARY = 'legendary'  // 传说
}

export interface Equipment {
    id: string;             // 装备配置ID
    instanceId: string;     // 装备唯一实例ID
    name: string;           // 装备名称
    type: EquipmentType;    // 装备类型
    rarity: EquipmentRarity;// 装备稀有度
    level: number;          // 装备等级
    stats: {                // 基础属性
        attack?: number;    // 攻击力
        defense?: number;   // 防御力
        hp?: number;        // 生命值
        speed?: number;     // 速度
    };
}
