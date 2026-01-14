import { Runtime } from "../Runtime";

export class Timer
{
    isFirstTime = true;
    timeOut = 0;
    startTime = 0;

    constructor(timeOut)
    {
        this.timeOut = timeOut
    }

    Reset()
    {
        this.startTime = Runtime.game.currTime
    }

    IsTimeOut()
    {
        return Runtime.game.currTime - this.startTime >= this.timeOut
    }
}
