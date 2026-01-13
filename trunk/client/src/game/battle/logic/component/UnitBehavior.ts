import { Runtime } from "../../Runtime";
import FixedMaths from '../../base/fixed/FixedMaths'
import { Unit } from "../actor/Unit";
import { Component } from "./Component";
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { ActorType, GridToPosition, PositionToGrid, unit_move_block_wait_time, unit_move_min_step, unit_move_step, unit_search_target_interval_time, unit_chase_target_interval_time, one_frame_time, unit_turn_to_target_interval_time, unit_avoid_block_walk_time, unit_skill_pos_ratio, unit_chase_target_time_one_times, unit_move_to_skill_pos_min_dis, unit_try_cast_skill_interval_time } from "../../Def";
import { aStar, smoothPath } from "../../util/AStar";
import { debugArray } from "../../util/Debug";
import { Skill } from "../Skill";
import { getBattleAttributes } from '../../../../module/roleModule/AttributeConst';
import { Attr } from '../../../../manager/CfgMgr';
import { BattleAttributes, PrimaryAttr, SecondaryAttr } from './BattleAttributes';
import { BattleCalculator, BattleDamageInfo } from "./BattleCalculator";
import { ConfigManager } from "../../../manager/ConfigManager";
import { FrameType } from "../../../../module/home/SkillStruct";
import { PassiveSkillTrigger } from "./PassiveSkills";

export class UnitBehavior extends Component
{
    declare owner: Unit

    skills = []
    currSkill
    lockedSkill : Skill
    lastTryCastSkillTime = 0

    isMovePath
    movePath = []
    movePathIndex

    moveDir
    moveDis

    turnBy

    canAvoidBlock;
    isBeBlock
    beBlockTime

    isSearchingTarget
    lastSearchTargetTime = 0
    target

    lastChaseTime = 0
    lastMoveToSkillPosTime = 0
    lastTurnToTargetTime = 0

    commandQueue = [];
    currentCommand = null;

    StartLogic() {

        if(this.owner.skills)
        {
            for (let i = 0; i < this.owner.skills.length; ++i) {
                let skillId = this.owner.skills[i].skill_id;
                let level = this.owner.skills[i].level;

                let skill = new Skill(this.owner, skillId, level);
                this.skills.push(skill);
            }
        }

        if(this.owner.passiveSkills)
        {
            for (let i = 0; i < this.owner.passiveSkills.length; ++i) {
                let passiveSkillId = this.owner.passiveSkills[i].skill_id;
                let level = this.owner.passiveSkills[i].level;
                let config = Runtime.configManager.GetSkillPassive(passiveSkillId, level);
                if(config?.ResoureType == 0) // 不是资源类型
                    this.owner.passiveSkillsCom?.createSkill(config, this.owner)
            }
        }

        this.owner.passiveSkillsCom?.handleEvent(PassiveSkillTrigger.OnStartAddBuff)
    }


