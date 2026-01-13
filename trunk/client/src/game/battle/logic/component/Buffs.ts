import { Runtime } from "../../Runtime";
import { Unit } from "../actor/Unit";
import { BattleCalculator } from "./BattleCalculator";
import { Component } from "./Component";

export enum BuffType {
    Attr,        // 属性
    Heal,        // 治疗
    Dizzy,       // 眩晕
    Frozen,      // 冰冻
    Bleeding,    // 出血
    Burning,     // 燃烧
    Blinded,     // 致盲
    Entangled,   // 缠绕
    Silenced,    // 沉默
    Taunted      // 嘲讽
}

export abstract class Buff {
    id: number;
    type: BuffType;
    duration: number;
    interval: number;
    startTime: number;
    lastEffectTime: number;
    sourceUnit: Unit
    canRemove: boolean;
    config;
    constructor(config, sourceUnit: Unit) {
        this.id = config.Id;
        this.type = config.Type;
        this.config = config;
        this.duration = config.LifeTime? config.LifeTime : Number.MAX_VALUE;
        this.interval = config.interval? config.interval : Number.MAX_VALUE;
        this.canRemove = config.canRemove? Boolean(config.canRemove) : true;
        this.startTime = Runtime.game.currTime;
        this.lastEffectTime = this.startTime;
        this.sourceUnit = sourceUnit;
    }

    abstract applyEffect(owner: Unit): void;
    
    abstract onEnter(owner: Unit): void;
    
    abstract onExit(owner: Unit): void;

    isExpired(): boolean {
        return Runtime.game.currTime - this.startTime >= this.duration;
    }

    shouldApplyEffect(): boolean {
        const now = Runtime.game.currTime
        if (now - this.lastEffectTime >= this.interval) {
            this.lastEffectTime = now;
            return true;
        }
        return false;
    }

    
}

export class ChangeAttrBuff extends Buff {
    indexs: string[] = [];
    values: string[] = [];
    applyEffect(owner: Unit): void {
    }

    onEnter(owner: Unit): void {
        
        this.indexs = String(this.config.Param1).split("|");
        this.values = String(this.config.Param2).split("|");

        // 检查索引数组和值数组长度是否相等
        if (this.indexs.length === this.values.length && this.indexs.length > 0) {
            for (let i = 0; i < this.indexs.length; i++) {
                let index = Number(this.indexs[i]);
                let valueToAdd = Number(this.values[i]);

                // 更新属性值
                let currentValue = owner.attrs.getSecondaryAttribute(index);
                owner.attrs.setSecondaryAttribute(index, currentValue + valueToAdd);
            }

            // 应用效果
            this.applyEffect(owner);
        }
    }

    onExit(owner: Unit): void {
        for (let i = 0; i < this.indexs.length; i++) {
            let index = Number(this.indexs[i]);
            let valueToAdd = Number(this.values[i]);

            // 回退之前增加的属性值
            let currentValue = owner.attrs.getSecondaryAttribute(index);
            let newValue = currentValue - valueToAdd; // 减去之前增加的值

            // 更新属性值
            owner.attrs.setSecondaryAttribute(index, newValue);
        }
    }
}

export class HealBuff extends Buff {
    value: number; // 回复数值
    applyEffect(owner: Unit): void {
        BattleCalculator.BuffCalculate(this.sourceUnit, owner, this.value);
    }

    onEnter(owner: Unit): void {
        this.interval = Number(this.config.Param4);
        let strs = String(this.config.Param3).split("|");
        if(strs[0] === "1")
            this.value = Number(strs[1]);
        else
        {
            let target = this.config.Param1 === "1" ? this.sourceUnit : owner;
            let index = Number(this.config.Param2);
            let value = target.attrs.getSecondaryAttribute(index);
            this.value = value * Number(strs[1]);
        }
        this.value = Math.ceil(this.value);
        this.applyEffect(owner);
        owner.unitStatus.addHealed();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeHealed();
    }
}

export class DizzyBuff extends Buff {
    applyEffect(owner: Unit): void {
    }

    onEnter(owner: Unit): void {
        owner.unitStatus.addDizzy();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeDizzy();
    }
}

export class FrozenBuff extends Buff {
    applyEffect(owner: Unit): void {
    }

    onEnter(owner: Unit): void {
        owner.unitStatus.addFrozen();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeFrozen();
    }
}

export class BleedingBuff extends Buff {
    value: number; // 扣血数值
    applyEffect(owner: Unit): void {
        BattleCalculator.BuffCalculate(this.sourceUnit, owner, -this.value);
    }

    onEnter(owner: Unit): void {
        this.interval = Number(this.config.Param4);
        let strs = String(this.config.Param3).split("|");
        if(strs[0] === "1")
            this.value = Number(strs[1]);
        else
        {
            let target = this.config.Param1 === "1" ? this.sourceUnit : owner;
            let index = Number(this.config.Param2);
            let value = target.attrs.getSecondaryAttribute(index);
            this.value = value * Number(strs[1]);
        }
        this.value = Math.ceil(this.value);
        this.applyEffect(owner);
        owner.unitStatus.addBleeding();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeBleeding();
    }
}

