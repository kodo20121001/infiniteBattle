import * as THREE from 'three';
import { Vector3 } from './Vector3';

let _spriteIdCounter = 0;

/**
 * Sprite插件接口
 * 用于扩展Sprite的功能，如shader效果、粒子系统、自定义渲染等
 */
export interface SpritePlugin {
    /**
     * 插件初始化（当插件被加入Sprite时调用）
     * @param sprite - 精灵对象
     * @param dependencies - 额外的依赖对象（如 THREE.js）
     */
    onAttach(sprite: Sprite, ...dependencies: any[]): void | Promise<void>;

    /**
     * 每帧更新（可选）
     */
    onUpdate?(sprite: Sprite, deltaTime: number): void;

    /**
     * 插件卸载（当Sprite销毁或移除插件时调用）
     */
    onDetach?(sprite: Sprite): void | Promise<void>;
}

/**
 * Sprite - 精灵基类
 * 定义所有精灵的共通属性：位置、旋转、缩放、锚点、透明度、可见性等
 * 支持插件系统用于扩展功能，包含可选的model对象
 */
export class Sprite {
    protected _id: number;
    protected _position: Vector3 = new Vector3(0, 0, 0);
    protected _rotation: Vector3 = new Vector3(0, 0, 0);  // 旋转（弧度）
    protected _initialRotation: Vector3 = new Vector3(0, 0, 0);  // 初始旋转（弧度），来自模型配置
    protected _scale: Vector3 = new Vector3(1, 1, 1);
    protected _alpha = 1;
    protected _visible = true;
    protected _destroyed = false;
    protected _plugins: SpritePlugin[] = [];
    protected _threeObject: any = null;  // Three.js对象（Mesh、Group等）
    public blackboard: Record<string, any>;  // 黑板：用于存储任意数据

    constructor(blackboard: Record<string, any> = {}) {
        this._id = ++_spriteIdCounter;
        this.blackboard = blackboard;
        // 为 none 类型创建一个空的 Group 容器
        this._threeObject = new THREE.Group();
    }

    /**
     * 获取精灵 ID
     */
    get id(): number {
        return this._id;
    }

    /**
     * 位置（3D坐标）
     */
    get position(): Vector3 {
        return this._position;
    }

    set position(value: Vector3) {
        this._position = value.clone();
        this.onTransformChanged();
    }

    setPosition(x: number, y: number, z: number = 0): void {
        // 优化：只在位置真的改变时才触发更新
        if (this._position.x === x && this._position.y === y && this._position.z === z) {
            return;
        }
        this._position.x = x;
        this._position.y = y;
        this._position.z = z;
        this.onTransformChanged();
    }

    getPosition(): Vector3 {
        return this._position;
    }

    /**
     * 旋转 (弧度，绕 X/Y/Z 轴)
     */
    get rotation(): Vector3 {
        return this._rotation;
    }

    set rotation(value: Vector3) {
        this._rotation = value.clone();
        this.onTransformChanged();
    }

    setRotation(x: number, y: number, z: number = 0): void {
        // 优化：只在旋转改变时才触发更新
        if (this._rotation.x === x && this._rotation.y === y && this._rotation.z === z) {
            return;
        }
        this._rotation.x = x;
        this._rotation.y = y;
        this._rotation.z = z;
        this.onTransformChanged();
    }

    getRotation(): Vector3 {
        return this._rotation;
    }

    /**
     * 设置初始旋转（来自模型配置）
     */
    setInitialRotation(x: number, y: number, z: number = 0): void {
        this._initialRotation.x = x;
        this._initialRotation.y = y;
        this._initialRotation.z = z;
        // 初始旋转设置后，重新计算实际旋转
        this.onTransformChanged();
    }

    /**
     * 获取初始旋转
     */
    getInitialRotation(): Vector3 {
        return this._initialRotation;
    }

    /**
     * 仅获取/设置 x 坐标
     */
    get x(): number {
        return this._position.x;
    }

    set x(value: number) {
        if (this._position.x === value) {
            return;
        }
        this._position.x = value;
        this.onTransformChanged();
    }

    /**
     * 仅获取/设置 y 坐标
     */
    get y(): number {
        return this._position.y;
    }

    set y(value: number) {
        if (this._position.y === value) {
            return;
        }
        this._position.y = value;
        this.onTransformChanged();
    }

    /**
     * 仅获取/设置 z 坐标（深度）
     */
    get z(): number {
        return this._position.z;
    }

    set z(value: number) {
        if (this._position.z === value) {
            return;
        }
        this._position.z = value;
        this.onTransformChanged();
    }

