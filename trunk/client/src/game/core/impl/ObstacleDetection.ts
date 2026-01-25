/**
 * 障碍检测工具类
 * 用于检查两点之间是否有障碍物（视线检查）
 */

import type { GameMap } from './Map';

interface PathNode {
    x: number;
    y: number;
    z: number;
}

export class ObstacleDetection {
    /**
     * 检查两点之间是否有视线（即是否有直线通路）
     * 使用 DDA 算法遍历直线经过的所有格子
     */
    static hasLineOfSight(from: PathNode, to: PathNode, map: GameMap | null): boolean {
        if (!map) return true;

        const mapConfig = map.getConfig();
        const gridWidth = mapConfig.gridWidth ?? 1;
        const gridHeight = mapConfig.gridHeight ?? 1;

        // 转换为格子坐标（格子左上角）
        let x0 = Math.floor(from.x / gridWidth);
        let y0 = Math.floor(from.z / gridHeight);
        let x1 = Math.floor(to.x / gridWidth);
        let y1 = Math.floor(to.z / gridHeight);

        // DDA算法：遍历直线经过的所有格子
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;

        // 主循环遍历
        let err = dx - dy;
        let x = x0;
        let y = y0;
        const visitedCells = new Set<string>();

        while (true) {
            const cellKey = `${x},${y}`;
            if (!visitedCells.has(cellKey)) {
                visitedCells.add(cellKey);
                
                // 检查这个格子是否可行走
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
