import { Actor } from "../logic/actor/Actor";
import { Runtime } from "../Runtime";
import { Effect } from "./Effect";
import { TransformSync } from "./TransformSync";

export class BulletView  {

    actor: Actor;
    transform: Node;
    effect: Effect;
    
    tranSync: TransformSync;

    constructor() {
        this.transform = Runtime.gameView.gameObjectPool.GetBullet();
        this.transform.layer = 1;
        Runtime.gameView.gameObjectPool.AddEffect(this.transform);
    }

    async Start() 
    {
        this.transform.name = `bullet_${this.actor.config.Id}`;
        this.transform.setScale(this.actor.config.Scale, this.actor.config.Scale);
        let self = this;
        if(this.actor.res && this.actor.res != null)
            self.effect = await Effect.Play(this.actor.res, null, self.transform);

        self.tranSync = new TransformSync(self.transform, self.actor);
        self.tranSync.start();

        if(!this.actor.isDestory)
        {
            this.actor.onDestroy = () => {
                if (this.onDestroy)
                    this.onDestroy();
            };
        }
        else
            this.onDestroy();
    }

    Update()
    {
        if (this.tranSync) this.tranSync.update();
        if (this.actor.dirAngle)
            this.transform.angle = this.actor.dirAngle;
        
    }

    
    onDestroy()
    {
        if(this.effect)
        {
            this.effect.isEnd = true;
            if(this.effect.isLoading)
                this.effect.onEnd();
            else
                console.error("effect is not load");
        }

        Runtime.gameView.gameObjectPool.release(this);
        delete this.tranSync;
    }

}


// class Effect1 extends GameObj {
//     protected $prefab: string = "prefabs/effect";
//     private ske:sp.Skeleton
//     protected onLoad(): void {
//         this.ske= this.find("ske",sp.Skeleton)
//     }

//     async init(url:string) {
//         await
//         this.ske.skeletonData = ResMgr
//     }
// }