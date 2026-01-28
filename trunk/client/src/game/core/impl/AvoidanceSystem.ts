/**
 * 单位避让系统 - 增强版本
 * 
 * 核心逻辑：
 * 1. 预测移动后是否与邻居重叠
 * 2. 如果会重叠，尝试沿邻居表面滑动
 * 3. 使用分离力（Separation Force）处理多个邻居
 * 4. 检测墙角位置并计算逃脱方向
 */

import type { Game } from './GameSystem';
import type { Actor } from './Actor';
import { ActorType } from './Actor';

interface Vec2 { x: number; z: number }

export class AvoidanceSystem {
    // 最小安全边距
    private static readonly SAFE_MARGIN = 0.05;
    private static readonly SLIDE_FACTOR = 0.6;
    
    // 避让参数
    private static readonly SEPARATION_RADIUS = 2.0;      // 分离力作用半径（米）
    private static readonly SEPARATION_STRENGTH = 1.5;    // 分离力强度
    private static readonly MAX_SEPARATION_FORCE = 0.8;   // 最大分离力（归一化后）
    private static readonly CORNER_DETECTION_RADIUS = 1.5; // 墙角检测半径

    /**
     * 预测移动后是否与邻居发生重叠；如重叠则返回滑动方向
     * 增强版：使用分离力处理多个邻居，避免墙角卡死
     */
    static trySlideOnContact(actor: Actor, dir: Vec2, moveDist: number, game: Game): { dir: Vec2, dist: number } {
        const pos = actor.getPosition();
        const nextX = pos.x + dir.x * moveDist;
        const nextZ = pos.z + dir.z * moveDist;
        const selfR = actor.getRadius();

        // 收集所有重叠的邻居
        const overlappingNeighbors: Array<{ actor: Actor; overlap: number; dx: number; dz: number; dist: number }> = [];
        let worstOverlap = 0;

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
            
            if (overlap > 0) {
                overlappingNeighbors.push({
                    actor: neighbor,
                    overlap,
                    dx,
                    dz,
                    dist: dist || 0.001
                });
                
                if (overlap > worstOverlap) {
                    worstOverlap = overlap;
                }
            }
        }

        // 没有重叠，直接按原方向移动
        if (overlappingNeighbors.length === 0) {
            return { dir, dist: moveDist };
        }

        // 计算分离力（Separation Force）
        let separationX = 0;
        let separationZ = 0;
        let separationWeight = 0;

        for (const neighbor of overlappingNeighbors) {
            const np = neighbor.actor.getPosition();
            const awayX = pos.x - np.x;
            const awayZ = pos.z - np.z;
            const awayDist = Math.sqrt(awayX * awayX + awayZ * awayZ) || 0.001;
            
            // 分离力与距离成反比，与重叠量成正比
            const forceStrength = (neighbor.overlap / awayDist) * this.SEPARATION_STRENGTH;
            const normalizedX = awayX / awayDist;
            const normalizedZ = awayZ / awayDist;
            
            separationX += normalizedX * forceStrength;
            separationZ += normalizedZ * forceStrength;
            separationWeight += forceStrength;
        }

        // 归一化分离力
        if (separationWeight > 0) {
            const sepLen = Math.sqrt(separationX * separationX + separationZ * separationZ);
            if (sepLen > 0) {
                separationX = (separationX / sepLen) * Math.min(this.MAX_SEPARATION_FORCE, separationWeight);
                separationZ = (separationZ / sepLen) * Math.min(this.MAX_SEPARATION_FORCE, separationWeight);
            }
        }

        // 找到最严重的重叠邻居（用于切线滑动）
        let worstNeighbor = overlappingNeighbors[0];
        for (const n of overlappingNeighbors) {
            if (n.overlap > worstNeighbor.overlap) {
                worstNeighbor = n;
            }
        }

        const np = worstNeighbor.actor.getPosition();
        
        // 远离邻居的方向（法线）
        const awayX = pos.x - np.x;
        const awayZ = pos.z - np.z;
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

        // 结合分离力和切线滑动
        // 分离力权重：根据重叠严重程度动态调整
        const overlapFactor = Math.min(1, worstOverlap / (selfR * 2));
        const separationForceWeight = overlapFactor * 0.4; // 最多 40% 权重给分离力
        const slideWeight = 1 - separationForceWeight;

