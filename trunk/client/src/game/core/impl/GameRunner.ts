/**
 * 游戏运行器（客户端版本）
 * 整合 Game、World 和场景管理，处理渲染和逻辑同步
 */

import { Game } from './GameSystem';
import { SceneManager } from './SceneManager';
import { LevelManager } from './LevelManager';
import { GameMap } from './Map';
import type { MapConfig } from '../config/MapConfig';
import { MovementSystem } from './MovementSystem';
import type { World } from '../../engine/common/World';
import type { LevelConfig } from '../config/LevelConfig';
import { Sprite2D } from '../../engine/base/Sprite2D';
import { AnimatedSprite2D } from '../../engine/base/AnimatedSprite2D';
import { getModelConfig } from '../config/ModelConfig';
import { getUnitConfig } from '../config/UnitConfig';
import { worldToMapPixel, mapPixelToWorld } from '../base/WorldProjection';
import type { Actor } from './Actor';
import { Unit, Building } from './Unit';
import type { AnimationSystem } from './AnimationSystem';
import { getBuildGridIndex, getBuildGridCenter } from '../config/MapConfig';

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
    private _frameTime: number = 1 / 30; // 30 FPS 帧同步（秒）
    private _isRunning: boolean = false;
    private _debugShowBlockedCells: boolean = false; // 调试：显示阻挡格子
    private _debugBlockedCellSprites: Map<number, Sprite2D> = new Map(); // 阻挡格子的精灵
    private _debugShowBuildCells: boolean = false; // 调试：显示可建筑格子
    private _debugBuildCellSprites: Map<number, Sprite2D> = new Map(); // 可建筑格子的精灵
    private _debugBuildCellSignature: string = '';
    private _buildingPreviewSprite: Sprite2D | null = null; // 建筑预览精灵
    private _buildingPreviewData: any = null; // 当前预览的建筑数据

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

        // 应用地图配置中的相机初始位置（视口大小由外部 canvas/World.resize 控制）
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
            if (!spriteId) continue;
            const pos = actor.getPosition();
            const sprite = spriteManager.get(spriteId);
            if (sprite) {
                // 世界坐标转地图平面像素坐标（未含相机/视口变换）
                const [screenX, screenY] = worldToMapPixel(pos.x, pos.y, pos.z, mapConfig.mapHeight, pixelsPerMeterX, pixelsPerMeterY);
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
            this._renderDebugBlockedCells(mapConfig as any);
        }

        // 调试：渲染可建筑格子
        if (this._debugShowBuildCells && this._map && mapConfig) {
            this._renderDebugBuildCells(mapConfig as any);
        }

        // 渲染建筑预览
        if (this._buildingPreviewSprite && mapConfig) {
            this._updateBuildingPreviewSprite(mapConfig as any);
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
        const colCount = (mapConfig as any).colCount ?? 0;
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
     * 调试渲染可建筑格子
     */
    private _renderDebugBuildCells(mapConfig: MapConfig): void {
        const bw = mapConfig.buildGridWidth ?? mapConfig.gridWidth ?? 0;
        const bh = mapConfig.buildGridHeight ?? mapConfig.gridHeight ?? 0;
        const mapWidth = mapConfig.mapWidth ?? 0;
        const mapHeight = mapConfig.mapHeight ?? 0;
        const pixelsPerMeterX = mapConfig.pixelsPerMeterX ?? 32;
        const pixelsPerMeterY = mapConfig.pixelsPerMeterY ?? 16;

        if (bw <= 0 || bh <= 0 || mapWidth <= 0 || mapHeight <= 0) {
            return;
        }

        const colCount = Math.floor(mapWidth / bw);
        const rowCount = Math.floor(mapHeight / bh);
        if (colCount <= 0 || rowCount <= 0) {
            return;
        }

        const gridWidthPx = bw * pixelsPerMeterX;
        const gridHeightPx = bh * pixelsPerMeterY;
        const ox = (mapConfig.buildOffsetX ?? 0) * pixelsPerMeterX;
        const oy = (mapConfig.buildOffsetY ?? 0) * pixelsPerMeterY;
        const spriteManager = this._world.getSpriteManager();
        const buildGridCells = mapConfig.buildGridCells ?? [];
        const signature = buildGridCells.join(',');

        // 如果格子数量或内容变化，重新创建精灵
        if (this._debugBuildCellSprites.size !== buildGridCells.length || this._debugBuildCellSignature !== signature) {
            this._debugBuildCellSprites.forEach((sprite, idx) => {
                spriteManager.remove(`debug_build_${idx}`);
                sprite.destroy();
            });
            this._debugBuildCellSprites.clear();
            this._debugBuildCellSignature = signature;

            buildGridCells.forEach((idx: number) => {
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(gridWidthPx);
                canvas.height = Math.ceil(gridHeightPx);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
                }

                const sprite = new Sprite2D(canvas);
                sprite.setAnchor(0, 0);
                sprite.position.z = -85;

                const col = idx % colCount;
                const row = Math.floor(idx / colCount);
                const x = ox + col * gridWidthPx;
                const y = oy + row * gridHeightPx;
                sprite.setPosition(x, y);

                const spriteId = `debug_build_${idx}`;
                spriteManager.add(spriteId, sprite);
                this._debugBuildCellSprites.set(idx, sprite);
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
        this._debugBuildCellSprites.forEach((sprite, idx) => {
            spriteManager.remove(`debug_build_${idx}`);
            sprite.destroy();
        });
        this._debugBuildCellSprites.clear();
        this._debugBuildCellSignature = '';
        
        // 清理建筑预览
        this._clearBuildingPreview();
        
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

    /**
     * 设置调试显示可建筑格子
     */
    setDebugShowBuildCells(show: boolean): void {
        this._debugShowBuildCells = show;

        if (!show) {
            const spriteManager = this._world.getSpriteManager();
            this._debugBuildCellSprites.forEach((sprite, idx) => {
                spriteManager.remove(`debug_build_${idx}`);
                sprite.destroy();
            });
            this._debugBuildCellSprites.clear();
            this._debugBuildCellSignature = '';
        }
    }

    /**
     * 设置建筑预览
     */
    setBuildingPreview(building: any, screenX: number, screenY: number): void {
        if (!building || !this._map) {
            this._clearBuildingPreview();
            return;
        }

        this._buildingPreviewData = {
            building,
            screenX,
            screenY
        };

        // 如果预览精灵不存在，创建一个
        if (!this._buildingPreviewSprite) {
            // 根据网格大小创建预览
            const mapConfig = this._map.getConfig();
            const pixelsPerMeterX = mapConfig?.pixelsPerMeterX ?? 32;
            const pixelsPerMeterY = mapConfig?.pixelsPerMeterY ?? 16;
            const buildGridWidth = mapConfig?.buildGridWidth ?? mapConfig?.gridWidth ?? 32;
            const buildGridHeight = mapConfig?.buildGridHeight ?? mapConfig?.gridHeight ?? 32;
            
            const canvasWidth = Math.ceil(buildGridWidth * pixelsPerMeterX);
            const canvasHeight = Math.ceil(buildGridHeight * pixelsPerMeterY);
            
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(canvasWidth, 32);
            canvas.height = Math.max(canvasHeight, 32);
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // 根据建筑类型绘制不同的颜色
                let fillColor = 'rgba(34, 197, 94, 0.5)'; // 默认绿色
                let strokeColor = 'rgba(34, 197, 94, 1)';
                
                if (building.id === 'barracks') {
                    fillColor = 'rgba(59, 130, 246, 0.5)'; // 蓝色
                    strokeColor = 'rgba(59, 130, 246, 1)';
                } else if (building.id === 'barrier') {
                    fillColor = 'rgba(239, 68, 68, 0.5)'; // 红色
                    strokeColor = 'rgba(239, 68, 68, 1)';
                }
                
                ctx.fillStyle = fillColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
            }

            this._buildingPreviewSprite = new Sprite2D(canvas);
            this._buildingPreviewSprite.setAnchor(0.5, 0.5);
            this._buildingPreviewSprite.position.z = 100; // 在最上层
            this._world.getSpriteManager().add('building_preview', this._buildingPreviewSprite);
        }
    }

    /**
     * 更新建筑预览精灵位置
     */
    private _updateBuildingPreviewSprite(mapConfig: MapConfig): void {
        if (!this._buildingPreviewSprite || !this._buildingPreviewData) return;

        const camera = this._world.getCamera();
        const { screenX, screenY } = this._buildingPreviewData;

        // 屏幕坐标转渲染像素坐标
        const renderPos = camera.screenToWorld(screenX, screenY);
        
        // 渲染像素坐标转游戏世界米坐标
        const pixelsPerMeterX = mapConfig.pixelsPerMeterX ?? 32;
        const pixelsPerMeterY = mapConfig.pixelsPerMeterY ?? 16;
        const [worldX, worldZ, worldY] = mapPixelToWorld(renderPos.x, renderPos.y, pixelsPerMeterX, pixelsPerMeterY);
        
        
        // 检查是否在有效建筑格子上（使用 x, z 坐标，z是深度方向对应地图Y）
        const gridIndex = getBuildGridIndex(worldX, worldZ, mapConfig);
        const buildGridCells = mapConfig.buildGridCells ?? [];
        const isValid = gridIndex >= 0 && buildGridCells.includes(gridIndex);

        // 如果在有效格子上，吸附到格子中心
        if (isValid) {
            const center = getBuildGridCenter(gridIndex, mapConfig);
            const [snapX, snapY] = worldToMapPixel(center.x, center.y, center.z ?? 0, pixelsPerMeterX, pixelsPerMeterY);
            this._buildingPreviewSprite.setPosition(snapX, snapY);
            
            // 更改颜色为绿色（可以放置）
            const texture = this._buildingPreviewSprite.getTexture();
            if (texture && texture instanceof HTMLCanvasElement) {
                const ctx = texture.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, texture.width, texture.height);
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
                    ctx.fillRect(0, 0, 64, 64);
                    ctx.strokeStyle = 'rgba(34, 197, 94, 1)';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(2, 2, 60, 60);
                }
            }
        } else {
            // 跟随鼠标，显示红色（无法放置）
            // 直接使用渲染坐标
            this._buildingPreviewSprite.setPosition(renderPos.x, renderPos.y);
            
            const texture = this._buildingPreviewSprite.getTexture();
            if (texture && texture instanceof HTMLCanvasElement) {
                const ctx = texture.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, texture.width, texture.height);
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                    ctx.fillRect(0, 0, 64, 64);
                    ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(2, 2, 60, 60);
                }
            }
        }

        this._buildingPreviewSprite.visible = true;
    }

    /**
     * 清除建筑预览
     */
    private _clearBuildingPreview(): void {
        if (this._buildingPreviewSprite) {
            this._world.getSpriteManager().remove('building_preview');
            this._buildingPreviewSprite.destroy();
            this._buildingPreviewSprite = null;
        }
        this._buildingPreviewData = null;
    }

    /**
     * 尝试放置建筑
     */
    tryPlaceBuilding(building: any, screenX: number, screenY: number): { success: boolean; reason?: string; building?: Building } {
        if (!this._map) {
            return { success: false, reason: '地图未加载' };
        }

        const mapConfig = this._levelManager['_currentMapConfig'] as MapConfig;
        if (!mapConfig) {
            return { success: false, reason: '地图配置未找到' };
        }

        const camera = this._world.getCamera();
        const renderPos = camera.screenToWorld(screenX, screenY);
        
        // 转换为游戏世界米坐标
        const pixelsPerMeterX = mapConfig?.pixelsPerMeterX ?? 32;
        const pixelsPerMeterY = mapConfig?.pixelsPerMeterY ?? 16;
        const [worldX, worldZ, worldY] = mapPixelToWorld(renderPos.x, renderPos.y, mapConfig.mapHeight, pixelsPerMeterX, pixelsPerMeterY);

        // 检查是否在有效建筑格子上
        const gridIndex = getBuildGridIndex(worldX, worldZ, mapConfig);
        const buildGridCells = mapConfig.buildGridCells ?? [];
        
        if (gridIndex < 0 || !buildGridCells.includes(gridIndex)) {
            return { success: false, reason: '不在可建筑区域' };
        }

        // 获取格子中心坐标
        const center = getBuildGridCenter(gridIndex, mapConfig);

        // 创建建筑实例 - 使用统一的actor编号生成方式
        const buildingActorNo = `1_building_${building.id}_${Date.now()}_${Math.random()}`;
        const buildingInstance = new Building(
            buildingActorNo,
            'default_building_model', // TODO: 使用实际的模型ID
            building.id === 'tower' ? 1 : building.id === 'barracks' ? 2 : 3, // 临时映射
            1 // 玩家阵营
        );

        // 设置位置（x, y=0, z）
        buildingInstance.getPosition().x = center.x;
        buildingInstance.getPosition().y = 0;
        buildingInstance.getPosition().z = center.y;
        
        // 添加到游戏中
        this._game.addActor(buildingInstance);

        // 清除预览
        this._clearBuildingPreview();

        return { success: true, building: buildingInstance };
    }
}

/**
 * 服务器游戏运行器
 * 仅处理逻辑，无渲染部分
 */
export class ServerGameRunner {
    private _game: Game;
    private _sceneManager: SceneManager;
    private _frameTime: number = 1 / 30; // 30 FPS 帧同步（秒）
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
        this._sceneManager.loadScene(levelConfig, mapConfig as any);
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
            this._game.update(this._frameTime);
        }, this._frameTime * 1000);
    }

    /**
     * 帧更新
     */
    // ...existing code...
}
