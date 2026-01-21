import { BattleAttributes } from './BattleAttributes';

/**
 * 战斗数据建筑结构
 */
export interface BattleDataBuilding {
  id: number;                           // 建筑ID
  level: number;                        // 建筑等级
  is_upgrading: boolean;                // 是否正在升级
  upgrade_time: number;                 // 升级完成时间（Unix时间戳）
  battle_attributes: BattleAttributes | null;  // 战斗属性
}
