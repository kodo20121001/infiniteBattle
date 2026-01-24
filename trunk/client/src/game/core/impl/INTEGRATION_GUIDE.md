/**
 * 帧同步游戏框架 - 集成指南
 * 
 * 本文档指导如何在现有项目中使用这个框架
 */

/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                   步骤 1: 理解框架架构                                  ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

/**
 * 框架采用分层设计：
 * 
 * 表现层（Presentation）
 * └─ World（渲染系统）
 *    └─ Camera2D、Renderer、SpriteManager
 * 
 * 游戏逻辑层（Game Logic）
 * └─ Game（主管理器）
 *    ├─ GameState（状态管理）
 *    ├─ Actor[]（游戏对象）
 *    └─ System[]（游戏系统）
 * 
 * 场景层（Scene）
 * └─ SceneManager
 *    └─ 根据配置初始化场景
 * 
 * 这种设计使得：
 * - 服务器只需要 Game 层
 * - 客户端需要 World + Game 层
 * - 逻辑和渲染完全解耦
 */

/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                   步骤 2: 客户端集成                                    ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

/**
 * 2.1 在你的游戏场景组件中：
 * 
 * import React, { useEffect, useRef } from 'react';
 * import { ClientGameRunner } from '@/game/core/impl';
 * import { World } from '@/game/engine/common/World';
 * 
 * export function GameScene() {
 *     const canvasRef = useRef<HTMLCanvasElement>(null);
 *     const gameRunnerRef = useRef<ClientGameRunner | null>(null);
 * 
 *     useEffect(() => {
 *         if (!canvasRef.current) return;
 * 
 *         const world = new World(canvasRef.current, 1024, 768);
 *         const gameRunner = new ClientGameRunner(world);
 *         gameRunner.init();
 * 
 *         // TODO: 加载关卡
 *         // const levelConfig = await loadLevelConfig(levelId);
 *         // const mapConfig = await loadMapConfig(levelId);
 *         // gameRunner.loadLevel(levelConfig, mapConfig);
 * 
 *         gameRunnerRef.current = gameRunner;
 * 
 *         return () => {
 *             gameRunner.destroy();
 *         };
 *     }, []);
 * 
 *     return <canvas ref={canvasRef} width={1024} height={768} />;
 * }
 */

/**
 * 2.2 连接输入系统：
 * 
 * export function GameScene() {
 *     // ... 前面的代码 ...
 * 
 *     const handleUnitClick = (unitId: string) => {
 *         const gameRunner = gameRunnerRef.current;
 *         if (!gameRunner) return;
 * 
 *         // 记录选中的单位
 *         setSelectedUnit(unitId);
 *     };
 * 
 *     const handleMapClick = (x: number, y: number) => {
 *         const gameRunner = gameRunnerRef.current;
 *         if (!gameRunner || !selectedUnit) return;
 * 
 *         const game = gameRunner.getGame();
 *         const movementSystem = game.getSystem('movement');
 *         movementSystem?.setMoveTarget(selectedUnit, [x, y], 5);
 *     };
 * 
 *     return (
 *         <div onClick={(e) => handleMapClick(e.clientX, e.clientY)}>
 *             <canvas ref={canvasRef} width={1024} height={768} />
 *         </div>
 *     );
 * }
 */

/**
 * 2.3 集成 UI 显示（血条、法力条等）：
 * 
 * export function GameScene() {
 *     // ... 前面的代码 ...
 *     const [units, setUnits] = useState<any[]>([]);
 * 
 *     useEffect(() => {
 *         if (!gameRunnerRef.current) return;
 * 
 *         const game = gameRunnerRef.current.getGame();
 *         const eventSystem = game.getSystem('event');
 * 
 *         // 监听帧更新事件
 *         eventSystem?.on('frameUpdate', () => {
 *             const actors = game.getActors();
 *             setUnits(actors.map(a => ({
 *                 id: a.id,
 *                 hp: a.getHp(),
 *                 maxHp: a.getMaxHp(),
 *                 position: a.getPosition(),
 *             })));
 *         });
 *     }, []);
 * 
 *     return (
 *         <>
 *             <canvas ref={canvasRef} width={1024} height={768} />
 *             <UnitUI units={units} />
 *         </>
 *     );
 * }
 */

/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                   步骤 3: 服务器集成                                    ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

