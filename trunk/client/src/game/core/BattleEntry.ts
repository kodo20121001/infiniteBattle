import { GameLocal } from "./game/GameLocal";
import { ConfigManager } from "../../common/ConfigManager"
import { AbstractGame } from "./game/Game";
import { GameReplay } from "./game/GameReplay";
import { Configs } from "../common/Configs";

export class BattleEntry {

    // 版本号 战斗内功能改动改第一个 战斗内逻辑/机制改动改第二个 小改动改第三个
    static version = "1.1.1";

    private static $ins: BattleEntry;
    static get ins() { return this.$ins; }

    game: AbstractGame
    BattleStartPushData: any;

    private battleStart: boolean = false;
    get isBattleStart() { return this.battleStart; }

    constructor() {
        if (BattleEntry.$ins)
            throw "error";
        BattleEntry.$ins = this;
    }

    init() {
        this.battleStart = true;
        const battle_type = this.BattleStartPushData.battle_type
        let configManager = new ConfigManager
        // 初始化静态 Configs
        Configs.init(configManager)

        this.game = this.BattleStartPushData.isReplay ? new GameReplay() : new GameLocal()
        this.game["createContext"] = {
            configManager: configManager,
            type: battle_type,
            battleInitData: this.BattleStartPushData
        }

        this.game.Init()
    }

    start() {
        this.game.Start()
    }

    update() {
        this.game.Loop()
    }

    end() {
        this.game.End()
        this.battleStart = false;
    }
}
