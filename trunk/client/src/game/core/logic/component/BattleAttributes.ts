import { Component } from "./Component";

export enum PrimaryAttr {
    HPMax,             // 最终最大生命力
    AttackVal,         // 最终攻击力
    AttackSpeed,       // 最终攻击速度
    GroundMoveSpeed,   // 最终移动速度
    SkillCD,           // 最终技能冷却时间
    CriticalPct,       // 最终暴击率
    CriticalDmgPct,    // 最终暴击伤害
    EvadeProb,         // 最终闪避率
    ShieldCoverMax,    // 最终护盾最大值
    DamageReduce,      // 最终伤害减免
    DamageIncrease,    // 最终伤害增幅
    Vampire,           // 最终吸血
    Block,             // 最终格挡
    StaminaPct,        // 生命每秒恢复
    HitResumeVal,      // 击中生命恢复
    KillResumeVal,     // 击杀生命恢复
    TreatUp,           // 治疗加成
    Max
}

export enum SecondaryAttr {
    None,
    HPMax,             // 最大生命力,生命力上限,生命力为0时,角色死亡
    HPMaxPct,          // 生命力百分比,对生命力上限百分比进行乘法的计算,最终生命力=最大生命力(1+生命力百分比加成)
    HPCur,             // 当前生命力,角色当前状态下的生命力
    AttackVal,         // 攻击力,角色的基础攻击力数值
    AttackPct,         // 攻击力百分比,对基础攻击力进行百分比乘法加成的属性,最终攻击力=攻击力*(1+攻击力百分比加成)
    AttackSpeed,       // 攻速,基础攻击速度,100=30帧每秒(默认设定帧数),攻击速度提升提高每秒播放帧数
    AttackSpeedPct,    // 攻速提升百分比,最终速度=基础攻击速度*(1+攻速提升百分比)
    StaminaPct,        // 生命每秒恢复,生命每秒自动恢复的值
    GroundMoveSpeed,   // 移动速度,基础移动速度
    GroundMoveSpeedPct,// 移动速度百分比,对基础移动速度进行乘法加成的计算,最终移动速度=基础移动速度*(1+移动速度百分比加成)
    SkillCD,           // 技能冷却,直接影响技能cd时间
    SkillCDPct,        // 技能冷却缩减,冷却时间百分比缩减,最终技能冷却时间=技能冷却时间*(1-技能冷却时间百分比)
    CriticalPct,       // 暴击率,本次伤害是否造成暴击的概率,先通过暴击概率判断此次伤害是否造成暴击
    CriticalIncrPct,   // 暴击率百分比,对暴击率进行百分比乘法计算,最终暴击率=暴击率*(1*暴击率百分比加成)
    CriticalDmgPct,    // 暴击伤害,额外增加的暴击伤害系数,最终暴击伤害系数=基础暴击伤害系数固定150%+暴击伤害
    EvadeProb,         // 闪避率,受到攻击时触发闪避免疫伤害的概率,通过闪避率判断此次伤害是否生效
    ShieldCoverMax,    // 护盾最大值,护盾值用以抵消受到的伤害值,先于生命力扣减
    ShieldCoverCur,    // 护盾当前值,护盾值用以抵消受到的伤害值,当前剩余的护盾值,剩余护盾值不足以扣减伤害时,多出的伤害部分用生命力扣减
    HitResumeVal,      // 击中生命恢复,命中目标时恢复特定数值的生命值,每次命中时结算
    KillResumeVal,     // 击杀生命恢复,击杀目标时恢复特点数值的生命值,每次击杀目标时结算,同时击杀多个目标时一起结算
    DamageReduce,      // 伤害减免,最终伤害减免= 伤害减免+伤害减免...
    DamageIncrease,    // 伤害增幅,最终伤害增幅 = 伤害增幅+伤害增幅....
    Vampire,           // 吸血,通过乘以造成的最终伤害获得恢复生命的值,吸血*实际最终伤害值=恢复生命值
    Block,             // 格挡,受到攻击时触发格挡减免50%伤害的概率,通过格挡率判断此次伤害是否触发格挡
    HitMeat,           // 对肉盾英雄造成伤害时，最终伤害=普通伤害*（1+克制肉盾系数）
    BehitMeat,         // 被肉盾英雄攻击时，最终伤害=普通伤害*（1+克制肉盾系数）
    HitWarrior,        // 对战士英雄造成伤害时，最终伤害=普通伤害*（1+克制战士系数）
    BehitWarrior,      // 被战士英雄攻击时，最终伤害=普通伤害*（1+克制战士系数）
    HitShooter,        // 对射手英雄造成伤害时，最终伤害=普通伤害*（1+克制射手系数）
    BehitShooter,      // 被射手英雄攻击时，最终伤害=普通伤害*（1+克制射手系数）
    HitAssist,         // 对辅助英雄造成伤害时，最终伤害=普通伤害*（1+克制辅助系数）
    BehitAssist,       // 被辅助英雄攻击时，最终伤害=普通伤害*（1+克制辅助系数）
    TreatUp,           // 受到治疗效果提升对应百分比，最终受治疗恢复值=恢复值*（1+自身受治疗加成）
    Max
}

