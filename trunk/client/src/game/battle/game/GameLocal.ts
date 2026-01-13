import { Runtime } from '../Runtime';
import { GameLogic } from "../logic/GameLogic";
import { GameView } from "../view/GameView";
import { GameLogicEventHandler } from "../logic/GameLogicEventHandler";
import { GameGrids } from "../logic/GameGrids_grid";
import { one_frame_time, time_out_time } from "../Def";
import { AbstractGame } from "./Game";
import { Plunder } from "../logic/Plunder";
import FixedMaths from "../base/fixed/FixedMaths";
import { Adventure } from "../logic/Adventure";
import { Collector } from "../logic/Collector";
import { MartialDisplay } from "../logic/MartialDisplay";
import { SyncBattleProcess } from '../logic/SyncBattleProcess';

export class GameLocal extends AbstractGame
{
    createContext: object

    lastFrameTime
    accumulatedTime = 0

    frameEventList

    currFrameEventList

    gameSpeed = 1;

    Init()
    {
        FixedMaths.seed = 1

        Runtime.configManager = this.createContext.configManager
        Runtime.battleInitData = this.createContext.battleInitData

        Runtime.gameLogic = new GameLogic({})
        Runtime.gameView = new GameView

        Runtime.gameGrids = new GameGrids
        Runtime.collector = new Collector
        Runtime.collector.battleType = this.createContext.type

        switch(this.createContext.type)
        {
            case "plunder":
                Runtime.battleModule = new Plunder
                Runtime.battleModule.battleInitData = this.createContext.battleInitData.plunder_data
                Runtime.battleModule.homeland_id = this.createContext.homeland_id
                break
            case "pve":
                Runtime.battleModule = new Adventure
                Runtime.battleModule.battleInitData = this.createContext.battleInitData.pve_data
                Runtime.battleModule.homeland_id = this.createContext.homeland_id
                break;
            case "MartialDisplay":
                Runtime.battleModule = new MartialDisplay
                Runtime.battleModule.homeland_id = this.createContext.homeland_id
                break;
        }
        Runtime.gameLogic.syncBattleProcess = new SyncBattleProcess

    }

    Start()
    {
        this.lastFrameTime = Date.now() / 1000
        this.currFrame = 0
        this.currTime = 0
        this.viewDeltaTime = 0
        this.currViewTime = 0
        this.frameEventList = []
        this.currFrameEventList = {
            game_events: []
        }

        Runtime.game = this
        Runtime.gameLogic.StartLogic()
        Runtime.gameView.Start()
    }
  
    Loop()
    {
        const currentFrameTime = Date.now() / 1000
        let deltaTime = (currentFrameTime - this.lastFrameTime);
        // 客户端更新时间有可能超过1帧时间，所以不能跟1帧时间做比较
        if (deltaTime > time_out_time)
            deltaTime = time_out_time
        deltaTime *= this.gameSpeed
      
        this.lastFrameTime = currentFrameTime;
        this.accumulatedTime += deltaTime;
      
        while (this.accumulatedTime >= one_frame_time) {
            this.accumulatedTime -= one_frame_time
            this.currFrame += 1
            this.currTime += one_frame_time

            let eJson = JSON.stringify(this.currFrameEventList)
            let syncData = JSON.parse(eJson)
            this.currFrameEventList = {game_events: []}
            this.ReceiveGameSync(syncData)

            const frameData = this.frameEventList.shift()
            this._handleFrameEvents(frameData)

            Runtime.gameLogic.LogicUpdate()
        }

        this.viewDeltaTime = deltaTime
        this.currViewTime += deltaTime
        Runtime.gameView.Update()
    }

    _handleFrameEvents(frameData)
    {
        if (!frameData.game_events)
            return

        for (let i = 0; i < frameData.game_events.length; ++i)
        {
            if (GameLogicEventHandler.hasOwnProperty(frameData.game_events[i].type)) 
            {
                GameLogicEventHandler[frameData.game_events[i].type](frameData.game_events[i]);
                Runtime.gameLogic.syncBattleProcess.PushEvent(frameData.game_events[i]);
            }
            else {
                console.error(`Invalid game event type: ${frameData.game_events[i].type}`);
            }

            // GameLogicEventHandler[frameData.game_events[i].type](frameData.game_events[i])
        }
    }

    SetGameSpeed(speed) {
        if(speed != undefined)
            this.gameSpeed = speed;
    }

    PlayerInput(event)
    {
        this.currFrameEventList.game_events.push(event)
    }

    ReceiveGameSync(syncData) {
        this.frameEventList.push(syncData)
    }

    End(){
        Runtime.battleModule.battleOver = true;
        Runtime.gameLogic.DestroyAllActor()
        Runtime.gameView.End();
    }
}
