import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';

const VrmTester = ({ onBack }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. 初始化场景、相机、渲染器
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // 2. 添加灯光
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 3. 添加控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

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
          
          scene.add(vrm.scene);
          currentVrm = vrm;
          
          // 调整模型朝向
          vrm.scene.rotation.y = Math.PI;

          // 加载动画
          loadMixamoAnimation('/unit/idle.fbx', vrm).then((clip) => {
            currentMixer = new THREE.AnimationMixer(vrm.scene);
            const action = currentMixer.clipAction(clip);
            action.play();
          }).catch((err) => {
            console.error('Error loading animation:', err);
          });
        }
      },
      (progress) => {
        console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%');
      },
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

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 6. 处理窗口大小变化
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={onBack}
        className="absolute top-4 left-4 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 z-10"
      >
        返回测试中心
      </button>
    </div>
  );
};

export default VrmTester;
