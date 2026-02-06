import { ConfigManager } from './ConfigManager';

/**
 * 演示用配置管理器，合并标准配置和演示配置
 */
export class DemoConfigManager extends ConfigManager {
    private demoConfigs: Map<string, any> = new Map();

    constructor() {
        super();
        this.initDemoConfigs();
    }

    private initDemoConfigs(): void {
        // 演示单位配置
        this.demoConfigs.set('unit_9101', {
            id: 9101,
            name: '演示攻击者',
            modelId: 'monkey',
            skillIds: [9001],
            attackSkillId: 9001,
            hitY: 1.2,
            sightRange: 10,
            moveSpeed: 5,
            obstacleCheckDistance: 3
        });

        this.demoConfigs.set('unit_9102', {
            id: 9102,
            name: '演示目标',
            modelId: 'monkey',
            skillIds: [],
            attackSkillId: 1,
            hitY: 1.0,
            sightRange: 10,
            moveSpeed: 5,
            obstacleCheckDistance: 3
        });

        // 子弹演示关卡 (9901)
        this.demoConfigs.set('level_9901', {
            id: 9901,
            name: '子弹演示关卡',
            mapId: 2,
            description: '子弹系统演示：直线/抛物线/导弹追踪',
            camps: [
                { id: 1, name: '玩家', playerControlled: true },
                { id: 2, name: '敌人' }
            ],
            alliances: [
                { sourceCampId: 1, targetCampId: 2, relation: 'enemy', shareVision: false }
            ],
            initialResources: {},
            startUnits: [
                {
                    unitId: 9101,
                    campId: 1,
                    positionName: 101,
                    level: 1,
                    command: {
                        type: 'AttackMove',
                        targetPos: { x: 15, y: 30 },
                    }
                },
                {
                    unitId: 9102,
                    campId: 2,
                    positionName: 102,
                    level: 1,
                    command: {
                        type: 'HoldPosition',
                        guardPos: { x: 15, y: 30 },
                    }
                }
            ],
            winCondition: '',
            loseCondition: '',
            triggers: []
        });

        // 子弹发射技能 (9001)
        this.demoConfigs.set('skill_9001', {
            id: 9001,
            name: '子弹发射技能',
            description: '演示子弹发射',
            skillBehaviorId: 9001,
            castRange: 10,
            table: {}
        });

        // 子弹发射技能行为 (9001)
        this.demoConfigs.set('skill_behavior_9001', {
            id: 9001,
            segments: [
                {
                    id: 1,
                    name: '施法',
                    events: [
                        {
                            id: 1,
                            type: 'bullet',
                            time: 0,
                            data: {
                                bulletId: 2,
                                fromCaster: true,
                                toTarget: true
                            }
                        }
                    ]
                }
            ]
        });
    }

    override Get(key: string): any {
        // 先尝试从标准配置加载
        const standardConfig = super.Get(key);
        
        // 如果是 level 配置，合并演示关卡
        if (key === 'level') {
            const demoLevel = this.demoConfigs.get('level_9901');
            if (demoLevel) {
                standardConfig[9901] = demoLevel;
            }
            return standardConfig;
        }

        // 如果是 skill 配置，合并演示技能
        if (key === 'skill') {
            const demoSkill = this.demoConfigs.get('skill_9001');
            if (demoSkill) {
                standardConfig[9001] = demoSkill;
            }
            return standardConfig;
        }

        // 如果是 skill_behavior 配置，合并演示技能行为
        if (key === 'skill_behavior') {
            const demoSkillBehavior = this.demoConfigs.get('skill_behavior_9001');
            if (demoSkillBehavior) {
                standardConfig[9001] = demoSkillBehavior;
            }
            return standardConfig;
        }

        // 如果是 unit 配置，合并演示单位
        if (key === 'unit') {
            const demoUnit1 = this.demoConfigs.get('unit_9101');
            const demoUnit2 = this.demoConfigs.get('unit_9102');
            if (demoUnit1) standardConfig[9101] = demoUnit1;
            if (demoUnit2) standardConfig[9102] = demoUnit2;
            return standardConfig;
        }

        return standardConfig;
    }
}
