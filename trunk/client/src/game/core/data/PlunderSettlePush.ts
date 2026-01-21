import { BattlePlunderData } from './BattlePlunderData';

/**
 * 掠夺结算推送结构
 */
export interface PlunderSettlePush {
  type: string;                           // 推送类型
  player_id: string;                      // 玩家ID
  plunder_data: BattlePlunderData | null; // 掠夺战斗数据
  score: number;                          // 得分
}
