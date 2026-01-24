/**
 * 快速参考指南 - 帧同步游戏框架
 * 常见使用场景和代码片段
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 1: 创建客户端游戏
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * import { ClientGameRunner } from '@/game/core/impl';
 * import { World } from '@/game/engine/common/World';
 * import { levelConfig, mapConfig } from '@/path/to/configs';
 * 
 * // 创建世界
 * const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
 * const world = new World(canvas, 1024, 768, 60);
 * 
 * // 创建游戏运行器
 * const gameRunner = new ClientGameRunner(world);
 * gameRunner.init();
 * 
 * // 加载关卡
 * gameRunner.loadLevel(levelConfig, mapConfig);
 * 
 * // 清理
 * window.addEventListener('beforeunload', () => {
 *     gameRunner.destroy();
 * });
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 2: 创建服务器游戏
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * import { ServerGameRunner } from '@/game/core/impl';
 * import { levelConfig, mapConfig } from '@/path/to/configs';
 * 
 * // 创建游戏运行器
 * const gameRunner = new ServerGameRunner();
 * gameRunner.init();
 * 
 * // 加载关卡
 * gameRunner.loadLevel(levelConfig, mapConfig);
 * 
 * // 游戏循环自动运行
 * // 监听客户端命令
 * onClientCommand((unitId: string, x: number, y: number) => {
 *     const game = gameRunner.getGame();
 *     const movementSystem = game.getSystem('movement');
 *     movementSystem?.setMoveTarget(unitId, [x, y], 5);
 * });
 * 
 * // 发送状态给客户端
 * setInterval(() => {
 *     const snapshot = gameRunner.getGame().getGameState().getSnapshot();
 *     sendToClients(snapshot);
 * }, 33.33);
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 3: 控制单位移动
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * const game = gameRunner.getGame();
 * const movementSystem = game.getSystem('movement');
 * 
 * // 设置移动目标
 * movementSystem?.setMoveTarget('unit_1', [100, 200], 5);
 * 
 * // 停止移动
 * movementSystem?.stopMove('unit_1');
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 4: 处理伤害
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * const game = gameRunner.getGame();
 * const damageSystem = game.getSystem('damage');
 * 
 * // 造成伤害
 * const success = damageSystem?.causeDamage('attacker_1', 'target_1', 10);
 * 
 * // 治疗
 * damageSystem?.heal('target_1', 5);
 * 
 * // 查询单位生命值
 * const target = game.getActor('target_1');
 * console.log(`HP: ${target?.getHp()} / ${target?.getMaxHp()}`);
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 5: 查询单位
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * import { QueryUtils, DistanceUtils } from '@/game/core/impl';
 * 
 * const game = gameRunner.getGame();
 * const unit = game.getActor('unit_1');
 * 
 * // 查询范围内的敌方单位
 * const enemies = QueryUtils.findEnemyUnitsInRange(
 *     game,
 *     unit.campId,
 *     unit.getPosition(),
 *     100
 * );
 * 
 * // 查询最近的敌人
 * const nearest = QueryUtils.findNearestEnemy(game, unit.campId, unit.getPosition());
 * 
 * // 计算距离
 * if (unit && nearest) {
 *     const dist = DistanceUtils.distance2D(unit.getPosition(), nearest.getPosition());
 *     console.log(`Distance to nearest enemy: ${dist}`);
 * }
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 6: 监听事件
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * const game = gameRunner.getGame();
 * const eventSystem = game.getSystem('event');
 * 
 * // 监听伤害事件
 * eventSystem?.on('onDamage', (data) => {
 *     console.log(`Unit ${data.targetId} took ${data.damage} damage from ${data.attackerId}`);
 * });
 * 
 * // 监听单位死亡事件
 * eventSystem?.on('onUnitDeath', (data) => {
 *     console.log(`Unit ${data.unitId} died`);
 * });
 * 
 * // 监听帧更新事件
 * eventSystem?.on('frameUpdate', (data) => {
 *     console.log(`Frame ${data.frameIndex}`);
 * });
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 7: 自定义系统
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * import { GameSystem } from '@/game/core/impl';
 * 
 * class SkillSystem extends GameSystem {
 *     init(): void {
 *         console.log('SkillSystem initialized');
 *     }
 * 
 *     update(deltaTime: number): void {
 *         // 逻辑更新
 *     }
 * 
 *     fixedUpdate(fixedDeltaTime: number): void {
 *         // 固定帧更新
 *     }
 * 
 *     destroy(): void {
 *         // 清理资源
 *     }
 * 
 *     castSkill(casterUnit: string, targetUnit: string, skillId: number): void {
 *         const game = this.game;
 *         const caster = game.getActor(casterUnit);
 *         const target = game.getActor(targetUnit);
 * 
 *         if (caster && target) {
 *             // 处理技能逻辑
 *         }
 *     }
 * }
 * 
 * // 注册系统
 * game.registerSystem('skill', new SkillSystem(game));
 * 
 * // 使用系统
 * const skillSystem = game.getSystem<SkillSystem>('skill');
 * skillSystem?.castSkill('caster_1', 'target_1', 101);
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 8: 自定义 Actor
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * import { Unit, ActorType, Actor } from '@/game/core/impl';
 * import { FixedVector3 } from '@/game/core/base/fixed/FixedVector3';
 * 
 * class Hero extends Unit {
 *     private heroLevel: number = 1;
 *     private experience: number = 0;
 * 
 *     gainExperience(exp: number): void {
 *         this.experience += exp;
 *         if (this.experience >= 100) {
 *             this.levelUp();
 *             this.experience = 0;
 *         }
 *     }
 * 
 *     override levelUp(): void {
 *         super.levelUp();
 *         console.log(`Hero leveled up to ${this.getLevel()}`);
 *     }
 * }
 * 
 * // 创建英雄
 * const hero = new Hero('hero_1', 1, 1001, 1);
 * hero.init(unitConfig, modelConfig);
 * game.addActor(hero);
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 9: 使用随机数（帧同步友好）
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * import { RandomUtils } from '@/game/core/impl';
 * 
 * // 设置种子以确保所有客户端和服务器使用相同的随机序列
 * RandomUtils.setSeed(12345);
 * 
 * // 在 fixedUpdate 中使用随机数
 * fixedUpdate() {
 *     if (RandomUtils.chance(0.1)) {  // 10% 概率
 *         // 执行某个动作
 *     }
 * 
 *     const randomDamage = RandomUtils.randomInt(5, 15);
 *     this.takeDamage(randomDamage);
 * }
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 10: 游戏暂停/恢复
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * const gameRunner = ...;
 * 
 * // 暂停
 * gameRunner.pause();
 * 
 * // 恢复
 * gameRunner.resume();
 * 
 * // 停止
 * gameRunner.stop();
 * 
 * // 销毁
 * gameRunner.destroy();
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 场景 11: 访问游戏状态
 * ════════════════════════════════════════════════════════════════════════
 */

