/**
 * WorldProjection - 世界坐标到屏幕投影
 *
 * 坐标与投影约定（统一与编辑器/Canvas）：
 * - Canvas 原点：左上角；x 向右为正，y 向下为正。
 * - 世界坐标：x（水平方向）、z（屏幕向下方向，越近越大）、y（高度，越高越上）。
 * - 投影采用正交俯视：将 (x, z) 投到屏幕，y 只作为向上的偏移量。
 *
 * 映射公式（单位：米 → 像素）：
 * - screenX = x * pixelsPerMeterX
 * - screenY = z * pixelsPerMeterY - y * HEIGHT_FACTOR * pixelsPerMeterY
 *   说明：z 越大越靠近屏幕底部（y向下为正），y（高度）会让显示位置略向上偏移。
 *
 * 设计分辨率：
 * - 地图显示尺寸 = (mapWidth * pixelsPerMeterX, mapHeight * pixelsPerMeterY)。
 * - 背景图应按该尺寸等比缩放，并使用左上角像素坐标定位，保证与格子/点位对齐。
 *
 * 备注：
 * - 若未来需要“左下为原点”的显示效果，可在渲染层做纵轴翻转：
 *   screenY = (mapHeight - z) * pixelsPerMeterY - y * HEIGHT_FACTOR * pixelsPerMeterY。
 *   数据保持不变，仅改变显示映射。
 */

// 高度影响屏幕Y的系数
const HEIGHT_FACTOR = 0.5;

/**
 * 世界坐标转屏幕坐标
 * @param x 世界 X 坐标（水平，单位：米）
 * @param y 世界 Y 坐标（高度，单位：米）
 * @param z 世界 Z 坐标（深度，单位：米）
 * @param pixelsPerMeterX 横轴缩放：1米对应多少像素（默认32）
 * @param pixelsPerMeterY 纵轴缩放：1米对应多少像素（默认16）
 * @returns [screenX, screenY]
 */
export function worldToScreen(
    x: number,
    y: number,
    z: number,
    pixelsPerMeterX: number = 32,
    pixelsPerMeterY: number = 16
): [number, number] {
    const screenX = x * pixelsPerMeterX;
    const screenY = z * pixelsPerMeterY - y * HEIGHT_FACTOR * pixelsPerMeterY;
    return [screenX, screenY];
}

/**
 * 屏幕坐标转世界坐标（假设高度为0）
 * @param screenX 屏幕 X 坐标（像素）
 * @param screenY 屏幕 Y 坐标（像素）
 * @param pixelsPerMeterX 横轴缩放：1米对应多少像素（默认32）
 * @param pixelsPerMeterY 纵轴缩放：1米对应多少像素（默认16）
 * @returns [worldX, worldZ, worldY] 世界坐标（米）
 */
export function screenToWorld(
    screenX: number, 
    screenY: number,
    pixelsPerMeterX: number = 32,
    pixelsPerMeterY: number = 16
): [number, number, number] {
    const worldX = screenX / pixelsPerMeterX;
    const worldZ = screenY / pixelsPerMeterY;
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
