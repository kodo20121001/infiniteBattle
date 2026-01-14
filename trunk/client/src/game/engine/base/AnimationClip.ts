import { Texture } from './Texture';

/**
 * AnimationClip - 动画片段
 * 包含一个完整的动作动画（多个纹理帧）和相关配置
 */
export class AnimationClip {
  readonly name: string;
  readonly frames: Texture[];
  readonly duration?: number;        // 总时长（秒）
  readonly frameRate?: number;       // 帧率（FPS）
  readonly loop: boolean;            // 是否循环播放
  
  /**
   * 创建一个动画片段
   * @param name 动画名称，如 'idle', 'run', 'attack'
   * @param frames 帧纹理数组
   * @param loop 是否循环
   * @param duration 总时长（秒），可选
   * @param frameRate 帧率，可选
   */
  constructor(
    name: string,
    frames: Texture[],
    loop: boolean = true,
    duration?: number,
    frameRate?: number
  ) {
    if (frames.length === 0) {
      throw new Error('AnimationClip requires at least one frame');
    }
    
    this.name = name;
    this.frames = frames;
    this.loop = loop;
    this.duration = duration;
    this.frameRate = frameRate;
  }

  /**
   * 获取总帧数
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * 获取帧时长（秒）
   * 如果指定了 duration，返回 duration / frameCount
   * 否则返回 1/frameRate（如果指定了）
   * 都没指定时返回默认值 0.1 秒
   */
  getFrameDuration(): number {
    if (this.duration) {
      return this.duration / this.frames.length;
    }
    if (this.frameRate) {
      return 1 / this.frameRate;
    }
    return 0.1; // 默认每帧 100ms
  }

  /**
   * 从图片序列创建动画片段
   * @param name 动画名称
   * @param images 图片数组
   * @param loop 是否循环
   * @param duration 总时长
   * @param frameRate 帧率
   */
  static fromImages(
    name: string,
    images: (HTMLImageElement | HTMLCanvasElement)[],
    loop: boolean = true,
    duration?: number,
    frameRate?: number
  ): AnimationClip {
    const textures = Texture.fromImages(images);
    return new AnimationClip(name, textures, loop, duration, frameRate);
  }
}
