// 参数模板定义
export const eventTemplates = {
  damage: {
    damageType: 'fixed',
    damageValue: 0,
    damageKey: '',
    triggerType: 'target',
    maxDistanceType: 'fixed',
    maxDistanceValue: 0,
    maxDistanceKey: '',
    rangeType: 'circle',
    radius: 0,
    length: 0,
    width: 0,
    frontAngle: 0,
    frontDistance: 0
  },
  effect: {},
  shake: {},
  bullet: {},
  sound: {},
  animation: {},
  end: {}
};

export const getDefaultDataForType = (type) => {
  const tpl = eventTemplates[type];
  if (!tpl) return {};
  return JSON.parse(JSON.stringify(tpl));
};
