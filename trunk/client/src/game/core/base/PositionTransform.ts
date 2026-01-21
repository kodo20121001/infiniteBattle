/**
 * PositionTransform - 3D到2D位置转换
 * 使用简单的正交投影
 */

// X轴方向的缩放比值
const RATIO_X = 1.0;

// Y轴方向的缩放比值
const RATIO_Y = 0.5;

/**
 * 3D坐标转2D屏幕坐标
 * 使用正交投影：
 * - 2D.x = 3D.x * RATIO_X
 * - 2D.y = 3D.y * RATIO_Y
 * - 3D.z 用于深度排序，不影响2D位置
 * 
 * @param point3d 3D坐标 [x, y, z] 或 {x, y, z}
 * @returns 2D坐标 [x, y]
 */
export function transform3dTo2d(
    point3d: number[] | { x: number; y: number; z: number }
): [number, number] {
    const x3d = Array.isArray(point3d) ? point3d[0] : point3d.x;
    const y3d = Array.isArray(point3d) ? point3d[1] : point3d.y;

    const x2d = x3d * RATIO_X;
    const y2d = y3d * RATIO_Y;

    return [x2d, y2d];
}

/**
 * 2D屏幕坐标转3D坐标
 * 正交投影的逆变换：
 * - 3D.x = 2D.x / RATIO_X
 * - 3D.y = 2D.y / RATIO_Y
 * - 3D.z = 0 (深度信息无法从2D恢复，默认为0)
 * 
 * @param point2d 2D坐标 [x, y] 或 {x, y}
 * @returns 3D坐标 [x, y, z]
 */
export function transform2dTo3d(
    point2d: number[] | { x: number; y: number }
): [number, number, number] {
    const x2d = Array.isArray(point2d) ? point2d[0] : point2d.x;
    const y2d = Array.isArray(point2d) ? point2d[1] : point2d.y;

    const x3d = x2d / RATIO_X;
    const y3d = y2d / RATIO_Y;
    const z3d = 0; // 深度信息无法从2D恢复

    return [x3d, y3d, z3d];
}

/**
 * 将3D世界的高度(Y轴)转换为2D屏幕的垂直偏移
 * 用于在正交投影基础上额外显示物体的高度
 * 
 * @param height3d 3D世界中的高度值
 * @returns 2D屏幕上的Y轴偏移量
 */
export function transformHeightToScreenY(height3d: number): number {
    // 高度到屏幕偏移的缩放比例
    const HEIGHT_RATIO = 0.8;
    
    return height3d * HEIGHT_RATIO;
}
