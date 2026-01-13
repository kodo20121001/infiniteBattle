import { Sprite2D } from './Sprite2D';
import { Texture } from './Texture';

/**
 * AnimatedSprite2D - 动画精灵
 * 继承自 Sprite2D，支持多帧纹理动画
 */
export class AnimatedSprite2D extends Sprite2D {
  private frames: Texture[];
  private currentFrameIndex = 0;
  private frameTime = 0;
  private frameDuration = 0.1; // 每帧时间（秒）
  private isPlaying = false;
  private isLooping = true;

  constructor(frames: Texture[]) {
    if (frames.length === 0) {
      throw new Error('AnimatedSprite2D requires at least one frame');
    }
    super(frames[0]);
    this.frames = frames;
  }

  /**
   * 播放动画
   */
  play(loop: boolean = true): void {
    this.isPlaying = true;
    this.isLooping = loop;
    this.frameTime = 0;
    this.currentFrameIndex = 0;
  }

  /**
   * 暂停动画
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * 停止动画并重置到第一帧
   */
  stop(): void {
    this.isPlaying = false;
    this.frameTime = 0;
    this.currentFrameIndex = 0;
    this.setTexture(this.frames[0]);
  }

  /**
   * 设置帧时长（秒）
   */
  setFrameDuration(duration: number): void {
    this.frameDuration = Math.max(0.01, duration);
  }

  /**
   * 获取当前帧索引
   */
  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /**
   * 获取总帧数
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * 跳转到指定帧
   */
  setFrame(frameIndex: number): void {
    const index = Math.max(0, Math.min(frameIndex, this.frames.length - 1));
    this.currentFrameIndex = index;
    this.frameTime = 0;
    this.setTexture(this.frames[index]);
  }

  /**
   * 更新动画状态
   */
  update(deltaTime: number): void {
    if (!this.isPlaying || this.frames.length <= 1) {
      return;
    }

    this.frameTime += deltaTime;

    if (this.frameTime >= this.frameDuration) {
      this.frameTime -= this.frameDuration;
      this.currentFrameIndex += 1;

      if (this.currentFrameIndex >= this.frames.length) {
        if (this.isLooping) {
          this.currentFrameIndex = 0;
        } else {
          this.currentFrameIndex = this.frames.length - 1;
          this.isPlaying = false;
        }
      }

      this.setTexture(this.frames[this.currentFrameIndex]);
    }
  }
}
