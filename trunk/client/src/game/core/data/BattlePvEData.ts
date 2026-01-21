import { PlayerBattleData } from './PlayerBattleData';
import { BattleProcessData } from './BattleProcessData';

/**
 * PvE战斗数据结构
 */
export interface BattlePvEData {
  battle_id: string;                      // 战斗ID
  player_id: string;                      // 玩家ID
  player_battle_data: PlayerBattleData | null; // 玩家战斗数据
  stage_id: number;                       // 关卡ID
  create_time: number;                    // 创建时间（Unix时间戳）
  start_time: number;                     // 开始时间（Unix时间戳）
  status: string;                         // 战斗状态
  process: BattleProcessData | null;      // 战斗进程数据
}
