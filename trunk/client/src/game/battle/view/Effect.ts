import { ResMgr } from "../../../manager/ResMgr";
import { Actor } from "../logic/actor/Actor";
import { Node, sp, AnimationClip, path, Component, Prefab, instantiate, isValid } from 'cc';
import { Runtime } from "../Runtime";
import { HomeScene } from "../../../module/home/HomeScene";
import { Mathf } from "../../../utils/Mathf";

export class Effect extends Component {

    actor: Actor;
    private $skeBody: sp.Skeleton;
    loop: number;
    count: number;
    
    duration: number = 0;
    actions;
    private startTime: number = 0;

    ins: Effect;

    Id;
    parent;
    transform: Node;

    isEnd: boolean = false;

    data;
    url: string;
    isLoading: boolean = false;
    isPlaying: boolean = false;
    _onActionEnd;

    Start() {
        this.playAni();
    }

    protected update(dt: number): void {
        if (this.duration > 0) {
            if (Runtime.game.currTime - this.startTime >= this.duration) {
                this.isEnd = true;
            }
        }

        if (this.isLoading) {
            if (this.isEnd)
                this.onEnd();
        }
    }

    static async Play(res: string, data?: any, parent?: Node): Promise<Effect> {
        let node = await Runtime.gameView.gameObjectPool.GetEffect(res);
        let effect = node.getComponent(Effect);
        effect.ins = effect;
        effect.url = res;
        effect.data = data;
        effect.startTime = Runtime.game.currTime;//开始时间从创建开始算起
        effect.transform = node;
        effect.isLoading = true;
        effect.isEnd = false;
        node.name = res;
        if (parent)
        {
            if(parent.isValid)
            {
                parent.addChild(node);
                effect.parent = parent;
            }
            else
            {
                effect.isEnd = true;
                return;
            }
        }

        effect.Init();

        return effect;
    }


    playAni() {
        if (this.actions && this.actions["Back"])
            this.$skeBody.setAnimation(0, "Back", true);

        this.isPlaying = true;

    }

    onEnd(){
        if(this._onActionEnd){
            this._onActionEnd = null;
        }
        this.$skeBody?.clearTracks();
        Runtime.gameView.gameObjectPool.release(this);
    }

    onDestory() {
        this.$skeBody?.onDestroy();
        this.destroy();
        delete this.transform;
    }

    // 播放一个周期回调 
    onActionEnd(x: TrackEvent) {
        this.loop++;
        if (this.count > 0) {
            if (this.loop >= this.count) {
                this.loop = 0;
                this.onEnd();
            }
        }

    }

    SetInitInfo(data) {
        let attacker = null;
        switch (data.Depth) {
            case 0://角色下层
                attacker = Runtime.gameView.GetActorView(data.actorId);
                if (!attacker || !attacker.transform || !attacker.transform.isValid) {
                    this.isEnd = true;
                    console.warn("#0攻击角色错误！联系前端");
                    return;
                }
                attacker.transform?.addChild(this.transform);
                this.transform.setSiblingIndex(0);
                this.parent = attacker.transform;
                break;
            case 1://角色上层
                attacker = Runtime.gameView.GetActorView(data.actorId);
                if (!attacker || !attacker.transform || !attacker.transform.isValid) {
                    this.isEnd = true;
                    console.warn("#1攻击角色错误！联系前端");
                    return;
                }
                attacker.transform?.addChild(this.transform);
                this.parent = attacker.transform;
                break;
            case 2://影子层
                HomeScene.ins.AddShadow(this.transform);
                break;
            case 3://场景动态层
                HomeScene.ins.AddEntity(this.transform);
                break;
            case 4://天空层
                HomeScene.ins.AddSkyObj(this.transform);
                break;
            case 5:
                Runtime.gameView.gameObjectPool.AddBgEffect(this.transform);
                this.parent = Runtime.gameView.gameObjectPool.GetEffectBgLay();
                break;
            default://特效层
                Runtime.gameView.gameObjectPool.AddEffect(this.transform);
                break;
        }

        let viewPos = Mathf.transform3dTo2d([data.pos.x, data.pos.y, 0]);
        if (data.Offset && data.Offset.length == 2) {
            viewPos[0] += data.Offset[0];
            viewPos[1] += data.Offset[1];
        }

        if(data.hitY)
            viewPos[1] += Mathf.transformYToPosY(data.hitY);

        if (this.parent) {
            viewPos[0] -= this.parent.position.x;
            viewPos[1] -= this.parent.position.y;
        }

        this.transform.setPosition(viewPos[0], viewPos[1]);
        if (data.Scale)
            this.transform.setScale(data.Scale, data.Scale);

        this.count = data.Times;
        this.duration = data.Duration;
        this.Id = data.Id;
        this.transform.name = `effect_${data.Id}`;
    }

    private Init() {
        this.$skeBody = this.transform.getChildByPath("ske").getComponent(sp.Skeleton);
        this.$skeBody.node.setScale(0.16, 0.16);
        this._onActionEnd = this.onActionEnd.bind(this);
        this.$skeBody.setCompleteListener(this._onActionEnd);
        this.actions = this.$skeBody.skeletonData?.getAnimsEnum();
        this.loop = 0;
        this.duration = 0;

        // if(Runtime.battleModule.battleOver)
        // {
        //     this.onDestory();
        //     return;
        // }

        if (this.data)
            this.SetInitInfo(this.data);
        this.Start();
    }

}