import { Camera2D } from '../base/Camera2D';
import { SpriteManager } from './SpriteManager';

/**
 * Renderer - WebGL 渲染器
 * 统一管理渲染流程，使用 WebGL 和相机渲染精灵管理器中的元素
 */
export class Renderer {
    private canvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext;
    private camera: Camera2D;
    private spriteManager: SpriteManager;
    
    private _backgroundColor = { r: 0, g: 0, b: 0, a: 1 };
    private _clearBeforeRender = true;

    // WebGL 资源
    private spriteProgram: WebGLProgram;
    private spriteVAO: WebGLVertexArrayObject;
    private spriteVBO: WebGLBuffer;
    private spriteIndexBuffer: WebGLBuffer;

    constructor(
        canvas: HTMLCanvasElement,
        camera: Camera2D,
        spriteManager: SpriteManager
    ) {
        this.canvas = canvas;
        const context = canvas.getContext('webgl2', { antialias: true });
        if (!context) {
            throw new Error('Failed to get WebGL2 context from canvas');
        }
        this.gl = context;
        this.camera = camera;
        this.spriteManager = spriteManager;

        // 初始化 WebGL
        this.gl.viewport(0, 0, canvas.width, canvas.height);
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // 创建着色器程序
        this.spriteProgram = this.createSpriteProgram();

        // 创建顶点数组对象
        this.spriteVAO = this.gl.createVertexArray() as WebGLVertexArrayObject;
        this.gl.bindVertexArray(this.spriteVAO);

        // 创建顶点缓冲
        this.spriteVBO = this.gl.createBuffer() as WebGLBuffer;
        this.spriteIndexBuffer = this.gl.createBuffer() as WebGLBuffer;

        // 设置顶点数据（四边形，0-1范围）
        const vertices = new Float32Array([
            0, 0, 0, 0,    // 左下
            1, 0, 1, 0,    // 右下
            1, 1, 1, 1,    // 右上
            0, 1, 0, 1     // 左上
        ]);

        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.spriteVBO);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.spriteIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

        // 设置顶点属性
        const posLoc = this.gl.getAttribLocation(this.spriteProgram, 'position');
        const texCoordLoc = this.gl.getAttribLocation(this.spriteProgram, 'texCoord');

