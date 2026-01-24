import React from 'react';

// MoveBy event parameter panel
// 处理位移事件参数：距离、角度
const MoveByFields = ({ evt, onUpdate }) => {
  return (
    <div className="space-y-2 text-xs text-slate-200">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <div className="text-slate-400">位移距离</div>
          <input
            type="number"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={Number(evt.data?.distance) || 0}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              onUpdate((d) => { d.distance = val; });
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="text-slate-400">距离 key</div>
          <input
            type="text"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={evt.data?.distanceKey || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate((d) => { d.distanceKey = val; });
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="text-slate-400">位移角度 (度)</div>
          <input
            type="number"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={Number(evt.data?.angle) || 0}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              onUpdate((d) => { d.angle = val; });
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="text-slate-400">角度 key</div>
          <input
            type="text"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={evt.data?.angleKey || ''}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate((d) => { d.angleKey = val; });
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="text-slate-400">持续时间(s)</div>
          <input
            type="number"
            step="0.1"
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={Number(evt.data?.duration) || 0}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              onUpdate((d) => { d.duration = val; });
            }}
          />
        </div>
      </div>

      <div className="text-slate-500 text-xs mt-2">
        💡 不指定 key 时使用固定值；指定 key 时从技能数据表中查找值（可覆盖固定值）
      </div>
    </div>
  );
};

export default MoveByFields;
