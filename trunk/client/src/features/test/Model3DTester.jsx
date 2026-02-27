import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MToonMaterial } from '@pixiv/three-vrm';

// ── 数据定义 ────────────────────────────────────────────────

const MODELS = [
  '30001', '30002', '30003', '30004', '30005',
  '30006', '30007', '30008', '30009'
];

const ANIMATIONS = [
  { id: 'daiji', name: '待机' },
  { id: 'yidong', name: '移动' },
  { id: 'pugong', name: '普攻' },
  { id: 'jineng', name: '技能' },
  { id: 'beiji', name: '被击' },
  { id: 'xuanyun', name: '眩晕' },
  { id: 'siwang', name: '死亡' },
  { id: 'xiuxian1', name: '休闲1' },
  { id: 'xiuxian2', name: '休闲2' }
];

const SHADER_OPTIONS = [
  { id: 'standard', name: 'Standard (默认 PBR)' },
  { id: 'mtoon', name: 'MToon (二次元 + 描边)' },
  { id: 'toon', name: 'Toon (Three.js 卡通)' },
  { id: 'phong', name: 'Phong (经典高光)' },
  { id: 'basic', name: 'Basic (无光照纯色)' }
];

// ── 材质工厂 ────────────────────────────────────────────────

/** 根据原始材质创建各种风格的替代材质 */
function createMaterialVariants(origMat) {
  const materials = {};

  // MToon 主材质（不在构造函数传参，避免 setter 死循环）
  const mtoon = new MToonMaterial();
  if (origMat.color) mtoon.color.copy(origMat.color);
  mtoon.shadeColorFactor.setHex(0x888888);
  mtoon.shadingToonyFactor = 0.9;
  if (origMat.map) {
    mtoon.map = origMat.map;
    mtoon.shadeMultiplyTexture = origMat.map;
  }
  materials.mtoon = mtoon;

  // MToon 描边材质（渲染背面的放大网格，实现 two-pass outline）
  const outline = new MToonMaterial();
  if (origMat.color) outline.color.copy(origMat.color);
  outline.shadeColorFactor.setHex(0x888888);
  outline.shadingToonyFactor = 0.9;
  outline.outlineWidthMode = 'worldCoordinates';
  outline.outlineWidthFactor = 0.05;
  outline.outlineColorFactor.setHex(0x000000);
  outline.side = THREE.BackSide;
  outline.isOutline = true;
  if (origMat.map) {
    outline.map = origMat.map;
    outline.shadeMultiplyTexture = origMat.map;
  }
  materials.mtoonOutline = outline;

  // Three.js 内置材质
  materials.basic = new THREE.MeshBasicMaterial({ color: origMat.color, map: origMat.map });
  materials.phong = new THREE.MeshPhongMaterial({ color: origMat.color, map: origMat.map, shininess: 100, specular: new THREE.Color(0x444444) });
  materials.toon = new THREE.MeshToonMaterial({ color: origMat.color, map: origMat.map });

  return materials;
}

// ── 材质应用 ────────────────────────────────────────────────

/** 为单个 mesh 应用指定 shader，同时管理 outline 子网格 */
function applyShaderToMesh(child, shaderType, originalMaterials, customMaterials) {
  // 还原 standard
  if (shaderType === 'standard') {
    const orig = originalMaterials.get(child.uuid);
    if (orig) child.material = orig;
  } else {
    const mats = customMaterials.get(child.uuid);
    if (mats?.[shaderType]) child.material = mats[shaderType];
  }

  // 管理 MToon 描边子网格
  const existingOutline = child.children.find(c => c.userData.isOutline);
  if (shaderType === 'mtoon') {
    if (!existingOutline && child.isSkinnedMesh) {
      const mats = customMaterials.get(child.uuid);
      if (mats?.mtoonOutline) {
        const outlineMesh = new THREE.SkinnedMesh(child.geometry, mats.mtoonOutline);
        if (child.skeleton) outlineMesh.bind(child.skeleton, child.bindMatrix);
        outlineMesh.userData.isOutline = true;
        child.add(outlineMesh);
      }
    }
  } else if (existingOutline) {
    child.remove(existingOutline);
  }
}

/** 收集模型中的有效 mesh 列表（排除 outline 子网格） */
function collectMeshes(model) {
  const meshes = [];
  model.traverse((child) => {
    if (child.isMesh && !child.userData.isOutline) meshes.push(child);
  });
  return meshes;
}

// ── 组件 ────────────────────────────────────────────────────

