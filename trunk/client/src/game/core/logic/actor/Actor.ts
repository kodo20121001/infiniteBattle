import { CreateContext } from "../../Def"
import { Runtime } from "../../Runtime"
import { FixedVector2 } from "../../base/fixed/FixedVector2"

export class Actor
{
    isInGame

    actorType
    actorId

    createContext : CreateContext
    config : any

    pos: FixedVector2
    y: number
    angleY: number
    size: number

    camp: number
    group: number
    scale: number

    isDestory = false

    coms = []

    constructor()
    {
        this.y = 0
        this.size = 0.3
        this.pos = new FixedVector2()
    }

    AddComponent(componentType)
    {
        let com = new componentType()
        com.owner = this
        this.coms.push(com)
        return com
    }

    onDestroy
    Destroy()
    {
        this.isDestory = true
        if(this.onDestroy)
            this.onDestroy()
    }

    StartLogic()
    {
        this.camp = this.createContext.camp
        this.group = this.createContext.group
        this.coms.forEach(v => {
            if (v.StartLogic)
                v.StartLogic()
        })
    }

    LogicUpdate()
    {
        this.coms.forEach(v => {
            if (v.LogicUpdate)
                v.LogicUpdate()
        })
    }
}
