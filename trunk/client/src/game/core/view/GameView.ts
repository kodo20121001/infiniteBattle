import { ActorType } from "../Def";
import { Runtime } from "../Runtime";
import { BuildingView } from "./BuildingView";
import { BulletView } from "./BulletView";
import { CameraView } from "./CameraView";
import { Effect } from './Effect';
import { MapView } from "./MapView";
import { Audio } from "./Audio";
import { TickerView } from "./TickerView";
import { GameObjectPool } from "./GameObjectPool";
import { UnitView2D } from "./UnitView2D";


export class GameView
{
    cameraView;
    actorViews = {}

    tickerView: TickerView

    gameObjectPool: GameObjectPool


    Start()
    {
        this.cameraView = new CameraView
        this.tickerView = new TickerView
        this.gameObjectPool = new GameObjectPool
        
        Runtime.gameLogic.onCreateActor = this.onCreateActor.bind(this)
        Runtime.gameLogic.onDestroyActor = this.onDestroyActor.bind(this)
        Runtime.gameLogic.onPlayEffect = this.onPlayEffect.bind(this)
        Runtime.gameLogic.onPlaySound = this.onPlaySound.bind(this)
        Runtime.gameLogic.OnPlayTicker = this.onPlayTicker.bind(this)
        Runtime.gameLogic.OnPlayShake = this.onPlayShake.bind(this)


        for (const type in Runtime.gameLogic.actorsByType)
        {
            for (const id in Runtime.gameLogic.actorsByType[type])
            {
                const actor = Runtime.gameLogic.actorsByType[type][id]
                this.CreateActorView(actor)
            }
        }

        this.cameraView.Start()
        //this.tickerView.Start()
    }

    Update()
    {
        for (let key in this.actorViews) {
            this.actorViews[key].Update();
        }

        this.cameraView.Update()
    }

    onCreateActor(actor)
    {
        this.CreateActorView(actor)
    }

    onDestroyActor(actor)
    {
        this.DestroyActorView(actor)
    }

    onPlayEffect(data)
    {
        Effect.Play(data.Res, data)
    }

    onPlaySound(data)
    {
        data.Url = `${folder_sound}skill/${data.Url}`;
        if(data.type == "skill")
        {
            AudioMgr.PlaySkill(data.Url, data.Times, data.Duration);
        }
        else
            AudioMgr.PlayOnce({
                url: data.Url,
                num: data.Times,
                group: AudioGroup.Sound
            });
    }

    onPlayTicker(data)
    {
        this.tickerView.Play(data);
    }

    onPlayShake(data)
    {
        this.cameraView.Shake(data);
    }

    CreateActorView(actor)
    {
        let actorView
        if (actor.actorType == ActorType.hero)
        {
            actorView = new UnitView2D()
        }
        else if (actor.actorType == ActorType.map)
        {
            actorView = new MapView()
            //instance.addComponent(Operate)
        }
        else if (actor.actorType == ActorType.soldier)
        {
            actorView = new UnitView2D()
        }
        else if (actor.actorType == ActorType.bullet)
        {
            actorView = new BulletView()
        }
        else if (actor.actorType == ActorType.building)
        {
            actorView = new BuildingView()
        }
        else
        {
            console.error("actor type not support")
            return
        }

        actorView.actor = actor
        actorView.Start()
        this.actorViews[actor.actorId] = actorView
    }

    DestroyActorView(actor)
    {
        if (this.actorViews[actor.id]) {
            delete this.actorViews[actor.actorId];
        }
    }

    CreateCamera()
    {
    }

    GetActorView(actorId)
    {
        if (this.actorViews[actorId])
        {
            return this.actorViews[actorId]
        }
        else
        {
            console.error("actor not exist")
            return null
        }
    }

    End()
    {
        this.tickerView?.End();
        this.gameObjectPool?.End();
        AudioMgr.StopSkillAudio();
    }
}
