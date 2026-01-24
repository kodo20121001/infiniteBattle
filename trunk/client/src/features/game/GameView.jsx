import React, { useEffect, useRef } from 'react';
import { Camera2D } from '../../game/engine/base/Camera2D';
import { Sprite2D } from '../../game/engine/base/Sprite2D';
import { AnimatedSprite2D } from '../../game/engine/base/AnimatedSprite2D';
import { Texture } from '../../game/engine/base/Texture';
import { World } from '../../game/engine/common/World';
import { assets } from '../../game/engine/common/Assets';

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

    // 创建 World 实例，集成渲染、精灵管理、主循环
    const world = new World({
      canvas,
      width,
      height,
      backgroundColor: '#1a1a1a',
    });

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
      const frameTextures = [Texture.fromImage(playerCanvas)];
      try {
        const img1 = await assets.getImage('/player.png');
        frameTextures[0] = Texture.fromImage(img1);
      } catch (e) {
        console.warn('Failed to load player.png, using fallback', e);
      }
      try {
        const img2 = await assets.getImage('/player1.png');
        frameTextures.push(Texture.fromImage(img2));
      } catch (e) {
        console.warn('Failed to load player1.png, using fallback', e);
        frameTextures.push(frameTextures[0]);
      }
      if (destroyed) return null;

      // 创建动画精灵
      const playerSprite = new AnimatedSprite2D(frameTextures);
      playerSprite.setPosition(width / 2, height / 2);
      playerSprite.setFrameDuration(0.5);
      playerSprite.play(true);
      world.spriteManager.add('player', playerSprite);

      // 游戏状态
      let playerVelocity = { x: 2, y: 2 };
      const worldWidth = width * 2;
      const worldHeight = height * 2;
      const spriteRadius = Math.max(frameTextures[0].width, frameTextures[0].height) / 2;

      // 更新逻辑
      world.gameLoop.onUpdate((deltaTime) => {
        playerSprite.update(deltaTime);
        const playerPos = playerSprite.position;
        const newX = playerPos.x + playerVelocity.x;
        const newY = playerPos.y + playerVelocity.y;
        if (newX <= spriteRadius || newX >= worldWidth - spriteRadius) {
          playerVelocity.x = -playerVelocity.x;
        }
        if (newY <= spriteRadius || newY >= worldHeight - spriteRadius) {
          playerVelocity.y = -playerVelocity.y;
        }
        playerSprite.setPosition(newX, newY, 0);
      });
      // 渲染逻辑
      world.gameLoop.onRender(() => {
        world.renderer.render();
      });
      world.gameLoop.start();
      return playerSprite;
    };

    setupSprite();

    // 处理窗口大小改变
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      world.renderer.resize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      destroyed = true;
      window.removeEventListener('resize', handleResize);
      world.gameLoop.stop();
      world.spriteManager.clear();
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
