/**
 * 生产系统
 * 处理建筑的生产队列更新和单位生成
 */

import { GameSystem } from './GameSystemBase';
import type { Game } from './GameSystem';
import { Building } from './Building';
import { Unit } from './Unit';
import { ActorType } from './Actor';
import { FixedVector3 } from '../base/fixed/FixedVector3';
import { getUnitConfig } from '../config/UnitConfig';
import { getModelConfig } from '../config/ModelConfig';
import type { StatusSystem } from './StatusSystem';

/**
 * 生产系统 - 处理建筑的单位生产
 */
export class ProductionSystem extends GameSystem {
    constructor(game: Game) {
        super(game);
    }

    init(): void {
        // 初始化
    }

    /**
     * 更新生产队列，生成新单位
     */
    update(deltaTime: number): void {
        const actors = this.game.getActors();
        const buildings = actors.filter(a => a.actorType === ActorType.Building);
        
        // 遍历所有建筑
        for (const building of buildings) {
            this._updateBuildingProduction(building as Building, deltaTime);
        }
    }

    /**
     * 更新单个建筑的生产
     */
    private _updateBuildingProduction(building: Building, deltaTime: number): void {
        const producedUnitIds = building.updateProduction(deltaTime);
        
        // 为每个生产的单位创建新的 Unit 实例
        for (const unitId of producedUnitIds) {
            this._spawnUnit(building, unitId);
        }
    }

    /**
     * 在建筑位置生成单位
     */
    private _spawnUnit(building: Building, unitId: number | string): void {
        const unitIdNum = typeof unitId === 'string' ? parseInt(unitId, 10) : unitId;
        const unitConfig = getUnitConfig(unitIdNum);
        
        if (!unitConfig) {
            console.warn(`Unit config not found for unitId: ${unitId}`);
            return;
        }
        
        const modelConfig = getModelConfig(unitConfig.modelId);
        if (!modelConfig) {
            console.warn(`[ProductionSystem] Model config not found: ${unitConfig.modelId}`);
            return;
        }
        
        const buildingPos = building.getPosition();
        const unitPosition = new FixedVector3(buildingPos.x, 0, buildingPos.z);
        const unit = new Unit(
            `${building.campId}_unit_${unitId}_${Date.now()}_${Math.random()}`,
            unitConfig.modelId || 'default_unit_model',
            unitIdNum,
            building.campId,
            unitPosition
        );
        
        // 初始化单位（重要！设置 attackSkillId 和其他配置）
        unit.init(unitConfig, modelConfig);
        
        // 添加到游戏中
        this.game.addActor(unit);

        // 新生产单位默认设置为 Idle，确保可被状态过滤命令选中
        const statusSystem = this.game.getSystem<StatusSystem>('status');
        statusSystem?.setIdle(unit.actorNo);
    }

    fixedUpdate(fixedDeltaTime: number): void {
        // 系统无需固定帧更新
    }

    destroy(): void {
        // 系统清理（如需要）
    }
}
