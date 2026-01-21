import { Sprite2D } from './Sprite2D';
import { AnimationClip } from './AnimationClip';
import { assets } from '../common/Assets';
import { Time } from '../common/Time';

/**
 * AnimatedSprite2D - 动画精灵
 * 继承自 Sprite2D，支持多个动画片段和快速切换
 */
export class AnimatedSprite2D extends Sprite2D {
  private clips: Map<string, AnimationClip> = new Map();
  private currentClip: AnimationClip;
  private currentFrameIndex = 0;
  private frameTime = 0;
  private isPlaying = false;
  private isLooping = true;

  constructor(clips: AnimationClip | AnimationClip[]) {
    let clipsArray: AnimationClip[];
    
    if (Array.isArray(clips)) {
      clipsArray = clips;
    } else {
      clipsArray = [clips];
    }
    
    if (clipsArray.length === 0 || !clipsArray[0]) {
      throw new Error('AnimatedSprite2D requires at least one AnimationClip');
    }
    
    // 设置第一个 clip 为当前 clip 并调用 super
    const firstClip = clipsArray[0];
    super(firstClip.frames[0]);
    
    // 调用 super 之后才能使用 this
    this.currentClip = firstClip;
    
    // 注册所有 clips
    clipsArray.forEach(clip => {
      if (!clip || clip.getFrameCount() === 0) {
        throw new Error('AnimatedSprite2D: each clip must be valid');
      }
      this.clips.set(clip.name, clip);
    });
  }

  /**
   * 添加动画片段
   */
  addClip(clip: AnimationClip): void {
    this.clips.set(clip.name, clip);
  }

  /**
   * 移除动画片段
   */
  removeClip(name: string): void {
    if (this.currentClip.name === name) {
      this.stop();
    }
    this.clips.delete(name);
  }

  /**
   * 获取动画片段
   */
  getClip(name: string): AnimationClip | undefined {
    return this.clips.get(name);
  }

  /**
   * 获取所有动画片段名称
   */
  getClipNames(): string[] {
    return Array.from(this.clips.keys());
  }

  /**
   * 切换到指定的动画片段并播放
   */
  switchClip(name: string, loop: boolean = true): boolean {
    const clip = this.clips.get(name);
    if (!clip) {
      console.warn(`Animation clip '${name}' not found`);
      return false;
    }

    this.currentClip = clip;
    this.currentFrameIndex = 0;
    this.frameTime = 0;
    this.setTexture(clip.frames[0]);
    this.isPlaying = true;
    this.isLooping = loop;
    return true;
  }

  /**
   * 从文件夹路径创建动画精灵（创建单个 clip）
   * @param name 动画片段名称
   * @param basePath 基础路径，如 '/idle' 会加载 /idle0, /idle1, /idle2...
   */
  static async fromSequence(name: string, basePath: string): Promise<AnimatedSprite2D> {
    const images = await assets.getImageSequence(basePath);
    const clip = AnimationClip.fromImages(name, images);
    return new AnimatedSprite2D(clip);
  }

  /**
   * 播放动画
   * @param clipName 动画片段名称，如果指定则先切换到该 clip 再播放
   * @param loop 是否循环播放
   */
  play(clipName?: string, loop: boolean = true): boolean {
    if (clipName) {
      // 如果指定了 clip 名称，先切换
      if (!this.switchClip(clipName, loop)) {
        return false;
      }
    } else {
      // 直接播放当前 clip
      this.isPlaying = true;
      this.isLooping = loop;
      this.frameTime = 0;
      this.currentFrameIndex = 0;
    }
    return true;
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
    this.setTexture(this.currentClip.frames[0]);
  }

  /**
   * 设置帧时长（秒）
   * 该方法已弃用，使用 AnimationClip 来管理帧时长
   * @deprecated 使用 AnimationClip 的构造参数
   */
  setFrameDuration(duration: number): void {
    // 空实现，仅用于兼容旧代码
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
    return this.currentClip.getFrameCount();
  }

  /**
   * 获取当前动画片段名称
   */
  getCurrentClipName(): string {
    return this.currentClip.name;
  }

  /**
   * 跳转到指定帧
   */
  setFrame(frameIndex: number): void {
    const index = Math.max(0, Math.min(frameIndex, this.currentClip.frames.length - 1));
    this.currentFrameIndex = index;
    this.frameTime = 0;
    this.setTexture(this.currentClip.frames[index]);
  }

  /**
   * 更新动画状态
   */
  update(): void {
    if (!this.isPlaying || this.currentClip.frames.length <= 1) {
      return;
    }

    const deltaTime = Time.deltaTime;
    const frameDuration = this.currentClip.getFrameDuration();
    this.frameTime += deltaTime;

    if (this.frameTime >= frameDuration) {
      this.frameTime -= frameDuration;
      this.currentFrameIndex += 1;

      if (this.currentFrameIndex >= this.currentClip.frames.length) {
        if (this.isLooping) {
          this.currentFrameIndex = 0;
        } else {
          this.currentFrameIndex = this.currentClip.frames.length - 1;
          this.isPlaying = false;
        }
      }

      this.setTexture(this.currentClip.frames[this.currentFrameIndex]);
    }
  }
}
