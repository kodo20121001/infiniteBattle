import { BattleAttributes } from './BattleAttributes';

/**
 * 战斗数据士兵结构
 */
export interface BattleDataSoldier {
  id: number;                           // 士兵ID
  soldier_type: number;                 // 士兵类型
  quality: number;                      // 士兵品质
  count: number;                        // 士兵数量
  battle_attributes: BattleAttributes | null;  // 战斗属性
}
