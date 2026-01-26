import React from 'react';
import type { BulletTriggerConfig } from '../../../game/core/config/BulletConfig';

interface Props {
  trigger: BulletTriggerConfig;
  onUpdate: (patch: Partial<BulletTriggerConfig>) => void;
}

const BulletTriggerEventFields: React.FC<Props> = ({ trigger, onUpdate }) => {
  const updateParam = (key: string, value: any) => {
    const newParams = { ...trigger.params, [key]: value };
    onUpdate({ params: newParams });
  };

  switch (trigger.eventType) {
    case 'bulletStart':
      return (
        <div className="text-xs text-slate-500 py-2">
          子弹开始事件无额外参数
        </div>
      );
    case 'bulletEnd':
      return (
        <div className="flex flex-wrap items-end gap-3 text-xs text-slate-200">
          <div className="space-y-1">
            <div className="text-slate-400">结束原因 (可选)</div>
            <input
              type="text"
              className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1"
              placeholder="命中 / 消失 / 超时"
              value={(trigger.params as any)?.reason || ''}
              onChange={(e) => updateParam('reason', e.target.value)}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default BulletTriggerEventFields;
