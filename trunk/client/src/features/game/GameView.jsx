import React, { useEffect, useRef, useState } from 'react';
import { World } from '../../game/engine/common/World';
import { ClientGameRunner } from '../../game/core/impl';
import { ConfigManager } from '../../common/ConfigManager';
import { Configs } from '../../game/common/Configs';
import GameUI from '../auth/GameUI.jsx';

const DEFAULT_LEVEL_ID = 1;

const GameView = ({ theme, levelId = DEFAULT_LEVEL_ID }) => {
  const canvasRef = useRef(null);
  const runnerRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('初始化游戏中...');
  const [placingBuilding, setPlacingBuilding] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [buildings, setBuildings] = useState([]);

  const cleanupRunner = () => {
    if (resizeHandlerRef.current) {
      window.removeEventListener('resize', resizeHandlerRef.current);
      resizeHandlerRef.current = null;
    }
    if (runnerRef.current) {
      runnerRef.current.destroy();
      runnerRef.current = null;
    }
  };

  useEffect(() => {
    const initGame = async () => {
      try {
        setStatus('loading');
        setMessage('加载配置中...');

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect?.width || window.innerWidth));
        const height = Math.max(1, Math.floor(rect?.height || window.innerHeight));
        canvas.width = width;
        canvas.height = height;

        // 初始化配置管理器
        const configManager = new ConfigManager();
        Configs.init(configManager);

        // 创建 World 和 GameRunner
        const world = new World(canvas, width, height, 60);
        world.resize(width, height);
        const runner = new ClientGameRunner(world);
        runner.init();

        setMessage('加载关卡中...');
        
        // 加载关卡
        const levelConfigs = Configs.Get('level') || {};
        const levelConfig = levelConfigs[levelId];
        if (!levelConfig) {
          throw new Error(`关卡 ${levelId} 配置不存在`);
        }

        await runner.loadLevel(levelId, levelConfig.mapId);
        runnerRef.current = runner;

        // 加载建筑配置
        const buildingConfigs = Configs.Get('building') || {};
        const buildingArray = Array.isArray(buildingConfigs)
          ? buildingConfigs
          : Object.values(buildingConfigs);
        const buildingList = buildingArray.map(cfg => ({
          id: cfg.id,
          name: cfg.name,
          icon: cfg.icon,
          modelId: cfg.modelId,
          abilities: cfg.abilities,
          count: cfg.id === 'town_hall_001' ? 1 : cfg.id === 'cannon_tower_001' ? 5 : 3,
        }));
        setBuildings(buildingList);

        // 处理窗口大小改变
        const handleResize = () => {
          const nextRect = canvas?.getBoundingClientRect();
          const nextWidth = Math.max(1, Math.floor(nextRect?.width || 0));
          const nextHeight = Math.max(1, Math.floor(nextRect?.height || 0));
          if (canvas) {
            canvas.width = nextWidth;
            canvas.height = nextHeight;
          }
          runnerRef.current?.getWorld?.()?.resize(nextWidth, nextHeight);
        };
        window.addEventListener('resize', handleResize);
        resizeHandlerRef.current = handleResize;

        setStatus('running');
        setMessage('游戏运行中');
      } catch (err) {
        console.error('初始化游戏失败:', err);
        setStatus('error');
        setMessage(`✗ 初始化失败: ${err.message}`);
        cleanupRunner();
      }
    };

    initGame();
    return cleanupRunner;
  }, [levelId]);

  const handlePlaceBuilding = (building, event) => {
    console.log('[GameView] 选择建筑:', building);
    setPlacingBuilding(building);
    // 立即获取当前鼠标位置
    if (event && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      console.log('[GameView] 立即设置鼠标位置:', { x: mouseX, y: mouseY });
      setMousePos({ x: mouseX, y: mouseY });
    }
  };

  const handleToggleBuildingPanel = (expanded) => {
    runnerRef.current?.setDebugShowBuildCells?.(expanded);
    if (!expanded) {
      setPlacingBuilding(null);
    }
  };

  const handleWindowMouseMove = (e) => {
    if (!placingBuilding) return;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
    if (!clientX || !clientY) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newPos = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
    setMousePos(newPos);
  };

  const handleCanvasMouseUp = (e) => {
    if (!placingBuilding || !runnerRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY);
    if (!clientX || !clientY) return;
    
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    
    const result = runnerRef.current.tryPlaceBuilding(placingBuilding, screenX, screenY);
    if (result.success) {
      console.log('[GameView] 建筑放置成功:', result);
      setPlacingBuilding(null);
    } else {
      console.log('[GameView] 建筑放置失败:', result.reason);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full"
        style={{ cursor: placingBuilding ? 'crosshair' : 'default' }}
        onMouseUp={handleCanvasMouseUp}
        onTouchEnd={handleCanvasMouseUp}
      />
      <div className="absolute top-4 left-4 bg-black/60 px-4 py-2 rounded text-white font-mono">
        <h1 className="text-lg font-bold">Game View</h1>
        <p className="text-xs opacity-70">Status: {status}</p>
        {status === 'error' && <p className="text-xs text-red-400 mt-1">{message}</p>}
        {placingBuilding && (
          <p className="text-xs text-cyan-400 mt-1">放置: {placingBuilding.name}</p>
        )}
      </div>
      {theme && status === 'running' && (
        <GameUI
          theme={theme}
          buildings={buildings}
          onPlace={handlePlaceBuilding}
          onToggle={handleToggleBuildingPanel}
        />
      )}
    </div>
  );
};

export default GameView;
