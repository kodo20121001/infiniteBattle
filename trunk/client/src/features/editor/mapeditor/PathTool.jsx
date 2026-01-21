import React from 'react';

const PathTool = ({ mapData, setMapData, currentPathId, setCurrentPathId }) => {
  return (
    <div className="space-y-1">
      <div className="text-slate-400 text-xs">当前路径</div>
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
      <div className="text-xs text-slate-400">路径模式下点击画布追加点，若未选则自动新建路径</div>
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentPathId(null)}
          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs border border-slate-600"
        >
          结束当前路径
        </button>
        <button
          onClick={() => {
            if (currentPathId == null) return;
            setMapData((p) => ({ ...p, paths: (p.paths ?? []).filter((pp) => pp.id !== currentPathId) }));
            setCurrentPathId(null);
          }}
          className="flex-1 py-1 bg-red-600 hover:bg-red-700 rounded text-xs border border-red-500"
        >
          删除当前路径
        </button>
      </div>
    </div>
  );
};

export default PathTool;
