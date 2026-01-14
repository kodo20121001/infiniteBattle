import { Node } from "cc";
import { Mathf } from '../../../utils/Mathf';
import { Runtime } from "../Runtime"
import { FixedVector2 } from "../base/fixed/FixedVector2";
import { one_frame_time } from "../Def";

export class TransformSync {

    object : any;
    actor : any;
    skt : Node;
    init;  

    constructor(object, actor, skt?) {
        this.object = object; 
        this.actor = actor; // 要同步的外部对象
        this.skt = skt;
    }

    start()
    {
        this.init = true;
        this.update()
    }

    update() {

        if(this.object)
        {
            let pos = Mathf.transform3dTo2d([this.actor.pos.x, this.actor.pos.y, 0]);
            if(this.actor.offset)
            {
                pos[0] += this.actor.offset[0];
                pos[1] += this.actor.offset[1];
            }
            let posY = pos[1] + Mathf.transformYToPosY(this.actor.y);

            if(this.init)
            {
                this.init = false;
                this.object.setPosition(pos[0], posY);
            }
            else
            {
                let lerp = Mathf.lerp(this.object.position, {x: pos[0], y: posY}, 1 / (60 * one_frame_time));
                this.object.setPosition(lerp.x, lerp.y);
            }
        }

        if(this.skt)
        {
            const dir = Mathf.getDir(this.actor.angleY)
            
            // 根据angleY来决定朝向
            if (dir <= 2) {
                // 角度在180到360度之间，角色应该朝向右
                this.skt.setScale(-Math.abs(this.skt.scale.x), this.skt.scale.y);; // 确保scale.x为负值以反向
            } else {
                // 角度在0到180度之间，角色朝向左
                this.skt.setScale(Math.abs(this.skt.scale.x), this.skt.scale.y); // 确保scale.x为正值以正向
            }
        }

    }
}
