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
}

export const assets = new Assets();
