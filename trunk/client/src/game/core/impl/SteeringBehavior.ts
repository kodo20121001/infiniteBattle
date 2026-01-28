/**
 * Steering Behavior 转向行为系统
 * 
 * 基于 Craig Reynolds 的 Steering Behaviors 理论
 * 提供平滑的移动和转向控制
 * 
 * 核心概念：
 * - Steering Force: 转向力，表示期望的方向变化
 * - Velocity: 当前速度向量
 * - Position: 当前位置
 * - Max Speed: 最大速度
 * - Max Force: 最大转向力（限制转向的剧烈程度）
 */

/**
 * 2D 向量
 */
export interface Vec2 {
    x: number;
    z: number;
}

/**
 * Steering Behavior 结果
 */
export interface SteeringOutput {
    linear: Vec2;   // 线性转向力（速度变化）
    angular: number; // 角转向力（旋转变化，度/秒）
}

/**
 * 单位状态（用于 Steering Behavior 计算）
 */
export interface AgentState {
    position: Vec2;
    velocity: Vec2;
    rotation: number;      // 当前朝向（度）
    maxSpeed: number;      // 最大速度（米/秒）
    maxForce: number;       // 最大转向力
    maxAngularSpeed: number; // 最大角速度（度/秒）
    radius: number;         // 单位半径（用于碰撞检测）
}

/**
 * Steering Behavior 系统
 */
export class SteeringBehavior {
    // 默认参数
    private static readonly DEFAULT_SLOW_RADIUS = 1.0;      // 减速半径（米）
    private static readonly DEFAULT_ARRIVAL_RADIUS = 0.5;  // 到达半径（米）
    private static readonly DEFAULT_WANDER_RADIUS = 0.5;   // 游走半径
    private static readonly DEFAULT_WANDER_DISTANCE = 1.0;  // 游走距离
    private static readonly DEFAULT_WANDER_JITTER = 0.3;   // 游走抖动

    /**
     * Seek - 朝向目标移动
     * 计算朝向目标的转向力
     */
    static seek(agent: AgentState, target: Vec2): SteeringOutput {
        const desired = {
            x: target.x - agent.position.x,
            z: target.z - agent.position.z
        };
        
        const distance = Math.sqrt(desired.x * desired.x + desired.z * desired.z);
        
        if (distance < 0.001) {
            return { linear: { x: 0, z: 0 }, angular: 0 };
        }
        
        // 归一化并缩放到最大速度
        desired.x = (desired.x / distance) * agent.maxSpeed;
        desired.z = (desired.z / distance) * agent.maxSpeed;
        
        // 计算转向力（期望速度 - 当前速度）
        const steering = {
            x: desired.x - agent.velocity.x,
            z: desired.z - agent.velocity.z
        };
        
        // 限制转向力大小
        const steeringLen = Math.sqrt(steering.x * steering.x + steering.z * steering.z);
        if (steeringLen > agent.maxForce) {
            steering.x = (steering.x / steeringLen) * agent.maxForce;
            steering.z = (steering.z / steeringLen) * agent.maxForce;
        }
        
        // 计算角转向力（朝向目标方向）
        const targetAngle = Math.atan2(desired.z, desired.x) * (180 / Math.PI);
        const angular = this.align(agent, targetAngle);
        
        return { linear: steering, angular };
    }

    /**
     * Arrive - 平滑到达目标
     * 在接近目标时减速，实现平滑停止
     */
    static arrive(
        agent: AgentState,
        target: Vec2,
        slowRadius: number = this.DEFAULT_SLOW_RADIUS,
        arrivalRadius: number = this.DEFAULT_ARRIVAL_RADIUS
    ): SteeringOutput {
        const desired = {
            x: target.x - agent.position.x,
            z: target.z - agent.position.z
        };
        
        const distance = Math.sqrt(desired.x * desired.x + desired.z * desired.z);
        
        // 到达目标
        if (distance < arrivalRadius) {
            return { linear: { x: -agent.velocity.x, z: -agent.velocity.z }, angular: 0 };
        }
        
        // 计算期望速度
        let targetSpeed: number;
        if (distance > slowRadius) {
            // 在减速半径外，使用最大速度
            targetSpeed = agent.maxSpeed;
        } else {
            // 在减速半径内，按比例减速
            targetSpeed = agent.maxSpeed * (distance / slowRadius);
        }
        
        // 归一化并缩放到目标速度
        if (distance > 0.001) {
            desired.x = (desired.x / distance) * targetSpeed;
            desired.z = (desired.z / distance) * targetSpeed;
        } else {
            desired.x = 0;
            desired.z = 0;
        }
        
        // 计算转向力
        const steering = {
            x: desired.x - agent.velocity.x,
            z: desired.z - agent.velocity.z
        };
        
        // 限制转向力大小
        const steeringLen = Math.sqrt(steering.x * steering.x + steering.z * steering.z);
        if (steeringLen > agent.maxForce) {
            steering.x = (steering.x / steeringLen) * agent.maxForce;
            steering.z = (steering.z / steeringLen) * agent.maxForce;
        }
        
        // 计算角转向力
        const targetAngle = Math.atan2(desired.z, desired.x) * (180 / Math.PI);
        const angular = this.align(agent, targetAngle);
        
        return { linear: steering, angular };
    }

