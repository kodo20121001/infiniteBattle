import { Sprite2D } from './Sprite2D';
import { Texture } from './Texture';

/**
 * SpriteLabel - 文本精灵类
 * 继承自 Sprite2D，用于渲染文本内容
 * 支持动态生成文本纹理，支持样式自定义
 */
export class SpriteLabel extends Sprite2D {
    private _text: string = '';
    private _fontSize: number = 24;
    private _fontFamily: string = 'Arial';
    private _fontColor: string = '#ffffff';
    private _fontWeight: string = 'normal';
    private _maxWidth: number | undefined;
    private _lineHeight: number = 1.2;
    private _textAlign: CanvasTextAlign = 'center';
    private _textBaseline: CanvasTextBaseline = 'middle';
    private _backgroundColor: string | undefined;
    private _padding: number = 0;
    private _isDirty: boolean = true;
    private _canvasBuffer: HTMLCanvasElement | null = null;

    constructor(text: string = '') {
        super();
        this._text = text;
        this.updateTexture();
    }

    /**
     * 设置文本内容
     */
    setText(text: string): void {
        if (this._text !== text) {
            this._text = text;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取文本内容
     */
    getText(): string {
        return this._text;
    }

    /**
     * 设置字体大小
     */
    setFontSize(size: number): void {
        if (this._fontSize !== size) {
            this._fontSize = size;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取字体大小
     */
    getFontSize(): number {
        return this._fontSize;
    }

    /**
     * 设置字体族
     */
    setFontFamily(family: string): void {
        if (this._fontFamily !== family) {
            this._fontFamily = family;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取字体族
     */
    getFontFamily(): string {
        return this._fontFamily;
    }

    /**
     * 设置字体颜色
     */
    setFontColor(color: string): void {
        if (this._fontColor !== color) {
            this._fontColor = color;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取字体颜色
     */
    getFontColor(): string {
        return this._fontColor;
    }

    /**
     * 设置字体粗细
     */
    setFontWeight(weight: string): void {
        if (this._fontWeight !== weight) {
            this._fontWeight = weight;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取字体粗细
     */
    getFontWeight(): string {
        return this._fontWeight;
    }

    /**
     * 设置最大宽度（用于自动换行）
     */
    setMaxWidth(width: number | undefined): void {
        if (this._maxWidth !== width) {
            this._maxWidth = width;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取最大宽度
     */
    getMaxWidth(): number | undefined {
        return this._maxWidth;
    }

    /**
     * 设置行高
     */
    setLineHeight(height: number): void {
        if (this._lineHeight !== height) {
            this._lineHeight = height;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取行高
     */
    getLineHeight(): number {
        return this._lineHeight;
    }

    /**
     * 设置文本对齐方式
     */
    setTextAlign(align: CanvasTextAlign): void {
        if (this._textAlign !== align) {
            this._textAlign = align;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取文本对齐方式
     */
    getTextAlign(): CanvasTextAlign {
        return this._textAlign;
    }

    /**
     * 设置文本基线
     */
    setTextBaseline(baseline: CanvasTextBaseline): void {
        if (this._textBaseline !== baseline) {
            this._textBaseline = baseline;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取文本基线
     */
    getTextBaseline(): CanvasTextBaseline {
        return this._textBaseline;
    }

    /**
     * 设置背景颜色
     */
    setBackgroundColor(color: string | undefined): void {
        if (this._backgroundColor !== color) {
            this._backgroundColor = color;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取背景颜色
     */
    getBackgroundColor(): string | undefined {
        return this._backgroundColor;
    }

    /**
     * 设置内边距
     */
    setPadding(padding: number): void {
        if (this._padding !== padding) {
            this._padding = padding;
            this._isDirty = true;
            this.updateTexture();
        }
    }

    /**
     * 获取内边距
     */
    getPadding(): number {
        return this._padding;
    }

    /**
     * 更新纹理
     */
    private updateTexture(): void {
        if (!this._isDirty || this._text === '') {
            return;
        }

        // 创建画布
        const canvas = this.createTextCanvas();
        if (canvas) {
            // 创建纹理
            const texture = new Texture(canvas);
            this.setTexture(texture);
            this._canvasBuffer = canvas;
        }

        this._isDirty = false;
    }

    /**
     * 创建文本画布
     */
    private createTextCanvas(): HTMLCanvasElement | null {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }

        // 设置字体
        const fontStr = `${this._fontWeight} ${this._fontSize}px ${this._fontFamily}`;
        ctx.font = fontStr;

        // 计算文本尺寸
        const lines = this.wrapText(ctx, this._text, this._maxWidth || 9999);
        const lineHeightPx = this._fontSize * this._lineHeight;
        const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const textHeight = lines.length * lineHeightPx;

        // 加上内边距
        const width = textWidth + this._padding * 2;
        const height = textHeight + this._padding * 2;

        // 确保最小尺寸
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        // 重新设置字体（因为 canvas 尺寸改变后需要重新设置）
        ctx.font = fontStr;
        ctx.fillStyle = this._fontColor;
        ctx.textAlign = this._textAlign;
        ctx.textBaseline = this._textBaseline;

        // 绘制背景
        if (this._backgroundColor) {
            ctx.fillStyle = this._backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 绘制文本
        ctx.fillStyle = this._fontColor;
        let y = this._padding + this._fontSize / 2;
        const x = this._textAlign === 'center' 
            ? canvas.width / 2 
            : this._textAlign === 'right' 
            ? canvas.width - this._padding 
            : this._padding;

        for (const line of lines) {
            ctx.fillText(line, x, y);
            y += lineHeightPx;
        }

        return canvas;
    }

    /**
     * 自动换行处理
     */
    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
        const lines: string[] = [];
        const words = text.split('\n');

        for (const word of words) {
            if (!word) {
                lines.push('');
                continue;
            }

            let line = '';
            for (let i = 0; i < word.length; i++) {
                const testLine = line + word[i];
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth) {
                    if (line === '') {
                        lines.push(word[i]);
                    } else {
                        lines.push(line);
                        line = word[i];
                    }
                } else {
                    line = testLine;
                }
            }

            if (line !== '') {
                lines.push(line);
            }
        }

        return lines;
    }

    /**
     * 获取缓冲画布
     */
    getCanvasBuffer(): HTMLCanvasElement | null {
        return this._canvasBuffer;
    }

    /**
     * 销毁
     */
    destroy(): void {
        this._canvasBuffer = null;
        super.destroy();
    }
}
