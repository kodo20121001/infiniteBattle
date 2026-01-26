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
