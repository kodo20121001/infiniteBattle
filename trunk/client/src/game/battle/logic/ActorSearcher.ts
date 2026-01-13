import FixedMaths from "../base/fixed/FixedMaths";
import { ActorType, Relation } from "../Def";
import { Runtime } from "../Runtime";

//技能目标类型
//0-范围内所有敌人
//1.单位本身
//2.范围内最近敌人
//3.范围内最远敌人
//4.范围内随机敌人
//5.血量最低敌人
//6.血量最高敌人
//7.血量最低友军
//8.攻击力最高友军
//9.范围内友军
export class ActorSearcher {

    static SearchByUnit(actor, camp, searchType, targetUnit) {
        return this.SearchUnits(actor, camp, searchType, [targetUnit]);
    }

    static SearchByGrids(actor, camp, searchType, grids) {
        let units = Runtime.gameGrids.QueryObjectsAtPosition(actor.pos, grids);
        return this.SearchUnits(actor, camp, searchType, units);
    }

    static SearchByRadius(actor, camp, searchType, radius) {
        let heroUnits = Object.keys(Runtime.gameLogic.actorsByType[ActorType.hero]).map(key => Runtime.gameLogic.actorsByType[ActorType.hero][key]);
        let soldierUnits = Object.keys(Runtime.gameLogic.actorsByType[ActorType.soldier]).map(key => Runtime.gameLogic.actorsByType[ActorType.soldier][key]);
        let buildingUnits = Object.keys(Runtime.gameLogic.actorsByType[ActorType.building]).map(key => Runtime.gameLogic.actorsByType[ActorType.building][key]);
        let units = [...heroUnits, ...soldierUnits, ...buildingUnits];
    
        let unitsInRange = [];
        for (let i = 0; i < units.length; ++i) {
            if (!units[i].isInvincible && units[i].pos.distanceTo(actor.pos) <= radius) {
                unitsInRange.push(units[i]);
            }
        }
        return this.SearchUnits(actor, camp, searchType, unitsInRange);
    }

    static SearchUnits(actor, camp, searchType, units) {
        switch (searchType) {
            case 0:
                return this.SearchAllEnemiesInRange(actor, camp, units);
            case 1:
                return [actor];
            case 2:
                return this.SearchNearestTarget(actor, camp, units);
            case 3:
                return this.SearchFarthestTarget(actor, camp, units);
            case 4:
                return this.SearchRandomTarget(actor, camp, units);
            case 5:
                return this.SearchLowestHpTarget(actor, camp, units);
            case 6:
                return this.SearchHighestHpTarget(actor, camp, units);
            case 7:
                return this.SearchLowestHpFriend(actor, camp, units);
            case 8:
                return this.SearchHighestAttackFriend(actor, camp, units);
            case 9:
                return this.SearchAlliesInRange(actor, camp, units);
            default:
                return null;
        }
    }

    static SearchAllEnemiesInRange(actor, camp, units) {
        let targets = [];
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp === camp)
                continue;
            targets.push(units[i]);
        }
        return targets;
    }

    static SearchNearestTarget(actor, camp, units) {
        let nearestUnit = null;
        let minDis = Infinity;
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp === camp)
                continue;
            let dis = units[i].pos.distanceTo(actor.pos);
            if (dis < minDis) {
                minDis = dis;
                nearestUnit = units[i];
            }
        }

        return nearestUnit ? [nearestUnit] : [];
    }

    static SearchFarthestTarget(actor, camp, units) {
        let farthestUnit = null;
        let maxDis = 0;
    
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp === camp)
                continue;
            let dis = units[i].pos.distanceTo(actor.pos);
            if (dis > maxDis) {
                maxDis = dis;
                farthestUnit = units[i];
            }
        }
    
        return farthestUnit ? [farthestUnit] : [];
    }
    
    static SearchRandomTarget(actor, camp, units) {
        let targets = [];
    
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp === camp)
                continue;
            targets.push(units[i]);
        }
    
        if (targets.length > 0) {
            let randomIndex = Math.floor(FixedMaths.random() * targets.length);
            return [targets[randomIndex]];
        }
        return [];
    }
    
    static SearchLowestHpTarget(actor, camp, units) {
        let lowestHpUnit = null;
        let minHp = Infinity;
    
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp === camp)
                continue;
            if (units[i].hp < minHp) {
                minHp = units[i].hp;
                lowestHpUnit = units[i];
            }
        }
    
        return lowestHpUnit ? [lowestHpUnit] : [];
    }
    
    static SearchHighestHpTarget(actor, camp, units) {
        let highestHpUnit = null;
        let maxHp = 0;
    
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp === camp)
                continue;
            if (units[i].hp > maxHp) {
                maxHp = units[i].hp;
                highestHpUnit = units[i];
            }
        }
    
        return highestHpUnit ? [highestHpUnit] : [];
    }
    
    static SearchLowestHpFriend(actor, camp, units) {
        let lowestHpUnit = null;
        let minHp = Infinity;
    
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp !== camp)
                continue;
            if (units[i].hp < minHp) {
                minHp = units[i].hp;
                lowestHpUnit = units[i];
            }
        }
    
        return lowestHpUnit ? [lowestHpUnit] : [];
    }
    
    static SearchHighestAttackFriend(actor, camp, units) {
        let highestAttackUnit = null;
        let maxAttack = 0;
    
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp !== camp)
                continue;
            if (units[i].attack > maxAttack) {
                maxAttack = units[i].attack;
                highestAttackUnit = units[i];
            }
        }
    
        return highestAttackUnit ? [highestAttackUnit] : [];
    }
    
    static SearchAlliesInRange(actor, camp, units) {
        let targets = [];
    
        for (let i = 0; i < units.length; ++i) {
            if (units[i].isDie || units[i].camp !== camp)
                continue;
            targets.push(units[i]);
        }
    
        return targets;
    }
}