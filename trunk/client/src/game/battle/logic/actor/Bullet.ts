import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { BattleAttributes } from "../component/BattleAttributes";
import { BulletBehavior } from "../component/BulletBehavior";
import { Actor } from "./Actor";
import { Unit } from "./Unit";

export class Bullet extends Actor
{
    createActor;
    bulletBehavior;
    res;
    offset;

    attrs;

    dirAngle;

    isTracking: boolean;
    trackingUnit: Unit | null;

    tureDamage;

    StartLogic(): void 
    {
        this.bulletBehavior = this.AddComponent(BulletBehavior)
        this.attrs = this.AddComponent(BattleAttributes)

        this.config = this.createContext.config
        this.createActor = this.createContext.createActor
        this.y = this.createContext.y
        this.pos = this.createContext.pos
        this.angleY = this.createContext.angleY
        this.res = this.createContext.res
        this.offset = this.createContext.offset
        this.dirAngle = 0
        this.isTracking =  this.createContext.isTracking
        this.trackingUnit = this.createContext.trackingUnit
        this.tureDamage = this.createContext.tureDamage
        

        super.StartLogic()
    }
}
