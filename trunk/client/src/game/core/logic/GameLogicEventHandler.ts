import { ActorType } from "../Def";
import { Runtime } from "../Runtime";
import { FixedVector2 } from "../base/fixed/FixedVector2";

export class GameLogicEventHandler
{
    static PlayerClickMap(gameEvent)
    {
        //let actor = Runtime.gameLogic.GetHeroByPlayerId(gameEvent.player_id)
        //if (actor)
        //    actor.unitController.PlayerClickMap(new FixedVector2(gameEvent.value1, gameEvent.value2))
    }

    static PlayerCastSkill(gameEvent)
    {
        let hero = Runtime.gameLogic.GetHeroBySkillSlot(gameEvent.slotId)
        if (hero)
            hero.TryCastSkill()
    }

    static PlayerAutoCastSkill(gameEvent)
    {
        Runtime.gameLogic.isAutoCastSkill = gameEvent.isAuto;
    }

    static ChangeUnit(gameEvent)
    {
        if(Runtime.battleModule.ChangeAttacker)
            Runtime.battleModule.ChangeAttacker(gameEvent.roleType, gameEvent.skillCfg, gameEvent.level);
    }

}
