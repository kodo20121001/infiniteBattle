/**
 * 子弹演示预览
 * 演示子弹配置效果
 */

import React, { useEffect, useRef, useState } from 'react';
import { ClientGameRunner } from '@/game/core/impl';
import { World } from '@/game/engine/common/World';
import { Configs } from '@/game/common/Configs';
import { DemoConfigManager } from '@/common/DemoConfigManager';
import type { BulletConfig } from '@/game/core/config/BulletConfig';

interface Props {
  bulletConfig: BulletConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BulletDemoPreview: React.FC<Props> = ({ bulletConfig, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRunnerRef = useRef<any>(null);
  const levelManagerRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
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
        const configManager = new DemoConfigManager();
        Configs.init(configManager);
        console.log('[BulletDemo] Configs initialized with DemoConfigManager');

        // 创建世界
        const world = new World(canvasRef.current, 800, 600, 60);
        const gameRunner = new ClientGameRunner(world);
        gameRunner.init();

        console.log('[BulletDemo] Loading demo level: 9901');
        
        // 加载子弹演示关卡（levelId: 9901, mapId: 2）
        await gameRunner.loadLevel(9901, 2);
        
        // 获取关卡配置用于显示
        const levelConfigs = Configs.Get('level') || {};
        const mapConfigs = Configs.Get('map') || {};
        const levelConfig = levelConfigs[9901];
        const mapConfig = mapConfigs[1];
        
        gameRunnerRef.current = gameRunner;
        levelManagerRef.current = { 
          getCurrentLevelConfig: () => levelConfig,
          getCurrentMapConfig: () => mapConfig,
          isRunning: () => true 
        };
        setStatus('running');
        setMessage('🎮 子弹演示关卡已启动\n演示包含：\n- 直线子弹 (速度 10)\n- 抛物线子弹 (arc=5)\n- 导弹追踪 (homing)\n- 加速子弹 (acceleration=2)');
        console.log('[BulletDemo] Level started');

        // 更新计时器
        const timer = setInterval(() => {
          setElapsedTime(prev => prev + 0.1);
        }, 100);

        return () => clearInterval(timer);
      } catch (err: any) {
        console.error('[BulletDemo] 演示初始化失败:', err);
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
  }, [isOpen, bulletConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[900px] h-[700px] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              子弹演示 - {bulletConfig?.name || '未命名'}
            </h2>
            <div className="text-xs text-slate-400 mt-1">
              {levelManagerRef.current ? (
                <>
                  关卡: {levelManagerRef.current.getCurrentLevelConfig()?.name} (ID: {levelManagerRef.current.getCurrentLevelConfig()?.id})
                  | 子弹: #{bulletConfig?.id}
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
                  <div className="text-xs text-slate-400 mb-1">子弹配置</div>
                  <div className="text-xs space-y-1 text-slate-300">
                    {bulletConfig ? (
                      <>
                        <div>✓ ID: {bulletConfig.id}</div>
                        <div>✓ 模型: {bulletConfig.modelId}</div>
                        <div>✓ 分段: {bulletConfig.segments?.length || 0}</div>
                      </>
                    ) : (
                      <div>无配置</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">演示角色</div>
                  <div className="text-xs space-y-1 text-slate-300">
                    <div>✓ 发射者: 英雄 (阵营 1)</div>
                    <div>✓ 目标: 敌人 (阵营 2)</div>
                  </div>
                </div>
              </div>

              {/* 消息输出 */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
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
                    if (status === 'running') {
                      gameRunnerRef.current.pause();
                      setStatus('idle');
                      setMessage(prev => prev + '\n⏸ 游戏已暂停');
                    } else {
                      gameRunnerRef.current.resume();
                      setStatus('running');
                      setMessage(prev => prev + '\n▶ 游戏已恢复');
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

export default BulletDemoPreview;
