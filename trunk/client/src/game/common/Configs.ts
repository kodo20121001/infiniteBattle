/**
 * 配置管理器接口
 */
interface IConfigManager {
    Get(key: string): any;
}

/**
 * Configs - 静态配置管理器
 * 类似 Assets，提供全局配置访问接口
 * 管理 unit、model 和 map 配置表
 */
export class Configs {
    private static configs: any = {};

    /**
     * 初始化 Configs
     * @param configManager 配置管理器实例
     */
    static init(configManager: IConfigManager) {
        Configs.configs['unit'] = configManager.Get('unit');
        Configs.configs['model'] = configManager.Get('model');
        Configs.configs['map'] = configManager.Get('map');
    }

    /**
     * 获取配置数据
     */
    static Get(name: string): any {
        return Configs.configs[name];
    }
}
