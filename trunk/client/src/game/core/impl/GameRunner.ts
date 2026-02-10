/**
 * 游戏运行器（客户端版本）
 * 整合 Game、World 和场景管理，处理渲染和逻辑同步
 */

import { Game } from './GameSystem';
import { SceneManager } from './SceneManager';
import { LevelManager } from './LevelManager';
import { ProductionSystem } from './ProductionSystem';
import { GameMap } from './Map';
import type { MapConfig } from '../config/MapConfig';
import { MovementSystem } from './MovementSystem';
import type { World } from '../../engine/common/World';
import type { LevelConfig } from '../config/LevelConfig';
import { Sprite2D } from '../../engine/base/Sprite2D';
import { AnimatedSprite2D } from '../../engine/base/AnimatedSprite2D';
import { Sprite3D } from '../../engine/base/Sprite3D';
import { getModelConfig } from '../config/ModelConfig';
import { createSpriteByModel } from '../../engine/base/model';
import { getUnitConfig } from '../config/UnitConfig';
import { perfMonitor } from '../../engine/common/PerformanceMonitor';
import { getBuildingAbilityDef, getDefaultAbilityConfig } from '../config/BuildingAbilityConfig';
import { Configs } from '../../common/Configs';

import type { Actor } from './Actor';
import { ActorType } from './Actor';
import { Unit } from './Unit';
import { Building } from './Building';
import { Bullet } from './Bullet';
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
            
            this._pendingSpriteLoads.add(actor.actorNo);
            const spriteManager = this._world.getSpriteManager();
            const spriteId = `sprite_${actor.actorNo}`;
            
            (async () => {
                try {
                    const modelId = actor.modelId;
                    const modelConfig = getModelConfig(modelId);
                    if (!modelConfig) {
                        if (actor.actorType === ActorType.Building) {
                            const placeholder = this._createPlaceholderSprite(actor.campId);
                            const pos = actor.getPosition();
                            placeholder.setPosition(pos.x, pos.y, pos.z);
                            spriteManager.add(spriteId, placeholder);
                            actor.setSpriteId(spriteId);
                            return;
                        }
                        throw new Error(`Model config not found for model id: ${modelId}`);
                    }
                    
                    // actor 可能已被移除
                    if (!this._game.getActor(actor.actorNo)) return;
                    
                    // 准备 blackboard 数据
                    const blackboard: Record<string, any> = {
                        actorNo: actor.actorNo,
                        actorType: actor.actorType,
                        campId: actor.campId,
                    };
                    
                    // 如果是 Bullet，添加子弹特有数据
                    if (actor.actorType === ActorType.Bullet) {
                        const bullet = actor as any; // Bullet 类型
                            const pos = actor.getPosition();
                            blackboard.startPosition = { x: pos.x, y: pos.y, z: pos.z };
                            blackboard.currentPosition = { x: pos.x, y: pos.y, z: pos.z };
                        
                        // 获取目标位置（通过 Bullet 的公开方法）
                        if (typeof bullet.getTargetPosition === 'function') {
                            const targetPos = bullet.getTargetPosition();
                            if (targetPos) {
                                    blackboard.targetPosition = { 
                                        x: targetPos.x, 
                                        y: targetPos.y || 0, 
                                        z: targetPos.z || 0 
                                    };
                            }
                        }
                        
                        // 如果没有获取到目标位置，设置默认值（当前位置前方）
                        if (!blackboard.targetPosition) {
                            blackboard.targetPosition = {
                                x: pos.x,
                                y: pos.y,
                                z: pos.z + 5
                            };
                        }
                    }
                    
                    const sprite = await createSpriteByModel(modelId, modelConfig, blackboard);
                    
                    // 设置初始位置
                    const pos = actor.getPosition();
                    sprite.setPosition(pos.x, pos.y, pos.z);
                    
                    // 设置缩放：直接从 modelConfig 读取，确保一致性
                    const scale = modelConfig.scale || actor.getScale() || 1;
                    if (sprite instanceof AnimatedSprite2D || sprite instanceof Sprite2D) {
                        sprite.setScale(scale, scale, 1);
                    } else {
                        sprite.setScale(scale, scale, scale);
                    }
                    
                    // 设置初始旋转（对 Bullet 尤其重要）
                    if (actor.actorType === ActorType.Bullet) {
                        const rotationDeg = actor.getRotation();
                        if (sprite instanceof Sprite2D) {
                            sprite.rotationZ = rotationDeg;
                        } else {
                            const rotationRad = rotationDeg * (Math.PI / 180);
                            sprite.setRotation(0, rotationRad, 0);
                        }
                    }
                    
                    // Unit 需要应用动画
                    if (actor instanceof Unit) {
                        this._applyUnitAnimation(actor, sprite, true);
                    }
                    
                    // 检查 actor 是否仍然活跃（防止异步加载过程中 actor 已被销毁）
                    if (!actor.isActive()) {
                        console.log(`[GameRunner] Actor ${actor.actorNo} is inactive, destroying sprite before adding`);
                        sprite.destroy();
                        return;
                    }
                    
                    spriteManager.add(spriteId, sprite);
                    actor.setSpriteId(spriteId);
                } catch (err) {
                    console.error(`Failed to load sprite for actor ${actor.actorNo}:`, err);
                } finally {
                    this._pendingSpriteLoads.delete(actor.actorNo);
                }
            })();
        }
    private _game: Game;
    private _world: World;
    private _sceneManager: SceneManager;
    private _levelManager: LevelManager;
    private _productionSystem: ProductionSystem;
    private _map: GameMap | null = null;
    private _frameTime: number = 1 / 30; // 30 FPS 帧同步（秒）
    private _isRunning: boolean = false;
    private _debugShowBlockedCells: boolean = false; // 调试：显示阻挡格子
    private _debugBlockedCellSprites: Map<number, Sprite2D> = new Map(); // 阻挡格子的精灵
    private _debugShowBuildCells: boolean = false; // 调试：显示可建筑格子
    private _debugBuildCellSprites: Map<number, Sprite2D> = new Map(); // 可建筑格子的精灵
    private _debugBuildCellSignature: string = '';
    private _debugRenderLogged: boolean = false;

    constructor(world: World) {
        this._world = world;
        this._game = new Game(false); // 客户端模式
        this._game.setWorld(world);
        this._sceneManager = new SceneManager(this._game);
        this._levelManager = new LevelManager(this._game, this._sceneManager);
        this._productionSystem = new ProductionSystem(this._game);
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
     * 获取相机对象
     */
    getCamera() {
        return this._world.getCamera();
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
        this._map = new GameMap(mapConfig, spriteManager, this._world.getCamera());
        await this._map.loadImages();

        // 相机初始位置由地图初始化逻辑处理
        
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
                        
                        // 4. 根据模型类型创建对应的精灵
                        const sprite = await createSpriteByModel(modelId, modelConfig);
                        
                        // 立即设置精灵到 actor 的实际位置和缩放
                        const pos = actor.getPosition();
                        sprite.setPosition(pos.x, pos.y, pos.z);
                        
                        // 设置初始缩放（2D 精灵 Z 轴为 1，3D 精灵 Z 轴等于 X/Y）
                        const actorScale = actor.getScale();
                        if (sprite instanceof AnimatedSprite2D || sprite instanceof Sprite2D) {
                            sprite.setScale(actorScale, actorScale, 1);
                        } else {
                            sprite.setScale(actorScale, actorScale, actorScale);
                        }
                        
                        this._applyUnitAnimation(actor, sprite, true);
                        spriteManager.add(spriteId, sprite);
                        actor.setSpriteId(spriteId);
                    } catch (err) {
                        console.warn(`Failed to load animated sprite for actor ${actor.actorNo}:`, err);
                    }
                })();
                
                spriteLoadPromises.push(loadPromise);
            }
        }
        
        // 等待所有 sprite 加载完成
        await Promise.all(spriteLoadPromises);
        
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
        return new Sprite2D(canvas, canvas.width, canvas.height);
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
        // 更新关卡（处理定时器和触发器）
        this._levelManager.update(deltaTime);
        // 更新建筑的生产队列
        this._productionSystem.update(deltaTime);
    }

    /**
     * 渲染更新
     * 将世界坐标投影到屏幕坐标
     */
    private _onRender(deltaTime: number): void {
        perfMonitor.increment('GameRunner.render');
        
        const spriteManager = this._world.getSpriteManager();
        const actors = this._game.getActors();
        const mapConfig = this._map?.getConfig();

        if (!this._debugRenderLogged) {
            this._debugRenderLogged = true;
            console.log('[Render] actors:', actors.length, 'sprites:', spriteManager.getAll().length);
            if (actors.length > 0) {
                const first = actors[0] as any;
                console.log('[Render] first actor:', {
                    actorNo: first.actorNo,
                    type: first.actorType,
                    modelId: first.modelId
                });
            }
        }
        
        // 第一步：遍历 actor，设置对应 sprite 的位置和可见性
        for (const actor of actors) {
            const spriteId = actor.getSpriteId();
            if (!spriteId) {
                this._loadActorSprite(actor);
                continue;
            }
            
            const sprite = spriteManager.get(spriteId);
            if (!sprite) continue;
            
            // 优化：建筑通常不移动，跳过位置更新
            const isBuilding = actor.actorType === ActorType.Building;
            if (!isBuilding) {
                perfMonitor.increment('GameRunner.posUpdate');
                const pos = actor.getPosition();
                sprite.setPosition(pos.x, Math.max(0.5, pos.y), pos.z);
            }
            
            sprite.visible = actor.isVisible();

            // 同步 Bullet 朝向到 sprite（初始旋转在 sprite 中自动处理）
            if (actor.actorType === ActorType.Bullet) {
                const rotationDeg = actor.getRotation();
                if (sprite instanceof Sprite2D) {
                    sprite.rotationZ = rotationDeg;
                } else {
                    const rotationRad = rotationDeg * (Math.PI / 180);
                    sprite.setRotation(0, rotationRad, 0);
                }
            }
            
            // 更新 Unit 动画状态
            if (sprite instanceof AnimatedSprite2D || sprite instanceof Sprite3D) {
                perfMonitor.increment('GameRunner.animUpdate');
                this._applyUnitAnimation(actor, sprite, false);
            }
        }
        
        // 第二步：遍历所有 sprite，更新它们（包括插件和动画）
        const allSprites = spriteManager.getAll();
        for (const sprite of allSprites) {
            // 更新插件
            sprite.updatePlugins(deltaTime);
            
            // 更新动画
            if (sprite instanceof AnimatedSprite2D) {
                sprite.update();
            } else if (sprite instanceof Sprite3D) {
                sprite.update(this._world.deltaTime);
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

    }

    /**
     * 根据 Unit 状态切换动画
     */
    private _applyUnitAnimation(actor: Actor, sprite: any, force: boolean): void {
        const animationSystem = this._game.getSystem<AnimationSystem>('animation');
        const desiredClip = animationSystem?.getClipName(actor.actorNo) ?? null;
        if (!desiredClip) {
            if (!this._animDebugMissingStatus.has(actor.actorNo)) {
                console.warn(`[Animation] No status for actor ${actor.actorNo}, cannot select clip`);
                this._animDebugMissingStatus.add(actor.actorNo);
            }
            return;
        }
        
        // 处理 AnimatedSprite2D (2D 序列帧)
        if (sprite instanceof AnimatedSprite2D) {
            if (!sprite.getClip(desiredClip)) return;
            if (!force && sprite.getCurrentClipName() === desiredClip) return;
            sprite.play(desiredClip);
        }
        // 处理 Sprite3D (3D FBX 模型)
        else if (sprite instanceof Sprite3D) {
            const animationNames = sprite.getAnimationNames();
            if (!animationNames.includes(desiredClip)) {
                console.warn(`[Animation] Sprite3D does not have animation: ${desiredClip}`);
                return;
            }
            // 只有在需要切换动画时才调用 playAnimation，避免每帧重新启动
            if (!force && sprite.getCurrentAnimationName() === desiredClip) return;
            sprite.playAnimation(desiredClip, true);  // 循环播放
        }
    }

    /**
     * 调试渲染阻挡格子
     */
    private _renderDebugBlockedCells(mapConfig: MapConfig): void {
        const gridWidth = mapConfig.gridWidth ?? 0;
        const gridHeight = mapConfig.gridHeight ?? 0;
        const colCount = (mapConfig as any).colCount ?? 0;

        if (gridWidth <= 0 || gridHeight <= 0 || colCount <= 0) {
            return;
        }

        const gridWidthPx = gridWidth;
        const gridHeightPx = gridHeight;
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

                const sprite = new Sprite2D(canvas, gridWidthPx, gridHeightPx);
                sprite.setAnchor(0, 0); // 左上角对齐
                
                const col = idx % colCount;
                const row = Math.floor(idx / colCount);
                const worldX = col * gridWidthPx;
                const worldZ = row * gridHeightPx;
                sprite.setPosition(worldX, 0, worldZ);  // 俯视图：(X, Y, Z)
                sprite.position.y = -90; // 在背景层之上，单位之下

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

        if (bw <= 0 || bh <= 0 || mapWidth <= 0 || mapHeight <= 0) {
            return;
        }

        const colCount = Math.floor(mapWidth / bw);
        const rowCount = Math.floor(mapHeight / bh);
        if (colCount <= 0 || rowCount <= 0) {
            return;
        }

        const gridWidthPx = bw;
        const gridHeightPx = bh;
        const ox = (mapConfig.buildOffsetX ?? 0);
        const oy = (mapConfig.buildOffsetY ?? 0);
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

                const sprite = new Sprite2D(canvas, gridWidthPx, gridHeightPx);
                sprite.setAnchor(0, 0);

                const col = idx % colCount;
                const row = Math.floor(idx / colCount);
                const worldX = ox + col * gridWidthPx;
                const worldZ = oy + row * gridHeightPx;
                sprite.setPosition(worldX, 0, worldZ);  // 俯视图：(X, Y, Z)
                sprite.position.y = -85;

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
     * 尝试放置建筑
     */
    tryPlaceBuilding(building: any, screenX: number, screenY: number): { success: boolean; reason?: string; building?: Building } {
        console.log('[GameRunner] tryPlaceBuilding called:', { building: building?.id, hasMap: !!this._map, screenX, screenY });
        if (!this._map) {
            return { success: false, reason: '地图未加载' };
        }

        const camera = this._world.getCamera();
        const worldPos = camera.canvasToWorld(screenX, screenY, 0);
        const worldX = worldPos.x;
        const worldY = worldPos.y;
        const worldZ = worldPos.z;

        // 创建建筑实例 - 使用统一的actor编号生成方式
        const buildingActorNo = `1_building_${building.id}_${Date.now()}_${Math.random()}`;
        const buildingInstance = new Building(
            buildingActorNo,
            building?.modelId || 'default_building_model',
            building.id,
            1 // 玩家阵营
        );

        // 设置位置（x, y=0, z）
        buildingInstance.getPosition().x = worldX;
        buildingInstance.getPosition().y = 0;
        buildingInstance.getPosition().z = worldZ;
        
        // 初始化生产队列（如果存在）
        if (building.abilities) {
            const productionAbility = building.abilities.find((a: any) => a.type === 'ProductionQueue');
            if (productionAbility && productionAbility.config.queue) {
                console.log('[GameRunner] tryPlaceBuilding - initializing production queue:', { buildingId: building.id, queue: productionAbility.config.queue });
                buildingInstance.initProductionQueue(productionAbility.config.queue);
            }

            const turretAbility = building.abilities.find((a: any) => a.type === 'TurretAttack');
            if (turretAbility && turretAbility.config && turretAbility.config.attackSkillId !== undefined) {
                const attackSkillId = Number(turretAbility.config.attackSkillId);
                if (!Number.isNaN(attackSkillId)) {
                    buildingInstance.setAttackSkillId(attackSkillId);
                }
            }
            if (turretAbility && turretAbility.config) {
                buildingInstance.setTurretAttackConfig(turretAbility.config);
            }
        }
        
        // 添加到游戏中
        this._game.addActor(buildingInstance);

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
