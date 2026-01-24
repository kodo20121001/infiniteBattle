/**
 * 游戏运行器（客户端版本）
 * 整合 Game、World 和场景管理，处理渲染和逻辑同步
 */

import { Game } from './GameSystem';
import { SceneManager } from './SceneManager';
import { LevelManager } from './LevelManager';
import { GameMap, type MapConfig } from './Map';
import type { World } from '../../engine/common/World';
import type { LevelConfig } from '../config/LevelConfig';
import { Sprite2D } from '../../engine/base/Sprite2D';
import { AnimatedSprite2D } from '../../engine/base/AnimatedSprite2D';
import { AnimationClip } from '../../engine/base/AnimationClip';
import { getModelConfig, getModelActions } from '../config/ModelConfig';
import { getUnitConfig } from '../config/UnitConfig';
import { Assets } from '../../engine/common/Assets';
import { worldToScreen } from '../base/WorldProjection';

/**
 * 客户端游戏运行器
 * 负责处理渲染和帧同步
 */
export class ClientGameRunner {
    private _game: Game;
    private _world: World;
    private _sceneManager: SceneManager;
    private _levelManager: LevelManager;
    private _map: GameMap | null = null;
    private _frameTime: number = 1000 / 30; // 30 FPS 帧同步
    private _isRunning: boolean = false;

    constructor(world: World) {
        this._world = world;
        this._game = new Game(false); // 客户端模式
        this._game.setWorld(world);
        this._sceneManager = new SceneManager(this._game);
        this._levelManager = new LevelManager(this._game, this._sceneManager);
        this._game.setLevelManager(this._levelManager);
    }

    /**
     * 初始化游戏运行器
     */
    init(): void {
        // 设置 World 的回调函数
        this._world.onFixedUpdate((fixedDeltaTime) => {
            this._onFixedUpdate(fixedDeltaTime);
        });

        this._world.onUpdate((deltaTime) => {
            this._onUpdate(deltaTime);
        });

        this._world.onRender((deltaTime) => {
            this._onRender(deltaTime);
        });

        // 设置固定时步为 30 FPS
        this._world.setFixedTimeStep(30);
    }

    /**
     * 加载和启动关卡
     */
    async loadLevel(levelConfig: LevelConfig, mapConfig: MapConfig): Promise<void> {
        // 使用 LevelManager 加载关卡
        this._levelManager.loadLevel(levelConfig, mapConfig);
        
        const spriteManager = this._world.getSpriteManager();
        const assets = new Assets();
        
        // 创建并加载地图
        this._map = new GameMap(mapConfig, spriteManager);
        await this._map.loadBackgrounds();
        
        // 为场景中的所有 actor 创建 sprite
        const actors = this._game.getActors();
        const spriteLoadPromises: Promise<void>[] = [];
        
        for (const actor of actors) {
            if (!actor.getSpriteId()) {
                const spriteId = `sprite_${actor.id}`;

                // 异步加载角色动画
                const loadPromise = (async () => {
                    try {
                        console.log(`[loadLevel] Loading sprite for actor ${actor.id}, unitType=${actor.unitType}`);
                        
                        // 1. 获取单位配置（根据 unitType）
                        const unitConfig = getUnitConfig(actor.unitType);
                        if (!unitConfig) {
                            throw new Error(`Unit config not found for unit type: ${actor.unitType}`);
                        }

                        // 2. 从单位配置中获取模型 ID
                        const modelId = unitConfig.modelId;

                        // 3. 获取模型配置
                        const modelConfig = getModelConfig(modelId);
                        if (!modelConfig) {
                            throw new Error(`Model config not found for model id: ${modelId}`);
                        }

                        // 4. 获取所有动作
                        const actions = getModelActions(modelId);
                        if (actions.length === 0) {
                            throw new Error(`No actions found for model id: ${modelId}`);
                        }

                        // 5. 创建所有动画 clips
                        const clips: AnimationClip[] = [];
                        // 使用 unitConfig.id 作为单位类型来查找动画资源
                        const baseFolder = `/unit/${unitConfig.id}`;

                        for (const action of actions) {
                            try {
                                console.log(`[loadLevel] Loading action ${action.name} from ${baseFolder}/${action.name}`);
                                const images = await assets.getImageSequence(`${baseFolder}/${action.name}`);
                                const clip = AnimationClip.fromImages(
                                    action.name,
                                    images,
                                    action.loop ?? true,
                                    action.duration ?? 1.0,
                                    action.frameCount
                                );
                                clips.push(clip);
                            } catch (err) {
                                console.warn(`Failed to load action '${action.name}' for unit type ${unitConfig.id}:`, err);
                            }
                        }

                        if (clips.length === 0) {
                            throw new Error('No animation clips loaded successfully');
                        }

                        // 6. 创建动画精灵
                        const sprite = new AnimatedSprite2D(clips);
                        sprite.setPosition(0, 0);
                        spriteManager.add(spriteId, sprite);
                        actor.setSpriteId(spriteId);
                        console.log(`[loadLevel] Successfully loaded sprite for actor ${actor.id}`);
                    } catch (err) {
                        console.warn(`Failed to load animated sprite for actor ${actor.id}:`, err);
                        // 降级使用占位符
                        const sprite = this._createPlaceholderSprite(actor.campId);
                        spriteManager.add(spriteId, sprite);
                        actor.setSpriteId(spriteId);
                        console.log(`[loadLevel] Using placeholder sprite for actor ${actor.id}`);
                    }
                })();
                
                spriteLoadPromises.push(loadPromise);
            }
        }
        
        console.log(`[loadLevel] Waiting for ${spriteLoadPromises.length} sprite loads...`);
        // 等待所有 sprite 加载完成
        await Promise.all(spriteLoadPromises);
        console.log(`[loadLevel] All sprites loaded, starting level`);
        
        this._start();
    }

