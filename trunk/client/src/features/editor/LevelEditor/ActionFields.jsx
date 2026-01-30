import React from 'react';

/**
 * 行为参数输入字段组件
 * 根据行为类型渲染对应的输入框
 */
export default function ActionFields({ action, onUpdate }) {
  const params = action.params || {};

  const updateField = (key, value) => {
    onUpdate({ ...params, [key]: value });
  };

  const renderFields = () => {
    switch (action.type) {
      case 'createUnit':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.unitId || ''}
                onChange={e => updateField('unitId', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">所属阵营ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.campId || 0}
                onChange={e => updateField('campId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">位置名（地图点名）</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.positionName || ''}
                onChange={e => updateField('positionName', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">单位等级（可选）</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.level || 1}
                onChange={e => updateField('level', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'removeUnit':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'moveUnit':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">目标位置名</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.targetPositionName || ''}
                onChange={e => updateField('targetPositionName', e.target.value)}
              />
            </div>
          </div>
        );

      case 'setVariable':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">变量名</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.variable || ''}
                onChange={e => updateField('variable', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">设置值</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.value || ''}
                onChange={e => updateField('value', e.target.value)}
              />
            </div>
          </div>
        );

      case 'playEffect':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">特效ID或名称</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.effect || ''}
                onChange={e => updateField('effect', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">位置名</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.positionName || ''}
                onChange={e => updateField('positionName', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">持续时间（可选）</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.duration || 0}
                onChange={e => updateField('duration', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'playSound':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">音效ID或名称</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.sound || ''}
                onChange={e => updateField('sound', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">音量（可选）</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.volume || 1}
                onChange={e => updateField('volume', Number(e.target.value))}
                step="0.1"
                min="0"
                max="1"
              />
            </div>
          </div>
        );

      case 'showMessage':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <div className="text-slate-400">显示给玩家ID（可选）</div>
                <input
                  type="number"
                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                  value={params.playerId || 0}
                  onChange={e => updateField('playerId', Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">消息内容</div>
              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs min-h-[60px]"
                value={params.message || ''}
                onChange={e => updateField('message', e.target.value)}
              />
            </div>
          </div>
        );

      case 'changeCamp':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">单位ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.unitId || 0}
                onChange={e => updateField('unitId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">新阵营ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.newCampId || 0}
                onChange={e => updateField('newCampId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'winGame':
      case 'loseGame':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">玩家ID（可选，默认所有玩家）</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.playerId || 0}
                onChange={e => updateField('playerId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'customAction':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <div className="text-slate-400">行为名</div>
                <input
                  className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                  value={params.actionName || ''}
                  onChange={e => updateField('actionName', e.target.value)}
                />
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">行为参数 (JSON)</div>
              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono min-h-[60px]"
                value={JSON.stringify(params.params || {}, null, 2)}
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
        return <div className="text-xs text-slate-400">暂无参数字段</div>;
    }
  };

  return <div className="text-xs text-slate-200">{renderFields()}</div>;
}
