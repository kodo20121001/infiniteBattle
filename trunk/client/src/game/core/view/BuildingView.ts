import { instantiate, Prefab, ProgressBar, Node, sp, Vec3 } from "cc";
import { Actor } from "../logic/actor/Actor";
import { AnimationSpine } from "./AnimationSpine";
import { TransformSync } from "./TransformSync";
import { HomeScene } from "../../../module/home/HomeScene";
import { ResMgr } from "../../../manager/ResMgr";
import { Mathf } from "../../../utils/Mathf";
import { Runtime } from "../Runtime";
import { BuffType } from "../logic/component/Buffs";
import { Effect } from "./Effect";
import { PrimaryAttr } from "../logic/component/BattleAttributes";


export class BuildingView {
    
    actor: Actor;
    animation : AnimationSpine;
    tranSync: TransformSync;
    transform: Node;
    hpBar: ProgressBar;
    hpBarOffset: Vec3;

    isMeng: boolean = false;

    nowStatusApply: number = 0;
    nowStatus: number = 0;
    nowEffect : Effect;

    selfEffectList: Effect[] = [];
    selfEffectRes2Count

    Start() {

        this.selfEffectRes2Count = {};

        let res = 'prefabs/build/' + this.actor.unitTypeConfig.Prefab;
        if(this.actor.level && this.actor.buildingConfig)
        {
            let url = Runtime.configs.GetBuildingRes(this.actor.buildingConfig.BuildingId, this.actor.level);
            if(url)
                res ='prefabs/build/' + url;
        }

        this.LoadUnitSpine(res);

        this.actor.animationHandler = (name) => {
            if (this.animation)
            {
                if(name == "dead" || this.animation.currActionName != "hit")
                    this.animation.play(name);
            }
                
        };

        this.actor.unitStatus.onStatusApply = (type: BuffType) => {
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
        let pos = Mathf.transform3dTo2d([self.actor.pos.x, self.actor.pos.y, 0]);
        self.transform.setPosition(pos[0], pos[1]);
        let scale = self.actor.scale;
        self.transform.setScale(scale, scale);
        self.transform["$$static"] = true;
        HomeScene.ins.AddEntity(self.transform);
        let spine = self.transform.getComponentInChildren(sp.Skeleton);
        self.animation = new AnimationSpine(spine, self.actor);
        self.tranSync = new TransformSync(self.transform, self.actor, spine.node);
        self.tranSync.start();
        self.animation.start();

        self.transform['name'] = "building_" + self.actor.unitTypeConfig.Prefab;

        self.LoadingHpBar();
    }

    Update()
    {
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
                //this.hpBar.node.setPosition(this.transform.position.clone().add(this.hpBarOffset));//建筑暂时没有移动
            }
        }
    }   

    onDestroy()
    {
        this.hpBar?.node.destroy();
        delete this.tranSync;
        delete this.animation;
        this.transform?.destroy();
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


    async LoadingHpBar()
    {
        let self = this;
        let url = (this.actor.buildingConfig.BuildingType == 12 || this.actor.buildingConfig.BuildingType == 1)? "prefabs/battle/item/mengHpBar": "prefabs/battle/item/taHpBar";
        let prefab: Prefab = await ResMgr.GetResources<Prefab>(url);
        let tmp = instantiate(prefab);
        tmp.layer = self.transform.layer;

        Runtime.gameView.gameObjectPool.AddUI(tmp);
        self.hpBarOffset = new Vec3(self.actor.unitTypeConfig.BloodHight[0], self.actor.unitTypeConfig.BloodHight[1]);
        tmp.setScale(self.actor.unitTypeConfig.BloodZoom, self.actor.unitTypeConfig.BloodZoom);
        self.hpBar = tmp.getComponent(ProgressBar);
        self.hpBar.progress = 1;
        tmp.setPosition(self.transform.position.clone().add(self.hpBarOffset))

    }

}