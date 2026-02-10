/**
 * 精灵模型工厂
 * 根据模型配置创建对应类型的精灵实例
 */

import type { ModelConfig, ModelType } from '../../core/config/ModelConfig';
import { ModelType as ModelTypeEnum } from '../../core/config/ModelConfig';
import { Sprite2D } from './Sprite2D';
import { AnimatedSprite2D } from './AnimatedSprite2D';
import { Sprite3D } from './Sprite3D';
import { Sprite, type SpritePlugin } from './Sprite';
import * as THREE from 'three';
import { assets } from '../common/Assets';

/**
 * 根据模型配置创建对应类型的精灵
 * 工厂函数：统一处理不同类型模型的加载，并支持插件扩展
 * @param modelId 模型ID
 * @param modelConfig 模型配置
 * @param blackboard 黑板对象，用于存储任意数据
 * @returns 创建的精灵实例
 */
export async function createSpriteByModel(
    modelId: string,
    modelConfig: ModelConfig,
    blackboard: Record<string, any> = {}
): Promise<Sprite> {
    const isImagePath = (path?: string): boolean => !!path && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(path);
    const isJsonPath = (path?: string): boolean => !!path && /\.json$/i.test(path);

    // 1. 根据type创建基础sprite
    let sprite: Sprite;

    // 使用配置中的完整路径，默认为 /unit/{modelId}.json
    const defaultPath = modelConfig.type === ModelTypeEnum.Image2D
        ? `/unit/${modelId}.png`
        : `/unit/${modelId}.json`;
    const resourcePath = modelConfig.path || defaultPath;

    switch (modelConfig.type) {
        case ModelTypeEnum.None:
            // 无实体模型，创建空的基础 Sprite（通常配合插件使用）
            sprite = new Sprite(blackboard);
            break;

        case ModelTypeEnum.Sequence2D:
            // 2D 序列帧动画
            sprite = await AnimatedSprite2D.create(resourcePath, blackboard);
            break;

        case ModelTypeEnum.Fbx3D:
            // 3D FBX 模型
            sprite = await Sprite3D.create(resourcePath, blackboard);
            break;

        case ModelTypeEnum.Image2D:
            // 2D 静态图片
            sprite = await Sprite2D.create(resourcePath, blackboard);
            break;

        case ModelTypeEnum.Spine2D:
            // 2D Spine 动画（暂未实现）
            throw new Error(`Spine2D is not implemented yet for model: ${modelId}`);

        default:
            throw new Error(`Unknown model type: ${modelConfig.type}`);
    }

    // 应用初始缩放
    if (modelConfig.scale) {
        sprite.setScale(modelConfig.scale, modelConfig.scale, modelConfig.scale);
    }

    // 应用初始旋转（配置为角度，内部使用弧度）
    if (modelConfig.rotation) {
        const toRadians = (degrees: number) => degrees * (Math.PI / 180);
        const rx = toRadians(modelConfig.rotation.x ?? 0);
        const ry = toRadians(modelConfig.rotation.y ?? 0);
        const rz = toRadians(modelConfig.rotation.z ?? 0);
        sprite.setInitialRotation(rx, ry, rz);
    }

    // 2. 尝试从资源配置文件中读取 scriptPath
    if (resourcePath && isJsonPath(resourcePath)) {
        try {
            const response = await fetch(resourcePath);
            if (response.ok) {
                const resourceConfig = await response.json();
                if (resourceConfig.scriptPath) {
                    
                    // 使用 fetch + Function 的方式加载插件，而不是 ES 模块 import
                    const scriptResponse = await fetch(resourceConfig.scriptPath);
                    if (!scriptResponse.ok) {
                        throw new Error(`Failed to load plugin script: ${resourceConfig.scriptPath}`);
                    }
                    const scriptCode = await scriptResponse.text();
                    
                    // 使用 Function 构造器执行脚本并获取返回值
                    // 脚本最后的表达式会自动作为返回值
                    const pluginFactory = new Function('THREE', scriptCode);
                    const plugin = pluginFactory(THREE) as SpritePlugin;

                    if (!plugin || typeof plugin.onAttach !== 'function') {
                        throw new Error(`Invalid plugin at ${resourceConfig.scriptPath}: must have onAttach() method`);
                    }

                    sprite.addPlugin(plugin, THREE, assets, blackboard);
                }
            } else {
                console.warn('[Model] Failed to fetch resource config:', response.status);
            }
        } catch (error) {
            console.error(`Failed to load plugin for model ${modelId}:`, error);
            // 不中断流程，允许sprite在没有插件的情况下工作
        }
    }

    return sprite;
}
