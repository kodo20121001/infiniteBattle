import React from 'react';

const PointTool = ({ mapData, setMapData, selectedPointId, setSelectedPointId }) => {
  return (
    <div className="flex gap-2 text-xs text-slate-200">
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1">选中点: {selectedPointId ?? '无'}</div>
      <button
        onClick={() => {
          if (!mapData || selectedPointId == null) return;
          setMapData((p) => ({ ...p, points: (p.points ?? []).filter((pt) => pt.id !== selectedPointId) }));
          setSelectedPointId(null);
        }}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded border border-red-500"
      >
        删除点
      </button>
    </div>
  );
};

export default PointTool;
