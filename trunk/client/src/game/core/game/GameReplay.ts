import { Runtime } from '../Runtime';
import { GameLogic } from "../logic/GameLogic";
import { GameView } from "../view/GameView";
import { GameLogicEventHandler } from "../logic/GameLogicEventHandler";
import { GameGrids } from "../logic/GameGrids_grid";
import { one_frame_time, sync_frame } from "../Def";
import { AbstractGame } from "./Game";
import { Plunder } from "./mode/Plunder";
import FixedMaths from "../base/fixed/FixedMaths";
import { Collector } from "../logic/Collector";
import { Configs } from '../../common/Configs';

export class GameReplay extends AbstractGame
{
    createContext: object

    lastFrameTime
    accumulatedTime = 0

    frameEventList

    gameSpeed = 1;

    endFrame = 0;
    result = null;

    Init()
    {
        FixedMaths.seed = 1

        Runtime.configs = Configs
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
                const process = Runtime.battleModule.battleInitData.process
                this.frameEventList = process.operations|| []
                this.endFrame = process.is_finished ? process.current_frame : process.current_frame + sync_frame
                this.result = process.result;
                Runtime.battleModule.isReplay = true;
                break
            default:
                console.error("replay: unknown battle type")
                break;
            // case "pve":
            //     Runtime.battleModule = new Adventure
            //     Runtime.battleModule.battleInitData = this.createContext.battleInitData.pve_data
            //     const process1 = Runtime.battleModule.battleInitData.process
            //     this.frameEventList = process1.operations|| []
            //     this.endFrame = process1.is_finished ? process1.current_frame : process1.current_frame + sync_frame
            //     this.result = process1.result;
            //     break;
            // case "MartialDisplay":
            //     Runtime.battleModule = new MartialDisplay
            //     break;
        }
     
    }

    Start()
    {
        this.lastFrameTime = Date.now() / 1000
        this.currFrame = 0
        this.currTime = 0
        this.viewDeltaTime = 0
        this.currViewTime = 0

        Runtime.game = this
        Runtime.gameLogic.StartLogic()
        Runtime.gameView.Start()
    }
  
    Loop()
    {
        if(this.endFrame <= this.currFrame) return;

        const currentFrameTime = Date.now() / 1000
        let deltaTime = (currentFrameTime - this.lastFrameTime);
        if (deltaTime > one_frame_time)
            deltaTime = one_frame_time
        deltaTime *= this.gameSpeed
      
        this.lastFrameTime = currentFrameTime;
        this.accumulatedTime += deltaTime;
      
        while (this.accumulatedTime >= one_frame_time) {
            this.accumulatedTime -= one_frame_time
            this.currFrame += 1
            this.currTime += one_frame_time

            for (let i = 0; i < this.frameEventList.length; i++) {
                let frameEvent = this.frameEventList[i];
                if (frameEvent.frame === this.currFrame) {
                    this._handleFrameEvents(frameEvent);
                    this.frameEventList.splice(i, 1); // 移除已处理的事件
                    i--; // 调整索引，因为列表长度已经改变
                }
            }

            Runtime.gameLogic.LogicUpdate()

            if(this.endFrame <= this.currFrame)
                Runtime.battleModule.ReplayEnd(this.result);
        }

        this.viewDeltaTime = deltaTime
        this.currViewTime += deltaTime
        Runtime.gameView.Update()

   
    }

    _handleFrameEvents(frameData)
    {
        // 检查frameData是否有效
        if (!frameData) {
            console.error('Invalid frameData');
            return;
        }

        // 检查GameLogicEventHandler中是否有对应的事件类型处理器
        if (typeof GameLogicEventHandler[frameData.type] === 'function') {
            // 如果有，调用该处理器
            const data = JSON.parse(frameData.data);
            GameLogicEventHandler[frameData.type](data);
        } else {
            // 如果没有找到对应的处理器，记录错误信息
            console.error(`No handler found for event type: ${frameData.type}`);
        }
        
    }

    SetGameSpeed(speed) {
        this.gameSpeed = speed;
    }

    End(){
        Runtime.gameLogic.DestroyAllActor()
        Runtime.gameView.End();
    }
}
