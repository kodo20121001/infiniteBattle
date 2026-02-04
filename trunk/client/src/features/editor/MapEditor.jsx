import React, { useEffect, useMemo, useRef, useState } from 'react';
import MapEditorPreview from './MapEditorPreview';
import { worldToGrid, gridToWorld } from '../../game/core/impl/Map';
import BlockTool from './mapeditor/BlockTool';
import BuildTool from './mapeditor/BuildTool';
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
  const [tool, setTool] = useState('block'); // block | build | point | path | image
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [currentPathId, setCurrentPathId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [dirHandle, setDirHandle] = useState(null); // 保存目录句柄
  const [savePathName, setSavePathName] = useState(''); // 保存路径显示名称
  const [toast, setToast] = useState(''); // 临时提示
  const [showBlockedCells, setShowBlockedCells] = useState(true); // 显示阻挡格子
  const canvasRef = useRef(null);
  const previewRef = useRef(null); // MapEditorPreview 引用
  const renderMetaRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const imageCacheRef = useRef(new Map());
  const isMouseDownRef = useRef(false);
  const isLeftMouseDownRef = useRef(false);
  const isRightMouseDownRef = useRef(false);
  const dragRef = useRef(null); // 统一的拖动信息：{ type, itemId, startX, startZ, startMouseX, startMouseZ }
  const lastBlockIndexRef = useRef(null); // 记录上次操作的阻挡格索引，避免重复操作同一格
  const testInitRef = useRef(false); // 测试标志：只初始化一次

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
              } else {
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

  // 当 map 尺寸或网格尺寸变化时，自动计算网格行列数并写回 state（不可手动编辑）
  useEffect(() => {
    if (!mapData) return;
    const { mapWidth = 0, mapHeight = 0, gridWidth = 0, gridHeight = 0 } = mapData;
    if (mapWidth <= 0 || mapHeight <= 0 || gridWidth <= 0 || gridHeight <= 0) return;
    const colCount = Math.floor(mapWidth / gridWidth);
    const rowCount = Math.floor(mapHeight / gridHeight);
    if (colCount !== mapData.colCount || rowCount !== mapData.rowCount) {
      setMapData((p) => ({ ...p, colCount, rowCount }));
    }
    // 测试：只初始化一次，添加两个格子用于测试
    if (!testInitRef.current && (!mapData.gridCells || mapData.gridCells.length === 0)) {
      testInitRef.current = true;
      console.log(`[测试初始化] 添加 gridCells=[63, 84]`);
      setMapData((p) => ({ ...p, gridCells: [63, 84] }));
    }
  }, [mapData?.mapWidth, mapData?.mapHeight, mapData?.gridWidth, mapData?.gridHeight]);

  // 同步 JSON 文本编辑器
  useEffect(() => {
    if (!mapData) return;
    setPointsText(JSON.stringify(mapData.points ?? [], null, 2));
    setPathsText(JSON.stringify(mapData.paths ?? [], null, 2));
    setTriggersText(JSON.stringify(mapData.triggerAreas ?? [], null, 2));
    setImageTreeText(JSON.stringify(mapData.imageTree ?? [], null, 2));
  }, [mapData]);

  useEffect(() => {
    // 切换工具时清理
    if (tool !== 'path') setCurrentPathId(null);
    if (tool !== 'image') setSelectedNodeId(null);
    setSelectedPointId(null);
    dragRef.current = null;
    isMouseDownRef.current = false;
  }, [tool]);

  const nextId = (arr, fallback = 1) => {
    if (!arr || arr.length === 0) return fallback;
    return arr.reduce((max, item) => (item?.id ?? 0) > max ? (item.id ?? 0) : max, 0) + 1;
  };

  const findNearestPoint = (points, x, z, radiusInMeters = 0.3) => {
    // 在地面平面 (x-z) 上查找最近点，不考虑高度 y
    // radius 以米为单位（0.3m 约等于默认密度下的 ~10px）
    if (!points || points.length === 0) return null;
    let best = null;
    let bestDist = radiusInMeters * radiusInMeters;
    points.forEach((p) => {
      const dx = p.x - x;
      const dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= bestDist) {
        bestDist = d2;
        best = p;
      }
    });
    return best;
  };

  // 使用 camera 投影做像素级命中（与显示一致）
  const findNearestPointByScreen = (points, evt, radiusPx = 10) => {
    if (!points || points.length === 0) return null;
    const camera = previewRef.current?.camera;
    if (!camera) return null;
    const rect = evt.target?.getBoundingClientRect?.() || { left: 0, top: 0 };
    const canvasX = evt.clientX - rect.left;
    const canvasY = evt.clientY - rect.top;
    let best = null;
    let bestDist = radiusPx * radiusPx;
    points.forEach((p) => {
      const screen = camera.worldToCanvas(p.x, 0, p.z);
      const dx = screen.x - canvasX;
      const dy = screen.y - canvasY;
      const d2 = dx * dx + dy * dy;
      if (d2 <= bestDist) {
        bestDist = d2;
        best = p;
      }
    });
    return best;
  };

  // 屏幕点击坐标转换到世界坐标（Camera 直接返回米）
  const screenToWorld = (evt) => {
    if (!mapData) return { x: 0, y: 0, z: 0 };

    // 从 MapEditorPreview 获取 camera
    const camera = previewRef.current?.camera;
    if (!camera) {
      console.warn('⚠️ Camera not available from MapEditorPreview');
      return { x: 0, y: 0, z: 0 };
    }

    const rect = evt.target?.getBoundingClientRect?.() || { left: 0, top: 0 };
    
    // Camera 现在使用米坐标，直接返回
    const canvasX = evt.clientX - rect.left;
    const canvasY = evt.clientY - rect.top;
    
    const worldPos = camera.screenToWorld(
      evt.clientX,
      evt.clientY,
      rect.left,
      rect.top,
      0  // worldY
    );

    return worldPos;
  };


  const gridColCount = useMemo(() => {
    if (!mapData) return 0;
    const gw = mapData.gridWidth;
    if (!gw || gw <= 0 || !mapData.mapWidth) return mapData.colCount ?? 0;
    return mapData.colCount ?? Math.floor(mapData.mapWidth / gw);
  }, [mapData]);

  const gridRowCount = useMemo(() => {
    if (!mapData) return 0;
    const gh = mapData.gridHeight;
    if (!gh || gh <= 0 || !mapData.mapHeight) return mapData.rowCount ?? 0;
    return mapData.rowCount ?? Math.floor(mapData.mapHeight / gh);
  }, [mapData]);

  // 建筑网格列/行数（考虑偏移）
  const buildColCount = useMemo(() => {
    if (!mapData) return 0;
    const bw = mapData.buildGridWidth ?? mapData.gridWidth;
    if (!bw || bw <= 0 || !mapData.mapWidth) return 0;
    return Math.floor(mapData.mapWidth / bw);
  }, [mapData]);

  const buildRowCount = useMemo(() => {
    if (!mapData) return 0;
    const bh = mapData.buildGridHeight ?? mapData.gridHeight;
    if (!bh || bh <= 0 || !mapData.mapHeight) return 0;
    return Math.floor(mapData.mapHeight / bh);
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

    // 新坐标系统：地图在 (0, 0, 0)，锚点中心
    // 编辑器坐标系使用米单位，通过 ctx.scale() 转换为 canvas 像素
    const mapWidth = mapData.mapWidth || 1;
    const mapHeight = mapData.mapHeight || 1;

    // canvas 缩放显示
    const maxWidth = canvas.parentElement?.clientWidth || mapWidth;
    const maxHeight = canvas.parentElement?.clientHeight || mapHeight;
    const scale = Math.min(
      (maxWidth - padding * 2) / mapWidth,
      (maxHeight - padding * 2) / mapHeight,
      1
    );
    const drawWidth = mapWidth * scale;
    const drawHeight = mapHeight * scale;

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
    ctx.fillRect(0, 0, mapWidth, mapHeight);

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

    // 网格（直接使用米单位）
    const gridWidth = mapData.gridWidth;
    const gridHeight = mapData.gridHeight;
    
    const hasValidGridSize = Number.isFinite(gridWidth) && gridWidth > 0 && Number.isFinite(gridHeight) && gridHeight > 0;
    console.log(`[hasValidGridSize] gridWidth=${gridWidth}, gridHeight=${gridHeight}, hasValidGridSize=${hasValidGridSize}`);
    if (hasValidGridSize) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= mapWidth; x += gridWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= mapHeight; y += gridHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapWidth, y);
        ctx.stroke();
      }

      // 障碍格绘制
      if (showBlockedCells) {
        ctx.fillStyle = 'rgba(239,68,68,0.8)';
        const colCount = mapData.colCount || Math.floor(mapData.mapWidth / (mapData.gridWidth ?? 1));
        // 测试用：如果 gridCells 为空，临时生成测试格子
        const cellsToRender = mapData.gridCells && mapData.gridCells.length > 0 ? mapData.gridCells : [63, 84];
        console.log(`[🔍 阻挡格绘制] gridCells=${JSON.stringify(mapData.gridCells)} (使用: ${JSON.stringify(cellsToRender)})`);
        console.log(`  colCount=${colCount}, gridWidth=${gridWidth.toFixed(2)}, gridHeight=${gridHeight.toFixed(2)}, mapWidth=${mapWidth.toFixed(2)}, mapHeight=${mapHeight.toFixed(2)}`);
        cellsToRender.forEach((idx) => {
          const gx = idx % colCount;
          const gy = Math.floor(idx / colCount);
          const x = gx * gridWidth;
          const y = gy * gridHeight;
          console.log(`  idx=${idx}: gx=${gx}, gy=${gy}, x=${x.toFixed(2)}, y=${y.toFixed(2)}, 绘制矩形 (${x.toFixed(2)}, ${y.toFixed(2)}, ${gridWidth.toFixed(2)}, ${gridHeight.toFixed(2)})`);
          ctx.fillRect(x, y, gridWidth, gridHeight);
        });
      }
    }

    // 建筑网格线与可建筑格
    if (buildColCount > 0 && buildRowCount > 0) {
      const bw = mapData.buildGridWidth ?? mapData.gridWidth;
      const bh = mapData.buildGridHeight ?? mapData.gridHeight;
      const ox = mapData.buildOffsetX ?? 0;
      const oy = mapData.buildOffsetY ?? 0;
      
      const hasValidBuildGrid = Number.isFinite(bw) && bw > 0 && Number.isFinite(bh) && bh > 0;
      if (hasValidBuildGrid) {
        // 网格线（根据偏移的余数起始，保持列/行数只受格子尺寸影响）
        ctx.strokeStyle = 'rgba(34,197,94,0.25)';
        const startX = ((ox % bw) + bw) % bw;
        const startY = ((oy % bh) + bh) % bh;
        for (let x = startX; x <= mapWidth; x += bw) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, mapHeight);
          ctx.stroke();
        }
        for (let y = startY; y <= mapHeight; y += bh) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(mapWidth, y);
          ctx.stroke();
        }
        // 可建筑格
        ctx.fillStyle = 'rgba(34,197,94,0.35)';
        (mapData.buildGridCells ?? []).forEach((idx) => {
          const gx = idx % buildColCount;
          const gy = Math.floor(idx / buildColCount);
          const px = ox + gx * bw;
          const py = oy + gy * bh;
          if (px < mapWidth && py < mapHeight) {
            ctx.fillRect(px, py, bw, bh);
          }
        });
      }
    }

    // 渲染 Grid 类型的 TriggerArea
    if (mapData.triggerAreas) {
       mapData.triggerAreas.forEach((area) => {
         if (area.type === 'grid' && hasValidGridSize) {
            ctx.fillStyle = 'rgba(234,179,8,0.35)';
            area.gridIndices.forEach((idx) => {
              const gx = idx % gridColCount;
              const gy = Math.floor(idx / gridColCount);
              ctx.fillRect(
                gx * gridWidth,
                gy * gridHeight,
                gridWidth,
                gridHeight
              );
            });
         }
       });
    }

    // 世界坐标在 canvas 中直接使用（已通过 ctx.scale 转换）
    const worldToCanvas = (worldX, worldZ) => [worldX, worldZ];

    // 触发区域渲染（Circle 和 Rectangle）
    if (mapData.triggerAreas) {
      mapData.triggerAreas.forEach((area) => {
        if (area.type === 'circle') {
          ctx.strokeStyle = 'rgba(59,130,246,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const [centerX, centerY] = worldToCanvas(area.center.x, area.center.z);
          ctx.arc(centerX, centerY, area.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (area.type === 'rectangle') {
          ctx.strokeStyle = 'rgba(16,185,129,0.8)';
          ctx.lineWidth = 2;
          const [rectX, rectY] = worldToCanvas(area.x, area.z ?? 0);
          ctx.strokeRect(rectX, rectY, area.width, area.depth);
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
        const [firstX, firstY] = worldToCanvas(p.points[0].x, p.points[0].z);
        ctx.moveTo(firstX, firstY);
        for (let i = 1; i < p.points.length; i++) {
          const [px, py] = worldToCanvas(p.points[i].x, p.points[i].z);
          ctx.lineTo(px, py);
        }
        if (p.closed) ctx.closePath();
        ctx.stroke();
      });
    }

    // 关键点渲染
    if (mapData.points) {
      mapData.points.forEach((pt) => {
        const [canvasX, canvasY] = worldToCanvas(pt.x, pt.z);
        ctx.fillStyle = pt.id === selectedPointId ? '#fbbf24' : '#22c55e';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.fillText(pt.id ?? '', canvasX + 8, canvasY + 4);
      });
    }

    ctx.restore();
  }, [mapData, gridColCount, buildColCount, imageVersion, showBlockedCells]);

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
    console.log('[handleCanvasDown] 开始处理点击, tool=' + tool);
    if (!mapData) return;
    // 区分左右键：左键 button=0，右键 button=2
    const isLeftButton = evt.button === 0;
    const isRightButton = evt.button === 2;
    
    if (!isLeftButton && !isRightButton) return; // 只处理左右键
    
    isMouseDownRef.current = true;
    if (isLeftButton) {
      isLeftMouseDownRef.current = true;
    } else if (isRightButton) {
      isRightMouseDownRef.current = true;
    }
    
    const { x, y, z } = screenToWorld(evt);
    console.log(`[handleCanvasDown] tool=${tool}, click at (${x.toFixed(2)}, ${z.toFixed(2)})`);
    
    // 重置上次阻挡格索引记录（新的鼠标按下）
    lastBlockIndexRef.current = null;
    
    // ===== 坐标转换验证（所有工具都执行） =====
    const camera = previewRef.current?.camera;
    const rect = evt.target?.getBoundingClientRect?.() || { left: 0, top: 0 };
    const canvasX = evt.clientX - rect.left;
    const canvasY = evt.clientY - rect.top;
    
    // Canvas 转 World 再转回 Canvas
    let worldToCanvasX = NaN, worldToCanvasY = NaN;
    if (camera && typeof camera.worldToCanvas === 'function') {
      try {
        const canvasPos = camera.worldToCanvas(x, y, z);
        worldToCanvasX = canvasPos.x;
        worldToCanvasY = canvasPos.y;
      } catch (err) {
        console.error('[ERROR] worldToCanvas 执行错误:', err);
      }
    }
    
    const canvasDev = {
      x: Math.abs(canvasX - worldToCanvasX).toFixed(2),
      y: Math.abs(canvasY - worldToCanvasY).toFixed(2)
    };
    
    if (tool === 'block') {
      // 左键添加阻挡，右键在 contextmenu 中处理删除
      if (!isLeftButton) return;
      
      // 使用 Map 的网格转换工具函数
      const gridInfo = worldToGrid(
        x, z,
        mapData
      );
      
      if (!gridInfo) return;
      
      console.log('[grid] x=' + x.toFixed(4) + ' z=' + z.toFixed(4) + ' col=' + gridInfo.col + ' row=' + gridInfo.row + ' index=' + gridInfo.index);
      lastBlockIndexRef.current = gridInfo.index; // 记录初始格子
      
      // 只添加，不删除
      const index = gridInfo.index;
      if (!mapData.gridCells?.includes(index)) {
        setMapData((prev) => {
          const next = structuredClone(prev);
          const cells = next.gridCells ?? (next.gridCells = []);
          cells.push(index);
          return next;
        });
      }
    } else if (tool === 'build') {
      const bw = mapData.buildGridWidth ?? mapData.gridWidth;
      const bh = mapData.buildGridHeight ?? mapData.gridHeight;
      if (!bw || bw <= 0 || !bh || bh <= 0) return;
      if (!mapData.mapWidth || !mapData.mapHeight) return;
      const ox = mapData.buildOffsetX ?? 0;
      const oz = mapData.buildOffsetY ?? 0; // 这里对应 z 深度
      // 使用地面坐标 x 和 z
      const lx = x - ox;
      const lz = z - oz;
      if (lx < 0 || lz < 0) return;
      const cols = buildColCount;
      const rows = buildRowCount;
      if (cols <= 0 || rows <= 0) return;
      const gx = Math.floor(lx / bw);
      const gz = Math.floor(lz / bh);
      if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) return;
      const index = gz * cols + gx;
      setMapData((prev) => {
        const next = structuredClone(prev);
        const arr = next.buildGridCells ?? (next.buildGridCells = []);
        const pos = arr.indexOf(index);
        if (pos >= 0) arr.splice(pos, 1); else arr.push(index);
        return next;
      });
    } else if (tool === 'point') {
      // 使用 camera 投影的像素命中，和显示一致
      const hit = findNearestPointByScreen(mapData.points, evt, 10);
      if (hit) {
        setSelectedPointId(hit.id ?? null);
        dragRef.current = {
          type: 'point',
          itemId: hit.id,
          startMouseX: x,
          startMouseZ: z,
          startX: hit.x,
          startZ: hit.z,
        };
      } else {
        const newId = nextId(mapData.points, 1);
        // 新建点：使用 screenToWorld 返回的坐标（y=0 为地面高度）
        const newPoint = { id: newId, x, y, z };
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
        path.points = [...(path.points ?? []), { x, y, z }];
        return next;
      });
    } else if (tool === 'image') {
      console.log(`[image-click] imageTree=${mapData.imageTree?.length ?? 0}`);
      // 检测点击的图片节点（节点坐标表示左下角）
      const mapWidth = mapData.mapWidth || 1;
      const mapHeight = mapData.mapHeight || 1;
      const mapPixelWidth = mapWidth;
      const mapPixelHeight = mapHeight;
      const pixelsPerMeterX = mapPixelWidth / mapWidth;
      const pixelsPerMeterY = mapPixelHeight / mapHeight;
      
      const findNodeAt = (nodes, xMeters, zMeters) => {
        if (!nodes) return null;
        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          const img = node.path ? imageCacheRef.current.get(node.path) : null;
          const w = node.width ?? (img?.naturalWidth ? img.naturalWidth / pixelsPerMeterX : 0);
          const h = node.height ?? (img?.naturalHeight ? img.naturalHeight / pixelsPerMeterY : 0);
          const scale = node.scale ?? 1;
          const nodeWidth = w * scale;
          const nodeHeight = h * scale;
          if (xMeters >= node.x && xMeters <= node.x + nodeWidth &&
              zMeters >= node.y && zMeters <= node.y + nodeHeight) {
            console.log(`[image-click] HIT node=${node.id}`);
            return node;
          }
          const found = findNodeAt(node.children, xMeters, zMeters);
          if (found) return found;
        }
        return null;
      };
      const hit = findNodeAt(mapData.imageTree, x, z);
      if (hit) {
        console.log(`[image-click] HIT node=${hit.id}, setting dragRef for dragging`);
        setSelectedNodeId(hit.id);
        dragRef.current = {
          type: 'image',
          itemId: hit.id,
          startMouseX: x,
          startMouseZ: z,
          startX: hit.x,
          startZ: hit.y,
        };
        console.log(`[image-click] dragRef set: ${JSON.stringify(dragRef.current)}`);
      } else {
        console.log(`[image-click] no hit on imageTree`);
      }
    }
  };

  const handleCanvasMove = (evt) => {
    if (!mapData) return;
    if (!isMouseDownRef.current) {
      return;
    }
    
    const { x, y, z } = screenToWorld(evt);
    
    // Point and image drag logic (priority over block tool)
    if (dragRef.current) {
      const dr = dragRef.current;
      const deltaX = x - dr.startMouseX;
      const deltaZ = z - dr.startMouseZ;
      
      if (dr.type === 'point') {
        setMapData((p) => {
          const next = structuredClone(p);
          const target = next.points?.find((pt) => pt.id === dr.itemId);
          if (target) {
            target.x = dr.startX + deltaX;
            target.z = dr.startZ + deltaZ;
          }
          return next;
        });
      } else if (dr.type === 'image') {
        setMapData((p) => {
          const next = structuredClone(p);
          const updateNode = (nodes) => {
            if (!nodes) return false;
            for (const node of nodes) {
              if (node.id === dr.itemId) {
                node.x = dr.startX + deltaX;
                node.y = dr.startZ + deltaZ;
                return true;
              }
              if (updateNode(node.children)) return true;
            }
            return false;
          };
          updateNode(next.imageTree);
          return next;
        });
      }
      return;
    }
    
    // Block tool drag logic (only when not dragging point/image)
    if (isLeftMouseDownRef.current && tool === 'block') {
      const gridInfo = worldToGrid(x, z, mapData);
      if (!gridInfo) return;
      const index = gridInfo.index;
      // 只在移动到新格子时才操作
      if (lastBlockIndexRef.current === index) return;
      lastBlockIndexRef.current = index;
      
      setMapData((prev) => {
        const next = structuredClone(prev);
        const cells = next.gridCells ?? (next.gridCells = []);
        if (!cells.includes(index)) {
          cells.push(index);
        }
        return next;
      });
    } else if (isRightMouseDownRef.current && tool === 'block') {
      const gridInfo = worldToGrid(x, z, mapData);
      if (!gridInfo) return;
      const index = gridInfo.index;
      // 只在移动到新格子时才操作
      if (lastBlockIndexRef.current === index) return;
      lastBlockIndexRef.current = index;
      
      setMapData((prev) => {
        const next = structuredClone(prev);
        const cells = next.gridCells ?? [];
        const pos = cells.indexOf(index);
        if (pos >= 0) {
          cells.splice(pos, 1);
        }
        return next;
      });
    }
  };

  const handleCanvasUp = () => {
    isMouseDownRef.current = false;
    isLeftMouseDownRef.current = false;
    isRightMouseDownRef.current = false;
    dragRef.current = null;
    lastBlockIndexRef.current = null; // 清空记录
  };

  const handleCanvasContextMenu = (evt) => {
    if (!mapData) return;
    evt.preventDefault();
    
    const { x, y, z } = screenToWorld(evt);

    // 右键单击（不拖动）处理取消逻辑
    if (tool === 'block') {
      // 单个右键点击取消该格子
      if (!mapData.gridWidth || mapData.gridWidth <= 0 || !mapData.gridHeight || mapData.gridHeight <= 0) return;
      const cols = gridColCount;
      const rows = gridRowCount;
      if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) return;
      const gx = Math.floor(x / mapData.gridWidth);
      const gz = Math.floor(z / mapData.gridHeight);
      if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) return;
      const index = gz * cols + gx;
      setMapData((prev) => {
        const next = structuredClone(prev);
        const arr = next.gridCells ?? (next.gridCells = []);
        const pos = arr.indexOf(index);
        if (pos >= 0) {
          arr.splice(pos, 1);
        }
        return next;
      });
    } else if (tool === 'point') {
      const hit = findNearestPointByScreen(mapData.points, evt, 10);
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
          const hit = findNearestPointByScreen(path.points, evt, 10);
          if (hit) {
            path.points = path.points.filter((pt) => pt !== hit);
            updated = true;
          }
        }
        return next;
      });
      // 右键结束当前路径编辑
      setCurrentPathId(null);
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
      mapWidth: 31.25, // 1000px / 32
      mapHeight: 62.5, // 1000px / 16
      gridWidth: 1.5625, // 50px / 32
      gridHeight: 3.125, // 50px / 16
      colCount: 20,
      rowCount: 20,
      imageTree: [],
      points: [],
      paths: [],
      triggerAreas: [],
      gridCells: [],
      // 建筑区域默认与地图格一致，起始偏移为 0
      buildGridWidth: 1.5625,
      buildGridHeight: 3.125,
      buildOffsetX: 0,
      buildOffsetY: 0,
      buildGridCells: []
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
        <div className="grid grid-cols-4 gap-2 text-sm p-4 pb-3 flex-shrink-0">
          {[
            { id: 'info', label: '基础信息' },
            { id: 'block', label: '阻挡' },
            { id: 'build', label: '建筑区' },
            { id: 'point', label: '关键点' },
            { id: 'path', label: '路径' },
            { id: 'trigger', label: '触发区' },
            { id: 'image', label: '图片' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setTool(btn.id)}
              className={`py-2 rounded border text-sm ${tool === btn.id ? 'border-blue-500 bg-blue-600/40 text-white' : 'border-slate-700 bg-slate-900 text-slate-200'}`}
              title={btn.label}
            >
              <span className="block text-center whitespace-nowrap">{btn.label}</span>
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
            <PointTool
              mapData={mapData}
              setMapData={setMapData}
              selectedPointId={selectedPointId}
              setSelectedPointId={setSelectedPointId}
              onClearAllPoints={() => {
                if (!mapData) return;
                setMapData((p) => ({ ...p, points: [] }));
                setSelectedPointId(null);
              }}
            />
          )}
          {tool === 'path' && (
            <PathTool mapData={mapData} setMapData={setMapData} currentPathId={currentPathId} setCurrentPathId={setCurrentPathId} />
          )}
          {tool === 'block' && (
            <BlockTool
              gridColCount={gridColCount}
              gridRowCount={gridRowCount}
              showBlockedCells={showBlockedCells}
              setShowBlockedCells={setShowBlockedCells}
              onClearAllBlocked={() => {
                if (!mapData) return;
                setMapData((p) => ({ ...p, gridCells: [] }));
              }}
            />
          )}
          {tool === 'build' && (
            <BuildTool mapData={mapData} setMapData={setMapData} buildCols={buildColCount} buildRows={buildRowCount} />
          )}
        </div>
      </div>

      {/* 右侧画布 - 使用 World 渲染地图 */}
      <div className="flex-1 relative">
        {mapData && (
          <MapEditorPreview
            ref={previewRef}
            mapData={mapData}
            showBlockedCells={showBlockedCells}
            tool={tool}
            onMouseDown={handleCanvasDown}
            onMouseMove={handleCanvasMove}
            onMouseUp={handleCanvasUp}
            onContextMenu={handleCanvasContextMenu}
          />
        )}
        
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
