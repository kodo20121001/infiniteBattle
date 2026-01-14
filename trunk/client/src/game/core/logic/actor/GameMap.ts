import { map } from "../../../../module/home/MapData";
import { Mathf } from "../../../../utils/Mathf";
import { Runtime } from "../../Runtime";
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { Actor } from "./Actor";

export class GameMap extends Actor
{
    positions
    paths = {}
    atkPaths = []
    defPaths = []
    canMovePaths = []
    obstacles = []

    StartLogic()
    {
        Runtime.map = this

        this.paths["101"] = 
        {
            0 : [this.setPath(14288), this.setPath(14884), this.setPath(15676)],
            1 : [this.setPath(14291), this.setPath(14887), this.setPath(15679)],
            2 : [this.setPath(14294), this.setPath(14890), this.setPath(15682)],
        }
        this.paths["201"] =
        {
            0 : [this.setPath(20747), this.setPath(22770), this.setPath(22771), this.setPath(22772), this.setPath(22773)],
            1 : [this.setPath(20747), this.setPath(22770), this.setPath(22771), this.setPath(22772), this.setPath(22773)],
            2 : [this.setPath(20747), this.setPath(22770), this.setPath(22771), this.setPath(22772), this.setPath(22773)],
        }

        this.positions = 
        {
            [1]: {
                [1]: new FixedVector2(-15, 0)
            },
        }

        this.InitAtkAndDefPath();
        this.InitCanMovePaths();

        super.StartLogic()
    }
    

    GetPath(pathName)
    {
        return this.paths[pathName]
    }

    GetPathPosition(pathName, pathIndex)
    {
        return {pos: this.paths[pathName][pathIndex].clone(), angleY: 0}
    }

    GetPosition(region, positionName)
    {
        return {pos: this.positions[region][positionName].clone(), angleY: 0}
    }

    InitAtkAndDefPath()
    {
        const atkNodes = Runtime.configs.Get('map')['atkNode']
        atkNodes.forEach((node, index) => {
            let pos = this.GetGrid(node.id);
            pos.push(node.angle);
            this.atkPaths.push(pos)
        })
        const defNodes = Runtime.configs.Get('map')['defNode']
        defNodes.forEach((node, index) => {
            let pos = this.GetGrid(node.id);
            pos.push(node.angle);
            this.defPaths.push(pos)
        })
    }

    InitCanMovePaths()
    {
        this.obstacles = map.GetMapBakingData();
        if(!this.obstacles || this.obstacles.length <= 0)
            return;

        this.obstacles.forEach(obstacle => {
            Runtime.gameGrids.InsertObstacle(obstacle)
        })

    }

    GetAtkPosition(index): any
    {
        return index < this.atkPaths.length ? this.atkPaths[index] : null;
    }

    GetDefPosition(index): any
    {
        return index < this.defPaths.length ? this.defPaths[index] : null;
    }

    GetBuildingInfo(id):any
    {
        let buildings = Runtime.configs.Get('map')['buildings'];
        let buildingInfo = {}
        buildings.forEach(building => {
            if(building.buildingId == id)
            {
                let pos = Mathf.transform2dTo3d([building.x, building.y]);
                let location = map.GetGrid(building.location);
                const boundData : [number, number][] = [];
                building.bounds.forEach(bound => {
                    let node = map.GetGrid(bound);
                    boundData.push([node.gx - location.gx, node.gy - location.gy]);
                })
                let radius = Math.sqrt(boundData.length) / 2 //todo
                radius = radius * 0.88;
                buildingInfo = {pos: pos, bounds: boundData, radius: radius};
                return;
            }
        });
        return buildingInfo;
    }

    private GetGrid(id):any
    {
        let node = map.GetGrid(id);
        if(node == undefined)
            return null;
        let pos = Mathf.transform2dTo3d([node.x, node.y]);
        return pos;
    }

    CanMove(pos)
    {
        let point = Mathf.transform3dTo2d([pos.x, pos.y, 0]);
        let info = map.HitTestNode(point[0], point[1]);
        if(info && info.length >= 3)
        {
            if(info[3]['type'] == 0)
                return true;
            else
                return false;
        }

        return false;
    }

    private setPath(point: number)
    {
        let pos = this.GetGrid(point)
        return new FixedVector2(pos[0], pos[1]);
    }
}
