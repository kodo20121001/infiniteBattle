import { sp } from "cc";
import { Actor } from "../logic/actor/Actor";
import { Mathf } from "../../../utils/Mathf";
import { Runtime } from "../Runtime";
import { PrimaryAttr } from "../logic/component/BattleAttributes";

export class AnimationSpine {
    object : sp.Skeleton;
    actor : Actor;
    currAnimationName : any;
    currActionName : any;
    timeScale : number = 1;
    isPause: boolean;
    constructor(object : sp.Skeleton, actor) {
        this.object = object;
        this.actor = actor
        this.currAnimationName = null; // 当前正在播放的实际动画名称
        this.currActionName = null; // 当前的抽象动作名称
        this.object.setEndListener(this.onActionEnd.bind(this));
        this.isPause = false;
    }
    
    start()
    {
        if (this.actor.currAnimation)
            this.play(this.actor.currAnimation)
    }

    update() {
        let newAnimation = this.getAnimation(this.currActionName);
        if (newAnimation && newAnimation.name != this.currAnimationName)
           this.setAnimation(newAnimation.name, newAnimation.loop, newAnimation.inheritFrame, newAnimation.timeScale);
        if(!this.isPause)
            this.Resume();
    }

    play(name) {
        this.currActionName = name
        let newAnimation = this.getAnimation(this.currActionName)
        if (newAnimation) {
            this.setAnimation(newAnimation.name, newAnimation.loop, newAnimation.inheritFrame, newAnimation.timeScale);
        }
    }

    setAnimation(name, loop, inheritFrame, timeScale = 1) {
        if(this.object.skeletonData.getAnimsEnum()[name])
        {
            if (inheritFrame) {
                let currentTrack = this.object.getCurrent(0);
                let currentTime = currentTrack ? currentTrack.trackTime : 0;
                this.object.setAnimation(0, name, loop).trackTime = currentTime; 
            } else {
                this.object.setAnimation(0, name, loop);
            }
            this.timeScale = timeScale;
            this.currAnimationName = name;
        }
        else
        {
            console.error( this.object.skeletonData.name +' : Animation ' + name + ' not found');
        }
       
    }

    getAnimation(name) {

        let dir = Mathf.getDir(this.actor.angleY);

        const facingBack = dir === 1 || dir === 4;

        // let dir = Mathf.fromAngle(this.actor.angleY)
        // let dir1 = Mathf.transform3dTo2d([dir[0], dir[1], 0]);
        // let angle = Mathf.toAngle(dir1)

        // angle = angle % 360;
        // if(angle < 0) angle += 360;
        // const facingBack = !(angle > 90 && angle < 270);
    
        switch (name) {
            case 'idle':
                return {
                    name: facingBack ? 'Idlewar_Back' : 'Idlewar',
                    loop: true,
                    inheritFrame: this.currActionName == name,
                    timeScale: 1
                };
            case 'walk':
                return {
                    name: facingBack ? 'Walk_Back' : 'Walk',
                    loop: true,
                    inheritFrame: this.currActionName == name,
                    timeScale: 1
                };
            case 'run':
                return {
                    name: facingBack ? 'Run_Back' : 'Run',
                    loop: true,
                    inheritFrame: this.currActionName == name,
                    timeScale: 1
                };
            case 'Attack1':
                return {
                    name: facingBack ? 'Attack1_Back' : 'Attack1',
                    loop: false,
                    inheritFrame: false,
                    timeScale: this.actor.attrs?.getPrimaryAttribute(PrimaryAttr.AttackSpeed) > 0? Math.abs(this.actor.attrs.getPrimaryAttribute(PrimaryAttr.AttackSpeed) / 100) : 1
                };
            case 'Skill1':
                return {
                    name: facingBack ? 'Skill1_Back' : 'Skill1',
                    loop: false,
                    inheritFrame: false,
                    timeScale: 1
                };
            case 'dead':
                return {
                    name: 'Dead',
                    loop: false,
                    inheritFrame: false,
                    timeScale: 1
                }
            case 'hit':
                return {
                    name: 'Hit',
                    loop: false,
                    inheritFrame: false,
                    timeScale: 1
                }
            default:
                return null;
        }
    }

    Pause()
    {
        this.isPause = true;
        this.object.timeScale = 0;
    }

    Resume()
    {
        this.isPause = false;
        this.object.timeScale = this.timeScale * (Runtime.game.gameSpeed? Runtime.game.gameSpeed : 1);
    }


     onActionEnd(x: TrackEvent) {
        this.currActionName = null;
    }
}