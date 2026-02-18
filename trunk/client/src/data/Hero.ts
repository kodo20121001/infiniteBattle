export interface HeroStats {
    maxHp: number;      // 最大生命值
    currentHp: number;  // 当前生命值
    attack: number;     // 攻击力
    defense: number;    // 防御力
    speed: number;      // 速度
}

export interface Hero {
    id: string;         // 英雄配置ID (例如 'hero_warrior')
    instanceId: string; // 英雄唯一实例ID
    name: string;       // 英雄名称
    level: number;      // 等级
    experience: number; // 当前经验值
    maxExperience: number; // 升级所需经验
    stats: HeroStats;   // 英雄属性
    equipmentSlots: {   // 装备槽位
        weapon?: string;    // 武器 (存储 Equipment instanceId)
        armor?: string;     // 护甲
        accessory?: string; // 饰品
        boots?: string;     // 靴子
    };
    skills: string[];   // 技能列表 (存储 Skill ID)
}
