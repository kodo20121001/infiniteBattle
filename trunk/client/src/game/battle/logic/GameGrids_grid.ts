import { map_grid_size } from "../Def";
import { Runtime } from "../Runtime";
import { SparseGrid } from "../util/SparseGrid";

export class GameGrids {
    objInGrid = {};
    sparseGrid : SparseGrid;

    constructor() {
        this.sparseGrid = new SparseGrid(map_grid_size);
    }

    InsertObj(actor) {
        if (this.objInGrid[actor.actorId]) {
            this.RemoveObj(actor);
        }

        this.sparseGrid.insert(actor.pos.x, actor.pos.y, actor.config.grids, actor);
        this.objInGrid[actor.actorId] = {
            x: actor.pos.x,
            y: actor.pos.y,
        };
    }

    InsertObstacle(key){
        this.sparseGrid.insertObstacle(key, 1)
    }

    RemoveObj(actor) {
        let objData = this.objInGrid[actor.actorId];
        if (objData) {
            this.sparseGrid.remove(objData.x, objData.y, actor.config.grids, actor);
            delete this.objInGrid[actor.actorId];
        }
    }

    IsPosBlock(pos, actor) {
        return !this.sparseGrid.collides(pos.x, pos.y, actor.config.grids, actor);
    }

    QueryObjectsAtPosition(pos, grids) {
        return this.sparseGrid.query(pos.x, pos.y, grids);
    }

    FindNonCollidingPosition(initialPos, actor, maxSearchStep = 10) {
        return this.sparseGrid.findClosestEmptyCell(initialPos.x, initialPos.y, actor.config.grids, maxSearchStep)
    }
}