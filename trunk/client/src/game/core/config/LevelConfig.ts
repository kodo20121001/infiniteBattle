



/**
 * 关卡配置主结构
 */
export interface LevelConfig {
    /** 关卡ID */
    id: number;
    /** 关卡名称 */
    name: string;
    /** 关卡描述 */
    description?: string;
    /** 地图ID */
    mapId: number;
    /** 阵营列表 */
    camps: LevelCampConfig[];
    /** 阵营关系列表 */
    alliances?: LevelAllianceConfig[];
    /** 初始资源 */
    initialResources?: Record<string, number>;
    /** 初始角色列表（单位和建筑） */
    startUnits?: LevelActorConfig[];
    /** 胜利条件描述 */
    winCondition: string;
    /** 失败条件描述 */
    loseCondition: string;
    /** 触发器列表 */
    triggers: LevelTriggerConfig[];
}

/**
 * 阵营关系配置
 */
export interface LevelAllianceConfig {
    /** 源阵营ID */
    sourceCampId: number;
    /** 目标阵营ID */
    targetCampId: number;
    /** 阵营关系 ally/敌对/中立 */
    relation: 'ally' | 'enemy' | 'neutral';
    /** 是否共享视野 */
    shareVision: boolean;
}

/**
 * 关卡阵营配置
 */
export interface LevelCampConfig {
    /** 阵营ID */
    id: number;
    /** 阵营名称 */
    name: string;
    /** 阵营颜色 */
    color?: string;
    /** AI类型 */
    aiType?: string;
    /** 是否玩家控制 */
    playerControlled?: boolean;
}

/**
 * 关卡角色配置（单位或建筑）
 */
export interface LevelActorConfig {
    /** Actor 类型 */
    actorType: 'unit' | 'building';
    /** 所属阵营ID */
    campId: number;
    /** 位置名（地图点ID，实际坐标由地图查找） */
    positionName: string | number;
    /** 单位ID（当 actorType='unit' 时） */
    unitId?: number;
    /** 建筑ID（当 actorType='building' 时） */
    buildingId?: string;
    /** 单位等级 */
    level?: number;
    /** 关卡内自定义属性 */
    customProps?: Record<string, any>;
    /** 可选的生成位置偏移（测试/群体生成用） */
    offset?: { x?: number; z?: number };
}

/**
 * 关卡触发器配置
 */
export interface LevelTriggerConfig {
    /** 触发器ID */
    id: number;
    /** 触发器名称 */
    name: string;
    /** 触发事件类型 */
    eventType: LevelTriggerEventType;
    /** 条件列表 */
    conditions: LevelConditionConfig[];
    /** 行为列表 */
    actions: LevelActionConfig[];
}

/**
 * 触发事件类型枚举
 * 参考 war3 关卡编辑器，补充常用事件类型
 */
export type LevelTriggerEventType =
    | 'levelStart'           // 关卡开始
    | 'levelEnd'             // 关卡结束
    | 'unitEnterRegion'      // 单位进入区域
    | 'unitLeaveRegion'      // 单位离开区域
    | 'unitDie'              // 单位死亡
    | 'unitRevive'           // 单位复活
    | 'unitHpChange'         // 单位血量变化
    | 'unitMpChange'         // 单位魔法变化
    | 'unitCastSkill'        // 单位释放技能
    | 'unitLevelUp'          // 单位升级
    | 'timer'                // 定时器
    | 'variableChange'       // 变量变化
    | 'playerWin'            // 玩家胜利
    | 'playerLose'           // 玩家失败
    | 'customEvent';         // 自定义事件

/**
 * 触发条件配置
 */
export interface LevelConditionConfig {
    /** 条件类型 */
    type: LevelConditionType;
    /** 条件参数 */
    params: Record<string, any>;
}

/**
 * 条件类型枚举
 */
export type LevelConditionType =
    | 'unitId'           // 单位ID
    | 'camp'             // 阵营
    | 'unitCount'        // 单位数量
    | 'variableCompare'  // 变量比较
    | 'unitInRegion'     // 单位在区域
    | 'unitHpBelow';     // 单位血量低于

/**
 * 触发行为配置
 */
export interface LevelActionConfig {
    /** 行为类型 */
    type: LevelActionType;
    /** 行为参数 */
    params: Record<string, any>;
}

/**
 * 行为类型枚举
 */
export type LevelActionType =
    | 'createUnit'      // 创建单位
    | 'removeUnit'      // 移除单位
    | 'moveUnit'        // 移动单位
    | 'moveCamp'        // 移动阵营内所有单位
    | 'setVariable'     // 设置变量
    | 'playEffect'      // 播放特效
    | 'playSound'       // 播放音效
    | 'showMessage'     // 显示消息
    | 'changeCamp'      // 改变阵营
    | 'winGame'         // 胜利
    | 'loseGame'        // 失败
    | 'customAction';   // 自定义行为
