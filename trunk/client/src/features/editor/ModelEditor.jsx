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
        console.error(err);
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

  const applyToList = () => {
    setModels((prev) => prev.map((m) => (m.id === modelData.id ? structuredClone(modelData) : m)));
    setToast('已应用到列表');
    setTimeout(() => setToast(''), 1200);
  };

  const addModel = () => {
    const newId = `model_${Date.now()}`;
    const base = {
      id: newId,
      name: '新模型',
      type: '2d_sequence',
      scale: 1,
      defaultAction: 'idle'
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
            <div className="flex gap-2 pt-2">
              <button className="flex-1 px-3 py-2 bg-blue-600 rounded" onClick={applyToList}>应用</button>
              <button className="px-3 py-2 bg-red-600 rounded" onClick={removeModel}>删除</button>
            </div>
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
