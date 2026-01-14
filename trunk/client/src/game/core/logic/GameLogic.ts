
import { ActorType, CreateContext, Relation } from '../Def';
import { BehaviorTree } from "../tool/bt/BehaviorTree"
import { Hero } from "./actor/Hero"
import { GameMap } from "./actor/GameMap"
import { Runtime } from "../Runtime"
import { Soldier } from "./actor/Soldier"
import { Bullet } from './actor/Bullet';
import { Building } from './actor/Building';
import { FixedVector2 } from '../base/fixed/FixedVector2';
import { SyncBattleProcess } from './SyncBattleProcess';

let ActorTypeToClass = 
{
    [ActorType.map]: GameMap,
    [ActorType.hero]: Hero,
    [ActorType.soldier]: Soldier,
    [ActorType.bullet]: Bullet,
    [ActorType.building]: Building,
}

export class GameLogic
{
    initContext

    actorsByType
    nextActorId

    battleProcess
    isOver

    syncBattleProcess: SyncBattleProcess

    onCreateActor
    onDestroyActor

    onPlayEffect
    onPlaySound
    OnPlayTicker
    OnPlayShake

    isAutoCastSkill

    constructor(initContext)
    {
        this.initContext = initContext
        this.actorsByType = {
            [ActorType.map]: {},
            [ActorType.hero]: {},
            [ActorType.soldier]: {},
            [ActorType.bullet]: {},
            [ActorType.building]: {},
        }
        this.nextActorId = 1
    }

    GetActor(id, type)
    {
        return this.actorsByType[type] ? this.actorsByType[type][id] : null;
    }

    GetActorsByType(type)
    {
        return this.actorsByType[type] || {};
    }

    GetHeroByPlayerId(playerId) {
        const heroes = this.GetActorsByType(ActorType.hero);
        for (const id in heroes) {
            if (heroes.hasOwnProperty(id)) {
                const hero = heroes[id];
                if (hero.createContext.playerId === playerId) {
                    return hero;
                }
            }
        }
        return null;
    }

    GetHeroBySkillSlot(slotId) {
        const heroes = this.GetActorsByType(ActorType.hero);
        for (const id in heroes) {
            const hero = heroes[id];
            if (hero.createContext.skillSlotId === slotId) {
                return hero;
            }
        }
        return null;
    }

    CreateActor(createContext: CreateContext)
    {
        const actor = new ActorTypeToClass[createContext.actorType]()
        actor.actorType = createContext.actorType
        actor.actorId = this.nextActorId
        actor.createContext = createContext

        this.actorsByType[createContext.actorType][this.nextActorId] = actor;
        this.nextActorId++;

        actor.StartLogic()
        if (this.onCreateActor)
            this.onCreateActor(actor)

        return actor
    }

    PlayEffect(context)
    {
        if (this.onPlayEffect)
            this.onPlayEffect(context)
    }

    PlayTicker(context)
    {
        if (this.OnPlayTicker)
            this.OnPlayTicker(context)
    }

    PlaySound(context)
    {
        if (this.onPlaySound)
            this.onPlaySound(context)
    }

    PlayShake(context)
    {
        if (this.OnPlayShake)
            this.OnPlayShake(context)
    }

    
    DestroyActor(id, type)
    {
        if (this.actorsByType[type] && this.actorsByType[type][id])
        {
            this.actorsByType[type][id].Destroy()
            if (this.onDestroyActor)
                this.onDestroyActor(this.actorsByType[type][id])
            delete this.actorsByType[type][id]
        }
    }

    StartLogic()
    {
        this.isOver = false

        this.CreateActor(
            {
                actorType: ActorType.map,
                unitType: 1,
                camp: 0,
                pos: new FixedVector2(0, 0),
                angleY: 0,
                scale: 1,
                group: 0,
                attrs: null,
                y: 0,
            })

        Runtime.battleModule.InitBattleActor()
        this.battleProcess = BehaviorTree.Create('battleProcess')

        this.battleProcess.Start({
            gameLogic: this,
            battleModule: Runtime.battleModule
        })
    }

    LogicUpdate()
    {
        if(this.isOver) return;
        
        for (const type in this.actorsByType)
        {
            for (const id in this.actorsByType[type])
            {
                const actor = this.actorsByType[type][id];
                actor.LogicUpdate()
            }
        }
        this.battleProcess.Update()
        if (this.battleProcess.IsOver())
        {
            this.isOver = true
        }
        this.syncBattleProcess?.LogicUpdate();
    }

    GetUnitRelation(u1, u2)
    {
        if (u1.camp == u2.camp)
            return Relation.friend
        return Relation.enemy
    }

    DestroyAllActor(){
        for (let type in this.actorsByType) {
            if (this.actorsByType.hasOwnProperty(type)) { // 确保属性属于对象本身，而不是继承自原型链
                for (let id in this.actorsByType[type]) {
                    if (this.actorsByType[type].hasOwnProperty(id)) { // 确保属性属于对象本身
                        this.DestroyActor(id, type)
                    }
                }
            }
        }
    }
}
  