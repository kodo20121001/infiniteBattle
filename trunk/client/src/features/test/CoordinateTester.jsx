import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const CoordinateTester = ({ onBack }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);

  // 坐标系配置
  const [mapWidth, setMapWidth] = useState(25);
  const [mapHeight, setMapHeight] = useState(68);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [lastClick, setLastClick] = useState(null);
  const [clickedCells, setClickedCells] = useState(new Set());
  const clickedCellMeshesRef = useRef(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 清理旧的 canvas（用于热更新/重复初始化）
    containerRef.current.innerHTML = '';

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // 创建俯视角正交摄像机（从上往下看）
    // 视口范围：left, right, top, bottom
    const aspect = width / height;
    const viewHeight = mapHeight;
    const viewWidth = viewHeight * aspect;
    
    const camera = new THREE.OrthographicCamera(
      viewWidth / 2,
      -viewWidth / 2,
      viewHeight / 2,
      -viewHeight / 2,
      0.1,
      1000
    );
    // 俯视角：相机在上方，朝向 XZ 平面
    // 让屏幕“上方”对应 +Z 方向
    camera.up.set(0, 0, 1);
    camera.position.set(mapWidth / 2, 50, mapHeight / 2);
    camera.lookAt(mapWidth / 2, 0, mapHeight / 2);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 清理旧的对象
    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    // 添加坐标轴（原点在左下角）
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // 创建4个角的标记
    const cornerSize = 1;
    const cornerHeight = 0.5;

    // 左下角 (0, 0) - 红色
    const corner1 = new THREE.Mesh(
      new THREE.BoxGeometry(cornerSize, cornerSize, cornerHeight),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    corner1.position.set(0, 0, 0);
    scene.add(corner1);

    // 右下角 (mapWidth, 0) - 绿色
    const corner2 = new THREE.Mesh(
      new THREE.BoxGeometry(cornerSize, cornerSize, cornerHeight),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    corner2.position.set(mapWidth, 0, 0);
    scene.add(corner2);

    // 左上角 (0, mapHeight) - 蓝色
    const corner3 = new THREE.Mesh(
      new THREE.BoxGeometry(cornerSize, cornerSize, cornerHeight),
      new THREE.MeshBasicMaterial({ color: 0x0000ff })
    );
    corner3.position.set(0, 0, mapHeight);
    scene.add(corner3);

    // 右上角 (mapWidth, mapHeight) - 黄色
    const corner4 = new THREE.Mesh(
      new THREE.BoxGeometry(cornerSize, cornerSize, cornerHeight),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    corner4.position.set(mapWidth, 0, mapHeight);
    scene.add(corner4);

    // 添加地图边界框
    const borderGeometry = new THREE.BufferGeometry();
    const borderVertices = new Float32Array([
      0, 0, 0,
      mapWidth, 0, 0,
      mapWidth, 0, mapHeight,
      0, 0, mapHeight,
      0, 0, 0
    ]);
    borderGeometry.setAttribute('position', new THREE.BufferAttribute(borderVertices, 3));
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const borderLine = new THREE.Line(borderGeometry, borderMaterial);
    scene.add(borderLine);

    // 添加网格 (0.5 x 0.5 大小的格子)
    const gridCellSize = 0.5;
    const gridSize = Math.max(mapWidth, mapHeight);
    const gridDivisions = Math.ceil(gridSize / gridCellSize);
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x222222);
    gridHelper.position.set(mapWidth / 2, 0, mapHeight / 2);
    scene.add(gridHelper);

    // 添加中心点标记
    const centerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    centerMarker.position.set(mapWidth / 2, 0, mapHeight / 2);
    scene.add(centerMarker);

    // 添加Canvas坐标系的4个角标记（使用圆锥体区分）
    // Canvas坐标系：原点在左上角，X向右，Y向下
    const coneSize = 0.8;
    const coneHeight = 1.5;

    // 将Canvas坐标转换为世界坐标的辅助函数
    const canvasToWorld = (canvasX, canvasY) => {
      // Canvas坐标 -> NDC坐标
      const ndcX = (canvasX / width) * 2 - 1;
      const ndcY = -(canvasY / height) * 2 + 1;
      
      // NDC -> 世界坐标（通过相机逆投影）
      const aspect = width / height;
      const viewHeight = mapHeight / cameraZoom;
      const viewWidth = viewHeight * aspect;
      
      const worldX = mapWidth / 2 - ndcX * viewWidth / 2;
      const worldZ = mapHeight / 2 + ndcY * viewHeight / 2;
      
      return { x: worldX, z: worldZ };
    };

    // Canvas左上角 (0, 0) - 青色圆锥
    const canvasCorner1Pos = canvasToWorld(0, 0);
    const canvasCorner1 = new THREE.Mesh(
      new THREE.ConeGeometry(coneSize, coneHeight, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    canvasCorner1.position.set(canvasCorner1Pos.x, 0, canvasCorner1Pos.z);
    scene.add(canvasCorner1);

    // Canvas右上角 (width, 0) - 橙色圆锥
    const canvasCorner2Pos = canvasToWorld(width, 0);
    const canvasCorner2 = new THREE.Mesh(
      new THREE.ConeGeometry(coneSize, coneHeight, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8800 })
    );
    canvasCorner2.position.set(canvasCorner2Pos.x, 0, canvasCorner2Pos.z);
    scene.add(canvasCorner2);

    // Canvas左下角 (0, height) - 粉色圆锥
    const canvasCorner3Pos = canvasToWorld(0, height);
    const canvasCorner3 = new THREE.Mesh(
      new THREE.ConeGeometry(coneSize, coneHeight, 8),
      new THREE.MeshBasicMaterial({ color: 0xff00aa })
    );
    canvasCorner3.position.set(canvasCorner3Pos.x, 0, canvasCorner3Pos.z);
    scene.add(canvasCorner3);

    // Canvas右下角 (width, height) - 白色圆锥
    const canvasCorner4Pos = canvasToWorld(width, height);
    const canvasCorner4 = new THREE.Mesh(
      new THREE.ConeGeometry(coneSize, coneHeight, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    canvasCorner4.position.set(canvasCorner4Pos.x, 0, canvasCorner4Pos.z);
    scene.add(canvasCorner4);

    // 计算格子 ID 的函数
    const calculateGridId = (worldX, worldZ) => {
      const gridSize = 0.5;
      const gridX = Math.floor(worldX / gridSize);
      const gridZ = Math.floor(worldZ / gridSize);
      const gridId = gridZ * Math.ceil(mapWidth / gridSize) + gridX;
      return {
        gridX,
        gridZ,
        gridId
      };
    };

    // 点击显示 Canvas/World 坐标
    const onCanvasClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;

      const ndcX = (canvasX / rect.width) * 2 - 1;
      const ndcY = -(canvasY / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const worldPos = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, worldPos);

      if (!worldPos) return;

      const gridInfo = calculateGridId(worldPos.x, worldPos.z);

      setLastClick({
        canvas: { x: canvasX.toFixed(2), y: canvasY.toFixed(2) },
        world: { x: worldPos.x.toFixed(2), y: worldPos.y.toFixed(2), z: worldPos.z.toFixed(2) },
        grid: gridInfo
      });

      // 打印格子 ID
      console.log(`格子 ID: ${gridInfo.gridId} (格子位置: [${gridInfo.gridX}, ${gridInfo.gridZ}])`);

      // 切换格子高亮状态
      const cellKey = `${gridInfo.gridX},${gridInfo.gridZ}`;
      setClickedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cellKey)) {
          newSet.delete(cellKey); // 再次点击则移除
          // 移除对应的网格
          const mesh = clickedCellMeshesRef.current.get(cellKey);
          if (mesh) {
            scene.remove(mesh);
            clickedCellMeshesRef.current.delete(cellKey);
          }
        } else {
          newSet.add(cellKey); // 添加新格子
          // 创建红色格子
          const gridSize = 0.5;
          const boxGeometry = new THREE.BoxGeometry(gridSize, 0.1, gridSize);
          const boxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.6 
          });
          const box = new THREE.Mesh(boxGeometry, boxMaterial);
          box.position.set(
            gridInfo.gridX * gridSize + gridSize / 2, 
            0.05, 
            gridInfo.gridZ * gridSize + gridSize / 2
          );
          scene.add(box);
          clickedCellMeshesRef.current.set(cellKey, box);
        }
        return newSet;
      });
    };

    renderer.domElement.addEventListener('click', onCanvasClick);

    // 渲染循环
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // 更新相机缩放
      const aspect = width / height;
      const viewHeight = mapHeight / cameraZoom;
      const viewWidth = viewHeight * aspect;
      
      camera.left = viewWidth / 2;
      camera.right = -viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小变化处理
    const handleResize = () => {
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      
      renderer.setSize(newWidth, newHeight);
      
      const aspect = newWidth / newHeight;
      const viewHeight = mapHeight / cameraZoom;
      const viewWidth = viewHeight * aspect;
      
      camera.left = viewWidth / 2;
      camera.right = -viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onCanvasClick);
      if (animationId) cancelAnimationFrame(animationId);
      // 清理点击的格子
      clickedCellMeshesRef.current.forEach(mesh => {
        scene.remove(mesh);
      });
      clickedCellMeshesRef.current.clear();
      setClickedCells(new Set());
      renderer.dispose();
      scene.clear();
      if (renderer.domElement.parentElement === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [mapWidth, mapHeight, cameraZoom]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f172a' }}>
      {/* 左侧属性面板 */}
      <div style={{
        width: '300px',
        background: '#1e293b',
        color: '#e2e8f0',
        padding: '20px',
        overflowY: 'auto',
        borderRight: '1px solid #334155'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            ← 返回
          </button>
        </div>

        <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>坐标系测试</h2>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>
            地图配置
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              地图宽度 (米)
            </label>
            <input
              type="number"
              value={mapWidth}
              onChange={(e) => setMapWidth(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#e2e8f0'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              地图高度 (米)
            </label>
            <input
              type="number"
              value={mapHeight}
              onChange={(e) => setMapHeight(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#e2e8f0'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              相机缩放
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={cameraZoom}
              onChange={(e) => setCameraZoom(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {cameraZoom.toFixed(1)}x
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>
            点击坐标
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '4px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                已标记格子数: <span style={{ color: '#ef4444', fontWeight: '600' }}>{clickedCells.size}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                点击格子标记为红色，再次点击取消
              </div>
            </div>
            <div style={{ padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              {lastClick ? (
                <>
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>Canvas坐标</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                    ({lastClick.canvas.x}, {lastClick.canvas.y})
                  </div>
                  <div style={{ fontWeight: '600', margin: '12px 0 8px' }}>World坐标</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                    ({lastClick.world.x}, {lastClick.world.y}, {lastClick.world.z})
                  </div>
                  <div style={{ fontWeight: '600', margin: '12px 0 8px' }}>格子信息</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                    ID: {lastClick.grid.gridId}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                    位置: [{lastClick.grid.gridX}, {lastClick.grid.gridZ}]
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>点击右侧画布查看坐标</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>
            世界坐标系（方块）
          </h3>
          
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🔴 左下角 (0, 0)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>原点位置 (X,Z)</div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🟢 右下角 ({mapWidth}, 0)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>X轴最大值</div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🔵 左上角 (0, {mapHeight})</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Z轴最大值</div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🟡 右上角 ({mapWidth}, {mapHeight})</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>地图右上角 (X,Z)</div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🟣 中心点 ({mapWidth / 2}, {mapHeight / 2})</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>地图中心 (X,Z)</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>
            Canvas坐标系（圆锥）
          </h3>
          
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🔷 左上角 (0, 0)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Canvas原点</div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🟠 右上角 (width, 0)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Canvas右上</div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>🩷 左下角 (0, height)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Canvas左下</div>
            </div>

            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>⚪ 右下角 (width, height)</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Canvas右下</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#94a3b8' }}>
            坐标系对比
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>世界坐标系</div>
              <ul style={{ fontSize: '12px', color: '#94a3b8', paddingLeft: '20px', marginTop: '4px' }}>
                <li>原点：左下角 (0, 0) (X,Z)</li>
                <li>X轴：向右递增</li>
                <li>Z轴：向上递增</li>
                <li>Y轴：垂直向上</li>
                <li>单位：米</li>
              </ul>
            </div>
            <div style={{ marginBottom: '12px', padding: '12px', background: '#0f172a', borderRadius: '4px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Canvas坐标系</div>
              <ul style={{ fontSize: '12px', color: '#94a3b8', paddingLeft: '20px', marginTop: '4px' }}>
                <li>原点：左上角 (0, 0)</li>
                <li>X轴：向右递增</li>
                <li>Y轴：向下递增</li>
                <li>单位：像素</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧 Canvas */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          background: '#0f172a'
        }}
      />
    </div>
  );
};

export default CoordinateTester;