        this.gl.enableVertexAttribArray(posLoc);
        this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 16, 0);

        this.gl.enableVertexAttribArray(texCoordLoc);
        this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 16, 8);

        // 同步相机视口大小
        this.camera.setViewport(canvas.width, canvas.height);
    }

    /**
     * 创建精灵着色器程序
     */
    private createSpriteProgram(): WebGLProgram {
        const vertexShaderSource = `#version 300 es
        precision highp float;

        uniform mat4 projection;
        uniform mat4 view;
        uniform mat4 model;

        in vec2 position;
        in vec2 texCoord;

        out vec2 vTexCoord;

        void main() {
            gl_Position = projection * view * model * vec4(position, 0.0, 1.0);
            vTexCoord = texCoord;
        }`;

        const fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform sampler2D uTexture;
        uniform vec4 tint;

        in vec2 vTexCoord;
        out vec4 fragColor;

        void main() {
            fragColor = texture(uTexture, vTexCoord) * tint;
        }`;

        const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

        const program = this.gl.createProgram() as WebGLProgram;
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
            throw new Error('Failed to link shader program');
        }

        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        return program;
    }

    /**
     * 编译着色器
     */
    private compileShader(source: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type) as WebGLShader;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            throw new Error('Failed to compile shader');
        }

        return shader;
    }

    /**
     * 设置背景色 (格式: '#RRGGBB' 或 'rgb(r, g, b)')
     */
    setBackgroundColor(color: string): void {
        const rgb = this.parseColor(color);
        this._backgroundColor = { 
            r: rgb.r / 255, 
            g: rgb.g / 255, 
            b: rgb.b / 255, 
            a: 1 
        };
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
        // 默认黑色
        return { r: 0, g: 0, b: 0 };
    }

    /**
     * 设置是否在渲染前清屏
     */
    setClearBeforeRender(clear: boolean): void {
        this._clearBeforeRender = clear;
    }

    /**
     * 更新 Canvas 尺寸
     */
    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
        this.camera.setViewport(width, height);
    }

    /**
     * 渲染一帧
     */
    render(): void {
        // 清屏
        if (this._clearBeforeRender) {
            this.clear();
        }

        this.gl.useProgram(this.spriteProgram);
        this.gl.bindVertexArray(this.spriteVAO);

        // 投影矩阵：屏幕空间正交投影（固定）
        const projMatrix = this.orthoMatrix(
            0,
            this.canvas.width,
            this.canvas.height,
            0,
            -1,
            1
        );

        // 视图矩阵：处理相机变换
        // 将相机位置变换到屏幕中心，并应用缩放
        const cameraPos = this.camera.position;
        const cameraZoom = this.camera.zoom;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 视图矩阵 = translate(centerX, centerY) * scale(zoom) * translate(-cameraPos.x, -cameraPos.y)
        // 用列主序矩阵表示：
        const viewMatrix = new Float32Array(16);
        viewMatrix[0] = cameraZoom;                                    // scaleX
        viewMatrix[5] = cameraZoom;                                    // scaleY
        viewMatrix[10] = 1;                                            // scaleZ
        viewMatrix[12] = centerX - cameraPos.x * cameraZoom;           // translateX
        viewMatrix[13] = centerY - cameraPos.y * cameraZoom;           // translateY
        viewMatrix[15] = 1;

        const projLoc = this.gl.getUniformLocation(this.spriteProgram, 'projection');
        const viewLoc = this.gl.getUniformLocation(this.spriteProgram, 'view');

        this.gl.uniformMatrix4fv(projLoc, false, projMatrix);
        this.gl.uniformMatrix4fv(viewLoc, false, viewMatrix);

        // 按深度排序（z值小的先渲染，在下层）
        this.spriteManager.sortByZIndex((sprite) => sprite.position.z);

        // 渲染所有精灵（不修改精灵位置，让着色器处理坐标变换）
        this.spriteManager.render(this.gl);
    }

    /**
     * 清屏
     */
    clear(): void {
        this.gl.clearColor(
            this._backgroundColor.r,
            this._backgroundColor.g,
            this._backgroundColor.b,
            this._backgroundColor.a
        );
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    /**
     * 创建正交投影矩阵
     */
    private orthoMatrix(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array {
        const result = new Float32Array(16);
        
        const rl = right - left;
        const tb = top - bottom;
        const fn = far - near;

        result[0] = 2 / rl;
        result[5] = 2 / tb;
        result[10] = -2 / fn;
        result[12] = -(right + left) / rl;
        result[13] = -(top + bottom) / tb;
        result[14] = -(far + near) / fn;
        result[15] = 1;

        return result;
    }

    /**
     * 创建平移矩阵
     */
    private translationMatrix(x: number, y: number): Float32Array {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, 0, 1
        ]);
    }

    /**
     * 渲染 UI 层（不受相机影响）
     */
    renderUI(callback: (ctx: CanvasRenderingContext2D) => void): void {
        // WebGL 不支持直接绘制 2D 文本，需要切换到 2D context
        // 这个功能需要另外处理
        console.warn('renderUI with WebGL requires a separate 2D canvas overlay');
    }

    /**
     * 获取 Canvas
     */
    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * 获取 WebGL Context
     */
    getContext(): WebGL2RenderingContext {
        return this.gl;
    }

    /**
     * 获取相机
     */
    getCamera(): Camera2D {
        return this.camera;
    }

    /**
     * 获取精灵管理器
     */
    getSpriteManager(): SpriteManager {
        return this.spriteManager;
    }
}
