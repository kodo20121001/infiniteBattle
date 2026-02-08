/**
 * 建筑预设模板
 * 基于魔兽争霸III的设计思路
 */

/**
 * 创建一个空白建筑模板
 */
export const createEmptyBuilding = (id) => ({
  id: id || `building_${Date.now()}`,
  name: '新建筑',
  description: '',
  modelId: '',
  icon: '',
  baseData: {
    hp: 500,
    hpMax: 500,
    cost: {
      gold: 100,
      wood: 0
    },
    buildTime: 30,
    occupiedCells: [
      [-1, -1], [0, -1],
      [-1, 0], [0, 0]
    ],
    armor: 0,
    armorType: 'light'
  },
  abilities: []
});

/**
 * 生产建筑模板 (如兵营、工厂)
 */
export const createProductionBuilding = (id, name = '生产建筑') => ({
  ...createEmptyBuilding(id),
  name,
  description: '训练/生产单位',
  baseData: {
    hp: 1500,
    hpMax: 1500,
    cost: {
      gold: 200,
      wood: 50
    },
    buildTime: 60,
    occupiedCells: [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0], [0, 0], [1, 0],
      [-1, 1], [0, 1], [1, 1]
    ],
    armor: 5,
    armorType: 'fortified'
  },
  abilities: [
    {
      type: 'ProductionQueue',
      config: {
        queueSize: 6,
        speedMultiplier: 1.0,
        units: []
      }
    },
    {
      type: 'TechResearcher',
      config: {
        techs: [],
        researchSpeedMultiplier: 1.0
      }
    }
  ]
});

/**
 * 防御建筑模板 (如箭塔、炮塔)
 */
export const createDefenseBuilding = (id, name = '防御塔') => ({
  ...createEmptyBuilding(id),
  name,
  description: '防御建筑，自动攻击敌人',
  baseData: {
    hp: 800,
    hpMax: 800,
    cost: {
      gold: 150,
      wood: 0
    },
    buildTime: 40,
    occupiedCells: [
      [-1, -1], [0, -1],
      [-1, 0], [0, 0]
    ],
    armor: 10,
    armorType: 'fortified'
  },
  abilities: [
    {
      type: 'TurretAttack',
      config: {
        range: 700,
        damage: 28,
        attackSpeed: 1.5,
        attackSkillId: 1,
        targetAir: true,
        targetGround: true
      }
    },
    {
      type: 'DefenseSystem',
      config: {
        armor: 5,
        armorType: 'fortified',
        regeneration: 0
      }
    }
  ]
});

/**
 * 主基地模板
 */
export const createMainBaseBuilding = (id, name = '主基地') => ({
  ...createEmptyBuilding(id),
  name,
  description: '主建筑，训练工人并提供资源采集点',
  baseData: {
    hp: 2500,
    hpMax: 2500,
    cost: {
      gold: 0,
      wood: 0
    },
    buildTime: 0,
    occupiedCells: [
      [-2, -2], [-1, -2], [0, -2], [1, -2],
      [-2, -1], [-1, -1], [0, -1], [1, -1],
      [-2, 0], [-1, 0], [0, 0], [1, 0],
      [-2, 1], [-1, 1], [0, 1], [1, 1]
    ],
    armor: 5,
    armorType: 'fortified'
  },
  abilities: [
    {
      type: 'ProductionQueue',
      config: {
        queueSize: 5,
        speedMultiplier: 1.0,
        units: []
      }
    },
    {
      type: 'ResourceCollector',
      config: {
        resourceTypes: ['gold', 'wood'],
        gatherBonus: 0
      }
    },
    {
      type: 'SupplyProvider',
      config: {
        supplyAmount: 10
      }
    },
    {
      type: 'TechResearcher',
      config: {
        techs: [],
        researchSpeedMultiplier: 1.0
      }
    }
  ]
});

/**
 * 资源建筑模板 (如农场、人口房)
 */
export const createResourceBuilding = (id, name = '资源建筑') => ({
  ...createEmptyBuilding(id),
  name,
  description: '提供资源或人口',
  baseData: {
    hp: 500,
    hpMax: 500,
    cost: {
      gold: 80,
      wood: 20
    },
    buildTime: 30,
    occupiedCells: [
      [-1, -1], [0, -1],
      [-1, 0], [0, 0]
    ],
    armor: 0,
    armorType: 'light'
  },
  abilities: [
    {
      type: 'SupplyProvider',
      config: {
        supplyAmount: 6
      }
    }
  ]
});

/**
 * 英雄祭坛模板
 */
export const createHeroAltarBuilding = (id, name = '英雄祭坛') => ({
  ...createEmptyBuilding(id),
  name,
  description: '训练和复活英雄',
  baseData: {
    hp: 1200,
    hpMax: 1200,
    cost: {
      gold: 180,
      wood: 50
    },
    buildTime: 60,
    occupiedCells: [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0], [0, 0], [1, 0],
      [-1, 1], [0, 1], [1, 1]
    ],
    armor: 5,
    armorType: 'fortified'
  },
  abilities: [
    {
      type: 'HeroAltar',
      config: {
        heroes: [],
        reviveCostMultiplier: 1.0,
        reviveTimeMultiplier: 1.0
      }
    }
  ]
});

/**
 * 光环建筑模板 (如战争磨坊)
 */
export const createAuraBuilding = (id, name = '光环建筑') => ({
  ...createEmptyBuilding(id),
  name,
  description: '为周围单位提供增益效果',
  baseData: {
    hp: 600,
    hpMax: 600,
    cost: {
      gold: 120,
      wood: 30
    },
    buildTime: 40,
    occupiedCells: [
      [-1, -1], [0, -1],
      [-1, 0], [0, 0]
    ],
    armor: 3,
    armorType: 'medium'
  },
  abilities: [
    {
      type: 'Aura',
      config: {
        radius: 300,
        target: 'ally',
        effects: []
      }
    }
  ]
});

/**
 * 所有预设模板列表
 */
export const buildingTemplates = [
  {
    id: 'empty',
    name: '空白建筑',
    icon: '📦',
    description: '从零开始创建',
    create: createEmptyBuilding
  },
  {
    id: 'production',
    name: '生产建筑',
    icon: '🏭',
    description: '兵营、工厂类型',
    create: createProductionBuilding
  },
  {
    id: 'defense',
    name: '防御建筑',
    icon: '🎯',
    description: '箭塔、炮塔类型',
    create: createDefenseBuilding
  },
  {
    id: 'main_base',
    name: '主基地',
    icon: '🏰',
    description: '主建筑、城镇中心',
    create: createMainBaseBuilding
  },
  {
    id: 'resource',
    name: '资源建筑',
    icon: '🏠',
    description: '农场、人口房',
    create: createResourceBuilding
  },
  {
    id: 'hero_altar',
    name: '英雄祭坛',
    icon: '⚔️',
    description: '训练/复活英雄',
    create: createHeroAltarBuilding
  },
  {
    id: 'aura',
    name: '光环建筑',
    icon: '✨',
    description: '提供光环效果',
    create: createAuraBuilding
  }
];

/**
 * 根据模板ID创建建筑
 */
export const createBuildingFromTemplate = (templateId, customId) => {
  const template = buildingTemplates.find(t => t.id === templateId);
  if (!template) {
    console.warn('未找到模板:', templateId);
    return createEmptyBuilding(customId);
  }
  return template.create(customId || `${templateId}_${Date.now()}`);
};
