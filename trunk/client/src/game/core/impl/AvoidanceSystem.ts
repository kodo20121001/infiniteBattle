/**
 * 单位避让系统 - 简化版本
 * 
 * 核心逻辑：
 * 1. 预测移动后是否与邻居重叠
 * 2. 如果会重叠，尝试沿邻居表面滑动
 * 3. 没有复杂的主动避让，只有被动的碰撞处理
 */

import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import { ActorType } from './Actor';

interface Vec2 { x: number; z: number }

export class AvoidanceSystem {
    // 最小安全边距
    private static readonly SAFE_MARGIN = 0.05;
    private static readonly SLIDE_FACTOR = 0.6;

    /**
     * 预测移动后是否与邻居发生重叠；如重叠则返回滑动方向
     */
    static trySlideOnContact(actor: Actor, dir: Vec2, moveDist: number, game: Game): { dir: Vec2, dist: number } {
        const pos = actor.getPosition();
        const nextX = pos.x + dir.x * moveDist;
        const nextZ = pos.z + dir.z * moveDist;
        const selfR = actor.getRadius();

        let worstOverlap = 0;
        let worstNeighbor: Actor | null = null;

        // 检查所有邻近单位
        for (const neighbor of game.getActors()) {
            if (neighbor === actor) continue;
            if (!neighbor.isActive() || neighbor.isDead()) continue;
            if (neighbor.actorType !== ActorType.Unit) continue;

            const np = neighbor.getPosition();
            const neighborR = neighbor.getRadius();
            const dx = nextX - np.x;
            const dz = nextZ - np.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = selfR + neighborR + this.SAFE_MARGIN;
            const overlap = minDist - dist;
            
            if (overlap > worstOverlap) {
                worstOverlap = overlap;
                worstNeighbor = neighbor;
            }
        }

        // 没有重叠，直接按原方向移动
        if (worstOverlap <= 0 || !worstNeighbor) {
            return { dir, dist: moveDist };
        }

        // 有重叠，尝试沿邻居表面滑动
        const np = worstNeighbor.getPosition();
        const ax = pos.x;
        const az = pos.z;
        
        // 远离邻居的方向（法线）
        const awayX = ax - np.x;
        const awayZ = az - np.z;
        const awayLen = Math.sqrt(awayX * awayX + awayZ * awayZ) || 1;
        const nx = awayX / awayLen;
        const nz = awayZ / awayLen;

        // 两个切线方向（垂直于法线）
        const t1x = -nz;
        const t1z = nx;
        const t2x = nz;
        const t2z = -nx;

        // 选择更接近期望方向的切线
        const dot1 = t1x * dir.x + t1z * dir.z;
        const dot2 = t2x * dir.x + t2z * dir.z;
        
        const slideX = dot2 > dot1 ? t2x : t1x;
        const slideZ = dot2 > dot1 ? t2z : t1z;

        return {
            dir: { x: slideX, z: slideZ },
            dist: moveDist * this.SLIDE_FACTOR,
        };
    }
}