    LogicUpdate() {

        if (this.owner.isDestory)
            return

        if (this.owner.isDie)
        {
            this.UpdateDie()
            return
        }

        this.UpdateBeHit()
        if (this.owner.hp <= 0)
        {
            this.Die()
            return
        }

        if (this.owner.isDizzy || this.owner.isFrozen)
            return

        if (this.owner.isCast) {
            this.currSkill.Update()
            if (this.currSkill.isOver) {
                this.OverCast()
                this.Idle()
            }
            return
        }

        if (this.owner.isWalk) {
            if (this.UpdateWalk())
            {
                let isOver = true

                if (this.isMovePath)
                {
                    if (++this.movePathIndex < this.movePath.length)
                    {
                        this.WalkTo(this.movePath[this.movePathIndex], true)
                        isOver = false
                    }
                }

                if (isOver)
                    this.Idle()
            }
        }

        if (this.owner.isTurnRound) {
            this.UpdateTurn();
        }
        //===================================================================================================

        if (this.lockedSkill && this.lockedSkill.target && this.lockedSkill.target.isDie)
            this.lockedSkill = null

        if (this.isSearchingTarget && Runtime.game.currTime - this.lastSearchTargetTime > unit_search_target_interval_time) {

            this.lastSearchTargetTime = Runtime.game.currTime

            let skill1 = this.skills[1]
            if (skill1 && (this.owner.camp != 1 || Runtime.gameLogic.isAutoCastSkill) && !this.owner.isSilenced && !this.owner.isTaunted)
                this.SkillLocked(skill1)

            if (!this.lockedSkill) {
                let skill0 = this.skills[0]
                if (skill0)
                    this.SkillLocked(skill0)
            }
        }

        if (this.lockedSkill) {

            let disWithTarget = this.lockedSkill.GetDisWithTarget()
            let angleWithTarget = this.lockedSkill.GetAngleWithTarget()
            let dirWithTarget = FixedVector2.fromAngle(angleWithTarget)
            let fitCastDis = this.lockedSkill.config.Range * unit_skill_pos_ratio

            // 更新单位朝向c
            this.owner.angleY = angleWithTarget
            // if (Runtime.game.currTime - this.lastTurnToTargetTime >= unit_turn_to_target_interval_time && this.owner.isIdle) {
            //     this.lastTurnToTargetTime = Runtime.game.currTime

            //     if (Math.abs(this.owner.angleY - angleWithTarget) >= 10)
            //     {
            //         this.TurnTo(angleWithTarget);
            //         return
            //     }
            // }

            // 判断是否在技能射程内
            if (disWithTarget <= this.lockedSkill.config.Range)
            {
                if (Runtime.game.currTime - this.lastTryCastSkillTime >= unit_try_cast_skill_interval_time)
                {
                    this.lastTryCastSkillTime = Runtime.game.currTime

                    // 如果距离大于最适施法距离且单位可行走，尝试移动到更佳施法位置
                    if (this.CanWalk() && disWithTarget > fitCastDis)
                    {
                        let dis = disWithTarget - fitCastDis
                        let moveDis = dis > unit_move_to_skill_pos_min_dis ? unit_move_to_skill_pos_min_dis : dis
                        if (dis > 0.1 && this.owner.TestMoveGrid(this.owner.pos, dirWithTarget, moveDis))
                        {
                            this.WalkBy(dirWithTarget, moveDis)
                            return
                        }
                    }
    
                    this.CastSkill(this.lockedSkill)
                }
            }
            else
            {
                if (this.CanWalk() && !this.owner.isWalk)
                {
                    if (Runtime.game.currTime - this.lastChaseTime >= unit_chase_target_interval_time) {
                        this.lastChaseTime = Runtime.game.currTime
                        this.WalkBy(dirWithTarget, this.owner.speed * unit_chase_target_time_one_times)
                    }
                }
            }

            return
        }
        
        if (this.currentCommand == null) {
            this.currentCommand = this.commandQueue.length > 0 ? this.commandQueue.shift() : new IdleCommand()
            this.currentCommand.Start(this)
        }

        if (this.currentCommand?.Update(this)) {
            this.currentCommand = null;
        }
    }
    
    AppendCommand(command) {
        this.commandQueue.push(command);
    }

    SetCommand(command) {
        this.commandQueue = [command];
    }

    Idle() {
        this.owner.isIdle = true
        this.owner.isWalk = false
        this.owner.isTurnRound = false
        this.owner.OnAnimation('idle')
    }

    CanWalk() {
        return this.owner.speed > 0 
            && !this.owner.isEntangled 
            && !this.owner.isFrozen 
            && !this.owner.isDizzy;
    }

    WalkBy(dir, dis, isInPath = false) {
        this.owner.isIdle = false
        this.owner.isTurnRound = false
        this.owner.isWalk = true
        this.isMovePath = isInPath
        this.isBeBlock = false
        this.moveDir = dir
        this.moveDis = dis
        this.owner.OnAnimation('run')
    }

    WalkTo(toPosition, isInPath = false) {
        let dir = toPosition.sub(this.owner.pos).normalize()
        let dis = this.owner.pos.distanceTo(toPosition)
        this.WalkBy(dir, dis, isInPath)
    }

    WalkPath(path) {
        this.movePath = path
        this.movePathIndex = 0
        this.WalkTo(path[0], true)
    }

    WalkAStar(toPosition)
    {
        const dxy = 3

        let pathGrid = []
        let self = this
        let findWaySuccess = aStar(PositionToGrid(this.owner.pos), PositionToGrid(toPosition), function(grid) {
            let pos = GridToPosition(grid)
            return Runtime.gameGrids.IsPosBlock(pos, self.owner)
        }, 1000, pathGrid, function(currGrid) {
            
            let currPos = GridToPosition(currGrid)

            if (self.lockedSkill) {
                return self.lockedSkill.target.pos.distanceTo(currPos) < self.lockedSkill.config.Range
            }

            return true
        })

        if (findWaySuccess)
        {
            let path = []
            path.push(this.owner.pos)
            for (let i = 0; i < pathGrid.length; ++i)
            {
                path.push(GridToPosition(pathGrid[i]))
            }
            path.push(toPosition)

            // let sPath = smoothPath(path, function(pos, pos1) {

            //     let dir = pos1.sub(pos).normalize()
            //     let dis = pos.distanceTo(pos1)

            //     return !self.owner.TestMoveGrid(pos, dir, dis)
            // })
            // sPath.shift()

            //this.WalkPath(sPath)
            this.WalkPath(path)
        }
        else {
            this.WalkTo(toPosition)
        }
    }

