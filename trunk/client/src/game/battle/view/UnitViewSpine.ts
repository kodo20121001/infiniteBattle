import { Runtime } from '../Runtime';
import { ActorType } from '../Def';
import { TransformSync } from './TransformSync';
import { AnimationSpine } from './AnimationSpine';
import { sp, animation, Node, sys, find, Prefab, instantiate, ProgressBar, Quat, Vec3, Label, Sprite, SpriteFrame, tween, Vec2 } from 'cc';
import { HomeScene } from '../../../module/home/HomeScene';
import { folder_skill, ResMgr } from '../../../manager/ResMgr';
import { Actor } from '../logic/actor/Actor';
import { BuffType } from '../logic/component/Buffs';
import { Effect } from './Effect';
import { PrimaryAttr } from '../logic/component/BattleAttributes';

export class UnitViewSpine {

    animation : AnimationSpine;
    tranSync: TransformSync;
    actor: Actor;
    transform: Node;
    hpBar: ProgressBar;
    hpBarOffset: Vec3;
    skillIcon: Node;
    skillIconOffset: Vec3;
    text: Label;

    maxHp: number;

    castSkillId: number = 0;

    nowStatusApply: number = 0;
    nowStatus: number = 0;
    nowEffect : Effect;

    selfEffectList: Effect[] = [];
    selfEffectRes2Count

    Start() {
        this.selfEffectRes2Count = {};

        let res = 'prefabs/hero/' + this.actor.unitTypeConfig.Prefab;
        if(this.actor.actorType == ActorType.soldier)
            res = this.actor.camp == 1 ? res + "_B" : res + "_R";
        this.LoadUnitSpine(res);

        this.actor.animationHandler = (name) => {
            if (this.animation)
                this.animation.play(name);
        };

        if(!this.actor.isDestory)
            {
                this.actor.onDestroy = () => {
                    if (this.onDestroy)
                        this.onDestroy();
                };
            }
        
        this.actor.castSkillHandler = (skillId) => {
            this.CastSkill(skillId);
        }

        this.actor.unitStatus.onStatusApply = (type: BuffType) => {
            if(this.actor.isDestory) return;
            if(this.nowEffect)
                this.nowEffect.isEnd = true;
            this.StatusApply(type);
        }

        this.actor.unitStatus.onStatusRemove = (type: BuffType) => {
            if(this.nowEffect)
                this.nowEffect.isEnd = true;

            this.animation?.Resume();
        }

        this.actor.buffs.OnPlayEffect = async (res) => {
            if(this.selfEffectRes2Count[res])
                this.selfEffectRes2Count[res] += 1;
            else
            {
                this.selfEffectRes2Count[res] = 1;
                this.selfEffectList.push(await this.playEffect(res));
            }
        }

        this.actor.buffs.OnRemoveEffect = (res) => {
            if(this.selfEffectRes2Count[res])
            {
                this.selfEffectRes2Count[res] -= 1;
                if(this.selfEffectRes2Count[res] == 0)
                {
                    this.selfEffectList.forEach((effect) => {
                        if(effect.url == res)
                        {
                            effect.isEnd = true;
                            this.selfEffectList.splice(this.selfEffectList.indexOf(effect), 1);
                        }
                    })
                }
            }
        }
    
    }

    async LoadUnitSpine(res : string){
        let self = this
        let prefab: Prefab = await ResMgr.GetResources<Prefab>(res);
        self.transform = instantiate(prefab);
        let scale = self.actor.scale;
        self.transform.setScale(scale, scale);
        self.transform['name'] = 'battleActor_' + self.actor.actorId;
        HomeScene.ins.AddEntity(self.transform);
      
        let spine = self.transform.getComponentInChildren(sp.Skeleton);
        self.animation = new AnimationSpine(spine, self.actor);
        self.tranSync = new TransformSync(self.transform, self.actor, spine.node);
        self.animation.start()
        self.tranSync.start()

        //if(self.actor.actorType == ActorType.hero)
        self.LoadingHpBar();

        if(self.actor.skills && self.actor.unitTypeConfig.Skill2 != undefined)
        {
            const skillToLoad = self.actor.skills.find(skill => skill.skill_id === self.actor.unitTypeConfig.Skill2);

            if (skillToLoad != undefined) 
                self.LoadingSkill(skillToLoad.skill_id, skillToLoad.level);
        }
    }
    

