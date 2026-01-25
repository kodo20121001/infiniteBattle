import { Texture } from './Texture';
import { Vector2 } from './Vector2';
import { Vector3 } from './Vector3';

/**
 * Sprite2D - 2D 精灵类
 * 位置使用3D坐标（x, y, z），但渲染方式是2D（投影到平面）
 * z坐标用于深度排序和视觉层次
 */
export class Sprite2D {
    protected _position: Vector3 = new Vector3(0, 0, 0);
    protected _scale: Vector2 = new Vector2(1, 1);
    protected _rotation = 0;
    protected _anchor: Vector2 = new Vector2(0.5, 0.5);
    protected _alpha = 1;
    protected _visible = true;
    protected _destroyed = false;
    protected _texture: Texture | null = null;
    protected _tint: string | null = null;

    constructor(imageOrTexture?: HTMLImageElement | HTMLCanvasElement | Texture) {
        if (imageOrTexture) {
            if (imageOrTexture instanceof Texture) {
                this._texture = imageOrTexture;
            } else {
                this._texture = new Texture(imageOrTexture);
            }
        }
    }

    /**
     * 设置图像或纹理
     */
    setImage(imageOrTexture: HTMLImageElement | HTMLCanvasElement | Texture): void {
        if (imageOrTexture instanceof Texture) {
            this._texture = imageOrTexture;
        } else {
            this._texture = new Texture(imageOrTexture);
        }
    }

    /**
     * 设置纹理
     */
    setTexture(texture: Texture): void {
        this._texture = texture;
    }

    /**
     * 获取纹理
     */
    getTexture(): Texture | null {
        return this._texture;
    }

    /**
     * 位置（3D坐标）
     */
    get position(): Vector3 {
        return this._position;
    }

    set position(value: Vector3) {
        this._position = value.clone();
    }

    setPosition(x: number, y: number, z: number = 0): void {
        this._position.x = x;
        this._position.y = y;
        this._position.z = z;
    }

    getPosition(): Vector3 {
        return this._position;
    }

    /**
     * 仅获取/设置 x 坐标
     */
    get x(): number {
        return this._position.x;
    }

    set x(value: number) {
        this._position.x = value;
    }

    /**
     * 仅获取/设置 y 坐标
     */
    get y(): number {
        return this._position.y;
    }

    set y(value: number) {
        this._position.y = value;
    }

    /**
     * 仅获取/设置 z 坐标（深度）
     */
    get z(): number {
        return this._position.z;
    }

    set z(value: number) {
        this._position.z = value;
    }

    /**
     * 缩放
     */
    get scale(): Vector2 {
        return this._scale;
    }

    set scale(value: Vector2) {
        this._scale = value.clone();
    }

    setScale(x: number, y: number): void {
        this._scale.x = x;
        this._scale.y = y;
    }

    getScale(): Vector2 {
        return this._scale;
    }

    /**
     * 旋转
     */
    get rotation(): number {
        return this._rotation;
    }

    set rotation(value: number) {
        this._rotation = value * (Math.PI / 180);
    }

    /**
     * 锚点 (0-1)
     */
    get anchor(): Vector2 {
        return this._anchor;
    }

    set anchor(value: Vector2) {
        this._anchor = value.clone();
    }

    setAnchor(x: number, y: number): void {
        this._anchor.x = x;
        this._anchor.y = y;
    }

    getAnchor(): Vector2 {
        return this._anchor;
    }

    /**
     * 透明度
     */
    get alpha(): number {
        return this._alpha;
    }

    set alpha(value: number) {
        this._alpha = Math.max(0, Math.min(1, value));
    }

    /**
     * 可见性
     */
    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
    }

    /**
     * 尺寸
     */
    get width(): number {
        if (!this._texture) return 0;
        return this._texture.width * this._scale.x;
    }

    get height(): number {
        if (!this._texture) return 0;
        return this._texture.height * this._scale.y;
    }

    /**
     * 设置色调（CSS 颜色字符串）
     */
    setTint(color: string): void {
        this._tint = color;
    }

    /**
     * 渲染到 WebGL
     */
    render(gl: WebGL2RenderingContext): void {
        if (!this._visible || !this._texture || this._alpha <= 0) {
            return;
        }

        this.renderWebGL(gl);
    }

    /**
     * WebGL 渲染
     */
    private renderWebGL(gl: WebGL2RenderingContext): void {
        if (!this._texture) return;

        // 获取纹理对象
        const glTexture = this._texture.getGLTexture(gl);
        gl.bindTexture(gl.TEXTURE_2D, glTexture);

        // 创建模型矩阵
        const modelMatrix = this.createModelMatrix();
        const modelLoc = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'model');
        const tintLoc = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'tint');
        const textureLoc = gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'uTexture');

        gl.uniformMatrix4fv(modelLoc, false, modelMatrix);

        // 设置色调
        if (this._tint) {
            const rgb = this.parseColor(this._tint);
            gl.uniform4f(tintLoc, rgb.r / 255, rgb.g / 255, rgb.b / 255, this._alpha);
        } else {
            gl.uniform4f(tintLoc, 1, 1, 1, this._alpha);
        }

        gl.uniform1i(textureLoc, 0);

        // 绘制
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /**
     * 创建模型矩阵
     */
    private createModelMatrix(): Float32Array {
        if (!this._texture) {
            const identity = new Float32Array(16);
            identity[0] = identity[5] = identity[10] = identity[15] = 1;
            return identity;
        }

        const matrix = new Float32Array(16);

        // 初始化为单位矩阵
        matrix[0] = 1;
        matrix[5] = 1;
        matrix[10] = 1;
        matrix[15] = 1;

        // 计算实际宽高和缩放
        const width = this._texture.width * this._scale.x;
        const height = this._texture.height * this._scale.y;

        // 计算锚点偏移
        const offsetX = width * this._anchor.x;
        const offsetY = height * this._anchor.y;

        // 旋转角度
        const cos = Math.cos(this._rotation);
        const sin = Math.sin(this._rotation);

        // 设置缩放和旋转（列主序）
        matrix[0] = cos * width;
        matrix[1] = sin * width;
        matrix[4] = -sin * height;
        matrix[5] = cos * height;

        // 设置平移
        matrix[12] = this._position.x - offsetX * cos - offsetY * (-sin);
        matrix[13] = this._position.y - offsetX * sin - offsetY * cos;

        return matrix;
    }

    /**
     * 解析颜色字符串
     */
    private parseColor(color: string): { r: number; g: number; b: number } {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            };
        }
        return { r: 255, g: 255, b: 255 };
    }

    /**
     * 销毁
     */
    destroy(): void {
        if (!this._destroyed) {
            this._texture = null;
            this._destroyed = true;
        }
    }

    get destroyed(): boolean {
        return this._destroyed;
    }
}
