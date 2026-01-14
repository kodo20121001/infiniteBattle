import { ActorType, AttackInfo, one_frame_time } from "../../Def";
import { Runtime } from "../../Runtime";
import FixedMaths from "../../base/fixed/FixedMaths";
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { ActorSearcher } from "../ActorSearcher";
import { Component } from "./Component";
import { bullet_move_min_step, bullet_move_step } from "../../Def";
import { Mathf } from "../../../../utils/Mathf";
import { Bullet } from "../actor/Bullet";
import { PassiveSkills, PassiveSkillTrigger } from './PassiveSkills';


function calculateHeight(initialHeight, initialVelocity, finalHeight, totalTime, gravity, t) {
    // 计算当前时间
    const currentTime = t * totalTime;
    
    // 计算当前高度
    const currentHeight = initialHeight + initialVelocity * currentTime + 0.5 * gravity * currentTime * currentTime;    
    return currentHeight;
}

export class BulletBehavior extends Component
{
    declare owner: Bullet

    speed: number
    g: number
    elapsedTime: number = 0;
    targetPos: FixedVector2;
    verticalSpeed: number;
    totalTime: number;
    leftTime: number;
    needMove: boolean = true;
    initPos: FixedVector2;
    initY: number;
    targetY: number;

    totalHitCount: number = 0;

    private hitCounts: { [index: number]: { [actorId: number]: any } } = {};

    StartLogic() {
        this.leftTime = this.owner.config.LifeTime;
        this.speed = this.owner.config.Speed / 2
        this.g = -this.speed * 8

        if(this.speed <= 0){
            this.needMove = false;
        }
        else{
            this.needMove = true;

            this.initPos = this.owner.pos.clone()
            this.initY = this.owner.y

            if (this.owner.isTracking)
            {
                this.targetPos = this.owner.trackingUnit.pos.clone();
                this.targetY = this.owner.trackingUnit.hitY + this.owner.trackingUnit.y;
            }
            else
            {
                this.targetPos = this.owner.createContext.targetPos.clone();
                this.targetY = this.owner.createContext.y;
            }

            this.elapsedTime = 0
            const distance = this.owner.pos.distanceTo(this.targetPos)

            this.leftTime = distance / this.speed;
            this.totalTime = this.leftTime;

            if (this.owner.config.PathType == 0)
            {
                this.verticalSpeed = (this.targetY - this.owner.createContext.y) / this.leftTime;
            }
            else if (this.owner.config.PathType == 1)
            {
                this.verticalSpeed = (this.targetY - this.initY - 0.5 * this.g * this.leftTime * this.leftTime) / this.leftTime;
            }
        }

        this.hitCounts = {}
        this.InitHitBoxs();
    }

    LogicUpdate() {
        this.UpdateMove();
        
        this.CheckCollision();
        this.UpdateLifetime();
    }
    
    TryMoveGrid(dir, moveDis)
    {
        let leftDis = moveDis
        let newPos;
        let dirMulDis;
        while (leftDis > bullet_move_min_step)
        {
            let stepDis = leftDis > bullet_move_step ? bullet_move_step : leftDis
            dirMulDis = dir.mul(stepDis);
            newPos = this.owner.pos.add(dirMulDis);


            this.owner.pos.x = newPos.x
            this.owner.pos.y = newPos.y
            leftDis -= stepDis
        }
    }

    UpdateMove() {
        // 根据子弹的路径类型和速度更新子弹的位置
        const pathType = this.owner.config.PathType;
        const path = this.owner.config.Path;

        let y
        let dis = 0

        // 如果是跟踪模式且有目标单位
        if (this.owner.isTracking && this.owner.trackingUnit) {
            this.targetPos = this.owner.trackingUnit.pos;
            const distance = this.owner.pos.distanceTo(this.targetPos)
            this.leftTime = distance / this.speed;

        }

        let totalTime = this.leftTime + this.elapsedTime
        let t = totalTime == 0 ? 1 : this.elapsedTime / totalTime


        let tx = FixedMaths.lerp(this.initPos.x, this.targetPos.x, t)
        let ty = FixedMaths.lerp(this.initPos.y, this.targetPos.y, t)
        let newPos = new FixedVector2(tx, ty)

        dis = newPos.distanceTo(this.owner.pos)
        let moveBy = newPos.sub(this.owner.pos).normalize()
        let angleInRadians = Math.atan2(moveBy.y, moveBy.x)
        if(this.needMove){
            if (pathType == 0)
            {
                y = FixedMaths.lerp(this.initY, this.targetY, t)
            }
            else if (pathType === 1)
            {
                y = calculateHeight(this.initY, this.verticalSpeed, this.targetY, this.totalTime, this.g, t)
    
                let ySpeed = this.verticalSpeed + this.g * totalTime * t
    
                angleInRadians = Math.atan2(this.speed, ySpeed)
            }
        }
      
        //旋转特效
        let angleInDegrees = angleInRadians * (180 / Math.PI);
        this.owner.dirAngle = (360 - angleInDegrees) % 360;

        this.owner.y = y
        this.TryMoveGrid(moveBy, dis)

        if(t > 0.99)
            this.needMove = false;
    }
    
    UpdateLifetime() {
        this.elapsedTime += one_frame_time;
        if (this.elapsedTime >= this.owner.config.LifeTime) {
            this.onDestroy();
        }
        // this.leftTime -= one_frame_time
        // if (this.leftTime < 0)
        // {
        //     this.onDestroy();
        // }
    }

