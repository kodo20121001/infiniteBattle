import { PlayerBattleData } from './PlayerBattleData';
import { BattleDataRole } from './BattleDataRole';
import { BattleProcessData } from './BattleProcessData';

/**
 * 掠夺战斗数据结构
 */
export interface BattlePlunderData {
  battle_id: string;                      // 战斗ID
  attacker_player_id: string;             // 攻击方玩家ID
  defender_player_id: string;             // 防守方玩家ID
  attacker_battle_data: PlayerBattleData | null; // 攻击方战斗数据
  defender_battle_data: PlayerBattleData | null; // 防守方战斗数据
  attacker_assist_role: BattleDataRole | null;   // 攻击方助战角色
  create_time: number;                    // 创建时间（Unix时间戳）
  start_time: number;                     // 开始时间（Unix时间戳）
  status: string;                         // 战斗状态
  process: BattleProcessData | null;      // 战斗进程数据
  is_revenge: boolean;                    // 是否为复仇战
  revenge_battle_id: string;              // 复仇战斗ID
}
