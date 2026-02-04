import React from 'react';

const InfoTool = ({ mapData, setMapData, gridColCount, gridRowCount }) => {
  return (
    <div className="space-y-3 text-sm bg-slate-800/60 rounded-lg p-3 border border-slate-700">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-slate-400 text-xs">地图名称</div>
          <input
            value={mapData.name}
            onChange={(e) => setMapData((p) => ({ ...p, name: e.target.value }))}
            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <div className="text-slate-400 text-xs">地图 ID</div>
          <input
            value={mapData.id}
            onChange={(e) => setMapData((p) => ({ ...p, id: Number(e.target.value) || 0 }))}
            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div>
        <div className="text-slate-400 text-xs">地图尺寸（米）</div>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            value={mapData.mapWidth}
            onChange={(e) => setMapData((p) => ({ ...p, mapWidth: Number(e.target.value) || 0 }))}
            step="0.01"
            min="0"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          />
          <input
            type="number"
            value={mapData.mapHeight}
            onChange={(e) => setMapData((p) => ({ ...p, mapHeight: Number(e.target.value) || 0 }))}
            step="0.01"
            min="0"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div>
        <div className="text-slate-400 text-xs">格子尺寸（米）</div>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            value={mapData.gridWidth}
            onChange={(e) => setMapData((p) => ({ ...p, gridWidth: Number(e.target.value) || 0 }))}
            step="0.01"
            min="0"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          />
          <input
            type="number"
            value={mapData.gridHeight}
            onChange={(e) => setMapData((p) => ({ ...p, gridHeight: Number(e.target.value) || 0 }))}
            step="0.01"
            min="0"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div>
        <div className="text-slate-400 text-xs">网格</div>
        <div className="font-semibold">{gridColCount} x {gridRowCount}</div>
        <div className="text-xs text-slate-500">自动计算，不可编辑</div>
      </div>
      <div>
        <div className="text-slate-400 text-xs">触发区域</div>
        <div className="font-semibold">{mapData.triggerAreas?.length ?? 0}</div>
      </div>
    </div>
  );
};

export default InfoTool;