    Update() {

        if (this.actor.isDestory) return;

        if (this.animation) this.animation.update();
        if (this.tranSync) this.tranSync.update();

        // 更新血条
        if (this.hpBar)
        {
            if(this.actor.isDie)
                this.hpBar.node.active = false;
            else
            {
                this.hpBar.node.active = true;
                this.hpBar.progress = this.actor.hp / this.actor.attrs.getPrimaryAttribute(PrimaryAttr.HPMax);
                this.hpBar.node.setPosition(this.transform.position.clone().add(this.hpBarOffset));
            }
        }

        if(this.skillIcon)
        {
            if(!this.actor.isDie)
                this.skillIcon.setPosition(this.transform.position.clone().add(this.skillIconOffset));
        }

    }

    async LoadingHpBar()
    {
        let self = this;
        let url = this.actor.camp == 1? "prefabs/battle/item/SelfHpBar": "prefabs/battle/item/OtherHpBar";
        let prefab: Prefab = await ResMgr.GetResources<Prefab>(url);
        let tmp = instantiate(prefab);
        tmp.layer = self.transform.layer;

        Runtime.gameView.gameObjectPool.AddUI(tmp);
        //self.transform.addChild(tmp);
        self.hpBarOffset = new Vec3(self.actor.unitTypeConfig.BloodHight[0], self.actor.unitTypeConfig.BloodHight[1]);
        //tmp.setPosition(self.actor.unitTypeConfig.BloodHight[0], self.actor.unitTypeConfig.BloodHight[1]);
        tmp.setScale(self.actor.unitTypeConfig.BloodZoom, self.actor.unitTypeConfig.BloodZoom);
        self.hpBar = tmp.getComponent(ProgressBar);
        self.hpBar.progress = 1;
        tmp.setPosition(self.transform.position.clone().add(self.hpBarOffset))
    }


    async LoadingSkill(skillId, skillLevel)
    {
        this.castSkillId = skillId;
        let icon = Runtime.configManager.GetSkillIcon(skillId, skillLevel)
        if(icon == undefined)
            return;

        let self = this;
        let url = "prefabs/battle/item/skill";
        let prefab: Prefab = await ResMgr.GetResources<Prefab>(url);
        self.skillIcon = instantiate(prefab);
        self.skillIcon.name = "skillIcon";

        Runtime.gameView.gameObjectPool.AddUI(self.skillIcon);
        self.skillIconOffset = new Vec3(0, self.actor.unitTypeConfig.BloodHight[1] + 120);
        self.skillIcon.active = false;
        self.skillIcon.setPosition(self.transform.position.clone().add(self.skillIconOffset))
        self.skillIcon.getChildByName('icon').getComponent(Sprite).spriteFrame = await ResMgr.LoadResAbSub<SpriteFrame>( `${folder_skill}${icon.toString()}/spriteFrame`, SpriteFrame);

    }

    
    private CastSkill(skillId){
        if(skillId == this.castSkillId)
        {
            if(this.skillIcon)
            {
                this.skillIcon.active = true;
                this.skillIcon.setScale(0.14, 0.14);
                tween(this.skillIcon).to(0.2, {scale: new Vec3(0.56, 0.56, 1)}).call(()=>{
                    setTimeout(() => {
                        this.skillIcon.active = false;
                    }, 200);
                }).start();
            }
        }
    }

    

    private async StatusApply(type: BuffType){
        let res
        switch (type) {
            case BuffType.Heal:
                break;
            case BuffType.Dizzy:
                res = "ef3_000_Vertigo"
                this.animation?.play("idle");
                break;
            case BuffType.Frozen:
                res = "ef3_000_Frost"
                this.animation?.Pause();
                break;
            case BuffType.Bleeding:
                res = "ef3_000_Bleed"
                break;
            case BuffType.Burning:
                res = "ef3_000_Burn"
                break;
            case BuffType.Blinded:
                break;
            case BuffType.Entangled:
                break;
            case BuffType.Silenced:
                break;
            case BuffType.Taunted:
                break;
            default:
                break;
        }
        if(res)
            this.nowEffect = await this.playEffect(res);

    }


    onDestroy()
    {
        this.hpBar?.node.destroy();
        this.skillIcon?.destroy();
        delete this.tranSync;
        delete this.animation;
        this.transform?.destroy();
    }

    async playEffect(res: string)
    {
        let effectData = {
            Res : res,
            Depth: 1,
            actorId: this.actor.actorId,
            Scale: 1,
            Times: 0,
            Duration: 0,
            Id: res,
            pos: this.actor.pos.clone(),
            hitY: this.actor.hitY
        }

        return await Effect.Play(effectData.Res, effectData, this.transform);
    }

}