import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { perfMonitor } from './PerformanceMonitor';

type ResourceLoader<T> = (key: string) => Promise<T>;

type CacheEntry<T> = {
  promise: Promise<T>;
  refs: number;
};

type TextureCacheEntry = {
  texture: THREE.Texture | THREE.CanvasTexture;
  refs: number;
};

class Assets {
  private loaders = new Map<string, ResourceLoader<unknown>>();
  private cache = new Map<string, CacheEntry<unknown>>();
  private textureCache = new Map<string, TextureCacheEntry>();

  constructor() {
    this.register('image', Assets.loadImage);
    this.register('imageSequence', Assets.loadImageSequence);
    this.register('json', Assets.loadJson);
    this.register('fbx', Assets.loadFbx);
  }

  register<T>(type: string, loader: ResourceLoader<T>): void {
    this.loaders.set(type, loader as ResourceLoader<unknown>);
  }

  async get<T>(type: string, key: string): Promise<T> {
    const cacheKey = `${type}:${key}`;
    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached) {
      cached.refs += 1;
      return cached.promise;
    }

    const loader = this.loaders.get(type) as ResourceLoader<T> | undefined;
    if (!loader) {
      throw new Error(`No loader registered for type: ${type}`);
    }

    const promise = loader(key);
    this.cache.set(cacheKey, { promise, refs: 1 });
    return promise;
  }

  async getImage(url: string): Promise<HTMLImageElement> {
    perfMonitor.increment('Assets.imageLoad');
    return this.get<HTMLImageElement>('image', url);
  }

  async getJson<T = any>(url: string): Promise<T> {
    return this.get<T>('json', url);
  }

  /**
   * 获取FBX模型（带缓存）
   * 每次都会返回一个克隆，避免多个Sprite实例共享同一个模型对象
   */
  async getFbx(url: string): Promise<THREE.Group & { animations: THREE.AnimationClip[] }> {
    const cachedFbx = await this.get<THREE.Group & { animations: THREE.AnimationClip[] }>('fbx', url);
    
    perfMonitor.increment('Assets.fbxClone');
    
    // 使用 SkeletonUtils.clone 正确克隆带骨骼的 FBX 模型
    const clonedModel = SkeletonUtils.clone(cachedFbx) as THREE.Group;
    const clonedAnimations = cachedFbx.animations.map(clip => clip.clone());

    return Object.assign(clonedModel, { animations: clonedAnimations });
  }

  /**
   * 获取缓存的 THREE.Texture 对象
   * @param image 图像对象
   * @param imageId 图像唯一标识（通常是图像URL）
   * @returns 缓存的 THREE.Texture 对象
   */
  getThreeTexture(image: HTMLImageElement | HTMLCanvasElement, imageId: string): THREE.Texture | THREE.CanvasTexture {
    let entry = this.textureCache.get(imageId);

    if (!entry) {
      // 创建新的 Texture
      perfMonitor.increment('Assets.textureCreate');
      const texture = image instanceof HTMLCanvasElement
        ? new THREE.CanvasTexture(image)
        : new THREE.Texture(image);

      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;

      entry = {
        texture,
        refs: 0,
      };
      this.textureCache.set(imageId, entry);
    }

    entry.refs++;
    perfMonitor.increment('Assets.textureReuse');
    return entry.texture;
  }

  /**
   * 释放 THREE.Texture 引用，如果引用计数为 0 则销毁
   * @param imageId 图像唯一标识
   */
  releaseThreeTexture(imageId: string): void {
    const entry = this.textureCache.get(imageId);
    if (!entry) return;

    entry.refs--;
    if (entry.refs <= 0) {
      entry.texture.dispose();
      this.textureCache.delete(imageId);
    }
  }

  release(type: string, key: string): void {
    const cacheKey = `${type}:${key}`;
    const cached = this.cache.get(cacheKey);
    if (!cached) return;

    cached.refs -= 1;
    if (cached.refs <= 0) {
      this.cache.delete(cacheKey);
    }
  }

  clear(): void {
    this.cache.clear();
    // 销毁所有缓存的 Texture
    for (const entry of this.textureCache.values()) {
      entry.texture.dispose();
    }
    this.textureCache.clear();
  }

  /**
   * 获取缓存统计信息（用于调试性能）
   */
  getStats() {
    return {
      cachedTextures: this.textureCache.size,
      totalTextureRefCount: Array.from(this.textureCache.values()).reduce((sum, e) => sum + e.refs, 0),
      cachedResources: this.cache.size,
      totalResourceRefCount: Array.from(this.cache.values()).reduce((sum, e) => sum + e.refs, 0),
    };
  }

  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  }

  private static async loadImageSequence(basePath: string): Promise<HTMLImageElement[]> {
    const images: HTMLImageElement[] = [];
    let index = 0;

    // 提取路径和文件名前缀
    // 例如: /unit/101/idle -> path=/unit/101/idle, name=idle
    const lastSlashIndex = basePath.lastIndexOf('/');
    const folderPath = basePath.substring(0, lastSlashIndex);
    const namePrefix = basePath.substring(lastSlashIndex + 1);

    while (true) {
      try {
        const url = `${basePath}/${namePrefix}${index}.png`;
        const img = await Assets.loadImage(url);
        images.push(img);
        index++;
      } catch (err) {
        // 加载失败表示序列结束
        break;
      }
    }

    if (images.length === 0) {
      throw new Error(`No images found for sequence: ${basePath}`);
    }

    return images;
  }

  private static async loadJson<T = any>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${url}`);
    }
    return response.json();
  }

  private static loadFbx(url: string): Promise<THREE.Group & { animations: THREE.AnimationClip[] }> {
    return new Promise((resolve, reject) => {
      const loader = new FBXLoader();
      loader.load(
        url,
        (fbx) => {
          perfMonitor.increment('Assets.fbxParse');
          resolve(fbx as THREE.Group & { animations: THREE.AnimationClip[] });
        },
        undefined,
        (error) => reject(error)
      );
    });
  }
}

export { Assets };
export const assets = new Assets();
