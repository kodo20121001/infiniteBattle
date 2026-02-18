export enum ItemType {
    CONSUMABLE = 'consumable', // 消耗品
    MATERIAL = 'material',     // 材料
    KEY_ITEM = 'key_item'      // 关键道具/任务物品
}

export interface Item {
    id: string;           // 道具ID
    name: string;         // 道具名称
    type: ItemType;       // 道具类型
    description: string;  // 道具描述
    stackable: boolean;   // 是否可堆叠
    count: number;        // 当前数量
    maxStack?: number;    // 最大堆叠数
    effects?: Record<string, any>; // 道具效果 (灵活的键值对)
}
