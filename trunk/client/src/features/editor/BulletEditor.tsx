import React, { useEffect, useState } from 'react';
import type {
  BulletConfig,
  BulletSegmentConfig,
  BulletTriggerConfig,
  BulletConditionConfig,
  BulletActionConfig,
  BulletTriggerEventType,
  BulletConditionType,
  BulletActionType
} from '../../game/core/config/BulletConfig';
import BulletTriggerEventFields from './BulletEditor/BulletTriggerEventFields';
import BulletConditionFields from './BulletEditor/BulletConditionFields';
import BulletActionFields from './BulletEditor/BulletActionFields';
import BulletDemoPreview from './BulletEditor/BulletDemoPreview';

// ==================== 默认值生成器 ====================

const makeDefaultAction = (): BulletActionConfig => ({
  type: 'bulletFlyToTarget',
  params: { speed: 10 }
});

const makeDefaultCondition = (): BulletConditionConfig => ({
  type: 'bulletLifetimeGreater',
  params: { lifetimeSec: 0 }
});

const makeDefaultTrigger = (): BulletTriggerConfig => ({
  eventType: 'bulletStart',
  params: {},
  conditions: [],
  actions: []
});

const makeDefaultSegment = (id = 1): BulletSegmentConfig => ({
  id,
  name: `分段-${id}`,
  triggers: [makeDefaultTrigger()]
});

const makeDefaultBullet = (id = 1): BulletConfig => ({
  id,
  name: '子弹',
  description: '',
  modelId: 'monkey',
  segments: [makeDefaultSegment(1)]
});

// ==================== 类型定义 ====================

const bulletTriggerEventTypes: BulletTriggerEventType[] = ['bulletStart', 'bulletEnd', 'bulletHit'];

const bulletTriggerEventLabels: Record<BulletTriggerEventType, string> = {
  'bulletStart': '子弹开始',
  'bulletEnd': '子弹结束',
  'bulletHit': '击中目标'
};

const bulletConditionTypes: BulletConditionType[] = [
  'bulletLifetimeGreater',
  'bulletDistanceLess',
  'customCondition'
];

const bulletConditionLabels: Record<BulletConditionType, string> = {
  'bulletLifetimeGreater': '子弹存活时间大于',
  'bulletDistanceLess': '子弹距离小于',
  'customCondition': '自定义条件'
};

const bulletActionTypes: BulletActionType[] = ['bulletFlyToTarget', 'bulletDamage', 'customAction'];

const bulletActionLabels: Record<BulletActionType, string> = {
  'bulletFlyToTarget': '飞向目标',
  'bulletDamage': '造成伤害',
  'customAction': '自定义行为'
};

// ==================== 加载/保存 ====================

const fetchBulletConfigs = async () => {
  const res = await fetch('/config/bullet.json');
  if (!res.ok) throw new Error('无法加载 bullet.json');
  return res.json();
};

const normalizeBullet = (bullet: any): BulletConfig => ({
  id: bullet?.id ?? 1,
  name: bullet?.name ?? '子弹',
  description: bullet?.description ?? '',
  modelId: bullet?.modelId ?? 'monkey',
  segments: (bullet?.segments ?? []).map((seg: any, sIdx: number) => ({
    id: seg.id ?? (sIdx + 1),
    name: seg.name ?? `分段-${sIdx + 1}`,
    triggers: (seg.triggers ?? []).map((trig: any) => ({
      eventType: trig.eventType ?? 'bulletStart',
      params: trig.params ?? {},
      conditions: (trig.conditions ?? []).map((cond: any) => ({
        type: cond.type ?? 'bulletLifetimeGreater',
        params: cond.params ?? {}
      })),
      actions: (trig.actions ?? []).map((act: any) => ({
        type: act.type ?? 'bulletFlyToTarget',
        params: act.params ?? { speed: 10 }
      }))
    }))
  }))
});

// ==================== 编辑器组件 ====================

