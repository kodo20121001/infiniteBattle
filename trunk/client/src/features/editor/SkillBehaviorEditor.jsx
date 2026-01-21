import React, { useEffect, useRef } from 'react';
import { BattleEntry } from '../../game/core/BattleEntry';
import { World } from '../../game/engine/common/World';

const SkillBehaviorEditor = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const battleEntryRef = useRef(null);
  const worldRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建 canvas 元素
    const canvas = document.createElement('canvas');
    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight;
    canvas.style.display = 'block';
    containerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    // 初始化 World
    worldRef.current = World.initialize(canvas, canvas.width, canvas.height);

    // 创建 BattleEntry 实例
    battleEntryRef.current = new BattleEntry();

    // 设置模拟的战斗启动数据
    battleEntryRef.current.BattleStartPushData = {
      battle_type: 'SkillEditor',
      isReplay: false,
    };

    // 初始化游戏
    battleEntryRef.current.init();
    
    // 启动游戏
    battleEntryRef.current.start();

    // 游戏循环
    const gameLoop = setInterval(() => {
      battleEntryRef.current.update();
      worldRef.current.update();
    }, 16); // 约60fps

    return () => {
      clearInterval(gameLoop);
      worldRef.current?.destroy();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen bg-black overflow-hidden">
      <div className="absolute top-4 left-4 text-white font-mono space-y-1 z-10">
        <h1 className="text-2xl font-bold">技能行为编辑器</h1>
        <p className="text-sm opacity-70">使用真实游戏引擎</p>
      </div>
    </div>
  );
};

export default SkillBehaviorEditor;
