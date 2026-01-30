/**
 * LevelConfig 行为类型及其数据结构定义
 * 每个行为类型都定义了对应的数据结构，便于类型安全和编辑器自动提示
 */

// 创建单位行为
export interface LevelConfigActionCreateUnit {
    /** 单位ID */
    unitId: string;
    /** 所属阵营ID */
    campId: number;
    /** 位置名（地图点名） */
    positionName: string;
    /** 单位等级（可选） */
    level?: number;
    /** 自定义属性（可选） */
    customProps?: Record<string, any>;
}

// 移除单位行为
export interface LevelConfigActionRemoveUnit {
    /** 单位NO */
    actorNo: number;
}

// 移动单位行为
export interface LevelConfigActionMoveUnit {
    /** 单位NO */
    actorNo: number;
    /** 目标位置名 */
    targetPositionName: string;
}

// 设置变量行为
export interface LevelConfigActionSetVariable {
    /** 变量名 */
    variable: string;
    /** 设置值 */
    value: any;
}

// 播放特效行为
export interface LevelConfigActionPlayEffect {
    /** 特效ID或名称 */
    effect: string;
    /** 位置名 */
    positionName: string;
    /** 持续时间（可选） */
    duration?: number;
}

// 播放音效行为
export interface LevelConfigActionPlaySound {
    /** 音效ID或名称 */
    sound: string;
    /** 音量（可选） */
    volume?: number;
}

// 显示消息行为
export interface LevelConfigActionShowMessage {
    /** 消息内容 */
    message: string;
    /** 显示给玩家ID（可选） */
    playerId?: number;
}

// 改变阵营行为
export interface LevelConfigActionChangeCamp {
    /** 单位NO */
    actorNo: number;
    /** 新阵营ID */
    newCampId: number;
}

// 胜利行为
export interface LevelConfigActionWinGame {
    /** 玩家ID（可选，默认所有玩家） */
    playerId?: number;
}

// 失败行为
export interface LevelConfigActionLoseGame {
    /** 玩家ID（可选，默认所有玩家） */
    playerId?: number;
}

// 自定义行为
export interface LevelConfigActionCustomAction {
    /** 行为名 */
    actionName: string;
    /** 行为参数 */
    params?: Record<string, any>;
}

/**
 * 行为类型与数据结构映射
 */
export type LevelConfigActionDataMap = {
    createUnit: LevelConfigActionCreateUnit;
    removeUnit: LevelConfigActionRemoveUnit;
    moveUnit: LevelConfigActionMoveUnit;
    setVariable: LevelConfigActionSetVariable;
    playEffect: LevelConfigActionPlayEffect;
    playSound: LevelConfigActionPlaySound;
    showMessage: LevelConfigActionShowMessage;
    changeCamp: LevelConfigActionChangeCamp;
    winGame: LevelConfigActionWinGame;
    loseGame: LevelConfigActionLoseGame;
    customAction: LevelConfigActionCustomAction;
};
