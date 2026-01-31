/**
 * 路径跟随系统
 * 负责沿着 A* 路径寻路时的单位移动
 * 同时尝试在每帧切换回直线移动
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

export class PathFollowingSystem {
    /**
     * 更新路径跟随
     * 按照 A* 路径点移动，同时每帧尝试直线到目标
     */
    static update(
        data: MoveData,
        deltaSeconds: number,
        map: GameMap | null,
        onSwitchToStraight: (state: MoveState) => void,
        onArrived: () => void,
        updateRotation: (actor: Actor, targetAngle: number, turnSpeed: number, deltaSeconds: number) => void
    ): void {
        const pos = data.actor.getPosition();
        
        // 获取当前目标路径点
        if (data.currentPathIndex >= data.path.length) {
            onArrived();
            return;
        }

        // War3风格优化：在A*路径跟随中，每帧尝试直线到最终目标
        // 这样可以在障碍消失或位置变化后立即改为直线移动
        const dx = data.targetX - pos.x;
        const dz = data.targetZ - pos.z;
        const distToTarget = Math.sqrt(dx * dx + dz * dz);
        
        // 检查是否已到达目标
        if (distToTarget < data.arrivalRadius) {
            onArrived();
            return;
        }
        
        // 尝试直线到最终目标
        if (ObstacleDetection.hasLineOfSight(
            { x: pos.x, y: pos.y, z: pos.z },
            { x: data.targetX, y: pos.y, z: data.targetZ },
            map
        )) {
            // 检查前方是否有障碍（保持与 StraightMovementSystem 的一致性）
            const checkDistance = data.obstacleCheckDistance;
            const checkRatio = Math.min(1, checkDistance / distToTarget);
            const checkX = pos.x + dx * checkRatio;
            const checkZ = pos.z + dz * checkRatio;
            
            const canContinue = ObstacleDetection.hasLineOfSight(
                { x: pos.x, y: pos.y, z: pos.z },
                { x: checkX, y: pos.y, z: checkZ },
                map
            );
            
            // 前方没有障碍，才切回直线移动
            if (canContinue) {
                console.log(`[PathFollowing] Unit ${data.actor.actorNo} >>> SWITCHING BACK to straight line`);
                data.state = MoveState.MovingStraight;
                data.straightLineTarget = { x: data.targetX, z: data.targetZ };
                return;
            }
        }

        // 继续按A*路径跟随
        const targetNode = data.path[data.currentPathIndex];
        const dxToNode = targetNode.x - pos.x;
        const dzToNode = targetNode.z - pos.z;
        const distanceToNode = Math.sqrt(dxToNode * dxToNode + dzToNode * dzToNode);

        // 到达当前路径点
        if (distanceToNode < data.arrivalRadius) {
            data.currentPathIndex++;
            if (data.currentPathIndex >= data.path.length) {
                onArrived();
            }
            return;
        }

        // 计算移动
        const moveDistance = data.speed * deltaSeconds;
        const moveRatio = Math.min(1, moveDistance / distanceToNode);
        
        data.actor.move(dxToNode * moveRatio, 0, dzToNode * moveRatio);

        // 更新朝向（朝向当前路径点）
        const targetAngle = Math.atan2(dzToNode, dxToNode) * (180 / Math.PI);
        updateRotation(data.actor, targetAngle, data.turnSpeed, deltaSeconds);
    }
}
