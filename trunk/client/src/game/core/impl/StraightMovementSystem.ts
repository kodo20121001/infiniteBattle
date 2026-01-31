/**
 * 直线移动系统
 * 负责单位的直线移动，包括前方障碍检查和朝向更新
 */

import { ObstacleDetection } from './ObstacleDetection';
import type { Actor } from './Actor';
import type { GameMap } from './Map';

interface PathNode {
    x: number;
    y: number;
    z: number;
}

interface MoveData {
    actor: Actor;
    state: any;
    path: PathNode[];
    currentPathIndex: number;
    targetX: number;
    targetZ: number;
    targetY: number;
    speed: number;
    arrivalRadius: number;
    turnSpeed: number;
    targetAngle: number;
    isPathSmoothed: boolean;
    obstacleCheckDistance: number;
    tryStraightMove?: boolean;
    straightLineTarget?: { x: number; z: number };
    stuckTime?: number;
    lastFrameDistance?: number;
}

enum MoveState {
    MovingStraight = 'moving_straight',
}

export class StraightMovementSystem {
    /**
     * 更新直线移动
     * 每帧检查前方是否有障碍，有则切换到 A* 寻路
     */
    static update(
        data: MoveData,
        deltaSeconds: number,
        map: GameMap | null,
        onSwitchToPathfinding: () => void,
        onArrived: () => void,
        updateRotation: (actor: Actor, targetAngle: number, turnSpeed: number, deltaSeconds: number) => void
    ): void {
        const pos = data.actor.getPosition();
        
        // 检查是否已到达最终目标
        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < data.arrivalRadius) {
            onArrived();
            return;
        }
        
        // 每帧检测前方是否被阻挡
        // 检查沿着移动方向一小段距离内是否能通过
        const checkDistance = data.obstacleCheckDistance;
        const checkRatio = Math.min(1, checkDistance / distance);
        const checkX = pos.x + dx * checkRatio;
        const checkZ = pos.z + dz * checkRatio;
        
        const canContinue = ObstacleDetection.hasLineOfSight(
            { x: pos.x, y: pos.y, z: pos.z },
            { x: checkX, y: pos.y, z: checkZ },
            map
        );
        
        // 前方被阻挡，切换到A*寻路
        if (!canContinue) {
            console.log(`[StraightMovement] >>> OBSTACLE DETECTED! Unit ${data.actor.actorNo}, switching to A*`);
            onSwitchToPathfinding();
            return;
        }
        
        // 继续直线移动（朝向最终目标）
        const moveDistance = data.speed * deltaSeconds;
        const moveRatio = Math.min(1, moveDistance / distance);
        data.actor.move(dx * moveRatio, 0, dz * moveRatio);
        
        // 更新朝向（朝向最终目标）
        const targetAngle = Math.atan2(dz, dx) * (180 / Math.PI);
        updateRotation(data.actor, targetAngle, data.turnSpeed, deltaSeconds);
    }
}
