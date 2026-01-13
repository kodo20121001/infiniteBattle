import { ConfigManager } from "../manager/ConfigManager"
import { AbstractGame } from "./game/Game"
import { Collector } from "./logic/Collector"
import { GameGrids } from "./logic/GameGrids_grid"
import { GameLogic } from "./logic/GameLogic"
import { GameView } from "./view/GameView"
import { Camera2D } from "./base/Camera2D"

export class Runtime {

    //==========================================================================================
    static tempPlayerId
    //==========================================================================================

    static battleInitData

    static game : AbstractGame

    static gameLogic: GameLogic
    static map
    static gameGrids: GameGrids
    static collector: Collector

    //==========================================================================================
    static root
    static gameView:GameView
    static stage: any  // PIXI.Container for rendering
    static camera2D: Camera2D  // 2D Camera instance
    static ticker: any  // PIXI.Ticker for frame updates
    static resourceManager: any  // Resource manager for loading assets
    //==========================================================================================

    static configManager: ConfigManager

    static battleModule
}
