import { Runtime } from "../../Runtime";
import { SecondaryAttr } from "../component/BattleAttributes";
import { Unit } from "./Unit";

export class Building extends Unit
{
    buildingConfig
    level
    StartLogic() 
    {
        this.config = { //todo
            grids: this.createContext.grids
        }
        this.radius = this.createContext.radius
        this.dieClearTime = 4
        this.buildingConfig = Runtime.configs.GetBuildingConfig(this.createContext.buildingId);
        this.level = this.createContext.level;
        super.StartLogic()

        this.attrs?.setSecondaryAttribute(SecondaryAttr.GroundMoveSpeed, 0);
    }
}
