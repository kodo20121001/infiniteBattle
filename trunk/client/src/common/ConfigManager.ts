export class ConfigManager {
    private configCache: Map<string, any> = new Map();

    // 从 JSON 配置中读取数据的方法
    Get(key: string): any {
        if (!this.configCache.has(key)) {
            // 从配置文件中加载
            this.configCache.set(key, this.loadConfig(key));
        }
        return this.configCache.get(key);
    }

    /**
     * 注入临时配置（单条），用于演示或运行时覆盖
     */
    setTempConfig(key: string, id: number, value: any): void {
        const config = this.Get(key) || {};
        config[id] = value;
        this.configCache.set(key, config);
    }

    /**
     * 注入临时配置（多条），用于演示或运行时覆盖
     */
    setTempConfigs(key: string, entries: Record<number, any>): void {
        const config = this.Get(key) || {};
        Object.keys(entries).forEach(rawId => {
            const id = Number(rawId);
            config[id] = entries[id];
        });
        this.configCache.set(key, config);
    }

    // 加载配置的实现
    private loadConfig(key: string): any {
        try {
            // 从 public/config 文件夹加载 JSON 配置文件
            const configPath = `/config/${key}.json`;
            
            // 使用 fetch 同步加载（注意：这是一个同步实现的近似）
            // 实际上应该使用异步加载，但为了保持接口兼容，这里使用 XMLHttpRequest
            const xhr = new XMLHttpRequest();
            xhr.open('GET', configPath, false); // false 表示同步请求
            
            try {
                xhr.send();
                
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    // 如果数据是数组，转换为对象映射（便于按 ID 查询）
                    if (Array.isArray(data)) {
                        const map: Record<number, any> = {};
                        data.forEach(item => {
                            if (item.id !== undefined) {
                                map[item.id] = item;
                            }
                        });
                        return map;
                    }
                    return data;
                } else {
                    console.warn(`Failed to load config ${key}: HTTP ${xhr.status}`);
                    return {};
                }
            } catch (error) {
                console.error(`Error loading config ${key}:`, error);
                return {};
            }
        } catch (error) {
            console.error(`Error in loadConfig for key '${key}':`, error);
            return {};
        }
    }
}
