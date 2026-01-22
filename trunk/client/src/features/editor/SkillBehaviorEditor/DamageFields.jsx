import React from 'react';

// Damage event parameter panel
const DamageFields = ({ evt, onUpdate }) => {
  const damageType = evt.data?.damageType || 'fixed';
  const triggerType = evt.data?.triggerType || 'target';
  // 保留数据字段但不再使用类型选择，直接显示默认值与key两个输入
  const rangeType = evt.data?.rangeType || 'circle';

  return (
    <div className="space-y-2 text-xs text-slate-200">
      <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <div className="text-slate-400">伤害类型</div>
            <select
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={damageType}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate((d) => {
                  d.damageType = val;
                  if (typeof d.damageValue !== 'number') d.damageValue = 0;
                  if (typeof d.damageRatio !== 'number') d.damageRatio = 1;
                  if (typeof d.damageKey !== 'string') d.damageKey = '';
                });
              }}
            >
              <option value="fixed">固定</option>
              <option value="ratio">比例</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-slate-400">{damageType === 'fixed' ? '伤害值(默认)' : '伤害比例(默认)'}</div>
            <input
              type="number"
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={damageType === 'fixed' ? (Number(evt.data?.damageValue) || 0) : (Number(evt.data?.damageRatio) || 0)}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                onUpdate((d) => {
                  if (damageType === 'fixed') {
                    d.damageValue = val;
                  } else {
                    d.damageRatio = val;
                  }
                });
              }}
            />
          </div>

          <div className="space-y-1">
            <div className="text-slate-400">key</div>
            <input
              type="text"
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={evt.data?.damageKey || ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate((d) => { d.damageKey = val; });
              }}
            />
          </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <div className="text-slate-400">触发类型</div>
          <select
            className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={triggerType}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate((d) => {
                d.triggerType = val;
                if (val === 'target') {
                  d.rangeType = undefined;
                  d.radius = undefined;
                  d.length = undefined;
                  d.width = undefined;
                } else {
                  d.maxDistanceType = undefined;
                  d.maxDistanceValue = undefined;
                  d.maxDistanceKey = undefined;
                }
              });
            }}
          >
            <option value="target">目标</option>
            <option value="range">范围</option>
          </select>
        </div>

        {triggerType === 'target' && (
          <>
            <div className="space-y-1">
              <div className="text-slate-400">最大的距离(默认)</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={Number(evt.data?.maxDistanceValue) || 0}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  onUpdate((d) => { d.maxDistanceValue = val; });
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">key</div>
              <input
                type="text"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={evt.data?.maxDistanceKey || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdate((d) => { d.maxDistanceKey = val; });
                }}
              />
            </div>
          </>
        )}
      </div>

      {triggerType === 'range' && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <div className="text-slate-400">范围类型</div>
            <select
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={rangeType}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate((d) => {
                  d.rangeType = val;
                  if (val === 'circle') {
                    d.length = undefined;
                    d.width = undefined;
                    if (typeof d.radius !== 'number') d.radius = 0;
                  } else {
                    d.radius = undefined;
                    if (typeof d.length !== 'number') d.length = 0;
                    if (typeof d.width !== 'number') d.width = 0;
                  }
                });
              }}
            >
              <option value="circle">圆</option>
              <option value="rect">矩形</option>
            </select>
          </div>

          {rangeType === 'circle' ? (
            <div className="space-y-1">
              <div className="text-slate-400">半径</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={Number(evt.data?.radius) || 0}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  onUpdate((d) => { d.radius = val; });
                }}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <div className="text-slate-400">长</div>
                <input
                  type="number"
                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                  value={Number(evt.data?.length) || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    onUpdate((d) => { d.length = val; });
                  }}
                />
              </div>
              <div className="space-y-1">
                <div className="text-slate-400">宽</div>
                <input
                  type="number"
                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                  value={Number(evt.data?.width) || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    onUpdate((d) => { d.width = val; });
                  }}
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <div className="text-slate-400">前方角度</div>
            <input
              type="number"
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={Number(evt.data?.frontAngle) || 0}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                onUpdate((d) => { d.frontAngle = val; });
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="text-slate-400">前方距离</div>
            <input
              type="number"
              className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={Number(evt.data?.frontDistance) || 0}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                onUpdate((d) => { d.frontDistance = val; });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DamageFields;