/**
 * const game = gameRunner.getGame();
 * const gameState = game.getGameState();
 * 
 * // 获取当前帧号
 * const frameIndex = gameState.getFrameIndex();
 * 
 * // 获取游戏状态
 * const state = gameState.getGameState();
 * 
 * // 获取已运行时间（毫秒）
 * const elapsedTime = gameState.getElapsedTime();
 * 
 * // 获取状态快照（用于网络同步）
 * const snapshot = gameState.getSnapshot();
 */

/**
 * ════════════════════════════════════════════════════════════════════════
 * 常见陷阱和最佳实践
 * ════════════════════════════════════════════════════════════════════════
 * 
 * 1. 不要在 fixedUpdate 中使用 Math.random()
 *    ✗ 错误: let damage = Math.random() * 10;
 *    ✓ 正确: let damage = RandomUtils.randomInt(0, 10);
 * 
 * 2. 始终在 fixedUpdate 中处理帧同步逻辑
 *    ✗ 错误: 在 update 中处理移动逻辑
 *    ✓ 正确: 在 fixedUpdate 中处理移动逻辑
 * 
 * 3. 服务器是权威的，不要相信客户端的伤害计算
 *    ✗ 错误: 在客户端计算伤害后发送给服务器
 *    ✓ 正确: 客户端发送动作，服务器计算伤害
 * 
 * 4. 使用事件系统进行通信而不是直接调用方法
 *    ✗ 错误: systemA.doSomething(); systemB.handleIt();
 *    ✓ 正确: eventSystem.emit('something'); systemB.on('something', ...);
 * 
 * 5. 在场景卸载时清理资源
 *    ✓ 正确: gameRunner.destroy();
 */

export {};
