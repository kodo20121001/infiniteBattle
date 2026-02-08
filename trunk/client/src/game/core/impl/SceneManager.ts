/**
 * 场景管理器
 * 负责初始化和管理游戏场景，根据关卡配置创建角色和环境
 */

import { Game } from './GameSystem';
import { Actor, ActorType } from './Actor';
import { Unit } from './Unit';
import { Building } from './Building';
import { Configs } from '../../common/Configs';
import type { StatusSystem } from './StatusSystem';
import { FixedVector3 } from '../base/fixed/FixedVector3';
import type { LevelConfig, LevelActorConfig } from '../config/LevelConfig';
import type { UnitConfig } from '../config/UnitConfig';
import type { ModelConfig } from '../config/ModelConfig';
import { getUnitConfig } from '../config/UnitConfig';
import { getModelConfig } from '../config/ModelConfig';
import { UnitCommandSystem } from './UnitCommandSystem';
import type { MapConfig } from './Map';

/**
 * 场景管理器
 */
export class SceneManager {
    private _game: Game;
    private _levelConfig: LevelConfig | null = null;
    private _mapConfig: MapConfig | null = null;

    constructor(game: Game) {
        this._game = game;
    }

    /**
     * 加载场景
     */
    loadScene(levelConfig: LevelConfig, mapConfig: MapConfig): void {
        this._levelConfig = levelConfig;
        this._mapConfig = mapConfig;

        // 清理旧场景
        this._clearScene();
        // 初始化游戏状态
        this._game.init();

        // 创建初始 Actor（单位和建筑）
        if (levelConfig.startUnits) {
            console.log(`[SceneManager] Creating ${levelConfig.startUnits.length} start actors`);
            for (const levelActorConfig of levelConfig.startUnits) {
                console.log(`[SceneManager] Creating actor: type=${levelActorConfig.actorType}, positionName=${levelActorConfig.positionName}, campId=${levelActorConfig.campId}`, levelActorConfig);
                this._createActor(levelActorConfig, levelConfig);
            }
        } else {
            console.log(`[SceneManager] No startUnits in level config`);
        }

        // 配置单位的初始命令和自动技能（如果有）
        this._applyUnitCommands(levelConfig);

        console.log(`Scene loaded: ${levelConfig.name}`);
    }

    /**
     * 创建 Actor（单位或建筑）
     */
    private _createActor(levelActorConfig: LevelActorConfig, levelConfig: LevelConfig): void {
        if (levelActorConfig.actorType === 'unit') {
            this._createUnit(levelActorConfig, levelConfig);
        } else if (levelActorConfig.actorType === 'building') {
            this._createBuilding(levelActorConfig, levelConfig);
        }
    }

    /**
     * 创建单位
     */
    private _createUnit(levelActorConfig: LevelActorConfig, levelConfig: LevelConfig): void {
        if (!levelActorConfig.unitId) {
            console.warn(`Unit ID is required for actor type 'unit'`);
            return;
        }
        const unitConfig = getUnitConfig(levelActorConfig.unitId);
        if (!unitConfig) {
            console.warn(`Unit config not found: ${levelActorConfig.unitId}`);
            return;
        }

        // 获取模型配置
        const modelConfig = getModelConfig(unitConfig.modelId);
        if (!modelConfig) {
            console.warn(`Model config not found: ${unitConfig.modelId}`);
            return;
        }

        // 获取单位位置（从地图配置中查找）
        let x = 0, y = 0, z = 0;
        if (this._mapConfig && this._mapConfig.points) {
            const point = this._mapConfig.points.find((p: any) => p.id === levelActorConfig.positionName);
            if (point) {
                x = point.x;
                y = point.y ?? 0;
                z = point.z ?? 0;
            }
        }

        // 可选的相对偏移（测试用，便于群体生成）
        if (levelActorConfig.offset) {
            const off = levelActorConfig.offset;
            if (typeof off.x === 'number') x += off.x;
            if (typeof off.z === 'number') z += off.z;
        }

        // 创建角色
        const actorId = `${levelActorConfig.campId}_${levelActorConfig.unitId}_${Date.now()}_${Math.random()}`;
        const position = new FixedVector3(x, y, z);
        const unit = new Unit(
            actorId,
            unitConfig.modelId,
            levelActorConfig.unitId,  // 单位类型（对应 unit.json 的 id）
            levelActorConfig.campId,
            position
        );

        // 初始化角色
        unit.init(unitConfig, modelConfig);

        // 添加到游戏
        this._game.addActor(unit);

        // 初始化状态（避免动画系统无状态导致无法选择 clip）
        const statusSystem = this._game.getSystem<StatusSystem>('status');
        statusSystem?.setIdle(unit.actorNo);
    }

