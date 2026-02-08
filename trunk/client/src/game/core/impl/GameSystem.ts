/**
 * 游戏系统基类和各种系统实现
 * 用于管理不同的游戏逻辑功能
 */

import { Actor } from './Actor';
import { GameState } from './GameState';
import type { World } from '../../engine/common/World';
import { GameSystem } from './GameSystemBase';
import { SkillSystem } from './SkillSystem';
import { UnitCommandSystem } from './UnitCommandSystem';
import { LevelManager } from './LevelManager';
import { MovementSystem } from './MovementSystem';
import { AnimationSystem } from './AnimationSystem';
import { StatusSystem } from './StatusSystem';
import { DeathSystem } from './DeathSystem';
import { TurretAttackSystem } from './TurretAttackSystem';

/**
 * 游戏系统基类
 */
export { GameSystem } from './GameSystemBase';

/**
 * 导出移动系统（从独立文件）
 */
export { MovementSystem } from './MovementSystem';

/**
 * 导出死亡系统（从独立文件）
 */
export { DeathSystem } from './DeathSystem';

/**
 * 伤害系统
 */
export class DamageSystem extends GameSystem {
    init(): void {}

    update(deltaTime: number): void {}

    fixedUpdate(fixedDeltaTime: number): void {}

    /**
     * 造成伤害
     */
    causeDamage(attackerId: string, targetId: string, damage: number): boolean {
        const attacker = this.game.getActor(attackerId);
        const target = this.game.getActor(targetId);

        console.log(`[DamageSystem] causeDamage called: attacker=${attackerId}, target=${targetId}, damage=${damage}`);

        if (!attacker || !target || target.isDead()) {
            console.log(`[DamageSystem] causeDamage failed: attacker=${!!attacker}, target=${!!target}, isDead=${target?.isDead()}`);
            return false;
        }

        console.log(`[DamageSystem] Applying ${damage} damage to ${targetId}, current HP: ${target.getHp()}`);
        target.takeDamage(damage);
        console.log(`[DamageSystem] After damage, ${targetId} HP: ${target.getHp()}`);
        return true;
    }

    /**
     * 治疗
     */
    heal(targetId: string, amount: number): boolean {
        const target = this.game.getActor(targetId);
        if (!target || target.isDead()) {
            return false;
        }

        target.heal(amount);
        return true;
    }

    destroy(): void {}
}

/**
 * 事件系统
 */
/**
 * 相对位移系统
 * 处理基于距离和角度的相对位移
 */
export class MoveBySystem extends GameSystem {
    init(): void {}

    update(deltaTime: number): void {}

    /**
     * 应用相对位移
     */
    applyMoveBy(actor: Actor, distance: number, angle: number): void {
        // 将角度转换为弧度
        const radians = angle * (Math.PI / 180);
        
        // 计算位移增量
        const dx = distance * Math.cos(radians);
        const dz = distance * Math.sin(radians);
        
        // 应用位移 (x: 水平, y: 高度, z: 深度)
        actor.move(dx, 0, dz);
    }

    fixedUpdate(fixedDeltaTime: number): void {
        // 暂时无需在 fixedUpdate 中处理
    }

    destroy(): void {}
}

/**
 * 事件系统
 */
export class EventSystem extends GameSystem {
    private _listeners: Map<string, ((data: any) => void)[]> = new Map();

    init(): void {}

    update(deltaTime: number): void {}

    fixedUpdate(fixedDeltaTime: number): void {}

    /**
     * 监听事件
     */
    on(eventType: string, listener: (data: any) => void): void {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, []);
        }
        this._listeners.get(eventType)!.push(listener);
    }

    /**
     * 取消监听事件
     */
    off(eventType: string, listener: (data: any) => void): void {
        const listeners = this._listeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * 发送事件
     */
    emit(eventType: string, data?: any): void {
        const listeners = this._listeners.get(eventType);
        if (listeners) {
            for (const listener of listeners) {
                listener(data);
            }
        }
    }

    destroy(): void {
        this._listeners.clear();
    }
}

/**
 * 主游戏类
 * 管理游戏的整体逻辑
 */
export class Game {
    private _gameState: GameState;
    private _actors: Map<string, Actor> = new Map();
    private _systems: Map<string, GameSystem> = new Map();
    private _world: World | null = null; // 仅在客户端使用
    private _isServerMode: boolean = false;
    private _levelManager: LevelManager | null = null;

    constructor(isServerMode: boolean = false) {
        this._gameState = new GameState();
        this._isServerMode = isServerMode;
        this._initializeSystems();
    }