    /**
     * 创建占位符 sprite（彩色方块）
     */
    private _createPlaceholderSprite(campId: number): Sprite2D {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = campId === 1 ? '#4169E1' : '#FF6347';
            ctx.fillRect(0, 0, 50, 50);
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 48, 48);
        }
        return new Sprite2D(canvas);
    }

    /**
     * 启动游戏
     */
    private _start(): void {
        if (this._isRunning) {
            console.warn('Game is already running');
            return;
        }
        this._isRunning = true;
        this._world.start();
    }

    /**
     * 暂停游戏
     */
    pause(): void {
        this._game.pause();
        this._world.pause();
    }

    /**
     * 恢复游戏
     */
    resume(): void {
        this._game.resume();
        this._world.resume();
    }

    /**
     * 停止游戏
     */
    stop(): void {
        this._isRunning = false;
        this._game.finish();
        this._world.stop();
    }

    /**
     * 固定帧更新（帧同步逻辑）
     */
    private _onFixedUpdate(fixedDeltaTime: number): void {
        this._game.fixedUpdate(fixedDeltaTime);
    }

    /**
     * 逻辑更新
     */
    private _onUpdate(deltaTime: number): void {
        this._game.update(deltaTime);
    }

    /**
     * 渲染更新
     * 将世界坐标投影到屏幕坐标
     */
    private _onRender(deltaTime: number): void {
        // 更新精灵位置
        const spriteManager = this._world.getSpriteManager();
        const actors = this._game.getActors();

        for (const actor of actors) {
            const spriteId = actor.getSpriteId();
            if (spriteId) {
                const pos = actor.getPosition();
                const height = actor.getHeight();
                const sprite = spriteManager.get(spriteId);
                if (sprite) {
                    // 世界坐标转屏幕坐标
                    const [screenX, screenY] = worldToScreen(pos.x, pos.y, height);
                    sprite.setPosition(screenX, screenY);
                    sprite.rotation = actor.getRotation();
                    const scale = actor.getScale();
                    sprite.setScale(scale, scale);
                    sprite.visible = actor.isVisible();
                    
                    // 使用 z 坐标（深度）控制渲染层级
                    sprite.position.z = pos.y;
                }
            }
        }
    }

    /**
     * 获取游戏实例
     */
    getGame(): Game {
        return this._game;
    }

    /**
     * 获取场景管理器
     */
    getSceneManager(): SceneManager {
        return this._sceneManager;
    }

    /**
     * 获取World
     */
    getWorld(): World {
        return this._world;
    }

    /**
     * 获取关卡管理器
     */
    getLevelManager(): LevelManager {
        return this._levelManager;
    }

    /**
     * 销毁游戏运行器
     */
    destroy(): void {
        this.stop();
        this._sceneManager.destroy();
        this._game.destroy();
        this._world.destroy();
    }
}

/**
 * 服务器游戏运行器
 * 仅处理逻辑，无渲染部分
 */
export class ServerGameRunner {
    private _game: Game;
    private _sceneManager: SceneManager;
    private _frameTime: number = 1000 / 30; // 30 FPS 帧同步
    private _isRunning: boolean = false;
    private _frameTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this._game = new Game(true); // 服务器模式
        this._sceneManager = new SceneManager(this._game);
    }

    /**
     * 初始化服务器游戏运行器
     */
    init(): void {
        // 初始化完成
    }

    /**
     * 加载和启动关卡
     */
    loadLevel(levelConfig: LevelConfig, mapConfig: MapConfig): void {
        this._sceneManager.loadScene(levelConfig, mapConfig);
        this._start();
    }

    /**
     * 启动游戏循环
     */
    private _start(): void {
        if (this._isRunning) {
            console.warn('Server game is already running');
            return;
        }
        this._isRunning = true;
        this._game.init();

        // 启动服务器侧的游戏循环
        this._frameTimer = setInterval(() => {
            this._onFrameUpdate();
        }, this._frameTime);
    }

    /**
     * 帧更新
     */
    private _onFrameUpdate(): void {
        this._game.fixedUpdate(this._frameTime);

        // 发送游戏状态快照给客户端
        const snapshot = this._game.getGameState().getSnapshot();
        this._onStateSnapshot(snapshot);
    }

    /**
     * 获取状态快照（用于发送给客户端）
     */
    private _onStateSnapshot(snapshot: any): void {
        // 这里可以序列化状态并通过网络发送给客户端
        // 例如通过 WebSocket 或其他网络协议
        console.log(`[Server] Frame ${snapshot.frameIndex}:`, snapshot);
    }

    /**
     * 暂停游戏
     */
    pause(): void {
        this._game.pause();
    }

    /**
     * 恢复游戏
     */
    resume(): void {
        this._game.resume();
    }

    /**
     * 停止游戏
     */
    stop(): void {
        this._isRunning = false;
        if (this._frameTimer) {
            clearInterval(this._frameTimer);
            this._frameTimer = null;
        }
        this._game.finish();
    }

    /**
     * 获取游戏实例
     */
    getGame(): Game {
        return this._game;
    }

    /**
     * 获取场景管理器
     */
    getSceneManager(): SceneManager {
        return this._sceneManager;
    }

    /**
     * 获取关卡管理器
     */
    getLevelManager(): LevelManager {
        return this._levelManager;
    }

    /**
     * 销毁服务器游戏运行器
     */
    destroy(): void {
        this.stop();
        this._sceneManager.destroy();
        this._game.destroy();
    }
}
