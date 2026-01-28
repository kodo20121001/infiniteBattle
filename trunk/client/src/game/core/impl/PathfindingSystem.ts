/**
 * 寻路系统
 * 负责 A* 寻路和 Flow Field 流场寻路
 */

import type { Actor } from './Actor';
import type { GameMap } from './Map';

/**
 * 路径节点
 */
export interface PathNode {
    x: number;
    y: number;
    z: number;
}

/**
 * 流场格子数据
 */
interface FlowFieldCell {
    cost: number;           // 到目标的距离代价（Infinity 表示不可达）
    dirX: number;           // 流向 X 分量（归一化）
    dirZ: number;           // 流向 Z 分量（归一化）
    isWalkable: boolean;    // 是否可行走
}

/**
 * 流场数据结构
 */
export interface FlowField {
    targetX: number;
    targetZ: number;
    targetCol: number;
    targetRow: number;
    colCount: number;
    rowCount: number;
    gridWidth: number;
    gridHeight: number;
    cells: FlowFieldCell[];
    timestamp: number;
}

export class PathfindingSystem {
    private static readonly SQRT2 = Math.sqrt(2);
    private static _flowFieldCache: Map<string, FlowField> = new Map();
    private static readonly FLOW_FIELD_CACHE_MAX_SIZE = 20;
    private static readonly FLOW_FIELD_CACHE_TTL = 5000;

    /**
     * 生成流场（Flow Field）
     */
    static generateFlowField(
        targetX: number,
        targetZ: number,
        map: GameMap | null,
        useCache: boolean = true
    ): FlowField | null {
        if (!map) return null;

        const mapConfig = map.getConfig();
        const gridWidth = mapConfig.gridWidth ?? 1;
        const gridHeight = mapConfig.gridHeight ?? 1;
        const colCount = mapConfig.colCount ?? 0;
        const rowCount = mapConfig.rowCount ?? 0;

        if (colCount <= 0 || rowCount <= 0) {
            console.warn('[PathfindingSystem] Invalid map grid config for FlowField');
            return null;
        }

        const targetCol = Math.floor(targetX / gridWidth);
        const targetRow = Math.floor(targetZ / gridHeight);

        if (targetCol < 0 || targetCol >= colCount || targetRow < 0 || targetRow >= rowCount) {
            console.warn('[PathfindingSystem] FlowField target out of bounds');
            return null;
        }

        // 检查缓存
        if (useCache) {
            const cacheKey = `${targetCol},${targetRow}`;
            const cached = this._flowFieldCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.FLOW_FIELD_CACHE_TTL) {
                return cached;
            }
        }

