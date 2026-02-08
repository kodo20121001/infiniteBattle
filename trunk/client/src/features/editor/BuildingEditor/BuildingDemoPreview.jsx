import React, { useEffect, useRef, useState } from 'react';
import { ClientGameRunner } from '@/game/core/impl';
import { World } from '@/game/engine/common/World';
import { Configs } from '@/game/common/Configs';
import { ConfigManager } from '@/common/ConfigManager';

const DEFAULT_LEVEL_ID = 9902;
const DEFAULT_MAP_ID = 2;

const BuildingDemoPreview = ({ buildingConfig, isOpen, onClose }) => {
  const canvasRef = useRef(null);
  const gameRunnerRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | running | error
  const [message, setMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      if (gameRunnerRef.current) {
        gameRunnerRef.current.destroy();
        gameRunnerRef.current = null;
      }
      setStatus('idle');
      setMessage('');
      setElapsedTime(0);
      return;
    }

    const initGame = async () => {
      try {
        if (!canvasRef.current) throw new Error('Canvas not found');

        // Ensure canvas is visible even before the world renders
        canvasRef.current.style.backgroundColor = '#000';
        canvasRef.current.style.display = 'block';

        const configManager = new ConfigManager();
        Configs.init(configManager);

        configManager.setTempConfig('level', DEFAULT_LEVEL_ID, {
          id: DEFAULT_LEVEL_ID,
          name: '建筑演示关卡',
          mapId: DEFAULT_MAP_ID,
          description: '建筑占用格子与预览演示',
          camps: [
            { id: 1, name: '玩家', playerControlled: true }
          ],
          alliances: [],
          initialResources: {},
          startUnits: buildingConfig ? [
            {
              actorType: 'building',
              campId: 1,
              positionName: 1,
              buildingId: buildingConfig.id
            },
            {
              actorType: 'unit',
              campId: 2,
              positionName: 1,
              unitId: 101,
              offset: { x: 5, z: 0 }
            }
          ] : [],
          winCondition: '',
          loseCondition: '',
          triggers: []
        });

        if (buildingConfig) {
          configManager.setTempConfigs('building', {
            [buildingConfig.id]: {
              ...buildingConfig
            }
          });
        }

        const world = new World(canvasRef.current, 800, 600, 60);
        const gameRunner = new ClientGameRunner(world);
        gameRunner.init();

        await gameRunner.loadLevel(DEFAULT_LEVEL_ID, DEFAULT_MAP_ID);

        gameRunnerRef.current = gameRunner;
        setStatus('running');
        setMessage('🎮 建筑演示已启动\n- 建筑已通过关卡配置自动生成 Actor');

        const timer = setInterval(() => {
          setElapsedTime((prev) => prev + 0.1);
        }, 100);

        return () => clearInterval(timer);
      } catch (err) {
        console.error('[BuildingDemo] 初始化失败:', err);
        setStatus('error');
        setMessage(`✗ 初始化失败: ${err.message || '未知错误'}`);
      }
    };

    initGame();

    return () => {
      if (gameRunnerRef.current) {
        gameRunnerRef.current.destroy();
        gameRunnerRef.current = null;
      }
    };
  }, [isOpen, buildingConfig]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[900px] h-[700px] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              建筑预览 - {buildingConfig?.name || '未命名'}
            </h2>
            <div className="text-xs text-slate-400 mt-1">
              {buildingConfig ? (
                <>
                  建筑ID: {buildingConfig.id} | 模型: {buildingConfig.modelId || '未设置'}
                </>
              ) : (
                '未选择建筑'
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

        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-slate-700 rounded bg-black w-full h-full"
              style={{ maxWidth: '600px', maxHeight: '450px' }}
            />
          </div>

          <div className="w-64 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">预览状态</div>
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
                  <div className="text-xs text-slate-400 mb-1">建筑信息</div>
                  <div className="text-xs space-y-1 text-slate-300">
                    {buildingConfig ? (
                      <>
                        <div>✓ ID: {buildingConfig.id}</div>
                        <div>✓ 模型: {buildingConfig.modelId || '未设置'}</div>
                        <div>✓ 占格: {buildingConfig.baseData?.occupiedCells?.length || 0} 格</div>
                      </>
                    ) : (
                      <div>未选择建筑</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                <div className="text-xs text-slate-400 mb-2">演示输出</div>
                <div className="text-xs text-slate-200 whitespace-pre-wrap font-mono">
                  {message || '等待演示启动...'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
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

export default BuildingDemoPreview;
