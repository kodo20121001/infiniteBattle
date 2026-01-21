import React, { useEffect, useMemo, useRef, useState } from 'react';
import BlockTool from './mapeditor/BlockTool';
import ImageTool from './mapeditor/ImageTool';
import InfoTool from './mapeditor/InfoTool';
import PathTool from './mapeditor/PathTool';
import PointTool from './mapeditor/PointTool';
import TriggerTool from './mapeditor/TriggerTool';
//   gridWidth: number; gridHeight: number;
//   imageTree?: ImageNode[]; points?: MapPoint[]; paths?: MapPath[];
//   triggerAreas?: TriggerArea[]; gridCells: number[]; // 阻挡格索引列表
// }

const fetchMapConfigs = async () => {
  const res = await fetch('/config/map.json');
  if (!res.ok) throw new Error('加载 map.json 失败');
  return res.json();
};

const MapEditor = () => {
  const [maps, setMaps] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mapData, setMapData] = useState(null); // 当前可编辑的 map 对象
  const [status, setStatus] = useState('loading');
  const [pointsText, setPointsText] = useState('');
  const [pathsText, setPathsText] = useState('');
  const [triggersText, setTriggersText] = useState('');
  const [imageTreeText, setImageTreeText] = useState('');
  const [imageVersion, setImageVersion] = useState(0); // 用于触发重绘
  const [tool, setTool] = useState('block'); // block | point | path | image
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [dragPointId, setDragPointId] = useState(null);
  const [currentPathId, setCurrentPathId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [dragNodeId, setDragNodeId] = useState(null); // imageTree 中选中的节点 id
  const [dirHandle, setDirHandle] = useState(null); // 保存目录句柄
  const [savePathName, setSavePathName] = useState(''); // 保存路径显示名称
  const [toast, setToast] = useState(''); // 临时提示
  const canvasRef = useRef(null);
  const renderMetaRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const imageCacheRef = useRef(new Map());
  const isMouseDownRef = useRef(false);

  // 载入配置
  useEffect(() => {
    fetchMapConfigs()
      .then((data) => {
        setMaps(data || []);
        if (data && data.length > 0) {
          setSelectedId(data[0].id);
          setMapData(structuredClone(data[0]));
        }
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');
      });
  }, []);

  // 初始化时从 IndexedDB 恢复目录句柄
  useEffect(() => {
    (async () => {
      try {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('MapEditorDB', 1);
          request.onupgradeneeded = () => {
            request.result.createObjectStore('settings');
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        
        // 恢复目录句柄
        const handleReq = store.get('dirHandle');
        handleReq.onsuccess = async () => {
          if (handleReq.result) {
            try {
              // 尝试请求权限（如果权限过期会弹窗）
              const permission = await handleReq.result.requestPermission({ mode: 'readwrite' });
              if (permission === 'granted') {
                setDirHandle(handleReq.result);
                console.log('✓ 目录权限已恢复');
              } else {
                console.log('✗ 目录权限被拒绝，需要重新选择');
                // 清除无效句柄
                const clearTx = db.transaction('settings', 'readwrite');
                clearTx.objectStore('settings').delete('dirHandle');
                setSavePathName('');
              }
            } catch (err) {
              console.warn('恢复目录句柄失败:', err);
              // 句柄无效，清除
              const clearTx = db.transaction('settings', 'readwrite');
              clearTx.objectStore('settings').delete('dirHandle');
              setSavePathName('');
            }
          }
        };
        
        // 恢复路径名称
        const nameReq = store.get('savePathName');
        nameReq.onsuccess = () => {
          if (nameReq.result) {
            setSavePathName(nameReq.result);
          }
        };
      } catch (err) {
        console.warn('无法恢复目录句柄:', err);
      }
    })();
  }, []);

  // 当选择变化时更新 mapData
  useEffect(() => {
    if (!selectedId) return;
    const found = maps.find((m) => m.id === selectedId);
    if (found) {
      setMapData(structuredClone(found));
      setCurrentPathId(found.paths?.[0]?.id ?? null);
      setSelectedPointId(found.points?.[0]?.id ?? null);
    }
  }, [selectedId, maps]);

  // 同步 JSON 文本编辑器
  useEffect(() => {
    if (!mapData) return;
    setPointsText(JSON.stringify(mapData.points ?? [], null, 2));
    setPathsText(JSON.stringify(mapData.paths ?? [], null, 2));
    setTriggersText(JSON.stringify(mapData.triggerAreas ?? [], null, 2));
    setImageTreeText(JSON.stringify(mapData.imageTree ?? [], null, 2));
  }, [mapData]);

  useEffect(() => {
    // 切换工具时结束路径绘制与拖拽
    if (tool !== 'path') setCurrentPathId(null);
    if (tool !== 'image') setSelectedNodeId(null);
    setDragPointId(null);
    isMouseDownRef.current = false;
  }, [tool]);

  const nextId = (arr, fallback = 1) => {
    if (!arr || arr.length === 0) return fallback;
    return arr.reduce((max, item) => (item?.id ?? 0) > max ? (item.id ?? 0) : max, 0) + 1;
  };

  const findNearestPoint = (points, x, y, radius = 10) => {
    if (!points || points.length === 0) return null;
    let best = null;
    let bestDist = radius * radius;
    points.forEach((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestDist) {
        bestDist = d2;
        best = p;
      }
    });
    return best;
  };

  const canvasToWorld = (evt) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const { scale, offsetX, offsetY } = renderMetaRef.current;
    const x = (evt.clientX - rect.left - offsetX) / scale;
    const y = (evt.clientY - rect.top - offsetY) / scale;
    return { x, y };
  };

  const gridColCount = useMemo(() => {
    if (!mapData) return 0;
    return Math.floor(mapData.mapWidth / mapData.gridWidth);
  }, [mapData]);

  const gridRowCount = useMemo(() => {
    if (!mapData) return 0;
    return Math.floor(mapData.mapHeight / mapData.gridHeight);
  }, [mapData]);

  // 预加载图片
  useEffect(() => {
    if (!mapData?.imageTree) return;
    const cache = imageCacheRef.current;
    const queue = [];
    const walk = (nodes) => {
      nodes?.forEach((n) => {
        if (n.path && !cache.has(n.path)) queue.push(n.path);
        if (n.children) walk(n.children);
      });
    };
    walk(mapData.imageTree);
    queue.forEach((path) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        cache.set(path, img);
        setImageVersion((v) => v + 1);
      };
      img.onerror = () => {
        console.warn('加载图片失败', path);
        cache.set(path, null);
      };
    });
  }, [mapData]);

  // 画布渲染网格、图片与障碍
  useEffect(() => {
    if (!canvasRef.current || !mapData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const padding = 12;
    const maxWidth = canvas.parentElement?.clientWidth || mapData.mapWidth;
    const maxHeight = canvas.parentElement?.clientHeight || mapData.mapHeight;
    const scale = Math.min(
      (maxWidth - padding * 2) / mapData.mapWidth,
      (maxHeight - padding * 2) / mapData.mapHeight,
      1
    );
    const drawWidth = mapData.mapWidth * scale;
    const drawHeight = mapData.mapHeight * scale;

    canvas.width = maxWidth;
    canvas.height = maxHeight;

    const offsetX = (canvas.width - drawWidth) / 2;
    const offsetY = (canvas.height - drawHeight) / 2;
    renderMetaRef.current = { scale, offsetX, offsetY };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, mapData.mapWidth, mapData.mapHeight);

    // 渲染图片树（先序）
    const drawNode = (node) => {
      ctx.save();
      const img = node.path ? imageCacheRef.current.get(node.path) : null;
      const w = node.width ?? img?.naturalWidth ?? 0;
      const h = node.height ?? img?.naturalHeight ?? 0;
      const cx = node.x + w / 2;
      const cy = node.y + h / 2;
      ctx.translate(cx, cy);
      if (node.rotation) ctx.rotate((node.rotation * Math.PI) / 180);
      const scale = node.scale ?? 1;
      ctx.scale(scale, scale);
      ctx.globalAlpha = node.alpha ?? 1;
      if (img) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else if (!img && node.path) {
        // 占位框
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
      node.children?.forEach(drawNode);
    };
    mapData.imageTree?.forEach(drawNode);

    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= mapData.mapWidth; x += mapData.gridWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapData.mapHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= mapData.mapHeight; y += mapData.gridHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapData.mapWidth, y);
      ctx.stroke();
    }

    // 障碍格
    ctx.fillStyle = 'rgba(239,68,68,0.45)';
    mapData.gridCells?.forEach((idx) => {
      const gx = idx % gridColCount;
      const gy = Math.floor(idx / gridColCount);
      ctx.fillRect(
        gx * mapData.gridWidth,
        gy * mapData.gridHeight,
        mapData.gridWidth,
        mapData.gridHeight
      );
    });

    // 触发区域简要渲染
    if (mapData.triggerAreas) {
      mapData.triggerAreas.forEach((area) => {
        if (area.type === 'circle') {
          ctx.strokeStyle = 'rgba(59,130,246,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(area.center.x, area.center.y, area.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (area.type === 'rectangle') {
          ctx.strokeStyle = 'rgba(16,185,129,0.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(area.x, area.y, area.width, area.height);
        } else if (area.type === 'grid') {
          ctx.fillStyle = 'rgba(234,179,8,0.35)';
          area.gridIndices.forEach((idx) => {
            const gx = idx % gridColCount;
            const gy = Math.floor(idx / gridColCount);
            ctx.fillRect(
              gx * mapData.gridWidth,
              gy * mapData.gridHeight,
              mapData.gridWidth,
              mapData.gridHeight
            );
          });
        }
      });
    }

    // 路径渲染
    if (mapData.paths) {
      ctx.strokeStyle = 'rgba(59,130,246,0.9)';
      ctx.lineWidth = 2;
      mapData.paths.forEach((p) => {
        if (!p.points?.length) return;
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i < p.points.length; i++) {
          ctx.lineTo(p.points[i].x, p.points[i].y);
        }
        if (p.closed) ctx.closePath();
        ctx.stroke();
      });
    }

    // 关键点渲染
    if (mapData.points) {
      mapData.points.forEach((pt) => {
        ctx.fillStyle = pt.id === selectedPointId ? '#fbbf24' : '#22c55e';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.fillText(pt.id ?? '', pt.x + 8, pt.y + 4);
      });
    }

    ctx.restore();
  }, [mapData, gridColCount, imageVersion]);

  const handleToggleCell = (index) => {
    if (!mapData || index < 0) return;
    setMapData((prev) => {
      const next = structuredClone(prev);
      if (!next.gridCells) next.gridCells = [];
      const existsIdx = next.gridCells.indexOf(index);
      if (existsIdx >= 0) {
        // 已经是阻挡，移除恢复可行走
        next.gridCells.splice(existsIdx, 1);
      } else {
        // 添加为阻挡格
        next.gridCells.push(index);
      }
      return next;
    });
  };

  const handleCanvasDown = (evt) => {
    if (!mapData) return;
    isMouseDownRef.current = true;
    const { x, y } = canvasToWorld(evt);
    if (tool === 'block') {
      const gx = Math.floor(x / mapData.gridWidth);
      const gy = Math.floor(y / mapData.gridHeight);
      const gridColCountLocal = Math.floor(mapData.mapWidth / mapData.gridWidth);
      const gridRowCountLocal = Math.floor(mapData.mapHeight / mapData.gridHeight);
      if (gx < 0 || gy < 0 || gx >= gridColCountLocal || gy >= gridRowCountLocal) return;
      const index = gy * gridColCountLocal + gx;
      handleToggleCell(index);
    } else if (tool === 'point') {
      const hit = (mapData.points ?? []).find((p) => {
        const dx = p.x - x; const dy = p.y - y; return dx * dx + dy * dy <= 10 * 10;
      });
      if (hit) {
        setSelectedPointId(hit.id ?? null);
        setDragPointId(hit.id ?? null);
      } else {
        const newId = nextId(mapData.points, 1);
        const newPoint = { id: newId, x, y };
        setMapData((p) => ({ ...p, points: [...(p.points ?? []), newPoint] }));
        setSelectedPointId(newId);
      }
    } else if (tool === 'path') {
      setMapData((p) => {
        const next = structuredClone(p);
        let path = next.paths?.find((pp) => pp.id === currentPathId);
        if (!path) {
          const newId = nextId(next.paths, 1);
          path = { id: newId, name: `path-${newId}`, points: [] };
          next.paths = [...(next.paths ?? []), path];
          setCurrentPathId(newId);
        }
        path.points = [...(path.points ?? []), { x, y }];
        return next;
      });
    } else if (tool === 'image') {
      // 检测点击的图片节点
      const findNodeAt = (nodes, x, y) => {
        if (!nodes) return null;
        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          const img = node.path ? imageCacheRef.current.get(node.path) : null;
          const w = node.width ?? img?.naturalWidth ?? 0;
          const h = node.height ?? img?.naturalHeight ?? 0;
          const scale = node.scale ?? 1;
          const x1 = node.x - (w / 2) * scale;
          const x2 = node.x + (w / 2) * scale;
          const y1 = node.y - (h / 2) * scale;
          const y2 = node.y + (h / 2) * scale;
          if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
            return node;
          }
          const found = findNodeAt(node.children, x, y);
          if (found) return found;
        }
        return null;
      };
      const hit = findNodeAt(mapData.imageTree, x, y);
      if (hit) {
        setSelectedNodeId(hit.id);
        setDragNodeId(hit.id);
      }
    }
  };

  const handleCanvasMove = (evt) => {
    if (!mapData) return;
    if (!isMouseDownRef.current) return;
    if (tool === 'point' && dragPointId != null) {
      const { x, y } = canvasToWorld(evt);
      setMapData((p) => {
        const next = structuredClone(p);
        const target = next.points?.find((pt) => pt.id === dragPointId);
        if (target) {
          target.x = x; target.y = y;
        }
        return next;
      });
    } else if (tool === 'image' && dragNodeId != null) {
      const { x, y } = canvasToWorld(evt);
      const updateNodePos = (nodes, id, newX, newY) => {
        if (!nodes) return false;
        for (const node of nodes) {
          if (node.id === id) {
            node.x = newX;
            node.y = newY;
            return true;
          }
          if (updateNodePos(node.children, id, newX, newY)) return true;
        }
        return false;
      };
      setMapData((p) => {
        const next = structuredClone(p);
        updateNodePos(next.imageTree, dragNodeId, x, y);
        return next;
      });
    }
  };

  const handleCanvasUp = () => {
    isMouseDownRef.current = false;
    setDragPointId(null);
    setDragNodeId(null);
  };

  const handleCanvasContextMenu = (evt) => {
    if (!mapData) return;
    evt.preventDefault();
    const { x, y } = canvasToWorld(evt);

    if (tool === 'point') {
      const hit = findNearestPoint(mapData.points, x, y, 12);
      if (hit) {
        setMapData((p) => ({ ...p, points: (p.points ?? []).filter((pt) => pt.id !== hit.id) }));
        if (selectedPointId === hit.id) setSelectedPointId(null);
      }
    } else if (tool === 'path') {
      let updated = false;
      setMapData((p) => {
        const next = structuredClone(p);
        const path = next.paths?.find((pp) => pp.id === currentPathId);
        if (path && path.points) {
          const hit = findNearestPoint(path.points, x, y, 12);
          if (hit) {
            path.points = path.points.filter((pt) => pt !== hit);
            updated = true;
          }
        }
        return next;
      });
      // 右键结束当前路径编辑
      setCurrentPathId(null);
      isMouseDownRef.current = false;
      setDragPointId(null);
      if (updated) return;
    }
  };

  const saveMapConfig = async () => {
    if (maps.length === 0 && !mapData) return;
    
    try {
      // 保存前，同步当前编辑的 mapData 回 maps 数组
      let mapsToSave = [...maps];
      if (mapData && selectedId) {
        const index = mapsToSave.findIndex((m) => m.id === selectedId);
        if (index !== -1) {
          // 更新现有地图
          mapsToSave[index] = structuredClone(mapData);
        } else {
          // 新创建的地图还未在数组中，添加进去
          mapsToSave.push(structuredClone(mapData));
        }
      }
      
      let handle = dirHandle;
      
      // 如果有句柄，先验证权限
      if (handle) {
        try {
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          if (permission !== 'granted') {
            // 尝试重新请求权限
            const newPermission = await handle.requestPermission({ mode: 'readwrite' });
            if (newPermission !== 'granted') {
              console.log('权限被拒绝，需要重新选择目录');
              handle = null; // 权限被拒绝，清除句柄
              setDirHandle(null);
              setSavePathName('');
            }
          }
        } catch (err) {
          console.warn('验证权限失败:', err);
          handle = null; // 句柄无效，清除
          setDirHandle(null);
          setSavePathName('');
        }
      }
      
      // 如果没有有效的句柄，弹出选择器
      if (!handle) {
        handle = await window.showDirectoryPicker();
        setDirHandle(handle);
        
        // 尝试获取完整路径
        let fullPath = '';
        try {
          // 尝试使用 getFullPath 方法（实验性 API）
          const pathArray = await handle.getFullPath();
          fullPath = '/' + pathArray.join('/');
        } catch (e) {
          // 如果不支持，使用目录名称
          fullPath = handle.name;
        }
        
        setSavePathName(fullPath);
        
        // 保存到 IndexedDB
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('MapEditorDB', 1);
          request.onupgradeneeded = () => {
            request.result.createObjectStore('settings');
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put(handle, 'dirHandle');
        store.put(fullPath, 'savePathName');
      }
      
      // 写入 map.json
      const fileHandle = await handle.getFileHandle('map.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(mapsToSave, null, 2));
      await writable.close();
      
      // 保存成功后更新 maps 状态
      setMaps(mapsToSave);
        console.log('✓ 地图保存成功，共', mapsToSave.length, '个地图');
      setToast('✓ 保存成功');
      setTimeout(() => setToast(''), 2000);
    } catch (err) {
      console.error('保存失败:', err);
      if (err.name === 'NotAllowedError') {
        console.log('用户取消了权限请求');
      } else if (err.name === 'AbortError') {
        console.log('用户取消了目录选择');
      } else {
        setToast('✗ 保存失败: ' + err.message);
        setTimeout(() => setToast(''), 3000);
      }
    }
  };

  const selectSavePath = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirHandle(handle);
      
      // 尝试获取完整路径
      let fullPath = '';
      try {
        // 尝试使用 getFullPath 方法（实验性 API）
        const pathArray = await handle.getFullPath();
        fullPath = '/' + pathArray.join('/');
      } catch (e) {
        // 如果不支持，使用目录名称
        fullPath = handle.name;
      }
      
      setSavePathName(fullPath);
      
      // 保存到 IndexedDB
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('MapEditorDB', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('settings');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put(handle, 'dirHandle');
      store.put(fullPath, 'savePathName');
      setToast('✓ 路径已设置');
      setTimeout(() => setToast(''), 2000);
    } catch (err) {
      // 用户取消（NotAllowedError）或中止请求时什么都不提示
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setToast('✗ ' + err.message);
        setTimeout(() => setToast(''), 3000);
      }
    }
  };

  const createNewMap = () => {
    const newId = Math.max(0, ...maps.map(m => m.id)) + 1;
    const newMap = {
      id: newId,
      name: `新地图-${newId}`,
      mapWidth: 1000,
      mapHeight: 1000,
      gridWidth: 50,
      gridHeight: 50,
      imageTree: [],
      points: [],
      paths: [],
      triggerAreas: [],
      gridCells: []
    };
    setMaps([...maps, newMap]);
    setSelectedId(newId);
    setMapData(structuredClone(newMap));
  };

  const deleteMap = () => {
    if (maps.length === 1) {
      alert('至少保留一个地图');
      return;
    }
    if (!confirm(`确认删除地图: ${mapData?.name}?`)) return;
    
    const newMaps = maps.filter((m) => m.id !== selectedId);
    setMaps(newMaps);
    
    // 切换到第一个地图
    if (newMaps.length > 0) {
      setSelectedId(newMaps[0].id);
    }
  };

  if (status === 'loading') {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white">加载地图配置...</div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-red-400">加载 map.json 失败</div>
    );
  }

  if (!mapData) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white">未找到地图</div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-900 text-white flex">
      {/* 左侧控制面板 */}
      <div className={`border-r border-slate-700 bg-slate-950/70 flex flex-col ${tool === 'image' ? 'w-[420px]' : 'w-[420px]'}`}>
        {/* 顶部：地图选择和保存 */}
        <div className="p-4 pb-3 border-b border-slate-700 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={createNewMap}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold"
            >
              新建
            </button>
            <button
              onClick={deleteMap}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold"
            >
              删除
            </button>
          </div>
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} - {m.name}
              </option>
            ))}
          </select>
          
          {/* 保存路径设置 */}
          <div className="pt-2 border-t border-slate-700 space-y-2">
            <button
              onClick={selectSavePath}
              className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold text-left truncate border border-slate-600"
              title={savePathName ? `点击更换路径：${savePathName}` : '点击选择保存路径'}
            >
              {savePathName ? `📁 ${savePathName}` : '📁 选择保存路径'}
            </button>
            <button
              onClick={saveMapConfig}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
            >
              保存
            </button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex gap-2 text-sm p-4 pb-3 flex-shrink-0">
          {[{ id: 'info', label: '基础信息', icon: 'ℹ️' }, { id: 'block', label: '阻挡', icon: '⬛' }, { id: 'point', label: '关键点', icon: '📍' }, { id: 'path', label: '路径', icon: '〰️' }, { id: 'trigger', label: '触发区', icon: '⭕' }, { id: 'image', label: '图片', icon: '🖼️' }].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setTool(btn.id)}
              className={`flex-1 py-2 rounded border text-sm ${tool === btn.id ? 'border-blue-500 bg-blue-600/40 text-white' : 'border-slate-700 bg-slate-900 text-slate-200'}`}
              title={btn.label}
            >
              <span className="mr-1">{btn.icon}</span>{btn.label}
            </button>
          ))}
        </div>

        {/* 工具内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tool === 'info' && (
            <InfoTool mapData={mapData} setMapData={setMapData} gridColCount={gridColCount} gridRowCount={gridRowCount} />
          )}
          {tool === 'trigger' && (
            <TriggerTool mapData={mapData} setMapData={setMapData} />
          )}
          {tool === 'image' && (
            <ImageTool mapData={mapData} setMapData={setMapData} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} />
          )}
          {tool === 'point' && (
            <PointTool mapData={mapData} setMapData={setMapData} selectedPointId={selectedPointId} setSelectedPointId={setSelectedPointId} />
          )}
          {tool === 'path' && (
            <PathTool mapData={mapData} setMapData={setMapData} currentPathId={currentPathId} setCurrentPathId={setCurrentPathId} />
          )}
          {tool === 'block' && (
            <BlockTool gridColCount={gridColCount} gridRowCount={gridRowCount} />
          )}
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
          onContextMenu={handleCanvasContextMenu}
        />
        <div className="absolute top-4 left-4 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm text-sm">
          <div className="font-semibold">地图预览</div>
          <div className="text-slate-300">模式：{tool === 'block' ? '阻挡刷子' : tool === 'point' ? '关键点' : '路径'} | 点击画布进行编辑</div>
        </div>
        
        {/* Toast 提示 */}
        {toast && (
          <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-lg backdrop-blur-sm text-sm border ${
            toast.startsWith('✓') 
              ? 'bg-green-900/50 border-green-700 text-green-200' 
              : 'bg-red-900/50 border-red-700 text-red-200'
          }`}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapEditor;
