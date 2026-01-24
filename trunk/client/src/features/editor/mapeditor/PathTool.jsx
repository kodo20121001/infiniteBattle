import React from 'react';

const PathTool = ({ mapData, setMapData, currentPathId, setCurrentPathId }) => {
  const currentPath = mapData?.paths?.find((p) => p.id === currentPathId);

  const handlePathPointChange = (pointIdx, field, value) => {
    if (!currentPath || pointIdx < 0) return;
    const numValue = Number(value) || 0;
    setMapData((p) => {
      const next = structuredClone(p);
      const path = next.paths?.find((pp) => pp.id === currentPathId);
      if (path && path.points[pointIdx]) {
        path.points[pointIdx][field] = numValue;
      }
      return next;
    });
  };

  const handleDeletePoint = (pointIdx) => {
    if (!currentPath || pointIdx < 0) return;
    setMapData((p) => {
      const next = structuredClone(p);
      const path = next.paths?.find((pp) => pp.id === currentPathId);
      if (path) {
        path.points.splice(pointIdx, 1);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
        <div className="text-slate-400 text-xs mb-2">当前路径</div>
        <select
          value={currentPathId ?? ''}
          onChange={(e) => setCurrentPathId(e.target.value ? Number(e.target.value) : null)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
        >
          {(mapData.paths ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
          ))}
          <option value="">新建路径</option>
        </select>
        <div className="text-xs text-slate-500 mt-2">点击画布追加点，若未选则自动新建路径；右键移除点</div>
      </div>

      {currentPath && (
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700 space-y-2">
          <div className="text-slate-400 text-xs font-semibold">路径点 ({currentPath.points?.length ?? 0})</div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {currentPath.points?.map((point, idx) => (
              <div key={idx} className="bg-slate-900/50 rounded p-2 border border-slate-600 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">点 #{idx}</span>
                  <button
                    onClick={() => handleDeletePoint(idx)}
                    className="px-2 py-0.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded text-xs"
                  >
                    删除
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div>
                    <label className="text-slate-500 block mb-0.5">X(水平)</label>
                    <input
                      type="number"
                      value={point.x ?? 0}
                      onChange={(e) => handlePathPointChange(idx, 'x', e.target.value)}
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5">Y(高度)</label>
                    <input
                      type="number"
                      value={point.y ?? 0}
                      onChange={(e) => handlePathPointChange(idx, 'y', e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5">Z(深度)</label>
                    <input
                      type="number"
                      value={point.z ?? 0}
                      onChange={(e) => handlePathPointChange(idx, 'z', e.target.value)}
                      step="0.01"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setCurrentPathId(null)}
          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm border border-slate-600 font-semibold"
        >
          结束当前路径
        </button>
        <button
          onClick={() => {
            if (currentPathId == null) return;
            setMapData((p) => ({ ...p, paths: (p.paths ?? []).filter((pp) => pp.id !== currentPathId) }));
            setCurrentPathId(null);
          }}
          className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-sm border border-red-500 font-semibold"
        >
          删除当前路径
        </button>
      </div>
    </div>
  );
};

export default PathTool;
