/**
 * 技能演示预览
 * 显示正在编辑的技能效果
 */

import React, { useEffect, useRef, useState } from 'react';
import { ClientGameRunner } from '@/game/core/impl';
import { World } from '@/game/engine/common/World';
import { Configs } from '@/game/common/Configs';
import { ConfigManager } from '@/common/ConfigManager';

/**
 * 创建演示关卡配置
 */
const createDemoLevelConfig = () => ({
  id: 9999,
  name: '技能演示',
  mapId: 1,
  description: '',
  camps: [
    { id: 1, name: '玩家', playerControlled: true },
    { id: 2, name: '敌人' }
  ],
  alliances: [
    { sourceCampId: 1, targetCampId: 2, relation: 'enemy', shareVision: false }
  ],
  initialResources: {},
  startUnits: [
    {
      unitId: 101,
      campId: 1,
      positionName: 1,  // 地图点1
      level: 1
    },
    {
      unitId: 102,
      campId: 2,
      positionName: 2,  // 地图点2（会添加）
      level: 1
    }
  ],
  winCondition: '',
  loseCondition: '',
  triggers: []
});

/**
 * 加载地图1的实际配置
 */
const loadDemoMapConfig = async () => {
  try {
    const response = await fetch('/config/map.json');
    const maps = await response.json();
    const map1 = maps.find(m => m.id === 1);
    
    if (!map1) {
      throw new Error('Map 1 not found in config');
    }
    
    // 确保 imageTree 存在
    if (!map1.imageTree) {
      map1.imageTree = [];
    }
    
    // 强制设置演示用的点位（忽略原有配置）
    map1.points = [
      { id: 1, x: 200, y: 200 },
      { id: 2, x: 400, y: 200 }
    ];
    
    console.log('Map config loaded:', map1);
    return map1;
  } catch (err) {
    console.error('Failed to load map config:', err);
    // 返回默认配置
    return {
      id: 1,
      name: '新地图-1',
      mapWidth: 1000,
      mapHeight: 1000,
      gridWidth: 50,
      gridHeight: 50,
      imageTree: [
        {
          id: 1,
          name: 'fallback-image',
          x: 0,
          y: 0,
          path: '/map/82aab099fd819b2b22ed627034c4e766.png'
        }
      ],
      points: [
        { id: 1, x: 200, y: 200 },
        { id: 2, x: 400, y: 200 }
      ],
      paths: [],
      triggerAreas: [],
      gridCells: []
    };
  }
};

