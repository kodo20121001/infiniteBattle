import { Logger } from "../engine/common";
import { Runtime } from "./Runtime";
//import { RoomLogic } from "../player/logic/Room";

export class BattleHandler
{
    LoginRet(data)
    {
        if (data.code == 0)
        {
            //UIManager.inst.Close("login")
            //UIManager.inst.Open("main")
        }
        else
        {
            Logger.log("login fail")
        }
    }

    QuickMatchRet(data)
    {
        //RoomLogic.roomData = data.data.room_data
    }

    GameStart(data)
    {
        //let game = new GameRemoteClient(data)
        //game.Start()
    }

    GameOver(data)
    {
    }

    GameSync(data)
    {
        //Runtime.game.ReceiveGameSync(data)
    }
}
