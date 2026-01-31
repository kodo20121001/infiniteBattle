/**
 * 场景管理器
 * 负责初始化和管理游戏场景，根据关卡配置创建角色和环境
 */

import { Game } from './GameSystem';
import { Actor, ActorType } from './Actor';
import { Unit } from './Unit';
import type { StatusSystem } from './StatusSystem';
import { FixedVector3 } from '../base/fixed/FixedVector3';
import type { LevelConfig, LevelUnitConfig } from '../config/LevelConfig';
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

        // 创建初始单位
        if (levelConfig.startUnits) {
            for (const levelUnitConfig of levelConfig.startUnits) {
                this._createUnit(levelUnitConfig, levelConfig);
            }
        }

        // 配置单位的初始命令和自动技能（如果有）
        this._applyUnitCommands(levelConfig);

        console.log(`Scene loaded: ${levelConfig.name}`);
    }

    /**
     * 创建单位
     */
    private _createUnit(levelUnitConfig: LevelUnitConfig, levelConfig: LevelConfig): void {
        const unitConfig = getUnitConfig(levelUnitConfig.unitId);
        if (!unitConfig) {
            console.warn(`Unit config not found: ${levelUnitConfig.unitId}`);
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
            const point = this._mapConfig.points.find((p: any) => p.id === levelUnitConfig.positionName);
            if (point) {
                x = point.x;
                y = point.y ?? 0;
                z = point.z ?? 0;
            }
        }

        // 可选的相对偏移（测试用，便于群体生成）
        if ((levelUnitConfig as any).offset) {
            const off = (levelUnitConfig as any).offset;
            if (typeof off.x === 'number') x += off.x;
            if (typeof off.z === 'number') z += off.z;
        }

        // 创建角色
        const actorId = `${levelUnitConfig.campId}_${levelUnitConfig.unitId}_${Date.now()}_${Math.random()}`;
        const position = new FixedVector3(x, y, z);
        const unit = new Unit(
            actorId,
            unitConfig.modelId,
            levelUnitConfig.unitId,  // 单位类型（对应 unit.json 的 id）
            levelUnitConfig.campId,
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
