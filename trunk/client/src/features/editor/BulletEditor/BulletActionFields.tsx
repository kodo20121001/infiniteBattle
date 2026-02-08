import React from 'react';
import type { BulletActionConfig } from '../../../game/core/config/BulletConfig';

interface Props {
  action: BulletActionConfig;
  onUpdate: (patch: Partial<BulletActionConfig>) => void;
}

const BulletActionFields: React.FC<Props> = ({ action, onUpdate }) => {
  const updateParam = (key: string, value: any) => {
    const newParams = { ...(action.params || {}), [key]: value };
    onUpdate({ params: newParams });
  };

  switch (action.type) {
    case 'bulletFlyToTarget':
      return (
        <div className="space-y-2 text-xs text-slate-200">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">初始速度</div>
              <input
                type="number"
                step="0.01"
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={
                  (action.params as any)?.speed === undefined || (action.params as any)?.speed === null
                    ? ''
                    : (action.params as any)?.speed
                }
                onChange={e => {
                  const val = e.target.value;
                  updateParam('speed', val === '' ? undefined : Number(val));
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">加速度</div>
              <input
                type="number"
                step="0.1"
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                placeholder="可选"
                value={(action.params as any)?.acceleration || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  updateParam('acceleration', val);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">最高速度</div>
              <input
                type="number"
                step="0.5"
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                placeholder="可选"
                value={(action.params as any)?.maxSpeed || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  updateParam('maxSpeed', val);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">抛物线高度</div>
              <input
                type="number"
                step="0.5"
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                placeholder="0=直线"
                value={(action.params as any)?.arc || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  updateParam('arc', val);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">追踪转向率</div>
              <input
                type="number"
                step="10"
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                placeholder="度/秒"
                value={(action.params as any)?.homingRate || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  updateParam('homingRate', val);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">碰撞半径</div>
              <input
                type="number"
                step="0.1"
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                placeholder="可选"
                value={(action.params as any)?.collisionRadius || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  updateParam('collisionRadius', val);
                }}
              />
            </div>
          </div>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={(action.params as any)?.homing === true}
                onChange={(e) => updateParam('homing', e.target.checked)}
              />
              导弹追踪
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={(action.params as any)?.stopOnHit !== false}
                onChange={(e) => updateParam('stopOnHit', e.target.checked)}
              />
              命中后停止
            </label>
          </div>
        </div>
      );
    case 'bulletDamage':
      const triggerType = (action.params as any)?.triggerType || 'target';
      const rangeType = (action.params as any)?.rangeType || 'circle';
      
      return (
        <div className="space-y-2 text-xs text-slate-200">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">伤害值</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={Number((action.params as any)?.damageValue) || 0}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  updateParam('damageValue', val);
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">伤害值 key</div>
              <input
                type="text"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={(action.params as any)?.damageKey || ''}
                onChange={(e) => updateParam('damageKey', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">伤害比例</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={typeof (action.params as any)?.damageRatio === 'number' ? (action.params as any).damageRatio : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || isNaN(Number(val))) {
                    const newParams = { ...(action.params || {}) };
                    delete newParams.damageRatio;
                    onUpdate({ params: newParams });
                  } else {
                    updateParam('damageRatio', Number(val));
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">伤害比例 key</div>
              <input
                type="text"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                value={(action.params as any)?.damageRatioKey || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    const newParams = { ...(action.params || {}) };
                    delete newParams.damageRatioKey;
                    onUpdate({ params: newParams });
                  } else {
                    updateParam('damageRatioKey', val);
                  }
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
                  const newParams: any = { ...(action.params || {}), triggerType: val };
                  if (val === 'target') {
                    delete newParams.rangeType;
                    delete newParams.radius;
                    delete newParams.length;
                    delete newParams.width;
                  } else {
                    delete newParams.maxDistanceValue;
                    delete newParams.maxDistanceKey;
                  }
                  onUpdate({ params: newParams });
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
                    value={Number((action.params as any)?.maxDistanceValue) || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      updateParam('maxDistanceValue', val);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-slate-400">key</div>
                  <input
                    type="text"
                    className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                    value={(action.params as any)?.maxDistanceKey || ''}
                    onChange={(e) => updateParam('maxDistanceKey', e.target.value)}
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
                    const newParams: any = { ...(action.params || {}), rangeType: val };
                    if (val === 'circle') {
                      delete newParams.length;
                      delete newParams.width;
                      if (typeof newParams.radius !== 'number') newParams.radius = 0;
                    } else {
                      delete newParams.radius;
                      if (typeof newParams.length !== 'number') newParams.length = 0;
                      if (typeof newParams.width !== 'number') newParams.width = 0;
                    }
                    onUpdate({ params: newParams });
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
                    value={Number((action.params as any)?.radius) || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      updateParam('radius', val);
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
                      value={Number((action.params as any)?.length) || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        updateParam('length', val);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400">宽</div>
                    <input
                      type="number"
                      className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                      value={Number((action.params as any)?.width) || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        updateParam('width', val);
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
                  value={Number((action.params as any)?.frontAngle) || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    updateParam('frontAngle', val);
                  }}
                />
              </div>
              <div className="space-y-1">
                <div className="text-slate-400">前方距离</div>
                <input
                  type="number"
                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1"
                  value={Number((action.params as any)?.frontDistance) || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    updateParam('frontDistance', val);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      );
    case 'customAction':
      return (
        <div className="flex flex-wrap items-end gap-3 text-xs text-slate-200">
          <div className="space-y-1">
            <div className="text-slate-400">行为名</div>
            <input
              type="text"
              className="w-40 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={(action.params as any)?.actionName || ''}
              onChange={(e) => updateParam('actionName', e.target.value)}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default BulletActionFields;
