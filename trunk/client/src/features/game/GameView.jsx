import React, { useEffect, useRef } from 'react';
import { Camera2D } from '../../game/base/Camera2D';
import { Sprite2D } from '../../game/base/Sprite2D';
import { AnimatedSprite2D } from '../../game/base/AnimatedSprite2D';
import { Texture } from '../../game/base/Texture';
import { GameLoop } from '../../game/common/GameLoop';
import { Renderer } from '../../game/common/Renderer';
import { SpriteManager } from '../../game/common/SpriteManager';
import { assets } from '../../game/common/Assets';

const GameView = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 初始化游戏系统
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // 创建游戏组件
    const camera = new Camera2D(width, height);
    const spriteManager = new SpriteManager();
    const renderer = new Renderer(canvas, camera, spriteManager);
    const gameLoop = new GameLoop(60);

    renderer.setBackgroundColor('#1a1a1a');

    // 初始化相机到屏幕中心
    camera.setPosition(width / 2, height / 2);

    let destroyed = false;

    const setupSprite = async () => {
      // 创建默认圆形纹理
      const playerCanvas = document.createElement('canvas');
      playerCanvas.width = 60;
      playerCanvas.height = 60;
      const playerCtx = playerCanvas.getContext('2d');
      if (playerCtx) {
        playerCtx.beginPath();
        playerCtx.arc(30, 30, 30, 0, Math.PI * 2);
        playerCtx.fillStyle = '#ff6b6b';
        playerCtx.fill();
        playerCtx.strokeStyle = '#fff';
        playerCtx.lineWidth = 3;
        playerCtx.stroke();
        playerCtx.closePath();
      }

      // 加载动画帧纹理
      const frameTextures = [new Texture(playerCanvas)];
      
      try {
        // 加载第一帧 (player.png)
        const img1 = await assets.get('image', '/player.png');
        frameTextures[0] = new Texture(img1);
      } catch (e) {
        console.warn('Failed to load player.png, using fallback', e);
      }

      try {
        // 加载第二帧 (player1.png)
        const img2 = await assets.get('image', '/player1.png');
        frameTextures.push(new Texture(img2));
      } catch (e) {
        console.warn('Failed to load player1.png, using fallback', e);
        // 如果只有一张图片，复制第一帧作为第二帧
        frameTextures.push(frameTextures[0]);
      }

      if (destroyed) return null;

      // 创建动画精灵
      const playerSprite = new AnimatedSprite2D(frameTextures);
      playerSprite.setPosition(width / 2, height / 2);
      playerSprite.setFrameDuration(0.5); // 500ms 每帧
      playerSprite.play(true); // 循环播放
      spriteManager.add('player', playerSprite);

      // 游戏状态
      let playerVelocity = { x: 2, y: 2 };
      const worldWidth = width * 2;
      const worldHeight = height * 2;
      const spriteRadius = Math.max(frameTextures[0].width, frameTextures[0].height) / 2;

      // 更新逻辑
      gameLoop.onUpdate((deltaTime) => {
        // 更新动画
        playerSprite.update(deltaTime);

        const playerPos = playerSprite.position;
        const newX = playerPos.x + playerVelocity.x;
        const newY = playerPos.y + playerVelocity.y;

        // 边界检测（世界坐标）
        if (newX <= spriteRadius || newX >= worldWidth - spriteRadius) {
          playerVelocity.x = -playerVelocity.x;
        }
        if (newY <= spriteRadius || newY >= worldHeight - spriteRadius) {
          playerVelocity.y = -playerVelocity.y;
        }

        // 设置位置（x, y, z）
        playerSprite.setPosition(newX, newY, 0);
        // 相机跟随精灵
        //camera.setTarget(newX, newY);
        //camera.update(deltaTime);
      });

      // 渲染逻辑
      gameLoop.onRender(() => {
        renderer.render();
      });

      // 启动游戏循环
      gameLoop.start();

      return playerSprite;
    };

    setupSprite();

    // 处理窗口大小改变
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      renderer.resize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      destroyed = true;
      window.removeEventListener('resize', handleResize);
      gameLoop.stop();
      spriteManager.clear();
      assets.release('image', '/player.png');
      assets.release('image', '/player1.png');
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
      <div className="absolute top-4 left-4 text-white font-mono">
        <h1 className="text-2xl font-bold mb-2">Game View</h1>
        <p className="text-sm opacity-70">Press ESC to return</p>
      </div>
    </div>
  );
};

export default GameView;
