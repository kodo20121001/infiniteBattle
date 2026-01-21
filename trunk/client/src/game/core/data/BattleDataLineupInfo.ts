import { BattleDataSoldier } from './BattleDataSoldier';

/**
 * 战斗数据阵容信息结构
 */
export interface BattleDataLineupInfo {
  role_id: string;                      // 角色ID
  soldiers: BattleDataSoldier[];        // 士兵列表
}
