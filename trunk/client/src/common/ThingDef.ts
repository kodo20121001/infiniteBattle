/**
 * 游戏通用物品/实体定义 (Thing 的概念)
 * 用于统一定义游戏内的各种产出、消耗、掉落、奖励等
 * 可用于掉落列表、任务奖励、商店售卖、消耗成本等任何需要定义"物品"的地方
 */

export enum ThingType {
    ITEM = 'item',                 // 普通道具 (消耗品、材料、任务物品等)
    EQUIPMENT = 'equipment',       // 装备
    HERO = 'hero',                 // 完整英雄
    PET = 'pet',                   // 完整宠物
    PET_FRAGMENT = 'pet_fragment', // 宠物碎片
    HERO_FRAGMENT = 'hero_fragment',// 英雄碎片
    CURRENCY = 'currency',         // 货币 (金币, 钻石, 竞技场积分等)
    BUFF = 'buff',                 // 增益效果/状态
}

export interface Thing {
    /** 
     * 物品类型 
     */
    type: ThingType;
    
    /** 
     * 物品ID 
     * 对应具体配置表的ID。如果是货币，可以是 'gold', 'diamond' 等约定俗成的字符串
     */
    id: string;
    
    /** 
     * 数量 
     */
    count: number;
    
    /** 
     * 附加数据 (可选)
     * 灵活的键值对，用于处理特殊情况。例如：
     * - 装备：{ quality: 'epic', level: 10, random_affix: ['hp_up', 'atk_up'] }
     * - 宠物碎片：{ element: 'fire' }
     * - 限时道具：{ expire_time: 1735689600 }
     * - 掉落概率（如果在掉落组中使用）：{ weight: 100 }
     */
    data?: Record<string, any>;
}
