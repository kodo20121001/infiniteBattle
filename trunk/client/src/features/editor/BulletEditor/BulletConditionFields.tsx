import React from 'react';
import type { BulletConditionConfig } from '../../../game/core/config/BulletConfig';

interface Props {
  condition: BulletConditionConfig;
  onUpdate: (patch: Partial<BulletConditionConfig>) => void;
}

const BulletConditionFields: React.FC<Props> = ({ condition, onUpdate }) => {
  const updateParam = (key: string, value: any) => {
    const newParams = { ...(condition.params || {}), [key]: value };
    onUpdate({ params: newParams });
  };

  switch (condition.type) {
    case 'bulletLifetimeGreater':
      return (
        <div className="flex flex-wrap items-end gap-3 text-xs text-slate-200">
          <div className="space-y-1">
            <div className="text-slate-400">存活时间(秒)</div>
            <input
              type="number"
              step="0.1"
              className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={(condition.params as any)?.lifetimeSec || 0}
              onChange={(e) => updateParam('lifetimeSec', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      );
    case 'bulletDistanceLess':
      return (
        <div className="flex flex-wrap items-end gap-3 text-xs text-slate-200">
          <div className="space-y-1">
            <div className="text-slate-400">目标单位ID</div>
            <input
              type="number"
              className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              placeholder="可选"
              value={(condition.params as any)?.targetUnitId || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                updateParam('targetUnitId', val);
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="text-slate-400">最大距离</div>
            <input
              type="number"
              step="0.1"
              className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={(condition.params as any)?.maxDistance || 0}
              onChange={(e) => updateParam('maxDistance', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      );
    case 'customCondition':
      return (
        <div className="flex flex-wrap items-end gap-3 text-xs text-slate-200">
          <div className="space-y-1">
            <div className="text-slate-400">条件名</div>
            <input
              type="text"
              className="w-40 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={(condition.params as any)?.conditionName || ''}
              onChange={(e) => updateParam('conditionName', e.target.value)}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default BulletConditionFields;
