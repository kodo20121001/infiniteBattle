import { ActorType, CreateContext, map_grid_size } from "../../Def";
import { Runtime } from "../../Runtime"
import { getUnitConfig } from "../../config/UnitConfig";
import { GoToCommand } from "../../logic/component/UnitBehavior";
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { SecondaryAttr, BattleAttrScale } from "../../logic/component/BattleAttributes";

// 冒险模式
export class Adventure {


    bt_config  = {

        type: 'BtNodeFirstResponse', children: [
            {
                type: 'BtNodeSequence', children: [
                    {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'IsBattleOver', params: []}},
                    {type: 'BtNodeWaitComMethod', data: {com: 'battleModule', call: 'BattleShow', params: []}},
                ]
            }
        ]
    }


    onInitHeroFinish; // 初始化攻击方阵容后回调
    onBattleOver;

    battleInitData;
    unLockCamera;

    onBattleProcess;
    battleOver;
    battleShowTime;

    InitBattleActor() {
        this.unLockCamera = true;
        this.battleOver = false;
        this.InitRoleBattle();
    }


    InitRoleBattle() {

        this.addAttacks();
        this.addDefenders();
        //this.addBuildings();
    }

    GetRole(roles: any[], roleId: number) {
        for (let j = 0; j < roles.length; j++) {
            if (roles[j]['id'] == roleId) {
                return roles[j];
            }
        }
        return null;
    }

    addAttacks() {

        let data = this.battleInitData;
        
        let attackPlayerId = data.player_id;
        let attackerBattleData = data.player_battle_data;
        let attackRoles = attackerBattleData.attack_lineup;
        let roles = attackerBattleData.roles;
        if (roles == undefined || roles == null || roles.length == 0)
            return;
        let camp = 1;
        for (let i = 0; i < attackRoles.length; i++) {
            if (attackRoles[i] == null)
                continue;
            
            let role = this.GetRole(roles, attackRoles[i].role_id);
            if (!role)
                continue;
    
            let roleConfig = getUnitConfig(role.type);
            if (!roleConfig)
                continue;
    
            let pos = Runtime.map.GetAtkPosition(i);
            let group = camp * 100 + i;
            let context: CreateContext = {
                actorType: ActorType.hero,
                unitType: role.type,
                camp: camp,
                pos: new FixedVector2(pos[0], pos[1]),
                angleY: pos[3],
                attrs: role.battle_attributes,
                scale: 1,
                group: group,
                skillSlotId: i,
                skills: Runtime.configs.GetSkillIds(role),
                passiveSkills: role.passive_skills,
            };
            Runtime.gameLogic.CreateActor(context);
            this.addSoldier(attackRoles[i].soldiers, context.camp, pos, context.group, pos[3]);
        }
    
        if (this.onInitHeroFinish)
            this.onInitHeroFinish();
    }

    addDefenders() {

        let data = this.battleInitData;
        let defenderPlayerId = data['defender_player_id'];
        let stageConfig = Runtime.configs.Get("stage")[data.stage_id];
        if (!stageConfig)
            return;

        let defenderRoles = ["Position1", "Position2", "Position3", "Position4", "Position5"]
        let attrsName = ["AttackVal", "HPMax", "AttackSpeed", "SkillCDPct", "CriticalPct", "GroundMoveSpeed"];
        let attrsScale = ["AttackScale", "HPScale"];
        let camp = 2;
        for (let i = 0; i < defenderRoles.length; i++) {
            let info = stageConfig[defenderRoles[i]];
            if (!info) continue;

            let monsterConfig = Runtime.configs.Get("monster")[info];
    
            let roleConfig = getUnitConfig(monsterConfig.ImageID);
            if (!roleConfig)
                continue;

            let values:number[] = [];
            for (let j = 0; j < SecondaryAttr.Max; j++) {
                if(attrsName.indexOf(SecondaryAttr[j]) != -1)
                    values[j] = monsterConfig[SecondaryAttr[j]];
                else
                {
                    const fightAttr = Runtime.configs.Get("fightAttr");
                    if(fightAttr[j])
                        values[j] = fightAttr[j].Min;
                    else
                        values[j] = 0;
                }
            }
            
            for (let j = 0; j < attrsScale.length; j++) {
                values[BattleAttrScale[attrsScale[j]]] *= stageConfig[attrsScale[j]];
            }

            let group = camp * 100 + i;
            let pos = Runtime.map.GetDefPosition(i);
            let context: CreateContext = {
                actorType: ActorType.hero,
                unitType: monsterConfig.ImageID,
                camp: camp,
                pos: new FixedVector2(pos[0], pos[1]),
                angleY: pos[3],
                attrs: {battlePower: 0, values: values},
                scale: 1,
                group: group,
                skills: Runtime.configs.GetSkillIds(roleConfig, [monsterConfig.NormalAttack, monsterConfig.SkillLevel]),
                skillSlotId: i,
                //passiveSkills: roleConfig.passive_skills,
            };
            Runtime.gameLogic.CreateActor(context);
            
            if(roleConfig.FollowerType.length > monsterConfig.Quality - 1)
            {
                let soldierConfig = getUnitConfig(roleConfig.FollowerType[monsterConfig.Quality - 1]);
                this.addMonsterSoldier(soldierConfig, context.camp, pos, context.group, pos[3], monsterConfig["LeaderShip"] * stageConfig["LeaderShipScale"]);
            }
        }
    }

    

    // addBuildings()
    // {
    //     let data = this.battleInitData;

    //     let defenderPlayerId = data['defender_player_id'];
    //     let defenderBattleData = data['defender_battle_data'];
    //     let buildings = defenderBattleData['buildings'];
        
    //     for (let i = 0; i < buildings.length; i++) {
    //         let buildingId = buildings[i].id;
    //         let buildingConfigs = Runtime.configs.Get("homeland_building")
    //         let buildingConfig = Runtime.configs.GetBuildingConfig(buildingId);

    //         if(buildingConfig == undefined || buildingConfig == null || buildingConfig == '')
    //             continue;
           
    //         let buildingInfo = Runtime.map.GetBuildingInfo(buildingConfig.BuildingId)
    //         if(!buildingInfo.pos)
    //             continue;

    //         if (buildingConfig && buildingConfig['RoleId']) {
    //             let context: CreateContext = {
    //                 actorType: ActorType.building,
    //                 unitType: buildingConfig['RoleId'],
    //                 camp: 2,
    //                 pos: new FixedVector2(buildingInfo.pos[0], buildingInfo.pos[1]),
    //                 angleY: 180,
    //                 scale: 1,
    //                 playerId: defenderPlayerId,
    //                 buildingId: buildingConfig.BuildingId,
    //                 grids: buildingInfo.bounds
    //             };
    //             Runtime.gameLogic.CreateActor(context);
    //         }
    //     }
    // }
    addSoldier(soldiers, camp, pos, group, angle)
    {
        if(!soldiers || soldiers.length <= 0)
            return;
    
        const soldier = Runtime.collector.InitSoldierStats(soldiers, camp)

    
        if (!soldier || !soldier.soldier_type || soldier.count <= 0)
            return

        let facingBack = !(angle > 90 && angle < 270);
        let dir = facingBack ? 1 : -1;
        let unitTypeConfig = getUnitConfig(soldier.id);
        for(let k = 0; k < 6; k++)
        {
            if (k == 1)
                continue

            let offset = this.calculateSoldierOffset(k);

            let context: CreateContext = {
                actorType: ActorType.soldier,
                unitType: soldier.id,
                camp: camp,
                pos: new FixedVector2(pos[0] + offset.x * dir, pos[1] + offset.y * dir),
                angleY: angle,
                attrs: soldier.battle_attributes,
                scale: 1,
                group: group,
                soldierType: soldier.soldier_type,
                skills: Runtime.configs.GetSkillIds(unitTypeConfig)
            };
            Runtime.gameLogic.CreateActor(context);
        }
    }

    addMonsterSoldier(soldierInfo, camp, pos, group, angle, count)
    {
        let facingBack = !(angle > 90 && angle < 270);
        let dir = facingBack ? 1 : -1;
        const fightAttr = Runtime.configs.Get("fightAttr");

        for(let k = 0; k < 6; k++)
        {
            if (k == 1)
                continue

            let battle_attributes : number[] = [];

            for (let j = 0; j < SecondaryAttr.Max; j++) {
                let index = soldierInfo.AttrFight.indexOf(j);
                if(index != -1)
                    battle_attributes[j] = soldierInfo.AttrFightValue[index];
                else
                {
                    if(fightAttr[j])
                        battle_attributes[j] = fightAttr[j].Min;
                    else
                        battle_attributes[j] = 0;
                }
            }

            battle_attributes[SecondaryAttr.AttackVal] *= count;
            battle_attributes[SecondaryAttr.HPMax] *= count;

            let offset = this.calculateSoldierOffset(k);

            let context: CreateContext = {
                actorType: ActorType.soldier,
                unitType: soldierInfo.RoleType,
                camp: camp,
                pos: new FixedVector2(pos[0] + offset.x * dir, pos[1] + offset.y * dir),
                angleY: angle,
                attrs: {battlePower: 0, values: battle_attributes},
                scale: 1,
                group: group,
                skills: Runtime.configs.GetSkillIds(soldierInfo)
            };
            Runtime.gameLogic.CreateActor(context);
        }
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
        
        const heroes = Runtime.gameLogic.GetActorsByType(ActorType.hero);
        const soldiers = Runtime.gameLogic.GetActorsByType(ActorType.soldier);
        const buildings = Runtime.gameLogic.GetActorsByType(ActorType.building);
    
        let camp1Count = 0;
        let camp2Count = 0;
    
        // 统计英雄、士兵和建筑的阵营数量
        for (const id in heroes) {
            const hero = heroes[id];
            if (!hero.isDie) {
                if (hero.camp === 1) {
                    camp1Count++;
                } else if (hero.camp === 2) {
                    camp2Count++;
                }
            }
        }
    
        for (const id in soldiers) {
            const soldier = soldiers[id];
            if (!soldier.isDie) {
                if (soldier.camp === 1) {
                    camp1Count++;
                } else if (soldier.camp === 2) {
                    camp2Count++;
                }
            }
        }
    
        for (const id in buildings) {
            const building = buildings[id];
            if (!building.isDie) {
                if (building.camp === 1) {
                    camp1Count++;
                } else if (building.camp === 2) {
                    camp2Count++;
                }
            }
        }
    
        // 判断是否有一个阵营全部阵亡
        if (camp1Count === 0 || camp2Count === 0) {
            this.Over(camp1Count > 0 ? "win" : "lose")
            return true;
        }

        if(this.battleOver)
            return true;
    
        return false;
    }

     //表演阶段
     BattleShow(){
        if(!this.battleShowTime)
        {
            this.battleShowTime = Runtime.game.currTime;
            Runtime.game.SetGameSpeed(0.5);
        }

        return this.battleShowTime + 2 < Runtime.game.currTime;
    }

    Over(result)
    {
        if(this.battleOver)
            return;

        Runtime.game.SetGameSpeed(1);
        this.battleOver = true;

        if (this.onBattleOver) {
            this.onBattleOver({
                result: result,
            });
        }
    }

    BattleProcess(data)
    {
        if (this.onBattleProcess){
            this.onBattleProcess({
                current_frame : Runtime.game.currFrame,
                operations: data.operations,
                casualties: null,
                occupation_rate: 0,
                is_finished: false,
                result : null,
            })
        }
    }

}
