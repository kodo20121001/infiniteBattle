import React, { useEffect, useRef } from 'react';

/**
 * 建筑预览组件
 * 显示建筑在网格上的占位和基本信息
 */
const BuildingPreview = ({ building, abilityDefs }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !building) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const occupiedCells = building.baseData?.occupiedCells || [];
    
    // 如果没有占用格子，显示默认的2x2
    if (occupiedCells.length === 0) {
      occupiedCells.push([-1, -1], [0, -1], [-1, 0], [0, 0]);
    }

    // 计算格子范围
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    occupiedCells.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    const gridWidth = maxX - minX + 1;
    const gridHeight = maxY - minY + 1;
    const cellSize = 40; // 每个格子的像素大小
    const padding = 20;

    // 设置画布大小
    canvas.width = gridWidth * cellSize + padding * 2;
    canvas.height = gridHeight * cellSize + padding * 2;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let x = 0; x <= gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(padding + x * cellSize, padding);
      ctx.lineTo(padding + x * cellSize, padding + gridHeight * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(padding, padding + y * cellSize);
      ctx.lineTo(padding + gridWidth * cellSize, padding + y * cellSize);
      ctx.stroke();
    }

    // 绘制占用的格子
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // 蓝色半透明
    occupiedCells.forEach(([x, y]) => {
      const screenX = padding + (x - minX) * cellSize;
      const screenY = padding + (y - minY) * cellSize;
      ctx.fillRect(screenX, screenY, cellSize, cellSize);
    });

    // 绘制边框
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    occupiedCells.forEach(([x, y]) => {
      const screenX = padding + (x - minX) * cellSize;
      const screenY = padding + (y - minY) * cellSize;
      ctx.strokeRect(screenX, screenY, cellSize, cellSize);
    });

    // 绘制中心点 (0, 0)
    const centerX = padding + (0 - minX) * cellSize + cellSize / 2;
    const centerY = padding + (0 - minY) * cellSize + cellSize / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [building]);

  if (!building) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        未选择建筑
      </div>
    );
  }

  const baseData = building.baseData || {};
  const abilities = building.abilities || [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-gray-800">
      {/* 建筑名称和描述 */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h2 className="text-xl font-bold text-white mb-2">{building.name}</h2>
        {building.description && (
          <p className="text-sm text-gray-400">{building.description}</p>
        )}
      </div>

      {/* 网格预览 */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">网格占位预览</h3>
        <div className="flex justify-center">
          <canvas ref={canvasRef} className="border border-gray-700 rounded" />
        </div>
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <div>🔵 蓝色区域：建筑占位 ({baseData.occupiedCells?.length || 0} 个格子)</div>
          <div>🔴 红点：中心点 (0, 0)</div>
        </div>
      </div>

      {/* 基础属性 */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">基础属性</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">生命值:</span>
            <span className="ml-2 text-white font-mono">{baseData.hp || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">护甲:</span>
            <span className="ml-2 text-white font-mono">{baseData.armor || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">护甲类型:</span>
            <span className="ml-2 text-white">{baseData.armorType || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">建造时间:</span>
            <span className="ml-2 text-white font-mono">{baseData.buildTime || 0}s</span>
          </div>
        </div>
      </div>

      {/* 建造成本 */}
      {baseData.cost && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-bold text-white mb-3">建造成本</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">💰</span>
              <span className="text-white font-mono">{baseData.cost.gold || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-amber-700">🪵</span>
              <span className="text-white font-mono">{baseData.cost.wood || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* 能力列表 */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">
          已挂载能力 ({abilities.length})
        </h3>
        {abilities.length === 0 ? (
          <p className="text-xs text-gray-500">暂无能力</p>
        ) : (
          <div className="space-y-2">
            {abilities.map((ability, index) => {
              const abilityDef = abilityDefs?.[ability.type];
              return (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 bg-gray-800 rounded border border-gray-700"
                >
                  <span className="text-xl">{abilityDef?.icon || '⚙️'}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {abilityDef?.name || ability.type}
                    </div>
                    <div className="text-xs text-gray-500">
                      {abilityDef?.description || ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* JSON 预览 */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">JSON 数据预览</h3>
        <pre className="text-xs text-gray-400 overflow-x-auto bg-black/30 p-3 rounded">
          {JSON.stringify(building, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default BuildingPreview;
