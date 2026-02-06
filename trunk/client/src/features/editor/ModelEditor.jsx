import React, { useEffect, useState } from 'react';
import ModelEditorPreview from './ModelEditorPreview.jsx';

const fetchModelConfigs = async () => {
  const res = await fetch('/config/model.json');
  if (!res.ok) throw new Error('加载 model.json 失败');
  return res.json();
};

const ModelEditor = () => {
  const [models, setModels] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [toast, setToast] = useState('');
  const [cameraMode, setCameraMode] = useState('game');
  const [selectedAction, setSelectedAction] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  const [dirHandle, setDirHandle] = useState(null);
  const [savePathName, setSavePathName] = useState('');

  useEffect(() => {
    fetchModelConfigs()
      .then((data) => {
        if (data && data.length > 0) {
          setModels(data);
          setSelectedId(data[0].id);
          setModelData(structuredClone(data[0]));
        } else {
          const base = {
            id: 'new_model',
            name: '新模型',
            type: '2d_sequence',
            scale: 1,
            defaultAction: 'idle'
          };
          setModels([base]);
          setSelectedId(base.id);
          setModelData(structuredClone(base));
        }
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);7
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const found = models.find((m) => m.id === selectedId);
    if (found) setModelData(structuredClone(found));
  }, [selectedId, models]);

  const updateField = (key, value) => {
    setModelData((prev) => ({ ...prev, [key]: value }));
  };

  const updateRotation = (axis, value) => {
    setModelData((prev) => ({
      ...prev,
      rotation: {
        ...(prev?.rotation ?? {}),
        [axis]: value,
      },
    }));
  };

  const updateBlackboard = (key, field, value) => {
    setModelData((prev) => ({
      ...prev,
      blackboard: {
        ...(prev?.blackboard ?? {}),
        [key]: {
          ...(prev?.blackboard?.[key] ?? {}),
          [field]: Number(value)
        }
      }
    }));
  };

  const addBlackboardField = (fieldName, fieldType) => {
    if (!fieldName) return;
    let initialValue = {};
    
    if (fieldType === 'number') {
      initialValue = 0;
    } else if (fieldType === 'vector3') {
      initialValue = { x: 0, y: 0, z: 0 };
    } else if (fieldType === 'string') {
      initialValue = '';
    }
    
    setModelData((prev) => ({
      ...prev,
      blackboard: {
        ...(prev?.blackboard ?? {}),
        [fieldName]: initialValue
      }
    }));
  };

  const removeBlackboardField = (fieldName) => {
    setModelData((prev) => {
      const newBlackboard = { ...(prev?.blackboard ?? {}) };
      delete newBlackboard[fieldName];
      return {
        ...prev,
        blackboard: newBlackboard
      };
    });
  };

  const addModel = () => {
    const newId = `model_${Date.now()}`;
    const base = {
      id: newId,
      name: '新模型',
      type: '2d_sequence',
      scale: 1,
      defaultAction: 'idle',
      rotation: { x: 0, y: 0, z: 0 }
    };
    setModels((prev) => [...prev, base]);
    setSelectedId(newId);
    setModelData(structuredClone(base));
  };

  const removeModel = () => {
    if (!modelData) return;
    const next = models.filter((m) => m.id !== modelData.id);
    setModels(next);
    if (next.length > 0) {
      setSelectedId(next[0].id);
      setModelData(structuredClone(next[0]));
    } else {
      setSelectedId(null);
      setModelData(null);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(models, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectSavePath = async () => {
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
      if (err?.name === 'AbortError' || err?.name === 'NotAllowedError') return;
      setToast('✗ 选择路径失败: ' + err.message);
      setTimeout(() => setToast(''), 2000);
    }
  };

  const saveConfigs = async () => {
    if (!modelData) return;
    let list = [...models];
    const idx = list.findIndex((m) => m.id === modelData.id);
    if (idx >= 0) list[idx] = structuredClone(modelData);
    else list.push(structuredClone(modelData));

    try {
      let handle = dirHandle;
      if (handle) {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          const req = await handle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') {
            handle = null;
            setDirHandle(null);
            setSavePathName('');
          }
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

      const fileHandle = await handle.getFileHandle('model.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(list, null, 2));
      await writable.close();

      setModels(list);
      setToast('✓ 已保存 model.json');
      setTimeout(() => setToast(''), 1500);
    } catch (err) {
      console.error(err);
      setToast('✗ 保存失败: ' + err.message);
      setTimeout(() => setToast(''), 2500);
    }
  };


  if (status === 'loading') {
    return <div className="w-full h-screen bg-gray-900 text-white flex items-center justify-center">加载中...</div>;
  }

  if (status === 'error') {
    return <div className="w-full h-screen bg-gray-900 text-white flex items-center justify-center">加载失败</div>;
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-gray-100 flex">
      {/* 左侧属性 */}
      <div className="w-[380px] border-r border-gray-700 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">模型编辑器</h2>
          <div className="flex gap-2">
            <button className="px-2 py-1 text-xs bg-emerald-600 rounded" onClick={addModel}>新增</button>
            <button className="px-2 py-1 text-xs bg-gray-700 rounded" onClick={downloadJson}>导出</button>
          </div>
        </div>

        <label className="text-xs text-gray-400">选择模型</label>
        <select
          className="w-full mt-1 mb-4 bg-gray-800 border border-gray-700 rounded px-2 py-1"
          value={selectedId || ''}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
          ))}
        </select>

        <button
          onClick={selectSavePath}
          className="w-full mb-4 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-left border border-gray-700 truncate"
          title={savePathName ? `当前路径: ${savePathName}` : '选择保存路径'}
        >
          {savePathName ? `📁 ${savePathName}` : '📁 选择保存路径'}
        </button>

        <button
          onClick={saveConfigs}
          className="w-full mb-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
        >
          保存 model.json
        </button>

        {modelData && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">ID</label>
              <input
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={modelData.id}
                onChange={(e) => updateField('id', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">名称</label>
              <input
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={modelData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">类型</label>
              <select
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={modelData.type}
                onChange={(e) => updateField('type', e.target.value)}
              >
                <option value="none">None (无实体)</option>
                <option value="2d_image">2D 图片</option>
                <option value="2d_sequence">2D 序列帧</option>
                <option value="2d_spine">2D Spine</option>
                <option value="3d_fbx">3D FBX</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">资源路径</label>
              <input
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                placeholder="/unit/model.json 或 /effect/fire_ball.json"
                value={modelData.path ?? ''}
                onChange={(e) => updateField('path', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">缩放</label>
              <input
                type="number"
                step="0.01"
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={modelData.scale ?? 1}
                onChange={(e) => updateField('scale', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">初始旋转（角度）</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="1"
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={modelData.rotation?.x ?? 0}
                  onChange={(e) => updateRotation('x', Number(e.target.value))}
                  placeholder="X"
                />
                <input
                  type="number"
                  step="1"
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={modelData.rotation?.y ?? 0}
                  onChange={(e) => updateRotation('y', Number(e.target.value))}
                  placeholder="Y"
                />
                <input
                  type="number"
                  step="1"
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                  value={modelData.rotation?.z ?? 0}
                  onChange={(e) => updateRotation('z', Number(e.target.value))}
                  placeholder="Z"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">默认动作</label>
              <input
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={modelData.defaultAction ?? ''}
                onChange={(e) => updateField('defaultAction', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">碰撞半径</label>
              <input
                type="number"
                step="0.01"
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
                value={modelData.radius ?? 0}
                onChange={(e) => updateField('radius', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-2">黑板数据</label>
              <div className="space-y-2 bg-gray-800/50 p-2 rounded">
                {modelData.blackboard && Object.entries(modelData.blackboard).map(([fieldName, fieldValue]) => (
                  <div key={fieldName}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-500">{fieldName}</label>
                      <button
                        onClick={() => removeBlackboardField(fieldName)}
                        className="text-xs px-1 py-0.5 bg-red-700 hover:bg-red-600 rounded"
                      >
                        删除
                      </button>
                    </div>
                    {typeof fieldValue === 'object' && fieldValue !== null && 'x' in fieldValue ? (
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="number"
                          step="0.1"
                          className="bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs"
                          value={fieldValue.x ?? 0}
                          onChange={(e) => updateBlackboard(fieldName, 'x', e.target.value)}
                          placeholder="X"
                        />
                        <input
                          type="number"
                          step="0.1"
                          className="bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs"
                          value={fieldValue.y ?? 0}
                          onChange={(e) => updateBlackboard(fieldName, 'y', e.target.value)}
                          placeholder="Y"
                        />
                        <input
                          type="number"
                          step="0.1"
                          className="bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs"
                          value={fieldValue.z ?? 0}
                          onChange={(e) => updateBlackboard(fieldName, 'z', e.target.value)}
                          placeholder="Z"
                        />
                      </div>
                    ) : typeof fieldValue === 'number' ? (
                      <input
                        type="number"
                        step="0.1"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs"
                        value={fieldValue}
                        onChange={(e) => setModelData((prev) => ({
                          ...prev,
                          blackboard: { ...prev.blackboard, [fieldName]: Number(e.target.value) }
                        }))}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs"
                        value={fieldValue || ''}
                        onChange={(e) => setModelData((prev) => ({
                          ...prev,
                          blackboard: { ...prev.blackboard, [fieldName]: e.target.value }
                        }))}
                      />
                    )}
                  </div>
                ))}
                
                {/* 新建字段 */}
                <div className={modelData.blackboard && Object.keys(modelData.blackboard).length > 0 ? "pt-2 border-t border-gray-700" : ""}>
                  <label className="text-xs text-gray-500 block mb-1">新建字段</label>
                  <div className="space-y-1">
                    <input
                      id="newFieldName"
                      type="text"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs"
                      placeholder="字段名"
                    />
                    <div className="flex gap-1">
                      <select
                        id="newFieldType"
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-1 py-1 text-xs"
                        defaultValue="vector3"
                      >
                        <option value="vector3">Vector3</option>
                        <option value="number">Number</option>
                        <option value="string">String</option>
                      </select>
                      <button
                        onClick={() => {
                          const name = document.getElementById('newFieldName').value;
                          const type = document.getElementById('newFieldType').value;
                          if (name && !modelData.blackboard?.[name]) {
                            addBlackboardField(name, type);
                            document.getElementById('newFieldName').value = '';
                          }
                        }}
                        className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 rounded"
                      >
                        新建
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-2" />
          </div>
        )}

        {availableActions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <label className="text-xs text-gray-400 mb-2 block">可用动作</label>
            <div className="space-y-1">
              {availableActions.map((action) => (
                <button
                  key={action}
                  className={`w-full px-2 py-1 text-xs text-left rounded ${
                    selectedAction === action
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                  onClick={() => setSelectedAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {toast && <div className="mt-3 text-xs text-emerald-400">{toast}</div>}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button className="w-full px-3 py-2 bg-red-600 rounded" onClick={removeModel}>删除</button>
        </div>
      </div>

      {/* 右侧预览 */}
      <div className="flex-1 p-4">
        <div className="h-full rounded-xl border border-gray-700 bg-gray-900/60 relative overflow-hidden">
          <div className="absolute top-16 right-3 z-20">
            <button
              className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded"
              onClick={() => setCameraMode((prev) => (prev === 'game' ? 'free' : 'game'))}
            >
              {cameraMode === 'free' ? '自由视角' : '游戏视角'}
            </button>
          </div>
          {modelData && (
            <ModelEditorPreview
              modelData={modelData}
              cameraMode={cameraMode}
              selectedAction={selectedAction}
              onActionsLoaded={setAvailableActions}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelEditor;