/**
 * 3.1 创建服务器游戏实例：
 * 
 * import { ServerGameRunner } from '@/game/core/impl';
 * import { levelConfig, mapConfig } from '@/configs';
 * 
 * export class GameServer {
 *     private gameRunner: ServerGameRunner;
 * 
 *     constructor() {
 *         this.gameRunner = new ServerGameRunner();
 *         this.gameRunner.init();
 *     }
 * 
 *     start(levelId: number): void {
 *         // TODO: 根据 levelId 加载配置
 *         this.gameRunner.loadLevel(levelConfig, mapConfig);
 *         console.log('Game server started');
 *     }
 * 
 *     stop(): void {
 *         this.gameRunner.stop();
 *     }
 * }
 */

/**
 * 3.2 处理客户端命令：
 * 
 * export class GameServer {
 *     // ... 前面的代码 ...
 * 
 *     handlePlayerCommand(playerId: string, command: any): void {
 *         const game = this.gameRunner.getGame();
 * 
 *         // 验证命令合法性
 *         const actor = game.getActor(command.unitId);
 *         if (!actor || actor.campId !== playerId) {
 *             return; // 拒绝非法命令
 *         }
 * 
 *         // 执行命令
 *         switch (command.type) {
 *             case 'move':
 *                 const movementSystem = game.getSystem('movement');
 *                 movementSystem?.setMoveTarget(
 *                     command.unitId,
 *                     [command.x, command.y],
 *                     command.speed
 *                 );
 *                 break;
 * 
 *             case 'attack':
 *                 const damageSystem = game.getSystem('damage');
 *                 damageSystem?.causeDamage(
 *                     command.attackerId,
 *                     command.targetId,
 *                     command.damage
 *                 );
 *                 break;
 *         }
 *     }
 * }
 */

/**
 * 3.3 广播游戏状态：
 * 
 * export class GameServer {
 *     private clients: WebSocket[] = [];
 * 
 *     constructor() {
 *         // ... 前面的代码 ...
 *         this.startStateBroadcast();
 *     }
 * 
 *     private startStateBroadcast(): void {
 *         setInterval(() => {
 *             const snapshot = this.gameRunner.getGame().getGameState().getSnapshot();
 *             const message = JSON.stringify({
 *                 type: 'gameState',
 *                 payload: snapshot,
 *             });
 * 
 *             for (const client of this.clients) {
 *                 if (client.readyState === WebSocket.OPEN) {
 *                     client.send(message);
 *                 }
 *             }
 *         }, 33.33); // 30 FPS
 *     }
 * 
 *     addClient(ws: WebSocket): void {
 *         this.clients.push(ws);
 *     }
 * }
 */

/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                   步骤 4: 自定义系统                                    ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

/**
 * 4.1 创建技能系统：
 * 
 * import { GameSystem } from '@/game/core/impl';
 * 
 * export class SkillSystem extends GameSystem {
 *     private skillCooldowns = new Map<string, number>();
 * 
 *     init(): void {}
 * 
 *     update(deltaTime: number): void {}
 * 
 *     fixedUpdate(fixedDeltaTime: number): void {
 *         // 减少冷却时间
 *         for (const [skillId, cooldown] of this.skillCooldowns.entries()) {
 *             this.skillCooldowns.set(skillId, cooldown - fixedDeltaTime);
 *         }
 *     }
 * 
 *     castSkill(casterId: string, targetId: string, skillId: number): boolean {
 *         const caster = this.game.getActor(casterId);
 *         const target = this.game.getActor(targetId);
 * 
 *         if (!caster || !target) return false;
 * 
 *         // 检查冷却
 *         const cooldownKey = `${casterId}_${skillId}`;
 *         const cooldown = this.skillCooldowns.get(cooldownKey) || 0;
 *         if (cooldown > 0) return false;
 * 
 *         // 执行技能逻辑
 *         // ... 伤害计算、特效等 ...
 * 
 *         // 设置冷却
 *         this.skillCooldowns.set(cooldownKey, 3000); // 3 秒冷却
 * 
 *         return true;
 *     }
 * 
 *     destroy(): void {}
 * }
 * 
 * // 注册系统
 * const game = gameRunner.getGame();
 * game.registerSystem('skill', new SkillSystem(game));
 */

