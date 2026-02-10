/**
 * 性能监控工具
 * 定期输出关键性能指标
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor | null = null;
    private lastReportTime: number = 0;
    private reportInterval: number = 1000; // 1秒
    
    private counters: Map<string, number> = new Map();
    private lastCounters: Map<string, number> = new Map();

    private constructor() {}

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * 增加计数
     */
    increment(key: string, amount: number = 1): void {
        const current = this.counters.get(key) || 0;
        this.counters.set(key, current + amount);
    }

    /**
     * 设置计数值
     */
    set(key: string, value: number): void {
        this.counters.set(key, value);
    }

    /**
     * 更新监控（每帧调用）
     */
    update(): void {
        const now = performance.now();
        if (now - this.lastReportTime >= this.reportInterval) {
            //this.report();
            this.lastReportTime = now;
        }
    }

    /**
     * 输出报告
     */
    private report(): void {
        const lines: string[] = ['=== Performance Report ==='];
        
        for (const [key, value] of this.counters.entries()) {
            const lastValue = this.lastCounters.get(key) || 0;
            const delta = value - lastValue;
            const perSecond = delta / (this.reportInterval / 1000);
            
            lines.push(`${key}: ${value.toFixed(0)} (${perSecond.toFixed(1)}/s)`);
            this.lastCounters.set(key, value);
        }
        
        console.log(lines.join('\n'));
    }

    /**
     * 重置所有计数器
     */
    reset(): void {
        this.counters.clear();
        this.lastCounters.clear();
    }
}

// 全局实例
export const perfMonitor = PerformanceMonitor.getInstance();
