/**
 * Texture - WebGL 纹理封装
 * 管理纹理数据和 WebGL 相关逻辑
 */
export class Texture {
  private image: HTMLImageElement | HTMLCanvasElement;
  private glTexture: WebGLTexture | null = null;
  readonly width: number;
  readonly height: number;

  constructor(image: HTMLImageElement | HTMLCanvasElement) {
    this.image = image;
    this.width = image.width;
    this.height = image.height;
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
   * 销毁 WebGL 纹理
   */
  destroy(gl: WebGL2RenderingContext): void {
    if (this.glTexture) {
      gl.deleteTexture(this.glTexture);
      this.glTexture = null;
    }
  }
}
