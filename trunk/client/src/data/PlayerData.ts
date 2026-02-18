import { Equipment, EquipmentType } from './Equipment';
import { Item, ItemType } from './Item';
import { Hero } from './Hero';

const STORAGE_KEY = 'infinite_play_player_data';

export class PlayerData {
    private static instance: PlayerData;

    public name: string;        // 玩家名称
    public level: number;       // 玩家等级
    public experience: number;  // 玩家经验
    public resources: {         // 资源
        diamond: number;    // 钻石
        coins: number;      // 金币
        stamina: number;    // 体力
    };

    private equipments: Equipment[]; // 拥有的装备列表
    private items: Item[];           // 拥有的道具列表
    private heroes: Hero[];          // 拥有的英雄列表
    
    // Helper map for quick lookups if needed, but array filters are fine for small datasets
    
    private constructor() {
        this.name = 'Player';
        this.level = 1;
        this.experience = 0;
        this.resources = {
            diamond: 0,
            coins: 0,
            stamina: 0
        };
        this.equipments = [];
        this.items = [];
        this.heroes = [];
    }

    public static getInstance(): PlayerData {
        if (!PlayerData.instance) {
            PlayerData.instance = new PlayerData();
            PlayerData.instance.load();
        }
        return PlayerData.instance;
    }

    // --- Persistence ---

    public save(): void {
        const data = {
            name: this.name,
            level: this.level,
            experience: this.experience,
            resources: this.resources,
            equipments: this.equipments,
            items: this.items,
            heroes: this.heroes
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Player data saved successfully.');
        } catch (e) {
            console.error('Failed to save player data:', e);
        }
    }

    public load(): void {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                this.name = data.name || this.name;
                this.level = data.level || 1;
                this.experience = data.experience || 0;
                this.resources = data.resources || this.resources;
                this.equipments = data.equipments || [];
                this.items = data.items || [];
                // Ensure items that shouldn't be null are arrays
                this.heroes = data.heroes || [];
                console.log('Player data loaded successfully.');
            } catch (e) {
                console.error('Failed to load player data:', e);
            }
        } else {
            // Initialize defaults if needed
            this.initMockData();
        }
    }

    private initMockData() {
        this.resources = { diamond: 100, coins: 1000, stamina: 100 };
    }

    // --- Equipment Methods ---

    public addEquipment(equipment: Equipment): void {
        this.equipments.push(equipment);
        this.save();
    }

    public getEquipment(instanceId: string): Equipment | undefined {
        return this.equipments.find(e => e.instanceId === instanceId);
    }

    public getAllEquipment(): Equipment[] {
        return this.equipments;
    }

    public getEquipmentByType(type: EquipmentType): Equipment[] {
        return this.equipments.filter(e => e.type === type);
    }

    // --- Item (Prop) Methods ---

    public addItem(item: Item): void {
        const existing = this.items.find(i => i.id === item.id);
        if (existing && existing.stackable) {
            existing.count += item.count;
            if (existing.maxStack && existing.count > existing.maxStack) {
                existing.count = existing.maxStack; // Cap at max
            }
        } else {
            this.items.push(item);
        }
        this.save();
    }

    public removeItem(itemId: string, count: number = 1): boolean {
        const index = this.items.findIndex(i => i.id === itemId);
        if (index === -1) return false;

        const item = this.items[index];
        if (item.count >= count) {
            item.count -= count;
            if (item.count <= 0) {
                this.items.splice(index, 1);
            }
            this.save();
            return true;
        }
        return false;
    }

    public getItem(itemId: string): Item | undefined {
        return this.items.find(i => i.id === itemId);
    }

    public getAllItems(): Item[] {
        return this.items;
    }

    // --- Hero Methods ---

    public addHero(hero: Hero): void {
        // Prevent duplicate hero instances if necessary, or just add
        if (!this.heroes.find(h => h.instanceId === hero.instanceId)) {
            this.heroes.push(hero);
            this.save();
        }
    }

    public getHero(instanceId: string): Hero | undefined {
        return this.heroes.find(h => h.instanceId === instanceId);
    }

    public getAllHeroes(): Hero[] {
        return this.heroes;
    }
}
