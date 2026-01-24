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
 * 模型动作配置
 */
export interface ModelAction {
    name: string;              // 动作名称，如 'idle', 'run', 'attack'
    path: string;              // 资源路径
    frameCount?: number;       // 帧数（2D序列帧使用）
    duration?: number;         // 持续时间（秒）
    loop?: boolean;            // 是否循环
}

/**
 * 模型配置
 */
export interface ModelConfig {
    id: number;                // 模型ID
    name: string;              // 模型名称
    type: ModelType;           // 模型类型
    actions: ModelAction[];    // 所有动作列表
    scale?: number;            // 默认缩放
    defaultAction?: string;    // 默认动作
    hp?: number;               // 生命值
    speed?: number;            // 移动速度
    attackPower?: number;      // 攻击力
    defense?: number;          // 防御力
}

/**
 * 根据 ID 获取模型配置
 */
export function getModelConfig(id: number): ModelConfig | undefined {
    const table = Configs.Get('model');
    if (!table) return undefined;
    if (Array.isArray(table)) return (table as ModelConfig[]).find(c => c.id === id);
    return (table as Record<number, ModelConfig>)[id];
}

/**
 * 获取模型的所有动作
 */
export function getModelActions(id: number): ModelAction[] {
    const cfg = getModelConfig(id);
    return cfg?.actions ?? [];
}

/**
 * 获取指定动作配置
 */
export function getModelAction(id: number, action: string): ModelAction | undefined {
    const cfg = getModelConfig(id);
    return cfg?.actions.find(a => a.name === action);
}

/**
 * 获取默认动作名
 */
export function getDefaultAction(id: number): string | undefined {
    const cfg = getModelConfig(id);
    return cfg?.defaultAction;
}

/**
 * 获取模型类型
 */
export function getModelType(id: number): ModelType | undefined {
    const cfg = getModelConfig(id);
    return cfg?.type;
}
