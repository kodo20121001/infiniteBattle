import { HeroController } from "../component/HeroController";
import { Unit } from "./Unit";

export class Soldier extends Unit
{
    StartLogic() 
    {
        this.config = { //todo
            grids: [[0, 0]]
        }
        this.dieClearTime = 2
        super.StartLogic()
    }
}
