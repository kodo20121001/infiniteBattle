import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { assets } from '../common/Assets';
import { Sprite } from './Sprite';

interface Sprite3DFbxConfig {
    type: '3d_fbx';
    model: string;
    animations?: Record<string, string>;
    defaultAction?: string;
    scale?: number;
}

/**
 * Sprite3D - 3D精灵
 * 使用 Three.js 加载和管理 3D 模型（FBX）
 * 支持骨骼动画
 */
export class Sprite3D extends Sprite {
    private threeGroup: THREE.Group;  // 容纳模型的 Group
    private model: THREE.Object3D | null = null;
    private animationMixer: THREE.AnimationMixer | null = null;
    private animations: Map<string, THREE.AnimationAction> = new Map();
    private currentAnimationAction: THREE.AnimationAction | null = null;
    private modelUrl: string = '';

    constructor(blackboard: Record<string, any> = {}) {
        super(blackboard);
        // 创建 Group 来容纳 3D 模型
        this.threeGroup = new THREE.Group();
        this.threeGroup.position.set(0, 0, 0);
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.stopAnimation();
        if (this.animationMixer) {
            this.animationMixer.uncacheRoot(this.animationMixer.getRoot() as any);
            this.animationMixer = null;
        }
        if (this.model) {
            this.threeGroup.remove(this.model);
            this.model = null;
        }
        this._threeObject = null;
        this.animations.clear();
    }

    /**
     * 获取 Three.js Group（兼容旧接口）
     */
    getThreeGroup(): THREE.Group {
        return this.threeGroup;
    }

    /**
     * 从 JSON 配置创建 Sprite3D
     * @param jsonPath JSON 文件路径
     * @param blackboard 黑板对象
     */
    static async create(jsonPath: string, blackboard: Record<string, any> = {}): Promise<Sprite3D> {
        const data = await assets.getJson<Sprite3DFbxConfig>(jsonPath);
        const lastSlashIndex = jsonPath.lastIndexOf('/');
        const basePath = lastSlashIndex >= 0 ? jsonPath.substring(0, lastSlashIndex) : '';

        const sprite = new Sprite3D(blackboard);
        await sprite.loadFromFbxConfig(data, basePath);
        return sprite;
    }

    /**
     * 加载 3D 模型
     */
    async loadModel(url: string): Promise<void> {
        const fbx = await this.loadFbx(url);
        this.modelUrl = url;
        this.setModel(fbx);
        this.setupMixerAndClips(fbx.animations ?? []);
    }

    private async loadFromFbxConfig(config: Sprite3DFbxConfig, basePath: string): Promise<void> {
        if (config.type !== '3d_fbx') {
            throw new Error(`Sprite3D only supports 3d_fbx config, got: ${config.type}`);
        }

        const modelUrl = this.resolvePath(basePath, config.model);
        const baseModel = await this.loadFbx(modelUrl);
        this.modelUrl = modelUrl;
        this.setModel(baseModel);

        // 应用配置中的缩放到 Sprite 的 _scale（会影响整个 Group）
        if (typeof config.scale === 'number') {
            this.setScale(config.scale, config.scale, config.scale);
        }

        // 初始化动画混合器，并先注册 base 模型中的动画
        this.setupMixerAndClips(baseModel.animations ?? []);

        // 加载并注册额外动画
        if (config.animations) {
            const entries = Object.entries(config.animations);
            for (const [actionName, fileName] of entries) {
                const animUrl = this.resolvePath(basePath, fileName);
                const animFbx = await this.loadFbx(animUrl);
                const clips = animFbx.animations ?? [];
                if (clips.length > 0) {
                    const clip = clips[0].clone();
                    clip.name = actionName;
                    this.registerClip(clip);
                }
            }
        }

        if (config.defaultAction) {
            this.playAnimation(config.defaultAction, true);
        }
    }

    private resolvePath(basePath: string, fileName: string): string {
        if (fileName.startsWith('http://') || fileName.startsWith('https://') || fileName.startsWith('/')) {
            return fileName;
        }
        return basePath ? `${basePath}/${fileName}` : fileName;
    }

    private setModel(model: THREE.Object3D): void {
        this.model = model;
        // 赋值给 _threeObject
        this._threeObject = this.threeGroup;
        // 清除之前的模型
        this.threeGroup.children.forEach(child => {
            this.threeGroup.remove(child);
        });
        // 添加新模型到 Group
        this.threeGroup.add(this.model);
        // 转换材质为不受光照影响的基础材质
        this.convertToUnlitMaterials();
    }

