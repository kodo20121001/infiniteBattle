/**
 * 寻路系统
 * 负责 A* 寻路和路径平滑
 */

import type { Actor } from './Actor';
import type { GameMap } from './Map';

interface PathNode {
    x: number;
    y: number;
    z: number;
}

interface AStarNode {
    x: number;
    z: number;
    g: number; // 起点到当前点的实际代价
    h: number; // 当前点到终点的启发式估计
    f: number; // f = g + h
    parent: AStarNode | null;
}

export class PathfindingSystem {
    private static readonly SQRT2 = Math.sqrt(2);

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
