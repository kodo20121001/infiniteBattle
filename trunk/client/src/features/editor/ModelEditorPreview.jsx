import React, { useEffect, useRef, useState } from 'react';
import { World } from '../../game/engine/common/World';
import { Sprite } from '../../game/engine/base/Sprite';
import { AnimatedSprite2D } from '../../game/engine/base/AnimatedSprite2D';
import { Sprite3D } from '../../game/engine/base/Sprite3D';
import { Sprite2D } from '../../game/engine/base/Sprite2D';
import { assets } from '../../game/engine/common/Assets';
import { createSpriteByModel } from '../../game/engine/base/model';
import { getModelConfig } from '../../game/core/config/ModelConfig';

const ModelEditorPreview = ({ modelData, cameraMode = 'game', selectedAction, onActionsLoaded }) => {
  const containerRef = useRef(null);
  const worldRef = useRef(null);
  const spriteRef = useRef(null);
  const mountRef = useRef(null);
  const loadIdRef = useRef(0);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !modelData) return;

    let disposed = false;
    const loadId = ++loadIdRef.current;

    const cleanup = () => {
      if (worldRef.current) {
        worldRef.current.destroy();
        worldRef.current = null;
      }
      spriteRef.current = null;
      if (mountRef.current) {
        while (mountRef.current.firstChild) {
          mountRef.current.removeChild(mountRef.current.firstChild);
        }
      }
    };

    const initPreview = async () => {
      setStatus('loading');
      setError('');
      cleanup();

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '0';

      if (mountRef.current) {
        mountRef.current.appendChild(canvas);
      }

      canvas.width = width;
      canvas.height = height;

      const world = new World(canvas, width, height, 60);
      worldRef.current = world;

      world.camera.setOrthoHeight(60);
      world.camera.setMode(cameraMode);

      const spriteManager = world.getSpriteManager();

      try {
        let sprite = null;
        
        // 优先使用工厂函数创建 sprite（支持插件系统）
        // 尝试从 model.json 加载配置（不依赖 Configs 系统）
        let modelConfig = null;
        try {
          const response = await fetch('/config/model.json');
          if (response.ok) {
            const allConfigs = await response.json();
            modelConfig = allConfigs.find(c => c.id === modelData.id);
          }
        } catch (err) {
          console.warn('[ModelEditorPreview] Failed to load model.json:', err);
        }
        
        // 如果配置中没有找到，使用 modelData 作为配置
        if (!modelConfig) {
          modelConfig = modelData;
        }
        
        // 创建黑板数据（用于特效插件）
        const blackboard = modelData.blackboard || {};
        
        // 使用配置创建（支持插件）
        sprite = await createSpriteByModel(modelData.id, modelConfig, blackboard);
        sprite.setPosition(0, 0, 0);
        if (typeof modelData.scale === 'number') {
          sprite.setScale(modelData.scale, modelData.scale, modelData.scale);
        }
        
        // 播放默认动作
        if (modelData.defaultAction) {
          if (sprite instanceof AnimatedSprite2D) {
            sprite.play(modelData.defaultAction);
          } else if (sprite instanceof Sprite3D) {
            sprite.playAnimation(modelData.defaultAction, true);
          }
        }

        if (disposed || loadId !== loadIdRef.current) return;

        spriteManager.add(`preview_${modelData.id}`, sprite);
        spriteRef.current = sprite;

        // 提取可用动作列表
        let actions = [];
        if (sprite instanceof AnimatedSprite2D) {
          actions = sprite.getClipNames();
        } else if (sprite instanceof Sprite3D) {
          actions = sprite.getAnimationNames();
        }
        if (onActionsLoaded) {
          onActionsLoaded(actions);
        }

        world.onRender((deltaTime) => {
          if (spriteRef.current && typeof spriteRef.current.update === 'function') {
            spriteRef.current.update(deltaTime);
          }
        });

        world.start();
        setStatus('ready');

        const resizeObserver = new ResizeObserver(() => {
          if (!worldRef.current || !containerRef.current) return;
          const w = containerRef.current.clientWidth || 800;
          const h = containerRef.current.clientHeight || 600;
          worldRef.current.resize(w, h);
        });
        resizeObserver.observe(container);

        return () => {
          resizeObserver.disconnect();
          if (worldRef.current) {
            worldRef.current.destroy();
            worldRef.current = null;
          }
        };
      } catch (err) {
        if (disposed) return;
        setStatus('error');
        setError(err?.message || '加载失败');
      }
    };

    let disposer = null;
    initPreview().then((disposeFn) => {
      disposer = disposeFn;
    });

    return () => {
      disposed = true;
      if (typeof disposer === 'function') {
        disposer();
      }
      cleanup();
    };
  }, [modelData, cameraMode]);

  useEffect(() => {
    if (!worldRef.current) return;
    worldRef.current.getCamera().setMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    if (!selectedAction || !spriteRef.current) return;

    const sprite = spriteRef.current;
    if (sprite instanceof AnimatedSprite2D) {
      sprite.play(selectedAction, true);
    } else if (sprite instanceof Sprite3D) {
      sprite.playAnimation(selectedAction, true);
    }
  }, [selectedAction]);

  useEffect(() => {
    if (cameraMode !== 'free' || !worldRef.current) {
      worldRef.current?.getCamera()?.setFreeKey('w', false);
      worldRef.current?.getCamera()?.setFreeKey('a', false);
      worldRef.current?.getCamera()?.setFreeKey('s', false);
      worldRef.current?.getCamera()?.setFreeKey('d', false);
      return;
    }

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        worldRef.current?.getCamera()?.setFreeKey(key, true);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        worldRef.current?.getCamera()?.setFreeKey(key, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      worldRef.current?.getCamera()?.setFreeKey('w', false);
      worldRef.current?.getCamera()?.setFreeKey('a', false);
      worldRef.current?.getCamera()?.setFreeKey('s', false);
      worldRef.current?.getCamera()?.setFreeKey('d', false);
    };
  }, [cameraMode]);

  useEffect(() => {
    if (cameraMode !== 'free' || !mountRef.current || !worldRef.current) return;

    const mount = mountRef.current;
    const camera = worldRef.current.getCamera();
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e) => {
      if (e.button === 2) { // Right click
        e.preventDefault();
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const pos = camera.position;
      const sensitivity = 0.05;
      camera.setPosition(
        pos.x - deltaX * sensitivity,
        pos.y,
        pos.z + deltaY * sensitivity
      );
    };

    const handleMouseUp = (e) => {
      if (e.button === 2) {
        isDragging = false;
      }
    };

    const handleWheel = (e) => {
      e.preventDefault();

      const currentZoom = camera.zoom;
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, currentZoom * zoomDelta));
      camera.setZoom(newZoom);
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    mount.addEventListener('mousedown', handleMouseDown);
    mount.addEventListener('mousemove', handleMouseMove);
    mount.addEventListener('mouseup', handleMouseUp);
    mount.addEventListener('wheel', handleWheel, { passive: false });
    mount.addEventListener('contextmenu', handleContextMenu);

    return () => {
      mount.removeEventListener('mousedown', handleMouseDown);
      mount.removeEventListener('mousemove', handleMouseMove);
      mount.removeEventListener('mouseup', handleMouseUp);
      mount.removeEventListener('wheel', handleWheel);
      mount.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [cameraMode]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <div ref={mountRef} className="absolute inset-0" />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300 bg-slate-950/70">
          {status === 'loading' ? '加载预览中...' : error || '暂无预览'}
        </div>
      )}
    </div>
  );
};

export default ModelEditorPreview;
