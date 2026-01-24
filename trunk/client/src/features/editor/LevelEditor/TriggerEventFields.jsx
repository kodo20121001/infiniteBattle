import React from 'react';

/**
 * 触发器事件数据输入字段组件
 * 根据事件类型渲染对应的输入框
 */
export default function TriggerEventFields({ trigger, onUpdate }) {
  const eventType = trigger.eventType;
  const data = trigger.eventData || {};

  const updateField = (key, value) => {
    onUpdate({ ...data, [key]: value });
  };

  const renderFields = () => {
    switch (eventType) {
      case 'levelInit':
      case 'levelStart':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">关卡ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.levelId || 0}
                onChange={e => updateField('levelId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'mapInit':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">地图ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.mapId || 0}
                onChange={e => updateField('mapId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'levelEnd':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">关卡ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.levelId || 0}
                onChange={e => updateField('levelId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">是否胜利</div>
              <select
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.isWin ? 'true' : 'false'}
                onChange={e => updateField('isWin', e.target.value === 'true')}
              >
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
          </div>
        );

      case 'unitEnterRegion':
      case 'unitLeaveRegion':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">区域ID或名称</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.region || ''}
                onChange={e => updateField('region', e.target.value)}
              />
            </div>
          </div>
        );

      case 'unitDie':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">死亡原因（可选）</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.reason || ''}
                onChange={e => updateField('reason', e.target.value)}
              />
            </div>
          </div>
        );

      case 'unitRevive':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'unitHpChange':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">变化前血量</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.oldHp || 0}
                onChange={e => updateField('oldHp', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">变化后血量</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.newHp || 0}
                onChange={e => updateField('newHp', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'unitMpChange':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">变化前魔法值</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.oldMp || 0}
                onChange={e => updateField('oldMp', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">变化后魔法值</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.newMp || 0}
                onChange={e => updateField('newMp', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'unitCastSkill':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">技能ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.skillId || 0}
                onChange={e => updateField('skillId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'unitLevelUp':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">升级后等级</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.newLevel || 1}
                onChange={e => updateField('newLevel', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'timer':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">定时器ID或名称</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.timer || ''}
                onChange={e => updateField('timer', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">当前计数</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.count || 0}
                onChange={e => updateField('count', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'variableChange':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">变量名</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.variable || ''}
                onChange={e => updateField('variable', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">变化前值</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.oldValue || ''}
                onChange={e => updateField('oldValue', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">变化后值</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.newValue || ''}
                onChange={e => updateField('newValue', e.target.value)}
              />
            </div>
          </div>
        );

      case 'playerWin':
      case 'playerLose':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">玩家ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={data.playerId || 0}
                onChange={e => updateField('playerId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'customEvent':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <div className="text-slate-400">事件名</div>
                <input
                  className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                  value={data.eventName || ''}
                  onChange={e => updateField('eventName', e.target.value)}
                />
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">事件参数 (JSON)</div>
              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono min-h-[60px]"
                value={JSON.stringify(data.params || {}, null, 2)}
                onChange={e => {
                  try {
                    updateField('params', JSON.parse(e.target.value));
                  } catch {}
                }}
              />
            </div>
          </div>
        );

      default:
        return <div className="text-xs text-slate-400">暂无事件数据字段</div>;
    }
  };

  return <div className="text-xs text-slate-200">{renderFields()}</div>;
}
