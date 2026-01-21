import { Unit } from "../logic/actor/Unit";
import { Runtime } from '../Runtime';
import { ActorType } from '../Def';
import { AnimatedSprite2D } from "../../engine/base/AnimatedSprite2D";
import { AnimationClip } from "../../engine/base/AnimationClip";
import { assets } from "../../engine/common/Assets";
import { getModelConfig, getModelActions } from "../config/ModelConfig";
import { getUnitConfig } from "../config/UnitConfig";
import { World } from "../../engine/common/World";
import { TransformSync } from './TransformSync';
import { SpriteManager } from "../../engine/common";

export class UnitView2D {
    actor: Unit | null = null;
    sprite: AnimatedSprite2D | null = null;
    tranSync: TransformSync | null = null;

    Start() {
        if (!this.actor) {
            console.error('UnitView2D: actor is not set');
            return;
        }

        // 异步加载动作，不阻塞 Start
        this.loadAndInitialize(this.actor.createContext.unitType).catch(err => {
            console.error('Failed to load unit animations:', err);
        });

        
    }

    private async loadAndInitialize(unitType: number) {
        try {
            // 1. 通过 unitType 获取 Unit 配置
            const unitConfig = getUnitConfig(unitType);
            if (!unitConfig) {
                console.error(`Unit config not found for unit type: ${unitType}`);
                return;
            }

            // 2. 从 Unit 配置中获取模型 ID
            const modelId = unitConfig.modelId;

            // 3. 通过模型 ID 获取模型配置
            const modelConfig = getModelConfig(modelId);
            if (!modelConfig) {
                console.error(`Model config not found for model id: ${modelId}`);
                return;
            }

            // 获取所有动作
            const actions = getModelActions(modelId);
            if (actions.length === 0) {
                console.warn(`No actions found for model id: ${modelId}`);
                return;
            }

            // 创建所有 clips
            const clips: AnimationClip[] = [];
            const baseFolder = `/unit/${unitType}`;

            for (const action of actions) {
                try {
                    const images = await assets.getImageSequence(`${baseFolder}/${action.name}`);
                    const clip = AnimationClip.fromImages(
                        action.name,
                        images,
                        action.loop ?? true,
                        action.duration,
                        action.frameCount ? action.frameCount : undefined
                    );
                    clips.push(clip);
                } catch (err) {
                    console.warn(`Failed to load action '${action.name}' for unit ${unitType}:`, err);
                }
            }

            if (clips.length === 0) {
                console.error('No animation clips loaded successfully');
                return;
            }

            // 创建精灵
            this.sprite = new AnimatedSprite2D(clips);
            this.sprite.setPosition(0, 0);

            // 添加精灵到 World
            try {
                const world = World.getInstance();
                world.getSpriteManager().add(`unit_${this.actor?.actorId}`, this.sprite);
            } catch (err) {
                console.warn('Failed to add sprite to World:', err);
            }

            // 获取默认动作并播放
            const defaultAction = modelConfig.defaultAction || clips[0].name;
            this.sprite.play(defaultAction, true);

            // 初始化同步
            if (this.actor) {
                this.tranSync = new TransformSync(this.sprite, this.actor);

                // 设置动画回调
                this.actor.animationHandler = (actionName: string) => {
                    if (this.sprite) {
                        this.sprite.play(actionName);
                    }
                };
            }
        } catch (error) {
            console.error('UnitView2D initialization failed:', error);
        }
    }

    Update() {
        if (this.sprite) {
            this.sprite.update();
        }
        if (this.tranSync) {
            this.tranSync.update();
        }
    }
}