const Model3DTester = ({ onBack }) => {
  const containerRef = useRef(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [selectedAnim, setSelectedAnim] = useState(ANIMATIONS[0].id);
  const [shaderType, setShaderType] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Three.js 持久对象
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const mixerRef = useRef(null);
  const modelRef = useRef(null);
  const originalMaterialsRef = useRef(new Map());
  const customMaterialsRef = useRef(new Map());
  const animFrameRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  // ── 初始化 Three.js 场景（仅执行一次）──────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);
    scene.add(new THREE.GridHelper(10, 10, 0x444444, 0x222222));
    scene.add(new THREE.AxesHelper(5));
    sceneRef.current = scene;

    // 相机
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.set(0, 2, 5);
    cameraRef.current = camera;

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    controlsRef.current = controls;

    // 渲染循环
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const dt = clockRef.current.getDelta();
      if (mixerRef.current) mixerRef.current.update(dt);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 窗口缩放
    const onResize = () => {
      if (!containerRef.current) return;
      const nw = containerRef.current.clientWidth;
      const nh = containerRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.domElement.remove();
      renderer.dispose();
    };
  }, []);

  // ── 加载模型 & 动画（切换模型或动作时触发）─────────────

  useEffect(() => {
    if (!sceneRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // 清理旧模型
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    originalMaterialsRef.current.clear();
    customMaterialsRef.current.clear();

    const loader = new GLTFLoader();
    const modelUrl = `/3d/Character/${selectedModel}/${selectedModel}.glb`;
    const animUrl = `/3d/Animation/${selectedModel}/${selectedModel}@${selectedAnim}.glb`;

    Promise.all([
      loader.loadAsync(modelUrl),
      loader.loadAsync(animUrl)
    ])
      .then(([modelGltf, animGltf]) => {
        if (cancelled) return;

        const model = modelGltf.scene;
        const meshes = collectMeshes(model);

        // 为每个 mesh 创建材质变体，并应用当前 shader
        meshes.forEach((child) => {
          child.castShadow = true;
          child.receiveShadow = true;

          originalMaterialsRef.current.set(child.uuid, child.material);
          customMaterialsRef.current.set(child.uuid, createMaterialVariants(child.material));
          applyShaderToMesh(child, shaderType, originalMaterialsRef.current, customMaterialsRef.current);
        });

        sceneRef.current.add(model);
        modelRef.current = model;

        // 播放动画
        if (animGltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(animGltf.animations[0]).play();
          mixerRef.current = mixer;
        }

        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error(err);
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedModel, selectedAnim]);

  // ── 切换 Shader（仅替换材质，不重新加载模型）──────────

  useEffect(() => {
    if (!modelRef.current) return;
    collectMeshes(modelRef.current).forEach((child) => {
      applyShaderToMesh(child, shaderType, originalMaterialsRef.current, customMaterialsRef.current);
    });
  }, [shaderType]);

  // ── UI ─────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden">
      {/* 左侧面板 */}
      <div className="w-64 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">3D 模型测试</h2>
          <button onClick={onBack} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors">返回</button>
        </div>

        {/* Shader 选择 */}
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">渲染材质</h3>
          <select
            value={shaderType}
            onChange={(e) => setShaderType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SHADER_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        {/* 模型列表 */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">选择模型</h3>
          <div className="space-y-1">
            {MODELS.map(id => (
              <button
                key={id}
                onClick={() => setSelectedModel(id)}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  selectedModel === id ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'
                }`}
              >
                模型 {id}
              </button>
            ))}
          </div>
        </div>

        {/* 动作列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">选择动作</h3>
          <div className="space-y-1">
            {ANIMATIONS.map(anim => (
              <button
                key={anim.id}
                onClick={() => setSelectedAnim(anim.id)}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  selectedAnim === anim.id ? 'bg-emerald-600 text-white' : 'hover:bg-slate-700 text-slate-300'
                }`}
              >
                {anim.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧 3D 视口 */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* 信息浮层 */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-white/10">
            <div className="text-white font-medium">模型: {selectedModel}</div>
            <div className="text-slate-300 text-sm">动作: {ANIMATIONS.find(a => a.id === selectedAnim)?.name}</div>
            <div className="text-slate-300 text-sm">材质: {SHADER_OPTIONS.find(s => s.id === shaderType)?.name}</div>
          </div>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-white font-medium">加载中...</div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-lg max-w-md text-center">
              <div className="font-bold mb-2 text-lg">加载失败</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Model3DTester;
