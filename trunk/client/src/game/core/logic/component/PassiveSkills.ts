import { Runtime } from "../../Runtime";
import { Action } from "../Action";
import { Unit } from "../actor/Unit";
import { Skill } from "../Skill";
import { PrimaryAttr } from "./BattleAttributes";
import { Component } from "./Component";

export enum PassiveSkillTrigger {
    OnStartAddBuff = 1,        // 登场触发
    OnHPLoseAddBuff,       // 低血触发
    OnHitPointAddBuff,     // 命中触发
    // 其他触发条件...
}

export enum PassiveSkillType {
    CastSkill = 1,      // 施放技能
    AddBuff,            // 添加Buff
    ChangeAttr,         // 改变属性
    AddAttr,            // 添加属性
    TriggerSkill,       // 触发技能
}

export class PassiveSkill {
    id: number;
    trigger: PassiveSkillTrigger;
    sourceUnit: Unit;
    config;
    type: PassiveSkillType;
    isActivate: boolean;
    applyTime: number;

    constructor(config, sourceUnit: Unit) {
        this.id = config.PassiveID;
        this.trigger = config.Trigger;
        this.config = config;
        this.sourceUnit = sourceUnit;
        this.type = config.Type;
        this.isActivate = false;
        this.applyTime = 0;
        if(this.config == undefined || this.id == undefined)
        {
            console.error("Invalid skill ID provided: ", this.id);
        }
    }

    handleEvent(eventType: PassiveSkillTrigger, data: any, owner: Unit): void {

        if (!this.isActivate) return;

        if (eventType === this.trigger) {

            let isRemove = true;

            if(eventType == PassiveSkillTrigger.OnHPLoseAddBuff)
            {
                let value = Number(this.config.Param3)
                let type = Number(this.config.Param2)
                const percent = this.sourceUnit.hp / this.sourceUnit.attrs.getPrimaryAttribute(PrimaryAttr.HPMax);
                if (type === 1 && percent >= value || (type === 2 && percent <= value) || (type === 3 && percent > value) || (type === 4 && percent < value)) 
                    return;
                let tmp =  Number(this.config.Param4);
                isRemove = isNaN(tmp) || tmp != 1;

                let time = Number(this.config.Param5)
                if(!isRemove && (isNaN(time) || time <= Runtime.game.currTime - this.applyTime))
                    return;

            }

            this.applyTime = Runtime.game.currTime;
            if(isRemove)
                owner.passiveSkillsCom?.removeSkill(this.id);

            // 根据配置执行相应的效果
            switch (this.type) {
                case PassiveSkillType.CastSkill:
                    let skillId = Number(this.config.Param1)
                    if(skillId > 0)
                    {
                        let skill = this.sourceUnit.unitBehavior.skills.find(s => s.skillId == skillId);
                        if(skill)
                            this.sourceUnit.unitBehavior.SkillLocked(skill)
                    }
                    break;
                case PassiveSkillType.AddBuff:
                    let buffId = Number(this.config.Param1)
                    if(buffId > 0)
                    {
                        let buffConfig = Runtime.configs.Get("buff")[buffId]
                        if(buffConfig)
                            this.sourceUnit.buffs.createBuff(buffConfig, this.sourceUnit)
                    }
                    break;
                case PassiveSkillType.ChangeAttr:
                case PassiveSkillType.AddAttr:
                    let param1 = this.config.Param1;
                    let param2 = this.config.Param2;

                    let attrTypes = Array.isArray(param1) ? param1 : (typeof param1 === 'string' ? param1.split('|') : [param1]);
                    let attrValues = Array.isArray(param2) ? param2 : (typeof param2 === 'string' ? param2.split('|') : [param2]);

                    let validAttrTypes = attrTypes.map(Number).filter(n => n > 0);
                    let validAttrValues = attrValues.map(Number).filter(n => n > 0);

                    if (validAttrTypes.length === validAttrValues.length && validAttrTypes.every((n, i) => !isNaN(n) && !isNaN(validAttrValues[i]))) {
                        validAttrTypes.forEach((attrType, index) => {
                            if (attrType > 0 && validAttrValues[index] > 0) {
                                let value = this.sourceUnit.attrs.getSecondaryAttribute(attrType);
                                if (this.type === PassiveSkillType.AddAttr) {
                                    this.sourceUnit.attrs.setSecondaryAttribute(attrType, value + validAttrValues[index]);
                                }
                                else
                                    this.sourceUnit.attrs.setSecondaryAttribute(attrType, validAttrValues[index]);
                            }
                        });
                    }
                    break;
                case PassiveSkillType.TriggerSkill:
                    let triggerSkillId = Number(this.config.Param1)
                    if(triggerSkillId > 0)
                    {
                        const triggerSkillConfig = Runtime.configs.Get("skill")[triggerSkillId];
                        if (triggerSkillConfig) {
                            let blackboard = {}
                            // blackboard.Sound = Runtime.configs.GetSkillSound(triggerSkillId, 1)
                            let actionCfg = JSON.parse(JSON.stringify(Runtime.configs.Get("action")[triggerSkillConfig.ActionId]))
                            // Skill.AddFrameEvent(actionCfg, 0.1, null, null)
                            let action = new Action(actionCfg.FrameEvents, owner, blackboard);
                            action.start();
                            action.update();
                        }
                    }
                    break;
                default:
                    throw new Error("Unknown passive skill effect");
            }

        }
    }

    onActivate(owner: Unit): void {
        this.isActivate = true;
        // 激活时的逻辑
    }

    onDeactivate(owner: Unit): void {
        this.isActivate = false;
        // 失效时的逻辑
    }
}

export class PassiveSkills extends Component {
    declare owner: Unit;
    skills: PassiveSkill[] = [];

    constructor(owner: Unit) {
        super();
        this.owner = owner;
    }

    createSkill(config, sourceUnit: Unit): PassiveSkill {
        const skill = new PassiveSkill(config, sourceUnit);
        this.addSkill(skill);
        return skill;
    }

    private addSkill(skill: PassiveSkill): void {
        this.skills.push(skill);
        skill.onActivate(this.owner);
    }

    removeSkill(id: number): void {
        const skillIndex = this.skills.findIndex(skill => skill.id === id);
        if (skillIndex !== -1 && id !== null && id !== undefined) {
            const skill = this.skills[skillIndex];
            skill.onDeactivate(this.owner);
            //this.skills.splice(skillIndex, 1);
        } else {
            console.error("Invalid skill ID provided: ", id);
        }
    }


    handleEvent(eventType: PassiveSkillTrigger, data?: any): void {
        for (const skill of this.skills) {
            if(skill.isActivate)
                skill.handleEvent(eventType, data, this.owner);
        }
    }
}