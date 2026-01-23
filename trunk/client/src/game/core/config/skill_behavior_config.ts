import { Configs } from "../../common/Configs";

// 技能行为事件类型
export type SkillBehaviorEventType =
  | 'damage'
  | 'effect'
  | 'shake'
  | 'bullet'
  | 'sound'
  | 'animation'
  | 'end';

// 技能行为事件参数
export interface SkillBehaviorEventData {
  // 伤害类
  damageValue?: number;
  damageKey?: string;
  damageRatio?: number;
  damageRatioKey?: string;
  // 触发与范围
  triggerType?: 'target' | 'range';
  maxDistanceValue?: number;
  maxDistanceKey?: string;
  rangeType?: 'circle' | 'rect';
  radius?: number;
  length?: number;
  width?: number;
  frontAngle?: number;
  frontDistance?: number;
  // 其他类型可扩展
  [key: string]: any;
}

// 技能行为事件
export interface SkillBehaviorEvent {
  id: number;
  type: SkillBehaviorEventType;
  time: number;
  data: SkillBehaviorEventData;
}

// 技能行为分段
export interface SkillBehaviorSegment {
  id: number;
  name: string;
  events: SkillBehaviorEvent[];
}

// 技能行为主结构
export interface SkillBehaviorConfig {
  id: number;
  segments: SkillBehaviorSegment[];
}

export function getSkillBehaviorConfig(id: number): SkillBehaviorConfig | undefined {
  const table = Configs.Get('skill_behavior');
  if (!table) return undefined;
  if (Array.isArray(table)) return (table as SkillBehaviorConfig[]).find(c => c.id === id);
  return (table as Record<number, SkillBehaviorConfig>)[id];
}

export function getSkillBehaviorConfigs(): SkillBehaviorConfig[] | Record<number, SkillBehaviorConfig> {
  const table = Configs.Get('skill_behavior');
  return table || [];
}
