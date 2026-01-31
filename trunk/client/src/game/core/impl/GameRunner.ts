/**
 * 游戏运行器（客户端版本）
 * 整合 Game、World 和场景管理，处理渲染和逻辑同步
 */

import { Game } from './GameSystem';
import { SceneManager } from './SceneManager';
import { LevelManager } from './LevelManager';
import { GameMap, type MapConfig } from './Map';
import { MovementSystem } from './MovementSystem';
import type { World } from '../../engine/common/World';
import type { LevelConfig } from '../config/LevelConfig';
import { Sprite2D } from '../../engine/base/Sprite2D';
import { AnimatedSprite2D } from '../../engine/base/AnimatedSprite2D';
import { getModelConfig } from '../config/ModelConfig';
import { getUnitConfig } from '../config/UnitConfig';
import { worldToMapPixel } from '../base/WorldProjection';
import type { Actor } from './Actor';
import { Unit } from './Unit';
import type { AnimationSystem } from './AnimationSystem';

/**
 * 客户端游戏运行器
 * 负责处理渲染和帧同步
 */
export class ClientGameRunner {
    private _animDebugMissingStatus: Set<string> = new Set();
        // 正在加载 sprite 的 actor id 集合，防止重复加载
        private _pendingSpriteLoads: Set<string> = new Set();

