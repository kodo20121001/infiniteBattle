/**
 * 建筑实现
 * 继承 Actor 实现游戏建筑逻辑
 */

import { Actor, ActorType } from './Actor';
import { FixedVector3 } from '../base/fixed/FixedVector3';

/**
 * 建筑实现
 */
export class Building extends Actor {
    readonly buildingId: number;
    private _constructionProgress: number = 100; // 建造进度 0-100
    private _turretAttackConfig: {
        range: number;
        attackSpeed: number;
        targetAir: boolean;
        targetGround: boolean;
    } | null = null;
    
    // 生产队列相关
    private _productionQueue: Array<{
        unitId: number | string;
        productionTime: number;
        quantity: number;
        currentCount: number;  // 已生产数量
        elapsedTime: number;   // 已经过时间
    }> = [];
    private _currentQueueIndex: number = 0;

    constructor(
        id: string,
        modelId: string,
        buildingId: number,
        campId: number,
        position?: FixedVector3
    ) {
        super(id, ActorType.Building, modelId, campId, position);
        this.buildingId = buildingId;
    }

    /**
     * 初始化生产队列
     */
    initProductionQueue(queue: Array<{ unitId: number | string; productionTime: number; quantity: number }>): void {
        this._productionQueue = queue.map(item => ({
            ...item,
            currentCount: 0,
            elapsedTime: 0
        }));
        this._currentQueueIndex = 0;
    }

    /**
     * 初始化炮塔攻击配置
     */
    setTurretAttackConfig(config: {
        range?: number;
        attackSpeed?: number;
        targetAir?: boolean;
        targetGround?: boolean;
    }): void {
        this._turretAttackConfig = {
            range: Number(config.range ?? 0),
            attackSpeed: Number(config.attackSpeed ?? 0),
            targetAir: Boolean(config.targetAir),
            targetGround: config.targetGround !== false
        };
    }

    /**
     * 获取炮塔攻击配置
     */
    getTurretAttackConfig(): {
        range: number;
        attackSpeed: number;
        targetAir: boolean;
        targetGround: boolean;
    } | null {
        return this._turretAttackConfig;
    }

    /**
     * 获取当前生产队列
     */
    getProductionQueue() {
        return this._productionQueue;
    }

    /**
     * 获取当前生产项
     */
    getCurrentProductionItem() {
        if (this._currentQueueIndex >= this._productionQueue.length) {
            return null;
        }
        return this._productionQueue[this._currentQueueIndex];
    }

    /**
     * 更新生产进度
     */
    updateProduction(deltaTime: number): Array<number | string> {
        const producedUnitIds: Array<number | string> = [];
        
        if (this._currentQueueIndex >= this._productionQueue.length) {
            return producedUnitIds;
        }

        const currentItem = this._productionQueue[this._currentQueueIndex];
        currentItem.elapsedTime += deltaTime;
        console.log('[Building] updateProduction:', { buildingId: this.buildingId, deltaTime, elapsedTime: currentItem.elapsedTime, productionTime: currentItem.productionTime, currentCount: currentItem.currentCount, quantity: currentItem.quantity });

        // 检查是否完成一个单位
        while (currentItem.elapsedTime >= currentItem.productionTime && currentItem.currentCount < currentItem.quantity) {
            currentItem.elapsedTime -= currentItem.productionTime;
            currentItem.currentCount++;
            producedUnitIds.push(currentItem.unitId);
            console.log('[Building] unitProduced:', { buildingId: this.buildingId, unitId: currentItem.unitId, currentCount: currentItem.currentCount });

            // 如果该队列项完成，移到下一个
            if (currentItem.currentCount >= currentItem.quantity) {
                this._currentQueueIndex++;
                if (this._currentQueueIndex >= this._productionQueue.length) {
                    // 所有队列项都完成了
                    break;
                }
            }
        }

        return producedUnitIds;
    }

    /**
     * 是否有生产队列在进行中
     */
    hasActiveProduction(): boolean {
        return this._currentQueueIndex < this._productionQueue.length;
    }

    /**
     * 设置建造进度
     */
    setConstructionProgress(progress: number): void {
        this._constructionProgress = Math.max(0, Math.min(100, progress));
    }

    /**
     * 获取建造进度
     */
    getConstructionProgress(): number {
        return this._constructionProgress;
    }

    /**
     * 是否建造完成
     */
    isConstructionComplete(): boolean {
        return this._constructionProgress >= 100;
    }
}
