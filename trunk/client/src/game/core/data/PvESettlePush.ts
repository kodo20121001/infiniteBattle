import { BattlePvEData } from './BattlePvEData';

/**
 * PvE结算推送结构
 */
export interface PvESettlePush {
  type: string;                           // 推送类型
  player_id: string;                      // 玩家ID
  stage_id: number;                       // 关卡ID
  pve_data: BattlePvEData | null;         // PvE战斗数据
}
