/**
 * 帧同步游戏逻辑实现框架 - 使用说明
 * 
 * 本框架提供了一个完整的帧同步游戏逻辑实现，支持客户端渲染和服务器模式。
 */

/**
 * ================================
 * 坐标与投影约定（重要）
 * ================================
 * 
 * - Canvas 原点：左上角；x 向右为正，y 向下为正。
 * - 世界坐标：x（水平方向）、z（屏幕向下方向，越近越大）、y（高度，越高越上）。
 * - 投影采用正交俯视：将 (x, z) 投到屏幕，y 仅作为向上的偏移量。
 * 
 * 映射公式（详见 core/base/WorldProjection.ts）：
 *   screenX = x * pixelsPerMeterX
 *   screenY = z * pixelsPerMeterY - y * HEIGHT_FACTOR * pixelsPerMeterY
 * 
 * 设计分辨率：
 * - 地图显示尺寸 = (mapWidth * pixelsPerMeterX, mapHeight * pixelsPerMeterY)。
 * - 背景图需按该尺寸等比缩放，并使用左上角像素坐标放置，以保证与格子/点位对齐。
 * 
 * 备注：
 * - 若未来需要“左下为原点”的显示效果，可在渲染层做纵轴翻转：
 *   screenY = (mapHeight - z) * pixelsPerMeterY - y * HEIGHT_FACTOR * pixelsPerMeterY。
 *   此为展示层变更，数据无需修改。
 */
/**
 * ================================
 * 架构概述
 * ================================
 * 
 * 1. GameState - 游戏状态管理
 *    - 记录帧号、游戏状态、时间戳
 *    - 支持暂停/恢复/结束
 *
 * 2. Actor - 基础游戏对象
 *    - 单位、建筑等游戏世界中的对象
 *    - 支持位置、旋转、缩放、生命值等属性
 *    - 可继承实现具体对象（Unit、Building）
 *
 * 3. GameSystem - 游戏系统基类
 *    - MovementSystem - 移动系统
 *    - DamageSystem - 伤害系统
 *    - EventSystem - 事件系统
 *    - 可扩展添加其他系统
/**
 * 移动系统说明（模块化）
 * --------------------------------
 * 为提升可维护性，MovementSystem 拆分为：
 * - MovementSystem.ts：状态机协调器
 * - StraightMovementSystem.ts：直线移动 + 前方障碍检查
 * - PathfindingSystem.ts：A* 寻路 + 路径平滑
 * - PathFollowingSystem.ts：路径跟随 + 动态切回直线
 * - ObstacleDetection.ts：视线检测（DDA）
 * 默认前方障碍检测距离为 3m，支持 UnitConfig.obstacleCheckDistance 单位级覆盖。
 */
 *
 * 4. Game - 主游戏管理类
 *    - 管理所有角色和系统
 *    - 支持服务器/客户端模式
 *    - 提供固定帧更新和逻辑更新
 *
 * 5. SceneManager - 场景管理器
 *    - 根据关卡配置和地图配置创建游戏场景
 *    - 管理场景的生命周期
 *
 * 6. ClientGameRunner / ServerGameRunner - 游戏运行器
 *    - ClientGameRunner: 整合 Game 和 World，处理渲染
 *    - ServerGameRunner: 仅处理逻辑，支持帧同步
 *
 */

/**
 * ================================
 * 使用示例
 * ================================
 * 
 * // 1. 客户端使用示例
 * 
 * import { ClientGameRunner } from '@/game/core/impl/GameRunner';
 * import { World } from '@/game/engine/common/World';
 * import { levelConfig, mapConfig } from '@/path/to/configs';
 * 
 * const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
 * const world = new World(canvas, 1024, 768, 60);
 * const gameRunner = new ClientGameRunner(world);
 * gameRunner.init();
 * gameRunner.loadLevel(levelConfig, mapConfig);
 * 
 * // 获取游戏实例进行操作
 * const game = gameRunner.getGame();
 * const movementSystem = game.getSystem<MovementSystem>('movement');
 * movementSystem?.setMoveTarget('unit_1', [100, 100], 5);
 * 
 * // 2. 服务器使用示例
 * 
 * import { ServerGameRunner } from '@/game/core/impl/GameRunner';
 * 
 * const serverRunner = new ServerGameRunner();
 * serverRunner.init();
 * serverRunner.loadLevel(levelConfig, mapConfig);
 * 
 * // 服务器游戏循环自动运行，每 1000/30 ms 更新一次
 * // 通过 getGame() 获取游戏实例，处理客户端输入
 * 
 */

/**
 * ================================
 * 帧同步流程说明
 * ================================
 * 
 * 客户端和服务器都使用固定的 30 FPS 帧率进行帧同步：
 * 
 * 1. 每一帧的处理顺序：
 *    a. fixedUpdate - 固定帧更新（所有 Actor 和 System）
 *    b. update - 逻辑更新（客户端）
 *    c. render - 渲染更新（客户端，更新精灵位置）
 * 
 * 2. 帧同步保证：
 *    - 所有客户端和服务器在同一帧执行相同的逻辑
 *    - 不同帧时间的输入通过事件系统传递
 *    - 服务器通过快照方式同步状态给客户端
 * 
 * 3. 关键方法：
 *    - Game.fixedUpdate(fixedDeltaTime) - 帧同步更新
 *    - Game.update(deltaTime) - 逻辑更新
 *    - Actor.fixedUpdate(fixedDeltaTime) - Actor 帧更新
 * 
 */

/**
 * ================================
 * 扩展建议
 * ================================
 * 
 * 1. 添加更多系统（继承 GameSystem）：
 *    - SkillSystem - 技能系统
 *    - AISystem - AI 系统
 *    - TriggerSystem - 触发器系统（关卡触发）
 *    - ParticleSystem - 粒子系统
 * 
 * 2. 自定义 Actor：
 *    - 继承 Unit 或 Building
 *    - 实现 fixedUpdate 添加具体逻辑
 * 
 * 3. 网络同步：
 *    - 实现 IGameStateSerializer 序列化状态
 *    - 通过 WebSocket 或 HTTP 同步
 *    - 实现客户端预测和服务器校验
 * 
 * 4. 物理系统：
 *    - 添加碰撞检测
 *    - 整合现有的 Quadtree、AStar 等工具
 * 
 */

export interface IGameStateSerializer {
    serialize(): string;
    deserialize(data: string): void;
}

export interface INetworkManager {
    sendGameState(snapshot: any): void;
    receiveCommand(command: any): void;
}

// 预留接口供后续扩展使用
