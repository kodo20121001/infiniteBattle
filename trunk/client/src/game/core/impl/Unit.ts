/**
 * 单位实现示例
 * 继承 Actor 实现具体的游戏单位逻辑
 */

import { Actor, ActorType, ActorState } from './Actor';
import type { UnitConfig } from '../config/UnitConfig';
import type { ModelConfig } from '../config/ModelConfig';

/**
 * 游戏单位实现
 */
export class Unit extends Actor {
    private _attackPower: number = 10;
    private _defense: number = 5;
    private _experience: number = 0;
    private _level: number = 1;
    private _skills: number[] = [];

    constructor(
        actorNo: string,
        modelId: string,
        unitId: number,
        campId: number
    ) {
        super(actorNo, ActorType.Unit, modelId, unitId, campId);
    }

    /**
     * 初始化单位
     */
    override init(unitConfig: UnitConfig, modelConfig: ModelConfig): void {
        super.init(unitConfig, modelConfig);
        this._skills = unitConfig.skillIds || [];
        this._attackPower = modelConfig.attackPower || 10;
        this._defense = modelConfig.defense || 5;
    }

    /**
     * 固定帧更新
     */
    override fixedUpdate(fixedDeltaTime: number): void {
        super.fixedUpdate(fixedDeltaTime);

        // 子类可以在这里添加具体的单位逻辑
        // 例如 AI 控制、状态机等
    }


    /**
     * 设置攻击力
     */
    setAttackPower(power: number): void {
        this._attackPower = Math.max(0, power);
    }

    /**
     * 获取攻击力
     */
    getAttackPower(): number {
        return this._attackPower;
    }

    /**
     * 设置防御力
     */
    setDefense(defense: number): void {
        this._defense = Math.max(0, defense);
    }

    /**
     * 获取防御力
     */
    getDefense(): number {
        return this._defense;
    }

    /**
     * 获取单位等级
     */
    getLevel(): number {
        return this._level;
    }

    /**
     * 升级
     */
    levelUp(): void {
        this._level++;
        this._maxHp += 10;
        this._hp = this._maxHp;
        this._attackPower += 2;
        this._defense += 1;
    }

    /**
     * 获取技能列表
     */
    getSkills(): number[] {
        return [...this._skills];
    }

    /**
     * 添加技能
     */
    addSkill(skillId: number): void {
        if (!this._skills.includes(skillId)) {
            this._skills.push(skillId);
        }
    }

    /**
     * 移除技能
     */
    removeSkill(skillId: number): void {
        const index = this._skills.indexOf(skillId);
        if (index > -1) {
            this._skills.splice(index, 1);
        }
    }
}

/**
 * 建筑实现
 */
export class Building extends Actor {
    private _constructionProgress: number = 100; // 建造进度 0-100

    constructor(
        id: string,
        modelId: string,
        buildingId: number,
        campId: number
    ) {
        super(id, ActorType.Building, modelId, buildingId, campId);
    }

    /**
     * 设置建造进度
     */
    setConstructionProgress(progress: number): void {
        this._constructionProgress = Math.max(0, Math.min(100, progress));
    }

    /**
     * 获取建造进度
     */
    getConstructionProgress(): number {
        return this._constructionProgress;
    }

    /**
     * 是否建造完成
     */
    isConstructionComplete(): boolean {
        return this._constructionProgress >= 100;
    }
}
