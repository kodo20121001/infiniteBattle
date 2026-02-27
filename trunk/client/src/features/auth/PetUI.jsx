import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Info, Lock, Sparkles, X, Swords, Shield, Zap, Move } from 'lucide-react';
import PetSynthesisEffect from './PetSynthesisEffect';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MToonMaterial } from '@pixiv/three-vrm';
import { PetConfig } from '../../config/PetConfig';
import { PlayerData } from '../../data/PlayerData';
import { getFragmentsNeeded, upgradePet } from '../../data/Pet';

// --- 3D Model Viewer Component ---
const PetModelViewer = ({ modelId, isActivated }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const mixerRef = useRef(null);
  const modelRef = useRef(null);
  const animFrameRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  useEffect(() => {
    if (!containerRef.current) return;

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 2.3, 5); // Moved camera further back and slightly higher
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 20;
    dirLight.shadow.camera.left = -5;
    dirLight.shadow.camera.right = 5;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -5;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);

    // ── Pet Base Effects (Arcane / Crystal style) ──────────────────

    const baseGroup = new THREE.Group();
    baseGroup.position.y = -0.5; // align with model feet (model is at y=-0.5)
    scene.add(baseGroup);

    // Shadow receiver plane
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.06;
    shadowPlane.receiveShadow = true;
    baseGroup.add(shadowPlane);

    // Hexagonal core disc (cyan/arcane)
    const coreMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.06, 6),
      new THREE.MeshBasicMaterial({
        color: 0x00ccff, transparent: true, opacity: 0.25,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    coreMesh.position.y = 0.03;
    baseGroup.add(coreMesh);

    // Hex edge ring
    const edgeMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 0.98, 6),
      new THREE.MeshBasicMaterial({
        color: 0x44eeff, transparent: true, opacity: 0.6,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    edgeMesh.rotation.x = -Math.PI / 2;
    edgeMesh.position.y = 0.062;
    baseGroup.add(edgeMesh);

    // Outer slow-rotating purple rune ring
    const outerRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.25, 6),
      new THREE.MeshBasicMaterial({
        color: 0xaa44ff, transparent: true, opacity: 0.45,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    outerRingMesh.rotation.x = -Math.PI / 2;
    outerRingMesh.position.y = 0.01;
    baseGroup.add(outerRingMesh);

    // Second counter-rotating ring (inner, thin)
    const innerRingMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.05, 12),
      new THREE.MeshBasicMaterial({
        color: 0x00ffdd, transparent: true, opacity: 0.35,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    innerRingMesh.rotation.x = -Math.PI / 2;
    innerRingMesh.position.y = 0.015;
    baseGroup.add(innerRingMesh);

    // Radial glow plane (cyan → purple gradient)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256; glowCanvas.height = 256;
    const glowCtx = glowCanvas.getContext('2d');
    const glowGrad = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    glowGrad.addColorStop(0,   'rgba(0, 200, 255, 0.32)');
    glowGrad.addColorStop(0.5, 'rgba(140, 0, 255, 0.12)');
    glowGrad.addColorStop(1,   'rgba(0, 0, 0, 0)');
    glowCtx.fillStyle = glowGrad;
    glowCtx.fillRect(0, 0, 256, 256);
    const glowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 4.5),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(glowCanvas), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.y = 0.005;
    baseGroup.add(glowMesh);

    // ── Floating Crystal Particles ──────────────────────────────────
    const petParticleCount = 80;
    const petPosArray = new Float32Array(petParticleCount * 3);
    const petVels = [];
    for (let i = 0; i < petParticleCount; i++) {
      const r = 0.8 + Math.random() * 2.0;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 3.0; // Relative to baseGroup
      petPosArray[i * 3]     = Math.cos(theta) * r;
      petPosArray[i * 3 + 1] = y;
      petPosArray[i * 3 + 2] = Math.sin(theta) * r;
      petVels.push({
        ySpeed: 0.05 + Math.random() * 0.15,
        wobbleSpeed: 1 + Math.random() * 3,
        wobbleAmt: 0.04 + Math.random() * 0.08,
        ix: petPosArray[i * 3], iz: petPosArray[i * 3 + 2],
        tOffset: Math.random() * Math.PI * 2
      });
    }
    const petParticleGeo = new THREE.BufferGeometry();
    petParticleGeo.setAttribute('position', new THREE.BufferAttribute(petPosArray, 3));

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32; pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    pGrad.addColorStop(0, 'rgba(200, 130, 255, 1)');
    pGrad.addColorStop(0.4, 'rgba(60, 210, 255, 0.6)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 32, 32);

    const petParticleSystem = new THREE.Points(
      petParticleGeo,
      new THREE.PointsMaterial({
        size: 0.18, map: new THREE.CanvasTexture(pCanvas),
        transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false, color: 0xcc99ff
      })
    );
    // Add particles to baseGroup so they also stay stationary when rotating
    baseGroup.add(petParticleSystem);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, 0); // Raised target slightly to match camera height
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false; // Disable zooming with mouse wheel
    
    // Restrict rotation to Y-axis only (horizontal rotation)
    // Adjusted polar angle slightly to look down a bit since camera is higher
    controls.minPolarAngle = Math.PI / 2.1; 
    controls.maxPolarAngle = Math.PI / 2.1; 
    
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.update();
    controlsRef.current = controls;

    // Animation Loop
    let elapsed = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const dt = clockRef.current.getDelta();
      elapsed += dt;
      if (mixerRef.current) mixerRef.current.update(dt);

      // Counter-rotate baseGroup so it stays stationary relative to the camera
      if (controlsRef.current) {
        baseGroup.rotation.y = controlsRef.current.getAzimuthalAngle();
      }

      // Rotate rings
      outerRingMesh.rotation.z += dt * 0.4;
      innerRingMesh.rotation.z -= dt * 0.7;

      // Animate particles
      const pos = petParticleGeo.attributes.position.array;
      for (let i = 0; i < petParticleCount; i++) {
        const v = petVels[i];
        pos[i * 3 + 1] += v.ySpeed * dt;
        pos[i * 3]     = v.ix + Math.sin(elapsed * v.wobbleSpeed + v.tOffset) * v.wobbleAmt;
        pos[i * 3 + 2] = v.iz + Math.cos(elapsed * v.wobbleSpeed + v.tOffset) * v.wobbleAmt;
        if (pos[i * 3 + 1] > 3.2) pos[i * 3 + 1] = 0; // Relative to baseGroup now
      }
      petParticleGeo.attributes.position.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
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
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // Load Model and Animation
  useEffect(() => {
    if (!modelId || !sceneRef.current) return;

    const scene = sceneRef.current;
    const loader = new GLTFLoader();

    // Clear previous model
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    const modelUrl = `/3d/Character/${modelId}/${modelId}.glb`;
    const animUrl = `/3d/Animation/${modelId}/${modelId}@daiji.glb`;

    loader.load(modelUrl, (gltf) => {
      const model = gltf.scene;
      
      // Scale down the model
      model.scale.set(0.06, 0.06, 0.06);
      // Adjust position slightly downwards to center it better
      model.position.set(0, -0.5, 0);

      modelRef.current = model;
      scene.add(model);

      // Apply MToon Shader and Shadows
      const meshes = [];
      model.traverse((child) => {
        if (child.isMesh) {
          meshes.push(child);
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      meshes.forEach((child) => {
        const origMat = child.material;
        
        // Main MToon Material
        const mtoon = new MToonMaterial();
        if (origMat.color) mtoon.color.copy(origMat.color);
        mtoon.shadeColorFactor.setHex(0x888888);
        mtoon.shadingToonyFactor = 0.9;
        if (origMat.map) {
          mtoon.map = origMat.map;
          mtoon.shadeMultiplyTexture = origMat.map;
        }
        
        // Grayscale if not activated
        if (!isActivated) {
           mtoon.color.setHex(0x555555);
           mtoon.shadeColorFactor.setHex(0x222222);
        }

        child.material = mtoon;

        // Outline
        if (child.isSkinnedMesh) {
          const outline = new MToonMaterial();
          if (origMat.color) outline.color.copy(origMat.color);
          outline.shadeColorFactor.setHex(0x888888);
          outline.shadingToonyFactor = 0.9;
          outline.outlineWidthMode = 'worldCoordinates';
          outline.outlineWidthFactor = 0.03;
          outline.outlineColorFactor.setHex(0x000000);
          outline.side = THREE.BackSide;
          outline.isOutline = true;
          if (origMat.map) {
            outline.map = origMat.map;
            outline.shadeMultiplyTexture = origMat.map;
          }
          
          if (!isActivated) {
             outline.color.setHex(0x555555);
             outline.shadeColorFactor.setHex(0x222222);
          }

          const outlineMesh = new THREE.SkinnedMesh(child.geometry, outline);
          if (child.skeleton) outlineMesh.bind(child.skeleton, child.bindMatrix);
          outlineMesh.userData.isOutline = true;
          child.add(outlineMesh);
        }
      });

      // Load Animation
      loader.load(animUrl, (animGltf) => {
        if (animGltf.animations && animGltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixerRef.current = mixer;
          const action = mixer.clipAction(animGltf.animations[0]);
          action.play();
        }
      });
    });
  }, [modelId, isActivated]);

  return <div ref={containerRef} className="w-full h-full" />;
};

// --- Detail Modal Component ---
const PetDetailModal = ({ petConfig, petData, onClose, onUpgrade }) => {
  if (!petConfig) return null;

  const isUnlocked = petData && petData.level > 0;
  const currentLevel = petData ? petData.level : 0;
  const currentFragments = petData ? petData.fragments : 0;
  const neededFragments = getFragmentsNeeded(petConfig.id, currentLevel);
  const canUpgrade = currentFragments >= neededFragments;

  // Mock upgrade effects based on level
  const upgradeEffects = [
    { level: 2, desc: '属性加成提升 5%' },
    { level: 3, desc: '解锁被动技能：元素共鸣' },
    { level: 4, desc: '技能冷却时间减少 10%' },
    { level: 5, desc: '基础攻击力提升 15%' },
    { level: 6, desc: '解锁进阶技能效果' },
    { level: 7, desc: '暴击率额外提升 3%' },
    { level: 8, desc: '解锁终极形态外观' },
    { level: 9, desc: '全队属性加成 2%' },
    { level: 10, desc: '解锁极寒大冰弹选项' },
  ];

  const qualityColor = {
    green: 'text-green-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
  }[petConfig.quality] || 'text-gray-500';

  const qualityBg = {
    green: 'bg-green-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100', 
  }[petConfig.quality] || 'bg-gray-100';

  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-[#eef2f3] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border-4 border-[#3b4c5a] flex flex-col h-[85vh] relative"
      >
        {/* Header Bar */}
        <div className="bg-[#1c4d7f] p-3 flex items-center justify-between shadow-md z-10">
          <button onClick={onClose} className="bg-red-500 rounded text-white p-1 hover:bg-red-600 transition shadow">
             <X size={20} />
          </button>
          <span className="text-white font-bold text-lg drop-shadow-md">{petConfig.name}</span>
          <div className="w-8"></div> {/* Spacer */}
        </div>
        
        {/* Main Content Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#ccd6dd]">
          
          {/* Top Card Area - Hero Style */}
          <div className="m-3 p-1 bg-[#1a4f8b] rounded-xl shadow-lg border-2 border-[#143d6b]">
             <div className="bg-gradient-to-br from-[#2a6db5] to-[#154176] rounded-lg p-4 flex gap-4 items-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                
                {/* Avatar */}
                <div className="w-20 h-20 bg-black/30 rounded-lg border-2 border-white/20 shadow-inner flex items-center justify-center shrink-0 relative z-10">
                    <Sparkles size={40} className={qualityColor} />
                </div>
                
                {/* Info */}
                <div className="flex-1 z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-black text-xl tracking-wide drop-shadow-md">{petConfig.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/30 text-white bg-black/20 uppercase`}>
                           {petConfig.quality}
                        </span>
                    </div>
                    <div className="text-blue-200 text-xs mb-2">战宠等级 {currentLevel}</div>
                    
                    {/* Level Progress Bar */}
                    <div className="w-full h-5 bg-black/40 rounded-full border border-black/50 relative overflow-hidden">
                        <div 
                           className="h-full bg-gradient-to-t from-green-600 to-green-400"
                           style={{ width: `${Math.min((currentFragments / neededFragments) * 100, 100)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                           {currentFragments} / {neededFragments}
                        </span>
                    </div>
                </div>
             </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 px-3 mb-4">
             {/* Stat Item: HP-like */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-600">
                    <Shield size={18} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">生命加成</span>
                    <span className="text-sm font-black text-gray-800">1221 <span className="text-green-500 text-[10px]">+22</span></span>
                </div>
             </div>
             
             {/* Stat Item: Damage-like */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                    <Swords size={18} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">攻击加成</span>
                    <span className="text-sm font-black text-gray-800">336 <span className="text-green-500 text-[10px]">+6</span></span>
                </div>
             </div>

             {/* Stat Item: Speed */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                    <Move size={18} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">移动速度</span>
                    <span className="text-sm font-black text-gray-800">中等</span>
                </div>
             </div>

             {/* Stat Item: Crit */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-600">
                    <Zap size={18} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">暴击幅度</span>
                    <span className="text-sm font-black text-gray-800">{petConfig.statsBonus ? Object.values(petConfig.statsBonus)[0] : 0}%</span>
                </div>
             </div>
          </div>

          {/* Upgrade Effects List Header */}
          <div className="px-4 py-2 flex items-center gap-2 opacity-60">
             <Settings size={14} className="text-gray-600" />
             <span className="text-xs font-black text-gray-600 uppercase tracking-widest">升级效果预览</span>
          </div>

          {/* Upgrade Effects List */}
          <div className="px-3 pb-20 space-y-2">
             {upgradeEffects.map((effect, idx) => (
                <div key={idx} className={`relative bg-[#dbe2e6] rounded-lg p-3 border-l-4 ${currentLevel >= effect.level ? 'border-green-500 bg-white' : 'border-gray-400 grayscale opacity-70'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center shrink-0 font-black text-sm italic 
                          ${currentLevel >= effect.level ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-400 text-gray-400'}`}>
                            {effect.level}级
                        </div>
                        <p className={`text-xs font-bold leading-tight ${currentLevel >= effect.level ? 'text-gray-800' : 'text-gray-500'}`}>
                           {effect.desc}
                        </p>
                    </div>
                </div>
             ))}
          </div>

        </div>

        {/* Footer Action Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-300 p-3 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] z-20">
            <div className="flex items-center justify-center gap-6 mb-2">
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    <div className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-500 shadow-sm"></div>
                    <span className={`text-xs font-bold font-mono ${true ? 'text-gray-800' : 'text-red-500'}`}>1000</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className={`text-xs font-bold font-mono ${canUpgrade ? 'text-gray-800' : 'text-red-500'}`}>
                        {currentFragments}/{neededFragments}
                    </span>
                 </div>
            </div>

            <button 
               onClick={onUpgrade}
               disabled={!canUpgrade}
               className={`w-full py-3 rounded-xl border-b-4 font-black text-xl tracking-wide shadow-lg active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2
                 ${canUpgrade 
                    ? 'bg-amber-400 border-amber-600 text-amber-900 hover:bg-amber-300' 
                    : 'bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed'}`}
            >
               {canUpgrade ? '升级' : '碎片不足'}
            </button>
            <div className="text-center mt-1">
               <span className="text-[10px] font-bold text-green-600">升级奖励：属性加成 +1.5%</span>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function PetUI({ onClose }) {
  const [activePlan, setActivePlan] = useState(1);
  const [petConfigs, setPetConfigs] = useState([]);
  const [playerPets, setPlayerPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [showSynthModal, setShowSynthModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // null | 'playing' | 'fade-out'
  const [synthPhase, setSynthPhase] = useState(null);

  useEffect(() => {
    // Load configs
    const configs = PetConfig.getAllConfigs();
    setPetConfigs(configs);
    if (configs.length > 0 && !selectedPetId) {
      setSelectedPetId(configs[0].id);
    }

    // Load player data
    const playerData = PlayerData.getInstance();
    setPlayerPets(playerData.getAllPets());
  }, []);

  // Close modals and launch the synthesis effect
  const triggerSynthEffect = () => {
    setShowSynthModal(false);
    setShowDetailModal(false);
    setSynthPhase('playing');
  };

  // Called by the effect when it reaches the final black frame
  const handleEffectComplete = () => {
    // Run actual synthesis logic while screen is still black
    handleSynthesize();
    // Tiny delay so state update propagates, then fade the overlay out
    setTimeout(() => {
      setSynthPhase('fade-out');
      setTimeout(() => setSynthPhase(null), 800);
    }, 80);
  };

  const handleSynthesize = () => {
    // This is now reused for upgrade too
    const playerData = PlayerData.getInstance();
    let pet = playerData.getPet(selectedPetId);
    
    if (!pet) {
      // Create new pet if it doesn't exist
      const config = petConfigs.find(c => c.id === selectedPetId);
      pet = {
        id: selectedPetId,
        name: config.name,
        level: 0,
        fragments: config.baseFragmentsNeeded, 
        skills: config.skills.map(s => ({ id: s.id, level: s.level })),
        activePlan: 1
      };
      playerData.addPet(pet);
    }

    if (upgradePet(pet)) {
      playerData.save();
      setPlayerPets([...playerData.getAllPets()]);
      setShowSynthModal(false);
      setShowDetailModal(false); // Close detail modal if upgrade success
    } else {
        // Handle failure if needed (though UI should prevent)
    }
  };

  const selectedConfig = petConfigs.find(c => c.id === selectedPetId);
  const selectedPlayerPet = playerPets.find(p => p.id === selectedPetId);
  
  const isActivated = selectedPlayerPet && selectedPlayerPet.level > 0;
  const currentFragments = selectedPlayerPet ? selectedPlayerPet.fragments : 0; // Mock: you can change this to test
  const neededFragments = selectedConfig ? getFragmentsNeeded(selectedConfig.id, 0) : 50;
  const canActivate = !isActivated && currentFragments >= neededFragments;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 bg-[#1a1510] flex flex-col font-sans text-white overflow-hidden"
    >
      {/* Header - overlaid on model, no layout space taken */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center pt-3 pb-2 z-30 pointer-events-none">
        <div className="text-lg font-bold tracking-widest text-amber-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">战宠</div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <PetDetailModal 
             petConfig={selectedConfig} 
             petData={selectedPlayerPet} 
             onClose={() => setShowDetailModal(false)}
             onUpgrade={triggerSynthEffect}
          />
        )}
      </AnimatePresence>
      
      {/* 3D Model Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-10">
        {/* Synthesis Effect Overlay — covers model area only */}
        {synthPhase !== null && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 50,
              opacity: synthPhase === 'fade-out' ? 0 : 1,
              transition: synthPhase === 'fade-out' ? 'opacity 0.75s ease-in' : 'none',
              pointerEvents: synthPhase === 'fade-out' ? 'none' : 'auto',
            }}
          >
            {synthPhase === 'playing' && (
              <PetSynthesisEffect onComplete={handleEffectComplete} />
            )}
            {synthPhase === 'fade-out' && (
              <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
            )}
          </div>
        )}
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-transparent to-transparent pointer-events-none"></div>
        
        {/* Pet Model Viewer */}
        <div className="relative z-10 w-full h-full flex items-center justify-center pb-13">
           {selectedConfig && (
              <PetModelViewer 
                 modelId={selectedConfig.model} 
                 isActivated={isActivated} 
              />
           )}
           
           {/* Overlay for unactivated state */}
           {!isActivated && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 {canActivate ? (
                    <div 
                      className="w-48 h-48 rounded-full bg-amber-500/20 border-4 border-amber-400/50 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-500/30 transition-colors shadow-[0_0_50px_rgba(251,191,36,0.6)] animate-pulse pointer-events-auto"
                      onClick={() => setShowSynthModal(true)}
                    >
                      <Sparkles size={48} className="text-amber-300 mb-2" />
                      <span className="text-amber-200 font-bold text-lg tracking-widest">点击合成</span>
                    </div>
                 ) : (
                    <div className="w-48 h-48 rounded-full bg-stone-900/50 border-4 border-stone-700/50 flex flex-col items-center justify-center opacity-80">
                      <Lock size={48} className="text-stone-500 mb-2" />
                      <span className="text-stone-400 font-bold text-sm">碎片不足</span>
                      <span className="text-stone-500 text-xs mt-1">{currentFragments} / {neededFragments}</span>
                    </div>
                 )}
              </div>
           )}
        </div>

        {/* Left side button */}
        <div className="absolute left-4 top-1/4 flex flex-col items-center gap-1 z-20">
          <div className="w-14 h-14 bg-black/60 border-2 border-amber-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.4)] cursor-pointer transition-all">
            <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center">
              <Sparkles size={20} className="text-amber-400" />
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 border border-amber-400 text-amber-400 mt-1">
            {selectedConfig?.name || '战宠'}
          </span>
        </div>

        {/* Plan Selector & Detail Button */}
        <div className="absolute bottom-1 w-full flex items-center justify-center gap-3 z-20 px-4">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm p-1 rounded-lg border border-white/10">
            {[1, 2, 3, 4, 5].map(plan => (
              <button 
                key={plan}
                onClick={() => setActivePlan(plan)}
                className={`h-8 rounded flex items-center justify-center text-sm font-bold transition-colors ${
                  activePlan === plan 
                    ? 'bg-amber-500 text-black px-3' 
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 w-8'
                }`}
              >
                {activePlan === plan ? `方案${plan}` : plan}
              </button>
            ))}
            <button className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-white">
              <Settings size={16} />
            </button>
          </div>

          {/* Detail Button */}
          <button 
             onClick={() => setShowDetailModal(true)}
             className="h-10 px-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border border-amber-300/40 shadow-[0_0_16px_rgba(251,191,36,0.4)] text-white text-sm font-bold tracking-wide transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(251,191,36,0.6)] active:scale-95"
          >
             <Info size={15} />
             <span>详情</span>
          </button>
        </div>
      </div>

      {/* Bottom Skills Area */}
      <div className="bg-[#2a241d] rounded-t-2xl p-4 border-t-2 border-amber-900/50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20 relative flex flex-col" style={{height: '44%'}}>
        <div className="flex justify-between items-center mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold text-sm">
              {selectedConfig ? Object.keys(selectedConfig.statsBonus)[0] : '属性增幅'}
            </span>
            <span className="text-2xl font-black text-amber-400">
              {selectedConfig ? Object.values(selectedConfig.statsBonus)[0] : 0}%
            </span>
          </div>
        </div>

        {/* Pet Grid */}
        <div className="grid grid-cols-3 gap-2 overflow-y-auto p-1 custom-scrollbar content-start flex-1 min-h-0 auto-rows-min">
          {petConfigs.map(config => {
            const pet = playerPets.find(p => p.id === config.id);
            const isUnlocked = pet && pet.level > 0;
            const isSelected = selectedPetId === config.id;
            const frags = pet ? pet.fragments : 0;
            const needed = getFragmentsNeeded(config.id, pet ? pet.level : 0);
            const fragPct = Math.min((frags / needed) * 100, 100);

            const qBorder = {
              green: 'border-green-500',
              blue: 'border-blue-500',
              purple: 'border-purple-500',
              orange: 'border-orange-500',
            }[config.quality] || 'border-blue-500';

            const qGradient = {
              green: 'from-green-950 via-green-900/70 to-stone-900',
              blue: 'from-blue-950 via-blue-900/70 to-stone-900',
              purple: 'from-purple-950 via-purple-900/70 to-stone-900',
              orange: 'from-orange-950 via-orange-900/70 to-stone-900',
            }[config.quality] || 'from-stone-900 to-stone-800';

            const qText = {
              green: 'text-green-300',
              blue: 'text-blue-300',
              purple: 'text-purple-300',
              orange: 'text-orange-300',
            }[config.quality] || 'text-white';

            const qBar = {
              green: 'bg-green-400',
              blue: 'bg-blue-400',
              purple: 'bg-purple-400',
              orange: 'bg-orange-400',
            }[config.quality] || 'bg-blue-400';

            const qGlow = {
              green: 'shadow-[0_0_14px_rgba(34,197,94,0.5)]',
              blue: 'shadow-[0_0_14px_rgba(59,130,246,0.5)]',
              purple: 'shadow-[0_0_14px_rgba(168,85,247,0.5)]',
              orange: 'shadow-[0_0_14px_rgba(249,115,22,0.5)]',
            }[config.quality] || '';

            const qStripe = {
              green: 'bg-green-400',
              blue: 'bg-blue-400',
              purple: 'bg-purple-400',
              orange: 'bg-orange-400',
            }[config.quality] || 'bg-blue-400';

            return (
              <div
                key={config.id}
                onClick={() => setSelectedPetId(config.id)}
                className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden cursor-pointer transition-all bg-gradient-to-b ${qGradient}
                  ${isSelected ? `border-amber-400 ${qGlow}` : qBorder}
                  ${!isUnlocked ? 'grayscale opacity-55' : 'hover:brightness-110'}`}
              >
                {/* Quality stripe top */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${qStripe} opacity-80`} />

                {/* Selected corner badge */}
                {isSelected && (
                  <div className="absolute top-0 right-0">
                    <div className="w-0 h-0 border-t-[18px] border-r-[18px] border-t-amber-400 border-r-transparent" />
                  </div>
                )}

                {/* Name */}
                <div className={`absolute top-2 left-0 right-0 text-center font-bold text-[10px] tracking-wide ${qText} drop-shadow px-0.5`}>
                  {config.name}
                </div>

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-11 h-11 rounded-full bg-black/40 border ${qBorder.replace('border-', 'border-').replace('-500', '-500/50')} flex items-center justify-center shadow-inner`}>
                    <Sparkles size={20} className={qText} />
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 pt-1 pb-1.5 px-1.5">
                  {isUnlocked ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/50 uppercase tracking-widest">Lv</span>
                      <span className={`text-[12px] font-black ${qText}`}>{pet.level}</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-0.5">
                        <div className={`h-full rounded-full ${qBar} transition-all`} style={{ width: `${fragPct}%` }} />
                      </div>
                      <div className={`text-center text-[9px] ${qText} opacity-70`}>{frags}/{needed}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthesis Modal */}
      <AnimatePresence>
        {showSynthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-stone-900 border-2 border-amber-500/50 rounded-xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(217,119,6,0.3)] flex flex-col items-center"
            >
              <Sparkles size={48} className="text-amber-400 mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-amber-500 mb-2">合成战宠</h2>
              <p className="text-stone-300 text-center mb-6">
                是否消耗 <span className="text-amber-400 font-bold">{neededFragments}</span> 个碎片合成 <span className="text-cyan-400 font-bold">{selectedConfig?.name}</span>？
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setShowSynthModal(false)}
                  className="flex-1 py-2 rounded-lg border border-stone-600 text-stone-400 font-bold hover:bg-stone-800 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={triggerSynthEffect}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-lg hover:brightness-110 transition-all"
                >
                  确认合成
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
