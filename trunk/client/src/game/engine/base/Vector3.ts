/**
 * Vector3 - 3D 向量类
 */
export class Vector3 {
    x: number;
    y: number;
    z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * 设置向量值
     */
    set(x: number, y: number, z: number): Vector3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * 克隆向量
     */
    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    /**
     * 复制向量
     */
    copy(v: Vector3): Vector3 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    /**
     * 向量相加
     */
    add(v: Vector3): Vector3 {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    /**
     * 向量相减
     */
    sub(v: Vector3): Vector3 {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    /**
     * 向量数乘
     */
    multiply(scalar: number): Vector3 {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    /**
     * 向量数除
     */
    divide(scalar: number): Vector3 {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
            this.z /= scalar;
        }
        return this;
    }

    /**
     * 向量长度
     */
    get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * 向量长度的平方
     */
    get lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    /**
     * 标准化向量
     */
    normalize(): Vector3 {
        const len = this.length;
        if (len > 0) {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }

    /**
     * 点积
     */
    dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /**
     * 叉积
     */
    cross(v: Vector3): Vector3 {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        return new Vector3(x, y, z);
    }

    /**
     * 距离
     */
    distance(v: Vector3): number {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        const dz = v.z - this.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 距离的平方
     */
    distanceSquared(v: Vector3): number {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        const dz = v.z - this.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * 线性插值
     */
    lerp(v: Vector3, t: number): Vector3 {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }

    /**
     * 反向
     */
    negate(): Vector3 {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /**
     * 转换为数组
     */
    toArray(): [number, number, number] {
        return [this.x, this.y, this.z];
    }

    /**
     * 从数组创建向量
     */
    static fromArray(arr: [number, number, number]): Vector3 {
        return new Vector3(arr[0], arr[1], arr[2]);
    }

    /**
     * 零向量
     */
    static get zero(): Vector3 {
        return new Vector3(0, 0, 0);
    }

    /**
     * 单位向量 (1, 0, 0)
     */
    static get right(): Vector3 {
        return new Vector3(1, 0, 0);
    }

    /**
     * 单位向量 (0, 1, 0)
     */
    static get up(): Vector3 {
        return new Vector3(0, 1, 0);
    }

    /**
     * 单位向量 (0, 0, 1)
     */
    static get forward(): Vector3 {
        return new Vector3(0, 0, 1);
    }

    /**
     * 单位向量 (-1, 0, 0)
     */
    static get left(): Vector3 {
        return new Vector3(-1, 0, 0);
    }

    /**
     * 单位向量 (0, -1, 0)
     */
    static get down(): Vector3 {
        return new Vector3(0, -1, 0);
    }

    /**
     * 单位向量 (0, 0, -1)
     */
    static get back(): Vector3 {
        return new Vector3(0, 0, -1);
    }

    /**
     * 单位向量 (1, 1, 1)
     */
    static get one(): Vector3 {
        return new Vector3(1, 1, 1);
    }

    /**
     * 将两个向量相加
     */
    static add(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    /**
     * 将两个向量相减
     */
    static sub(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    toString(): string {
        return `Vector3(${this.x}, ${this.y}, ${this.z})`;
    }
}
