import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from '../test/loadMixamoAnimation.js';

export default function VrmCharacterViewer() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = 640;
    const height = 960;

    // 1. 初始化场景、相机、渲染器
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      100
    );
    // 将相机拉远一点(让角色变小)，上移相机，并稍微往前推一点以形成俯视角度
    camera.position.set(0, 1.4, 2.6); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // 设置背景透明
    renderer.shadowMap.enabled = true; // 开启阴影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影
    containerRef.current.appendChild(renderer.domElement);

    // 2. 添加灯光
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(2, 5, 3); // 调整光源位置以产生更好的阴影
    light.castShadow = true; // 允许光源产生阴影
    // 配置阴影属性
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 10;
    light.shadow.camera.left = -2;
    light.shadow.camera.right = 2;
    light.shadow.camera.top = 2;
    light.shadow.camera.bottom = -2;
    light.shadow.bias = -0.001; // 减少阴影伪影
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 2.5 添加 3D 底座特效
    const baseGroup = new THREE.Group();
    scene.add(baseGroup);

    // 接收阴影的透明地面
    const shadowPlaneGeometry = new THREE.PlaneGeometry(5, 5);
    const shadowPlaneMaterial = new THREE.ShadowMaterial({
      opacity: 0.5 // 阴影的浓度
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeometry, shadowPlaneMaterial);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.082; // 放在底座核心圆柱体的正上方一点点
    shadowPlane.receiveShadow = true; // 接收阴影
    baseGroup.add(shadowPlane);

    // 核心发光圆柱体 (增加体积感，减小半径，降低透明度)
    const coreGeometry = new THREE.CylinderGeometry(0.45, 0.5, 0.08, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.15, // 更透一点
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreMesh.position.y = 0.04; // 抬高一半高度使其位于地面上
    baseGroup.add(coreMesh);

    // 顶部边缘高光线 (增加立体感)
    const edgeGeometry = new THREE.RingGeometry(0.43, 0.45, 32);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edgeMesh.rotation.x = -Math.PI / 2;
    edgeMesh.position.y = 0.081; // 放在圆柱体顶部
    baseGroup.add(edgeMesh);

    // 外圈旋转光环 (缩小半径)
    const ringGeometry = new THREE.RingGeometry(0.55, 0.58, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3, // 更透一点
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.01;
    baseGroup.add(ringMesh);

    // 底部大范围柔和光晕 (缩小范围，降低透明度)
    const glowGeometry = new THREE.PlaneGeometry(1.8, 1.8);
    // 创建一个简单的径向渐变纹理
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 136, 0, 0.25)'); // 降低中心透明度
    gradient.addColorStop(0.5, 'rgba(255, 136, 0, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    const glowTexture = new THREE.CanvasTexture(canvas);

    const glowMaterial = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.y = 0.005;
    baseGroup.add(glowMesh);

    // 2.6 添加背景粒子特效 (上升的光点)
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];

    for (let i = 0; i < particleCount; i++) {
      // 在圆柱形范围内随机生成粒子
      const radius = 0.8 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 3; // 高度范围 0 到 3

      particlePositions[i * 3] = Math.cos(theta) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(theta) * radius;

      // 随机上升速度
      particleVelocities.push({
        y: 0.1 + Math.random() * 0.3,
        wobbleSpeed: 0.5 + Math.random() * 2,
        wobbleAmount: 0.05 + Math.random() * 0.1,
        initialX: particlePositions[i * 3],
        initialZ: particlePositions[i * 3 + 2],
        timeOffset: Math.random() * Math.PI * 2
      });
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // 创建圆形粒子纹理
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const pContext = particleCanvas.getContext('2d');
    const pGradient = pContext.createRadialGradient(16, 16, 0, 16, 16, 16);
    pGradient.addColorStop(0, 'rgba(255, 170, 0, 1)');
    pGradient.addColorStop(0.4, 'rgba(255, 136, 0, 0.5)');
    pGradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
    pContext.fillStyle = pGradient;
    pContext.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(particleCanvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      map: particleTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffaa00
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 3. 添加控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    // 将控制器的目标点设在角色胸部/腰部位置，配合较高的相机形成俯视
    controls.target.set(0, 0.9, 0);
    controls.update();
    controls.enableDamping = true;
    controls.enableZoom = false; // 在 UI 中禁用缩放
    controls.enablePan = false;  // 在 UI 中禁用平移

    // 4. 加载 VRM 模型
    let currentVrm = null;
    let currentMixer = null;
    const loader = new GLTFLoader();
    
    // 注册 VRM 插件
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });

    loader.load(
      '/unit/AvatarSample_D1.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (vrm) {
          VRMUtils.combineSkeletons(gltf.scene);
          
          // 遍历模型的所有网格，开启投射阴影
          vrm.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(vrm.scene);
          currentVrm = vrm;
          
          // 调整模型朝向 (面向相机)
          vrm.scene.rotation.y = 0; // 之前是 Math.PI (180度)，现在改为 0 (0度)

          // 加载动画
          loadMixamoAnimation('/unit/idle.fbx', vrm).then((clip) => {
            currentMixer = new THREE.AnimationMixer(vrm.scene);
            const action = currentMixer.clipAction(clip);
            action.play();
          }).catch((err) => {
            console.warn('Error loading animation (might not exist):', err);
          });
        }
      },
      undefined,
      (error) => {
        console.error('Error loading VRM:', error);
      }
    );

    // 5. 动画循环
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const deltaTime = clock.getDelta();
      if (currentMixer) {
        currentMixer.update(deltaTime);
      }
      if (currentVrm) {
        currentVrm.update(deltaTime);
      }

      // 旋转底座光环
      if (ringMesh) {
        ringMesh.rotation.z -= deltaTime * 0.5;
      }

      // 更新粒子系统 (上升和摇摆)
      if (particleSystem) {
        const positions = particleSystem.geometry.attributes.position.array;
        const time = clock.getElapsedTime();

        for (let i = 0; i < particleCount; i++) {
          const vel = particleVelocities[i];
          
          // Y轴上升
          positions[i * 3 + 1] += vel.y * deltaTime;
          
          // X/Z轴轻微摇摆
          positions[i * 3] = vel.initialX + Math.sin(time * vel.wobbleSpeed + vel.timeOffset) * vel.wobbleAmount;
          positions[i * 3 + 2] = vel.initialZ + Math.cos(time * vel.wobbleSpeed + vel.timeOffset) * vel.wobbleAmount;

          // 如果粒子飞得太高，重置到底部
          if (positions[i * 3 + 1] > 3.5) {
            positions[i * 3 + 1] = -0.2; // 从稍微低于地面的地方重新开始
          }
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;
        
        // 整体缓慢旋转粒子系统
        particleSystem.rotation.y += deltaTime * 0.1;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 清理函数
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '640px', height: '960px' }} />;
}
