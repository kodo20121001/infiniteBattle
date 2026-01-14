import { Runtime } from "../Runtime";
import { Action, FrameType } from "./Action";
import { ActorSearcher } from "./ActorSearcher";
import { Unit } from "./actor/Unit";

export class Skill {
  actor: Unit;
  blackboard: any;
  action: Action;

  cd: number;
  startTime: number;

  isOver: boolean

  target: Unit | null;

  skillId: number;
  level: number;
  config

  constructor(actor: Unit, skillId: number, level: number) {
    this.actor = actor;
    this.skillId = skillId;
    this.level = level;
    this.blackboard = {}
    this.initSkill();
  }

  initSkill(){
    this.config = Runtime.configs.Get("skill")[this.skillId];
    if (this.config) 
    {
        this.startTime = this.config.Type == 1 ? -10 : 0; // 开始时间

        let actionId = this.config.ActionId
        let endTime = this.config.EndTime
        this.blackboard.Animation = this.config.Prefab
        this.blackboard.Sound = Runtime.configs.GetSkillSound(this.skillId, this.level)
        this.cd = this.config.CD;
        const attr = Runtime.configs.Get("skillAttr")[this.skillId * 100 + this.level]
        if(attr)
        {
            if(attr.CD > 0)
              this.cd = attr.CD
            if(attr.ActionId > 0)
              actionId = attr.ActionId
            if(attr.EndTime > 0)
              endTime = attr.EndTime
            if(attr.TureDamage)
              this.blackboard.tureDamage = attr.TureDamage

            //黑板变量和对应的值
            if(attr.Params)
            {
                for (let i = 0; i < attr.Params.length; i++) {
                  this.blackboard[attr.Params[i]] = attr.Value[i]
                }
            }
        }

        let actionCfg = JSON.parse(JSON.stringify(Runtime.configs.Get("action")[actionId]))
        Skill.AddFrameEvent(actionCfg, endTime, this.blackboard.Animation, this.blackboard.Sound)
        this.action = new Action(actionCfg.FrameEvents, this.actor, this.blackboard);
    }
  }

  public static AddFrameEvent(action, endTime: number, animation?, sound?){
    let tickTimer = 0;
    action.FrameEvents.forEach(element => {
        tickTimer = Math.max(element.TimeTick, tickTimer);
    });
    action.FrameEvents.push({
        Id: action.ActionId,
        TimeTick:  Math.max(endTime, tickTimer),
        Ratio: 0,
        ObjType: FrameType.End
    });

    if(animation)
    {
      action.FrameEvents.push({
        Id: action.ActionId,
        TimeTick:  0,
        Ratio: 0,
        ObjType: FrameType.Animation
    });
    }
    if(sound)
    {
      action.FrameEvents.push({
        Id: -1,
        TimeTick:  0,
        Ratio: 0,
        ObjType: FrameType.Sound
    });
    }
}


  LockTarget() {
    let targets;

    if (this.actor.isTaunted) {
      let tauntSource = this.actor.tauntSource;
      if (tauntSource) {
        targets = ActorSearcher.SearchByUnit(this.actor, this.actor.camp, this.config.TargetType, tauntSource);
      }
    } else {
      targets = ActorSearcher.SearchByRadius(this.actor, this.actor.camp, this.config.TargetType, this.actor.sightRange);
    }

    if (targets && targets.length > 0) {
      this.target = targets[0];
      return true;
    } else {
      this.target = null;
      return false;
    }
  }

  IsCDReady() {
    return Runtime.game.currTime - this.startTime >= this.cd;
  }

  GetRemainingCDTime() {
    const elapsedTime = Runtime.game.currTime - this.startTime;
    const remainingTime = this.cd - elapsedTime;
    return remainingTime > 0 ? remainingTime : 0;
  }

  GetCDPercent() {
    return this.cd > 0 ? this.GetRemainingCDTime() / this.cd : 0;
  }

  GetDisWithTarget() {
    if (!this.target) return 0;
    let distance = this.target.pos.distanceTo(this.actor.pos);
    if(this.target.radius)
      distance -= this.target.radius;
    return distance;
  }

  GetAngleWithTarget() {
    if (!this.target) return 0;
    let dir = this.target.pos.sub(this.actor.pos).normalize();
    return dir.toAngle();
  }

  IsTargetInRange() {
    if (!this.target) return false;
    let distance = this.actor.pos.distanceTo(this.target.pos) - this.target.size;
    return distance <= this.config.Range;
  }

  Start() {
    this.isOver = false;
    this.startTime = Runtime.game.currTime;
    this.action.target = this.target
    this.action.start(); // 在 start 时传递 target 给 action
  }

  Update() {
    if(this.isOver) return;

    this.action.update();
    this.isOver = this.action.isOver
  }
}