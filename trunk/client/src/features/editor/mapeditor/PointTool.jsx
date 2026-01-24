import React from 'react';

const PointTool = ({ mapData, setMapData, selectedPointId, setSelectedPointId }) => {
  const selectedPoint = mapData?.points?.find((p) => p.id === selectedPointId);

  const handleCoordChange = (field, value) => {
    if (!mapData || selectedPointId == null) return;
    const numValue = Number(value) || 0;
    setMapData((p) => {
      const next = structuredClone(p);
      const point = next.points?.find((pt) => pt.id === selectedPointId);
      if (point) {
        point[field] = numValue;
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
        <div className="text-slate-400 text-xs mb-2">选中点: {selectedPointId ?? '无'}</div>
        {selectedPoint ? (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">X (水平, 米)</label>
              <input
                type="number"
                value={selectedPoint.x ?? 0}
                onChange={(e) => handleCoordChange('x', e.target.value)}
                step="0.01"
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Y (高度, 米)</label>
              <input
                type="number"
                value={selectedPoint.y ?? 0}
                onChange={(e) => handleCoordChange('y', e.target.value)}
                step="0.01"
                min="0"
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Z (深度, 米)</label>
              <input
                type="number"
                value={selectedPoint.z ?? 0}
                onChange={(e) => handleCoordChange('z', e.target.value)}
                step="0.01"
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-xs">点击画布创建新点，或选择已有的点编辑</div>
        )}
      </div>
      <button
        onClick={() => {
          if (!mapData || selectedPointId == null) return;
          setMapData((p) => ({ ...p, points: (p.points ?? []).filter((pt) => pt.id !== selectedPointId) }));
          setSelectedPointId(null);
        }}
        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded border border-red-500 text-sm font-semibold"
      >
        删除点
      </button>
    </div>
  );
};

export default PointTool;
