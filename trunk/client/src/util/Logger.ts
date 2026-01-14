/**
 * 日志工具类
 * 提供统一的日志输出管理
 */
class Logger {
  private static isDev = true;
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  /**
   * 设置是否开发模式
   */
  static setDev(isDev: boolean) {
    this.isDev = isDev;
  }

  /**
   * 设置日志等级
   */
  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }

  /**
   * 调试日志
   */
  static debug(message: any, ...args: any[]) {
    if (!this.isDev) return;
    if (this.logLevel !== 'debug') return;
    console.log(`[DEBUG] ${this.formatMessage(message)}`, ...args);
  }

  /**
   * 普通日志
   */
  static log(message: any, ...args: any[]) {
    if (!this.isDev) return;
    console.log(`[LOG] ${this.formatMessage(message)}`, ...args);
  }

  /**
   * 信息日志
   */
  static info(message: any, ...args: any[]) {
    if (!this.isDev) return;
    console.info(`[INFO] ${this.formatMessage(message)}`, ...args);
  }

  /**
   * 警告日志
   */
  static warn(message: any, ...args: any[]) {
    console.warn(`[WARN] ${this.formatMessage(message)}`, ...args);
  }

  /**
   * 错误日志
   */
  static error(message: any, ...args: any[]) {
    console.error(`[ERROR] ${this.formatMessage(message)}`, ...args);
  }

  /**
   * 性能计时 - 开始
   */
  static time(label: string) {
    if (!this.isDev) return;
    console.time(`[TIMER] ${label}`);
  }

  /**
   * 性能计时 - 结束
   */
  static timeEnd(label: string) {
    if (!this.isDev) return;
    console.timeEnd(`[TIMER] ${label}`);
  }

  /**
   * 格式化消息
   */
  private static formatMessage(message: any): string {
    if (typeof message === 'object') {
      return JSON.stringify(message);
    }
    return String(message);
  }

  /**
   * 清空控制台
   */
  static clear() {
    console.clear();
  }

  /**
   * 分组日志
   */
  static group(label: string) {
    if (!this.isDev) return;
    console.group(label);
  }

  /**
   * 结束分组
   */
  static groupEnd() {
    if (!this.isDev) return;
    console.groupEnd();
  }
}

export default Logger;
