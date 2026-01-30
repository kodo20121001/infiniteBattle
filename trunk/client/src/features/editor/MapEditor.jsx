import React, { useEffect, useMemo, useRef, useState } from 'react';
import { worldToMapPixel, mapPixelToWorld } from '../../game/core/base/WorldProjection';
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
  const [dragPointId, setDragPointId] = useState(null);
  const [currentPathId, setCurrentPathId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [dragNodeId, setDragNodeId] = useState(null); // imageTree 中选中的节点 id
  const [dirHandle, setDirHandle] = useState(null); // 保存目录句柄
  const [savePathName, setSavePathName] = useState(''); // 保存路径显示名称
  const [toast, setToast] = useState(''); // 临时提示
  const [showBlockedCells, setShowBlockedCells] = useState(true); // 显示阻挡格子
  const canvasRef = useRef(null);
  const renderMetaRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const imageCacheRef = useRef(new Map());
  const isMouseDownRef = useRef(false);
  const isLeftMouseDownRef = useRef(false);
  const isRightMouseDownRef = useRef(false);

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

  const canvasToWorld = (evt) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const { scale, offsetX, offsetY } = renderMetaRef.current;
    const pxPerMeterX = mapData?.pixelsPerMeterX && mapData.pixelsPerMeterX > 0 ? mapData.pixelsPerMeterX : 32;
    const pxPerMeterY = mapData?.pixelsPerMeterY && mapData.pixelsPerMeterY > 0 ? mapData.pixelsPerMeterY : 16;
    // 先得到画布像素坐标
    const xPx = (evt.clientX - rect.left - offsetX) / scale;
    const yPx = (evt.clientY - rect.top - offsetY) / scale;
    // 使用 WorldProjection 转换为世界坐标（米）
    const [worldX, worldZ, worldY] = mapPixelToWorld(xPx, yPx, pxPerMeterX, pxPerMeterY);
    // 返回标准游戏坐标：x(水平), y(高度), z(深度)
    return { x: worldX, y: worldY, z: worldZ };
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

    // 像素密度（米->像素）
    const pxPerMeterX = mapData.pixelsPerMeterX && mapData.pixelsPerMeterX > 0 ? mapData.pixelsPerMeterX : 32;
    const pxPerMeterY = mapData.pixelsPerMeterY && mapData.pixelsPerMeterY > 0 ? mapData.pixelsPerMeterY : 16;

    // 地图尺寸换算到像素
    const mapWidthPx = mapData.mapWidth * pxPerMeterX;
    const mapHeightPx = mapData.mapHeight * pxPerMeterY;

    const maxWidth = canvas.parentElement?.clientWidth || mapWidthPx;
    const maxHeight = canvas.parentElement?.clientHeight || mapHeightPx;
    const scale = Math.min(
      (maxWidth - padding * 2) / mapWidthPx,
      (maxHeight - padding * 2) / mapHeightPx,
      1
    );
    const drawWidth = mapWidthPx * scale;
    const drawHeight = mapHeightPx * scale;

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
    ctx.fillRect(0, 0, mapWidthPx, mapHeightPx);

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

    // 网格（米->像素）
    const gridWidthPx = mapData.gridWidth * pxPerMeterX;
    const gridHeightPx = mapData.gridHeight * pxPerMeterY;
    const hasValidGridSize = Number.isFinite(gridWidthPx) && gridWidthPx > 0 && Number.isFinite(gridHeightPx) && gridHeightPx > 0;
    if (hasValidGridSize) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= mapWidthPx; x += gridWidthPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapHeightPx);
        ctx.stroke();
      }
      for (let y = 0; y <= mapHeightPx; y += gridHeightPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapWidthPx, y);
        ctx.stroke();
      }

      // 障碍格（米->像素）
      if (showBlockedCells) {
        ctx.fillStyle = 'rgba(239,68,68,0.45)';
        mapData.gridCells?.forEach((idx) => {
          const gx = idx % gridColCount;
          const gy = Math.floor(idx / gridColCount);
          ctx.fillRect(
            gx * gridWidthPx,
            gy * gridHeightPx,
            gridWidthPx,
            gridHeightPx
          );
        });
      }
    }

    // 建筑网格线与可建筑格（米->像素）
    if (buildColCount > 0 && buildRowCount > 0) {
      const buildGridWidthM = mapData.buildGridWidth ?? mapData.gridWidth;
      const buildGridHeightM = mapData.buildGridHeight ?? mapData.gridHeight;
      const bw = buildGridWidthM * pxPerMeterX;
      const bh = buildGridHeightM * pxPerMeterY;
      const ox = (mapData.buildOffsetX ?? 0) * pxPerMeterX;
      const oy = (mapData.buildOffsetY ?? 0) * pxPerMeterY;
      const hasValidBuildGrid = Number.isFinite(bw) && bw > 0 && Number.isFinite(bh) && bh > 0;
      if (hasValidBuildGrid) {
        // 网格线（根据偏移的余数起始，保持列/行数只受格子尺寸影响）
        ctx.strokeStyle = 'rgba(34,197,94,0.25)';
        const startX = ((ox % bw) + bw) % bw;
        const startY = ((oy % bh) + bh) % bh;
        for (let x = startX; x <= mapWidthPx; x += bw) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, mapHeightPx);
          ctx.stroke();
        }
        for (let y = startY; y <= mapHeightPx; y += bh) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(mapWidthPx, y);
          ctx.stroke();
        }
        // 可建筑格
        ctx.fillStyle = 'rgba(34,197,94,0.35)';
        (mapData.buildGridCells ?? []).forEach((idx) => {
          const gx = idx % buildColCount;
          const gy = Math.floor(idx / buildColCount);
          const px = ox + gx * bw;
          const py = oy + gy * bh;
          if (px < mapWidthPx && py < mapHeightPx) {
            ctx.fillRect(px, py, bw, bh);
          }
        });
      }
    }

    // 触发区域渲染（使用 worldToMapPixel 投影）
    if (mapData.triggerAreas) {
      mapData.triggerAreas.forEach((area) => {
        if (area.type === 'circle') {
          ctx.strokeStyle = 'rgba(59,130,246,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          // worldToMapPixel 参数顺序: (x, y, z) 标准游戏坐标
          const [centerX, centerY] = worldToMapPixel(
            area.center.x, 
            area.center.y, 
            area.center.z, 
            pxPerMeterX, 
            pxPerMeterY
          );
          // 半径直接乘以pxPerMeterX（假设圆形在地面上，水平半径）
          ctx.arc(centerX, centerY, area.radius * pxPerMeterX, 0, Math.PI * 2);
          ctx.stroke();
        } else if (area.type === 'rectangle') {
          ctx.strokeStyle = 'rgba(16,185,129,0.8)';
          ctx.lineWidth = 2;
          // worldToMapPixel 参数顺序: (x, y, z) 标准游戏坐标
          const [rectX, rectY] = worldToMapPixel(
            area.x, 
            area.y ?? 0, 
            area.z ?? 0, 
            pxPerMeterX, 
            pxPerMeterY
          );
          // width和depth转换为屏幕像素
          const rectWidth = area.width * pxPerMeterX;
          const rectDepth = area.depth * pxPerMeterY;
          ctx.strokeRect(rectX, rectY, rectWidth, rectDepth);
        } else if (area.type === 'grid') {
          if (hasValidGridSize) {
            ctx.fillStyle = 'rgba(234,179,8,0.35)';
            area.gridIndices.forEach((idx) => {
              const gx = idx % gridColCount;
              const gy = Math.floor(idx / gridColCount);
              ctx.fillRect(
                gx * gridWidthPx,
                gy * gridHeightPx,
                gridWidthPx,
                gridHeightPx
              );
            });
          }
        }
      });
    }

    // 路径渲染（使用 worldToMapPixel 投影）
    if (mapData.paths) {
      ctx.strokeStyle = 'rgba(59,130,246,0.9)';
      ctx.lineWidth = 2;
      mapData.paths.forEach((p) => {
        if (!p.points?.length) return;
        ctx.beginPath();
        // worldToMapPixel 参数顺序: (x, y, z) 标准游戏坐标
        const [firstX, firstY] = worldToMapPixel(p.points[0].x, p.points[0].y, p.points[0].z, pxPerMeterX, pxPerMeterY);
        ctx.moveTo(firstX, firstY);
        for (let i = 1; i < p.points.length; i++) {
          const [px, py] = worldToMapPixel(p.points[i].x, p.points[i].y, p.points[i].z, pxPerMeterX, pxPerMeterY);
          ctx.lineTo(px, py);
        }
        if (p.closed) ctx.closePath();
        ctx.stroke();
      });
    }

    // 关键点渲染（使用 worldToMapPixel 投影）
    if (mapData.points) {
      mapData.points.forEach((pt) => {
        // worldToMapPixel 参数顺序: (x, y, z) 标准游戏坐标
        const [screenX, screenY] = worldToMapPixel(pt.x, pt.y, pt.z, pxPerMeterX, pxPerMeterY);
        ctx.fillStyle = pt.id === selectedPointId ? '#fbbf24' : '#22c55e';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.fillText(pt.id ?? '', screenX + 8, screenY + 4);
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
    
    const { x, y, z } = canvasToWorld(evt);
    if (tool === 'block') {
      // 左键刷格子，右键在 contextmenu 中处理
      if (!isLeftButton) return;
      const cols = gridColCount;
      const rows = gridRowCount;
      if (!mapData.gridWidth || mapData.gridWidth <= 0 || !mapData.gridHeight || mapData.gridHeight <= 0) return;
      if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) return;
      // 格子使用地面坐标 x 和 z
      const gx = Math.floor(x / mapData.gridWidth);
      const gz = Math.floor(z / mapData.gridHeight);
      if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) return;
      const index = gz * cols + gx;
      handleToggleCell(index);
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
      // 在地面平面 (x-z) 上检测点击，半径使用米单位（0.3m）
      const hitRadius = 0.3;
      const hit = (mapData.points ?? []).find((p) => {
        const dx = p.x - x; const dz = p.z - z; return dx * dx + dz * dz <= hitRadius * hitRadius;
      });
      if (hit) {
        setSelectedPointId(hit.id ?? null);
        setDragPointId(hit.id ?? null);
      } else {
        const newId = nextId(mapData.points, 1);
        // 新建点：使用 canvasToWorld 返回的坐标（y=0 为地面高度）
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
      // 检测点击的图片节点（节点坐标存像素，这里换算成米比较）
      const pxPerMeterX = mapData.pixelsPerMeterX && mapData.pixelsPerMeterX > 0 ? mapData.pixelsPerMeterX : 32;
      const pxPerMeterY = mapData.pixelsPerMeterY && mapData.pixelsPerMeterY > 0 ? mapData.pixelsPerMeterY : 16;
      // image 节点使用 x 和 z（地面坐标）
      const findNodeAt = (nodes, xMeters, zMeters) => {
        if (!nodes) return null;
        for (let i = nodes.length - 1; i >= 0; i--) {
          const node = nodes[i];
          const img = node.path ? imageCacheRef.current.get(node.path) : null;
          const w = node.width ?? img?.naturalWidth ?? 0;
          const h = node.height ?? img?.naturalHeight ?? 0;
          const scale = node.scale ?? 1;
          // ImageNode.x/y 是像素坐标，转成米坐标（地面 x-z 平面）
          const nodeX = node.x / pxPerMeterX;
          const nodeZ = node.y / pxPerMeterY;
          const halfW = (w * scale) / 2 / pxPerMeterX;
          const halfH = (h * scale) / 2 / pxPerMeterY;
          const x1 = nodeX - halfW;
          const x2 = nodeX + halfW;
          const z1 = nodeZ - halfH;
          const z2 = nodeZ + halfH;
          if (xMeters >= x1 && xMeters <= x2 && zMeters >= z1 && zMeters <= z2) {
            return node;
          }
          const found = findNodeAt(node.children, xMeters, zMeters);
          if (found) return found;
        }
        return null;
      };
      const hit = findNodeAt(mapData.imageTree, x, z);
      if (hit) {
        setSelectedNodeId(hit.id);
        setDragNodeId(hit.id);
      }
    }
  };

  const handleCanvasMove = (evt) => {
    if (!mapData) return;
    if (!isMouseDownRef.current) return;
    // 处理左键拖动刷格子
    if (isLeftMouseDownRef.current && tool === 'block') {
      // 拖动时持续刷格子
      const { x, y, z } = canvasToWorld(evt);
      const cols = gridColCount;
      const rows = gridRowCount;
      if (!mapData.gridWidth || mapData.gridWidth <= 0 || !mapData.gridHeight || mapData.gridHeight <= 0) return;
      if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) return;
      const gx = Math.floor(x / mapData.gridWidth);
      const gz = Math.floor(z / mapData.gridHeight);
      if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) return;
      const index = gz * cols + gx;
      // 检查该格子是否已经在列表中，只在新格子时添加/删除
      setMapData((prev) => {
        const next = structuredClone(prev);
        const arr = next.gridCells ?? (next.gridCells = []);
        const pos = arr.indexOf(index);
        if (pos >= 0) {
          // 已选中，保持不变
        } else {
          // 未选中，添加
          arr.push(index);
        }
        return next;
      });
    } else if (isRightMouseDownRef.current && tool === 'block') {
      // 右键拖动批量取消格子
      const { x, y, z } = canvasToWorld(evt);
      const cols = gridColCount;
      const rows = gridRowCount;
      if (!mapData.gridWidth || mapData.gridWidth <= 0 || !mapData.gridHeight || mapData.gridHeight <= 0) return;
      if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) return;
      const gx = Math.floor(x / mapData.gridWidth);
      const gz = Math.floor(z / mapData.gridHeight);
      if (gx < 0 || gz < 0 || gx >= cols || gz >= rows) return;
      const index = gz * cols + gx;
      // 批量取消格子
      setMapData((prev) => {
        const next = structuredClone(prev);
        const arr = next.gridCells ?? (next.gridCells = []);
        const pos = arr.indexOf(index);
        if (pos >= 0) {
          // 已选中，移除
          arr.splice(pos, 1);
        }
        return next;
      });
    } else if (tool === 'point' && dragPointId != null) {
      const { x, y, z } = canvasToWorld(evt);
      setMapData((p) => {
        const next = structuredClone(p);
        const target = next.points?.find((pt) => pt.id === dragPointId);
        if (target) {
          // 拖拽只更新地面坐标 x 和 z，保持高度 y 不变
          target.x = x; 
          target.z = z;
          // target.y 保持不变（高度在侧边栏编辑）
        }
        return next;
      });
    } else if (tool === 'image' && dragNodeId != null) {
      const { x, y, z } = canvasToWorld(evt); // 世界坐标（米）
      const pxPerMeterX = mapData.pixelsPerMeterX && mapData.pixelsPerMeterX > 0 ? mapData.pixelsPerMeterX : 32;
      const pxPerMeterY = mapData.pixelsPerMeterY && mapData.pixelsPerMeterY > 0 ? mapData.pixelsPerMeterY : 16;
      const updateNodePos = (nodes, id, newXMeters, newZMeters) => {
        if (!nodes) return false;
        for (const node of nodes) {
          if (node.id === id) {
            // ImageNode 使用像素坐标
            node.x = newXMeters * pxPerMeterX;
            node.y = newZMeters * pxPerMeterY;
            return true;
          }
          if (updateNodePos(node.children, id, newXMeters, newZMeters)) return true;
        }
        return false;
      };
      setMapData((p) => {
        const next = structuredClone(p);
        updateNodePos(next.imageTree, dragNodeId, x, z);
        return next;
      });
    }
  };

  const handleCanvasUp = () => {
    isMouseDownRef.current = false;
    isLeftMouseDownRef.current = false;
    isRightMouseDownRef.current = false;
    setDragPointId(null);
    setDragNodeId(null);
  };

  const handleCanvasContextMenu = (evt) => {
    if (!mapData) return;
    evt.preventDefault();
    
    const { x, y, z } = canvasToWorld(evt);

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
      const hit = findNearestPoint(mapData.points, x, z);
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
          const hit = findNearestPoint(path.points, x, z);
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
      pixelsPerMeterX: 32,
      pixelsPerMeterY: 16,
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
            <PointTool mapData={mapData} setMapData={setMapData} selectedPointId={selectedPointId} setSelectedPointId={setSelectedPointId} />
          )}
          {tool === 'path' && (
            <PathTool mapData={mapData} setMapData={setMapData} currentPathId={currentPathId} setCurrentPathId={setCurrentPathId} />
          )}
          {tool === 'block' && (
            <BlockTool gridColCount={gridColCount} gridRowCount={gridRowCount} showBlockedCells={showBlockedCells} setShowBlockedCells={setShowBlockedCells} mapData={mapData} setMapData={setMapData} setToast={setToast} />
          )}
          {tool === 'build' && (
            <BuildTool mapData={mapData} setMapData={setMapData} buildCols={buildColCount} buildRows={buildRowCount} />
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
          <div className="text-slate-300">模式：{tool === 'block' ? '阻挡刷子' : tool === 'build' ? '建筑刷子' : tool === 'point' ? '关键点' : '路径'} | 点击画布进行编辑</div>
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
