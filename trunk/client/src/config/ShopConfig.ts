import { Thing } from '../common/ThingDef';

/**
 * 商店商品配置定义
 */
export interface ShopItemConfig {
    /** 商品唯一ID */
    id: number;
    
    /** 商品名称 (用于UI展示) */
    name: string;
    
    /** 商品描述 (用于UI展示) */
    desc?: string;
    
    /** 
     * 商品所属页签/分类
     * 例如: 'gems' (宝石), 'characters' (角色), 'equipment' (装备), 'items' (道具), 'resources' (资源)
     */
    category: string;
    
    /** 
     * 购买该商品需要消耗的资源 (价格)
     * 例如: 消耗 600 钻石
     */
    cost: Thing;
    
    /** 
     * 购买该商品后获得的资源 (内容)
     * 例如: 获得 1 个 ID 为 'hero_101' 的英雄
     */
    reward: Thing;
    
    /** 
     * UI 展示相关配置 (可选)
     */
    ui?: {
        /** 品质/稀有度 (如 'R', 'SR', 'SSR') */
        rank?: string;
        /** 是否标记为热销 */
        popular?: boolean;
        /** 图标名称或路径 */
        icon?: string;
        /** 颜色主题 */
        color?: string;
        /** 战斗力/属性描述 (如 '+25 攻击') */
        power?: string;
        /** 数量文本展示 (如 '100k 金币') */
        amountText?: string;
    };
    
    /** 
     * 购买限制 (可选)
     */
    limit?: {
        /** 每日限购次数 */
        daily?: number;
        /** 每周限购次数 */
        weekly?: number;
        /** 终身限购次数 */
        lifetime?: number;
    };
    
    /** 排序权重，数字越大越靠前 */
    sortWeight?: number;
}
