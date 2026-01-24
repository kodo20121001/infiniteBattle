/**
 * 场景管理器
 * 负责初始化和管理游戏场景，根据关卡配置创建角色和环境
 */

import { Game } from './GameSystem';
import { Actor, ActorType } from './Actor';
import { FixedVector2 } from '../base/fixed/FixedVector2';
import type { LevelConfig, LevelUnitConfig } from '../config/LevelConfig';
import type { UnitConfig } from '../config/UnitConfig';
import type { ModelConfig } from '../config/ModelConfig';
import { getUnitConfig } from '../config/UnitConfig';
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
            for (const unitConfig of levelConfig.startUnits) {
                this._createUnit(unitConfig, levelConfig);
            }
        }

        // 配置单位的初始命令和自动技能（如果有）
        this._applyUnitCommands(levelConfig);

        console.log(`Scene loaded: ${levelConfig.name}`);
    }

    /**
     * 创建单位
     */
    private _createUnit(unitConfig: LevelUnitConfig, levelConfig: LevelConfig): void {
        const unitBaseConfig = getUnitConfig(unitConfig.unitId);
        if (!unitBaseConfig) {
            console.warn(`Unit config not found: ${unitConfig.unitId}`);
            return;
        }

        // 获取单位位置（从地图配置中查找）
        let x = 0, z = 0, y = 0;
        if (this._mapConfig && this._mapConfig.points) {
            const point = this._mapConfig.points.find((p: any) => p.id === unitConfig.positionName);
            if (point) {
                x = point.x;
                z = point.y;  // 地图编辑器中的 y 对应游戏世界的 z
                y = 0;        // 默认高度为0
            }
        }

        // 创建角色
        const actorId = `${unitConfig.campId}_${unitConfig.unitId}_${Date.now()}_${Math.random()}`;
        const position = new FixedVector2(x, z);
        const actor = new Actor(
            actorId,
            ActorType.Unit,
            unitBaseConfig.modelId,
            unitConfig.unitId,  // 单位类型（对应 unit.json 的 id）
            unitConfig.campId,
            position,
            y
        );

        // 初始化角色（需要 ModelConfig，这里简化处理）
        const modelConfig: ModelConfig = {
            id: unitBaseConfig.modelId,
            name: unitBaseConfig.name,
            type: 'sprite' as any,
            actions: [],
            speed: 5,
            hp: 100,
        };
        actor.init(unitBaseConfig, modelConfig);

        // 添加到游戏
        this._game.addActor(actor);
    }

    /**
     * 清理场景
     */
    private _clearScene(): void {
        const actors = this._game.getActors();
        for (const actor of actors) {
            this._game.removeActor(actor.id);
        }
    }

    /**
     * 应用单位的初始命令配置
     */
    private _applyUnitCommands(levelConfig: LevelConfig): void {
        if (!levelConfig.startUnits) return;

        const commandSystem = this._game.getSystem('unitCommand');
        if (!commandSystem) return;

        const actors = this._game.getActors();
        
        // 为每个配置了命令的单位应用设置
        levelConfig.startUnits.forEach((unitConfig: any, index: number) => {
            const actor = actors[index]; // 按创建顺序对应
            if (!actor) return;

            // 设置初始命令
            if (unitConfig.command) {
                commandSystem.issueCommand(actor.id, unitConfig.command);
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
