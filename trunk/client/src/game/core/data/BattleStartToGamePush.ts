import { BattlePvEData } from './BattlePvEData';
import { BattlePlunderData } from './BattlePlunderData';

/**
 * 战斗开始推送至游戏结构
 */
export interface BattleStartToGamePush {
  type: string;                           // 推送类型
  battle_type: string;                    // 战斗类型
  pve_data: BattlePvEData | null;         // PvE战斗数据
  plunder_data: BattlePlunderData | null; // 掠夺战斗数据
}
