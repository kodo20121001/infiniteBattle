import { Configs } from "../../common/Configs";

/**
 * 模型类型枚举
 */
export enum ModelType {
    None = 'none',             // 无实体模型（仅用于插件创建的特效等）
    Image2D = '2d_image',      // 2D图片
    Sequence2D = '2d_sequence',// 2D序列帧
    Spine2D = '2d_spine',      // 2D Spine
    Fbx3D = '3d_fbx'           // 3D FBX
}

/**
 * 模型配置
 */
export interface ModelConfig {
    id: string;                // 模型ID
    name: string;              // 模型名称
    type: ModelType;           // 模型类型
    path?: string;             // 资源文件完整路径（如 /unit/monkey.json、/effect/fire_ball.json），默认为 /unit/{id}.json
    scale?: number;            // 默认缩放
    rotation?: { x?: number; y?: number; z?: number };  // 初始旋转（角度），绕 X/Y/Z 轴
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
