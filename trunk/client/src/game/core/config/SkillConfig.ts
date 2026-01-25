import { Configs } from "../../common/Configs";

export interface SkillConfig {
  id: number;                // 技能ID
  skillBehaviorId: number;   // 技能行为ID
  castRange?: number;        // 施放距离（米）
  table: Record<string, number>; // 技能参数表，key为任意字符串，值为 number
}

export function getSkillConfig(id: number): SkillConfig | undefined {
  const table = Configs.Get('skill');
  if (!table) return undefined;
  if (Array.isArray(table)) return (table as SkillConfig[]).find(c => c.id === id);
  return (table as Record<number, SkillConfig>)[id];
}

export function getSkillConfigs(): SkillConfig[] | Record<number, SkillConfig> {
  const table = Configs.Get('skill');
  return table || [];
}
