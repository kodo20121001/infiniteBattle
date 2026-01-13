import { Runtime } from "../../Runtime";
import { PrimaryAttr } from "../component/BattleAttributes";
import { HeroController } from "../component/HeroController";
import { Unit } from "./Unit";

export class Hero extends Unit
{
    StartLogic() 
    {
        this.config = { //todo
            grids: [[0, 0]]
        }
        this.dieClearTime = 4
        super.StartLogic()
    }

    GetSlotSkillInfo()
    {
        let skill = this.unitBehavior.skills[1]
        if (!skill)
            return null;

        return {
            skillId: skill.config.SkillId,
            cdTime: skill.GetRemainingCDTime(),
            cdPercent: skill.GetCDPercent(),
        }
    }

    GetHpPercent()
    {
        return this.hp / this.attrs.getPrimaryAttribute(PrimaryAttr.HPMax);
    }

    TryCastSkill(slot = 1)
    {
        let skill = this.unitBehavior.skills[slot]
        if (skill)
            this.unitBehavior.SkillLocked(skill)
    }
}
