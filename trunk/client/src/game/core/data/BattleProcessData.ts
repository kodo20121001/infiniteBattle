import { BattleOperate } from './BattleOperate';
import { BattleCasualtyData } from './BattleCasualtyData';

/**
 * 战斗进程数据结构
 */
export interface BattleProcessData {
  current_frame: number;                  // 当前帧数
  operations: BattleOperate[] | null;     // 操作列表
  casualties: BattleCasualtyData[] | null; // 伤亡数据列表
  occupation_rate: number;                // 占领率
  is_finished: boolean;                   // 是否已结束
  result: string;                         // 战斗结果
}
