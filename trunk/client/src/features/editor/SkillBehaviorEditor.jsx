import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getDefaultDataForType } from './SkillBehaviorEditor/templates';
import DamageFields from './SkillBehaviorEditor/DamageFields';
import MoveByFields from './SkillBehaviorEditor/MoveByFields';
import SkillDemoPreview from './SkillBehaviorEditor/DemoPreview';

const eventTypes = [
  'damage',
  'moveBy',
  'effect',
  'shake',
  'bullet',
  'sound',
  'animation',
  'end'
];

const fetchSkillConfigs = async () => {
  const res = await fetch('/config/skill_behavior.json');
  if (!res.ok) throw new Error('无法加载 skill_behavior.json');
  return res.json();
};

const makeDefaultEvent = (id = 1) => {
  const data = getDefaultDataForType('damage');
  return {
    id,
    type: 'damage',
    time: 0,
    data,
    _dataText: JSON.stringify(data, null, 2),
    _dataError: ''
  };
};

const makeDefaultSegment = (id = 1) => ({
  id,
  name: `分段-${id}`,
  events: [makeDefaultEvent(1)]
});

const normalizeSkill = (skill) => ({
  id: skill?.id ?? 1,
  segments: (skill?.segments ?? []).map((s, sIdx) => ({
    id: s.id ?? (sIdx + 1),
    name: s.name || `分段-${sIdx + 1}`,
    events: (s.events ?? []).map((e, eIdx) => {
      const type = e.type || 'damage';
      const data = e.data ?? getDefaultDataForType(type);
      return {
        id: e.id ?? (eIdx + 1),
        type,
        time: Number(e.time) || 0,
        data,
        _dataText: JSON.stringify(data, null, 2),
        _dataError: ''
      };
    })
  }))
});

const stripUiFields = (skill) => ({
  id: Number(skill.id) || 0,
  segments: (skill.segments ?? []).map((s) => ({
    id: Number(s.id) || 0,
    name: s.name || '分段',
    events: (s.events ?? []).map((e) => ({
      id: Number(e.id) || 0,
      type: e.type,
      time: Number(e.time) || 0,
      data: e.data && typeof e.data === 'object' ? e.data : {}
    }))
  }))
});