export enum BattleAttrScale {
    AttackScale = SecondaryAttr.AttackVal, //攻击加成
    HPScale = SecondaryAttr.HPMax,         //生命加成
}

export class BattleAttributes extends Component{

    primaryValues: number[]
    secondaryValues: number[]
    battlePower: number

    private onChangeCallbacks: (() => void)[]

    constructor() {
        super();
        this.secondaryValues = new Array(SecondaryAttr.Max).fill(0);
        this.primaryValues = new Array(PrimaryAttr.Max).fill(0);
        this.battlePower = 0;
        this.initializeOnChangeCallbacks();
    }

    StartLogic()
    {
        // 获取 owner 的 createContext 中的 attrs 属性
        const attrs = this.owner.createContext.attrs;
        if (attrs && attrs.values) {
            this.secondaryValues = [...attrs.values];
        }
        //this.secondaryValues[SecondaryAttr.HPCur] = this.secondaryValues[SecondaryAttr.HPMax]
        this.updateAllPrimaryAttributes();
    }

    InitCurHP()
    {
        this.setSecondaryAttribute(SecondaryAttr.HPCur, this.getPrimaryAttribute(PrimaryAttr.HPMax))
    }

    getPrimaryAttribute(attr: PrimaryAttr): number {
        return this.primaryValues[attr] || 0;
    }

    getSecondaryAttribute(attr: SecondaryAttr): number {
        if (attr >= 0 && attr < this.secondaryValues.length) {
            return this.secondaryValues[attr];
        }
        return 0;
    }

    setSecondaryAttribute(attr: SecondaryAttr, value: number): void {
        if (attr >= 0 && attr < this.secondaryValues.length) {
            this.secondaryValues[attr] = value;
            this.onChangeCallbacks[attr]();
        }
    }
    
    clone()
    {
        return {battlePower: 0, values: this.secondaryValues.slice()}
    }

