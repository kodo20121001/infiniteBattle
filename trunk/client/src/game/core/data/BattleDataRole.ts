import { BattleAttributes } from './BattleAttributes';
import { PlayerDataSkill } from './PlayerDataSkill';

/**
 * 战斗数据角色结构
 */
export interface BattleDataRole {
  id: string;                           // 角色ID
  type: number;                         // 角色类型
  level: number;                        // 角色等级
  quality: number;                      // 角色品质
  experience: number;                   // 经验值
  building_id: number;                  // 所属建筑ID
  active_skills: PlayerDataSkill[] | null;   // 主动技能列表
  passive_skills: PlayerDataSkill[] | null;  // 被动技能列表
  battle_attributes: BattleAttributes | null; // 战斗属性
}
