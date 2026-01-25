/**
 * MovementSystem 使用示例
 * 演示如何使用新的 War3 风格移动系统
 */

import { ClientGameRunner } from './GameRunner';
import { MovementSystem } from './MovementSystem';
import type { World } from '../../engine/common/World';

/**
 * 示例 1: 基础移动命令
 */
function example1_basicMovement(runner: ClientGameRunner) {
    const game = runner.getGame();
    const movement = game.getSystem<MovementSystem>('movement');
    
    // 移动单位到目标位置
    movement?.moveTo({
        actorId: 'unit_1',
        targetX: 100,
        targetZ: 100,
        speed: 5,  // 5 米/秒
    });
    
    // 带自定义参数的移动
    movement?.moveTo({
        actorId: 'unit_2',
        targetX: 200,
        targetZ: 150,
        speed: 8,
        arrivalRadius: 1.0,    // 到达半径 1 米
        turnSpeed: 180,        // 转向速度 180 度/秒
    });
}

/**
 * 示例 2: 检查移动状态
 */
function example2_checkMovementState(runner: ClientGameRunner) {
    const game = runner.getGame();
    const movement = game.getSystem<MovementSystem>('movement');
    
    if (!movement) return;
    
    // 检查单位是否在移动
    const isMoving = movement.isMoving('unit_1');
    console.log(`Unit 1 is moving: ${isMoving}`);
    
    // 获取详细移动状态
    const state = movement.getMoveState('unit_1');
    console.log(`Unit 1 state: ${state}`); // idle, moving, turning, blocked, arrived
}

/**
 * 示例 3: 停止移动
 */
function example3_stopMovement(runner: ClientGameRunner) {
    const game = runner.getGame();
    const movement = game.getSystem<MovementSystem>('movement');
    
    // 停止指定单位的移动
    movement?.stopMove('unit_1');
}

/**
 * 示例 4: 通过 UnitCommandSystem 使用移动
 */
function example4_useWithCommandSystem(runner: ClientGameRunner) {
    const game = runner.getGame();
    const commandSystem = game.getSystem('unitCommand');
    
    if (!commandSystem) return;
    
    // 发出移动命令（会自动调用 MovementSystem）
    commandSystem.issueCommand('unit_1', {
        type: 'MoveTo',
        targetPos: { x: 100, y: 100 }, // y 对应世界坐标的 z
    });
    
    // 攻击移动（边移动边攻击）
    commandSystem.issueCommand('unit_2', {
        type: 'AttackMove',
        targetPos: { x: 200, y: 150 },
    });
}

/**
 * 示例 5: 监听移动完成
 */
function example5_listenForArrival(runner: ClientGameRunner) {
    const game = runner.getGame();
    const movement = game.getSystem<MovementSystem>('movement');
    
    if (!movement) return;
    
    // 开始移动
    movement.moveTo({
        actorId: 'unit_1',
        targetX: 100,
        targetZ: 100,
        speed: 5,
    });
    
    // 在游戏循环中检查状态
    const checkArrival = setInterval(() => {
        const state = movement.getMoveState('unit_1');
        if (state === 'arrived' || state === null) {
            console.log('Unit 1 has arrived!');
            clearInterval(checkArrival);
        }
    }, 100);
}

/**
 * 示例 6: 完整的关卡移动场景
 */
async function example6_fullLevelSetup(world: World) {
    // 1. 创建 GameRunner
    const runner = new ClientGameRunner(world);
    runner.init();
    
    // 2. 加载关卡（会自动初始化 MovementSystem）
    await runner.loadLevel(1); // levelId = 1
    
    // 3. 等待关卡启动
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const game = runner.getGame();
    const movement = game.getSystem<MovementSystem>('movement');
    const actors = game.getActors();
    
    if (actors.length > 0 && movement) {
        // 4. 让第一个单位移动
        const firstActor = actors[0];
        movement.moveTo({
            actorId: firstActor.id,
            targetX: 150,
            targetZ: 150,
            speed: firstActor.getSpeed(),
            arrivalRadius: 0.5,
        });
        
        console.log(`[Example] Started movement for ${firstActor.id}`);
    }
}

/**
 * MovementSystem 特性说明
 */
/*
# MovementSystem 特性

## 1. A* 寻路
- 使用地图格子进行寻路
- 支持 8 方向移动
- 自动避开阻挡区域
- 使用曼哈顿距离作为启发式函数

## 2. 路径平滑
- 自动进行路径简化
- 使用视线检测（Line of Sight）
- 减少不必要的转角
- 生成更自然的移动路径

## 3. 平滑转向
- 不会瞬间转向，而是渐进式旋转
- 可配置转向速度（度/秒）
- 类似 War3 的转向效果

## 4. 精确到达判定
- 可配置到达半径
- 避免"震荡"问题
- 支持路径点跟随

## 5. 移动状态管理
- idle: 待机
- moving: 移动中
- turning: 转向中
- blocked: 被阻挡
- arrived: 已到达

## 6. 性能优化
- 只计算活跃单位的移动
- 路径缓存和复用
- 高效的 A* 实现

## 配置参数

```typescript
interface MoveCommand {
    actorId: string;
    targetX: number;
    targetZ: number;
    targetY?: number;       // 高度（可选）
    speed: number;          // 移动速度（米/秒）
    arrivalRadius?: number; // 到达半径（默认 0.5 米）
    turnSpeed?: number;     // 转向速度（默认 360 度/秒）
}
```

## 与 War3 的对比

| 功能 | War3 | MovementSystem |
|------|------|----------------|
| 寻路算法 | A* + Flow Field | A* |
| 路径平滑 | ✓ | ✓ |
| 转向系统 | ✓ | ✓ |
| 单位避让 | ✓ | ⚠️ 待实现 |
| 编队移动 | ✓ | ⚠️ 待实现 |
| 地形高度 | ✓ | ⚠️ 基础支持 |

## 后续改进方向

1. **单位避让系统**
   - RVO (Reciprocal Velocity Obstacles)
   - 局部避让算法
   - 单位碰撞检测

2. **编队移动**
   - 编队保持
   - 编队变换
   - 领队跟随

3. **Flow Field**
   - 大规模单位移动优化
   - 动态流场更新
   - 更自然的群体移动

4. **高级寻路**
   - 分层寻路（Hierarchical Pathfinding）
   - 跳点搜索（Jump Point Search）
   - 动态障碍物处理
*/

export {
    example1_basicMovement,
    example2_checkMovementState,
    example3_stopMovement,
    example4_useWithCommandSystem,
    example5_listenForArrival,
    example6_fullLevelSetup,
};
