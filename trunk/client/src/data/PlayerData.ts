import type { Equipment } from './Equipment';
import { EquipmentType } from './Equipment';
import type { Item } from './Item';
import { ItemType } from './Item';
import type { Hero } from './Hero';
import type { Pet } from './Pet';
import { ThingType } from '../common/ThingDef';
import type { Thing } from '../common/ThingDef';
import type { ShopItemConfig } from '../config/ShopConfig';

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
    private pets: Pet[];             // 拥有的战宠列表
    
    // 商店购买记录
    private shopRecords: {
        [shopItemId: number]: {
            lifetimeCount: number; // 终身购买次数
            dailyCount: number;    // 每日购买次数
            weeklyCount: number;   // 每周购买次数
            lastBuyTime: number;   // 上次购买时间戳
        }
    };
    
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
        this.pets = [];
        this.shopRecords = {};
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
            heroes: this.heroes,
            pets: this.pets,
            shopRecords: this.shopRecords
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
                this.pets = data.pets || [];
                this.shopRecords = data.shopRecords || {};
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

    // --- Pet Methods ---

    public addPet(pet: Pet): void {
        const existingPet = this.pets.find(p => p.id === pet.id);
        if (!existingPet) {
            this.pets.push(pet);
        } else if (pet.level > 0 && existingPet.level === 0) {
            // 如果是获得完整宠物，且当前是未解锁状态，则解锁
            existingPet.level = pet.level;
        }
        this.save();
    }

    public getPet(id: string): Pet | undefined {
        return this.pets.find(p => p.id === id);
    }

    public getAllPets(): Pet[] {
        return this.pets;
    }

    // --- Thing Methods ---
    
    public hasThing(thing: Thing): boolean {
        switch (thing.type) {
            case ThingType.CURRENCY:
                if (thing.id === 'diamond') return this.resources.diamond >= thing.count;
                if (thing.id === 'gold') return this.resources.coins >= thing.count;
                if (thing.id === 'stamina') return this.resources.stamina >= thing.count;
                return false;
            case ThingType.ITEM:
                const item = this.getItem(thing.id);
                return item ? item.count >= thing.count : false;
            // 其他类型资源检查可在此扩展
            default:
                console.warn(`hasThing: Unsupported thing type ${thing.type}`);
                return false;
        }
    }

    public consumeThing(thing: Thing): boolean {
        if (!this.hasThing(thing)) return false;

        switch (thing.type) {
            case ThingType.CURRENCY:
                if (thing.id === 'diamond') this.resources.diamond -= thing.count;
                else if (thing.id === 'gold') this.resources.coins -= thing.count;
                else if (thing.id === 'stamina') this.resources.stamina -= thing.count;
                break;
            case ThingType.ITEM:
                this.removeItem(thing.id, thing.count);
                break;
            default:
                console.warn(`consumeThing: Unsupported thing type ${thing.type}`);
                return false;
        }
        this.save();
        return true;
    }

    public addThing(thing: Thing): void {
        switch (thing.type) {
            case ThingType.CURRENCY:
                if (thing.id === 'diamond') this.resources.diamond += thing.count;
                else if (thing.id === 'gold') this.resources.coins += thing.count;
                else if (thing.id === 'stamina') this.resources.stamina += thing.count;
                break;
            case ThingType.ITEM:
                this.addItem({
                    id: thing.id,
                    name: thing.id, // 实际应该从配置表读取名称
                    type: ItemType.CONSUMABLE, // 实际应该从配置表读取类型
                    description: '',
                    stackable: true,
                    count: thing.count
                });
                break;
            case ThingType.EQUIPMENT:
                 // 简单模拟添加装备
                 const newEquip: Equipment = {
                     id: thing.id,
                     instanceId: `${thing.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                     name: `装备 <${thing.id}>`, // 实际应查表
                     type: EquipmentType.WEAPON, // 默认武器，实际应查表
                     rarity: EquipmentRarity.COMMON,
                     level: 1,
                     stats: { attack: 10 }
                 };
                 this.addEquipment(newEquip);
                 break;
            case ThingType.HERO:
                 // 简单模拟添加英雄
                 const newHero: Hero = {
                     id: thing.id,
                     instanceId: `${thing.id}_${Date.now()}`,
                     name: `英雄 <${thing.id}>`, // 实际应查表
                     level: 1,
                     experience: 0,
                     maxExperience: 100,
                     stats: { maxHp: 100, currentHp: 100, attack: 10, defense: 5, speed: 10 },
                     equipmentSlots: {},
                     skills: []
                 };
                 this.addHero(newHero);
                 break;
            case ThingType.PET:
                // 完整宠物
                this.addPet({
                    id: thing.id,
                    name: `战宠 <${thing.id}>`, // 实际应查表
                    level: 1, // 初始等级1
                    fragments: 0,
                    skills: [],
                    activePlan: 1
                });
                break;
            case ThingType.PET_FRAGMENT:
                // 宠物碎片
                let pet = this.getPet(thing.id);
                if (!pet) {
                    // 如果还没有该宠物，创建一个未解锁的记录
                    pet = {
                        id: thing.id,
                        name: `战宠 <${thing.id}>`, // 实际应查表
                        level: 0, // 0表示未解锁
                        fragments: 0,
                        skills: [],
                        activePlan: 1
                    };
                    this.addPet(pet);
                }
                // 增加碎片数量
                // 注意：这里我们直接修改对象，因为 addPet 中已经 push 到数组了
                // 如果是新创建的，addPet 已经处理了保存
                // 如果是已存在的，直接修改引用，然后保存
                pet.fragments += thing.count;
                this.save();
                break;
            case ThingType.HERO_FRAGMENT:
                 // 简单模拟添加碎片 (作为道具)
                 this.addItem({
                    id: thing.id,
                    name: `碎片 <${thing.id}>`, 
                    type: ItemType.MATERIAL, 
                    description: '英雄碎片',
                    stackable: true,
                    count: thing.count
                });
                break;
            default:
                console.warn(`addThing: Unsupported thing type ${thing.type}`);
                break;
        }
        this.save();
    }

    // --- Shop Methods ---

    /**
     * 检查是否可以购买商店物品
     */
    public canBuyShopItem(shopItem: ShopItemConfig): { canBuy: boolean; reason?: string } {
        // 1. 检查资源是否足够
        if (!this.hasThing(shopItem.cost)) {
            return { canBuy: false, reason: '资源不足' };
        }

        // 2. 检查限购
        if (shopItem.limit) {
            const record = this.shopRecords[shopItem.id];
            if (record) {
                const now = Date.now();
                const lastBuyDate = new Date(record.lastBuyTime);
                const today = new Date(now);
                
                // 检查终身限购
                if (shopItem.limit.lifetime !== undefined && record.lifetimeCount >= shopItem.limit.lifetime) {
                    return { canBuy: false, reason: '已达终身购买上限' };
                }

                // 检查每日限购 (简单判断是否同一天)
                if (shopItem.limit.daily !== undefined) {
                    const isSameDay = lastBuyDate.getFullYear() === today.getFullYear() &&
                                      lastBuyDate.getMonth() === today.getMonth() &&
                                      lastBuyDate.getDate() === today.getDate();
                    if (isSameDay && record.dailyCount >= shopItem.limit.daily) {
                        return { canBuy: false, reason: '已达今日购买上限' };
                    }
                }

                // 检查每周限购 (简单判断，实际可能需要更严谨的自然周计算)
                if (shopItem.limit.weekly !== undefined) {
                    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                    const isSameWeek = (now - record.lastBuyTime) < msPerWeek; // 简化版判断
                    if (isSameWeek && record.weeklyCount >= shopItem.limit.weekly) {
                        return { canBuy: false, reason: '已达本周购买上限' };
                    }
                }
            }
        }

        return { canBuy: true };
    }

    /**
     * 购买商店物品
     */
    public buyShopItem(shopItem: ShopItemConfig): boolean {
        const checkResult = this.canBuyShopItem(shopItem);
        if (!checkResult.canBuy) {
            console.warn(`购买失败: ${checkResult.reason}`);
            return false;
        }

        // 1. 扣除消耗
        if (!this.consumeThing(shopItem.cost)) {
            return false;
        }

        // 2. 发放奖励
        this.addThing(shopItem.reward);

        // 3. 更新购买记录
        const now = Date.now();
        let record = this.shopRecords[shopItem.id];
        
        if (!record) {
            record = { lifetimeCount: 0, dailyCount: 0, weeklyCount: 0, lastBuyTime: now };
            this.shopRecords[shopItem.id] = record;
        }

        const lastBuyDate = new Date(record.lastBuyTime);
        const today = new Date(now);
        
        // 重置每日/每周计数
        const isSameDay = lastBuyDate.getFullYear() === today.getFullYear() &&
                          lastBuyDate.getMonth() === today.getMonth() &&
                          lastBuyDate.getDate() === today.getDate();
        if (!isSameDay) {
            record.dailyCount = 0;
        }
        
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        if ((now - record.lastBuyTime) >= msPerWeek) {
            record.weeklyCount = 0;
        }

        // 增加计数
        record.lifetimeCount++;
        record.dailyCount++;
        record.weeklyCount++;
        record.lastBuyTime = now;

        this.save();
        return true;
    }
}
