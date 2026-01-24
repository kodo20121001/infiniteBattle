import React from 'react';

/**
 * 条件参数输入字段组件
 * 根据条件类型渲染对应的输入框
 */
export default function ConditionFields({ condition, onUpdate }) {
  const params = condition.params || {};

  const updateField = (key, value) => {
    onUpdate({ ...params, [key]: value });
  };

  const renderFields = () => {
    switch (condition.type) {
      case 'unitType':
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
              <div className="text-slate-400">单位类型</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.unitType || ''}
                onChange={e => updateField('unitType', e.target.value)}
              />
            </div>
          </div>
        );

      case 'camp':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">阵营ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.campId || 0}
                onChange={e => updateField('campId', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'unitCount':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <div className="text-slate-400">阵营ID</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.campId || 0}
                onChange={e => updateField('campId', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">单位类型（可选）</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.unitType || ''}
                onChange={e => updateField('unitType', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">比较符号</div>
              <select
                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.compare || '='}
                onChange={e => updateField('compare', e.target.value)}
              >
                <option value="=">=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">比较数量</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.count || 0}
                onChange={e => updateField('count', Number(e.target.value))}
              />
            </div>
          </div>
        );

      case 'variableCompare':
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
              <div className="text-slate-400">比较符号</div>
              <select
                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.compare || '='}
                onChange={e => updateField('compare', e.target.value)}
              >
                <option value="=">=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="!=">!=</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-slate-400">比较值</div>
              <input
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.value || ''}
                onChange={e => updateField('value', e.target.value)}
              />
            </div>
          </div>
        );

      case 'unitInRegion':
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
              <div className="text-slate-400">区域ID或名称</div>
              <input
                className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.region || ''}
                onChange={e => updateField('region', e.target.value)}
              />
            </div>
          </div>
        );

      case 'unitHpBelow':
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
              <div className="text-slate-400">血量阈值</div>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={params.hpThreshold || 0}
                onChange={e => updateField('hpThreshold', Number(e.target.value))}
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
