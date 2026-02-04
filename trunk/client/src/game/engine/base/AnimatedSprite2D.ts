import { Sprite2D } from './Sprite2D';
import { AnimationClip } from './AnimationClip';
import { Texture } from './Texture';
import { assets } from '../common/Assets';
import { Time } from '../common/Time';

/**
 * video_to_spritesheet 生成的 JSON 格式接口
 */
interface SpriteSheetFrame {
  image: string;
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  action: string;
  duration: number;
}

interface SpriteSheetMeta {
  app: string;
  version: string;
  sheets: number;
  format: string;
  size: { w: number; h: number };
  scale: string;
}

interface SpriteSheetData {
  meta: SpriteSheetMeta;
  frames: Record<string, SpriteSheetFrame>;
}

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
  private initialWidth: number = 0;  // 初始宽度（米），保持不变
  private initialHeight: number = 0; // 初始高度（米），保持不变

  private static getTextureSize(texture: Texture): { width: number; height: number } {
    return { width: texture.width, height: texture.height };
  }

  private applyFrameTexture(texture: Texture): void {
    // 只改变纹理，不改变几何体尺寸（保持初始尺寸）
    this.setTexture(texture);
  }

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
    const firstTexture = firstClip.frames[0];
    const { width, height } = AnimatedSprite2D.getTextureSize(firstTexture);
    // 基准高度，宽度根据纹理宽高比自动计算，乘以缩放因子调整
    const baseHeight = height / 10;
    const aspectRatio = width / height;
    const widthScaleFactor = 0.72;  // 宽度缩放因子，可根据需要调整
    const widthMeters = baseHeight * aspectRatio * widthScaleFactor;
    const heightMeters = baseHeight;
    super(firstTexture, widthMeters, heightMeters);
    
    // 调用 super 之后才能使用 this
    this.initialWidth = widthMeters;
    this.initialHeight = heightMeters;
    this.currentClip = firstClip;
    
    // 设置锚点为中心（确保图片居中）
    this.setAnchor(0.5, 0.5);
    
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
    this.applyFrameTexture(clip.frames[0]);
    this.isPlaying = true;
    this.isLooping = loop;
    return true;
  }

  /**
   * 从 video_to_spritesheet 生成的 JSON 创建动画精灵
   * @param jsonPath JSON 文件路径（如 '/unit/monkey.json'）
   * @returns Promise<AnimatedSprite2D>
   */
  static async create(jsonPath: string): Promise<AnimatedSprite2D> {
    // 1. 加载 JSON 数据
    const data = await assets.getJson<SpriteSheetData>(jsonPath);
    
    // 2. 提取基础路径（去除文件名）
    const lastSlashIndex = jsonPath.lastIndexOf('/');
    const basePath = jsonPath.substring(0, lastSlashIndex);
    
    // 3. 加载所有 spritesheet 图片
    const sheetImages = new Map<string, HTMLImageElement>();
    const sheetNames = new Set<string>();
    
    // 收集所有需要的 sheet 图片名
    for (const frameData of Object.values(data.frames)) {
      sheetNames.add(frameData.image);
    }
    
    // 加载所有 sheet 图片
    for (const sheetName of sheetNames) {
      const sheetPath = `${basePath}/${sheetName}`;
      const img = await assets.getImage(sheetPath);
      sheetImages.set(sheetName, img);
    }
    
    // 4. 按动作分组帧数据
    const actionFrames = new Map<string, Array<{
      key: string;
      data: SpriteSheetFrame;
    }>>();
    
    for (const [key, frameData] of Object.entries(data.frames)) {
      const action = frameData.action;
      if (!actionFrames.has(action)) {
        actionFrames.set(action, []);
      }
      actionFrames.get(action)!.push({ key, data: frameData });
    }
    
    // 5. 为每个动作创建 AnimationClip
    const clips: AnimationClip[] = [];
    
    for (const [actionName, frames] of actionFrames) {
      // 按文件名排序（确保帧顺序正确）
      frames.sort((a, b) => a.key.localeCompare(b.key));
      
      // 裁剪每一帧并创建纹理
      const textures: Texture[] = [];
      let totalDuration = 0;
      
      for (const { data: frameData } of frames) {
        const sheetImage = sheetImages.get(frameData.image);
        if (!sheetImage) {
          console.warn(`Sheet image not found: ${frameData.image}`);
          continue;
        }
        
        // 创建 canvas 来裁剪图片（裁剪后的纹理）
        const trimmedCanvas = document.createElement('canvas');
        trimmedCanvas.width = frameData.frame.w;
        trimmedCanvas.height = frameData.frame.h;
        const trimmedCtx = trimmedCanvas.getContext('2d');
        
        if (trimmedCtx) {
          trimmedCtx.drawImage(
            sheetImage,
            frameData.frame.x,
            frameData.frame.y,
            frameData.frame.w,
            frameData.frame.h,
            0,
            0,
            frameData.frame.w,
            frameData.frame.h
          );

          // 根据 TexturePacker 规则恢复到原始尺寸，保持锚点稳定
          const sourceW = frameData.sourceSize?.w ?? frameData.frame.w;
          const sourceH = frameData.sourceSize?.h ?? frameData.frame.h;
          const offsetX = frameData.spriteSourceSize?.x ?? 0;
          const offsetY = frameData.spriteSourceSize?.y ?? 0;

          let finalCanvas: HTMLCanvasElement = trimmedCanvas;
          if (sourceW !== trimmedCanvas.width || sourceH !== trimmedCanvas.height || offsetX !== 0 || offsetY !== 0) {
            const fullCanvas = document.createElement('canvas');
            fullCanvas.width = Math.max(1, sourceW);
            fullCanvas.height = Math.max(1, sourceH);
            const fullCtx = fullCanvas.getContext('2d');
            if (fullCtx) {
              fullCtx.drawImage(trimmedCanvas, offsetX, offsetY);
              finalCanvas = fullCanvas;
            }
          }
          
          textures.push(new Texture(finalCanvas));
        }
        
        totalDuration = Math.max(totalDuration, frameData.duration);
      }
      
      if (textures.length > 0) {
        // duration 是以毫秒为单位，转换为秒
        const durationInSeconds = (totalDuration + 1000 / 30) / 1000; // 加上最后一帧的时长（假设30fps）
        const clip = new AnimationClip(actionName, textures, true, durationInSeconds);
        clips.push(clip);
      }
    }
    
    if (clips.length === 0) {
      throw new Error(`No animation clips found in ${jsonPath}`);
    }
    
    // 6. 创建并返回 AnimatedSprite2D 实例
    return new AnimatedSprite2D(clips);
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
      this.applyFrameTexture(this.currentClip.frames[0]);
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
    this.applyFrameTexture(this.currentClip.frames[0]);
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
    this.applyFrameTexture(this.currentClip.frames[index]);
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

      this.applyFrameTexture(this.currentClip.frames[this.currentFrameIndex]);
    }
  }
}