export class BurningBuff extends Buff {
    value: number; // 扣血数值
    applyEffect(owner: Unit): void {
        BattleCalculator.BuffCalculate(this.sourceUnit, owner, -this.value);
    }

    onEnter(owner: Unit): void {
        this.interval = Number(this.config.Param4);
        let strs = String(this.config.Param3).split("|");
        if(strs[0] === "1")
            this.value = Number(strs[1]);
        else
        {
            let target = this.config.Param1 === "1" ? this.sourceUnit : owner;
            let index = Number(this.config.Param2);
            let value = target.attrs.getSecondaryAttribute(index);
            this.value = value * Number(strs[1]);
        }
        this.value = Math.ceil(this.value);
        this.applyEffect(owner);
        owner.unitStatus.addBurning();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeBurning();
    }
}

export class BlindedBuff extends Buff {
    applyEffect(owner: Unit): void {
    }

    onEnter(owner: Unit): void {
        owner.unitStatus.addBlinded();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeBlinded();
    }
}

export class EntangledBuff extends Buff {
    applyEffect(owner: Unit): void {
    }

    onEnter(owner: Unit): void {
        owner.unitStatus.addEntangled();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeEntangled();
    }
}

export class SilencedBuff extends Buff {
    applyEffect(owner: Unit): void {
    }

    onEnter(owner: Unit): void {
        owner.unitStatus.addSilenced();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeSilenced();
    }
}

export class TauntedBuff extends Buff {
    applyEffect(owner: Unit): void {
    }

    onEnter(owner: Unit): void {
        owner.unitStatus.addTaunted();
    }

    onExit(owner: Unit): void {
        owner.unitStatus.removeTaunted();
    }

    private tauntSource: Unit;
    
    setTauntSource(source: Unit) {
        this.tauntSource = source;
    }
}

// 其他Buff类也类似实现...

export class Buffs extends Component {
    declare owner: Unit;
    buffs: Buff[] = [];

    // 统一的外部回调
    OnPlayEffect?: (res: string) => void;
    OnRemoveEffect?: (res: string) => void;

    constructor(owner: Unit) {
        super();
        this.owner = owner;
    }

    createBuff(config, sourceUnit: Unit): Buff {
        let nowCount = this.owner.buffs.getBuffCountById(config.Id)
        if(nowCount >= config.MaxCount)
            this.owner.buffs.removeBuff(config.Id)

        let buff: Buff;
        switch (config.Type) {
            case BuffType.Attr:
                buff = new ChangeAttrBuff(config, sourceUnit);
                break;
            case BuffType.Heal:
                buff = new HealBuff(config, sourceUnit);
                break;
            case BuffType.Dizzy:
                buff = new DizzyBuff(config, sourceUnit);
                break;
            case BuffType.Frozen:
                buff = new FrozenBuff(config, sourceUnit);
                break;
            case BuffType.Bleeding:
                buff = new BleedingBuff(config, sourceUnit);
                break;
            case BuffType.Burning:
                buff = new BurningBuff(config, sourceUnit);
                break;
            case BuffType.Blinded:
                buff = new BlindedBuff(config, sourceUnit);
                break;
            case BuffType.Entangled:
                buff = new EntangledBuff(config, sourceUnit);
                break;
            case BuffType.Silenced:
                buff = new SilencedBuff(config, sourceUnit);
                break;
            case BuffType.Taunted:
                // 嘲讽buff只允许存在一个
                const expiredBuffs = this.buffs.filter(buff => buff.type === BuffType.Taunted);
                expiredBuffs.forEach(buff => this.removeBuff(buff.id));

                buff = new TauntedBuff(config, sourceUnit);
                (buff as TauntedBuff).setTauntSource(sourceUnit);
                break;
            default:
                throw new Error("Unknown buff type");
        }
        
        this.addBuff(buff);

        return buff;
    }

    addBuff(buff: Buff): void {
        this.buffs.push(buff);
        buff.onEnter(this.owner);
        if(buff.config.Effect)
            this.OnPlayEffect?.(buff.config.Effect);
    }

    removeBuff(id: number): void {
        const buffIndex = this.buffs.findIndex(buff => buff.id === id);
        if (buffIndex !== -1) {
            const buff = this.buffs[buffIndex];
            buff.onExit(this.owner);
            if(buff.config.Effect)
                this.OnRemoveEffect?.(buff.config.Effect);
            this.buffs.splice(buffIndex, 1);
        }
    }

    LogicUpdate(): void {
        const expiredBuffs = this.buffs.filter(buff => buff.isExpired());
        expiredBuffs.forEach(buff => this.removeBuff(buff.id));

        for (const buff of this.buffs) {
            if (buff.shouldApplyEffect()) {
                buff.applyEffect(this.owner);
            }
        }
    }

    hasBuff(buffType: typeof Buff): boolean {
        return this.buffs.some(buff => buff instanceof buffType);
    }

    getBuffCountById(buffId: number): number {
        return this.buffs.filter(buff => buff.id === buffId).length;
    }
}
