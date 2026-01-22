import React from 'react';

const BuildTool = ({ mapData, setMapData, buildCols, buildRows }) => {
  const onNum = (val) => {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
    return 0;
  };

  const updateField = (key, value) => {
    setMapData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-3 text-sm bg-slate-800/60 rounded-lg p-3 border border-slate-700">
      <div className="font-semibold text-slate-200">建筑区域</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid grid-cols-[64px_1fr] items-center gap-2">
          <div className="flex flex-col leading-tight text-slate-300">
            <span>格子</span>
            <span>宽</span>
          </div>
          <input
            type="number"
            className="min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            value={mapData.buildGridWidth ?? mapData.gridWidth}
            onChange={(e) => updateField('buildGridWidth', onNum(e.target.value))}
          />
        </label>
        <label className="grid grid-cols-[64px_1fr] items-center gap-2">
          <div className="flex flex-col leading-tight text-slate-300">
            <span>格子</span>
            <span>高</span>
          </div>
          <input
            type="number"
            className="min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            value={mapData.buildGridHeight ?? mapData.gridHeight}
            onChange={(e) => updateField('buildGridHeight', onNum(e.target.value))}
          />
        </label>
        <label className="grid grid-cols-[64px_1fr] items-center gap-2">
          <div className="flex flex-col leading-tight text-slate-300">
            <span>起始</span>
            <span>X</span>
          </div>
          <input
            type="number"
            className="min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            value={mapData.buildOffsetX ?? 0}
            onChange={(e) => updateField('buildOffsetX', onNum(e.target.value))}
          />
        </label>
        <label className="grid grid-cols-[64px_1fr] items-center gap-2">
          <div className="flex flex-col leading-tight text-slate-300">
            <span>起始</span>
            <span>Y</span>
          </div>
          <input
            type="number"
            className="min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            value={mapData.buildOffsetY ?? 0}
            onChange={(e) => updateField('buildOffsetY', onNum(e.target.value))}
          />
        </label>
      </div>
      <div className="text-xs text-slate-400">建筑网格：{buildCols} x {buildRows}</div>
      <div className="text-xs text-slate-500">左键在画布上切换可建筑格子</div>
    </div>
  );
};

export default BuildTool;