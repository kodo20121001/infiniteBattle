import { Runtime } from "../../Runtime"

export class Timeline
{
    actions
    handler

    startTime
    currIndex
    isOver

    constructor(actions, handler)
    {
        this.actions = actions.sort((a, b) => a.TimeTick - b.TimeTick)
        this.handler = handler
    }

    Start()
    {
        this.startTime = Runtime.game.currTime
        this.currIndex = 0
        this.isOver = false
    }

    Update()
    {
        if (this.isOver) return
        let passTime = Runtime.game.currTime - this.startTime
        while (this.currIndex < this.actions.length)
        {
            let action = this.actions[this.currIndex]
            if (action.TimeTick > passTime)
                return
            
            this.handler(action)

            this.currIndex++
        }
        this.isOver = true
    }
}