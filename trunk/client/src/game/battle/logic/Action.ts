import { Mathf } from "../../../utils/Mathf";
import { ActorType, AttackInfo, CreateContext, one_frame_time } from "../Def";
import { Runtime } from "../Runtime";
import FixedMaths from "../base/fixed/FixedMaths";
import { FixedVector2 } from "../base/fixed/FixedVector2";
import { Timeline } from '../tool/timeline/Timeline';
import { ActorSearcher } from "./ActorSearcher";
import { Unit } from "./actor/Unit";
import { BattleAttributes } from "./component/BattleAttributes";
import { PassiveSkillTrigger } from "./component/PassiveSkills";


export enum FrameType {
    Box = 1,    // 伤害盒子
    Effect = 2, // 特效
    Shake = 3,  // 震屏
    Bullet = 4, // 子弹
    Sound = 5,  // 声音
    End = 6,
    Animation = 7, // 动画
  }
  
 export class Action {
    flow: Timeline;
    isOver: boolean;
    actor: Unit;
    target: Unit | null;
    tureDamage: number[];
    blackboard: any;
    bulletList
  
    constructor(frameEvents: any[], actor: Unit, blackboard: any) {
      this.actor = actor;
      this.blackboard = blackboard;
      this.target = null; // 初始时 target 为空
      this.tureDamage = blackboard.tureDamage;
      this.isOver = false;
      this.bulletList = {};
  
      this.flow = new Timeline(frameEvents, (data) => {
        this.handle(data);
      });
    }
  
    handle(data) {
      switch (data.ObjType) {
        case FrameType.Box:
          this.handleDamageBox(data);
          break;
        case FrameType.Effect:
          this.handleEffect(data);
          break;
        case FrameType.Shake:
          this.handleShake(data);
          break;
        case FrameType.Bullet:
          this.handleBullet(data);
          break;
        case FrameType.Sound:
          this.handleSound(data);
          break;
        case FrameType.Animation:
          this.handleAnimation(data);
          break;
      }
    }
  
    handleDamageBox(data) {
      let boxInfo = JSON.parse(JSON.stringify(Runtime.configManager.Get("box")[data.Id]));
      if (!boxInfo) return;
  
      const key = `${data.ObjType}_${data.Id}_Ratio`;
      if (this.blackboard.hasOwnProperty(key)) {
        data.Ratio = this.blackboard[key];
      }
      const affect = `${data.ObjType}_${data.Id}_Affect`
      if (this.blackboard.hasOwnProperty(affect)) {
        let str = this.blackboard[affect].toString();
        let strs = str.split('_');
        boxInfo.Affect = [];
        for (let i = 0; i < strs.length; i++) {
          let affectId = parseInt(strs[i]);
          if (affectId > 0)
            boxInfo.Affect.push(
              {
                "Id": affectId,
                "ObjType": 6,
              });
        }
      }

      let targets = [];
      switch (boxInfo.Target) {
        case 0: 
          targets.push(this.actor);
          break;
        case 1:
          targets = ActorSearcher.SearchByGrids(this.actor, this.actor.camp, boxInfo.SearchType, boxInfo.RangePara);
          break;
        case 2:
          targets.push(this.target);
          break;
        case 3:
          targets = ActorSearcher.SearchByGrids(this.target, this.actor.camp, boxInfo.SearchType, boxInfo.RangePara);
          break;
      }
      for (let target of targets) {
        let damage: AttackInfo = {
          hitConfig: boxInfo,
          ratio: data.Ratio,
          attacker: this.actor,
          tureDamage: this.tureDamage
        };
        target.OnBeHit(damage);
      }

      this.actor.passiveSkillsCom?.handleEvent(PassiveSkillTrigger.OnHitPointAddBuff, targets.length); // 触发被动技能
    }
  
    handleEffect(data) {
      let effectData = JSON.parse(JSON.stringify(Runtime.configManager.Get("effect")[data.Id]));
      if (!effectData) return;
  
      effectData.pos = this.actor.pos;
      effectData.actorId = this.actor.actorId;
      Runtime.gameLogic.PlayEffect(effectData);
    }
  
    handleShake(data) {
      let shakeData = JSON.parse(JSON.stringify(Runtime.configManager.Get("shake")[data.Id]));
      if (!shakeData) return;
  
      shakeData.actorId = this.actor.actorId;
      Runtime.gameLogic.PlayShake(shakeData);
    }
  
    handleBullet(data) {
      const bulletData = JSON.parse(JSON.stringify(Runtime.configManager.Get("bullet")[data.Id]));
      if (!bulletData) return;
  
      bulletData.blackboard = {};
  
      const type = `${data.ObjType}_${data.Id}_`;
  
      for (const key in this.blackboard) {
        if (this.blackboard.hasOwnProperty(key)) {
          if (key.indexOf(type) !== -1) {
            bulletData.blackboard[key.replace(type, "")] = this.blackboard[key];
          }
        }
      }

      if(bulletData.DelayShoot)
      {
        for (let i = 0; i < bulletData.DelayShoot.length; i++) {
          if(bulletData.DelayShoot[i] == 0)
            this.createBullet(bulletData, i);
          else
          {
            if(!this.bulletList[bulletData.Id])
              this.bulletList[bulletData.Id] = [];

            this.bulletList[bulletData.Id].push({ "index" : i, "bulletData": bulletData, "createFrame": Runtime.game.currFrame + bulletData.DelayShoot[i] / one_frame_time });
          }
        }
      }
      else
        this.createBullet(bulletData, 0);
    }

    createBullet(bulletData, index){
      let startUnit = null;
      let targetUnit = null;
      if(bulletData.TargetType == 0)
        targetUnit = this.target;
      else
      {
        const targets = ActorSearcher.SearchByRadius(this.actor, this.actor.camp, bulletData.TargetType, this.actor.sightRange); //重新搜索一遍
        if (targets.length > 0) {
          targetUnit = targets[0];
        }
        else
          targetUnit = this.target;
      }


      if (bulletData.FireTarget === 0) {
        startUnit = this.actor;
      } else if (bulletData.FireTarget === 1) {
          startUnit = targetUnit;
      }
  
      if (startUnit) {
        const angleY = startUnit.angleY;
        let offsetX = bulletData.FireOffset[0];
        let offsetY = bulletData.FireOffset[1];
        let offsetZ = bulletData.FireOffset[2] ? bulletData.FireOffset[2] : 0;
  
        const dir = Mathf.getDir(angleY);
        offsetX = dir === 3 || dir === 4 ? -offsetX : offsetX;
        offsetY = dir === 2 || dir === 3 ? -offsetY : offsetY;
  
        // 计算子弹的创建位置
        const bulletX = startUnit.pos.x + offsetX;
        const bulletY = startUnit.pos.y + offsetY;

        let offset = [0 , 0];
        if(bulletData.Offset && bulletData.Offset.length > index * 2)
        {
          offset[0] = bulletData.Offset[index * 2];
          offset[1] = bulletData.Offset[index * 2 + 1];
        }

        const createContext: CreateContext = {
          actorType: ActorType.bullet,
          unitType: this.actor.createContext.unitType,
          camp: this.actor.camp,
          createActor: this.actor,
          attrs: this.actor.attrs.clone(),
          pos: new FixedVector2(bulletX, bulletY),
          y: offsetZ,
          angleY: angleY,
          offset: offset,
          res: bulletData.Res,
          config: bulletData,
          targetPos: targetUnit ? targetUnit.pos.clone() : null,
          hitY: targetUnit ? targetUnit.hitY : 0,
          scale: 1,
          group: this.actor.group,
          trackingUnit: targetUnit,
          isTracking: true,
          tureDamage: this.tureDamage
        };
  
        Runtime.gameLogic.CreateActor(createContext);
      }
    }
  
    handleSound(data) {
      let soundData;
      if (data.Id < 0) {
        soundData = {
          Url: this.blackboard.Sound,
          Times : 1,
          Duration: 0
        }
      }
      else
        soundData = JSON.parse(JSON.stringify(Runtime.configManager.Get("sound")[data.Id]));
      if (!soundData) return;
  
      soundData.type = "skill";
      Runtime.gameLogic.PlaySound(soundData);
    }

    handleAnimation(data) {
      if(this.blackboard.Animation)
        this.actor.OnAnimation(this.blackboard.Animation);
    }
  
    start() {
      this.isOver = false;
      this.flow.Start();
    }
  
    update() {
      if (this.isOver) return;
  
      this.flow.Update();
      this.isOver = this.flow.isOver;

      for (let bullets in this.bulletList) {
        for (let bullet in this.bulletList[bullets]) {
          if (this.bulletList[bullets][bullet].createFrame <= Runtime.game.currFrame) {
            this.createBullet(this.bulletList[bullets][bullet].bulletData, this.bulletList[bullets][bullet].index);
            delete this.bulletList[bullets][bullet];
          }
        }
      }
    }
  }