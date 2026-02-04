import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { World } from '../../game/engine/common/World';
import { GameMap } from '../../game/core/impl/Map';
import { Sprite2D } from '../../game/engine/base/Sprite2D';

/**
 * 地图编辑器预览组件 - 使用 World 来渲染地图背景和对象
 * 背景图像由 World 渲染，编辑工具的可视化（网格、路径等）在上层 canvas 上绘制
 */
const MapEditorPreview = forwardRef(({
  mapData,
  showBlockedCells,
  tool,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu
}, ref) => {
  const containerRef = useRef(null);
  const worldCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const keypointCanvasRef = useRef(null);
  const keypointAnimRef = useRef(null);
  const mapDataRef = useRef(null);
  const worldRef = useRef(null);
  const mapRef = useRef(null);
  const gridSpriteRef = useRef(null);
  const buildGridSpriteRef = useRef(null);
  const blockedCellMeshesRef = useRef(new Map()); // 存储每个阻挡格子的 mesh
  const prevGridCellsRef = useRef(null);

  const rebuildGridGeometry = () => {
    if (!mapData || !worldRef.current) return;

    const spriteManager = worldRef.current.spriteManager;
    const mapWidth = mapData.mapWidth || 1;
    const mapHeight = mapData.mapHeight || 1;
    const mapPixelWidth = mapWidth;
    const mapPixelHeight = mapHeight;
    const pixelsPerUnitX = mapPixelWidth / mapWidth;
    const pixelsPerUnitY = mapPixelHeight / mapHeight;
    const gridWidthPx = (mapData.gridWidth ?? 0) * pixelsPerUnitX;
    const gridHeightPx = (mapData.gridHeight ?? 0) * pixelsPerUnitY;

    if (!Number.isFinite(gridWidthPx) || gridWidthPx <= 0 || !Number.isFinite(gridHeightPx) || gridHeightPx <= 0) return;

    // 建筑网格：如果没有单独配置，默认用地形网格大小的一半
    const buildGridWidthPx = ((mapData.buildGridWidth ?? (mapData.gridWidth ?? 0) / 2) * pixelsPerUnitX);
    const buildGridHeightPx = ((mapData.buildGridHeight ?? (mapData.gridHeight ?? 0) / 2) * pixelsPerUnitY);

    // 清理旧网格
    if (gridSpriteRef.current) {
      spriteManager.remove('map_grid');
      gridSpriteRef.current.destroy();
      gridSpriteRef.current = null;
    }

    // 网格线已禁用
    return;
  };

  const updateBlockedCells = () => {
    if (!mapData || !worldRef.current) return;

    // 检查 gridCells 是否真的改变了
    const currentGridCells = mapData.gridCells || [];
    const prevGridCells = prevGridCellsRef.current || [];
    
    // 检查数组内容是否相同（简单方法：长度和内容）
    if (currentGridCells.length === prevGridCells.length &&
        currentGridCells.every((val, idx) => val === prevGridCells[idx])) {
      // 内容没变，不需要重绘
      return;
    }
    
    // 更新缓存
    prevGridCellsRef.current = [...currentGridCells];

    const world = worldRef.current;
    const scene = world.renderer?.scene;
    if (!scene) return;

    const mapWidth = mapData.mapWidth || 1;
    const mapHeight = mapData.mapHeight || 1;
    const gridWidth = mapData.gridWidth ?? 1;
    const gridHeight = mapData.gridHeight ?? 1;
    const colCount = mapData.colCount || Math.floor(mapWidth / gridWidth);

    // 清理所有旧的阻挡格子 mesh
    blockedCellMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    blockedCellMeshesRef.current.clear();

    if (showBlockedCells) {
      // 为每个阻挡格子创建独立的 Three.js mesh
      currentGridCells.forEach((idx) => {
        const gx = idx % colCount;
        const gy = Math.floor(idx / colCount);
        
        // 创建红色半透明方块
        const boxGeometry = new THREE.BoxGeometry(gridWidth, 0.1, gridHeight);
        const boxMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xff0000, 
          transparent: true, 
          opacity: 0.6,
          depthTest: false,
          depthWrite: false
        });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        
        // 设置位置（世界坐标：左下角为原点）
        box.position.set(
          gx * gridWidth + gridWidth / 2, 
          0.05, 
          gy * gridHeight + gridHeight / 2
        );
        
        box.renderOrder = 11; // 确保在其他物体之上渲染
        
        scene.add(box);
        blockedCellMeshesRef.current.set(idx, box);
      });
    }
  };

  // 初始化 World（只在地图 ID 改变时重新初始化）
  useEffect(() => {
    if (!containerRef.current || !mapData) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    // 重置阻挡格缓存，确保 Three 重建后强制刷新
    prevGridCellsRef.current = null;

    // 创建 World canvas（背景渲染）
    const worldCanvas = document.createElement('canvas');
    worldCanvas.style.position = 'absolute';
    worldCanvas.style.top = '0';
    worldCanvas.style.left = '0';
    worldCanvas.style.width = '100%';
    worldCanvas.style.height = '100%';
    worldCanvas.style.zIndex = '0';
    containerRef.current.appendChild(worldCanvas);
    worldCanvasRef.current = worldCanvas;

    // 创建 overlay canvas（编辑工具可视化）
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.width = '100%';
    overlayCanvas.style.height = '100%';
    overlayCanvas.style.zIndex = '1';
    overlayCanvas.style.pointerEvents = 'auto';
    containerRef.current.appendChild(overlayCanvas);
    overlayCanvasRef.current = overlayCanvas;

    // 创建 keypoint canvas（关键点显示）
    const keypointCanvas = document.createElement('canvas');
    keypointCanvas.style.position = 'absolute';
    keypointCanvas.style.top = '0';
    keypointCanvas.style.left = '0';
    keypointCanvas.style.width = '100%';
    keypointCanvas.style.height = '100%';
    keypointCanvas.style.zIndex = '2';
    keypointCanvas.style.pointerEvents = 'none';
    containerRef.current.appendChild(keypointCanvas);
    keypointCanvasRef.current = keypointCanvas;

    // 初始化 canvas 大小
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    console.log('🎮 [MapEditorPreview] Canvas size:', width, 'x', height);
    worldCanvas.width = width;
    worldCanvas.height = height;
    overlayCanvas.width = width;
    overlayCanvas.height = height;
    keypointCanvas.width = width;
    keypointCanvas.height = height;

    // 创建 World
    const world = new World(worldCanvas, width, height, 60);
    worldRef.current = world;
    console.log('🎮 [MapEditorPreview] World created');

    // 加载地图到 World
    const loadMap = async () => {
      try {
        console.log('🎮 [MapEditorPreview] Loading map:', mapData);
        const gameMap = new GameMap(mapData, world.spriteManager, world.camera);
        mapRef.current = gameMap;
        
        // 加载地图图片
        console.log('🎮 [MapEditorPreview] Loading images...');
        await gameMap.loadImages();
        console.log('🎮 [MapEditorPreview] Images loaded');

        const mapWidth = mapData.mapWidth || 1;
        const mapHeight = mapData.mapHeight || 1;

        // 启动渲染
        world.start();

        // World 启动后创建网格/阻挡精灵
        rebuildGridGeometry();
        updateBlockedCells();

        // 显示 0.5 x 0.5 网格
        world.renderer.showGrid(mapWidth, mapHeight);

        // 4 个角点用 3D 方块显示（不编号）- 放在高处避免被背景遮挡
        world.renderer.addCubeMarker('corner_0_0', 0, 0.5, 0, 0xff0000, 0.6, 0.3);
        world.renderer.addCubeMarker('corner_max_x', mapWidth, 0.5, 0, 0x00ff00, 0.6, 0.3);
        world.renderer.addCubeMarker('corner_max_z', 0, 0.5, mapHeight, 0x0000ff, 0.6, 0.3);
        world.renderer.addCubeMarker('corner_max_xz', mapWidth, 0.5, mapHeight, 0xffff00, 0.6, 0.3);

        // 关键点显示统一用 camera 投影到屏幕
        const drawKeyPoints = () => {
          const ctx = keypointCanvasRef.current?.getContext('2d');
          const cam = world.camera;
          if (!ctx || !cam || !keypointCanvasRef.current) return;

          const w = keypointCanvasRef.current.width;
          const h = keypointCanvasRef.current.height;
          ctx.clearRect(0, 0, w, h);

          const drawCircleLabel = (x, y, text, fill = '#3ddc84') => {
            const r = 6;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = '10px monospace';
            ctx.fillStyle = '#0b0f1a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y + 0.5);
          };

          // 路径（使用 camera 投影）
          const paths = mapDataRef.current?.paths ?? [];
          ctx.strokeStyle = 'rgba(59,130,246,0.9)';
          ctx.lineWidth = 2;
          paths.forEach((p) => {
            if (!p.points?.length) return;
            ctx.beginPath();
            const first = cam.worldToCanvas(p.points[0].x, 0, p.points[0].z);
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < p.points.length; i++) {
              const sp = cam.worldToCanvas(p.points[i].x, 0, p.points[i].z);
              ctx.lineTo(sp.x, sp.y);
            }
            if (p.closed) ctx.closePath();
            ctx.stroke();
          });

          // 四角点改回 3D 方块显示（不编号）
          // 屏幕层不绘制角点

          // 地图点
          const points = mapDataRef.current?.points ?? [];
          points.forEach((p) => {
            const screen = cam.worldToCanvas(p.x, 0, p.z);
            drawCircleLabel(screen.x, screen.y, String(p.id), '#3ddc84');
          });
        };

        const loop = () => {
          keypointAnimRef.current = requestAnimationFrame(loop);
          drawKeyPoints();
        };
        loop();

      } catch (err) {
        console.error('Failed to load map:', err);
      }
    };

    loadMap();

    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      
      if (worldCanvasRef.current) {
        worldCanvasRef.current.width = newWidth;
        worldCanvasRef.current.height = newHeight;
      }
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = newWidth;
        overlayCanvasRef.current.height = newHeight;
      }
      if (keypointCanvasRef.current) {
        keypointCanvasRef.current.width = newWidth;
        keypointCanvasRef.current.height = newHeight;
      }
      
      // 只更新渲染器尺寸，保持摄像机的当前位置和缩放
      if (worldRef.current) {
        worldRef.current.camera.resize(newWidth, newHeight);
        worldRef.current.renderer.resize(newWidth, newHeight);
      }

    };

    // 初始化 canvas 大小
    handleResize();

    window.addEventListener('resize', handleResize);

    // 绑定事件处理
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      overlay.onmousedown = onMouseDown ?? null;
      overlay.onmousemove = onMouseMove ?? null;
      overlay.onmouseup = onMouseUp ?? null;
      overlay.oncontextmenu = (e) => {
        if (onContextMenu) onContextMenu(e);
        else e.preventDefault();
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (worldRef.current) {
        if (keypointAnimRef.current) {
          cancelAnimationFrame(keypointAnimRef.current);
          keypointAnimRef.current = null;
        }
        
        // 清理阻挡格子 meshes
        const scene = worldRef.current.renderer?.scene;
        if (scene) {
          blockedCellMeshesRef.current.forEach((mesh) => {
            scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          });
          blockedCellMeshesRef.current.clear();
        }
        
        worldRef.current.stop();
      }
    };
  }, [mapData?.id, mapData?.mapWidth, mapData?.mapHeight, mapData?.gridWidth, mapData?.gridHeight]); // 地图尺寸或网格尺寸改变时重新初始化

  // 始终保持最新 mapData 引用，供动画绘制使用
  useEffect(() => {
    mapDataRef.current = mapData;
  }, [mapData]);

  // 单独更新事件处理和 gridCells
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      overlay.onmousedown = onMouseDown ?? null;
      overlay.onmousemove = onMouseMove ?? null;
      overlay.onmouseup = onMouseUp ?? null;
      overlay.oncontextmenu = (e) => {
        if (onContextMenu) onContextMenu(e);
        else e.preventDefault();
      };
    }
  }, [onMouseDown, onMouseMove, onMouseUp, onContextMenu]);

  // 只在 gridCells 改变时更新阻挡层
  useEffect(() => {
    if (!worldRef.current) return;
    updateBlockedCells();
  }, [JSON.stringify(mapData?.gridCells)]);

  // 当工具切换时重新绘制网格（显示/隐藏建筑网格）
  useEffect(() => {
    if (!worldRef.current) return;
    rebuildGridGeometry();
  }, [tool]);

  // 图片节点变化时更新背景尺寸/位置（监听整个 mapData 以捕捉坐标改变）
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      try {
        await mapRef.current.updateImages(mapData?.imageTree ?? []);
      } catch (err) {
        console.error('Failed to update backgrounds:', err);
      }
    })();
  }, [mapData]);

  // 导出 camera 供外部使用
  useImperativeHandle(ref, () => ({
    get camera() { return worldRef.current?.camera; },
    getCamera: () => worldRef.current?.camera,
  }));

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#0f172a',
        overflow: 'hidden'
      }}
    />
  );
});

MapEditorPreview.displayName = 'MapEditorPreview';

export default MapEditorPreview;
