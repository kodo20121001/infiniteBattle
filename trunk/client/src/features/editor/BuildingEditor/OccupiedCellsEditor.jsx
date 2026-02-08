import React, { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CELL_SIZE = 50;

const normalizeCells = (cells) => {
  if (!Array.isArray(cells)) return [];
  return cells.map((c) => [Number(c[0]) || 0, Number(c[1]) || 0]);
};

const OccupiedCellsEditor = ({ isOpen, occupiedCells, onApply, onClose }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [cells, setCells] = useState([]);
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);

  useEffect(() => {
    if (!isOpen) return;
    setCells(normalizeCells(occupiedCells));
  }, [isOpen, occupiedCells]);

  const bounds = useMemo(() => {
    if (cells.length === 0) {
      return { minX: -2, maxX: 2, minY: -2, maxY: 2 };
    }
    let minX = cells[0][0];
    let maxX = cells[0][0];
    let minY = cells[0][1];
    let maxY = cells[0][1];
    cells.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    const padding = 2;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding
    };
  }, [cells]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    const width = container?.clientWidth || 700;
    const height = container?.clientHeight || 500;
    canvas.width = width;
    canvas.height = height;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const gridLeft = centerX - cellSize / 2;
    const gridTop = centerY - cellSize / 2;

    for (let x = gridLeft; x <= canvas.width; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let x = gridLeft - cellSize; x >= 0; x -= cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = gridTop; y <= canvas.height; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let y = gridTop - cellSize; y >= 0; y -= cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Center axis
    ctx.strokeStyle = 'rgba(59,130,246,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // Draw occupied cells
    ctx.fillStyle = 'rgba(34,197,94,0.35)';
    cells.forEach(([gx, gy]) => {
      const px = centerX + (gx - 0.5) * cellSize;
      const py = centerY + (gy - 0.5) * cellSize;
      ctx.fillRect(px, py, cellSize, cellSize);
    });

    // Center marker
    ctx.fillStyle = 'rgba(248,113,113,0.9)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.fillText('中心(0,0)', centerX + 8, centerY - 8);
  }, [isOpen, cells, cellSize, bounds]);

  const canvasToCell = (evt) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const gx = Math.floor((x - centerX) / cellSize + 0.5);
    const gy = Math.floor((y - centerY) / cellSize + 0.5);
    return { gx, gy };
  };

  const toggleCell = (gx, gy) => {
    setCells((prev) => {
      const next = prev.map((c) => [c[0], c[1]]);
      const idx = next.findIndex(([x, y]) => x === gx && y === gy);
      if (idx >= 0) next.splice(idx, 1);
      else next.push([gx, gy]);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[900px] h-[700px] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">占用格子编辑器</h2>
            <div className="text-xs text-slate-400 mt-1">点击格子切换占用状态</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCells([])}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
            >
              一键清除
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          <div ref={containerRef} className="flex-1 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="border border-slate-700 rounded bg-black w-full h-full"
              onMouseDown={(e) => {
                const { gx, gy } = canvasToCell(e);
                toggleCell(gx, gy);
              }}
            />
          </div>

          <div className="w-64 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1">已占用</div>
                  <div className="text-sm text-slate-200">{cells.length} 格</div>
                </div>
                <div className="text-xs text-slate-400">
                  坐标基于中心点(0,0)
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-2">
                <div className="text-xs text-slate-400">快速生成</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setCells([
                      [-1, -1], [0, -1],
                      [-1, 0], [0, 0]
                    ])}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                  >
                    2x2
                  </button>
                  <button
                    onClick={() => setCells([
                      [-1, -1], [0, -1], [1, -1],
                      [-1, 0], [0, 0], [1, 0],
                      [-1, 1], [0, 1], [1, 1]
                    ])}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                  >
                    3x3
                  </button>
                  <button
                    onClick={() => setCells([
                      [-2, -2], [-1, -2], [0, -2], [1, -2],
                      [-2, -1], [-1, -1], [0, -1], [1, -1],
                      [-2, 0], [-1, 0], [0, 0], [1, 0],
                      [-2, 1], [-1, 1], [0, 1], [1, 1]
                    ])}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                  >
                    4x4
                  </button>
                </div>
                <button
                  onClick={() => setCells([])}
                  className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => onApply(cells)}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold text-white"
              >
                应用
              </button>
              <button
                onClick={onClose}
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold text-white"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OccupiedCellsEditor;
