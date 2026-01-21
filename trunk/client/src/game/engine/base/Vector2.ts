/**
 * Vector2 - 2D 向量类
 */
export class Vector2 {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * 设置向量值
     */
    set(x: number, y: number): Vector2 {
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * 克隆向量
     */
    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    /**
     * 复制向量
     */
    copy(v: Vector2): Vector2 {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    /**
     * 向量相加
     */
    add(v: Vector2): Vector2 {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /**
     * 向量相减
     */
    sub(v: Vector2): Vector2 {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    /**
     * 向量数乘
     */
    multiply(scalar: number): Vector2 {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /**
     * 向量数除
     */
    divide(scalar: number): Vector2 {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
        }
        return this;
    }

    /**
     * 向量长度
     */
    get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * 向量长度的平方
     */
    get lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * 标准化向量
     */
    normalize(): Vector2 {
        const len = this.length;
        if (len > 0) {
            this.x /= len;
            this.y /= len;
        }
        return this;
    }

    /**
     * 点积
     */
    dot(v: Vector2): number {
        return this.x * v.x + this.y * v.y;
    }

    /**
     * 叉积（返回 z 分量）
     */
    cross(v: Vector2): number {
        return this.x * v.y - this.y * v.x;
    }

    /**
     * 距离
     */
    distance(v: Vector2): number {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 距离的平方
     */
    distanceSquared(v: Vector2): number {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return dx * dx + dy * dy;
    }

    /**
     * 角度（弧度）
     */
    get angle(): number {
        return Math.atan2(this.y, this.x);
    }

    /**
     * 根据角度和长度设置向量
     */
    setFromAngle(angle: number, length: number = 1): Vector2 {
        this.x = Math.cos(angle) * length;
        this.y = Math.sin(angle) * length;
        return this;
    }

    /**
     * 旋转向量
     */
    rotate(angle: number): Vector2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * 线性插值
     */
    lerp(v: Vector2, t: number): Vector2 {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        return this;
    }

    /**
     * 反向
     */
    negate(): Vector2 {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /**
     * 转换为数组
     */
    toArray(): [number, number] {
        return [this.x, this.y];
    }

    /**
     * 从数组创建向量
     */
    static fromArray(arr: [number, number]): Vector2 {
        return new Vector2(arr[0], arr[1]);
    }

    /**
     * 零向量
     */
    static get zero(): Vector2 {
        return new Vector2(0, 0);
    }

    /**
     * 单位向量 (1, 0)
     */
    static get right(): Vector2 {
        return new Vector2(1, 0);
    }

    /**
     * 单位向量 (0, 1)
     */
    static get up(): Vector2 {
        return new Vector2(0, 1);
    }

    /**
     * 单位向量 (-1, 0)
     */
    static get left(): Vector2 {
        return new Vector2(-1, 0);
    }

    /**
     * 单位向量 (0, -1)
     */
    static get down(): Vector2 {
        return new Vector2(0, -1);
    }

    /**
     * 单位向量 (1, 1)
     */
    static get one(): Vector2 {
        return new Vector2(1, 1);
    }

    /**
     * 将两个向量相加
     */
    static add(a: Vector2, b: Vector2): Vector2 {
        return new Vector2(a.x + b.x, a.y + b.y);
    }

    /**
     * 将两个向量相减
     */
    static sub(a: Vector2, b: Vector2): Vector2 {
        return new Vector2(a.x - b.x, a.y - b.y);
    }

    toString(): string {
        return `Vector2(${this.x}, ${this.y})`;
    }
}