    InitHitBoxs(){
        const hitBoxes = this.owner.config.HitBox;
        
        for (let i = 0; i < hitBoxes.length; i++) {
            const hitBox = JSON.parse(JSON.stringify(Runtime.configs.Get("box")[hitBoxes[i].Id]));
            if (!hitBox) 
                continue;

            const ratio = `${hitBoxes[i].ObjType}_${hitBoxes[i].Id}_Ratio`
            if(this.owner.config.blackboard?.hasOwnProperty(ratio))
                hitBoxes[i].Ratio = this.owner.config.blackboard[ratio]

            const affect = `${hitBoxes[i].ObjType}_${hitBoxes[i].Id}_Affect`
            if (this.owner.config.blackboard?.hasOwnProperty(affect)) {
              let str = this.owner.config.blackboard[affect].toString();
              let strs = str.split('_');
              hitBoxes[i].Affect = [];
              for (let i = 0; i < strs.length; i++) {
                let affectId = parseInt(strs[i]);
                if (affectId > 0)
                    hitBoxes[i].Affect.push(
                        {
                            "Id": affectId,
                            "ObjType": 6,
                        });
              }
            }
        }
    }

    CheckCollision() {
        const hitBound = this.owner.config.HitBound;

        let collisionUnits = ActorSearcher.SearchByGrids(this.owner, this.owner.camp, 2, hitBound); //最近单位
        if(!collisionUnits || collisionUnits.length == 0)
        {
            if (hitBound.length == 1 && this.targetPos)
            {
                let dis = this.targetPos.distanceTo(this.owner.pos)
                if(dis > 0.2) return; //todo
            }
            else
                return;
        }

        const hitBoxes = this.owner.config.HitBox;
        
        for (let i = 0; i < hitBoxes.length; i++) {
            const hitBox = JSON.parse(JSON.stringify(Runtime.configs.Get("box")[hitBoxes[i].Id]));
            if (!hitBox) 
                continue;

            let targets = [];
            switch (hitBox.Target) {
                case 0: 
                    targets.push(this.owner.createActor);
                    break;
                case 1:
                    targets = ActorSearcher.SearchByGrids(this.owner, this.owner.camp, hitBox.SearchType, hitBox.RangePara);
                    break;
                case 2:
                    targets.push(this.owner.trackingUnit);
                    break;
                case 3:
                    targets = ActorSearcher.SearchByGrids(this.owner.trackingUnit, this.owner.camp, hitBox.SearchType, hitBox.RangePara);
                    break;
            }

            if (targets.length > 0) {
                this.OnHit(targets, hitBox, i, hitBoxes[i].Ratio);
            }

            //this.totalHitCount += Object.keys(this.hitCounts[i] || {}).length;
        }

        if (this.owner.config.HitNumber > 0 && this.totalHitCount >= this.owner.config.HitNumber) {
            this.onDestroy();
        }
    }

    OnHit(targets, hitBox, index, ratio) {

        if (!this.hitCounts[index]) {
            this.hitCounts[index] = {};
        }
        let hitInterval = this.owner.config.HitInterval && this.owner.config.HitInterval > 0 ? this.owner.config.HitInterval : 10000;
        for (const target of targets) {
            if (!this.hitCounts[index][target.actorId] || this.hitCounts[index][target.actorId].hitTime + hitInterval < Runtime.game.currTime) {
                this.hitCounts[index][target.actorId] = {target: target, hitTime: Runtime.game.currTime};
                let attackInfo: AttackInfo = {
                    ratio: ratio,
                    hitConfig: hitBox,
                    attacker: this.owner,
                    tureDamage: this.owner.tureDamage
                }
                target.OnBeHit(attackInfo);
                this.totalHitCount++;
            }
        }

        this.owner.createActor?.passiveSkillsCom?.handleEvent(PassiveSkillTrigger.OnHitPointAddBuff, targets.length); // 触发被动技能
    }

    // CreateBullet(data, target) {

    //     let startPos = null;
    //     if (data.FireTarget === 0) {
    //         startPos = this.owner.pos.clone();
    //     } else if (data.FireTarget === 1) {
    //         startPos = target ? target.pos.clone() : this.owner.pos.clone();
    //     }

    //     const angleY = this.owner.angleY;
    //     const offsetX = data.FireOffset[0];
    //     const offsetY = data.FireOffset[1];

    //     // 计算子弹的创建位置
    //     const bulletX = startPos.x + offsetX * FixedMaths.cos(angleY) - offsetY * FixedMaths.sin(angleY);
    //     const bulletY = startPos.y + offsetX * FixedMaths.sin(angleY) + offsetY * FixedMaths.cos(angleY);

    //     const createContext = {
    //         actorType: ActorType.bullet,
    //         actorTypeId: 1,
    //         camp: this.owner.camp,
    //         createActorId: this.owner.createContext.createActorId,
    //         pos: new FixedVector2(bulletX, bulletY),
    //         angleY: angleY,
    //         offset: data.Offset,
    //         res: data.Res,
    //         config: data,
    //     };

    //     Runtime.gameLogic.CreateActor(createContext);
    // }

    onDestroy() {
        if(this.owner.config.EndEffect)
        {
            const endEffects = this.owner.config.EndEffect;
            for (const effect of endEffects) {
                let effectData = JSON.parse(JSON.stringify(Runtime.configs.Get("effect")[effect.Id]));
                if (!effectData) continue;
                effectData.pos = this.owner.pos;
                Runtime.gameLogic.PlayEffect(effectData);
            }
        }
        Runtime.gameLogic.DestroyActor(this.owner.actorId, this.owner.actorType) 
        this.hitCounts = {};
    }
}