/**
 * 配置管理器接口
 */
interface IConfigManager {
    Get(key: string): any;
}

/**
 * Configs - 静态配置管理器
 * 类似 Assets，提供全局配置访问接口
 * 仅管理 unit 和 model 两个配置表
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
    }

    /**
     * 获取配置数据
     */
    static Get(name: string): any {
        return Configs.configs[name];
    }
}
