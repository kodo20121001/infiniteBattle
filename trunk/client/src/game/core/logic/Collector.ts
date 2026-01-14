import { Unit, UnitType } from './actor/Unit';
import { SecondaryAttr } from './component/BattleAttributes';

export class Collector {

    battleType

    damageStats
    healStats

    unitBattleStats
    soldierStats;

    unitCampInitStats

    constructor() {
        this.damageStats = {};
        this.healStats = {};
        this.unitBattleStats = {};
        this.unitCampInitStats = []
        this.soldierStats = {};
    }

    onHurt(unit, hurtInfo) {

        const camp = unit.camp;
        const soldierType = unit.createContext.soldierType;
        const hurtValue = hurtInfo.hurtValue;
        const attacker = hurtInfo.attacker;
        const realValue = hurtInfo.realValue;

        if (!this.damageStats[camp]) {
            this.damageStats[camp] = {};
        }

        if(soldierType)
        {
            if (this.damageStats[camp][soldierType]) {
                this.damageStats[camp][soldierType] += hurtValue;
            } else {
                this.damageStats[camp][soldierType] = hurtValue;
            }
        }


        if (this.unitBattleStats[attacker.camp][attacker.group]) {
            this.unitBattleStats[attacker.camp][attacker.group].damage += hurtValue;
            this.unitBattleStats[attacker.camp][attacker.group].damageRealValue += realValue;
        } 

        if (this.unitBattleStats[unit.camp][unit.group]) {
            this.unitBattleStats[unit.camp][unit.group].defense += hurtValue;
        }

    }

    onHeal(unit, healInfo) {
        const camp = unit.camp;
        const soldierType = unit.createContext.soldierType;
        const healValue = healInfo.healValue;
        const realValue = healInfo.realValue;

        if (!this.healStats[camp]) {
            this.healStats[camp] = {};
        }

        if(soldierType)
        {
            if (this.healStats[camp][soldierType]) {
                this.healStats[camp][soldierType] += healValue;
            } else {
                this.healStats[camp][soldierType] = healValue;
            }
        }

        if (this.unitBattleStats[unit.camp][unit.group]) {
            this.unitBattleStats[unit.camp][unit.group].heal += healValue;
            this.unitBattleStats[unit.camp][unit.group].healRealValue += realValue;
        }

    }

    getDamageStats() {
        return this.damageStats;
    }

    getHealStats() {
        return this.healStats;
    }

    PushUnit(unit: Unit)
    {
        if (!this.unitBattleStats[unit.camp]) {
            this.unitBattleStats[unit.camp] = {};
        }
        
        if (!this.unitCampInitStats[unit.camp]) {
            this.unitCampInitStats[unit.camp] = {};
        }

        if(!this.unitCampInitStats[unit.camp]["totalHp"])
            this.unitCampInitStats[unit.camp]["totalHp"] = unit.hp;
        else 
            this.unitCampInitStats[unit.camp]["totalHp"] += unit.hp;

        if (!this.unitBattleStats[unit.camp][unit.group]) {
            this.unitBattleStats[unit.camp][unit.group] = {type: unit.createContext.unitType, damage: 0, heal: 0, defense: 0, damageRealValue: 0};
        }

    }

    private PushSoldier(camp, soldierInfo, initHp){
        if (!this.soldierStats[camp]) {
            this.soldierStats[camp] = {};
        }
        
        if (!this.soldierStats[camp][soldierInfo.soldier_type]) {
            this.soldierStats[camp][soldierInfo.soldier_type] = {}
        }
        
        if (!this.soldierStats[camp][soldierInfo.soldier_type][soldierInfo.quality]) {
            this.soldierStats[camp][soldierInfo.soldier_type][soldierInfo.quality] = {id: 0, count : 0, hp : 0};
        }
        
        this.soldierStats[camp][soldierInfo.soldier_type][soldierInfo.quality].id = soldierInfo.id;
        this.soldierStats[camp][soldierInfo.soldier_type][soldierInfo.quality].count += soldierInfo.count;
        this.soldierStats[camp][soldierInfo.soldier_type][soldierInfo.quality].hp = initHp;
    }


    InitSoldierStats(soldiers, camp)
    {
        if(soldiers === undefined || soldiers.length === 0)
            return null;

        soldiers.sort((a, b) => b.quality - a.quality);
        const soldier = soldiers[0];

        // 使用 reduce 方法计算 AttackPct 和 HPMax 的总和
        const totals = soldiers.reduce((sum, soldier) => {
            // 获取每个属性的值，如果属性不存在则使用默认值 0
            const attackPct = soldier.battle_attributes.values[SecondaryAttr.AttackVal] || 0;
            const hpMax = soldier.battle_attributes.values[SecondaryAttr.HPMax] || 0;

            // 计算当前士兵的 AttackPct 和 HPMax 乘以 count 的总和
            const soldierAttackPctTotal = attackPct * soldier.count;
            const soldierHPMaxTotal = hpMax * soldier.count;

            this.PushSoldier(camp, soldier, soldierHPMaxTotal)

            // 累加到总和中
            return {
                totalAttackPct: sum.totalAttackPct + soldierAttackPctTotal,
                totalHPMax: sum.totalHPMax + soldierHPMaxTotal
            };
        }, { totalAttackPct: 0, totalHPMax: 0 }); // 初始化总和对象
        
        soldier.battle_attributes.values[SecondaryAttr.AttackVal] = totals.totalAttackPct;
        soldier.battle_attributes.values[SecondaryAttr.HPMax] = totals.totalHPMax;

        return soldier;
    }



    settlement()
    {
        const result = {
            unitBattleStats: { ...this.unitBattleStats },
        };

        return result;
    }
}