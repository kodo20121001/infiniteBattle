# 技能编辑器 - 演示功能实现总结

## 📌 功能概述

在技能编辑器的右侧上方添加了一个 **🎮 演示** 按钮，点击后会：
1. 创建一个演示关卡（自动生成配置）
2. 实例化两个角色（玩家和敌人）
3. 立即释放一次正在编辑的技能
4. 在弹窗中显示演示效果和结果

## 📁 创建/修改的文件

### 1. DemoPreview.jsx（新建）
**路径**: `src/features/editor/SkillBehaviorEditor/DemoPreview.jsx`

**功能**:
- 创建演示关卡和地图配置
- 初始化 ClientGameRunner 和 World
- 管理演示生命周期
- 显示演示信息和控制面板
- 支持暂停/恢复功能

**关键特性**:
```javascript
- 自动生成演示关卡配置（id: 9999）
- 包含玩家和敌人两个角色
- 角色位置：玩家在(25, 50)，敌人在(75, 50)
- 延迟 300ms 后自动释放技能
- 实时显示运行时间和伤害结果
```

### 2. SkillBehaviorEditor.jsx（修改）
**修改内容**:

#### a. 导入新组件
```javascript
import SkillDemoPreview from './SkillBehaviorEditor/DemoPreview.jsx';
```

#### b. 添加状态管理
```javascript
const [demoPreviewOpen, setDemoPreviewOpen] = useState(false);
```

#### c. 添加演示按钮
位置：右侧上方，分段标题右边
```jsx
<button
  onClick={() => setDemoPreviewOpen(true)}
  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold"
  title="演示当前技能效果"
>
  🎮 演示
</button>
```

#### d. 集成演示弹窗
```jsx
<SkillDemoPreview
  skillConfig={draft}
  isOpen={demoPreviewOpen}
  onClose={() => setDemoPreviewOpen(false)}
/>
```

### 3. DEMO_GUIDE.md（新建）
**路径**: `src/features/editor/SkillBehaviorEditor/DEMO_GUIDE.md`

详细的使用指南文档。

## 🎮 演示流程

```
用户点击 "🎮 演示"
    ↓
打开演示弹窗
    ↓
初始化 World (800x600)
    ↓
创建 ClientGameRunner
    ↓
加载演示关卡
    ↓
等待 300ms 稳定
    ↓
获取两个角色
    ↓
释放技能 (造成伤害)
    ↓
显示伤害结果
```

## 🎯 演示界面布局

```
┌─────────────────────────────────────────────────┐
│  技能演示 - 技能 #1              ✕              │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────────┐  ┌──────────────┐  │
│  │                         │  │  运行状态    │  │
│  │   游戏画布(800x600)    │  │  🟢 运行中   │  │
│  │   (两个角色)           │  │              │  │
│  │                        │  │  运行时间    │  │
│  │                        │  │  12.34 s     │  │
│  │                        │  │              │  │
│  │                        │  │  技能信息    │  │
│  │                        │  │  ✓ 攻击者   │  │
│  └─────────────────────────┘  │  ✓ 伤害: 10  │  │
│                                │              │  │
│                                │  演示输出    │  │
│                                │  ✓ 技能释放 │  │
│                                │  目标: 90HP │  │
│                                │              │  │
│                                │ [⏸暂停/恢复]│  │
│                                │ [关闭演示]  │  │
│                                └──────────────┘  │
└─────────────────────────────────────────────────┘
```

## 🔧 技术实现

### 演示关卡配置自动生成
```javascript
{
  id: 9999,
  name: '技能演示',
  camps: [
    { id: 1, name: '玩家', playerControlled: true },
    { id: 2, name: '敌人' }
  ],
  startUnits: [
    { unitId: 101, campId: 1, positionName: 'point_0' },
    { unitId: 101, campId: 2, positionName: 'point_1' }
  ]
}
```

### 演示地图配置自动生成
```javascript
{
  id: 1,
  name: '演示地图',
  points: [
    { id: 'point_0', x: 25, y: 50 },   // 玩家
    { id: 'point_1', x: 75, y: 50 }    // 敌人
  ]
}
```

### 核心演示逻辑
```javascript
// 1. 初始化 World
const world = new World(canvas, 800, 600, 60);
const gameRunner = new ClientGameRunner(world);
gameRunner.init();

// 2. 加载关卡
gameRunner.loadLevel(levelConfig, mapConfig);

// 3. 延迟后释放技能
setTimeout(() => {
  const game = gameRunner.getGame();
  const [attacker, target] = game.getActors();
  const damage = skillConfig.segments[0].events[0].data.damageValue || 10;
  
  const damageSystem = game.getSystem('damage');
  damageSystem.causeDamage(attacker.id, target.id, damage);
}, 300);
```

## 📊 数据流

```
draft (当前编辑的技能)
    ↓
传给 SkillDemoPreview 作为 skillConfig prop
    ↓
在演示中：
  - 提取第一个分段的第一个事件
  - 从 event.data.damageValue 读取伤害值
  - 传给 DamageSystem.causeDamage()
    ↓
目标角色受伤，显示结果
```

## 🎯 使用场景

1. **快速验证技能伤害** - 编辑技能伤害值后立即查看效果
2. **调试技能参数** - 在演示中看到实际伤害数据
3. **视觉反馈** - 看到两个角色和伤害结果
4. **工作流优化** - 无需切换到游戏场景测试

## ✨ 特殊功能

### 暂停/恢复
- 点击 "⏸ 暂停/恢复" 按钮可以暂停或恢复游戏
- 用于观察特定时刻的游戏状态

### 实时信息更新
- 运行时间每帧更新
- 显示当前游戏状态
- 显示目标当前生命值

### 演示输出日志
- ✓ = 成功（绿色）
- ✗ = 失败（红色）
- ⚠️ = 警告（黄色）

## 🔌 扩展可能性

未来可以扩展演示功能以支持：
1. **多分段播放** - 按顺序播放所有分段
2. **特效预览** - 渲染技能特效
3. **动画支持** - 播放角色动作
4. **录制回放** - 保存和回放演示
5. **统计数据** - 显示伤害统计

## 📝 文件统计

| 文件 | 类型 | 行数 | 说明 |
|------|------|------|------|
| DemoPreview.jsx | 新建 | 288 | 演示弹窗组件 |
| SkillBehaviorEditor.jsx | 修改 | +15 | 添加按钮和状态 |
| DEMO_GUIDE.md | 新建 | 150+ | 使用指南 |

## ✅ 完成清单

- [x] 创建演示关卡配置生成器
- [x] 创建演示地图配置生成器
- [x] 实现 ClientGameRunner 集成
- [x] 添加技能释放逻辑
- [x] 创建演示弹窗 UI
- [x] 显示演示信息面板
- [x] 实现暂停/恢复功能
- [x] 添加演示按钮到编辑器
- [x] 编写使用指南
- [x] 集成到主编辑器

## 🚀 使用方法

1. 打开技能编辑器
2. 编辑技能配置
3. 在右上方点击 "🎮 演示" 按钮
4. 在弹窗中查看演示效果
5. 关闭演示继续编辑
