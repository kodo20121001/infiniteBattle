/**
 * 战斗属性常量枚举
 */
export const BattleAttrNone = 0;
export const BattleAttrHPMax = 1;              // 最大生命力,生命力上限,生命力为0时,角色死亡
export const BattleAttrHPMaxPct = 2;           // 生命力百分比,对生命力上限百分比进行乘法的计算,最终生命力=最大生命力(1+生命力百分比加成)
export const BattleAttrHPCur = 3;              // 当前生命力,角色当前状态下的生命力
export const BattleAttrAttackVal = 4;          // 攻击力,角色的基础攻击力数值
export const BattleAttrAttackPct = 5;          // 攻击力百分比,对基础攻击力进行百分比乘法加成的属性,最终攻击力=攻击力*(1+攻击力百分比加成)
export const BattleAttrAttackSpeed = 6;        // 攻速,基础攻击速度,100=30帧每秒(默认设定帧数),攻击速度提升提高每秒播放帧数
export const BattleAttrAttackSpeedPct = 7;     // 攻速提升百分比,最终速度=基础攻击速度*(1+攻速提升百分比)
export const BattleAttrStaminaPct = 8;         // 生命每秒恢复,生命每秒自动恢复的值
export const BattleAttrGroundMoveSpeed = 9;    // 移动速度,基础移动速度
export const BattleAttrGroundMoveSpeedPct = 10; // 移动速度百分比,对基础移动速度进行乘法加成的计算,最终移动速度=基础移动速度*(1+移动速度百分比加成)
export const BattleAttrSkillCD = 11;           // 技能冷却,直接影响技能cd时间
export const BattleAttrSkillCDPct = 12;        // 技能冷却缩减,冷却时间百分比缩减,最终技能冷却时间=技能冷却时间*(1-技能冷却时间百分比)
export const BattleAttrCriticalPct = 13;       // 暴击率,本次伤害是否造成暴击的概率,先通过暴击概率判断此次伤害是否造成暴击
export const BattleAttrCriticalIncrPct = 14;   // 暴击率百分比,对暴击率进行百分比乘法计算,最终暴击率=暴击率*(1*暴击率百分比加成)
export const BattleAttrCriticalDmgPct = 15;    // 暴击伤害,额外增加的暴击伤害系数,最终暴击伤害系数=基础暴击伤害系数固定150%+暴击伤害
export const BattleAttrEvadeProb = 16;         // 闪避率,受到攻击时触发闪避免疫伤害的概率,通过闪避率判断此次伤害是否生效
export const BattleAttrShieldCoverMax = 17;    // 护盾最大值,护盾值用以抵消受到的伤害值,先于生命力扣减
export const BattleAttrShieldCoverCur = 18;    // 护盾当前值,护盾值用以抵消受到的伤害值,当前剩余的护盾值,剩余护盾值不足以扣减伤害时,多出的伤害部分用生命力扣减
export const BattleAttrHitResumeVal = 19;      // 击中生命恢复,命中目标时恢复特定数值的生命值,每次命中时结算
export const BattleAttrKillResumeVal = 20;     // 击杀生命恢复,击杀目标时恢复特点数值的生命值,每次击杀目标时结算,同时击杀多个目标时一起结算
export const BattleAttrDamageReduce = 21;      // 伤害减免,最终伤害减免= 伤害减免+伤害减免...
export const BattleAttrDamageIncrease = 22;    // 伤害增幅,最终伤害增幅 = 伤害增幅+伤害增幅....
export const BattleAttrVampire = 23;           // 吸血,通过乘以造成的最终伤害获得恢复生命的值,吸血*实际最终伤害值=恢复生命值
export const BattleAttrBlock = 24;             // 格挡,受到攻击时触发格挡减免50%伤害的概率,通过格挡率判断此次伤害是否触发格挡
export const BattleAttrMax = 25;

/**
 * 战斗属性结构
 */
export interface BattleAttributes {
  values: number[];      // 长度为 BattleAttrMax 的数组
  battle_power: number;  // 战斗力
}