    /**
     * Align - 对齐方向
     * 平滑地转向目标角度
     */
    static align(agent: AgentState, targetAngle: number): number {
        // 将角度归一化到 [-180, 180]
        let rotation = agent.rotation;
        while (rotation > 180) rotation -= 360;
        while (rotation < -180) rotation += 360;
        
        let target = targetAngle;
        while (target > 180) target -= 360;
        while (target < -180) target += 360;
        
        // 计算角度差
        let rotationDiff = target - rotation;
        
        // 选择最短路径
        if (rotationDiff > 180) {
            rotationDiff -= 360;
        } else if (rotationDiff < -180) {
            rotationDiff += 360;
        }
        
        // 计算期望角速度
        const rotationSize = Math.abs(rotationDiff);
        let targetAngularSpeed: number;
        
        if (rotationSize < 1) {
            // 已经对齐
            return 0;
        } else if (rotationSize > 90) {
            // 大角度，使用最大角速度
            targetAngularSpeed = agent.maxAngularSpeed;
        } else {
            // 小角度，按比例减速
            targetAngularSpeed = agent.maxAngularSpeed * (rotationSize / 90);
        }
        
        // 计算角转向力
        const angular = Math.sign(rotationDiff) * targetAngularSpeed;
        
        // 限制角速度
        return Math.max(-agent.maxAngularSpeed, Math.min(agent.maxAngularSpeed, angular));
    }

    /**
     * Follow Flow Field - 跟随流场方向
     * 将流场方向转换为 Steering Behavior
     */
    static followFlowField(
        agent: AgentState,
        flowDirection: Vec2
    ): SteeringOutput {
        // 将流场方向转换为期望速度
        const desired = {
            x: flowDirection.x * agent.maxSpeed,
            z: flowDirection.z * agent.maxSpeed
        };
        
        // 计算转向力
        const steering = {
            x: desired.x - agent.velocity.x,
            z: desired.z - agent.velocity.z
        };
        
        // 限制转向力大小
        const steeringLen = Math.sqrt(steering.x * steering.x + steering.z * steering.z);
        if (steeringLen > agent.maxForce) {
            steering.x = (steering.x / steeringLen) * agent.maxForce;
            steering.z = (steering.z / steeringLen) * agent.maxForce;
        }
        
        // 计算角转向力
        const targetAngle = Math.atan2(desired.z, desired.x) * (180 / Math.PI);
        const angular = this.align(agent, targetAngle);
        
        return { linear: steering, angular };
    }

    /**
     * Wander - 随机游走
     * 在当前位置附近随机移动（可选功能）
     */
    static wander(
        agent: AgentState,
        wanderTarget: { x: number; z: number; angle: number }
    ): SteeringOutput {
        // 更新游走目标（添加随机抖动）
        wanderTarget.angle += (Math.random() - 0.5) * this.DEFAULT_WANDER_JITTER;
        
        // 计算游走目标位置（在单位前方）
        const forwardX = Math.cos(agent.rotation * Math.PI / 180);
        const forwardZ = Math.sin(agent.rotation * Math.PI / 180);
        
        const target = {
            x: agent.position.x + forwardX * this.DEFAULT_WANDER_DISTANCE + Math.cos(wanderTarget.angle) * this.DEFAULT_WANDER_RADIUS,
            z: agent.position.z + forwardZ * this.DEFAULT_WANDER_DISTANCE + Math.sin(wanderTarget.angle) * this.DEFAULT_WANDER_RADIUS
        };
        
        return this.seek(agent, target);
    }

    /**
     * 限制向量大小
     */
    static limit(vector: Vec2, maxLength: number): Vec2 {
        const length = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
        if (length > maxLength && length > 0.001) {
            return {
                x: (vector.x / length) * maxLength,
                z: (vector.z / length) * maxLength
            };
        }
        return vector;
    }

    /**
     * 归一化向量
     */
    static normalize(vector: Vec2): Vec2 {
        const length = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
        if (length < 0.001) {
            return { x: 0, z: 0 };
        }
        return {
            x: vector.x / length,
            z: vector.z / length
        };
    }

    /**
     * 计算两点之间的距离
     */
    static distance(a: Vec2, b: Vec2): number {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    /**
     * 计算两点之间的方向（归一化）
     */
    static direction(from: Vec2, to: Vec2): Vec2 {
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        return this.normalize({ x: dx, z: dz });
    }
}