    private initializeOnChangeCallbacks() {
        this.onChangeCallbacks = new Array(SecondaryAttr.Max);
        
        // Initialize default callbacks (do nothing)
        for (let i = 0; i < SecondaryAttr.Max; i++) {
            this.onChangeCallbacks[i] = () => {};
        }

        // Set specific callbacks for attributes that affect primary attributes
        this.onChangeCallbacks[SecondaryAttr.HPMax] = this.onHPMaxChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.HPMaxPct] = this.onHPMaxChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.AttackVal] = this.onAttackValChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.AttackPct] = this.onAttackValChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.AttackSpeed] = this.onAttackSpeedChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.AttackSpeedPct] = this.onAttackSpeedChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.GroundMoveSpeed] = this.onGroundMoveSpeedChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.GroundMoveSpeedPct] = this.onGroundMoveSpeedChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.SkillCD] = this.onSkillCDChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.SkillCDPct] = this.onSkillCDChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.CriticalPct] = this.onCriticalPctChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.CriticalIncrPct] = this.onCriticalPctChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.CriticalDmgPct] = this.onCriticalDmgPctChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.EvadeProb] = this.onEvadeProbChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.ShieldCoverMax] = this.onShieldCoverMaxChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.DamageReduce] = this.onDamageReduceChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.DamageIncrease] = this.onDamageIncreaseChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.Vampire] = this.onVampireChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.Block] = this.onBlockChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.StaminaPct] = this.onStaminaPctChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.HitResumeVal] = this.onHitResumeValChange.bind(this);
        this.onChangeCallbacks[SecondaryAttr.KillResumeVal] = this.onKillResumeValChange.bind(this);



        this.onChangeCallbacks[SecondaryAttr.TreatUp] = this.onTreatUpChange.bind(this);
        
    }

    private onHPMaxChange() {
        this.primaryValues[PrimaryAttr.HPMax] = 
            this.secondaryValues[SecondaryAttr.HPMax] * (1 + this.secondaryValues[SecondaryAttr.HPMaxPct]);
    }
    
    private onAttackValChange() {
        this.primaryValues[PrimaryAttr.AttackVal] = 
            this.secondaryValues[SecondaryAttr.AttackVal] * (1 + this.secondaryValues[SecondaryAttr.AttackPct]);
    }
    
    private onAttackSpeedChange() {
        this.primaryValues[PrimaryAttr.AttackSpeed] = 
            this.secondaryValues[SecondaryAttr.AttackSpeed] * (1 + this.secondaryValues[SecondaryAttr.AttackSpeedPct]);
    }
    
    private onGroundMoveSpeedChange() {
        this.primaryValues[PrimaryAttr.GroundMoveSpeed] = 
            this.secondaryValues[SecondaryAttr.GroundMoveSpeed] * (1 + this.secondaryValues[SecondaryAttr.GroundMoveSpeedPct]);
    }
    
    private onSkillCDChange() {
        this.primaryValues[PrimaryAttr.SkillCD] = 
            this.secondaryValues[SecondaryAttr.SkillCD] * (1 - this.secondaryValues[SecondaryAttr.SkillCDPct]);
    }
    
    private onCriticalPctChange() {
        this.primaryValues[PrimaryAttr.CriticalPct] = 
            this.secondaryValues[SecondaryAttr.CriticalPct] * (1 + this.secondaryValues[SecondaryAttr.CriticalIncrPct]);
    }
    
    private onCriticalDmgPctChange() {
        this.primaryValues[PrimaryAttr.CriticalDmgPct] = this.secondaryValues[SecondaryAttr.CriticalDmgPct];
    }
    
    private onEvadeProbChange() {
        this.primaryValues[PrimaryAttr.EvadeProb] = this.secondaryValues[SecondaryAttr.EvadeProb];
    }
    
    private onShieldCoverMaxChange() {
        this.primaryValues[PrimaryAttr.ShieldCoverMax] = this.secondaryValues[SecondaryAttr.ShieldCoverMax];
    }
    
    private onDamageReduceChange() {
        this.primaryValues[PrimaryAttr.DamageReduce] = this.secondaryValues[SecondaryAttr.DamageReduce];
    }
    
    private onDamageIncreaseChange() {
        this.primaryValues[PrimaryAttr.DamageIncrease] = this.secondaryValues[SecondaryAttr.DamageIncrease];
    }
    
    private onVampireChange() {
        this.primaryValues[PrimaryAttr.Vampire] = this.secondaryValues[SecondaryAttr.Vampire];
    }
    
    private onBlockChange() {
        this.primaryValues[PrimaryAttr.Block] = this.secondaryValues[SecondaryAttr.Block];
    }

    private onStaminaPctChange() {
        this.primaryValues[PrimaryAttr.StaminaPct] = this.secondaryValues[SecondaryAttr.StaminaPct];
    }
    
    private onHitResumeValChange() {
        this.primaryValues[PrimaryAttr.HitResumeVal] = this.secondaryValues[SecondaryAttr.HitResumeVal];
    }
    
    private onKillResumeValChange() {
        this.primaryValues[PrimaryAttr.KillResumeVal] = this.secondaryValues[SecondaryAttr.KillResumeVal];
    }

    private onTreatUpChange() {
        this.primaryValues[PrimaryAttr.TreatUp] = this.secondaryValues[SecondaryAttr.TreatUp];
    }


    private updateAllPrimaryAttributes() {
        for (let i = 0; i < SecondaryAttr.Max; i++) {
            if (this.onChangeCallbacks[i]) {
                this.onChangeCallbacks[i]();
            }
        }
    }
}
