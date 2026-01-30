import { Configs } from "../../common/Configs";

/**
 * 模型类型枚举
 */
export enum ModelType {
    Sprite2D = '2d',           // 2D序列帧
    Spine = 'spine',           // Spine动画
    Model3D = '3d'             // 3D模型
}

/**
 * 模型配置
 */
export interface ModelConfig {
    id: string;                // 模型ID
    name: string;              // 模型名称
    type: ModelType;           // 模型类型
    scale?: number;            // 默认缩放
    defaultAction?: string;    // 默认动作
    hp?: number;               // 生命值
    speed?: number;            // 移动速度
    attackPower?: number;      // 攻击力
    defense?: number;          // 防御力
    radius?: number;           // 碰撞半径（米），用于单位避让和碰撞检测
}

/**
 * 根据 ID 获取模型配置
 */
export function getModelConfig(id: string): ModelConfig | undefined {
    const table = Configs.Get('model');
    if (!table) return undefined;
    if (Array.isArray(table)) return (table as ModelConfig[]).find(c => c.id === id);
    return (table as Record<string, ModelConfig>)[id];
}

/**
 * 获取默认动作名
 */
export function getDefaultAction(id: string): string | undefined {
    const cfg = getModelConfig(id);
    return cfg?.defaultAction;
}

/**
 * 获取模型类型
 */
export function getModelType(id: string): ModelType | undefined {
    const cfg = getModelConfig(id);
    return cfg?.type;
}