    UpdateWalk() {

        let needMoveDistance = one_frame_time * this.owner.speed
        //if (needMoveDistance < unit_move_step)
        //    console.error("needMoveDistance < unit_move_step!!")
        needMoveDistance = needMoveDistance > this.moveDis ? this.moveDis : needMoveDistance

        let moveAngleY = this.moveDir.toAngle()
        let deltaAngle = ((moveAngleY - this.owner.angleY + 180) % 360) - 180
        if (Math.abs(deltaAngle) > this.owner.turningSpeed)
            deltaAngle = (deltaAngle > 0 ? 1 : -1) * this.owner.turningSpeed
        let angleY = this.owner.angleY + deltaAngle

        let {isBlock, moveDis} = this.owner.TryMoveGrid(this.moveDir, needMoveDistance)
        if (isBlock)
        {
            if (this.isBeBlock) {
                this.beBlockTime += one_frame_time
                if (this.beBlockTime >= unit_move_block_wait_time)
                    this.TryAvoidBlock()
            }
            else
            {
                this.isBeBlock = true
                this.beBlockTime = 0
            }
        }
        else {
            this.moveDis -= moveDis
            this.isBeBlock = false
        }
        
        return this.moveDis <= unit_move_min_step
    }

    TurnBy(turnBy) {
        this.owner.isTurnRound = true
        this.turnBy = turnBy
    }

    TurnTo(turnTo) {
        let deltaAngle = ((turnTo - this.owner.angleY + 180) % 360) - 180
        this.TurnBy(deltaAngle)
    }

    UpdateTurn() {
        let deltaAngle = this.turnBy
        if (Math.abs(deltaAngle) > this.owner.turningSpeed)
            deltaAngle = (deltaAngle > 0 ? 1 : -1) * this.owner.turningSpeed

        this.owner.angleY += deltaAngle
        this.turnBy -= deltaAngle

        if (Math.abs(this.turnBy) < 0.1) {
            this.owner.isTurnRound = false
        }
    }

    tryMoveAtAngle(angle, dis) {
        let dir = FixedVector2.fromAngle(angle);
        if (this.owner.TestMoveGrid(this.owner.pos, dir, dis)) {
            this.WalkBy(dir, dis);
            return true;
        }
        return false;
    }

    TowardTargetPoint(pos){
        let dir = pos.sub(this.owner.pos).normalize();
        // 更新单位朝向
        this.owner.angleY = dir.toAngle()
    }

    TryAvoidBlock() {

        let currentAngle = this.moveDir.toAngle()
        for (let i = 1; i <= 12; i++)
        { // 360度 / 15度步长 = 24次
            let direction = FixedMaths.random() < 0.5 ? 1 : -1;
            if (this.tryMoveAtAngle(currentAngle + 15 * i * direction, this.owner.speed * unit_avoid_block_walk_time))
                break;
            if (this.tryMoveAtAngle(currentAngle - 15 * i * direction, this.owner.speed * unit_avoid_block_walk_time))
                break;

            //let tryAngle = FixedMaths.random() * 360
            //if (this.tryMoveAtAngle(tryAngle)) break;
        }
    }

    OverWalk() {
        this.owner.isWalk = false
    }

    SkillLocked(skill) {

        if (!skill.IsCDReady()) {
            return false;
        }

        if (skill.LockTarget()) {
            this.lockedSkill = skill;
            return true;
        }
        return false;
    }

    CanCast(skill) {
        return skill.CanCast()
    }

    CastSkill(skill) {
        this.lockedSkill = null
        this.currSkill = skill
        this.currSkill.Start()
        this.owner.isIdle = false
        this.owner.isWalk = false
        this.owner.isTurnRound = false
        this.owner.isCast = true
        this.owner.OnCastSkill(skill.config.SkillId)
    }

    OverCast() {
        this.owner.isCast = false
    }

