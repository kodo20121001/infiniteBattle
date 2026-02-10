/**
 * Texture - WebGL 纹理封装
 * 管理纹理数据和 WebGL 相关逻辑
 */
export class Texture {
  private image: HTMLImageElement | HTMLCanvasElement;
  private glTexture: WebGLTexture | null = null;
  private imageId: string;  // 图像唯一标识（用于缓存）
  readonly width: number;
  readonly height: number;

  constructor(image: HTMLImageElement | HTMLCanvasElement, imageId?: string) {
    this.image = image;
    this.width = image.width;
    this.height = image.height;
    // 如果没有指定 ID，尝试从 src 属性获取，否则使用时间戳+随机数
    this.imageId = imageId || (image instanceof HTMLImageElement ? image.src : `canvas_${Date.now()}_${Math.random()}`);
  }

  /**
   * 从单个图片创建纹理
   */
  static fromImage(image: HTMLImageElement | HTMLCanvasElement): Texture {
    return new Texture(image);
  }

  /**
   * 从图片数组创建纹理数组（用于序列帧动画）
   */
  static fromImages(images: (HTMLImageElement | HTMLCanvasElement)[]): Texture[] {
    return images.map(img => new Texture(img));
  }

  /**
   * 获取或创建 WebGL 纹理对象
   */
  getGLTexture(gl: WebGL2RenderingContext): WebGLTexture {
    if (this.glTexture) return this.glTexture;

    const texture = gl.createTexture();
    if (!texture) throw new Error('Failed to create WebGL texture');

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.image
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.glTexture = texture;
    return texture;
  }

  /**
   * 获取 HTML 图像元素
   */
  getImage(): HTMLImageElement | HTMLCanvasElement {
    return this.image;
  }

  /**
   * 获取图像 ID（用于缓存）
   */
  getImageId(): string {
    return this.imageId;
  }

  /**
   * 销毁 WebGL 纹理
   */
  destroy(gl: WebGL2RenderingContext): void {
    if (this.glTexture) {
      gl.deleteTexture(this.glTexture);
      this.glTexture = null;
    }
  }
}
