/**
 * LevelConfig 条件类型及其数据结构定义
 * 每个条件类型都定义了对应的数据结构，便于类型安全和编辑器自动提示
 */

// 单位类型条件
export interface LevelConfigConditionUnitId {
    /** 单位NO */
    actorNo: number;
    /** 单位ID */
    unitId: string;
}

// 阵营条件
export interface LevelConfigConditionCamp {
    /** 阵营ID */
    campId: number;
}

// 单位数量条件
export interface LevelConfigConditionUnitCount {
    /** 阵营ID */
    campId: number;
    /** 单位ID（可选） */
    unitId?: string;
    /** 数量比较符号（=, >, <, >=, <=） */
    compare: string;
    /** 比较数量 */
    count: number;
}

// 变量比较条件
export interface LevelConfigConditionVariableCompare {
    /** 变量名 */
    variable: string;
    /** 比较符号（=, >, <, >=, <=, !=） */
    compare: string;
    /** 比较值 */
    value: any;
}

// 单位在区域条件
export interface LevelConfigConditionUnitInRegion {
    /** 单位NO */
    actorNo: number;
    /** 区域ID或名称 */
    region: string;
}

// 单位血量低于条件
export interface LevelConfigConditionUnitHpBelow {
    /** 单位NO */
    actorNo: number;
    /** 血量阈值 */
    hpThreshold: number;
}

/**
 * 条件类型与数据结构映射
 */
export type LevelConfigConditionDataMap = {
    unitId: LevelConfigConditionUnitId;
    camp: LevelConfigConditionCamp;
    unitCount: LevelConfigConditionUnitCount;
    variableCompare: LevelConfigConditionVariableCompare;
    unitInRegion: LevelConfigConditionUnitInRegion;
    unitHpBelow: LevelConfigConditionUnitHpBelow;
};
