import React, { useEffect, useMemo, useRef, useState } from 'react';

const fetchBuildingConfigs = async () => {
  const res = await fetch('/config/building_model.json');
  if (!res.ok) throw new Error('加载 building_model.json 失败');
  return res.json();
};

const defaultGrid = 50;

const BuildingModelEditor = () => {
  const [models, setModels] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [modelData, setModelData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [dirHandle, setDirHandle] = useState(null);
  const [savePathName, setSavePathName] = useState('');
  const [toast, setToast] = useState('');
  const [imageVersion, setImageVersion] = useState(0);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const isDraggingImgRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // 加载配置
  useEffect(() => {
    const makeDefault = () => {
      const base = {
        id: 1,
        name: '新建筑-1',
        gridWidth: defaultGrid,
        gridHeight: defaultGrid,
        imagePath: '',
        anchorX: 0,
        anchorY: 0,
        occupiedCells: []
      };
      setModels([base]);
      setSelectedId(1);
      setModelData(structuredClone(base));
    };

    fetchBuildingConfigs()
      .then((data) => {
        if (data && data.length > 0) {
          setModels(data);
          setSelectedId(data[0].id);
          setModelData(structuredClone(data[0]));
        } else {
          makeDefault();
        }
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');
      });
  }, []);

  // 当选择变化时更新 modelData
  useEffect(() => {
    if (!selectedId) return;
    const found = models.find((m) => m.id === selectedId);
    if (found) {
      setModelData(structuredClone(found));
    }
  }, [selectedId, models]);

  // 加载图片
  useEffect(() => {
    if (!modelData?.imagePath) {
      imageRef.current = null;
      setImageVersion((v) => v + 1);
      return;
    }
    const img = new Image();
    img.src = modelData.imagePath;
    img.onload = () => {
      imageRef.current = img;
      setImageVersion((v) => v + 1);
    };
    img.onerror = () => {
      imageRef.current = null;
      setImageVersion((v) => v + 1);
      console.warn('加载图片失败', modelData.imagePath);
    };
  }, [modelData?.imagePath]);

  const gridWidth = modelData?.gridWidth || defaultGrid;
  const gridHeight = modelData?.gridHeight || defaultGrid;

  // 画布渲染
  useEffect(() => {
    if (!canvasRef.current || !modelData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const padding = 20;
    const maxWidth = canvas.parentElement?.clientWidth || 800;
    const maxHeight = canvas.parentElement?.clientHeight || 600;
    canvas.width = maxWidth;
    canvas.height = maxHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 网格线，确保中心点在格子中心
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    // 中心格子的左边界和上边界
    const gridLeft = centerX - gridWidth / 2;
    const gridTop = centerY - gridHeight / 2;
    // 从中心向右和向下绘制
    for (let x = gridLeft; x <= canvas.width; x += gridWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // 从中心向左绘制
    for (let x = gridLeft - gridWidth; x >= 0; x -= gridWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // 从中心向下绘制
    for (let y = gridTop; y <= canvas.height; y += gridHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    // 从中心向上绘制
    for (let y = gridTop - gridHeight; y >= 0; y -= gridHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 中心轴
    ctx.strokeStyle = 'rgba(59,130,246,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // 占格
    ctx.fillStyle = 'rgba(34,197,94,0.35)';
    (modelData.occupiedCells || []).forEach(([gx, gy]) => {
      const px = centerX + (gx - 0.5) * gridWidth;
      const py = centerY + (gy - 0.5) * gridHeight;
      ctx.fillRect(px, py, gridWidth, gridHeight);
    });

    // 绘制图片
    if (imageRef.current) {
      const img = imageRef.current;
      const imgX = centerX - (modelData.anchorX || 0);
      const imgY = centerY - (modelData.anchorY || 0);
      ctx.drawImage(img, imgX, imgY);
      // 锚点标记
      ctx.fillStyle = 'rgba(248,113,113,0.9)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(248,113,113,0.9)';
      ctx.strokeRect(imgX, imgY, img.width, img.height);
    } else {
      // 锚点标记
      ctx.fillStyle = 'rgba(248,113,113,0.9)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 中心标签
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.fillText('中心(0,0)', centerX + 8, centerY - 8);
  }, [modelData, gridWidth, gridHeight, imageVersion]);

  const toggleCell = (gx, gy) => {
    setModelData((prev) => {
      const next = structuredClone(prev);
      const arr = next.occupiedCells || (next.occupiedCells = []);
      const idx = arr.findIndex(([x, y]) => x === gx && y === gy);
      if (idx >= 0) arr.splice(idx, 1); else arr.push([gx, gy]);
      return next;
    });
  };

  const canvasToWorldCell = (evt) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const gx = Math.floor((x - centerX) / gridWidth + 0.5);
    const gy = Math.floor((y - centerY) / gridHeight + 0.5);
    return { gx, gy, x, y, centerX, centerY };
  };

  const hitImage = (x, y) => {
    const img = imageRef.current;
    if (!img) return false;
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const imgX = centerX - (modelData.anchorX || 0);
    const imgY = centerY - (modelData.anchorY || 0);
    return x >= imgX && x <= imgX + img.width && y >= imgY && y <= imgY + img.height;
  };

  const handleCanvasDown = (evt) => {
    if (!modelData) return;
    const { gx, gy, x, y, centerX, centerY } = canvasToWorldCell(evt);
    if (hitImage(x, y)) {
      isDraggingImgRef.current = true;
      const img = imageRef.current;
      const imgX = centerX - (modelData.anchorX || 0);
      const imgY = centerY - (modelData.anchorY || 0);
      dragOffsetRef.current = { x: x - imgX, y: y - imgY };
      return;
    }
    toggleCell(gx, gy);
  };

  const handleCanvasMove = (evt) => {
    if (!isDraggingImgRef.current || !modelData || !imageRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const newImgX = x - dragOffsetRef.current.x;
    const newImgY = y - dragOffsetRef.current.y;
    const newAnchorX = centerX - newImgX;
    const newAnchorY = centerY - newImgY;
    setModelData((prev) => ({ ...prev, anchorX: newAnchorX, anchorY: newAnchorY }));
  };

  const handleCanvasUp = () => {
    isDraggingImgRef.current = false;
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
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        setToast('✗ ' + err.message);
        setTimeout(() => setToast(''), 3000);
      }
    }
  };

  const saveConfigs = async () => {
    if (!modelData) return;
    let list = [...models];
    if (selectedId) {
      const idx = list.findIndex((m) => m.id === selectedId);
      if (idx >= 0) list[idx] = structuredClone(modelData); else list.push(structuredClone(modelData));
    }
    try {
      let handle = dirHandle;
      if (handle) {
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          const newPermission = await handle.requestPermission({ mode: 'readwrite' });
          if (newPermission !== 'granted') {
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

      const fileHandle = await handle.getFileHandle('building_model.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(list, null, 2));
      await writable.close();
      setModels(list);
      setToast('✓ 保存成功');
      setTimeout(() => setToast(''), 1500);
    } catch (err) {
      console.error(err);
      setToast('✗ 保存失败: ' + err.message);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const createNewModel = () => {
    const newId = Math.max(0, ...models.map(m => m.id || 0)) + 1;
    const base = {
      id: newId,
      name: `新建筑-${newId}`,
      gridWidth: defaultGrid,
      gridHeight: defaultGrid,
      imagePath: '',
      anchorX: 0,
      anchorY: 0,
      occupiedCells: []
    };
    setModels([...models, base]);
    setSelectedId(newId);
    setModelData(structuredClone(base));
  };

  const deleteModel = () => {
    if (models.length === 0 || !modelData) return;
    if (!confirm(`确认删除建筑: ${modelData.name}?`)) return;
    const list = models.filter((m) => m.id !== modelData.id);
    setModels(list);
    if (list.length > 0) {
      setSelectedId(list[0].id);
      setModelData(structuredClone(list[0]));
    } else {
      setSelectedId(null);
      setModelData(null);
    }
  };

  if (status === 'loading') {
    return <div className="w-full h-screen bg-black text-white flex items-center justify-center">加载配置...</div>;
  }
  if (status === 'error') {
    return <div className="w-full h-screen bg-black text-red-400 flex items-center justify-center">加载 building_model.json 失败</div>;
  }
  if (!modelData) {
    return <div className="w-full h-screen bg-black text-white flex items-center justify-center">未找到建筑配置</div>;
  }

  return (
    <div className="w-full h-screen bg-slate-900 text-white flex">
      {/* 左侧面板 */}
      <div className="w-[420px] border-r border-slate-800 bg-slate-950/70 flex flex-col">
        <div className="p-4 pb-3 border-b border-slate-800 space-y-2">
          <div className="flex gap-2">
            <button onClick={createNewModel} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold">新建</button>
            <button onClick={deleteModel} className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold">删除</button>
          </div>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
            ))}
          </select>
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              onClick={selectSavePath}
              className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold text-left truncate border border-slate-600"
              title={savePathName ? `点击更换路径：${savePathName}` : '点击选择保存路径'}
            >
              {savePathName ? `📁 ${savePathName}` : '📁 选择保存路径'}
            </button>
            <button onClick={saveConfigs} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold">保存</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
          <div className="space-y-3 bg-slate-800/60 rounded-lg p-3 border border-slate-700">
            <div className="font-semibold text-slate-200">基础</div>

            <div className="space-y-1">
              <div className="text-slate-300">名称</div>
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2"
                value={modelData.name}
                onChange={(e) => setModelData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-slate-300">格子宽</div>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2"
                  value={modelData.gridWidth}
                  onChange={(e) => setModelData((p) => ({ ...p, gridWidth: Number(e.target.value) || defaultGrid }))}
                />
              </div>
              <div className="space-y-1">
                <div className="text-slate-300">格子高</div>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2"
                  value={modelData.gridHeight}
                  onChange={(e) => setModelData((p) => ({ ...p, gridHeight: Number(e.target.value) || defaultGrid }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-300">图片路径</div>
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2"
                value={modelData.imagePath}
                onChange={(e) => setModelData((p) => ({ ...p, imagePath: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-slate-300">锚点X</div>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2"
                  value={modelData.anchorX ?? 0}
                  onChange={(e) => setModelData((p) => ({ ...p, anchorX: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1">
                <div className="text-slate-300">锚点Y</div>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2"
                  value={modelData.anchorY ?? 0}
                  onChange={(e) => setModelData((p) => ({ ...p, anchorY: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="text-xs text-slate-400">拖动右侧图片会自动更新锚点（以中心点计算）。</div>
            <div className="text-xs text-slate-400">刷格子：中心格子为 [0,0]，向右为 +X，向下为 +Y。</div>
          </div>
        </div>
      </div>

      {/* 右侧画布 */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleCanvasDown}
          onMouseMove={handleCanvasMove}
          onMouseUp={handleCanvasUp}
          onMouseLeave={handleCanvasUp}
        />
        {toast && (
          <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg backdrop-blur-sm text-sm border ${toast.startsWith('✓') ? 'bg-green-900/50 border-green-700 text-green-200' : 'bg-red-900/50 border-red-700 text-red-200'}`}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingModelEditor;
