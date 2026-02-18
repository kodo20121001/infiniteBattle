import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shirt,
  Crosshair,
  Users,
  Zap,
  Gem,
  Hammer,
  Trash2,
  Backpack,
  Settings,
  User,
  Layers,
  Box,
  Hexagon,
  Shield,
} from 'lucide-react';

export default function CharacterUI({ userData }) {
  const [activeTab, setActiveTab] = useState('装备');

  // 模拟背包数据 (30个格子)
  const inventoryItems = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    tier: 3,
    level: 1,
    icon: i % 4 === 0 ? 'helmet' : i % 4 === 1 ? 'armor' : i % 4 === 2 ? 'boots' : 'glove',
  }));

  const equipData = [
    { tier: '2阶', level: '32级', icon: 'helmet', rarity: 'purple' },
    { tier: '2阶', level: '30级', icon: 'glove', rarity: 'purple' },
    { tier: '4阶', level: '31级', icon: 'armor', rarity: 'gold' },
    { tier: '3阶', level: '31级', icon: 'pants', rarity: 'gold' },
    { tier: '2阶', level: '31级', icon: 'boots', rarity: 'purple' },
    { tier: '2阶', level: '30级', icon: 'glove', rarity: 'purple' },
  ];

  return (
    <div className="relative flex-1 flex flex-col min-h-[380px] z-10 overflow-hidden">
      
      {/* 角色背景光效 */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>

      <div className="flex flex-1 relative p-1">
        
        {/* 左侧：功能按钮 (垂直排列) */}
        <div className="flex flex-col gap-3 pt-4 w-14 z-20 shrink-0 items-center">
          <LeftSideButton icon={Shirt} label="时装" color="orange" />
          <LeftSideButton icon={Crosshair} label="枪械" color="orange" />
          <LeftSideButton icon={Users} label="佣兵" color="orange" />
          <LeftSideButton icon={Zap} label="先锋技能" color="yellow" />
        </div>

        {/* 中间：角色模型 & 战力 */}
        <div className="flex-1 flex flex-col items-center justify-end pb-2 relative z-10">
          {/* 角色占位符 (全息投影风格) */}
          <div className="absolute top-4 bottom-12 w-full flex items-center justify-center pointer-events-none">
            <div className="relative w-full h-full flex items-center justify-center">
              <User size={160} className="text-slate-600 opacity-50 drop-shadow-2xl" strokeWidth={1} />
              {/* 扫描线动画 */}
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute w-full h-1 bg-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
              ></motion.div>
            </div>
          </div>

          {/* 战斗力数值 */}
          <div className="relative z-20 mt-auto mb-2">
            <div className="relative bg-gradient-to-r from-orange-600/90 to-red-600/90 px-6 py-1.5 rounded-full border border-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.4)] flex items-center gap-2 transform skew-x-[-10deg]">
              <div className="bg-white/20 p-1 rounded-full animate-pulse">
                <Zap size={14} className="text-white fill-current" />
              </div>
              <span className="text-2xl font-black text-white italic tracking-wider transform skew-x-[10deg]">
                {userData?.power || 1057}
              </span>
              <div className="absolute -right-2 -top-2 bg-slate-800 rounded-full p-0.5 border border-slate-600">
                <div className="w-3 h-3 text-[8px] flex items-center justify-center text-slate-400">i</div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：装备栏 (放大显示) */}
        <div className="w-40 pt-1 z-20 flex flex-col items-end shrink-0 relative">
          {/* 宝石按钮悬浮在装备栏左侧 */}
          <div className="absolute left-0 top-1/3 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
            <div className="w-9 h-9 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:border-cyan-400 hover:text-cyan-400 transition-colors">
              <Gem size={16} />
            </div>
            <span className="text-[9px] font-bold text-slate-400 bg-black/50 px-1 rounded">宝石</span>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            {equipData.map((equip, idx) => (
              <EquipSlot
                key={idx}
                tier={equip.tier}
                level={equip.level}
                icon={equip.icon}
                rarity={equip.rarity}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 方案切换条 */}
      <div className="h-11 mx-2 mb-2 bg-slate-900/80 border border-slate-700 rounded-lg flex items-center justify-between px-2 shrink-0 relative overflow-hidden backdrop-blur-sm">
        <div className="flex items-center gap-1.5 z-10">
          <div className="w-6 h-6 bg-orange-500 text-white text-xs font-bold flex items-center justify-center rounded shadow-md">
            1
          </div>
          <div className="text-xs font-bold text-slate-300 mr-1">方案1</div>
          <Settings size={14} className="text-slate-500" />

          {/* 其他方案数字 */}
          <div className="flex gap-1 ml-2">
            {[2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="w-6 h-6 bg-slate-800/50 border border-slate-600 text-[10px] flex items-center justify-center text-slate-500 rounded hover:border-cyan-500 cursor-pointer"
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-xs font-bold px-3 py-1.5 rounded border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-white flex items-center gap-1 z-10"
        >
          <Hammer size={12} className="fill-current" />
          装备锻造
        </motion.button>
      </div>

      {/* ================= 背包容器 ================= */}
      <div className="flex-1 bg-[#0a101a] border-t-2 border-cyan-900/50 flex flex-col min-h-0 relative z-20 rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
        
        {/* 背包头部 */}
        <div className="flex items-center justify-between px-3 py-2 shrink-0 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Backpack size={16} className="text-orange-400" />
            <span className="text-sm font-bold text-slate-200">我的背包</span>
            <div className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400 border border-slate-700">
              <span className="text-green-400">105</span>/200
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-950/30 border border-amber-800/50 px-4 py-1 rounded hover:bg-amber-900/50 transition-colors"
          >
            <Trash2 size={12} />
            分解
          </motion.button>
        </div>

        {/* 背包网格 (可滚动) */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-black/20">
          <div className="grid grid-cols-6 gap-1.5">
            {inventoryItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.01 }}
                className="aspect-square rounded border border-slate-700 bg-slate-800/40 relative cursor-pointer group hover:border-cyan-500 hover:bg-cyan-900/20 transition-all"
              >
                <div className="absolute top-0.5 left-0.5 text-[8px] text-slate-400 font-mono leading-none">
                  {item.tier}阶
                </div>
                <div className="w-full h-full flex items-center justify-center p-1">
                  <ItemIcon type={item.icon} className="text-slate-500 group-hover:text-cyan-300" />
                </div>
                <div className="absolute bottom-0 right-0.5 text-[8px] text-white/40">1</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 分类标签页 */}
        <div className="flex bg-[#050b14] border-t border-slate-800 shrink-0">
          {['宝石', '装备', '材料', '芯片'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-bold text-center relative transition-colors ${
                activeTab === tab
                  ? 'text-white bg-gradient-to-t from-orange-900/20 to-transparent'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 子组件 ---

function LeftSideButton({ icon: Icon, label, color }) {
  const isYellow = color === 'yellow';
  return (
    <div className="group relative flex flex-col items-center gap-0.5 cursor-pointer w-full">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300
        ${
          isYellow
            ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-orange-500 hover:text-orange-400'
        }
      `}
      >
        <Icon size={18} />
      </div>
      <span
        className={`text-[9px] font-bold scale-90 ${
          isYellow ? 'text-yellow-500' : 'text-slate-500 group-hover:text-orange-400'
        }`}
      >
        {label}
      </span>
      {/* 红点提示 */}
      {['时装', '佣兵'].includes(label) && (
        <div className="absolute top-0 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse"></div>
      )}
    </div>
  );
}

function EquipSlot({ tier, level, icon, rarity }) {
  const colors = {
    purple: 'border-purple-500/50 bg-purple-900/10 shadow-[inset_0_0_15px_rgba(168,85,247,0.1)]',
    gold: 'border-yellow-500/50 bg-yellow-900/10 shadow-[inset_0_0_15px_rgba(234,179,8,0.1)]',
  };

  const textColors = {
    purple: 'text-purple-300',
    gold: 'text-yellow-300',
  };

  return (
    <div
      className={`aspect-square rounded-lg border-2 ${colors[rarity]} relative flex items-center justify-center cursor-pointer overflow-hidden group hover:brightness-125 transition-all`}
    >
      {/* 左上角阶数 */}
      <div className="absolute top-0 left-0 bg-black/60 px-1 rounded-br text-[9px] font-bold text-white border-b border-r border-white/10 z-10">
        {tier}
      </div>

      {/* 图标 */}
      <ItemIcon type={icon} className={`w-10 h-10 ${textColors[rarity]} opacity-80 group-hover:scale-110 transition-transform duration-300`} />

      {/* 右下角等级 */}
      <div className="absolute bottom-0 right-0 w-full bg-black/70 py-0.5 text-right px-1">
        <span className="text-[9px] font-bold text-white">{level}</span>
      </div>

      {/* 科技感装饰角 */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40"></div>
    </div>
  );
}

function ItemIcon({ type, className }) {
  switch (type) {
    case 'helmet':
      return <Layers className={className} />;
    case 'armor':
      return <Shield className={className} />;
    case 'boots':
      return <Box className={className} />;
    case 'glove':
      return <Hexagon className={className} />;
    case 'pants':
      return <Layers className={`${className} rotate-180`} />;
    default:
      return <Box className={className} />;
  }
}
