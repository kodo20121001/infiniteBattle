import { map_grid_size } from "../Def";
import { QuadTree } from "../util/Quadtree";

export class GameGrids {
    objInGrid = {};
    quadTree;

    constructor() {
        // 假设 map_grid_size 是一个对象，包含地图的宽度和高度
        const boundary = { x: -100, y: -100, width: 200, height: 200 };
        const capacity = 4; // 或根据需要调整
        const maxDepth = 10; // 或根据需要调整
        this.quadTree = new QuadTree(boundary, capacity, 0, maxDepth);
    }

    InsertObj(pos, radius, obj) {
        if (this.objInGrid[obj.actorId])
            this.RemoveObj(obj);

        const circle = { x: pos.x, y: pos.y, radius: radius };
        this.quadTree.insert(circle, obj);
        this.objInGrid[obj.actorId] = { x: pos.x, y: pos.y, radius: radius };
    }

    RemoveObj(obj) {
        let objData = this.objInGrid[obj.actorId];
        if (objData) {
            const circle = { x: objData.x, y: objData.y, radius: objData.radius };
            this.quadTree.remove(circle, obj);
            delete this.objInGrid[obj.actorId];
        }
    }

    IsPosBlock(pos, radius, obj = null) {
        const circle = { x: pos.x, y: pos.y, radius: radius };
        const collides = this.quadTree.collides(circle, obj);
        return collides
    }

    FindNonCollidingPosition(initialPos, radius, maxSearchRadius, step = 1) {
        if (!this.IsPosBlock(initialPos, radius)) {
            return initialPos;
        }

        for (let r = step; r <= maxSearchRadius; r += step) {
            for (let dx = -r; dx <= r; dx += step) {
                for (let dy = -r; dy <= r; dy += step) {
                    // 只在螺旋的外圈检查位置
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) {
                        continue;
                    }
                    const newPos = { x: initialPos.x + dx, y: initialPos.y + dy };
                    if (!this.IsPosBlock(newPos, radius)) {
                        return newPos;
                    }
                }
            }
        }

        return null;
    }
}
