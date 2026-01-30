import React, { useEffect, useState } from 'react';
import type {
  LevelConfig,
  LevelCampConfig,
  LevelAllianceConfig,
  LevelUnitConfig,
  LevelTriggerConfig,
  LevelConditionConfig,
  LevelActionConfig,
  LevelTriggerEventType,
  LevelConditionType,
  LevelActionType
} from '../../game/core/config/LevelConfig';
import TriggerEventFields from './LevelEditor/TriggerEventFields.jsx';
import ConditionFields from './LevelEditor/ConditionFields.jsx';
import ActionFields from './LevelEditor/ActionFields.jsx';

// 默认结构生成
const makeDefaultLevel = (id = 1): LevelConfig => ({
  id,
  name: `关卡${id}`,
  description: '',
  mapId: 1,
  camps: [],
  alliances: [],
  initialResources: {},
  startUnits: [],
  winCondition: '',
  loseCondition: '',
  triggers: []
});

const makeDefaultTrigger = (id = 1): LevelTriggerConfig => ({
  id,
  name: `触发器${id}`,
  eventType: 'levelInit',
  eventData: {},
  conditions: [],
  actions: []
});

const makeDefaultCondition = (): LevelConditionConfig => ({
  type: 'unitId',
  params: {}
});

const makeDefaultAction = (): LevelActionConfig => ({
  type: 'createUnit',
  params: {}
});

const eventTypes: LevelTriggerEventType[] = [
  'levelInit', 'mapInit', 'levelStart', 'levelEnd',
  'unitEnterRegion', 'unitLeaveRegion', 'unitDie', 'unitRevive',
  'unitHpChange', 'unitMpChange', 'unitCastSkill', 'unitLevelUp',
  'timer', 'variableChange', 'playerWin', 'playerLose', 'customEvent'
];

const eventTypeLabels: Record<LevelTriggerEventType, string> = {
  'levelInit': '关卡初始化',
  'mapInit': '地图初始化',
  'levelStart': '关卡开始',
  'levelEnd': '关卡结束',
  'unitEnterRegion': '单位进入区域',
  'unitLeaveRegion': '单位离开区域',
  'unitDie': '单位死亡',
  'unitRevive': '单位复活',
  'unitHpChange': '单位血量变化',
  'unitMpChange': '单位魔法变化',
  'unitCastSkill': '单位释放技能',
  'unitLevelUp': '单位升级',
  'timer': '定时器',
  'variableChange': '变量变化',
  'playerWin': '玩家胜利',
  'playerLose': '玩家失败',
  'customEvent': '自定义事件'
};

const conditionTypes: LevelConditionType[] = [
  'unitId', 'camp', 'unitCount', 'variableCompare', 'unitInRegion', 'unitHpBelow'
];

const conditionTypeLabels: Record<LevelConditionType, string> = {
  'unitId': '单位ID',
  'camp': '阵营',
  'unitCount': '单位数量',
  'variableCompare': '变量比较',
  'unitInRegion': '单位在区域',
  'unitHpBelow': '单位血量低于'
};

const actionTypes: LevelActionType[] = [
  'createUnit', 'removeUnit', 'moveUnit', 'setVariable',
  'playEffect', 'playSound', 'showMessage', 'changeCamp',
  'winGame', 'loseGame', 'customAction'
];

const actionTypeLabels: Record<LevelActionType, string> = {
  'createUnit': '创建单位',
  'removeUnit': '移除单位',
  'moveUnit': '移动单位',
  'setVariable': '设置变量',
  'playEffect': '播放特效',
  'playSound': '播放音效',
  'showMessage': '显示消息',
  'changeCamp': '改变阵营',
  'winGame': '胜利',
  'loseGame': '失败',
  'customAction': '自定义行为'
};

