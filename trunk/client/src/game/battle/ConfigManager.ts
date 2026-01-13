import { battle_1_config } from "../config/battle_1_config";
import { CfgMgr, StdCommonType } from "../../manager/CfgMgr";
import { battle_pve_config } from "../config/battle_pve_config";

export class ConfigManager {

    configs = {}
    homeland_id;

    init(battle_type, homeland_id)
    {
        this.homeland_id = homeland_id;
        const data = CfgMgr.Get('homeland_init').find(item => item.HomeId === homeland_id)
        this.configs["map"] = CfgMgr.GetHomeMap()[data.Style]

        this.configs['role_type'] = CfgMgr.GetRole();

        if (battle_type == "plunder") {
            this.configs['homeland_building'] = CfgMgr.GetHomeLandBuilding(homeland_id);
            this.configs.battleProcess = battle_1_config
        }
        else if (battle_type == "pve") {
            this.configs.stage = CfgMgr.GetLevels();
            this.configs.monster = CfgMgr.GetMonsters();
            this.configs.battleProcess = battle_pve_config
        }
        else if (battle_type == "MartialDisplay") {
            this.configs.battleProcess = battle_pve_config
        }
        
        this.configs.skill = CfgMgr.GetSkills();
        this.configs.skillAttr = CfgMgr.GetSkillAttr();
        this.configs.action = CfgMgr.GetSkillAction();
        this.configs.box = CfgMgr.GetSkillBox();
        this.configs.effect = CfgMgr.GetSkillEffect();
        this.configs.sound = CfgMgr.GetSkillSound();
        this.configs.shake = CfgMgr.GetSkillShake();
        this.configs.bullet = CfgMgr.GetSkillBullet();
        this.configs.affect = CfgMgr.GetSkillAffect();
        this.configs.buff = CfgMgr.GetAffects();

        this.configs.fightAttr = CfgMgr.GetFightAttr();
        this.configs.skillPassive = CfgMgr.GetSkillPassiveAttr();
        this.configs.skillLevel = CfgMgr.GetActiveSkillList();
        this.configs.camera = CfgMgr.GetCommon(StdCommonType.Camera); //common表中配置id为14

        this.configs.buildingUpgrade = CfgMgr.Get("BuildingUpgrade");

    }

    Get(name)
    {
        return this.configs[name]
    }

    GetBuildingConfig(buildingId)
    {
        for (let i = 0; i < this.configs['homeland_building'].length; i++) {
            if (this.configs['homeland_building'][i].BuildingId == buildingId) {
                return this.configs['homeland_building'][i];
            }
        }
    }

    GetSkillIds(config, levels?)
    {
        let skills = []
        if(config.active_skills)
            skills = config.active_skills
        else
        {
            let skillFields = ['Skill1', 'Skill2', 'Skill3'];
            for (let i = 0; i < skillFields.length; ++i) {
                let skillId = config[skillFields[i]];
                skills.push({skill_id:skillId, level: levels != undefined && levels[i] ? levels[i] : 1})
            }
    
        }
        return skills;
    }


    GetSkillPassive(skillId: number, level: number)
    {
        const table = this.configs.skillPassive
        if(table)
        {
            for(let i = 0; i < table.length; i++)
            {
                const skill = table[i];
                if(skill.PassiveID == skillId && skill.Level == level)
                    return skill;
            }
        }
    }


    AddSkill(config)
    {
        if(this.configs.skill)
            this.configs.skill[config.SkillId] = config;

    }

    GetObjType(ObjType: number, id:number)
    {
        let table;
        if(ObjType == 1)
            table = this.configs["box"][id];
        else if(ObjType == 2)
            table = this.configs["effect"][id];
        else if(ObjType == 3)
            table = this.configs["shake"][id];
        else if(ObjType == 4)
            table = this.configs["bullet"][id];
        else if(ObjType == 5)
            table = this.configs["sound"][id];
        else
            console.error("ObjType error");

        return JSON.parse(JSON.stringify(table))
    }

    GetSkillIcon(skillId: number, skillLv: number) {
        for (let index = 0; index < this.configs.skillLevel.length; index++) {
            let stdSkill = this.configs.skillLevel[index];
            if (stdSkill.SkillId == skillId && stdSkill.SkillType == skillLv) {
                return stdSkill.icon;
            }
        }
    }

    GetSkillSound(skillId: number, skillLv: number) {
        for (let index = 0; index < this.configs.skillLevel.length; index++) {
            let stdSkill = this.configs.skillLevel[index];
            if (stdSkill.SkillId == skillId && stdSkill.SkillType == skillLv) {
                return stdSkill.Sound;
            }
        }
    }

    GetBuildingRes(buildingId, level){
        for (let index = 0; index < this.configs.buildingUpgrade.length; index++) {
            let building = this.configs.buildingUpgrade[index];
            if (building.BuildingID == buildingId && building.Level == level) {
                return building.BattlePrefab;
            }
        }
    }

    
}