        const finalDirX = (slideX * slideWeight + separationX * separationForceWeight);
        const finalDirZ = (slideZ * slideWeight + separationZ * separationForceWeight);
        const finalDirLen = Math.sqrt(finalDirX * finalDirX + finalDirZ * finalDirZ) || 1;

        return {
            dir: { x: finalDirX / finalDirLen, z: finalDirZ / finalDirLen },
            dist: moveDist * (this.SLIDE_FACTOR + separationForceWeight * 0.2), // 有分离力时稍微增加移动距离
        };
    }

    /**
     * 检测是否在墙角位置（被多个单位包围）
     */
    static isInCorner(actor: Actor, game: Game): boolean {
        const pos = actor.getPosition();
        const selfR = actor.getRadius();
        const checkRadius = selfR + this.CORNER_DETECTION_RADIUS;
        
        let neighborCount = 0;
        const neighborAngles: number[] = [];

        for (const neighbor of game.getActors()) {
            if (neighbor === actor) continue;
            if (!neighbor.isActive() || neighbor.isDead()) continue;
            if (neighbor.actorType !== ActorType.Unit) continue;

            const np = neighbor.getPosition();
            const dx = np.x - pos.x;
            const dz = np.z - pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < checkRadius) {
                neighborCount++;
                const angle = Math.atan2(dz, dx);
                neighborAngles.push(angle);
            }
        }

        // 如果周围有 3 个或更多邻居，可能是在墙角
        if (neighborCount >= 3) {
            // 检查邻居是否形成包围圈（角度分布）
            neighborAngles.sort((a, b) => a - b);
            let maxGap = 0;
            for (let i = 0; i < neighborAngles.length; i++) {
                const nextIdx = (i + 1) % neighborAngles.length;
                let gap = neighborAngles[nextIdx] - neighborAngles[i];
                if (gap < 0) gap += Math.PI * 2;
                if (gap > maxGap) maxGap = gap;
            }
            
            // 如果最大角度间隙小于 180 度，说明被包围
            return maxGap < Math.PI;
        }

        return false;
    }

    /**
     * 获取墙角避让方向（尝试从包围圈中脱离）
     */
    static getCornerEscapeDirection(actor: Actor, game: Game, preferredDir: Vec2): Vec2 | null {
        const pos = actor.getPosition();
        const selfR = actor.getRadius();
        const checkRadius = selfR + this.CORNER_DETECTION_RADIUS;
        
        const neighborAngles: number[] = [];

        for (const neighbor of game.getActors()) {
            if (neighbor === actor) continue;
            if (!neighbor.isActive() || neighbor.isDead()) continue;
            if (neighbor.actorType !== ActorType.Unit) continue;

            const np = neighbor.getPosition();
            const dx = np.x - pos.x;
            const dz = np.z - pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < checkRadius) {
                const angle = Math.atan2(dz, dx);
                neighborAngles.push(angle);
            }
        }

        if (neighborAngles.length < 2) {
            return null;
        }

        // 找到最大的角度间隙
        neighborAngles.sort((a, b) => a - b);
        let maxGap = 0;
        let maxGapStart = 0;
        
        for (let i = 0; i < neighborAngles.length; i++) {
            const nextIdx = (i + 1) % neighborAngles.length;
            let gap = neighborAngles[nextIdx] - neighborAngles[i];
            if (gap < 0) gap += Math.PI * 2;
            if (gap > maxGap) {
                maxGap = gap;
                maxGapStart = neighborAngles[i];
            }
        }

        // 朝向最大间隙的中心方向
        const escapeAngle = maxGapStart + maxGap / 2;
        
        // 如果最大间隙方向与期望方向接近，优先使用期望方向
        const preferredAngle = Math.atan2(preferredDir.z, preferredDir.x);
        let angleDiff = Math.abs(escapeAngle - preferredAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        
        const finalAngle = angleDiff < Math.PI / 3 ? preferredAngle : escapeAngle;
        
        return {
            x: Math.cos(finalAngle),
            z: Math.sin(finalAngle)
        };
    }
}
