/**
 * 游戏实现框架的主导出文件
 * 整合所有核心组件
 */

// 游戏状态
export { GameState, GameStateEnum, type GameSnapshot } from './GameState';

// 角色/单位基类
export { Actor, ActorType, ActorState } from './Actor';

// 游戏单位实现
export { Unit, Building } from './Unit';

// 子弹实现
export { Bullet, type BulletRuntimeContext, type BulletEventType } from './Bullet';

// 游戏系统
export {
    GameSystem,
    MovementSystem,
    DamageSystem,
    EventSystem,
    Game,
} from './GameSystem';

// 单位指令系统
export { UnitCommandSystem, type UnitCommandType, type UnitCommand } from './UnitCommandSystem';

// 技能系统
export { SkillSystem, type SkillContext } from './SkillSystem';

// 关卡管理
export { LevelManager, type LevelEventType, type LevelEventListener } from './LevelManager';

// 场景管理
export { SceneManager } from './SceneManager';

// 地图管理
export { GameMap, type MapConfig, type MapPoint, type MapImageNode } from './Map';

// 游戏运行器
export { ClientGameRunner, ServerGameRunner } from './GameRunner';

// 游戏工具
export {
    DistanceUtils,
    QueryUtils,
    EventUtils,
    RandomUtils,
    AnimationUtils,
    MathUtils,
} from './GameUtils';

/**
 * 快速开始示例：
 * 
 * // 客户端
 * import { ClientGameRunner } from '@/game/core/impl';
 * import { World } from '@/game/engine/common/World';
 * 
 * const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
 * const world = new World(canvas, 1024, 768);
 * const gameRunner = new ClientGameRunner(world);
 * gameRunner.init();
 * 
 * // 加载关卡（需要提供 levelConfig 和 mapConfig）
 * // gameRunner.loadLevel(levelConfig, mapConfig);
 */
