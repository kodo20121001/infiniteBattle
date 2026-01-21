import { ActorType, CreateContext, map_grid_size } from "../../Def";
import { Runtime } from "../../Runtime"
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { getUnitConfig } from "../../config/UnitConfig";
import { SecondaryAttr, BattleAttrScale } from "../../logic/component/BattleAttributes";
import { Actor } from "../../logic/actor/Actor";
import { BtRet } from "../../tool/bt/BtNode";
import { Configs } from "../../../common/Configs";


// 技能编辑器模式
export class SkillEditor {

    bt_config = {
        type: 'BtNodeFirstResponseSuccess', children: [
        ]
    }

    onInitHeroFinish; // 初始化攻击方阵容后回调
    onBattleOver;

    unLockCamera;
    battleOver;
    battleInitData;

    attacker: Actor;
    defender: Actor;

    InitBattleActor() {
        this.unLockCamera = true;
        this.battleOver = false;
        this.InitRoleBattle();
    }

    InitRoleBattle() {
        this.AddAttacker(101);
        //this.AddDefender(102);

        if (this.onInitHeroFinish)
            this.onInitHeroFinish();
    }

    AddAttacker(roleType: number, skill: number = 0, level: number = 1) {
        let camp = 1;
        let group = camp * 101;

        let config = Configs.Get("unit")[roleType];
        let pos = Runtime.map.GetPosition(1, 1);
        let context: CreateContext = {
            actorType: ActorType.hero,
            unitType: roleType,
            camp: camp,
            pos: new FixedVector2(pos[0], pos[1]),
            angleY: pos[3],
            attrs: this.initAttr(config),
            scale: 1,
            group: group,
            skillSlotId: 0,
            skills: config.skillIds,
            passiveSkills: [],
        };

        this.attacker = Runtime.gameLogic.CreateActor(context);
    }

    AddDefender(roleType: number, skill: number = 0, level: number = 1) {
        let camp = 2;
        let group = camp * 101;

        let config = getUnitConfig(roleType);
        let pos = Runtime.map.GetDefPosition(0);
        let context: CreateContext = {
            actorType: ActorType.hero,
            unitType: roleType,
            camp: camp,
            pos: new FixedVector2(pos[0], pos[1]),
            angleY: pos[3],
            attrs: this.initAttr(config),
            scale: 1,
            group: group,
            skillSlotId: 0,
            skills: Runtime.configs.GetSkillIds(config),
            passiveSkills: config.passive_skills,
        };

        this.defender = Runtime.gameLogic.CreateActor(context);
    }

    AddSelfCampNpc() {
        // 演武模式中的自身阵营NPC
        for (let i = 0; i < 2; i++) {
            let camp = 2;
            let pos = Runtime.map.GetDefPosition(i + 1);
            const context: CreateContext = {
                actorType: ActorType.soldier,
                unitType: 1,
                camp: camp,
                pos: new FixedVector2(pos[0], pos[1]),
                angleY: pos[3],
                attrs: {},
                scale: 1,
                group: camp * 100 + i + 1,
            };
            Runtime.gameLogic.CreateActor(context);
        }
    }

    AddMonster() {
        // 可选：添加怪物
    }

    initAttr(config: any) {
        return

        let attr: any = {};
        let secondaryAttr = {};

        if (config) {
            for (let key in config) {
                if (key.startsWith("Attr")) {
                    attr[key] = config[key];
                }
            }

            for (let i = 0; i < BattleAttrScale.length; i++) {
                secondaryAttr[BattleAttrScale[i]] = 0;
            }
        }

        return { ...attr, ...secondaryAttr };
    }
}