    /**
     * 将模型材质转换为 MeshBasicMaterial（不受光照影响）
     */
    private convertToUnlitMaterials(): void {
        if (!this.model) return;
        this.model.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
                const oldMaterial = child.material;
                if (Array.isArray(oldMaterial)) {
                    child.material = oldMaterial.map((mat) => {
                        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
                            const basicMat = new THREE.MeshBasicMaterial();
                            if (mat.map) basicMat.map = mat.map;
                            basicMat.color.copy(mat.color);
                            basicMat.transparent = mat.transparent;
                            basicMat.opacity = mat.opacity;
                            basicMat.side = mat.side;
                            return basicMat;
                        }
                        return mat;
                    });
                } else if (oldMaterial instanceof THREE.MeshStandardMaterial || oldMaterial instanceof THREE.MeshPhongMaterial) {
                    const basicMat = new THREE.MeshBasicMaterial();
                    if (oldMaterial.map) basicMat.map = oldMaterial.map;
                    basicMat.color.copy(oldMaterial.color);
                    basicMat.transparent = oldMaterial.transparent;
                    basicMat.opacity = oldMaterial.opacity;
                    basicMat.side = oldMaterial.side;
                    child.material = basicMat;
                }
            }
        });
    }

    private setupMixerAndClips(clips: THREE.AnimationClip[]): void {
        if (!this.model) return;
        this.animationMixer = new THREE.AnimationMixer(this.model);
        this.animations.clear();
        clips.forEach(clip => this.registerClip(clip));
    }

    private registerClip(clip: THREE.AnimationClip): void {
        if (!this.animationMixer) return;
        const action = this.animationMixer.clipAction(clip);
        this.animations.set(clip.name, action);
    }

    private loadFbx(url: string): Promise<THREE.Group & { animations: THREE.AnimationClip[] } > {
        return new Promise((resolve, reject) => {
            const loader = new FBXLoader();
            loader.load(
                url,
                (fbx) => resolve(fbx as THREE.Group & { animations: THREE.AnimationClip[] }),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * 播放动画
     */
    playAnimation(animationName: string, loop: boolean = true): boolean {
        const action = this.animations.get(animationName);
        if (!action) {
            console.warn(`[Sprite3D] Animation not found: ${animationName}`);
            return false;
        }

        // 停止当前动画
        if (this.currentAnimationAction) {
            this.currentAnimationAction.stop();
        }

        // 播放新动画
        action.reset();
        action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
        action.clampWhenFinished = !loop;
        action.play();
        this.currentAnimationAction = action;

        return true;
    }

    /**
     * 获取当前播放的动画名称
     */
    getCurrentAnimationName(): string | null {
        if (!this.currentAnimationAction) return null;
        // 从 animations Map 中找到对应的动画名称
        for (const [name, action] of this.animations) {
            if (action === this.currentAnimationAction) {
                return name;
            }
        }
        return null;
    }

    /**
     * 停止当前动画
     */
    stopAnimation(): void {
        if (this.currentAnimationAction) {
            this.currentAnimationAction.stop();
            this.currentAnimationAction = null;
        }
    }

    /**
     * 获取所有动画名称
     */
    getAnimationNames(): string[] {
        return Array.from(this.animations.keys());
    }

    /**
     * 更新动画（每帧调用）
     */
    update(deltaTime: number = 0.016): void {
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
    }

    /**
     * 设置模型缩放
     */
    setModelScale(x: number, y: number, z: number): void {
        if (this.model) {
            this.model.scale.set(x, y, z);
        }
    }

    /**
     * 设置模型旋转（欧拉角，弧度）
     */
    setModelRotation(x: number, y: number, z: number): void {
        if (this.model) {
            this.model.rotation.set(x, y, z);
        }
    }

    /**
     * 设置模型位置（相对于 Group）
     */
    setModelPosition(x: number, y: number, z: number): void {
        if (this.model) {
            this.model.position.set(x, y, z);
        }
    }

    /**
     * 获取模型
     */
    getModel(): THREE.Object3D | null {
        return this.model;
    }

    /**
     * 当变换属性改变时更新 Group 的变换
     */
    protected onTransformChanged(): void {
        // 更新 Group 的位置
        this.threeGroup.position.set(this._position.x, this._position.y, this._position.z);
        
        // 更新 Group 的旋转（加上初始旋转）
        this.threeGroup.rotation.set(
            this._initialRotation.x + this._rotation.x,
            this._initialRotation.y + this._rotation.y,
            this._initialRotation.z + this._rotation.z
        );
        
        // 更新 Group 的缩放（3D缩放）
        this.threeGroup.scale.set(this._scale.x, this._scale.y, this._scale.z);
        
        // 更新透明度
        if (this.model) {
            this.model.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
                    if (material) {
                        material.transparent = true;
                        material.opacity = this._alpha;
                    }
                }
            });
        }
        
        // 更新可见性
        this.threeGroup.visible = this._visible;
    }

    /**
     * 销毁精灵
     */
    destroy(): void {
        if (this._destroyed) return;
        
        // 停止所有动画
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
        }
        
        // 清除模型
        if (this.model) {
            this.threeGroup.remove(this.model);
        }
        
        this._destroyed = true;
    }
}
