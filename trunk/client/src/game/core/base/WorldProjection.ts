/**
 * WorldProjection - 世界坐标到屏幕投影
 * 
 * 俯视角游戏坐标系：
 * - 世界坐标：2D地面位置 (x, z) + 高度 y
 * - 屏幕坐标：正交投影到2D画面
 * 
 * 投影规则：
 * - screenX = worldX
 * - screenY = worldZ - worldY * heightFactor
 * - 高度会影响屏幕Y偏移（飞得越高，显示越靠上）
 */

// 高度影响屏幕Y的系数
const HEIGHT_FACTOR = 0.5;

/**
 * 世界坐标转屏幕坐标
 * @param x 世界 X 坐标（水平）
 * @param z 世界 Z 坐标（深度）
 * @param y 世界 Y 坐标（高度）
 * @returns [screenX, screenY]
 */
export function worldToScreen(x: number, z: number, y: number = 0): [number, number] {
    const screenX = x;
    const screenY = z - y * HEIGHT_FACTOR;
    return [screenX, screenY];
}

/**
 * 屏幕坐标转世界坐标（假设高度为0）
 * @param screenX 屏幕 X 坐标
 * @param screenY 屏幕 Y 坐标
 * @returns [worldX, worldZ, worldY]
 */
export function screenToWorld(screenX: number, screenY: number): [number, number, number] {
    const worldX = screenX;
    const worldZ = screenY;
    const worldY = 0; // 默认高度为0
    return [worldX, worldZ, worldY];
}

/**
 * 计算高度对屏幕Y的偏移量
 * @param height 高度值
 * @returns Y轴偏移量
 */
export function getHeightOffset(height: number): number {
    return -height * HEIGHT_FACTOR;
}