export const SkillDemoPreview = ({ skillConfig, isOpen, onClose }) => {
  const canvasRef = useRef(null);
  const gameRunnerRef = useRef(null);
  const levelManagerRef = useRef(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'error'
  const [message, setMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      // 清理
      if (gameRunnerRef.current) {
        gameRunnerRef.current.destroy();
        gameRunnerRef.current = null;
      }
      levelManagerRef.current = null;
      setStatus('idle');
      setMessage('');
      setElapsedTime(0);
      return;
    }

    // 初始化游戏
    const initGame = async () => {
      try {
        if (!canvasRef.current) throw new Error('Canvas not found');

        // 初始化配置管理器并加载表
        const configManager = new ConfigManager();
        Configs.init(configManager);
        const mapConfigs = configManager.Get('map') || {};
        const levelConfigs = configManager.Get('level') || {};
        console.log('Configs initialized');

        // 创建世界
        const world = new World(canvasRef.current, 800, 600, 60);
        const gameRunner = new ClientGameRunner(world);
        gameRunner.init();

        // 选择关卡 / 地图配置，优先使用演示配置（确保有 startUnits）
        let levelConfig = createDemoLevelConfig();
        // 如果配置表有该 ID 的关卡，补充其他字段
        if (levelConfigs[1]) {
          levelConfig = { ...levelConfigs[1], ...createDemoLevelConfig() };
        }
        let mapConfig = mapConfigs[levelConfig.mapId] || mapConfigs[1];

        // 如果 mapConfig 缺失，回退默认
        if (!mapConfig) {
          mapConfig = await loadDemoMapConfig();
        }

        // 确保点位存在（演示站位）
        if (!mapConfig.points || mapConfig.points.length < 2) {
          mapConfig.points = [
            { id: 1, x: 200, y: 200 },
            { id: 2, x: 400, y: 200 }
          ];
        }

        console.log('Loading level with config:', { levelId: levelConfig.id, levelName: levelConfig.name });
        
        // 加载关卡到游戏
        await gameRunner.loadLevel(levelConfig, mapConfig);
        
        // 通过 LevelManager 管理关卡
        const levelManager = gameRunner.getLevelManager();
        levelManagerRef.current = levelManager;
        
        // 订阅关卡事件
        levelManager.on('levelLoaded', (data) => {
          console.log('关卡加载完成:', data);
        });

        gameRunnerRef.current = gameRunner;
        setStatus('running');
        setMessage('🎮 演示关卡已启动，正在加载角色...');

        // 获取游戏实例
        const game = gameRunner.getGame();
        const actors = game.getActors();
        console.log('Actors loaded:', actors.length);
        actors.forEach((actor, i) => {
          const pos = actor.getPosition();
          const height = actor.getHeight();
          console.log(`Actor ${i}:`, {
            id: actor.id,
            unitType: actor.unitType,
            position: { x: pos.x, z: pos.y },
            height: height,
            spriteId: actor.getSpriteId(),
            visible: actor.isVisible()
          });
        });
        
        // 检查相机和渲染器
        const camera = world.getCamera();
        console.log('Camera:', {
          position: camera.position,
          zoom: camera.zoom,
          viewport: { width: camera.viewportWidth, height: camera.viewportHeight }
        });
        
        // 检查精灵管理器
        const spriteManager = world.getSpriteManager();
        console.log('Total sprites:', spriteManager.getAll().length);
        spriteManager.getAll().forEach((sprite, i) => {
          const width = sprite.width || 'unknown';
          const height = sprite.height || 'unknown';
          console.log(`Sprite ${i}:`, {
            position: { x: sprite.position.x, y: sprite.position.y, z: sprite.position.z },
            size: { width, height },
            visible: sprite.visible,
            type: sprite.constructor.name
          });
        });
        const eventSystem = game.getSystem('event');

        // 为单位下达基础指令并配置自动施法
        const commandSystem = game.getSystem('unitCommand');
        if (commandSystem && actors.length >= 2) {
          const attacker = actors[0];
          const target = actors[1];

          // 攻击者：原地待命，自动施放当前编辑的技能
          commandSystem.issueCommand(attacker.id, {
            type: 'HoldPosition',
            guardPos: { x: attacker.getPosition().x, y: attacker.getPosition().y },
            visionRadius: 600
          });
          commandSystem.setAutoSkill(attacker.id, skillConfig, { cooldown: 2, castRange: 350 });

          // 目标：保持原地
          commandSystem.issueCommand(target.id, {
            type: 'HoldPosition',
            guardPos: { x: target.getPosition().x, y: target.getPosition().y },
            visionRadius: 200
          });
        }

        // 监听帧更新事件
        if (eventSystem) {
          eventSystem.on('frameUpdate', (data) => {
            const elapsed = game.getGameState().getElapsedTime();
            setElapsedTime(Math.round(elapsed / 1000 * 100) / 100);
          });
        }

        // 启动关卡
        levelManager.startLevel();
        console.log('Level started');
      } catch (err) {
        console.error('演示初始化失败:', err);
        setStatus('error');
        setMessage(`✗ 初始化失败: ${err.message}`);
      }
    };

    initGame();

    return () => {
      if (gameRunnerRef.current) {
        gameRunnerRef.current.destroy();
        gameRunnerRef.current = null;
      }
    };
  }, [isOpen, skillConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[900px] h-[700px] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              技能演示 - 关卡演示环境
            </h2>
            <div className="text-xs text-slate-400 mt-1">
              {levelManagerRef.current ? (
                <>
                  关卡: {levelManagerRef.current.getCurrentLevelConfig()?.name} (ID: {levelManagerRef.current.getCurrentLevelConfig()?.id})
                  | 地图: 1 | 技能: #{skillConfig?.id}
                </>
              ) : (
                '初始化中...'
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* 游戏画布和信息 */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* 左侧画布 */}
          <div className="flex-1 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-slate-700 rounded bg-black w-full h-full"
              style={{ maxWidth: '600px', maxHeight: '450px' }}
            />
          </div>

          {/* 右侧信息和控制 */}
          <div className="w-64 flex flex-col justify-between">
            {/* 演示信息 */}
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">关卡状态</div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        status === 'running' ? 'bg-green-500 animate-pulse' :
                        status === 'error' ? 'bg-red-500' :
                        'bg-slate-500'
                      }`}
                    />
                    <span className="text-sm font-semibold">
                      {status === 'running' ? '运行中' : status === 'error' ? '出错' : '就绪'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">运行时间</div>
                  <div className="text-lg font-mono">{elapsedTime.toFixed(2)}s</div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">关卡信息</div>
                  <div className="text-xs space-y-1 text-slate-300">
                    {levelManagerRef.current ? (
                      <>
                        <div>✓ 关卡: {levelManagerRef.current.getCurrentLevelConfig()?.name}</div>
                        <div>✓ 地图: {levelManagerRef.current.getCurrentMapConfig()?.name}</div>
                        <div>✓ 状态: {levelManagerRef.current.isRunning() ? '运行中' : '已停止'}</div>
                      </>
                    ) : (
                      <div>初始化中...</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">参战角色</div>
                  <div className="text-xs space-y-1 text-slate-300">
                    <div>✓ 攻击者: 玩家 (阵营 1)</div>
                    <div>✓ 目标: 敌人 (阵营 2)</div>
                  </div>
                </div>
              </div>

              {/* 消息输出 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 min-h-[100px]">
                <div className="text-xs text-slate-400 mb-2">演示输出</div>
                <div className="text-xs text-slate-200 whitespace-pre-wrap font-mono">
                  {message || '等待演示启动...'}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (gameRunnerRef.current) {
                    const isPaused = gameRunnerRef.current.getGame().getGameState().getGameState() === 'paused';
                    if (isPaused) {
                      gameRunnerRef.current.resume();
                      setMessage('游戏已恢复');
                    } else {
                      gameRunnerRef.current.pause();
                      setMessage('游戏已暂停');
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-semibold text-white"
              >
                ⏸ 暂停/恢复
              </button>
              <button
                onClick={onClose}
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold text-white"
              >
                关闭演示
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillDemoPreview;