        /**
         * 异步为 actor 加载 sprite（懒加载，非阻塞逻辑帧）
         */
        private _loadActorSprite(actor: Actor) {
            if (!actor || actor.getSpriteId() || this._pendingSpriteLoads.has(actor.actorNo)) return;
            if (!(actor instanceof Unit)) return;
            this._pendingSpriteLoads.add(actor.actorNo);
            const spriteManager = this._world.getSpriteManager();
            const spriteId = `sprite_${actor.actorNo}`;
            (async () => {
                try {
                    const unitConfig = getUnitConfig(actor.unitId);
                    if (!unitConfig) throw new Error(`Unit config not found for unit id: ${actor.unitId}`);
                    const modelId = unitConfig.modelId;
                    const modelConfig = getModelConfig(modelId);
                    if (!modelConfig) throw new Error(`Model config not found for model id: ${modelId}`);
                    // actor 可能已被移除
                    if (!this._game.getActor(actor.actorNo)) return;
                    const sprite = await AnimatedSprite2D.create(`/unit/${modelId}.json`);
                    sprite.setPosition(0, 0);
                    this._applyUnitAnimation(actor, sprite, true);
                    spriteManager.add(spriteId, sprite);
                    actor.setSpriteId(spriteId);
                } catch (err) {
                    // actor 可能已被移除
                    if (!this._game.getActor(actor.actorNo)) return;
                    console.warn(`Failed to load animated sprite for actor ${actor.actorNo}:`, err);
                    const sprite = this._createPlaceholderSprite(actor.campId);
                    spriteManager.add(spriteId, sprite);
                    actor.setSpriteId(spriteId);
                } finally {
                    this._pendingSpriteLoads.delete(actor.actorNo);
                }
            })();
        }
    private _game: Game;
    private _world: World;
    private _sceneManager: SceneManager;
    private _levelManager: LevelManager;
    private _map: GameMap | null = null;
    private _frameTime: number = 1000 / 30; // 30 FPS 帧同步
    private _isRunning: boolean = false;
    private _debugShowBlockedCells: boolean = false; // 调试：显示阻挡格子
    private _debugBlockedCellSprites: Map<number, Sprite2D> = new Map(); // 阻挡格子的精灵

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
        // 设置 World 的回调函数（全部转为秒）
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
     * @param levelId 关卡ID
     * @param mapId 地图ID（可选，默认使用关卡配置中的 mapId）
     */
    async loadLevel(levelId: number, mapId?: number): Promise<void> {
        // 从配置表获取关卡配置
        const { Configs } = await import('../../common/Configs');
        const levelConfigs = Configs.Get('level') || {};
        const levelConfig = levelConfigs[levelId];
        
        if (!levelConfig) {
            throw new Error(`Level config not found: ${levelId}`);
        }

        // 获取地图配置
        const mapConfigs = Configs.Get('map') || {};
        const targetMapId = mapId ?? levelConfig.mapId;
        const mapConfig = mapConfigs[targetMapId];
        
        if (!mapConfig) {
            throw new Error(`Map config not found: ${targetMapId}`);
        }

        // 使用 LevelManager 加载关卡
        this._levelManager.loadLevel(levelConfig, mapConfig);
        
        const spriteManager = this._world.getSpriteManager();
        
        // 创建并加载地图
        this._map = new GameMap(mapConfig, spriteManager);
        await this._map.loadBackgrounds();

        // 应用地图配置中的视口与相机初始位置
        const viewportW = Number(mapConfig.viewportWidth || 0);
        const viewportH = Number(mapConfig.viewportHeight || 0);
        if (viewportW > 0 && viewportH > 0) {
            this._world.setViewport(viewportW, viewportH);
        }
        if (mapConfig.cameraX !== undefined && mapConfig.cameraY !== undefined) {
            const camZ = mapConfig.cameraZ ?? 0;
            this._world.getCamera().setPosition(mapConfig.cameraX, mapConfig.cameraY, camZ);
        }
        
        // 为场景中的所有 actor 创建 sprite
        const actors = this._game.getActors();
        const spriteLoadPromises: Promise<void>[] = [];
        
        for (const actor of actors) {
            // 只有 Unit 类型的 actor 才有 unitId，才需要加载单位动画
            if (!(actor instanceof Unit)) {
                continue;
            }
            
            if (!actor.getSpriteId()) {
                const spriteId = `sprite_${actor.actorNo}`;

                // 异步加载角色动画
                const loadPromise = (async () => {
                    try {
                        console.log(`[loadLevel] Loading sprite for actor ${actor.actorNo}, unitId=${actor.unitId}`);
                        
                        // 1. 获取单位配置（根据 unitId）
                        const unitConfig = getUnitConfig(actor.unitId);
                        if (!unitConfig) {
                            throw new Error(`Unit config not found for unit id: ${actor.unitId}`);
                        }

                        // 2. 从单位配置中获取模型 ID
                        const modelId = unitConfig.modelId;

                        // 3. 获取模型配置
                        const modelConfig = getModelConfig(modelId);
                        if (!modelConfig) {
                            throw new Error(`Model config not found for model id: ${modelId}`);
                        }
                        // 4. 创建动画精灵（使用模型ID对应的 spritesheet JSON）
                        const sprite = await AnimatedSprite2D.create(`/unit/${modelId}.json`);
                        sprite.setPosition(0, 0);
                        this._applyUnitAnimation(actor, sprite, true);
                        spriteManager.add(spriteId, sprite);
                        actor.setSpriteId(spriteId);
                        console.log(`[loadLevel] Successfully loaded sprite for actor ${actor.actorNo}`);
                    } catch (err) {
                        console.warn(`Failed to load animated sprite for actor ${actor.actorNo}:`, err);
                        // 降级使用占位符
                        const sprite = this._createPlaceholderSprite(actor.campId);
                        spriteManager.add(spriteId, sprite);
                        actor.setSpriteId(spriteId);
                        console.log(`[loadLevel] Using placeholder sprite for actor ${actor.actorNo}`);
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
        
        // 设置 Map 到 MovementSystem
        if (this._map) {
            const movementSystem = this._game.getSystem<MovementSystem>('movement');
            if (movementSystem) {
                movementSystem.setMap(this._map);
                console.log('[GameRunner] MovementSystem initialized with map');
            }
        }
        
        this._levelManager.startLevel();
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

        // 从地图配置获取像素密度
        const mapConfig = this._map?.getConfig();
        const pixelsPerMeterX = mapConfig?.pixelsPerMeterX ?? 32;
        const pixelsPerMeterY = mapConfig?.pixelsPerMeterY ?? 16;

        for (const actor of actors) {
            // 懒加载 sprite
            if (!actor.getSpriteId()) {
                this._loadActorSprite(actor);
                continue;
            }
            const spriteId = actor.getSpriteId();
            const pos = actor.getPosition();
            const sprite = spriteManager.get(spriteId);
            if (sprite) {
                // 世界坐标转地图平面像素坐标（未含相机/视口变换）
                const [screenX, screenY] = worldToMapPixel(pos.x, pos.y, pos.z, pixelsPerMeterX, pixelsPerMeterY);
                sprite.setPosition(screenX, screenY);
                sprite.rotation = 0;
                const scale = actor.getScale();
                sprite.setScale(scale, scale);
                sprite.visible = actor.isVisible();
                // 使用 z 坐标（深度）- y（高度）控制渲染层级（越深越靠后，越高越靠前）
                sprite.position.z = pos.z - pos.y;
                if (sprite instanceof AnimatedSprite2D) {
                    this._applyUnitAnimation(actor, sprite, false);
                }
            }
        }

        // 调试：渲染阻挡格子
        if (this._debugShowBlockedCells && this._map && mapConfig) {
            this._renderDebugBlockedCells(mapConfig);
        }
    }

    /**
     * 根据 Unit 状态切换动画
     */
    private _applyUnitAnimation(actor: Actor, sprite: AnimatedSprite2D, force: boolean): void {
        const animationSystem = this._game.getSystem<AnimationSystem>('animation');
        const desiredClip = animationSystem?.getClipName(actor.actorNo) ?? null;
        if (!desiredClip) {
            if (!this._animDebugMissingStatus.has(actor.actorNo)) {
                console.warn(`[Animation] No status for actor ${actor.actorNo}, cannot select clip`);
                this._animDebugMissingStatus.add(actor.actorNo);
            }
            return;
        }
        if (!sprite.getClip(desiredClip)) return;
        if (!force && sprite.getCurrentClipName() === desiredClip) return;
        sprite.play(desiredClip);
    }

    /**
     * 调试渲染阻挡格子
     */
    private _renderDebugBlockedCells(mapConfig: MapConfig): void {
        const gridWidth = mapConfig.gridWidth ?? 0;
        const gridHeight = mapConfig.gridHeight ?? 0;
        const colCount = mapConfig.colCount ?? 0;
        const pixelsPerMeterX = mapConfig.pixelsPerMeterX ?? 32;
        const pixelsPerMeterY = mapConfig.pixelsPerMeterY ?? 16;

        if (gridWidth <= 0 || gridHeight <= 0 || colCount <= 0) {
            return;
        }

        const gridWidthPx = gridWidth * pixelsPerMeterX;
        const gridHeightPx = gridHeight * pixelsPerMeterY;
        const spriteManager = this._world.getSpriteManager();
        const gridCells = mapConfig.gridCells ?? [];

        // 如果格子数量变化，重新创建精灵
        if (this._debugBlockedCellSprites.size !== gridCells.length) {
            // 清理旧的
            this._debugBlockedCellSprites.forEach((sprite, idx) => {
                spriteManager.remove(`debug_blocked_${idx}`);
                sprite.destroy();
            });
            this._debugBlockedCellSprites.clear();

            // 创建新的
            gridCells.forEach((idx, i) => {
                // 创建一个红色半透明方块
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(gridWidthPx);
                canvas.height = Math.ceil(gridHeightPx);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                const sprite = new Sprite2D(canvas);
                sprite.setAnchor(0, 0); // 左上角对齐
                sprite.position.z = -90; // 在背景层之上，单位之下
                
                const col = idx % colCount;
                const row = Math.floor(idx / colCount);
                const x = col * gridWidthPx;
                const y = row * gridHeightPx;
                sprite.setPosition(x, y);

                const spriteId = `debug_blocked_${idx}`;
                spriteManager.add(spriteId, sprite);
                this._debugBlockedCellSprites.set(idx, sprite);
            });
        }
    }

    /**
     * 获取World（仅用于初始化阶段设置回调）
     */
    getWorld(): World {
        return this._world;
    }

    /**
     * 获取 Game 实例
     */
    getGame(): Game {
        return this._game;
    }

    /**
     * 销毁游戏运行器
     */
    destroy(): void {
        // 清理调试精灵
        const spriteManager = this._world.getSpriteManager();
        this._debugBlockedCellSprites.forEach((sprite, idx) => {
            spriteManager.remove(`debug_blocked_${idx}`);
            sprite.destroy();
        });
        this._debugBlockedCellSprites.clear();
        
        this.stop();
        this._sceneManager.destroy();
        this._game.destroy();
        this._world.destroy();
    }

    /**
     * 切换调试显示阻挡格子
     */
    toggleDebugBlockedCells(): void {
        this._debugShowBlockedCells = !this._debugShowBlockedCells;
        console.log(`[GameRunner] Debug blocked cells: ${this._debugShowBlockedCells}`);
    }

    /**
     * 获取调试显示阻挡格子状态
     */
    getDebugShowBlockedCells(): boolean {
        return this._debugShowBlockedCells;
    }

    /**
     * 设置调试显示阻挡格子
     */
    setDebugShowBlockedCells(show: boolean): void {
        this._debugShowBlockedCells = show;
        
        // 如果关闭，清理精灵
        if (!show) {
            const spriteManager = this._world.getSpriteManager();
            this._debugBlockedCellSprites.forEach((sprite, idx) => {
                spriteManager.remove(`debug_blocked_${idx}`);
                sprite.destroy();
            });
            this._debugBlockedCellSprites.clear();
        }
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
    // ...existing code...
}
