type ResourceLoader<T> = (key: string) => Promise<T>;

type CacheEntry<T> = {
  promise: Promise<T>;
  refs: number;
};

class Assets {
  private loaders = new Map<string, ResourceLoader<unknown>>();
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor() {
    this.register('image', Assets.loadImage);
    this.register('imageSequence', Assets.loadImageSequence);
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
    return this.get<HTMLImageElement>('image', url);
  }

  async getImageSequence(basePath: string): Promise<HTMLImageElement[]> {
    return this.get<HTMLImageElement[]>('imageSequence', basePath);
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

    while (true) {
      try {
        const url = `${basePath}${index}`;
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
}

export const assets = new Assets();