const LevelEditor = () => {
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<LevelConfig | null>(null);
  const [selectedTriggerIdx, setSelectedTriggerIdx] = useState(0);
  const [status, setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [toast, setToast] = useState('');
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [savePathName, setSavePathName] = useState<string>('');

  // 加载配置
  useEffect(() => {
    const load = async () => {
      try {
        // 从URL参数获取保存路径
        const params = new URLSearchParams(window.location.search);
        const path = params.get('path') || '/config/level.json';

        const res = await fetch(path);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setLevels(list.length ? list : [makeDefaultLevel(1)]);
        setSelectedId(list.length ? list[0].id : 1);
        setDraft(list.length ? { ...list[0] } : makeDefaultLevel(1));
        setStatus('ready');
      } catch (err) {
        setLevels([makeDefaultLevel(1)]);
        setSelectedId(1);
        setDraft(makeDefaultLevel(1));
        setStatus('error');
      }
    };
    load();
  }, []);

  useEffect(() => {
    const found = levels.find(l => l.id === selectedId);
    if (found) {
      setDraft({ ...found });
      setSelectedTriggerIdx(0);
    }
  }, [selectedId, levels]);

  // 保存配置
  const saveConfigs = async () => {
    try {
      const merged = levels.map(l => l.id === draft?.id ? draft : l);
      setLevels(merged);

      let handle = dirHandle;
      if (handle) {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          const req = await handle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') handle = null;
        }
      }
      if (!handle) {
        handle = await (window as any).showDirectoryPicker();
        setDirHandle(handle);
        let fullPath = '';
        try {
          const pathArray = await handle.getFullPath();
          fullPath = '/' + pathArray.join('/');
        } catch (e) {
          fullPath = handle.name;
        }
        setSavePathName(fullPath);
      }

      const fileHandle = await handle.getFileHandle('level.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(merged, null, 2));
      await writable.close();

      setToast('✓ 已保存 level.json');
      setTimeout(() => setToast(''), 1500);
    } catch (err: any) {
      setToast('✗ 保存失败: ' + err.message);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // 新建/删除关卡
  const createLevel = () => {
    // 只从正常关卡（ID < 9999）中取最大值，预留 9999+ 给特殊用途（如演示关卡）
    const nextId = Math.max(0, ...levels.filter(l => l.id < 9999).map(l => Number(l.id) || 0)) + 1;
    const base = makeDefaultLevel(nextId);
    setLevels(prev => [...prev, base]);
    setSelectedId(nextId);
    setDraft(base);
  };
  const deleteLevel = () => {
    if (!draft) return;
    const list = levels.filter(l => l.id !== draft.id);
    setLevels(list);
    if (list.length > 0) {
      setSelectedId(list[0].id);
      setDraft({ ...list[0] });
    } else {
      const base = makeDefaultLevel(1);
      setLevels([base]);
      setSelectedId(1);
      setDraft(base);
    }
  };

  // 属性编辑
  const handleFieldChange = (key: keyof LevelConfig, value: any) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  };

  // 触发器编辑
  const addTrigger = () => {
    if (!draft) return;
    const maxId = Math.max(0, ...draft.triggers.map(t => t.id));
    const newTrigger = makeDefaultTrigger(maxId + 1);
    setDraft(prev => prev ? { ...prev, triggers: [...prev.triggers, newTrigger] } : prev);
    setSelectedTriggerIdx(draft.triggers.length);
  };
  const removeTrigger = (idx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = prev.triggers.filter((_, i) => i !== idx);
      return { ...prev, triggers };
    });
    if (selectedTriggerIdx >= (draft?.triggers.length || 0) - 1 && selectedTriggerIdx > 0) {
      setSelectedTriggerIdx(selectedTriggerIdx - 1);
    }
  };

  const updateTrigger = (idx: number, patch: Partial<LevelTriggerConfig>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = [...prev.triggers];
      triggers[idx] = { ...triggers[idx], ...patch };
      return { ...prev, triggers };
    });
  };

  const addCondition = (triggerIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = [...prev.triggers];
      triggers[triggerIdx] = {
        ...triggers[triggerIdx],
        conditions: [...triggers[triggerIdx].conditions, makeDefaultCondition()]
      };
      return { ...prev, triggers };
    });
  };

  const removeCondition = (triggerIdx: number, condIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = [...prev.triggers];
      triggers[triggerIdx] = {
        ...triggers[triggerIdx],
        conditions: triggers[triggerIdx].conditions.filter((_, i) => i !== condIdx)
      };
      return { ...prev, triggers };
    });
  };

  const updateCondition = (triggerIdx: number, condIdx: number, patch: Partial<LevelConditionConfig>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = [...prev.triggers];
      const conditions = [...triggers[triggerIdx].conditions];
      conditions[condIdx] = { ...conditions[condIdx], ...patch };
      triggers[triggerIdx] = { ...triggers[triggerIdx], conditions };
      return { ...prev, triggers };
    });
  };

  const addAction = (triggerIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = [...prev.triggers];
      triggers[triggerIdx] = {
        ...triggers[triggerIdx],
        actions: [...triggers[triggerIdx].actions, makeDefaultAction()]
      };
      return { ...prev, triggers };
    });
  };

  const removeAction = (triggerIdx: number, actIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = [...prev.triggers];
      triggers[triggerIdx] = {
        ...triggers[triggerIdx],
        actions: triggers[triggerIdx].actions.filter((_, i) => i !== actIdx)
      };
      return { ...prev, triggers };
    });
  };

  const updateAction = (triggerIdx: number, actIdx: number, patch: Partial<LevelActionConfig>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const triggers = [...prev.triggers];
      const actions = [...triggers[triggerIdx].actions];
      actions[actIdx] = { ...actions[actIdx], ...patch };
      triggers[triggerIdx] = { ...triggers[triggerIdx], actions };
      return { ...prev, triggers };
    });
  };

  if (status === 'loading') {
    return <div className="w-full h-screen bg-black text-white flex items-center justify-center">加载配置...</div>;
  }

  const currentTrigger = draft?.triggers?.[selectedTriggerIdx];

  return (
    <div className="w-full h-screen bg-slate-900 text-slate-100 flex">
      {/* 左侧关卡属性 */}
      <div className="w-[360px] border-r border-slate-800 bg-slate-950/80 backdrop-blur-sm flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex gap-2">
            <button onClick={createLevel} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold">新建</button>
            <button onClick={deleteLevel} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold">删除</button>
          </div>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            value={selectedId ?? ''}
            onChange={e => setSelectedId(Number(e.target.value))}
          >
            {levels.map(l => (
              <option key={l.id} value={l.id}>关卡 {l.id}</option>
            ))}
          </select>
          <button
            onClick={saveConfigs}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
          >
            保存 level.json
          </button>
          <button
            onClick={async () => {
              try {
                const handle = await (window as any).showDirectoryPicker();
                setDirHandle(handle);
                let fullPath = '';
                try {
                  const pathArray = await handle.getFullPath();
                  fullPath = '/' + pathArray.join('/');
                } catch (e) {
                  fullPath = handle.name;
                }
                setSavePathName(fullPath);
              } catch (err: any) {
                setToast('✗ 选择路径失败: ' + err.message);
                setTimeout(() => setToast(''), 2000);
              }
            }}
            title={savePathName ? `当前路径: ${savePathName}` : '选择保存路径'}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-xs truncate"
          >
            {savePathName ? `📁 ${savePathName}` : '📁 选择保存路径'}
          </button>
          {status === 'error' && (
            <div className="text-xs text-amber-300 bg-amber-900/40 border border-amber-700 rounded p-2">
              读取 level.json 失败，已使用默认模板。
            </div>
          )}
        </div>

        {/* 关卡属性编辑 */}
        {draft && (
          <div className="p-4 space-y-3 text-sm">
            <div className="text-slate-300 font-semibold">关卡属性</div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">关卡名称</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" 
                value={draft.name} 
                onChange={e => handleFieldChange('name', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">地图ID</label>
              <input 
                type="number" 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" 
                value={draft.mapId} 
                onChange={e => handleFieldChange('mapId', Number(e.target.value))} 
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">描述</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm min-h-[60px]" 
                value={draft.description || ''} 
                onChange={e => handleFieldChange('description', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">胜利条件</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" 
                value={draft.winCondition} 
                onChange={e => handleFieldChange('winCondition', e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">失败条件</label>
              <input 
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" 
                value={draft.loseCondition} 
                onChange={e => handleFieldChange('loseCondition', e.target.value)} 
              />
            </div>
            
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="text-slate-300 text-xs mb-2">阵营数: {draft.camps.length}</div>
              <div className="text-slate-300 text-xs mb-2">单位数: {draft.startUnits?.length || 0}</div>
              <div className="text-slate-300 text-xs mb-2">关系数: {draft.alliances?.length || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* 右侧触发器编辑 */}
      <div className="flex-1 flex flex-col pt-16">
        <div className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-between">
          <div className="text-xl font-bold">触发器编辑</div>
          <button 
            onClick={addTrigger} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-semibold"
          >
            新增触发器
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 触发器列表 */}
          <div className="w-[240px] border-r border-slate-800 bg-slate-950/40 overflow-y-auto">
            <div className="p-3 space-y-2">
              {draft?.triggers.map((trigger, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTriggerIdx(idx)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${
                    selectedTriggerIdx === idx
                      ? 'bg-blue-900/60 border border-blue-700 text-blue-100'
                      : 'bg-slate-800/40 border border-slate-700 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold">#{trigger.id} {trigger.name}</div>
                  <div className="text-[10px] text-slate-400">{eventTypeLabels[trigger.eventType]}</div>
                </button>
              ))}
              {(!draft?.triggers || draft.triggers.length === 0) && (
                <div className="text-xs text-slate-400 text-center py-4">暂无触发器</div>
              )}
            </div>
          </div>

          {/* 触发器详情编辑 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentTrigger && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{currentTrigger.name}</div>
                  <button 
                    onClick={() => removeTrigger(selectedTriggerIdx)} 
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    删除触发器
                  </button>
                </div>

                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">触发器名称</label>
                    <input 
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm" 
                      value={currentTrigger.name} 
                      onChange={e => updateTrigger(selectedTriggerIdx, { name: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">事件类型</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm" 
                      value={currentTrigger.eventType} 
                      onChange={e => updateTrigger(selectedTriggerIdx, { eventType: e.target.value as LevelTriggerEventType, eventData: {} })}
                    >
                      {eventTypes.map(t => (
                        <option key={t} value={t}>{eventTypeLabels[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">事件数据</label>
                    <TriggerEventFields
                      trigger={currentTrigger}
                      onUpdate={eventData => updateTrigger(selectedTriggerIdx, { eventData })}
                    />
                  </div>
                </div>

                {/* 条件列表 */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">条件列表</div>
                    <button 
                      onClick={() => addCondition(selectedTriggerIdx)} 
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs"
                    >
                      新增条件
                    </button>
                  </div>
                  {currentTrigger.conditions.map((cond, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-700 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">条件 {idx + 1}</div>
                        <button 
                          onClick={() => removeCondition(selectedTriggerIdx, idx)} 
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          删除
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">类型</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs" 
                          value={cond.type} 
                          onChange={e => updateCondition(selectedTriggerIdx, idx, { type: e.target.value as LevelConditionType, params: {} })}
                        >
                          {conditionTypes.map(t => (
                            <option key={t} value={t}>{conditionTypeLabels[t]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">参数</label>
                        <ConditionFields
                          condition={cond}
                          onUpdate={params => updateCondition(selectedTriggerIdx, idx, { params })}
                        />
                      </div>
                    </div>
                  ))}
                  {currentTrigger.conditions.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-2">暂无条件</div>
                  )}
                </div>

                {/* 行为列表 */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">行为列表</div>
                    <button 
                      onClick={() => addAction(selectedTriggerIdx)} 
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs"
                    >
                      新增行为
                    </button>
                  </div>
                  {currentTrigger.actions.map((act, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-700 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">行为 {idx + 1}</div>
                        <button 
                          onClick={() => removeAction(selectedTriggerIdx, idx)} 
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                        >
                          删除
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">类型</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs" 
                          value={act.type} 
                          onChange={e => updateAction(selectedTriggerIdx, idx, { type: e.target.value as LevelActionType, params: {} })}
                        >
                          {actionTypes.map(t => (
                            <option key={t} value={t}>{actionTypeLabels[t]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">参数</label>
                        <ActionFields
                          action={act}
                          onUpdate={params => updateAction(selectedTriggerIdx, idx, { params })}
                        />
                      </div>
                    </div>
                  ))}
                  {currentTrigger.actions.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-2">暂无行为</div>
                  )}
                </div>
              </>
            )}
            {!currentTrigger && (
              <div className="text-center text-slate-400 py-12">
                暂无触发器，点击右上角"新增触发器"开始创建
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg backdrop-blur-sm text-sm border ${toast.startsWith('✓') ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-red-900/50 border-red-700 text-red-200'}`}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default LevelEditor;
