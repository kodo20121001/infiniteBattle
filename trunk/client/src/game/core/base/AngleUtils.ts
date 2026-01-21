/**
 * AngleUtils - 角度相关的工具函数
 */

/**
 * 根据角度获取方向象限
 * 将 0-360 度分成 4 个象限，每个象限对应一个方向值 1-4
 * 
 * @param angle 角度值（单位：度）
 * @returns 方向值 1-4
 *   - 1: 0-90 度
 *   - 2: 90-180 度
 *   - 3: 180-270 度
 *   - 4: 270-360 度
 */
export function angleToDirection(angle: number): number {
    // 规范化角度到 0-360 范围
    angle = ((angle % 360) + 360) % 360;
    
    // 将 0-360 度分成 4 个象限
    // 0-90: 方向1, 90-180: 方向2, 180-270: 方向3, 270-360: 方向4
    return Math.ceil((angle + 90) / 90) % 4 || 4;
}

/**
 * 将角度转换为方向向量
 * 
 * @param angleInDegrees 角度值（单位：度）
 * @returns 方向向量 [x, y]
 */
export function angleToVector(angleInDegrees: number): [number, number] {
    // 将角度转换为弧度
    let angleInRadians = (90 - angleInDegrees) * (Math.PI / 180);
    
    // 返回使用弧度的余弦和正弦计算的结果
    return [Math.cos(angleInRadians), Math.sin(angleInRadians)];
}

/**
 * 将向量转换为角度
 * 
 * @param vector 向量 [x, y] 或 {x, y}
 * @returns 角度值（单位：度）
 */
export function vectorToAngle(vector: number[] | { x: number; y: number }): number {
    const x = Array.isArray(vector) ? vector[0] : vector.x;
    const y = Array.isArray(vector) ? vector[1] : vector.y;
    
    // 计算弧度
    let angleRadians = Math.atan2(y, x);
    // 将弧度转换为度
    let angleDegrees = angleRadians * (180 / Math.PI);
    // 计算最终角度
    return 90 - angleDegrees;
}

/**
 * 2D向量线性插值
 * 
 * @param start 起始向量 {x, y}
 * @param end 结束向量 {x, y}
 * @param t 插值系数 (0-1)
 * @returns 插值结果向量 {x, y}
 */
export function vec2Lerp(start: { x: number; y: number }, end: { x: number; y: number }, t: number): { x: number; y: number } {
    return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
    };
}
