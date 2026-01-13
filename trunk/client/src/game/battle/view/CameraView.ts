import { SceneCamera } from "../../../module/SceneCamera";
import { Mathf } from "../../../utils/Mathf";
import { ActorType } from "../Def";
import { Runtime } from "../Runtime"; // 假设这里Runtime正确配置了Three.js的环境

export class CameraView {
    
    pos
    isShake = false;

    offset;
    scale;

    orthoHeight : number;
    position: { x: number, y: number };

    constructor() {
        this.pos = { x: 0, y: 0 };
    }

    Start(){
        this.offset = { x: 0, y: 0 };
        this.scale = 1;
        const shot = Runtime.configManager.Get("camera").Shot;
        if (shot && shot.length >= 3) {
            [this.offset.x, this.offset.y, this.scale] = shot;
        }
        const cameraPos = SceneCamera.instance.node.position;
        SceneCamera.Zoom(this.scale);
        SceneCamera.LookAt(cameraPos.x + this.offset.x, cameraPos.y + this.offset.y);

        this.orthoHeight = SceneCamera.instance.orthoHeight;
        this.position = { x: cameraPos.x + this.offset.x, y: cameraPos.y + this.offset.y };
    }


    Update() {

        if (Runtime.battleModule.unLockCamera || Runtime.battleModule.battleOver) return;

        if(Runtime.battleModule.cameraFollowUnit)
        {
            this.pos.x = Runtime.battleModule.cameraFollowUnit.pos.x - 0.8;
            this.pos.y = Runtime.battleModule.cameraFollowUnit.pos.y;
        }
        else
        {
            let heroes = Object.keys(Runtime.gameLogic.actorsByType[ActorType.hero]).map(key => Runtime.gameLogic.actorsByType[ActorType.hero][key]);
            let soldiers = Object.keys(Runtime.gameLogic.actorsByType[ActorType.soldier]).map(key => Runtime.gameLogic.actorsByType[ActorType.soldier][key]);
    
            // 过滤出 camp == 1 的实例
            // const filteredHeroes = heroes.filter(actor => actor.camp === 1);
            // const filteredSoldiers = soldiers.filter(actor => actor.camp === 1);
    
            // 合并过滤后的实例数组
            const filteredActors = [...heroes, ...soldiers];
    
            // 如果没有符合条件的实例，保持 pos 不变
            if (filteredActors.length === 0) {
                return;
            }
    
            // 计算位置平均值
            let sumX = 0;
            let sumY = 0;
    
            filteredActors.forEach(actor => {
                sumX += actor.pos.x;
                sumY += actor.pos.y;
            });
    
            this.pos.x = sumX / filteredActors.length;
            this.pos.y = sumY / filteredActors.length;
        }



        if(!this.isShake)
        {
            let pos = Mathf.transform3dTo2d([this.pos.x, this.pos.y, 0]);
            let lerpPos = Mathf.lerp(SceneCamera.instance.node.position, {x: pos[0] + this.offset.x, y: pos[1] + this.offset.y}, 0.2);
            SceneCamera.LookAt(lerpPos.x, lerpPos.y);
            this.position = { x: lerpPos.x, y: lerpPos.y };
        }
    }

    async Shake(context)
    {
        this.isShake = true;
        this.orthoHeight = SceneCamera.instance.orthoHeight;
        this.position = { x: SceneCamera.instance.node.position.x, y: SceneCamera.instance.node.position.y };
        context.Power = Math.min(context.Power, 50); //限制一下震动频率
        await SceneCamera.Shake(context.Power, context.Tick, Math.ceil(context.Duration / context.Tick), context.Type);
        SceneCamera.instance.orthoHeight = this.orthoHeight;
        SceneCamera.LookAt(this.position.x, this.position.y);
        this.isShake = false;
    }
}
