import { ActorType, CreateContext, map_grid_size } from "../../Def";
import { Runtime } from "../../Runtime"
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { SecondaryAttr, BattleAttrScale } from "../../logic/component/BattleAttributes";
import { Actor } from "../../logic/actor/Actor";
import { ConfigManager } from "../../../../common/ConfigManager";


// 演武模式
export class MartialDisplay {


    onInitHeroFinish; // 初始化攻击方阵容后回调
    onBattleOver;

    unLockCamera

    attacker: Actor;

    InitBattleActor() {
        this.unLockCamera = true;
        this.InitRoleBattle();
    }


    InitRoleBattle() {

        this.AddSelfCampNpc();
        this.AddMonster();
        this.AddAttacker(101);

        if (this.onInitHeroFinish)
            this.onInitHeroFinish();
    }


    AddAttacker(roleType: number, skill: number = 0, level: number = 1)
    {
        let camp = 1;
        let group = camp * 101;

        let config = Runtime.configs.Get("role_type")[roleType];
        let pos = Runtime.map.GetAtkPosition(0);
        let context: CreateContext = {
            actorType: ActorType.hero,
            unitType: roleType,
            camp: camp,
            pos: new FixedVector2(pos[0], pos[1]),
            angleY: pos[3],
            attrs: this.initAttr(config),
            scale: 1,
            group: group,
            skills: [{skill_id: skill , level: level}],
        };
        this.attacker = Runtime.gameLogic.CreateActor(context);

        if(skill > 0)
            this.attacker.TryCastSkill(0);
    }

    ChangeAttacker(roleType: number, config, level)
    {
        if(this.attacker)
        {
            Runtime.gameLogic.DestroyActor(this.attacker.actorId, this.attacker.actorType)
        }
        if(config)
        {
            Runtime.configs.AddSkill(config);
            this.AddAttacker(roleType, config.SkillId, level);
        }
        else
            this.AddAttacker(roleType);

    }

    AddSelfCampNpc()
    {
        let camp = 1;
        for(let i = 1; i < 5; i++)
        {
            let group = camp * 100 + i;

            let config = Runtime.configs.Get("role_type")[101];
            let pos = Runtime.map.GetAtkPosition(i);
            let context: CreateContext = {
                actorType: ActorType.hero,
                unitType: config.RoleType,
                camp: camp,
                pos: new FixedVector2(pos[0], pos[1]),
                angleY: pos[3],
                attrs: this.initAttr(config),
                scale: 1,
                group: group,
                
            };
            Runtime.gameLogic.CreateActor(context);
        }
    }

    AddMonster()
    {
        let camp = 2;
        for(let i = 0; i < 5; i++)
        {
            let group = camp * 100 + i;

            let config = Runtime.configs.Get("role_type")[101];
            let pos = Runtime.map.GetDefPosition(i);
            let context: CreateContext = {
                actorType: ActorType.hero,
                unitType: config.RoleType,
                camp: camp,
                pos: new FixedVector2(pos[0], pos[1]),
                angleY: pos[3],
                attrs: this.initAttr(config),
                scale: 1,
                group: group,
                
            };
            Runtime.gameLogic.CreateActor(context);
        }
    }


    initAttr(roleConfig)
    {
        const fightAttr = Runtime.configs.Get("fightAttr");

        let battle_attributes : number[] = [];

        for (let j = 0; j < SecondaryAttr.Max; j++) {
            let index = roleConfig.AttrFight.indexOf(j);
            if(index != -1)
                battle_attributes[j] = roleConfig.AttrFightValue[index];
            else
            {
                if(fightAttr[j])
                    battle_attributes[j] = fightAttr[j].Min;
                else
                    battle_attributes[j] = 0;
            }
        }

        battle_attributes[SecondaryAttr.HPMax] = 100000;
        battle_attributes[SecondaryAttr.HPCur] = 100000;

        return { battlePower: 0, values: battle_attributes};
    }



    private calculateSoldierOffset(index : number): {x: number, y: number} 
    {
        // 假设 map_grid_size 变量已经定义并赋值
        const gridSize = map_grid_size
        
        // 根据 index 计算士兵相对于英雄的偏移量
        const rowOffset = Math.floor(index / 3)
        const colOffset = index % 3

        // 计算士兵的实际偏移量
        const offsetX = (colOffset - 1) * gridSize 
        const offsetY = -(rowOffset + 2) * gridSize + 0.2

        return {x: offsetX, y: offsetY}
    }

    IsBattleOver() {
        return false;
    }

    Over(result)
    {
        if (this.onBattleOver) {
            this.onBattleOver({
                result: result,
            });
        }
    }

}
