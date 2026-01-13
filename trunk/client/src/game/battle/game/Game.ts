
export class AbstractGame
{
    currFrame
    currTime

    viewDeltaTime
    currViewTime

    Init() {}
    Start() {}
    Loop() {}
    PlayerInput(event) {}
    ReceiveGameSync(syncData) {}
    End() {}
}
