import { ConfigManager } from '../common/ConfigManager';

export interface PetConfigData {
    id: string;
    name: string;
    model: string;
    quality: 'green' | 'blue' | 'purple' | 'orange';
    baseFragmentsNeeded: number;
    statsBonus: Record<string, number>;
    skills: { id: string; level: number }[];
}

export class PetConfig {
    public static getConfig(id: string): PetConfigData | undefined {
        const configs = ConfigManager.instance.Get('pet');
        return configs ? configs[id] : undefined;
    }

    public static getAllConfigs(): PetConfigData[] {
        const configs = ConfigManager.instance.Get('pet');
        return configs ? Object.values(configs) : [];
    }
}