    UpdateBeHit() {
        for (let i = 0; i < this.owner.beHitList.length; ++i) {
            const hitData = this.owner.beHitList[i];

            if(hitData.hitConfig.Affect?.length > 0){
                for(let j = 0; j < hitData.hitConfig.Affect.length; ++j){
                    const affect = hitData.hitConfig.Affect[j];
                    let buffCfg = Runtime.configManager.Get("buff")[affect.Id]
                    if(buffCfg)
                    {
                        buffCfg = JSON.parse(JSON.stringify(buffCfg))
                        buffCfg.CanRemove = affect.CanRemove? affect.CanRemove : buffCfg.CanRemove;
                        buffCfg.LifeTime = affect.LifeTime? affect.LifeTime : buffCfg.LifeTime;

                        this.owner.buffs.createBuff(buffCfg, hitData.attacker)
                    }
                }
            }
            let battleDamageInfo = 0;
            if(hitData.ratio)
                battleDamageInfo = BattleCalculator.calculateTatolDamage(hitData.attacker, this.owner, hitData.ratio, hitData.tureDamage) 

            if(hitData.ratio == 0 || battleDamageInfo != 0)
            {
                const hitConfig = this.owner.beHitList[i].hitConfig
                for(let j = 0; j < hitConfig.HitEffect.length; ++j) {
                    const data = JSON.parse(JSON.stringify(Runtime.configManager.Get("effect")[hitConfig.HitEffect[j].Id]));
                    if(!data) continue;
                    data.pos = this.owner.pos;
                    data.hitY = this.owner.hitY;
                    data.actorId = this.owner.actorId;
                    Runtime.gameLogic.PlayEffect(data);
                }

                for (let j = 0; j < hitConfig.HitShake.length; ++j) {
                    let shakeData = JSON.parse(JSON.stringify(Runtime.configManager.Get("shake")[hitConfig.HitShake[j].Id]));
                    if (!shakeData) return;
                
                    shakeData.actorId =  this.owner.actorId;
                    Runtime.gameLogic.PlayShake(shakeData);
                }

                for (let j = 0; j < hitConfig.HitSound.length; ++j) {
                    let soundData = JSON.parse(JSON.stringify(Runtime.configManager.Get("sound")[hitConfig.HitSound[j].Id]));
                    if (!soundData) return;
                
                    soundData.type = "skill";
                    Runtime.gameLogic.PlaySound(soundData);
                }

                if(battleDamageInfo != 0)
                {
                    if(this.owner.buildingConfig?.BuildingType == 12)
                        this.owner.OnAnimation('hit')
                }
            }

        }
        this.owner.beHitList = []
    }

    Die() {
        this.owner.isDie = true
        this.owner.isIdle = false
        this.owner.isWalk = false
        this.owner.isTurnRound = false
        this.owner.isCast = false
        this.owner.dieStartTime = Runtime.game.currTime
        Runtime.gameGrids.RemoveObj(this.owner)
        this.owner.OnAnimation('dead')
    }

    UpdateDie()
    {
        if (this.owner.isDie && this.owner.dieStartTime + this.owner.dieClearTime <= Runtime.game.currTime)
           Runtime.gameLogic.DestroyActor(this.owner.actorId, this.owner.actorType)
    }

    StartSearchTarget() {
        this.isSearchingTarget = true
        this.lastSearchTargetTime = 0
    }

    EndSearchTarget() {
        this.isSearchingTarget = false
        this.lockedSkill = null
    }



    UpdateHp(type, value)
    {

    }
}

class Command {
    Start(behavior) {}
    Update(behavior) {}
}

//原地空闲，会被引走，但是有敌人接近会攻击
export class IdleCommand extends Command {

    constructor() {
        super();
    }

    Start(behavior) {
        behavior.StartSearchTarget()
        behavior.Idle()
    }

    Update(behavior) {
        if (behavior.commandQueue.length > 0)
            return true;
        return false;
    }
}

//A到一个位置
export class AttackToCommand extends Command {
    targetPosition;

    constructor(targetPosition) {
        super();
        this.targetPosition = targetPosition;
    }

    Start(behavior) {
        behavior.StartSearchTarget()
        behavior.TowardTargetPoint(this.targetPosition);
        behavior.WalkTo(this.targetPosition);
    }

    Update(behavior) {

        let distance = behavior.owner.pos.distanceTo(this.targetPosition);
        if (distance < 0.1) {
            return true;
        }

        if (!behavior.target && !behavior.owner.isWalk) {
            behavior.WalkTo(this.targetPosition);
        }

        return false;
    }
}

//原地防御
export class DefendInPlaceCommand extends Command {
    Start(behavior) {
        behavior.StartSearchTarget()
    }

    Update(behavior) {
        return false;
    }
}

//走到一个位置，不攻击
export class GoToCommand extends Command {
    targetPosition;

    constructor(targetPosition) {
        super();
        this.targetPosition = targetPosition;
    }

    Start(behavior) {
        behavior.EndSearchTarget()
        behavior.TowardTargetPoint(this.targetPosition);
        behavior.WalkTo(this.targetPosition);
    }

    Update(behavior) {
        let distance = behavior.owner.pos.distanceTo(this.targetPosition);
        if (distance < 0.5) {
            return true;
        }

        if (!behavior.owner.isWalk && behavior.CanWalk())
            behavior.WalkTo(this.targetPosition);

        return false;
    }
}
