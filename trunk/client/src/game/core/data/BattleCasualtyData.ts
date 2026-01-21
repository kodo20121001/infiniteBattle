import { PlayerDataSoldier } from './PlayerDataSoldier';

/**
 * 战斗伤亡数据结构
 */
export interface BattleCasualtyData {
  player_id: string;                      // 玩家ID
  soldiers: PlayerDataSoldier[] | null;   // 伤亡士兵列表
}