        // 初始化所有格子
        const totalCells = colCount * rowCount;
        const cells: FlowFieldCell[] = new Array(totalCells);
        
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < colCount; col++) {
                const index = row * colCount + col;
                const checkX = col * gridWidth + gridWidth / 2;
                const checkZ = row * gridHeight + gridHeight / 2;
                const walkable = map.isWalkable(checkX, checkZ);
                
                cells[index] = {
                    cost: Infinity,
                    dirX: 0,
                    dirZ: 0,
                    isWalkable: walkable,
                };
            }
        }

        const targetIndex = targetRow * colCount + targetCol;
        if (!cells[targetIndex].isWalkable) {
            console.warn('[PathfindingSystem] FlowField target is not walkable');
            return null;
        }

        // BFS 生成 Integration Field
        cells[targetIndex].cost = 0;
        const queue: Array<{ col: number; row: number }> = [{ col: targetCol, row: targetRow }];
        let head = 0;

        const directions = [
            { dx: 0, dz: 1, cost: 1 },
            { dx: 1, dz: 0, cost: 1 },
            { dx: 0, dz: -1, cost: 1 },
            { dx: -1, dz: 0, cost: 1 },
            { dx: 1, dz: 1, cost: this.SQRT2 },
            { dx: 1, dz: -1, cost: this.SQRT2 },
            { dx: -1, dz: 1, cost: this.SQRT2 },
            { dx: -1, dz: -1, cost: this.SQRT2 },
        ];

        while (head < queue.length) {
            const current = queue[head++];
            const currentIndex = current.row * colCount + current.col;
            const currentCost = cells[currentIndex].cost;

            for (const dir of directions) {
                const neighborCol = current.col + dir.dx;
                const neighborRow = current.row + dir.dz;

                if (neighborCol < 0 || neighborCol >= colCount || 
                    neighborRow < 0 || neighborRow >= rowCount) {
                    continue;
                }

                const neighborIndex = neighborRow * colCount + neighborCol;
                const neighborCell = cells[neighborIndex];

                if (!neighborCell.isWalkable) {
                    continue;
                }

                if (Math.abs(dir.dx) === 1 && Math.abs(dir.dz) === 1) {
                    const adjacent1Index = current.row * colCount + (current.col + dir.dx);
                    const adjacent2Index = (current.row + dir.dz) * colCount + current.col;
                    if (!cells[adjacent1Index]?.isWalkable || !cells[adjacent2Index]?.isWalkable) {
                        continue;
                    }
                }

                const newCost = currentCost + dir.cost;
                
                if (newCost < neighborCell.cost) {
                    neighborCell.cost = newCost;
                    queue.push({ col: neighborCol, row: neighborRow });
                }
            }
        }

        // 生成 Flow Field
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < colCount; col++) {
                const index = row * colCount + col;
                const cell = cells[index];

                if (!cell.isWalkable || cell.cost === Infinity || cell.cost === 0) {
                    continue;
                }

                let bestDirX = 0;
                let bestDirZ = 0;
                let bestCost = cell.cost;

                for (const dir of directions) {
                    const neighborCol = col + dir.dx;
                    const neighborRow = row + dir.dz;

                    if (neighborCol < 0 || neighborCol >= colCount ||
                        neighborRow < 0 || neighborRow >= rowCount) {
                        continue;
                    }

                    const neighborIndex = neighborRow * colCount + neighborCol;
                    const neighborCell = cells[neighborIndex];

                    if (!neighborCell.isWalkable) {
                        continue;
                    }

                    if (Math.abs(dir.dx) === 1 && Math.abs(dir.dz) === 1) {
                        const adjacent1Index = row * colCount + (col + dir.dx);
                        const adjacent2Index = (row + dir.dz) * colCount + col;
                        if (!cells[adjacent1Index]?.isWalkable || !cells[adjacent2Index]?.isWalkable) {
                            continue;
                        }
                    }

                    if (neighborCell.cost < bestCost) {
                        bestCost = neighborCell.cost;
                        bestDirX = dir.dx;
                        bestDirZ = dir.dz;
                    }
                }

                const length = Math.sqrt(bestDirX * bestDirX + bestDirZ * bestDirZ);
                if (length > 0) {
                    cell.dirX = bestDirX / length;
                    cell.dirZ = bestDirZ / length;
                }
            }
        }

        const flowField: FlowField = {
            targetX,
            targetZ,
            targetCol,
            targetRow,
            colCount,
            rowCount,
            gridWidth,
            gridHeight,
            cells,
            timestamp: Date.now(),
        };

        if (useCache) {
            const cacheKey = `${targetCol},${targetRow}`;
            if (this._flowFieldCache.size >= this.FLOW_FIELD_CACHE_MAX_SIZE) {
                let oldestKey: string | null = null;
                let oldestTime = Infinity;
                for (const [k, v] of this._flowFieldCache) {
                    if (v.timestamp < oldestTime) {
                        oldestTime = v.timestamp;
                        oldestKey = k;
                    }
                }
                if (oldestKey) {
                    this._flowFieldCache.delete(oldestKey);
                }
            }
            this._flowFieldCache.set(cacheKey, flowField);
        }

        return flowField;
    }

    /**
     * 从流场获取指定位置的移动方向（带插值）
     */
    static getFlowDirectionInterpolated(
        worldX: number,
        worldZ: number,
        flowField: FlowField
    ): { x: number; z: number } | null {
        const { gridWidth, gridHeight, colCount, rowCount, cells } = flowField;

        const cellX = worldX / gridWidth;
        const cellZ = worldZ / gridHeight;
        const col = Math.floor(cellX);
        const row = Math.floor(cellZ);
        const fracX = cellX - col;
        const fracZ = cellZ - row;

        if (col < 0 || col >= colCount - 1 || row < 0 || row >= rowCount - 1) {
            const index = row * colCount + col;
            if (index < 0 || index >= cells.length) return null;
            const cell = cells[index];
            if (!cell.isWalkable || cell.cost === Infinity) return null;
            if (cell.cost === 0) return { x: 0, z: 0 };
            return { x: cell.dirX, z: cell.dirZ };
        }

        const getCell = (c: number, r: number): FlowFieldCell | null => {
            if (c < 0 || c >= colCount || r < 0 || r >= rowCount) return null;
            const cell = cells[r * colCount + c];
            if (!cell.isWalkable || cell.cost === Infinity) return null;
            return cell;
        };

        const c00 = getCell(col, row);
        const c10 = getCell(col + 1, row);
        const c01 = getCell(col, row + 1);
        const c11 = getCell(col + 1, row + 1);

        if (!c00 || !c10 || !c01 || !c11) {
            if (c00) {
                if (c00.cost === 0) return { x: 0, z: 0 };
                return { x: c00.dirX, z: c00.dirZ };
            }
            return null;
        }

        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        
        const dirX = lerp(
            lerp(c00.dirX, c10.dirX, fracX),
            lerp(c01.dirX, c11.dirX, fracX),
            fracZ
        );
        const dirZ = lerp(
            lerp(c00.dirZ, c10.dirZ, fracX),
            lerp(c01.dirZ, c11.dirZ, fracX),
            fracZ
        );

        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
        if (length < 0.0001) {
            return { x: 0, z: 0 };
        }

        return { x: dirX / length, z: dirZ / length };
    }

    /**
     * 检查位置是否在流场的可达范围内
     */
    static isReachableInFlowField(
        worldX: number,
        worldZ: number,
        flowField: FlowField
    ): boolean {
        const col = Math.floor(worldX / flowField.gridWidth);
        const row = Math.floor(worldZ / flowField.gridHeight);

        if (col < 0 || col >= flowField.colCount || row < 0 || row >= flowField.rowCount) {
            return false;
        }

        const index = row * flowField.colCount + col;
        const cell = flowField.cells[index];
        return cell.isWalkable && cell.cost !== Infinity;
    }

    /**
     * 清除流场缓存
     */
    static clearFlowFieldCache(): void {
        this._flowFieldCache.clear();
    }

    /**
     * A* 寻路算法
     */
    static findPath(actor: Actor, targetX: number, targetZ: number, map: GameMap | null): PathNode[] | null {
        if (!map) return null;

        const mapConfig = map.getConfig();
        const gridWidth = mapConfig.gridWidth ?? 1;
        const gridHeight = mapConfig.gridHeight ?? 1;
        const colCount = mapConfig.colCount ?? 0;
        const rowCount = mapConfig.rowCount ?? 0;

        if (colCount <= 0 || rowCount <= 0) {
            console.warn('[PathfindingSystem] Invalid map grid config');
            return null;
        }

        const pos = actor.getPosition();
        const startCol = Math.floor(pos.x / gridWidth);
        const startRow = Math.floor(pos.z / gridHeight);
        const endCol = Math.floor(targetX / gridWidth);
        const endRow = Math.floor(targetZ / gridHeight);

        // 边界检查
        if (startCol < 0 || startCol >= colCount || startRow < 0 || startRow >= rowCount ||
            endCol < 0 || endCol >= colCount || endRow < 0 || endRow >= rowCount) {
            console.warn('[PathfindingSystem] Start or end position out of bounds');
            return null;
        }

        // 起点和终点相同
        if (startCol === endCol && startRow === endRow) {
            return [];
        }

        // A* 算法
        const openSet = new Map<string, AStarNode>();
        const closedSet = new Set<string>();
        const startNode: AStarNode = {
            x: startCol,
            z: startRow,
            g: 0,
            h: this.heuristic(startCol, startRow, endCol, endRow),
            f: 0,
            parent: null,
        };
        startNode.f = startNode.g + startNode.h;

        openSet.set(`${startCol},${startRow}`, startNode);

        while (openSet.size > 0) {
            // 找到 openSet 中 f 值最小的节点
            let current: AStarNode | null = null;
            let currentKey = '';
            let minF = Number.MAX_VALUE;

            for (const [key, node] of openSet) {
                if (node.f < minF) {
                    minF = node.f;
                    current = node;
                    currentKey = key;
                }
            }

            if (!current) break;

            // 到达终点
            if (current.x === endCol && current.z === endRow) {
                return this.reconstructPath(current, gridWidth, gridHeight);
            }

            openSet.delete(currentKey);
            closedSet.add(currentKey);

            // 检查所有邻近的 8 个格子
            const neighbors = this.getNeighbors(current.x, current.z, colCount, rowCount, map, gridWidth, gridHeight);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.z}`;

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                // 计算从 current 到 neighbor 的代价
                const dx = Math.abs(neighbor.x - current.x);
                const dz = Math.abs(neighbor.z - current.z);
                const isHorizontal = dx === 1 && dz === 0;
                const isVertical = dx === 0 && dz === 1;
                const isDiagonal = dx === 1 && dz === 1;

                let cost = 1;
                if (isDiagonal) {
                    cost = this.SQRT2;
                }

                const newG = current.g + cost;

                // 如果 neighbor 不在 openSet 中，或者新的路径更优
                const existingNode = openSet.get(neighborKey);
                if (!existingNode || newG < existingNode.g) {
                    const h = this.heuristic(neighbor.x, neighbor.z, endCol, endRow);
                    const newNode: AStarNode = {
                        x: neighbor.x,
                        z: neighbor.z,
                        g: newG,
                        h: h,
                        f: newG + h,
                        parent: current,
                    };
                    openSet.set(neighborKey, newNode);
                }
            }
        }

        // 无法到达
        return null;
    }

    /**
     * 重建路径
     */
    private static reconstructPath(node: AStarNode, gridWidth: number, gridHeight: number): PathNode[] {
        const path: PathNode[] = [];
        let current = node;

        while (current) {
            // 转换为世界坐标（格子中心）
            const worldX = current.x * gridWidth + gridWidth / 2;
            const worldZ = current.z * gridHeight + gridHeight / 2;
            path.unshift({ x: worldX, y: 0, z: worldZ });
            current = current.parent;
        }

        return path;
    }

    /**
     * 启发式函数（曼哈顿距离）
     */
    private static heuristic(x0: number, z0: number, x1: number, z1: number): number {
        return Math.abs(x1 - x0) + Math.abs(z1 - z0);
    }

    /**
     * 获取可行走的邻近格子
     */
    private static getNeighbors(
        x: number,
        z: number,
        colCount: number,
        rowCount: number,
        map: GameMap,
        gridWidth: number,
        gridHeight: number
    ): Array<{ x: number; z: number }> {
        const neighbors: Array<{ x: number; z: number }> = [];
        const directions = [
            { dx: 0, dz: 1 },   // 下
            { dx: 1, dz: 0 },   // 右
            { dx: 0, dz: -1 },  // 上
            { dx: -1, dz: 0 },  // 左
            { dx: 1, dz: 1 },   // 右下
            { dx: 1, dz: -1 },  // 右上
            { dx: -1, dz: 1 },  // 左下
            { dx: -1, dz: -1 }, // 左上
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const nz = z + dir.dz;

            // 边界检查
            if (nx < 0 || nx >= colCount || nz < 0 || nz >= rowCount) {
                continue;
            }

            // 可行走性检查
            const checkX = nx * gridWidth + gridWidth / 2;
            const checkZ = nz * gridHeight + gridHeight / 2;

            if (map.isWalkable(checkX, checkZ)) {
                neighbors.push({ x: nx, z: nz });
            }
        }

        return neighbors;
    }

    /**
     * 路径平滑（使用 String Pulling 算法）
     */
    static smoothPath(path: PathNode[], map: GameMap | null): PathNode[] {
        if (path.length <= 2 || !map) return path;

        const smoothed: PathNode[] = [path[0]];
        let current = 0;

        while (current < path.length - 1) {
            let farthest = current + 1;

            // 尽可能远地找到可以直线到达的点
            for (let i = current + 2; i < path.length; i++) {
                // 用 DDA 验证直线路径是否可通行
                const canReach = this.validateLinePath(path[current], path[i], map);
                if (canReach) {
                    farthest = i;
                }
            }

            smoothed.push(path[farthest]);
            current = farthest;
        }

        return smoothed;
    }

    /**
     * 用 DDA 算法验证直线路径
     */
    private static validateLinePath(from: PathNode, to: PathNode, map: GameMap): boolean {
        const mapConfig = map.getConfig();
        const gridWidth = mapConfig.gridWidth ?? 1;
        const gridHeight = mapConfig.gridHeight ?? 1;

        let x0 = Math.floor(from.x / gridWidth);
        let y0 = Math.floor(from.z / gridHeight);
        let x1 = Math.floor(to.x / gridWidth);
        let y1 = Math.floor(to.z / gridHeight);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;

        let err = dx - dy;
        let x = x0;
        let y = y0;
        const visitedCells = new Set<string>();

        while (true) {
            const cellKey = `${x},${y}`;
            if (!visitedCells.has(cellKey)) {
                visitedCells.add(cellKey);
                const checkX = x * gridWidth + gridWidth / 2;
                const checkZ = y * gridHeight + gridHeight / 2;

                if (!map.isWalkable(checkX, checkZ)) {
                    return false;
                }
            }

            if (x === x1 && y === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return true;
    }

}
