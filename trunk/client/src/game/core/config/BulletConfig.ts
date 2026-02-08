/**
 * 子弹配置主结构。参考 LevelConfig 的组织方式：主结构 → 分段 → 触发器 / 条件 / 行为。
 */
export interface BulletConfig {
    /** 子弹ID */
    id: number;
    /** 子弹名称 */
    name: string;
    /** 子弹描述 */
    description?: string;
    /** 初始化时使用的模型ID（资源或表现层ID） */
    modelId: string;
    /** 分段配置列表 */
    segments: BulletSegmentConfig[];
}

/**
 * 子弹分段配置。
 * 每段包含独立的触发器、条件与行为，便于按阶段驱动子弹逻辑。
 */
export interface BulletSegmentConfig {
    /** 分段ID */
    id: number;
    /** 分段名称 */
    name?: string;
    /** 触发器列表 */
    triggers: BulletTriggerConfig[];
}

/**
 * 子弹触发器配置。
 */
export interface BulletTriggerConfig {
    /** 触发事件类型 */
    eventType: BulletTriggerEventType;
    /** 事件参数，类型由 eventType 决定 */
    params?: BulletTriggerEventDataMap[BulletTriggerEventType];
    /** 条件列表（可选） */
    conditions?: BulletConditionConfig[];
    /** 行为列表 */
    actions?: BulletActionConfig[];
}

/**
 * 子弹触发事件类型。
 * 命名保持 bullet 前缀，与关卡触发器风格一致。
 */
export type BulletTriggerEventType =
    | 'bulletStart' // 子弹开始（生成）
    | 'bulletEnd'   // 子弹结束（销毁或命中）
    | 'bulletHit';  // 子弹击中目标

// bulletStart 事件数据
export interface BulletTriggerEventBulletStart {
    /** 对应子弹ID，便于匹配 */
    bulletId: number;
}

// bulletEnd 事件数据
export interface BulletTriggerEventBulletEnd {
    /** 对应子弹ID，便于匹配 */
    bulletId: number;
    /** 结束原因，可选：命中 / 消失 / 超时等 */
    reason?: string;
}

// bulletHit 事件数据
export interface BulletTriggerEventBulletHit {
    /** 对应子弹ID，便于匹配 */
    bulletId?: number;
    /** 击中的目标单位ID */
    targetActorNo?: number | string;
}

/**
 * 触发事件类型与数据结构映射。
 */
export type BulletTriggerEventDataMap = {
    bulletStart: BulletTriggerEventBulletStart;
    bulletEnd: BulletTriggerEventBulletEnd;
    bulletHit: BulletTriggerEventBulletHit;
};

/**
 * 子弹条件配置。
 */
export interface BulletConditionConfig {
    /** 条件类型 */
    type: BulletConditionType;
    /** 条件参数 */
    params: BulletConditionDataMap[BulletConditionType];
}

/**
 * 子弹条件类型。
 * 预置少量通用条件，可按需要扩展。
 */
export type BulletConditionType =
    | 'bulletLifetimeGreater'  // 子弹存活时间大于指定值
    | 'bulletDistanceLess'     // 子弹与目标距离小于指定值
    | 'customCondition';       // 自定义条件

// 子弹存活时间条件（单位：秒）
export interface BulletConditionLifetimeGreater {
    lifetimeSec: number;
}

// 子弹距离条件
export interface BulletConditionDistanceLess {
    /** 目标单位ID（若为飞向单位） */
    targetActorNo?: number;
    /** 目标位置（若为飞向坐标） */
    targetPosition?: { x: number; y: number; z?: number };
    /** 阈值距离 */
    maxDistance: number;
}

// 自定义条件
export interface BulletConditionCustom {
    conditionName: string;
    params?: Record<string, any>;
}

/**
 * 条件类型与数据结构映射。
 */
export type BulletConditionDataMap = {
    bulletLifetimeGreater: BulletConditionLifetimeGreater;
    bulletDistanceLess: BulletConditionDistanceLess;
    customCondition: BulletConditionCustom;
};

/**
 * 子弹行为配置。
 */
export interface BulletActionConfig {
    /** 行为类型 */
    type: BulletActionType;
    /** 行为参数 */
    params: BulletActionDataMap[BulletActionType];
}

/**
 * 子弹行为类型。
 * 当前仅定义飞向目标，可按需要扩展。
 */
export type BulletActionType =
    | 'bulletFlyToTarget' // 子弹飞向目标
    | 'bulletDamage'      // 子弹造成伤害
    | 'customAction';     // 自定义行为

// 子弹飞向目标行为
export interface BulletActionFlyToTarget {
    /** 初始速度（单位：m/s，或引擎约定单位） */
    speed: number;
    /** 加速度（可选，默认 0） */
    acceleration?: number;
    /** 最高速度（可选） */
    maxSpeed?: number;
    /** 抛物线弧度高度（可选，默认 0 表示直线） */
    arc?: number;
    /** 是否追踪目标（导弹/制导，默认 false） */
    homing?: boolean;
    /** 追踪转向速率（度/秒，需 homing=true，默认 180） */
    homingRate?: number;
    /** 碰撞半径（用于命中检测，可选） */
    collisionRadius?: number;
    /** 是否在命中后停止（默认 true） */
    stopOnHit?: boolean;
}

// 子弹造成伤害行为
export interface BulletActionDamage {
    /** 伤害值 */
    damageValue?: number;
    /** 伤害值key（从表格读取） */
    damageKey?: string;
    /** 伤害比例 */
    damageRatio?: number;
    /** 伤害比例key（从表格读取） */
    damageRatioKey?: string;
    /** 触发类型：目标(target)或范围(range) */
    triggerType?: 'target' | 'range';
    /** 目标类型：最大距离值 */
    maxDistanceValue?: number;
    /** 目标类型：最大距离key */
    maxDistanceKey?: string;
    /** 范围类型：圆形(circle)或矩形(rect) */
    rangeType?: 'circle' | 'rect';
    /** 范围类型-圆形：半径 */
    radius?: number;
    /** 范围类型-矩形：长度 */
    length?: number;
    /** 范围类型-矩形：宽度 */
    width?: number;
    /** 范围类型：前方角度 */
    frontAngle?: number;
    /** 范围类型：前方距离 */
    frontDistance?: number;
}

// 自定义行为
export interface BulletActionCustom {
    actionName: string;
    params?: Record<string, any>;
}

/**
 * 行为类型与数据结构映射。
 */
export type BulletActionDataMap = {
    bulletFlyToTarget: BulletActionFlyToTarget;
    bulletDamage: BulletActionDamage;
    customAction: BulletActionCustom;
};
