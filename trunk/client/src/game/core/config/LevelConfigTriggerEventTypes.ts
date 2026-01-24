/**
 * LevelConfig 触发事件类型及其数据结构定义
 * 每个事件类型都定义了对应的数据结构，便于类型安全和编辑器自动提示
 */

// 关卡初始化事件
export interface LevelConfigTriggerEventLevelInit {
    /** 关卡ID */
    levelId: number;
}

// 地图初始化事件
export interface LevelConfigTriggerEventMapInit {
    /** 地图ID */
    mapId: number;
}

// 关卡开始事件
export interface LevelConfigTriggerEventLevelStart {
    /** 关卡ID */
    levelId: number;
}

// 关卡结束事件
export interface LevelConfigTriggerEventLevelEnd {
    /** 关卡ID */
    levelId: number;
    /** 是否胜利 */
    isWin: boolean;
}

// 单位进入区域事件
export interface LevelConfigTriggerEventUnitEnterRegion {
    /** 单位ID */
    unitId: number;
    /** 区域ID或名称 */
    region: string;
}

// 单位离开区域事件
export interface LevelConfigTriggerEventUnitLeaveRegion {
    /** 单位ID */
    unitId: number;
    /** 区域ID或名称 */
    region: string;
}

// 单位死亡事件
export interface LevelConfigTriggerEventUnitDie {
    /** 单位ID */
    unitId: number;
    /** 死亡原因 */
    reason?: string;
}

// 单位复活事件
export interface LevelConfigTriggerEventUnitRevive {
    /** 单位ID */
    unitId: number;
}

// 单位血量变化事件
export interface LevelConfigTriggerEventUnitHpChange {
    /** 单位ID */
    unitId: number;
    /** 变化前血量 */
    oldHp: number;
    /** 变化后血量 */
    newHp: number;
}

// 单位魔法变化事件
export interface LevelConfigTriggerEventUnitMpChange {
    /** 单位ID */
    unitId: number;
    /** 变化前魔法值 */
    oldMp: number;
    /** 变化后魔法值 */
    newMp: number;
}

// 单位释放技能事件
export interface LevelConfigTriggerEventUnitCastSkill {
    /** 单位ID */
    unitId: number;
    /** 技能ID */
    skillId: number;
}

// 单位升级事件
export interface LevelConfigTriggerEventUnitLevelUp {
    /** 单位ID */
    unitId: number;
    /** 升级后等级 */
    newLevel: number;
}

// 定时器事件
export interface LevelConfigTriggerEventTimer {
    /** 定时器ID或名称 */
    timer: string;
    /** 当前计数 */
    count: number;
}

// 变量变化事件
export interface LevelConfigTriggerEventVariableChange {
    /** 变量名 */
    variable: string;
    /** 变化前值 */
    oldValue: any;
    /** 变化后值 */
    newValue: any;
}

// 玩家胜利事件
export interface LevelConfigTriggerEventPlayerWin {
    /** 玩家ID */
    playerId: number;
}

// 玩家失败事件
export interface LevelConfigTriggerEventPlayerLose {
    /** 玩家ID */
    playerId: number;
}

// 自定义事件
export interface LevelConfigTriggerEventCustomEvent {
    /** 事件名 */
    eventName: string;
    /** 事件参数 */
    params?: Record<string, any>;
}

/**
 * 触发事件类型与数据结构映射
 */
export type LevelConfigTriggerEventDataMap = {
    levelInit: LevelConfigTriggerEventLevelInit;
    mapInit: LevelConfigTriggerEventMapInit;
    levelStart: LevelConfigTriggerEventLevelStart;
    levelEnd: LevelConfigTriggerEventLevelEnd;
    unitEnterRegion: LevelConfigTriggerEventUnitEnterRegion;
    unitLeaveRegion: LevelConfigTriggerEventUnitLeaveRegion;
    unitDie: LevelConfigTriggerEventUnitDie;
    unitRevive: LevelConfigTriggerEventUnitRevive;
    unitHpChange: LevelConfigTriggerEventUnitHpChange;
    unitMpChange: LevelConfigTriggerEventUnitMpChange;
    unitCastSkill: LevelConfigTriggerEventUnitCastSkill;
    unitLevelUp: LevelConfigTriggerEventUnitLevelUp;
    timer: LevelConfigTriggerEventTimer;
    variableChange: LevelConfigTriggerEventVariableChange;
    playerWin: LevelConfigTriggerEventPlayerWin;
    playerLose: LevelConfigTriggerEventPlayerLose;
    customEvent: LevelConfigTriggerEventCustomEvent;
};
