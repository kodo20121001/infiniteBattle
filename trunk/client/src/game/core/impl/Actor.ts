/**
 * 基础角色/单位类
 * 用于表示游戏世界中的角色、建筑等对象
 */

import { FixedVector3 } from '../base/fixed/FixedVector3';
import type { ModelConfig } from '../config/ModelConfig';
import type { UnitConfig } from '../config/UnitConfig';

export enum ActorType {
    Unit = 'unit',              // 单位
    Building = 'building',      // 建筑
    Environment = 'environment', // 环保物件
    Effect = 'effect',          // 特效
    Bullet = 'bullet',          // 子弹/弹道
}

export enum ActorState {
    Normal = 'normal',
    Idle = 'idle',
    Moving = 'moving',
    Acting = 'acting',
    Dead = 'dead',
}

/**
 * 角色/单位基类
 * 使用 3D 位置 (x, y, z) 表示游戏世界中的位置
 * x: 水平方向, y: 高度, z: 深度
 */
export class Actor {
    readonly actorNo: string;               // 实例的唯一标识
    readonly actorType: ActorType;
    readonly modelId: string;
    readonly campId: number;

    protected _position: FixedVector3;      // 3D 位置 (x, y, z)
    protected _rotation: number = 0;        // 旋转角度
    protected _scale: number = 1;
    protected _radius: number = 0.5;        // 碰撞半径（米），默认0.5米
    protected _visible: boolean = true;
    protected _state: ActorState = ActorState.Idle;

    // 生命周期
    protected _isActive: boolean = true;
    protected _isDead: boolean = false;

    // 基础属性
    protected _hp: number = 100;
    protected _maxHp: number = 100;
    protected _speed: number = 5; // 单位：点/秒
    protected _skillIds: number[] = []; // 技能ID列表
    protected _attackSkillId: number = 0; // 基础攻击技能ID
    
    // 配置引用
    protected _unitConfig: UnitConfig | null = null;
    protected _modelConfig: ModelConfig | null = null;

    // 渲染相关（如果在客户端）
    protected _spriteId: string | null = null;

    constructor(
        actorNo: string,
        actorType: ActorType,
        modelId: string,
        campId: number,
        position: FixedVector3 = new FixedVector3(0, 0, 0)
    ) {
        this.actorNo = actorNo;
        this.actorType = actorType;
        this.modelId = modelId;
        this.campId = campId;
        this._position = position;
        if (this.actorType === ActorType.Unit) {
            console.log(`[Actor] create unit: actorNo=${this.actorNo}, campId=${this.campId}, pos=(${position.x},${position.y},${position.z})`);
        }
    }

    /**
     * 初始化角色
     */
    init(unitConfig: UnitConfig, modelConfig: ModelConfig): void {
        this._unitConfig = unitConfig;
        this._modelConfig = modelConfig;
        this._maxHp = modelConfig.hp || 100;
        this._hp = this._maxHp;
        this._speed = unitConfig.moveSpeed ?? modelConfig.speed ?? 5;
        this._scale = modelConfig.scale || 1;
        this._radius = modelConfig.radius || 0.5;
        this._skillIds = unitConfig.skillIds || [];
        this._attackSkillId = unitConfig.attackSkillId || 0;
    }

    /**
     * 启动角色（在初始化完成后调用一次）
     */
    start(): void {
        if (!this._isActive) return;

        // 首次更新，让子类可以初始化状态
        this.update(0);
    }

    /**
     * 每帧更新
     */
    update(deltaTime: number): void {
        if (!this._isActive) return;

        // 子类可覆盖此方法实现具体逻辑
    }

    /**
     * 固定帧更新（用于物理计算和帧同步）
     */
    fixedUpdate(fixedDeltaTime: number): void {
        if (!this._isActive) return;

        // 子类可覆盖此方法实现具体逻辑
    }

    /**
     * 设置位置 (x: 水平, y: 高度, z: 深度)
     */
    setPosition(x: number, y: number = 0, z: number = 0): void {
        if (this.actorType === ActorType.Unit) {
            console.log(`[Actor] setPosition: actorNo=${this.actorNo}, campId=${this.campId}, (${x}, ${y}, ${z})`);
        }
        this._position.x = x;
        this._position.y = y;
        this._position.z = z;
    }

