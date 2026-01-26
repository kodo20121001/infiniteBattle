import { Configs } from "../../common/Configs";

// 技能行为事件类型
export type SkillBehaviorEventType =
	| 'damage'
	| 'moveBy'
	| 'effect'
	| 'shake'
	| 'bullet'
	| 'sound'
	| 'animation'
	| 'end';

/**
 * 技能行为伤害事件数据
 */
export interface SkillBehaviorDamageEventData {
	damageValue?: number;
	damageKey?: string;
	damageRatio?: number;
	damageRatioKey?: string;
	triggerType?: 'target' | 'range';
	maxDistanceValue?: number;
	maxDistanceKey?: string;
	rangeType?: 'circle' | 'rect';
	radius?: number;
	length?: number;
	width?: number;
	frontAngle?: number;
	frontDistance?: number;
}

/**
 * 技能行为位移事件数据
 */
export interface SkillBehaviorMoveByEventData {
	distance?: number;
	distanceKey?: string;
	angle?: number;
	angleKey?: string;
	duration?: number;
}

/**
 * 技能行为特效事件数据
 */
export interface SkillBehaviorEffectEventData {
	/** 子弹配置ID */
	bulletId: number;
	/** 是否从施法者位置发射 */
	fromCaster?: boolean;
	/** 是否飞向目标 */
	toTarget?: boolean;
	/** 指定目标单位ID（可选） */
	targetUnitId?: number;
	/** 指定目标位置（可选） */
	targetPosition?: { x: number; y: number; z?: number };
}

/**
 * 技能行为抖动事件数据
 */
export interface SkillBehaviorShakeEventData {
	[key: string]: any;
}

/**
 * 技能行为子弹事件数据
 */
export interface SkillBehaviorBulletEventData {
	/** 子弹配置ID */
	bulletId: number;
	/** 是否从施法者位置发射 */
	fromCaster?: boolean;
	/** 是否飞向目标 */
	toTarget?: boolean;
	/** 指定目标单位ID（可选） */
	targetUnitId?: number;
	/** 指定目标位置（可选） */
	targetPosition?: { x: number; y: number; z?: number };
}

/**
 * 技能行为音效事件数据
 */
export interface SkillBehaviorSoundEventData {
	[key: string]: any;
}

/**
 * 技能行为动画事件数据
 */
export interface SkillBehaviorAnimationEventData {
	[key: string]: any;
}

/**
 * 技能行为结束事件数据
 */
export interface SkillBehaviorEndEventData {
	[key: string]: any;
}

/**
 * 技能行为事件数据（联合类型）
 */
export type SkillBehaviorEventData =
	| SkillBehaviorDamageEventData
	| SkillBehaviorMoveByEventData
	| SkillBehaviorEffectEventData
	| SkillBehaviorShakeEventData
	| SkillBehaviorBulletEventData
	| SkillBehaviorSoundEventData
	| SkillBehaviorAnimationEventData
	| SkillBehaviorEndEventData;

// 技能行为事件
export interface SkillBehaviorEvent {
	id: number;
	type: SkillBehaviorEventType;
	time: number; // 事件触发时间（秒）
	data: SkillBehaviorEventData;
}

// 技能行为分段
export interface SkillBehaviorSegment {
	id: number;
	name: string;
	events: SkillBehaviorEvent[];
}

// 技能行为主结构
export interface SkillBehaviorConfig {
	id: number;
	segments: SkillBehaviorSegment[];
}

export function getSkillBehaviorConfig(id: number): SkillBehaviorConfig | undefined {
	const table = Configs.Get('skill_behavior');
	if (!table) return undefined;
	if (Array.isArray(table)) return (table as SkillBehaviorConfig[]).find(c => c.id === id);
	return (table as Record<number, SkillBehaviorConfig>)[id];
}