    /**
     * 初始化游戏系统
     */
    private _initializeSystems(): void {
        this.registerSystem('status', new StatusSystem(this));
        this.registerSystem('animation', new AnimationSystem(this));
        this.registerSystem('movement', new MovementSystem(this));
        this.registerSystem('moveBy', new MoveBySystem(this));
        this.registerSystem('damage', new DamageSystem(this));
        this.registerSystem('death', new DeathSystem(this));
        this.registerSystem('event', new EventSystem(this));
        this.registerSystem('skill', new SkillSystem(this));
        this.registerSystem('unitCommand', new UnitCommandSystem(this));
        this.registerSystem('turretAttack', new TurretAttackSystem(this));
    }

    /**
     * 设置渲染世界（仅客户端使用）
     */
    setWorld(world: World): void {
        if (this._isServerMode) {
            console.warn('Cannot set World in server mode');
            return;
        }
        this._world = world;
    }

    /**
     * 获取渲染世界
     */
    getWorld(): World | null {
        return this._world;
    }

    /**
     * 初始化游戏
     */
    init(): void {
        this._gameState.init();
        for (const system of this._systems.values()) {
            system.init();
        }
    }

    /**
     * 更新游戏（用于渲染和逻辑同步）
     */
    update(deltaTime: number): void {
        if (!this._isServerMode && this._world) {
            // 客户端：同时更新逻辑
            this._updateLogic(deltaTime);
        } else if (this._isServerMode) {
            // 服务器：只更新逻辑
            this._updateLogic(deltaTime);
        }
    }

    /**
     * 固定帧更新（用于帧同步）
     */
    fixedUpdate(fixedDeltaTime: number): void {
        this._gameState.nextFrame();

        // 更新所有角色
        for (const actor of this._actors.values()) {
            actor.fixedUpdate(fixedDeltaTime);
        }

        // 更新所有系统
        for (const system of this._systems.values()) {
            system.fixedUpdate(fixedDeltaTime);
        }

        // 发送事件
        const eventSystem = this.getSystem<EventSystem>('event');
        if (eventSystem) {
            eventSystem.emit('frameUpdate', { frameIndex: this._gameState.getFrameIndex() });
        }
    }

    /**
     * 内部逻辑更新
     */
    private _updateLogic(deltaTime: number): void {
        // 更新所有角色
        for (const actor of this._actors.values()) {
            if (actor.isActive()) {
                actor.update(deltaTime);
            }
        }

        // 更新所有系统
        for (const system of this._systems.values()) {
            system.update(deltaTime);
        }
    }

    /**
     * 暂停游戏
     */
    pause(): void {
        this._gameState.pause();
    }

    /**
     * 恢复游戏
     */
    resume(): void {
        this._gameState.resume();
    }

    /**
     * 结束游戏
     */
    finish(): void {
        this._gameState.finish();
    }

    /**
     * 注册游戏系统
     */
    registerSystem(name: string, system: GameSystem): void {
        this._systems.set(name, system);
    }

    /**
     * 获取游戏系统
     */
    getSystem<T extends GameSystem>(name: string): T | undefined {
        return this._systems.get(name) as T | undefined;
    }

    /**
     * 添加角色
     */
    addActor(actor: Actor): void {
        this._actors.set(actor.actorNo, actor);
    }

    /**
     * 移除角色
     */
    removeActor(actorId: string): void {
        const actor = this._actors.get(actorId);
        if (actor) {
            // 移除对应的sprite
            const spriteId = actor.getSpriteId();
            if (spriteId && this._world) {
                const spriteManager = this._world.getSpriteManager();
                const sprite = spriteManager.get(spriteId);
                if (sprite) {
                    sprite.destroy();
                    spriteManager.remove(spriteId);
                }
            }
            
            actor.destroy();
            this._actors.delete(actorId);
        }
    }

    /**
     * 获取角色
     */
    getActor(actorId: string): Actor | undefined {
        return this._actors.get(actorId);
    }

    /**
     * 获取所有角色
     */
    getActors(): Actor[] {
        return Array.from(this._actors.values());
    }

    /**
     * 获取指定阵营的角色
     */
    getActorsByCamp(campId: number): Actor[] {
        return Array.from(this._actors.values()).filter((a) => a.campId === campId);
    }

    /**
     * 获取游戏状态管理器
     */
    getGameState(): GameState {
        return this._gameState;
    }

    /**
     * 设置关卡管理器
     */
    setLevelManager(levelManager: LevelManager): void {
        this._levelManager = levelManager;
    }

    /**
     * 获取关卡管理器
     */
    getLevelManager(): LevelManager | null {
        return this._levelManager;
    }

    /**
     * 销毁游戏
     */
    destroy(): void {
        if (this._levelManager) {
            this._levelManager.destroy();
            this._levelManager = null;
        }
        for (const system of this._systems.values()) {
            system.destroy();
        }
        for (const actor of this._actors.values()) {
            actor.destroy();
        }
        this._systems.clear();
        this._actors.clear();
    }
}
