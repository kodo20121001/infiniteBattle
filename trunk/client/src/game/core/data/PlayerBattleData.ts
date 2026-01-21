import { BattleDataBuilding } from './BattleDataBuilding';
import { BattleDataRole } from './BattleDataRole';
import { BattleDataLineupInfo } from './BattleDataLineupInfo';

/**
 * 玩家战斗数据结构
 */
export interface PlayerBattleData {
  player_id: string;                    // 玩家ID
  player_name: string;                  // 玩家名称
  player_icon_url: string;              // 玩家头像URL
  homeland_id: number;                  // 家园ID
  homeland_level: number;               // 家园等级
  currency: number;                     // 货币
  wood: number;                         // 木材
  water: number;                        // 水资源
  rock: number;                         // 石头
  seed: number;                         // 种子
  battle_power: number;                 // 战斗力
  buildings: BattleDataBuilding[];      // 建筑列表
  roles: BattleDataRole[];              // 角色列表
  attack_lineup: BattleDataLineupInfo[] | null;  // 进攻阵容
  defense_lineup: BattleDataLineupInfo[] | null; // 防守阵容
}
