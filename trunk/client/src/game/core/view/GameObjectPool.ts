import { Effect } from "./Effect";
import { BulletView } from "./BulletView";
import { SpriteLabel } from "../../engine/base/SpriteLabel";

export class GameObjectPool {

    private bulletsPool: any[] = [];
    private effectLay: Node;
    private effectBgLay: Node;
    private poolLay: Node;
    private uiLay: Node;
    // 存储特效对象的池
    private effectsPool: { [prefab: string]: Effect[] } = {};
    private tickerPool:{ [prefab: string]: any[] } = {};

    constructor()
    {
      // this.poolLay = new Node("PoolLay");
      // this.poolLay.active = false;
      // HomeScene.ins.AddEntity(this.poolLay);

      // this.effectLay = new Node("EffectLay");
      // this.effectLay.layer = 1;
      // this.effectLay.setPosition(0, 1);
      // HomeScene.ins.AddEntity(this.effectLay);

      // this.effectBgLay = new Node("effectBgLay");
      // this.effectBgLay.layer = 1;
      // this.effectBgLay.setPosition(0, 100000);
      // HomeScene.ins.AddEntity(this.effectBgLay);


      // this.uiLay = new Node("UILay");
      // this.uiLay.layer = 1;
      // this.uiLay.setPosition(0, 0);
      // HomeScene.ins.AddEntity(this.uiLay);
    }
    // // 存储音效对象的池
    // private soundEffectsPool: SoundEffect[] = [];

    // 创建特效的方法，可以根据需要自定义
    private async createEffect(res: string): Promise<Node> {
      let prefab = await ResMgr.GetResources<Prefab>("prefabs/home/Effect");
      let item = instantiate(prefab);
      let url = path.join("spine/effect/", res, res);
      let skeletonData = await ResMgr.LoadResAbSub(url, sp.SkeletonData);
      item.getChildByPath("ske").getComponent(sp.Skeleton).skeletonData = skeletonData;
      item.addComponent(Effect);
      return item;
    }

    private createBullet(): Node {
      return new Node("Bullet");
    }

    private createTicker(font: string): Node {
      let transform = new Node();
      transform.name = "TickerView";
      transform.layer = 1;
      let label = transform.addComponent(SpriteLabel);
      label.font = font;
      return transform;
    }

    // // 创建音效的方法，可以根据需要自定义
    // private createSoundEffect(): SoundEffect {
    //   return {
    //     // 对象初始化时的一些属性
    //     type: "fire",
    //     volume: 1.0,
    //   };
    // }
  

  
    // 获取一个可用的特效对象
    public async GetEffect(res: string) : Promise<Node>{
      if(!this.hasAvailableEffects(res))
      {
        let effect = await this.createEffect(res);
        return effect;
      }
      else
      {
        let effectToUse = this.effectsPool[res].pop();
        effectToUse.transform.active = true;
        return effectToUse.transform;
      }
    }

    public GetBullet(): Node {
      let bullet = this.bulletsPool.pop();
      if(bullet == undefined)
      {
        bullet = this.createBullet();
      }
      bullet.active = true;
      return bullet;
    }

    public GetTicker(font: string): Node {
      if(!this.hasAvailableTickers(font))
        {
          let ticker = this.createTicker(font);
          return ticker;
        }
        else
        {
          let ticker = this.tickerPool[font].pop();
          ticker.active = true;
          return ticker;
        }  
    }
  
    // // 获取一个可用的音效对象
    // public acquireSoundEffect(): SoundEffect {
    //   // 从池中获取一个音效对象，并将其标记为使用中
    //   const soundEffectToUse = this.soundEffectsPool.shift();
    //   soundEffectToUse.inUse = true;
    //   return soundEffectToUse;
    // }
  

    public release(any)
    {
      if(any instanceof Effect)
      {
        this.releaseEffect(any);
      }
      else if(any instanceof BulletView)
      {
        this.releaseBullet(any);
      }
      else if(any instanceof SpriteLabel)
      {
        this.releaseTicker(any);
      }
      else
      {
        console.error("release: ", any);
      }
    }

    // 释放一个特效对象
    private releaseEffect(effectToRelease: Effect) {

      if(this.poolLay)
      {
        // 将释放的效果对象重新添加回池中，并重置其属性
        if(this.effectsPool[effectToRelease.url] == undefined)
          this.effectsPool[effectToRelease.url] = [];
        effectToRelease.transform.active = false;
        this.poolLay?.addChild(effectToRelease.transform);
        this.effectsPool[effectToRelease.url].push(effectToRelease);
        //effectToRelease.inUse = false;
      }
      else
        effectToRelease.onDestory();
   
    }

    private releaseBullet(bulletToRelease: BulletView) {
      if(this.poolLay)
      {
        this.bulletsPool.push(bulletToRelease.transform);
        bulletToRelease.transform.active = false;
        this.poolLay?.addChild(bulletToRelease.transform);
      }
      else
      {
        delete bulletToRelease.transform;
      }
    }

    private releaseTicker(tickerToRelease: SpriteLabel) {
      if(this.poolLay)
      {
        // 将释放的效果对象重新添加回池中，并重置其属性
        if(this.tickerPool[tickerToRelease.font] == undefined)
          this.tickerPool[tickerToRelease.font] = [];
        tickerToRelease.node.active = false;
        this.poolLay?.addChild(tickerToRelease.node);
        this.tickerPool[tickerToRelease.font].push(tickerToRelease.node);
      }
      else
      {
        delete tickerToRelease.node;
      }
    }
  
    // // 释放一个音效对象
    // public releaseSoundEffect(soundEffectToRelease: SoundEffect): void {
    //   // 将释放的音效对象重新添加回池中，并重置其属性
    //   this.soundEffectsPool.push(soundEffectToRelease);
    //   soundEffectToRelease.inUse = false;
    // }
  

  
    // 检查池中是否还有可用特效对象
    private hasAvailableEffects(res: string): boolean {
      return this.effectsPool[res] != undefined && this.effectsPool[res].length > 0;
    }

    private hasAvailableTickers(font: string): boolean {
      return this.tickerPool[font] != undefined && this.tickerPool[font].length > 0;
    }
  
    // // 检查池中是否还有可用音效对象
    // public hasAvailableSoundEffects(): boolean {
    //   return this.soundEffectsPool.length > 0;
    // }

    AddUI(node: Node)
    {
      this.uiLay.addChild(node);
    }

    AddEffect(node: Node)
    {
      this.effectLay.addChild(node);
    }

    AddBgEffect(node: Node)
    {
      this.effectBgLay.addChild(node);
    }

    GetEffectBgLay(): Node
    {
      return this.effectBgLay;
    }

    End(){
      console.log("GameObjectPool End");
      
      for(let key in this.effectsPool)
      {
        this.effectsPool[key].forEach(effect => {
          if(effect != undefined)
            effect.onDestory();
        })
      }

      this.effectsPool = {};
      this.tickerPool = {};
      this.bulletsPool = [];

      this.uiLay?.removeAllChildren();
      delete this.uiLay;

      this.effectLay?.removeAllChildren();
      delete this.effectLay;

      this.effectBgLay?.removeAllChildren();
      delete this.effectBgLay;

      this.poolLay?.removeAllChildren();
      delete this.poolLay;

    }
  }
  
  