    /**
     * 创建建筑
     */
    private _createBuilding(levelActorConfig: LevelActorConfig, levelConfig: LevelConfig): void {
        if (!levelActorConfig.buildingId) {
            console.warn(`Building ID is required for actor type 'building'`);
            return;
        }

        // 获取建筑配置
        const buildingConfigs = Configs.Get('building') || {};
        const buildingConfig = buildingConfigs[levelActorConfig.buildingId];
        if (!buildingConfig) {
            console.warn(`Building config not found: ${levelActorConfig.buildingId}`);
            return;
        }

        // 从地图配置中查找位置
        let x = 0, y = 0, z = 0;
        if (this._mapConfig && this._mapConfig.points) {
            const point = this._mapConfig.points.find((p: any) => p.id === levelActorConfig.positionName);
            if (point) {
                x = point.x;
                y = point.y ?? 0;
                z = point.z ?? 0;
            } else {
                console.warn(`Point not found: ${levelActorConfig.positionName}`);
            }
        }

        // 创建建筑
        const actorId = `${levelActorConfig.campId}_building_${levelActorConfig.buildingId}_${Date.now()}_${Math.random()}`;
        const position = new FixedVector3(x, y, z);
        const building = new Building(
            actorId,
            buildingConfig.modelId || 'default_building_model',
            0,  // buildingId (numeric)
            levelActorConfig.campId,
            position
        );

        // 初始化生产队列（如果存在）
        if (buildingConfig.abilities) {
            const productionAbility = buildingConfig.abilities.find((a: any) => a.type === 'ProductionQueue');
            if (productionAbility && productionAbility.config.queue) {
                building.initProductionQueue(productionAbility.config.queue);
            }

            const turretAbility = buildingConfig.abilities.find((a: any) => a.type === 'TurretAttack');
            if (turretAbility && turretAbility.config && turretAbility.config.attackSkillId !== undefined) {
                const attackSkillId = Number(turretAbility.config.attackSkillId);
                if (!Number.isNaN(attackSkillId)) {
                    building.setAttackSkillId(attackSkillId);
                }
            }
            if (turretAbility && turretAbility.config) {
                building.setTurretAttackConfig(turretAbility.config);
            }
        }

        // 添加到游戏
        this._game.addActor(building);
    }

    /**
     * 清理场景
     */
    private _clearScene(): void {
        const actors = this._game.getActors();
        for (const actor of actors) {
            this._game.removeActor(actor.actorNo);
        }
    }

    /**
     * 应用单位的初始命令配置
     */
    private _applyUnitCommands(levelConfig: LevelConfig): void {
        if (!levelConfig.startUnits) return;

        const commandSystem = this._game.getSystem<UnitCommandSystem>('unitCommand');
        if (!commandSystem) return;

        const actors = this._game.getActors();
        
        // 为每个配置了命令的单位应用设置
        levelConfig.startUnits.forEach((unitConfig: any, index: number) => {
            const actor = actors[index]; // 按创建顺序对应
            if (!actor) return;

            // 设置初始命令
            if (unitConfig.command) {
                commandSystem.issueCommand(actor.actorNo, unitConfig.command);
            }
        });
    }

    /**
     * 获取关卡配置
     */
    getLevelConfig(): LevelConfig | null {
        return this._levelConfig;
    }

    /**
     * 获取地图配置
     */
    getMapConfig(): MapConfig | null {
        return this._mapConfig;
    }

    /**
     * 销毁场景管理器
     */
    destroy(): void {
        this._clearScene();
        this._levelConfig = null;
        this._mapConfig = null;
    }
}