const BulletEditor = () => {
  const [bullets, setBullets] = useState<BulletConfig[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<BulletConfig | null>(null);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);
  const [selectedTriggerIdx, setSelectedTriggerIdx] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [toast, setToast] = useState('');
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [savePathName, setSavePathName] = useState<string>('');
  const [demoOpen, setDemoOpen] = useState(false);

  // 加载配置
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchBulletConfigs();
        const list = Array.isArray(data) ? data.map(normalizeBullet) : [];
        if (list.length === 0) {
          const base = makeDefaultBullet(1);
          setBullets([base]);
          setSelectedId(1);
          setDraft(base);
        } else {
          setBullets(list);
          setSelectedId(list[0].id);
          setDraft(normalizeBullet(list[0]));
        }
        setStatus('ready');
      } catch (err) {
        console.error(err);
        const base = makeDefaultBullet(1);
        setBullets([base]);
        setSelectedId(1);
        setDraft(base);
        setStatus('error');
      }
    };
    load();
  }, []);

  useEffect(() => {
    const found = bullets.find(b => b.id === selectedId);
    if (found) {
      setDraft(normalizeBullet(found));
      setSelectedSegmentIdx(0);
      setSelectedTriggerIdx(0);
    }
  }, [selectedId, bullets]);

  // 保存配置
  const saveConfigs = async () => {
    try {
      if (!draft) return;
      const merged = bullets.map(b => b.id === draft.id ? draft : b);
      setBullets(merged);

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

      const fileHandle = await handle.getFileHandle('bullet.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(merged, null, 2));
      await writable.close();

      setToast('✓ 已保存 bullet.json');
      setTimeout(() => setToast(''), 1500);
    } catch (err: any) {
      setToast('✗ 保存失败: ' + err.message);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // 创建/删除子弹
  const createBullet = () => {
    const nextId = Math.max(0, ...bullets.map(b => Number(b.id) || 0)) + 1;
    const base = makeDefaultBullet(nextId);
    setBullets(prev => [...prev, base]);
    setSelectedId(nextId);
    setDraft(base);
  };

  const deleteBullet = () => {
    if (!draft) return;
    const list = bullets.filter(b => b.id !== draft.id);
    setBullets(list);
    if (list.length > 0) {
      setSelectedId(list[0].id);
      setDraft(normalizeBullet(list[0]));
    } else {
      const base = makeDefaultBullet(1);
      setBullets([base]);
      setSelectedId(1);
      setDraft(base);
    }
  };

  // 编辑字段
  const handleFieldChange = (key: keyof BulletConfig, value: any) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  };

  // 分段编辑
  const addSegment = () => {
    setDraft(prev => {
      if (!prev) return prev;
      const maxId = Math.max(0, ...prev.segments.map(s => Number(s.id) || 0));
      const newSegment = makeDefaultSegment(maxId + 1);
      return { ...prev, segments: [...prev.segments, newSegment] };
    });
  };

  const removeSegment = (idx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = prev.segments.filter((_, i) => i !== idx);
      return { ...prev, segments };
    });
    if (selectedSegmentIdx >= (draft?.segments.length || 0) - 1 && selectedSegmentIdx > 0) {
      setSelectedSegmentIdx(selectedSegmentIdx - 1);
    }
  };

  // 触发器编辑
  const addTrigger = (segIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      segments[segIdx] = {
        ...segments[segIdx],
        triggers: [...segments[segIdx].triggers, makeDefaultTrigger()]
      };
      return { ...prev, segments };
    });
  };

  const removeTrigger = (segIdx: number, trigIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      segments[segIdx] = {
        ...segments[segIdx],
        triggers: segments[segIdx].triggers.filter((_, i) => i !== trigIdx)
      };
      return { ...prev, segments };
    });
    if (selectedTriggerIdx >= (draft?.segments[segIdx]?.triggers.length || 0) - 1 && selectedTriggerIdx > 0) {
      setSelectedTriggerIdx(selectedTriggerIdx - 1);
    }
  };

  const updateTrigger = (segIdx: number, trigIdx: number, patch: Partial<BulletTriggerConfig>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      const triggers = [...segments[segIdx].triggers];
      triggers[trigIdx] = { ...triggers[trigIdx], ...patch };
      segments[segIdx] = { ...segments[segIdx], triggers };
      return { ...prev, segments };
    });
  };

  // 条件编辑（绑定到当前触发器）
  const addCondition = (segIdx: number, trigIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      const triggers = [...segments[segIdx].triggers];
      const target = { ...triggers[trigIdx] };
      target.conditions = [...(target.conditions || []), makeDefaultCondition()];
      triggers[trigIdx] = target;
      segments[segIdx] = { ...segments[segIdx], triggers };
      return { ...prev, segments };
    });
  };

  const removeCondition = (segIdx: number, trigIdx: number, condIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      const triggers = [...segments[segIdx].triggers];
      const target = { ...triggers[trigIdx] };
      target.conditions = (target.conditions || []).filter((_, i) => i !== condIdx);
      triggers[trigIdx] = target;
      segments[segIdx] = { ...segments[segIdx], triggers };
      return { ...prev, segments };
    });
  };

  const updateCondition = (segIdx: number, trigIdx: number, condIdx: number, patch: Partial<BulletConditionConfig>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      const triggers = [...segments[segIdx].triggers];
      const target = { ...triggers[trigIdx] };
      const conditions = [...(target.conditions || [])];
      conditions[condIdx] = { ...conditions[condIdx], ...patch };
      target.conditions = conditions;
      triggers[trigIdx] = target;
      segments[segIdx] = { ...segments[segIdx], triggers };
      return { ...prev, segments };
    });
  };

  // 行为编辑（绑定到当前触发器）
  const addAction = (segIdx: number, trigIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      const triggers = [...segments[segIdx].triggers];
      const target = { ...triggers[trigIdx] };
      target.actions = [...(target.actions || []), makeDefaultAction()];
      triggers[trigIdx] = target;
      segments[segIdx] = { ...segments[segIdx], triggers };
      return { ...prev, segments };
    });
  };

  const removeAction = (segIdx: number, trigIdx: number, actIdx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      const triggers = [...segments[segIdx].triggers];
      const target = { ...triggers[trigIdx] };
      target.actions = (target.actions || []).filter((_, i) => i !== actIdx);
      triggers[trigIdx] = target;
      segments[segIdx] = { ...segments[segIdx], triggers };
      return { ...prev, segments };
    });
  };

  const updateAction = (segIdx: number, trigIdx: number, actIdx: number, patch: Partial<BulletActionConfig>) => {
    setDraft(prev => {
      if (!prev) return prev;
      const segments = [...prev.segments];
      const triggers = [...segments[segIdx].triggers];
      const target = { ...triggers[trigIdx] };
      const actions = [...(target.actions || [])];
      actions[actIdx] = { ...actions[actIdx], ...patch };
      target.actions = actions;
      triggers[trigIdx] = target;
      segments[segIdx] = { ...segments[segIdx], triggers };
      return { ...prev, segments };
    });
  };

  if (status === 'loading') {
    return <div className="w-full h-screen bg-black text-white flex items-center justify-center">加载配置...</div>;
  }

  const currentSegment = draft?.segments?.[selectedSegmentIdx];
  const currentTrigger = currentSegment?.triggers?.[selectedTriggerIdx];
  const triggerKey = `${selectedSegmentIdx}-${selectedTriggerIdx}`;

  return (
    <div className="w-full h-screen bg-slate-900 text-slate-100 flex">
      {/* 左侧属性面板 */}
      <div className="w-[360px] border-r border-slate-800 bg-slate-950/80 backdrop-blur-sm flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex gap-2">
            <button onClick={createBullet} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold">新建</button>
            <button onClick={deleteBullet} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold">删除</button>
          </div>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            value={selectedId ?? ''}
            onChange={e => setSelectedId(Number(e.target.value))}
          >
            {bullets.map(b => (
              <option key={b.id} value={b.id}>子弹 {b.id}</option>
            ))}
          </select>
          <button
            onClick={saveConfigs}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
          >
            保存 bullet.json
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
                if (err?.name === 'AbortError') return;
                setToast('✗ 选择路径失败: ' + err.message);
                setTimeout(() => setToast(''), 2000);
              }
            }}
            title={savePathName ? `当前路径: ${savePathName}` : '选择保存路径'}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-xs truncate"
          >
            {savePathName ? `📁 ${savePathName}` : '📁 选择保存路径'}
          </button>
          <button
            onClick={() => setDemoOpen(true)}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold"
          >
            🎮 预览演示
          </button>
          {status === 'error' && (
            <div className="text-xs text-amber-300 bg-amber-900/40 border border-amber-700 rounded p-2">
              读取 bullet.json 失败，已使用默认模板。
            </div>
          )}
        </div>

        {/* 子弹属性 */}
        {draft && (
          <div className="p-4 space-y-3 text-sm">
            <div className="text-slate-300 font-semibold">子弹属性</div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">子弹名称</label>
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                value={draft.name}
                onChange={e => handleFieldChange('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">模型ID</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
                value={draft.modelId}
                onChange={e => handleFieldChange('modelId', e.target.value)}
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

            <div className="border-t border-slate-700 pt-3 mt-3 flex-1 flex flex-col">
              <div className="text-xs text-slate-300 mb-2 font-semibold">分段列表 ({draft.segments.length})</div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {draft.segments.map((seg, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedSegmentIdx(idx);
                      setSelectedTriggerIdx(0);
                    }}
                    className={`w-full text-left px-2 py-2 rounded text-xs transition-all ${
                      selectedSegmentIdx === idx
                        ? 'bg-yellow-900/60 border border-yellow-700 text-yellow-100'
                        : 'bg-slate-800/40 border border-slate-700 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="font-semibold">#{seg.id} {seg.name}</div>
                    <div className="text-[10px] text-slate-400">{seg.triggers?.length || 0} 触发</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
                <button onClick={addSegment} className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-semibold">新增分段</button>
                <button onClick={() => removeSegment(selectedSegmentIdx)} className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold">删除</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右侧编辑面板 */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 pt-20">
        {currentSegment && (
          <div className="space-y-6">
            {/* 分段标题 */}
            <div>
              <div className="text-xs text-slate-400">分段 #{currentSegment.id}</div>
              <div className="text-2xl font-bold">{currentSegment.name}</div>
            </div>

            {/* 触发器编辑（统一框） */}
            <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4 space-y-4">
              {/* 触发器列表 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">触发器</div>
                  <button
                    onClick={() => addTrigger(selectedSegmentIdx)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-semibold"
                  >
                    新增
                  </button>
                </div>

                {currentSegment.triggers.length === 0 ? (
                  <div className="text-xs text-slate-400 py-2">暂无触发器</div>
                ) : (
                  <div className="space-y-2">
                    {currentSegment.triggers.map((trigger, trigIdx) => (
                      <div
                        key={trigIdx}
                        onClick={() => setSelectedTriggerIdx(trigIdx)}
                        className={`p-3 border rounded cursor-pointer transition-all ${
                          selectedTriggerIdx === trigIdx
                            ? 'bg-slate-700/50 border-slate-500'
                            : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{bulletTriggerEventLabels[trigger.eventType]}</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTrigger(selectedSegmentIdx, trigIdx);
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 选中触发器的详细编辑 */}
              {currentTrigger && (
                <div key={triggerKey} className="space-y-4 pt-4 border-t border-slate-700">
                  <div className="space-y-3">
                    <div className="text-base font-semibold text-slate-300">触发器详情</div>
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400">事件类型</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                        value={currentTrigger.eventType}
                        onChange={(e) => {
                          const newType = e.target.value as BulletTriggerEventType;
                          updateTrigger(selectedSegmentIdx, selectedTriggerIdx, {
                            eventType: newType,
                            params: {}
                          });
                        }}
                      >
                        {bulletTriggerEventTypes.map(t => (
                          <option key={t} value={t}>{bulletTriggerEventLabels[t]}</option>
                        ))}
                      </select>
                    </div>

                    <BulletTriggerEventFields
                      trigger={currentTrigger}
                      onUpdate={(patch) => updateTrigger(selectedSegmentIdx, selectedTriggerIdx, patch)}
                    />
                  </div>

                  {/* 条件编辑 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold text-slate-300">条件</div>
                      <button
                        onClick={() => addCondition(selectedSegmentIdx, selectedTriggerIdx)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-semibold"
                      >
                        新增
                      </button>
                    </div>

                    {!currentTrigger.conditions || currentTrigger.conditions.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2">暂无条件</div>
                    ) : (
                      <div className="space-y-3">
                        {currentTrigger.conditions.map((cond, condIdx) => (
                          <div key={condIdx} className="bg-slate-900/50 border border-slate-700 rounded p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-slate-400">条件类型</label>
                              <button
                                onClick={() => removeCondition(selectedSegmentIdx, selectedTriggerIdx, condIdx)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                              >
                                删除
                              </button>
                            </div>
                            <select
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                              value={cond.type}
                              onChange={(e) => {
                                const newType = e.target.value as BulletConditionType;
                                updateCondition(selectedSegmentIdx, selectedTriggerIdx, condIdx, {
                                  type: newType,
                                  params: {}
                                });
                              }}
                            >
                              {bulletConditionTypes.map(t => (
                                <option key={t} value={t}>{bulletConditionLabels[t]}</option>
                              ))}
                            </select>

                            <BulletConditionFields
                              condition={cond}
                              onUpdate={(patch) => updateCondition(selectedSegmentIdx, selectedTriggerIdx, condIdx, patch)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 行为编辑 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold text-slate-300">行为</div>
                      <button
                        onClick={() => addAction(selectedSegmentIdx, selectedTriggerIdx)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-semibold"
                      >
                        新增
                      </button>
                    </div>

                    {!currentTrigger.actions || currentTrigger.actions.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2">暂无行为</div>
                    ) : (
                      <div className="space-y-3">
                        {currentTrigger.actions.map((action, actIdx) => (
                          <div key={actIdx} className="bg-slate-900/50 border border-slate-700 rounded p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-slate-400">行为类型</label>
                              <button
                                onClick={() => removeAction(selectedSegmentIdx, selectedTriggerIdx, actIdx)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                              >
                                删除
                              </button>
                            </div>
                            <select
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                              value={action.type}
                              onChange={(e) => {
                                const newType = e.target.value as BulletActionType;
                                updateAction(selectedSegmentIdx, selectedTriggerIdx, actIdx, {
                                  type: newType,
                                  params: {}
                                });
                              }}
                            >
                              {bulletActionTypes.map(t => (
                                <option key={t} value={t}>{bulletActionLabels[t]}</option>
                              ))}
                            </select>

                            <BulletActionFields
                              action={action}
                              onUpdate={(patch) => updateAction(selectedSegmentIdx, selectedTriggerIdx, actIdx, patch)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast提示 */}
      {toast && (
        <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg backdrop-blur-sm text-sm border ${toast.startsWith('✓') ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-red-900/50 border-red-700 text-red-200'}`}>
          {toast}
        </div>
      )}

      {/* 演示预览 */}
      <BulletDemoPreview
        bulletConfig={draft}
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
      />
    </div>
  );
};

export default BulletEditor;
