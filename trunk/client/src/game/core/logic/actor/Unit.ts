import { ActorType, one_frame_time, unit_move_min_step, unit_move_step } from "../../Def";
import { Runtime } from "../../Runtime";
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { BattleAttributes, PrimaryAttr, SecondaryAttr } from "../component/BattleAttributes";
import { Buffs } from "../component/Buffs";
import { PassiveSkills } from "../component/PassiveSkills";
import { UnitBehavior } from "../component/UnitBehavior";
import { UnitStatus } from "../component/UnitStatus";
import { Actor } from "./Actor";

export class UnitType
{
    static baby = 1
    static hero = 2
    static mob = 3
}

export class UnitRelation
{
    static friend = 1
    static enemy = 2
}

export class Unit extends Actor
{
    turningSpeed
    sightRange

    attrs: BattleAttributes

    isIdle
    isWalk
	isTurnRound
	isCast
    isDie
    isInvincible //无敌

    isHealed //(治疗)
    isDizzy //(眩晕)
    isFrozen //(冰冻)
    isBleeding //(流血)
    isBurning //(灼烧)
    isBlinded //(致盲)
    isEntangled //(缠绕)
    isSilenced //(沉默)
    isTaunted //(嘲讽)

    tauntSource: Unit
    beHitList = []

    dieClearTime = 10
    dieStartTime

    unitBehavior : UnitBehavior
    unitStatus: UnitStatus
    buffs: Buffs
    passiveSkillsCom: PassiveSkills

    skillAssister

    currAnimation

    unitTypeConfig

    skills
    passiveSkills
    hitY
    radius

    get hp() { return this.attrs?.getSecondaryAttribute(SecondaryAttr.HPCur) }
    get speed() { return this.attrs?.getPrimaryAttribute(PrimaryAttr.GroundMoveSpeed) }

    StartLogic()
    {
        this.unitTypeConfig = Runtime.configs.Get('role_type')[this.createContext.unitType]
        this.skills = this.createContext.skills;
        this.passiveSkills = this.createContext.passiveSkills? this.createContext.passiveSkills : undefined;
        this.hitY = this.unitTypeConfig.BehitPoint
        console.assert(this.unitTypeConfig, this.createContext.unitType)

        let pos = new FixedVector2(this.createContext.pos.x, this.createContext.pos.y)
        this.pos = pos;
        let angleY = this.createContext.angleY ? this.createContext.angleY : 0
        this.angleY = angleY
        this.y = this.createContext.y ? this.createContext.y : 0

        this.attrs = this.AddComponent(BattleAttributes)
        this.unitBehavior = this.AddComponent(UnitBehavior)
        this.buffs = this.AddComponent(Buffs)
        this.unitStatus = this.AddComponent(UnitStatus)
        this.passiveSkillsCom = this.AddComponent(PassiveSkills)

        //if (this.config.isOccupyGrid)
            this.TryPutInGameGrid(pos)
        //else
        //    this.PutInGame(pos, angleY)

        super.StartLogic()
        this.attrs.InitCurHP();

        this.turningSpeed = 20 //todo
        this.sightRange = this.unitTypeConfig.AttackRange
        this.scale = this.createContext.scale
        
        Runtime.collector.PushUnit(this)
    }

    LogicUpdate()
    {
        if (!this.isInGame)
            return
        super.LogicUpdate()
    }

    Destroy()
    {
        this.PutOutGameGrid()
        super.Destroy()
    }

    PutInGame()
    {
        this.isInGame = true;
    }

    TryPutInGameGrid(pos)
    {
        this.pos.x = pos.x;
        this.pos.y = pos.y;

        const result = Runtime.gameGrids.FindNonCollidingPosition(pos, this);
        if (result)
        {
            this.isInGame = true;
            Runtime.gameGrids.InsertObj(this);
            return true;
        }
        else
        {
            this.isInGame = false;
            return false;
        }
    }

    PutOutGameGrid()
    {
        this.isInGame = false;
        Runtime.gameGrids.RemoveObj(this);
    }
    
    TestGrid(pos)
    {
        return !Runtime.gameGrids.IsPosBlock(pos, this)
    }

    TrySetGrid(pos)
    {
        if (Runtime.gameGrids.IsPosBlock(pos, this))
            return false
        
        this.pos.x = pos.x
        this.pos.y = pos.y

        Runtime.gameGrids.RemoveObj(this)
        Runtime.gameGrids.InsertObj(this)

        return true
    }

    TestMoveGrid(srcPos, dir, moveDis)
    {
        let pos = new FixedVector2(srcPos.x, srcPos.y)
        let dirMulDis
        let step = this.speed * one_frame_time
        step = step > unit_move_step ? unit_move_step : step
        while (moveDis > unit_move_min_step)
        {
            let stepDis = moveDis > step ? step : moveDis
            dirMulDis = dir.mul(stepDis)
            pos = pos.add(dirMulDis)

            //todo
            if (!this.TestGrid(pos))
                return false

            moveDis -= stepDis
        }

        return true
    }

    TryMoveGrid(dir, moveDis)
    {
        let isBlock = false
        let leftDis = moveDis
        let newPos;
        let dirMulDis;
        while (leftDis > unit_move_min_step)
        {
            let stepDis = leftDis > unit_move_step ? unit_move_step : leftDis
            dirMulDis = dir.mul(stepDis);
            newPos = this.pos.add(dirMulDis);

            if (!this.TrySetGrid(newPos)) {
                isBlock = true;
                break;
            }

            leftDis -= stepDis
        }

        moveDis -= leftDis
        return {isBlock, moveDis}
    }

    OnBeHit(beHitData)
    {
        this.beHitList.push(beHitData)
    }

    castSkillHandler
    OnCastSkill(skillId)
    {
        if(this.castSkillHandler)
        {
            this.castSkillHandler(skillId)
        }
    }

    animationHandler
    OnAnimation(name)
    {
        this.currAnimation = name
        if (this.animationHandler)
        {
            let func = this.animationHandler
            func(name)
        }
    }
}
