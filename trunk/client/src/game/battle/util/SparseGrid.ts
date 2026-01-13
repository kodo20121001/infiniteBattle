import { PositionToGrid } from "../Def";
import FixedMaths from "../base/fixed/FixedMaths";
import { FixedVector2 } from "../base/fixed/FixedVector2";

function RotateGrids(grids, angleY) {
  return FixedMaths.rotate(grids, angleY)
}

export class SparseGrid {

  cellSize
  cells
  obstacles

  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.obstacles = new Map();
  }
  
  _keyForPoint(x, y) {
    const grid = PositionToGrid(new FixedVector2(x, y));
    return `${grid.x},${grid.y}`;
  }

  insert(x, y, grids, obj) {
    for (const [gridX, gridY] of grids) {
      const key = this._keyForPoint(x + gridX * this.cellSize, y + gridY * this.cellSize);
      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key).push(obj);
    }
  }

  insertObstacle(key, type) {
    if (!this.obstacles.has(key)) {
      this.obstacles.set(key, []);
    }
    this.obstacles.get(key).push(type);
  }

  remove(x, y, grids, obj) {
    for (const [gridX, gridY] of grids) {
      const key = this._keyForPoint(x + gridX * this.cellSize, y + gridY * this.cellSize);
      const cell = this.cells.get(key);
      if (cell) {
        const index = cell.indexOf(obj);
        if (index > -1) {
          cell.splice(index, 1);
          if (cell.length === 0) {
            this.cells.delete(key);
          }
        }
      }
    }
  }

  query(x, y, grids) {
    const objectSet = new Set();
    for (const [gridX, gridY] of grids) {
        const key = this._keyForPoint(x + gridX * this.cellSize, y + gridY * this.cellSize);
        if (this.cells.has(key)) {
            const cellObjects = this.cells.get(key);
            for (const obj of cellObjects) {
                objectSet.add(obj);
            }
        }
    }

    return Array.from(objectSet);
  }

  collides(x, y, grids, excludeObj = null) {
    for (const [gridX, gridY] of grids) {
        const key = this._keyForPoint(x + gridX * this.cellSize, y + gridY * this.cellSize);
        if (this.cells.has(key)) {
            const cellObjects = this.cells.get(key);
            if (cellObjects.length > 0) {
                if (excludeObj !== null) {
                    const filteredObjects = cellObjects.filter(obj => obj !== excludeObj);
                    if (filteredObjects.length > 0) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
        if(this.obstacles.has(key)) {
          return false;
        }
    }
  
    return true;
  }

  findClosestEmptyCell(x, y, grids, maxDepth) {
    const grid = PositionToGrid(new FixedVector2(x, y));
    const col = grid.x
    const row = grid.y

    let queue = [{ col, row, depth: 0 }];
    let visited = new Set();

    while (queue.length > 0) {
        let { col, row, depth } = queue.shift();
        let key = `${col},${row}`;

        if (!visited.has(key)) {
            visited.add(key);

            if (maxDepth !== undefined && depth > maxDepth) {
                return null;
            }

            const gridX = col * this.cellSize;
            const gridY = row * this.cellSize;
            let isEmpty = true;

            for (const [offsetX, offsetY] of grids) {
                const cellKey = this._keyForPoint(gridX + offsetX * this.cellSize, gridY + offsetY * this.cellSize);
                if (this.cells.has(cellKey) && this.cells.get(cellKey).length > 0 || this.obstacles.has(cellKey)) {
                    isEmpty = false;
                    break;
                }
            }

            if (isEmpty) {
                return { x: gridX, y: gridY };
            }

            let neighbors = [
                { col: col + 1, row: row, depth: depth + 1 },
                { col: col - 1, row: row, depth: depth + 1 },
                { col: col, row: row + 1, depth: depth + 1 },
                { col: col, row: row - 1, depth: depth + 1 },
                { col: col + 1, row: row + 1, depth: depth + 1 },
                { col: col - 1, row: row - 1, depth: depth + 1 },
                { col: col + 1, row: row - 1, depth: depth + 1 },
                { col: col - 1, row: row + 1, depth: depth + 1 },
            ];

            queue.push(...neighbors);
        }
    }

    return null;
  }
}
