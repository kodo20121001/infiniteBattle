/**
 * LevelManager 使用指南
 * 类似于 SkillSystem 的关卡管理系统
 */

/**
 * 基本用法
 */

// 1. 加载并启动关卡
const levelManager = gameRunner.getLevelManager();

const levelConfig = {
  id: 1,
  name: '第一关',
  mapId: 1,
  startUnits: [
    { unitId: 101, campId: 1, positionName: 1, level: 1 },
    { unitId: 102, campId: 2, positionName: 2, level: 1 }
  ],
  // ... 其他配置
};

const mapConfig = {
  id: 1,
  // ... 地图配置
};

levelManager.loadLevel(levelConfig, mapConfig);
levelManager.startLevel();

// 2. 监听关卡事件
levelManager.on('levelLoaded', (data) => {
  console.log('关卡已加载:', data.levelName);
});

levelManager.on('levelStarted', (data) => {
  console.log('关卡已启动');
});

levelManager.on('victoryCondition', (data) => {
  console.log('胜利！');
});

levelManager.on('defeatCondition', (data) => {
  console.log('失败！');
});

levelManager.on('unitSpawned', (data) => {
  console.log('单位已生成:', data.unitId);
});

// 3. 暂停/恢复关卡
levelManager.pauseLevel();  // 暂停
levelManager.resumeLevel(); // 恢复

// 4. 结束关卡
levelManager.endLevel('victory', { score: 1000 });
levelManager.endLevel('defeat', { reason: 'all_units_died' });

// 5. 关卡变量管理
levelManager.setVariable('playerScore', 0);
levelManager.setVariable('enemyCount', 5);

const score = levelManager.getVariable('playerScore');
console.log('当前分数:', score);

// 6. 计划任务（延迟执行）
levelManager.scheduleTask('spawn_boss', () => {
  console.log('BOSS 出现！');
}, 5); // 5 秒后执行

levelManager.cancelTask('spawn_boss'); // 取消任务

/**
 * API 总览
 */

// 生命周期管理
levelManager.loadLevel(levelConfig, mapConfig)  // 加载关卡
levelManager.startLevel()                        // 启动关卡
levelManager.pauseLevel()                        // 暂停关卡
levelManager.resumeLevel()                       // 恢复关卡
levelManager.endLevel(reason, data)              // 结束关卡
levelManager.unloadLevel()                       // 卸载关卡

// 事件管理
levelManager.on(eventType, listener)             // 订阅事件
levelManager.off(eventType, listener)            // 取消订阅

// 变量管理
levelManager.getVariable(key)                    // 获取变量
levelManager.setVariable(key, value)             // 设置变量

// 任务管理
levelManager.scheduleTask(taskId, callback, delaySeconds)  // 计划任务
levelManager.cancelTask(taskId)                  // 取消任务

// 状态查询
levelManager.isRunning()                         // 关卡是否运行中
levelManager.getCurrentLevelConfig()             // 获取当前关卡配置
levelManager.getCurrentMapConfig()               // 获取当前地图配置

// 生命周期
levelManager.destroy()                           // 销毁管理器

/**
 * 事件类型
 */

// 'levelLoaded'      - 关卡加载完成
// 'levelStarted'     - 关卡开始
// 'levelPaused'      - 关卡暂停
// 'levelResumed'     - 关卡恢复
// 'levelEnded'       - 关卡结束
// 'triggerFired'     - 触发器触发
// 'victoryCondition' - 胜利条件满足
// 'defeatCondition'  - 失败条件满足
// 'unitSpawned'      - 单位生成
// 'unitRemoved'      - 单位移除
// 'customEvent'      - 自定义事件

/**
 * 与 Game/GameRunner 的关系
 */

// GameRunner 在初始化时自动创建 LevelManager
// Game 通过 setLevelManager() 获得 LevelManager 引用
// SceneManager 由 LevelManager 使用来管理场景

// 获取各个管理器
const game = gameRunner.getGame();
const sceneManager = gameRunner.getSceneManager();
const levelManager = gameRunner.getLevelManager();

/**
 * 完整使用流程示例
 */

async function playLevel() {
  // 初始化
  const world = new World(canvas, 800, 600, 60);
  const gameRunner = new ClientGameRunner(world);
  gameRunner.init();

  // 加载关卡配置
  const levelConfig = await fetch('/config/level.json').then(r => r.json());
  const mapConfig = await fetch('/config/map.json').then(r => r.json());

  // 加载关卡
  await gameRunner.loadLevel(levelConfig[0], mapConfig[0]);

  // 获取关卡管理器
  const levelManager = gameRunner.getLevelManager();

  // 订阅事件
  levelManager.on('victoryCondition', (data) => {
    console.log('关卡胜利！');
    showVictoryScreen();
  });

  levelManager.on('defeatCondition', (data) => {
    console.log('关卡失败！');
    showDefeatScreen();
  });

  // 启动关卡
  levelManager.startLevel();

  // 后续可以：
  // - 暂停/恢复
  // - 管理变量
  // - 计划事件
  // - 监听事件等
}