const SkillBehaviorEditor = () => {
  const [skills, setSkills] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);
  const [selectedEventIdx, setSelectedEventIdx] = useState(0);
  const [timelineViewMs, setTimelineViewMs] = useState(0); // 仅用于编辑时的可视总时长
  const [status, setStatus] = useState('loading');
  const [dirHandle, setDirHandle] = useState(null);
  const [savePathName, setSavePathName] = useState('');
  const [toast, setToast] = useState('');
  const [demoPreviewOpen, setDemoPreviewOpen] = useState(false);
  const timelineRef = useRef(null);
  const timelineDraggingRef = useRef(false);
  const timelineDragIdxRef = useRef(null);
  const dragStartMouseTimeRef = useRef(0);
  const dragStartEventTimeRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSkillConfigs();
        const list = Array.isArray(data) ? data.map(normalizeSkill) : [];
        if (list.length === 0) {
          const base = { id: 1, segments: [makeDefaultSegment()] };
          setSkills([base]);
          setSelectedId(1);
          setDraft(normalizeSkill(base));
        } else {
          setSkills(list);
          setSelectedId(list[0].id);
          setDraft(normalizeSkill(list[0]));
        }
        setStatus('ready');
      } catch (err) {
        console.error(err);
        const base = { id: 1, segments: [makeDefaultSegment()] };
        setSkills([base]);
        setSelectedId(1);
        setDraft(normalizeSkill(base));
        setStatus('error');
      }
    };
    load();
  }, []);

  useEffect(() => {
    const found = skills.find((s) => s.id === selectedId);
    if (found) {
      setDraft(normalizeSkill(found));
      setSelectedSegmentIdx(0);
      setSelectedEventIdx(0);
    }
  }, [selectedId, skills]);

  const timelineLength = useMemo(() => {
    if (!draft?.segments?.[selectedSegmentIdx]?.events?.length) return 0;
    const segment = draft.segments[selectedSegmentIdx];
    return segment.events.reduce((max, e) => Math.max(max, Number(e.time) || 0), 0);
  }, [draft, selectedSegmentIdx]);

  const timeFromClientX = (clientX) => {
    const container = timelineRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * (viewTimelineLength || 1);
  };

  const nearestEventIdx = (targetTime) => {
    const events = draft?.segments?.[selectedSegmentIdx]?.events ?? [];
    if (events.length === 0) return null;
    let bestIdx = 0;
    let bestDist = Math.abs((Number(events[0].time) || 0) - targetTime);
    for (let i = 1; i < events.length; i++) {
      const dist = Math.abs((Number(events[i].time) || 0) - targetTime);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const updateEventTime = (idx, newTime) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      if (!next?.segments?.[selectedSegmentIdx]?.events?.[idx]) return prev;
      next.segments[selectedSegmentIdx].events[idx].time = Math.max(0, Math.round(newTime));
      return next;
    });
  };

  const viewTimelineLength = useMemo(() => {
    const base = timelineViewMs || timelineLength || 1000; // 默认给个 1000ms 方便看
    return Math.max(base, timelineLength);
  }, [timelineLength, timelineViewMs]);

  // 当切换分段或事件超出当前视图时长时，自动扩展视图时长，不覆盖用户已调大的值
  useEffect(() => {
    setTimelineViewMs((prev) => {
      const minNeed = timelineLength || 1000;
      return Math.max(prev || 0, minNeed);
    });
  }, [selectedSegmentIdx, timelineLength]);

  const hasError = useMemo(() => {
    if (!draft?.segments?.[selectedSegmentIdx]?.events) return false;
    return draft.segments[selectedSegmentIdx].events.some((e) => Boolean(e._dataError));
  }, [draft, selectedSegmentIdx]);

  const updateEvent = (idx, patch) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.segments[selectedSegmentIdx].events[idx] = { ...next.segments[selectedSegmentIdx].events[idx], ...patch };
      return next;
    });
  };

  // 更新事件 data，并保持 _dataText 同步
  const updateEventDataFields = (idx, updater) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const evt = next.segments[selectedSegmentIdx].events[idx];
      const data = structuredClone(evt.data || {});
      updater(data);
      evt.data = data;
      try {
        evt._dataText = JSON.stringify(data, null, 2);
        evt._dataError = '';
      } catch (err) {
        evt._dataError = err.message;
      }
      return next;
    });
  };

  const updateEventDataText = (idx, text) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const evt = next.segments[selectedSegmentIdx].events[idx];
      evt._dataText = text;
      try {
        evt.data = text.trim() ? JSON.parse(text) : {};
        evt._dataError = '';
      } catch (err) {
        evt._dataError = err.message;
      }
      return next;
    });
  };

  const addSegment = () => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      if (!next.segments) next.segments = [];
      const maxId = Math.max(0, ...next.segments.map((s) => Number(s.id) || 0));
      next.segments.push(makeDefaultSegment(maxId + 1));
      return next;
    });
  };

  const removeSegment = (idx) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.segments.splice(idx, 1);
      if (selectedSegmentIdx >= next.segments.length && selectedSegmentIdx > 0) {
        setSelectedSegmentIdx(selectedSegmentIdx - 1);
      }
      return next;
    });
  };

  const addEvent = () => {
    // 先计算新事件索引和时间
    const segment = draft.segments[selectedSegmentIdx];
    const newEventIdx = segment.events.length;
    let newTime = 0;
    if (segment.events.length > 0) {
      const lastEventTime = Number(segment.events[segment.events.length - 1].time) || 0;
      newTime = Math.round((lastEventTime + viewTimelineLength) / 2);
    }

    setDraft((prev) => {
      const next = structuredClone(prev);
      const seg = next.segments[selectedSegmentIdx];
      if (!seg.events) seg.events = [];
      const maxId = Math.max(0, ...seg.events.map((e) => Number(e.id) || 0));
      const newEvent = makeDefaultEvent(maxId + 1);
      newEvent.time = newTime;
      seg.events.push(newEvent);
      return next;
    });

    // 立即选中新事件
    setSelectedEventIdx(newEventIdx);
  };

  const removeEvent = (idx) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.segments[selectedSegmentIdx].events.splice(idx, 1);
      if (selectedEventIdx >= next.segments[selectedSegmentIdx].events.length && selectedEventIdx > 0) {
        setSelectedEventIdx(selectedEventIdx - 1);
      }
      return next;
    });
  };

  const duplicateEvent = (idx) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const evt = next.segments[selectedSegmentIdx].events[idx];
      const maxId = Math.max(0, ...next.segments[selectedSegmentIdx].events.map((e) => Number(e.id) || 0));
      next.segments[selectedSegmentIdx].events.splice(idx + 1, 0, {
        ...evt,
        id: maxId + 1,
        time: (Number(evt.time) || 0) + 100,
        _dataText: evt._dataText,
        _dataError: evt._dataError
      });
      return next;
    });
  };

  const sortEvents = () => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const events = next.segments[selectedSegmentIdx].events;
      // 先按时间排序
      events.sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0));
      // 然后重新分配ID，按序号为1,2,3,...
      events.forEach((evt, i) => {
        evt.id = i + 1;
      });
      // 调整当前选中的事件索引（保持原位置）
      return next;
    });
  };

  const persistDraftToList = () => {
    if (!draft) return skills;
    return skills.map((s) => (s.id === draft.id ? structuredClone(draft) : s));
  };

  const saveConfigs = async () => {
    if (hasError) {
      setToast('请先修复 JSON 数据错误');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    const merged = persistDraftToList();
    const cleaned = merged.map(stripUiFields);

    try {
      let handle = dirHandle;
      if (handle) {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          const req = await handle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') handle = null;
        }
      }
      if (!handle) {
        handle = await window.showDirectoryPicker();
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

      const fileHandle = await handle.getFileHandle('skill_behavior.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(cleaned, null, 2));
      await writable.close();

      setSkills(merged);
      setToast('✓ 已保存 skill_behavior.json');
      setTimeout(() => setToast(''), 1500);
    } catch (err) {
      console.error(err);
      setToast('✗ 保存失败: ' + err.message);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const createSkill = () => {
    const nextId = Math.max(0, ...skills.map((s) => Number(s.id) || 0)) + 1;
    const base = normalizeSkill({ id: nextId, segments: [makeDefaultSegment(1)] });
    setSkills((prev) => [...prev, base]);
    setSelectedId(nextId);
    setDraft(base);
    setSelectedSegmentIdx(0);
    setSelectedEventIdx(0);
  };

  const deleteSkill = () => {
    if (!draft) return;
    const list = skills.filter((s) => s.id !== draft.id);
    setSkills(list);
    if (list.length > 0) {
      setSelectedId(list[0].id);
      setDraft(normalizeSkill(list[0]));
    } else {
      const base = normalizeSkill({ id: 1, segments: [makeDefaultSegment()] });
      setSkills([base]);
      setSelectedId(1);
      setDraft(base);
    }
  };

  if (status === 'loading') {
    return <div className="w-full h-screen bg-black text-white flex items-center justify-center">加载配置...</div>;
  }

  return (
    <div className="w-full h-screen bg-slate-900 text-slate-100 flex">
      <div className="w-[360px] border-r border-slate-800 bg-slate-950/80 backdrop-blur-sm flex flex-col">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex gap-2">
            <button onClick={createSkill} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold">新建技能</button>
            <button onClick={deleteSkill} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold">删除</button>
          </div>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {skills.map((s) => (
              <option key={s.id} value={s.id}>技能 {s.id}</option>
            ))}
          </select>
          <div className="space-y-2">
            <button
              onClick={saveConfigs}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
            >
              保存 skill_behavior.json
            </button>
            <button
              onClick={async () => {
                try {
                  const handle = await window.showDirectoryPicker();
                  setDirHandle(handle);
                  let fullPath = '';
                  try {
                    const pathArray = await handle.getFullPath();
                    fullPath = '/' + pathArray.join('/');
                  } catch (e) {
                    fullPath = handle.name;
                  }
                  setSavePathName(fullPath);
                } catch (err) {
                  if (err?.name === 'AbortError') return;
                  setToast('✗ 选择路径失败: ' + err.message);
                  setTimeout(() => setToast(''), 2000);
                }
              }}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold text-left px-3 border border-slate-600 truncate"
              title={savePathName ? `当前路径: ${savePathName}` : '选择保存路径'}
            >
              {savePathName ? `📁 ${savePathName}` : '📁 选择保存路径'}
            </button>
          </div>
          {status === 'error' && (
            <div className="text-xs text-amber-300 bg-amber-900/40 border border-amber-700 rounded p-2">
              读取 skill_behavior.json 失败，已使用默认模板。
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm flex flex-col">
          <div className="space-y-1">
            <div className="text-slate-300 text-xs">总分段数</div>
            <div className="text-lg font-semibold">{draft?.segments?.length ?? 0}</div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-300 text-xs">当前分段事件数</div>
            <div className="text-lg font-semibold">{draft?.segments?.[selectedSegmentIdx]?.events?.length ?? 0}</div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-300 text-xs">事件时间轴长度</div>
            <div className="text-lg font-semibold">{timelineLength} ms</div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-300 text-xs">视图时长(仅编辑)</div>
            <div className="text-lg font-semibold">{viewTimelineLength} ms</div>
          </div>
          {hasError && (
            <div className="text-xs text-red-300 bg-red-900/40 border border-red-700 rounded p-2">
              JSON 数据存在错误，修复后才能保存。
            </div>
          )}
          
          <div className="border-t border-slate-700 pt-3 mt-3 flex-1 flex flex-col">
            <div className="text-xs text-slate-300 mb-2 font-semibold">分段列表</div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {(draft?.segments ?? []).map((seg, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedSegmentIdx(idx);
                    setSelectedEventIdx(0);
                  }}
                  className={`w-full text-left px-2 py-2 rounded text-xs transition-all ${
                    selectedSegmentIdx === idx
                      ? 'bg-yellow-900/60 border border-yellow-700 text-yellow-100'
                      : 'bg-slate-800/40 border border-slate-700 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold">#{seg.id} {seg.name}</div>
                  <div className="text-[10px] text-slate-400">{seg.events?.length ?? 0} 事件</div>
                </button>
              ))}
              {(!draft?.segments || draft.segments.length === 0) && (
                <div className="text-xs text-slate-400 text-center py-4">暂无分段</div>
              )}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
              <button onClick={addSegment} className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-semibold">新增分段</button>
              <button onClick={() => removeSegment(selectedSegmentIdx)} className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold">删除分段</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between pt-16">
          <div>
            <div className="text-xs text-slate-400">分段 #{draft?.segments?.[selectedSegmentIdx]?.id}</div>
            <div className="text-2xl font-bold">{draft?.segments?.[selectedSegmentIdx]?.name}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={sortEvents} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">重排ID</button>
            <button onClick={addEvent} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-sm">新增事件</button>
            <button
              onClick={() => setDemoPreviewOpen(true)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold"
              title="演示当前技能效果"
            >
              🎮 演示
            </button>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-300 gap-3">
            <span>事件时间轴</span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>视图总时长(ms)</span>
              <input
                type="number"
                className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                value={timelineViewMs}
                onChange={(e) => setTimelineViewMs(Math.max(0, Number(e.target.value) || 0))}
                placeholder={String(viewTimelineLength)}
                min={0}
              />
            </div>
          </div>
          <div
            ref={timelineRef}
            className="relative h-10 bg-slate-900 rounded overflow-hidden cursor-pointer select-none"
            onMouseMove={(e) => {
              if (!timelineDraggingRef.current) return;
              const idx = timelineDragIdxRef.current;
              if (idx === null || idx === undefined) return;
              const mouseTime = timeFromClientX(e.clientX);
              const delta = mouseTime - dragStartMouseTimeRef.current;
              const newTime = dragStartEventTimeRef.current + delta;
              updateEventTime(idx, newTime);
            }}
            onMouseUp={() => { timelineDraggingRef.current = false; timelineDragIdxRef.current = null; }}
            onMouseLeave={() => { timelineDraggingRef.current = false; timelineDragIdxRef.current = null; }}
            onMouseDown={(e) => {
              // 防止拖动时选中文本
              e.preventDefault();
              // 点击轴空白：选最近事件，记录相对位移，不立刻改时间
              if (!draft?.segments?.[selectedSegmentIdx]?.events?.length) return;
              const mouseTime = timeFromClientX(e.clientX);
              const idx = nearestEventIdx(mouseTime);
              if (idx === null) return;
              setSelectedEventIdx(idx);
              timelineDraggingRef.current = true;
              timelineDragIdxRef.current = idx;
              dragStartMouseTimeRef.current = mouseTime;
              dragStartEventTimeRef.current = Number(draft.segments[selectedSegmentIdx].events[idx].time) || 0;
            }}
          >
            {draft?.segments?.[selectedSegmentIdx]?.events?.map((evt, idx) => {
              const pos = viewTimelineLength > 0 ? Math.min(100, Math.max(0, (Number(evt.time) || 0) / viewTimelineLength * 100)) : 0;
              const color = {
                damage: '#f87171',
                effect: '#60a5fa',
                shake: '#fbbf24',
                bullet: '#34d399',
                sound: '#c084fc',
                animation: '#38bdf8',
                end: '#e5e7eb'
              }[evt.type] || '#a5b4fc';
              const isSelected = selectedEventIdx === idx;
              return (
                <div
                  key={idx}
                  className={`absolute top-0 h-full flex items-center cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                  style={{ left: `${pos}%` }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.target.closest('.event-label')) return; // 点文字不选、不拖
                    const mouseTime = timeFromClientX(e.clientX);
                    setSelectedEventIdx(idx);
                    timelineDraggingRef.current = true;
                    timelineDragIdxRef.current = idx;
                    dragStartMouseTimeRef.current = mouseTime;
                    dragStartEventTimeRef.current = Number(evt.time) || 0;
                  }}
                >
                  <div className="w-1 h-full" style={{ background: color }} />
                  <div
                    className={`ml-1 text-[10px] rounded px-1 event-label ${isSelected ? 'bg-yellow-900/80 text-yellow-200' : 'text-slate-200 bg-slate-900/80'}`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    #{evt.id}@{evt.time}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedEventIdx >= 0 && draft?.segments?.[selectedSegmentIdx]?.events?.[selectedEventIdx] && (() => {
          const evt = draft.segments[selectedSegmentIdx].events[selectedEventIdx];
          const events = draft.segments[selectedSegmentIdx].events;
          return (
            <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>ID</span>
                    <select
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                      value={evt.id}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (Number.isNaN(val)) return;
                        const idx = events.findIndex((x) => Number(x.id) === val);
                        if (idx >= 0) setSelectedEventIdx(idx);
                      }}
                    >
                      {events.map((x) => (
                        <option key={x.id} value={x.id}>#{x.id}</option>
                      ))}
                    </select>
                  </div>
                  <select
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                    value={evt.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      const nextData = getDefaultDataForType(nextType);
                      updateEvent(selectedEventIdx, {
                        type: nextType,
                        data: nextData,
                        _dataText: JSON.stringify(nextData, null, 2),
                        _dataError: ''
                      });
                    }}
                  >
                    {eventTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">时间(s)</span>
                    <input
                      type="number"
                      step="0.1"
                      className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm"
                      value={evt.time}
                      onChange={(e) => updateEvent(selectedEventIdx, { time: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => duplicateEvent(selectedEventIdx)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">复制</button>
                  <button onClick={() => removeEvent(selectedEventIdx)} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">删除</button>
                </div>
              </div>

              <div className="space-y-1">
                {evt.type === 'damage' && (
                  <DamageFields
                    evt={evt}
                    onUpdate={(updater) => updateEventDataFields(selectedEventIdx, updater)}
                  />
                )}
                {evt.type === 'moveBy' && (
                  <MoveByFields
                    evt={evt}
                    onUpdate={(updater) => updateEventDataFields(selectedEventIdx, updater)}
                  />
                )}

                <div className="text-xs text-slate-400">data (JSON)</div>
                <textarea
                  className={`w-full bg-slate-900 border rounded px-2 py-2 text-xs font-mono leading-relaxed min-h-[140px] ${evt._dataError ? 'border-red-500' : 'border-slate-700'}`}
                  value={evt._dataText}
                  onChange={(e) => updateEventDataText(selectedEventIdx, e.target.value)}
                  spellCheck={false}
                />
                {evt._dataError && <div className="text-xs text-red-300">{evt._dataError}</div>}
              </div>
            </div>
          );
        })()}
      </div>

      {toast && (
        <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg backdrop-blur-sm text-sm border ${toast.startsWith('✓') ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-red-900/50 border-red-700 text-red-200'}`}>
          {toast}
        </div>
      )}

      <SkillDemoPreview
        skillConfig={draft}
        isOpen={demoPreviewOpen}
        onClose={() => setDemoPreviewOpen(false)}
      />
    </div>
  );
};

export default SkillBehaviorEditor;
