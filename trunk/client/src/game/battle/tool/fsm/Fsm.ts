
export class State
{
    isActive = false
    fsm
    object

    Init()
    {
    }
    Enter()
    {
        this.isActive = true
    }
    Exit()
    {
        this.isActive = false
    }
    Update()
    {
    }
    IsActive()
    {
        return this.isActive
    }
    IsMutex(stateId)
    {
        return true
    }
}

export class StateMachine
{
    states = {}
    activeStates = []

    AddState(key, state)
    {
        this.states[key] = state
    }

    Init(object)
    {
        for (let k in this.states)
        {
            let state = this.states[k]
            state.object = object
            state.fsm = this
            state.Init()
        }
    }

    EnterState(key) 
    {
        let state = this.states[key]
        for (let i = 0; i < this.activeStates.length; ++i)
        {
            if (this.states[key].IsMutex(this.activeStates[i].key))
                this.activeStates[i].state.Exit()
        }
        this.activeStates.push({
            key: key,
            state: state
        })
        state.Enter()
    }

    ExitState(key) 
    {
        this.states[key].Exit()
    }

    Update()
    {
        for (let i = 0; i < this.activeStates.length; )
        {
            let state = this.activeStates[i].state
            if (state.isActive)
            {
                state.Update()
                ++i
            }
            else
            {
                this.activeStates[i] = this.activeStates[this.activeStates.length - 1]
                this.activeStates.pop()
            }
        }
    }
}
