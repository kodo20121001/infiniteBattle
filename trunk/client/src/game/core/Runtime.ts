import { ConfigManager } from "../../common/ConfigManager"
import { AbstractGame } from "./game/Game"
import { Collector } from "./logic/Collector"
import { GameGrids } from "./logic/GameGrids_grid"
import { GameLogic } from "./logic/GameLogic"
import { GameView } from "./view/GameView"
import { Camera2D } from "../engine/base/Camera2D"
import type { Configs } from "../common/Configs"
import type { GameMap } from "./logic/actor/GameMap"

export class Runtime {

    //==========================================================================================
    static tempPlayerId: string
    //==========================================================================================

    static battleInitData

    static game : AbstractGame

    static map: GameMap
    static gameLogic: GameLogic
    static gameGrids: GameGrids
    static collector: Collector

    //==========================================================================================
    static gameView:GameView
    static camera2D: Camera2D  // 2D Camera instance
    static ticker: any  
    //==========================================================================================

    static configs: Configs

    static battleModule
}
