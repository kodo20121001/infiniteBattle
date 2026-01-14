import { Unit } from "../actor/Unit";
import { BuffType } from "./Buffs";
import { Component } from "./Component";

export class UnitStatus extends Component {
    declare owner: Unit

    healedCount = 0;
    dizzyCount = 0;
    frozenCount = 0;
    bleedingCount = 0;
    burningCount = 0;
    blindedCount = 0;
    entangledCount = 0;
    silencedCount = 0;
    tauntedCount = 0;

    // 统一的外部回调
    onStatusApply?: (buffType: BuffType) => void;
    onStatusRemove?: (buffType: BuffType) => void;

    nowStatus = 0;
    nowStatusApply = 0;

    LogicUpdate()
    {
        if(this.owner.isDie || this.owner.isDestory) return;

        this.nowStatus = this.owner.isFrozen? BuffType.Frozen :
                            this.owner.isDizzy? BuffType.Dizzy :
                            this.owner.isTaunted? BuffType.Taunted :
                            this.owner.isEntangled? BuffType.Entangled :
                            this.owner.isBleeding? BuffType.Bleeding :
                            this.owner.isBurning? BuffType.Burning :
                            this.owner.isBlinded? BuffType.Blinded : 
                            this.owner.isSilenced? BuffType.Silenced : 0;
        if(this.nowStatus != this.nowStatusApply)
        {
            if(this.nowStatus > 0)
            {
                if (this.onStatusApply) 
                    this.onStatusApply(this.nowStatus);
            }
            else 
            {
                if (this.onStatusRemove) 
                    this.onStatusRemove(this.nowStatusApply);
            }

            this.nowStatusApply = this.nowStatus;
        }
    }

    // 治疗
    private onEnterHealed() {
        this.owner.isHealed = true;
    }
    private onExitHealed() {
        this.owner.isHealed = false;
        
    }
    addHealed() {
        if (this.healedCount === 0) {
            this.onEnterHealed();
        }
        this.healedCount++;
    }
    removeHealed() {
        if (this.healedCount > 0) {
            this.healedCount--;
            if (this.healedCount === 0) {
                this.onExitHealed();
            }
        }
    }

    // 眩晕
    private onEnterDizzy() {
        this.owner.isDizzy = true;
        this.owner.isIdle = false;
        this.owner.unitBehavior.OverWalk();
        this.owner.unitBehavior.OverCast();
    }
    private onExitDizzy() {
        this.owner.isDizzy = false;
    }
    addDizzy() {
        if (this.dizzyCount === 0) {
            this.onEnterDizzy();
        }
        this.dizzyCount++;
    }
    removeDizzy() {
        if (this.dizzyCount > 0) {
            this.dizzyCount--;
            if (this.dizzyCount === 0) {
                this.onExitDizzy();
            }
        }
    }

    // 冰冻
    private onEnterFrozen() {
        this.owner.isFrozen = true;
        this.owner.isIdle = false;
        this.owner.unitBehavior.OverWalk();
        this.owner.unitBehavior.OverCast();
    }
    private onExitFrozen() {
        this.owner.isFrozen = false;
    }
    addFrozen() {
        if (this.frozenCount === 0) {
            this.onEnterFrozen();
        }
        this.frozenCount++;
    }
    removeFrozen() {
        if (this.frozenCount > 0) {
            this.frozenCount--;
            if (this.frozenCount === 0) {
                this.onExitFrozen();
            }
        }
    }

    // 流血
    private onEnterBleeding() {
        this.owner.isBleeding = true;
    }
    private onExitBleeding() {
        this.owner.isBleeding = false;
    }
    addBleeding() {
        if (this.bleedingCount === 0) {
            this.onEnterBleeding();
        }
        this.bleedingCount++;
    }
    removeBleeding() {
        if (this.bleedingCount > 0) {
            this.bleedingCount--;
            if (this.bleedingCount === 0) {
                this.onExitBleeding();
            }
        }
    }

    // 灼烧
    private onEnterBurning() {
        this.owner.isBurning = true;
    }
    private onExitBurning() {
        this.owner.isBurning = false;
    }
    addBurning() {
        if (this.burningCount === 0) {
            this.onEnterBurning();
        }
        this.burningCount++;
    }
    removeBurning() {
        if (this.burningCount > 0) {
            this.burningCount--;
            if (this.burningCount === 0) {
                this.onExitBurning();
            }
        }
    }

    // 致盲
    private onEnterBlinded() {
        this.owner.isBlinded = true;
    }
    private onExitBlinded() {
        this.owner.isBlinded = false;
    }
    addBlinded() {
        if (this.blindedCount === 0) {
            this.onEnterBlinded();
        }
        this.blindedCount++;
    }
    removeBlinded() {
        if (this.blindedCount > 0) {
            this.blindedCount--;
            if (this.blindedCount === 0) {
                this.onExitBlinded();
            }
        }
    }

    // 缠绕
    private onEnterEntangled() {
        this.owner.isEntangled = true;
    }
    private onExitEntangled() {
        this.owner.isEntangled = false;
    }
    addEntangled() {
        if (this.entangledCount === 0) {
            this.onEnterEntangled();
        }
        this.entangledCount++;
    }
    removeEntangled() {
        if (this.entangledCount > 0) {
            this.entangledCount--;
            if (this.entangledCount === 0) {
                this.onExitEntangled();
            }
        }
    }

    // 沉默
    private onExitSilenced() {
        this.owner.isSilenced = false;
    }

    private onEnterSilenced() {
        this.owner.isSilenced = true;
    }

    addSilenced() {
        if (this.silencedCount === 0) {
            this.onEnterSilenced();
        }
        this.silencedCount++;
    }
    removeSilenced() {
        if (this.silencedCount > 0) {
            this.silencedCount--;
            if (this.silencedCount === 0) {
                this.onExitSilenced();
            }
        }
    }

    // 嘲讽
    private onEnterTaunted() {
        this.owner.isTaunted = true;
        this.owner.unitBehavior.OverCast();
    }
    private onExitTaunted() {
        this.owner.isTaunted = false;
    }
    addTaunted() {
        if (this.tauntedCount === 0) {
            this.onEnterTaunted();
        }
        this.tauntedCount++;
    }
    removeTaunted() {
        if (this.tauntedCount > 0) {
            this.tauntedCount--;
            if (this.tauntedCount === 0) {
                this.onExitTaunted();
            }
        }
    }
}