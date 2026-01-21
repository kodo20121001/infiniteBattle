import React from 'react';

const TriggerTool = ({ mapData, setMapData }) => {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-slate-400 text-xs mb-2">触发区域列表</div>
        <select
          value={mapData.triggerAreas?.length > 0 ? mapData.triggerAreas[0]?.id ?? '' : ''}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
        >
          {(mapData.triggerAreas ?? []).map((ta) => (
            <option key={ta.id} value={ta.id}>{ta.id} - {ta.name} ({ta.type})</option>
          ))}
          <option value="">新建触发区</option>
        </select>
      </div>
      <div className="space-y-2 text-xs text-slate-400">
        <div className="bg-slate-800/60 rounded p-2 border border-slate-700">
          <div className="font-semibold text-slate-200 mb-2">创建新触发区</div>
          <div className="space-y-2">
            <select
              defaultValue="circle"
              onChange={(e) => {
                const type = e.target.value;
                const newId = Math.max(0, ...(mapData.triggerAreas ?? []).map(t => t.id)) + 1;
                let newArea;
                if (type === 'circle') {
                  newArea = { type: 'circle', id: newId, name: `触发区-${newId}`, center: { x: 0, y: 0 }, radius: 100 };
                } else if (type === 'rectangle') {
                  newArea = { type: 'rectangle', id: newId, name: `触发区-${newId}`, x: 0, y: 0, width: 100, height: 100 };
                } else {
                  newArea = { type: 'grid', id: newId, name: `触发区-${newId}`, gridIndices: [] };
                }
                setMapData((p) => ({ ...p, triggerAreas: [...(p.triggerAreas ?? []), newArea] }));
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1"
            >
              <option value="circle">圆形</option>
              <option value="rectangle">矩形</option>
              <option value="grid">格子</option>
            </select>
          </div>
        </div>
      </div>
      <div className="text-xs text-slate-400 mt-4">共 {mapData.triggerAreas?.length ?? 0} 个触发区域</div>
    </div>
  );
};

export default TriggerTool;
