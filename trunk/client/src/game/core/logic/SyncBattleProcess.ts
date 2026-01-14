import { Runtime } from "../Runtime";
import { sync_frame } from "../Def";

export class SyncBattleProcess {
    private syncFrame = 0;
    frameEventList = [];

    constructor() {
        this.syncFrame = 0;
        this.frameEventList = [];
    }

    LogicUpdate()
    {
        if(Runtime.battleModule.battleOver)
            return;

        if(this.syncFrame <= Runtime.game.currFrame - sync_frame)
        {
            this.syncFrame = Runtime.game.currFrame;
            const frameData = [...this.frameEventList]
            if (Runtime.battleModule.BattleProcess) {
                Runtime.battleModule.BattleProcess({
                    operations : frameData,
                });
            }
        }
        
    }

    PushEvent(data)
    {
        let frameData = {
            frame: Runtime.game.currFrame,
            type: data.type,
            data: JSON.stringify(data)
        }
        this.frameEventList.push(frameData);
    }
}