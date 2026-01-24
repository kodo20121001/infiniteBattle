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
        <div className="text-slate-400 text-xs">视口尺寸（像素）</div>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            value={mapData.viewportWidth ?? 960}
            onChange={(e) => setMapData((p) => ({ ...p, viewportWidth: Number(e.target.value) || 0 }))}
            min="0"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            placeholder="960"
          />
          <input
            type="number"
            value={mapData.viewportHeight ?? 720}
            onChange={(e) => setMapData((p) => ({ ...p, viewportHeight: Number(e.target.value) || 0 }))}
            min="0"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            placeholder="720"
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
        <div className="text-slate-400 text-xs">相机初始位置（世界坐标）</div>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <input
            type="number"
            value={mapData.cameraX ?? 0}
            onChange={(e) => setMapData((p) => ({ ...p, cameraX: Number(e.target.value) || 0 }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            placeholder="cameraX"
          />
          <input
            type="number"
            value={mapData.cameraY ?? 0}
            onChange={(e) => setMapData((p) => ({ ...p, cameraY: Number(e.target.value) || 0 }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            placeholder="cameraY"
          />
          <input
            type="number"
            value={mapData.cameraZ ?? 0}
            onChange={(e) => setMapData((p) => ({ ...p, cameraZ: Number(e.target.value) || 0 }))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
            placeholder="cameraZ"
          />
        </div>
        <div className="text-xs text-slate-500 mt-1">提示：当前渲染实现以屏幕像素为世界单位；如需让世界(0,0)位于左上角，可将相机设为(视口宽/2, 视口高/2)。</div>
      </div>
      <div>
        <div className="text-slate-400 text-xs">像素密度（米→像素）</div>
        <div className="flex gap-2 mt-1">
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">横轴 X</div>
            <input
              type="number"
              value={mapData.pixelsPerMeterX ?? 32}
              onChange={(e) => setMapData((p) => ({ ...p, pixelsPerMeterX: Number(e.target.value) || 32 }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              placeholder="32"
            />
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">纵轴 Y</div>
            <input
              type="number"
              value={mapData.pixelsPerMeterY ?? 16}
              onChange={(e) => setMapData((p) => ({ ...p, pixelsPerMeterY: Number(e.target.value) || 16 }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              placeholder="16"
            />
          </div>
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
