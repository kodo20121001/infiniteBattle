import { Unit } from "../logic/actor/Unit";
import { Runtime } from '../Runtime';
import { ActorType } from '../Def';
import { AnimationPlayer2D } from './Animation2D';
import { TransformSync } from './TransformSync';

export class UnitView2D {
    actor = null;
    sprite = null;
    anim = null;
    tranSync = null;

    async Start() {
        try {
            const clips = await Runtime.resourceManager.loadUnit2D('1');

            this.sprite = new PIXI.Sprite(clips['idle'].tracks[0].keyframes[0].value);
            this.sprite.anchor.set(0.5);
            this.anim = new AnimationPlayer2D(clips, this.sprite);
            this.tranSync = new TransformSync(this.sprite, this.actor);
            Runtime.stage.addChild(this.sprite);

            Runtime.camera2D.position.set(this.sprite.position.x, this.sprite.position.y);

            if (this.actor) {
                this.actor.animationHandler = (name) => {
                    if (this.anim)
                        this.anim.play(name);
                };
            }
        } catch (error) {
            console.error('Failed to load unit:', error);
        }
    }

    Update() {
        const delta = Runtime.ticker.deltaTime;

        if (this.anim)
            this.anim.update(delta);
        if (this.tranSync)
            this.tranSync.lateUpdate();
    }
}