/**
 * 4.2 创建 AI 系统：
 * 
 * import { GameSystem, QueryUtils } from '@/game/core/impl';
 * import { BehaviorTree } from '@/game/core/tool/bt/BehaviorTree';
 * 
 * export class AISystem extends GameSystem {
 *     private behaviorTrees = new Map<string, BehaviorTree>();
 * 
 *     init(): void {}
 * 
 *     update(deltaTime: number): void {}
 * 
 *     fixedUpdate(fixedDeltaTime: number): void {
 *         const actors = this.game.getActors();
 * 
 *         for (const actor of actors) {
 *             const btree = this.behaviorTrees.get(actor.id);
 *             if (btree) {
 *                 btree.tick();
 *             }
 *         }
 *     }
 * 
 *     registerAI(actorId: string, btree: BehaviorTree): void {
 *         this.behaviorTrees.set(actorId, btree);
 *     }
 * 
 *     destroy(): void {}
 * }
 */

/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                   步骤 5: 网络同步                                      ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

/**
 * 5.1 客户端接收服务器状态：
 * 
 * export function GameScene() {
 *     // ... 前面的代码 ...
 * 
 *     useEffect(() => {
 *         const ws = new WebSocket('ws://localhost:3000/game');
 * 
 *         ws.onmessage = (event) => {
 *             const message = JSON.parse(event.data);
 * 
 *             if (message.type === 'gameState') {
 *                 // 更新客户端本地状态
 *                 // 这里可以进行预测纠正（reconciliation）
 *                 handleGameStateSnapshot(message.payload);
 *             }
 *         };
 * 
 *         return () => ws.close();
 *     }, []);
 * }
 */

/**
 * 5.2 客户端预测 + 服务器校验：
 * 
 * export function GameScene() {
 *     // ... 前面的代码 ...
 * 
 *     const handleMapClick = (x: number, y: number) => {
 *         const gameRunner = gameRunnerRef.current;
 *         if (!gameRunner || !selectedUnit) return;
 * 
 *         const game = gameRunner.getGame();
 *         const movementSystem = game.getSystem('movement');
 * 
 *         // 1. 客户端立即执行（预测）
 *         movementSystem?.setMoveTarget(selectedUnit, [x, y], 5);
 * 
 *         // 2. 发送命令给服务器
 *         ws.send(JSON.stringify({
 *             type: 'playerCommand',
 *             command: {
 *                 type: 'move',
 *                 unitId: selectedUnit,
 *                 x,
 *                 y,
 *                 speed: 5,
 *             },
 *         }));
 *     };
 * }
 */

/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║                   常见问题 FAQ                                          ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Q1: 如何添加新的游戏对象？
 * A: 继承 Actor 或 Unit 类：
 * 
 * class Monster extends Unit {
 *     private patrolPath: [number, number][];
 * 
 *     constructor(id: string, modelId: number) {
 *         super(id, modelId, monsterUnitId, hostileCampId);
 *     }
 * 
 *     fixedUpdate(fixedDeltaTime: number): void {
 *         super.fixedUpdate(fixedDeltaTime);
 *         // 巡逻逻辑
 *     }
 * }
 */

/**
 * Q2: 如何实现复杂的移动行为（比如寻路）？
 * A: 扩展 MovementSystem 或创建新系统：
 * 
 * class PathfindingSystem extends GameSystem {
 *     private paths = new Map<string, number[][]>();
 * 
 *     fixedUpdate(fixedDeltaTime: number): void {
 *         // 计算并更新路径
 *     }
 * }
 */

/**
 * Q3: 如何确保客户端和服务器的同步？
 * A: 使用相同的配置和种子：
 * 
 * // 服务器
 * RandomUtils.setSeed(1234);
 * gameRunner.loadLevel(levelConfig, mapConfig);
 * 
 * // 客户端接收相同的信息
 * RandomUtils.setSeed(1234);
 * gameRunner.loadLevel(levelConfig, mapConfig);
 */

/**
 * Q4: 如何处理大量的角色？
 * A: 使用空间分割和事件系统：
 * 
 * - 使用 Quadtree 进行高效查询
 * - 使用事件系统而不是轮询
 * - 实现 AI 分级系统
 */

/**
 * Q5: 如何调试帧同步问题？
 * A: 使用快照和回放：
 * 
 * // 记录快照
 * const snapshots: GameSnapshot[] = [];
 * const snapshot = gameState.getSnapshot();
 * snapshots.push(snapshot);
 * 
 * // 调试时可以回放快照
 */

export {};