    /**
     * 获取 3D 位置 (x, y, z)
     */
    getPosition(): FixedVector3 {
        return this._position;
    }

    /**
     * 移动 (dx: 水平, dy: 高度, dz: 深度)
     */
    move(dx: number, dy: number = 0, dz: number = 0): void {
        this._position.x += dx;
        this._position.y += dy;
        this._position.z += dz;
    }

    /**
     * 获取移动速度
     */
    getSpeed(): number {
        return this._speed;
    }

    /**
     * 获取技能ID列表
     */
    getSkillIds(): number[] {
        return this._skillIds;
    }

    /**
     * 获取基础攻击技能ID
     */
    getAttackSkillId(): number {
        return this._attackSkillId;
    }

    /**
     * 设置基础攻击技能ID
     */
    setAttackSkillId(attackSkillId: number): void {
        this._attackSkillId = Math.max(0, attackSkillId || 0);
    }

    /**
     * 获取单位配置
     */
    getUnitConfig(): UnitConfig | null {
        return this._unitConfig;
    }

    /**
     * 获取模型配置
     */
    getModelConfig(): ModelConfig | null {
        return this._modelConfig;
    }

    /**
     * 设置旋转角度（度数）
     */
    setRotation(rotation: number): void {
        this._rotation = rotation;
    }

    /**
     * 获取旋转角度（度数）
     */
    getRotation(): number {
        return this._rotation;
    }

    /**
     * 设置缩放
     */
    setScale(scale: number): void {
        this._scale = Math.max(0.1, scale);
    }

    /**
     * 获取缩放
     */
    getScale(): number {
        return this._scale;
    }

    /**
     * 获取碰撞半径（米）
     */
    getRadius(): number {
        return this._radius;
    }

    /**
     * 设置碰撞半径（米）
     */
    setRadius(radius: number): void {
        this._radius = Math.max(0.1, radius);
    }

    /**
     * 设置可见性
     */
    setVisible(visible: boolean): void {
        this._visible = visible;
    }

    /**
     * 获取可见性
     */
    isVisible(): boolean {
        return this._visible;
    }

    /**
     * 设置状态
     */
    setState(state: ActorState): void {
        this._state = state;
    }

    /**
     * 获取状态
     */
    getState(): ActorState {
        return this._state;
    }

    /**
     * 造成伤害
     */
    takeDamage(damage: number): void {
        console.log(`[Actor] ${this.actorNo} takeDamage: ${damage}, HP: ${this._hp} -> ${Math.max(0, this._hp - damage)}`);
        this._hp = Math.max(0, this._hp - damage);
        if (this._hp === 0) {
            console.log(`[Actor] ${this.actorNo} died!`);
            this.die();
        }
    }

    /**
     * 恢复生命值
     */
    heal(amount: number): void {
        this._hp = Math.min(this._maxHp, this._hp + amount);
    }

    /**
     * 获取生命值
     */
    getHp(): number {
        return this._hp;
    }

    /**
     * 获取最大生命值
     */
    getMaxHp(): number {
        return this._maxHp;
    }

    /**
     * 获取是否死亡
     */
    isDead(): boolean {
        return this._isDead;
    }

    /**
     * 死亡
     */
    protected die(): void {
        this._isDead = true;
        this._state = ActorState.Dead;
        this._isActive = false;
    }

    /**
     * 激活/禁用角色
     */
    setActive(active: boolean): void {
        this._isActive = active;
    }

    /**
     * 获取是否激活
     */
    isActive(): boolean {
        return this._isActive;
    }

    /**
     * 设置精灵ID（用于客户端渲染）
     */
    setSpriteId(spriteId: string | null): void {
        this._spriteId = spriteId;
    }

    /**
     * 获取精灵ID（用于客户端渲染）
     */
    getSpriteId(): string | null {
        return this._spriteId;
    }

    /**
     * 销毁角色
     */
    destroy(): void {
        this._isActive = false;
    }
}