    /**
     * 缩放 (3D)
     * 默认 z=1（俯视图精灵不需要深度缩放）
     */
    get scale(): Vector3 {
        return this._scale;
    }

    set scale(value: Vector3) {
        this._scale = value.clone();
        this.onTransformChanged();
    }

    setScale(x: number, y: number, z: number = 1): void {
        // 优化：只在缩放改变时才触发更新
        if (this._scale.x === x && this._scale.y === y && this._scale.z === z) {
            return;
        }
        this._scale.x = x;
        this._scale.y = y;
        this._scale.z = z;
        this.onTransformChanged();
    }

    getScale(): Vector3 {
        return this._scale;
    }

    /**
     * 透明度 (0-1)
     */
    get alpha(): number {
        return this._alpha;
    }

    set alpha(value: number) {
        const clamped = Math.max(0, Math.min(1, value));
        // 优化：只在透明度改变时才触发更新
        if (this._alpha === clamped) {
            return;
        }
        this._alpha = clamped;
        this.onTransformChanged();
    }

    /**
     * 可见性
     */
    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        // 优化：只在可见性改变时才触发更新
        if (this._visible === value) {
            return;
        }
        this._visible = value;
        this.onTransformChanged();
    }

    /**
     * 是否已销毁
     */
    get destroyed(): boolean {
        return this._destroyed;
    }

    /**
     * 获取Three.js对象
     */
    getThreeObject(): any {
        return this._threeObject;
    }

    /**
     * 设置Three.js对象
     */
    setThreeObject(obj: any): void {
        this._threeObject = obj;
        this.onTransformChanged();
    }

    /**
     * 当变换属性改变时调用（由子类覆盖以实现具体行为）
     */
    protected onTransformChanged(): void {
        // 基类默认实现：同步位置、旋转和缩放到 Three.js 对象
        if (this._threeObject) {
            this._threeObject.position.set(this._position.x, this._position.y, this._position.z);
            // 旋转 = 初始旋转 + 当前旋转
            this._threeObject.rotation.set(
                this._initialRotation.x + this._rotation.x,
                this._initialRotation.y + this._rotation.y,
                this._initialRotation.z + this._rotation.z
            );
            this._threeObject.scale.set(this._scale.x, this._scale.y, this._scale.z);
        }
    }

    /**
     * 添加插件到精灵
     * @param plugin - 插件对象
     * @param dependencies - 额外的依赖对象（如 THREE.js）
     */
    addPlugin(plugin: SpritePlugin, ...dependencies: any[]): void {
        if (this._plugins.includes(plugin)) return;
        this._plugins.push(plugin);
        const result = plugin.onAttach(this, ...dependencies);
        if (result instanceof Promise) {
            result.catch(err => console.error('Plugin attach error:', err));
        }
    }

    /**
     * 移除插件
     */
    removePlugin(plugin: SpritePlugin): void {
        const index = this._plugins.indexOf(plugin);
        if (index === -1) return;
        this._plugins.splice(index, 1);
        const result = plugin.onDetach?.(this);
        if (result instanceof Promise) {
            result.catch(err => console.error('Plugin detach error:', err));
        }
    }

    /**
     * 获取所有插件
     */
    getPlugins(): SpritePlugin[] {
        return [...this._plugins];
    }

    /**
     * 更新所有插件（由SpriteManager调用）
     * @internal
     */
    updatePlugins(deltaTime: number): void {
        // 优化：如果没有插件，直接返回
        if (this._plugins.length === 0) {
            return;
        }
        for (const plugin of this._plugins) {
            plugin.onUpdate?.(this, deltaTime);
        }
    }

    /**
     * 每帧更新（由外部调用，如 World.onRender）
     * 基类默认实现：调用所有插件的 onUpdate
     */
    update(deltaTime: number = 0): void {
        this.updatePlugins(deltaTime);
    }

    /**
     * 销毁精灵（由子类覆盖以实现具体清理逻辑）
     */
    destroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;

        // 卸载所有插件
        for (const plugin of [...this._plugins]) {
            const result = plugin.onDetach?.(this);
            if (result instanceof Promise) {
                result.catch(err => console.error('Plugin detach error:', err));
            }
        }
        this._plugins = [];

        // 从场景中移除 Three.js 对象
        if (this._threeObject) {
            if (this._threeObject.parent) {
                this._threeObject.parent.remove(this._threeObject);
            }
            // 清理 Three.js 对象
            this._threeObject = null;
        }
    }
}
