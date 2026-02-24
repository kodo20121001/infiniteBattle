import { PetConfig } from '../config/PetConfig';

export interface PetSkill {
    id: string;           // 技能ID (例如 'bullet', 'missile')
    level: number;        // 技能等级
}

export interface Pet {
    id: string;           // 战宠配置ID (例如 'pet_crystal_bird')
    name: string;         // 战宠名称
    level: number;        // 战宠等级 (0表示未合成，1及以上表示已合成)
    
    fragments: number;    // 当前拥有的碎片数量
    
    // 战宠提供的属性加成 (例如图片里的 "总暴击伤害增幅 73.0%")
    statsBonus?: {
        critDamageBoost?: number; // 暴击伤害增幅百分比
        // 可以根据需要添加其他属性
    };
    
    // 战宠携带的技能列表
    skills: PetSkill[];
    
    // 当前使用的方案 (1-5)
    activePlan: number;
}

// 辅助函数：判断战宠是否已合成
export function isPetUnlocked(pet: Pet): boolean {
    return pet.level > 0;
}

// 辅助函数：获取升级/合成所需碎片数量 (从配置读取)
export function getFragmentsNeeded(petId: string, level: number): number {
    const config = PetConfig.getConfig(petId);
    const base = config ? config.baseFragmentsNeeded : 50;
    if (level === 0) return base; // 合成需要基础碎片
    return base + level * 20;     // 升级公式：每级递增
}

// 辅助函数：判断战宠是否可以合成/升级
export function canUpgradePet(pet: Pet): boolean {
    return pet.fragments >= getFragmentsNeeded(pet.id, pet.level);
}

// 辅助函数：执行升级/合成操作
export function upgradePet(pet: Pet): boolean {
    const needed = getFragmentsNeeded(pet.id, pet.level);
    if (pet.fragments >= needed) {
        pet.fragments -= needed;
        pet.level += 1;
        return true;
    }
    return false;
}
