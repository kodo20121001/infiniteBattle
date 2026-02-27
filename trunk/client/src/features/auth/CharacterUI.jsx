import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Swords,
  Info,
} from 'lucide-react';

import { PlayerData } from '../../data/PlayerData';
import VrmCharacterViewer from './VrmCharacterViewer';

const EQUIPMENT_TYPE_MAP = {
    'weapon': 'sword',
    'helmet': 'helmet',
    'armor': 'armor',
    'pants': 'pants',
    'boots': 'boots',
    'glove': 'glove',
    'ring': 'ring',
    'necklace': 'necklace',
    'artifact': 'artifact'
};

const EquipmentDetailModal = ({ item, type = 'view', onClose, onAction }) => {
    if (!item) return null;
  
    const rarityColors = {
      common: 'text-slate-400 bg-slate-100',
      uncommon: 'text-emerald-500 bg-emerald-100',
      rare: 'text-cyan-500 bg-cyan-100',
      epic: 'text-purple-500 bg-purple-100',
      legendary: 'text-yellow-500 bg-yellow-100',
      // backups
      purple: 'text-purple-500 bg-purple-100',
      gold: 'text-yellow-500 bg-yellow-100',
      red: 'text-red-500 bg-red-100',
    };
    
    const borderColor = {
        common: 'border-slate-500',
        uncommon: 'border-emerald-500',
        rare: 'border-cyan-500',
        epic: 'border-purple-500',
        legendary: 'border-yellow-500',
        red: 'border-red-500'
    };

    const gradient = {
        common: 'from-slate-800 to-slate-900',
        uncommon: 'from-emerald-900 to-slate-900',
        rare: 'from-cyan-900 to-slate-900',
        epic: 'from-purple-900 to-slate-900',
        legendary: 'from-yellow-900 to-slate-900',
        red: 'from-red-900 to-slate-900'
    };

    const rColor = rarityColors[item.rarity] || rarityColors.common;
    const bColor = borderColor[item.rarity] || borderColor.common;
    const grad = gradient[item.rarity] || gradient.common;

    return (
      <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div 
          onClick={(e) => e.stopPropagation()}
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          className="bg-[#0f172a] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col relative"
        >
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-3 right-3 z-20 bg-black/40 rounded-full p-1 text-slate-400 hover:text-white hover:bg-red-500/80 transition-colors">
                <Trash2 size={16} className="rotate-45" /> {/* Using Trash2 rotated as X or just import X? X is not imported, let's assume Close logic */}
            </button>

            {/* Header / Icon Area */}
            <div className={`relative h-32 bg-gradient-to-br ${grad} flex items-center justify-start p-6 gap-5 border-b ${bColor}`}>
                <div className={`w-20 h-20 rounded-lg border-2 ${bColor} bg-black/30 flex items-center justify-center shadow-lg relative overflow-hidden group`}>
                     <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                     <ItemIcon type={item.icon} className={`w-10 h-10 ${rColor.split(' ')[0]}`} />
                </div>
                <div className="flex flex-col gap-1 z-10">
                    <h3 className={`text-xl font-bold tracking-wide ${rColor.split(' ')[0]} drop-shadow-md`}>{item.name}</h3>
                    <div className="flex gap-2 text-xs font-mono text-slate-300">
                        <span className="bg-black/40 px-1.5 py-0.5 rounded border border-white/10">{item.tier || '1阶'}</span>
                        <span className="bg-black/40 px-1.5 py-0.5 rounded border border-white/10">{item.level || '1级'}</span>
                    </div>
                </div>
                
                {/* Background Pattern */}
                <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10 pointer-events-none overflow-hidden">
                     <ItemIcon type={item.icon} className="w-48 h-48 -translate-y-4 translate-x-12 rotate-12" />
                </div>
            </div>

            {/* Stats / Info */}
            <div className="p-4 space-y-4 bg-slate-900/50 flex-1">
                {/* Basic Stats (Mock for now if not in item) */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">评分</span>
                        <span className="text-orange-400 font-mono font-bold">{(parseInt(item.level) || 1) * 150}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">攻击力</span>
                        <span className="text-slate-200 font-mono">+{(parseInt(item.level) || 1) * 10}</span>
                    </div>
                    {item.rarity === 'legendary' && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-yellow-500 font-bold">传说属性</span>
                            <span className="text-yellow-200 text-xs">全技能等级 +1</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div className="text-xs text-slate-500 leading-relaxed italic">
                    "一把散发着强大气息的装备，或许曾经属于某位传说中的英雄。"
                </div>
            </div>

            {/* Action Button */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
                <button 
                    onClick={() => onAction(item)}
                    className={`w-full py-3 rounded-lg font-bold text-sm tracking-widest uppercase transition-all shadow-lg active:scale-95
                        ${type === 'equip' 
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20' 
                            : 'bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700 shadow-red-900/20'
                        }`}
                >
                    {type === 'equip' ? '装 备' : '卸 下'}
                </button>
            </div>
        </motion.div>
      </div>
    );
};

export default function CharacterUI({ userData }) {
  const [activeTab, setActiveTab] = useState('装备');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [equipData, setEquipData] = useState([]);
  const [detailModal, setDetailModal] = useState({ show: false, item: null, type: 'view' });


  // Fetch Logic
  const refreshData = () => {
      const player = PlayerData.getInstance();
      const allEquips = player.getAllEquipment();
      const allItems = player.getAllItems();
  
      // Update Equipment Slots
      const SLOT_ORDER = ['weapon', 'helmet', 'armor', 'pants', 'boots', 'glove', 'ring', 'necklace', 'artifact'];
      const slots = player.equipmentSlots || {};
      
      const newEquipData = SLOT_ORDER.map(slotType => {
          const equippedId = slots[slotType];
          let item = null;
          if (equippedId) {
              item = player.getEquipment(equippedId);
          }
          if (item) {
                return {
                    id: slotType,
                    itemId: item.id,
                    name: item.name,
                    tier: `${Math.ceil(item.level/10)}阶`, 
                    level: `${item.level}级`,
                    icon: EQUIPMENT_TYPE_MAP[item.type] || 'box', 
                    rarity: item.rarity,
                    instanceId: item.instanceId
                };
          }
          // Empty slot placeholder
          return { 
              id: slotType, 
              tier: '', 
              level: '', 
              icon: EQUIPMENT_TYPE_MAP[slotType] || 'box', 
              rarity: 'common',
              isEmpty: true
          };
      });
      setEquipData(newEquipData);
  
      let currentTabItems = [];
      if (activeTab === '装备') {
          // Filter out items that are already equipped
          const equippedInstanceIds = Object.values(slots);
          
          currentTabItems = allEquips
              .filter(e => !equippedInstanceIds.includes(e.instanceId)) // Filter out equipped items
              .map(e => ({
                  id: e.instanceId,
                  configId: e.id,
                  name: e.name,
                  tier: e.level, // Using level as tier for now
                  level: e.level,
                  icon: EQUIPMENT_TYPE_MAP[e.type] || 'box',
                  rarity: e.rarity || 'common',
                  count: 1,
                  isEquip: true
              }));
      } else if (activeTab === '道具') {
          // Filter consumable items
          currentTabItems = allItems.filter(i => i.type === 'consumable' || !i.type).map(i => ({
              id: i.id,
              name: i.name,
              tier: 1,
              level: 1,
              icon: 'box', // Generic icon
              rarity: 'common',
              count: i.count,
              isEquip: false
          }));
      } else if (activeTab === '材料') {
          // Filter material items
          currentTabItems = allItems.filter(i => i.type === 'material').map(i => ({
              id: i.id,
              name: i.name,
              tier: 1,
              level: 1,
              icon: 'box', // Generic icon
              rarity: 'common',
              count: i.count,
              isEquip: false
          }));
      }
      
      // Fill empty slots to keep grid look
      const totalSlots = Math.max(currentTabItems.length, 30);
      const filledItems = [...currentTabItems];
      while(filledItems.length < totalSlots) {
          filledItems.push({ id: `empty_${filledItems.length}`, isEmpty: true });
      }
      
      setInventoryItems(filledItems);
  };

  const handleSlotClick = (data) => {
      if (!data || data.isEmpty) return;
      setDetailModal({
          show: true,
          item: data,
          type: 'unequip'
      });
  };

  const handleBackpackClick = (item) => {
      if (!item || item.isEmpty) return;
      // Only equipment items trigger equip modal
      if (item.isEquip) {
          setDetailModal({
              show: true,
              item: item,
              type: 'equip'
          });
      }
  };

  const handleModalAction = (item) => {
      const { type } = detailModal;
      if (!item) return;

      if (type === 'equip') {
          PlayerData.getInstance().equip(item.id); // item.id is instanceId
      } else if (type === 'unequip') {
          // item.id is slotType for equipped items (e.g. 'weapon')
          PlayerData.getInstance().unequip(item.id); 
      }
      setDetailModal({ show: false, item: null, type: 'view' });
      refreshData();
  };

  useEffect(() => {
    refreshData();
    
    // Subscribe to changes
    const handleUpdate = () => refreshData();
    window.addEventListener('playerDataChanged', handleUpdate);
    return () => window.removeEventListener('playerDataChanged', handleUpdate);
  }, [activeTab]);

  // const equipData = []; // Removed: using state

  return (
    <div className="relative flex-1 flex flex-col min-h-[380px] z-10 overflow-hidden bg-gradient-to-b from-[#0f172a] to-[#020617]">
      
      <AnimatePresence>
        {detailModal.show && (
            <EquipmentDetailModal
                item={detailModal.item}
                type={detailModal.type}
                onClose={() => setDetailModal({ show: false, item: null })}
                onAction={handleModalAction}
            />
        )}
      </AnimatePresence>

      {/* 角色背景光效 */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>

      {/* Main Equipment Area - Split Layout */}
      <div className="flex-[1.5] relative flex p-2 shrink-0 min-h-[280px] mt-2">
        
        {/* Left Side: Character Model & Power */}
        <div className="flex-1 flex flex-col items-center justify-end pb-6 relative z-10 pr-4 pl-4">
          {/* 角色占位符 (全息投影风格) */}
          <div className="absolute top-4 bottom-16 w-full flex items-center justify-center pointer-events-none">
            <div className="relative w-24 h-full flex items-center justify-center">
              {/* Three.js VRM 角色展示 */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-auto">
                <div className="relative" style={{ width: '640px', height: '960px', transform: 'scale(0.3)', transformOrigin: 'center center' }}>
                  <VrmCharacterViewer />
                </div>
              </div>
            </div>
          </div>

          {/* 战斗力数值 */}
          <div className="relative z-20 mt-auto -mb-12">
            <div className="relative bg-gradient-to-r from-orange-600/90 to-red-600/90 px-3 py-0.5 rounded-full border border-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.4)] flex items-center gap-1 transform skew-x-[-10deg] scale-75">
              <div className="bg-white/20 p-0.5 rounded-full animate-pulse">
                <Zap size={10} className="text-white fill-current" />
              </div>
              <span className="text-lg font-black text-white italic tracking-wider transform skew-x-[10deg]">
                {userData?.power || 1057}
              </span>
              <div className="absolute -right-1.5 -top-1.5 bg-slate-800 rounded-full p-0.5 border border-slate-600">
                <div className="w-2 h-2 text-[6px] flex items-center justify-center text-slate-400">i</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Radial Equipment Layout */}
        <div className="w-56 relative flex items-center justify-center shrink-0">
            
            {/* Center: Weapon */}
            <div className="relative z-20 flex flex-col items-center justify-center" onClick={() => handleSlotClick(equipData[0])}>
                {/* Weapon Slot */}
                {(() => {
                    const weaponData = equipData[0];
                    const rarity = weaponData?.rarity || 'common';
                    
                    const colors = {
                      common: 'border-slate-600 bg-slate-800/40 shadow-[inset_0_0_5px_rgba(148,163,184,0.1)]',
                      uncommon: 'border-emerald-500/50 bg-emerald-900/40 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]',
                      rare: 'border-cyan-500/50 bg-cyan-900/40 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]',
                      epic: 'border-purple-500/50 bg-purple-900/40 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]',
                      legendary: 'border-yellow-500/50 bg-yellow-900/40 shadow-[inset_0_0_10px_rgba(234,179,8,0.2)]',
                      
                      red: 'border-red-500/50 bg-red-900/40 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]',
                    };
                    
                    const textColors = {
                      common: 'text-slate-300',
                      uncommon: 'text-emerald-300',
                      rare: 'text-cyan-300',
                      epic: 'text-purple-300',
                      legendary: 'text-yellow-300',
                    
                      red: 'text-red-300',
                    };

                    const styleClass = colors[rarity] || colors.common;
                    const textClass = textColors[rarity] || textColors.common;
                    const tierBg = rarity === 'legendary' ? 'bg-yellow-600 border-yellow-400' : 
                                   rarity === 'epic' ? 'bg-purple-600 border-purple-400' :
                                   rarity === 'rare' ? 'bg-cyan-600 border-cyan-400' :
                                   rarity === 'uncommon' ? 'bg-emerald-600 border-emerald-400' :
                                   'bg-slate-600 border-slate-400';

                    return (
                        <div className={`w-16 h-16 bg-gradient-to-br ${styleClass} border-2 rounded-xl flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform group`}>
                            <div className="absolute inset-0 bg-[url('https://cdn.pixabay.com/photo/2017/01/31/15/34/light-2024847_1280.png')] opacity-20 bg-cover mix-blend-overlay"></div>

                            <Swords size={28} className={`drop-shadow-lg group-hover:brightness-125 ${textClass} relative z-10`} />
                            
                            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold text-white shadow-md z-30 ${tierBg}`}>
                                {weaponData?.tier || '1阶'}
                            </div>
                            <div className={`absolute bottom-0.5 w-full text-center text-[9px] font-bold bg-black/40 backdrop-blur-sm ${textClass} z-20`}>
                                {weaponData?.level || '1级'}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Surrounding Slots (Positioned in a circle around the weapon) */}
            
            {/* Top Right */}
            <div className="absolute top-6 right-2 z-10">
                 <EquipSlotSmall data={equipData[1]} onClick={() => handleSlotClick(equipData[1])} />
            </div>

            {/* Right */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-2 z-10">
                 <EquipSlotSmall data={equipData[2]} onClick={() => handleSlotClick(equipData[2])} />
            </div>

            {/* Bottom Right */}
            <div className="absolute bottom-6 right-2 z-10">
                 <EquipSlotSmall data={equipData[3]} onClick={() => handleSlotClick(equipData[3])} />
            </div>

            {/* Bottom Left */}
            <div className="absolute bottom-6 left-2 z-10">
                 <EquipSlotSmall data={equipData[4]} onClick={() => handleSlotClick(equipData[4])} />
            </div>

            {/* Left */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-2 z-10">
                 <EquipSlotSmall data={equipData[5]} onClick={() => handleSlotClick(equipData[5])} />
            </div>

            {/* Top Left */}
            <div className="absolute top-6 left-2 z-10">
                 <EquipSlotSmall data={equipData[6]} onClick={() => handleSlotClick(equipData[6])} />
            </div>

            {/* Bottom (Under Weapon) */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10">
                 <EquipSlotSmall data={equipData[7]} onClick={() => handleSlotClick(equipData[7])} />
            </div>

            {/* Top (Above Weapon) */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                 <EquipSlotSmall data={equipData[8]} onClick={() => handleSlotClick(equipData[8])} />
            </div>

            {/* Background Decorative Rings (Magic Circle Effect) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 pointer-events-none z-0">
              
              {/* 最外层旋转环 (带节点) */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-cyan-500/10 rounded-full border-dashed flex items-center justify-center"
              >
                {/* 外环魔法阵节点 */}
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <div 
                    key={`outer-${deg}`}
                    className="absolute w-1.5 h-1.5 bg-cyan-500/20 rounded-full shadow-[0_0_4px_rgba(6,182,212,0.3)]"
                    style={{
                      transform: `rotate(${deg}deg) translateY(-112px)` // 56 * 4 / 2 = 112
                    }}
                  ></div>
                ))}
              </motion.div>
              
              {/* 中间反向旋转环 (带节点) */}
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-6 border border-blue-500/10 rounded-full flex items-center justify-center"
              >
                {/* 内环魔法阵节点 */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <div 
                    key={`inner-${deg}`}
                    className="absolute w-1 h-1 bg-blue-400/30 rounded-full shadow-[0_0_3px_rgba(59,130,246,0.4)]"
                    style={{
                      transform: `rotate(${deg}deg) translateY(-88px)` // (56 * 4 - 24) / 2 = 100, 稍微往里收一点
                    }}
                  ></div>
                ))}
              </motion.div>

              {/* 最内层快速旋转的细环 */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-12 border border-cyan-300/5 rounded-full"
                style={{ borderTopColor: 'rgba(103, 232, 249, 0.2)' }}
              ></motion.div>

              {/* 中心发光 (大光晕，与左侧角色展示区呼应) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-cyan-400/20 rounded-full blur-2xl"></div>
            </div>
        </div>

      </div>

      {/* ================= 背包容器 ================= */}
      <div className="flex-1 flex flex-col min-h-0 relative z-20 mt-6 bg-[#0a101a] border-t-2 border-cyan-900/50 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] rounded-t-xl">
        
        {/* 背包头部 */}
        <div className="flex items-center justify-between px-3 py-2 shrink-0 bg-slate-900/50 border-b border-slate-800/50 rounded-t-xl">
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

        {/* 分类标签页 (在背包面板内部，标题栏下方) */}
        <div className="flex bg-[#050b14] border-b border-slate-800 shrink-0">
          {['装备', '道具', '材料'].map((tab) => (
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

        {/* 背包网格 (可滚动) */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-black/20">
          <div className="grid grid-cols-6 gap-1.5">
            {inventoryItems.map((item, idx) => {
              if (item.isEmpty) {
                 return (
                  <div 
                    key={item.id}
                    className="aspect-square rounded border border-slate-700/50 bg-slate-800/20"
                  ></div>
                 );
              }

              const getRarityStyles = (rarity) => {
                  switch(rarity) {
                      case 'legendary':
                          return 'border-yellow-500 bg-gradient-to-br from-yellow-900/60 to-black shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse-slow';
                      case 'epic':
                          return 'border-purple-500 bg-gradient-to-br from-purple-900/50 to-black shadow-[0_0_10px_rgba(168,85,247,0.3)]';
                      case 'rare':
                          return 'border-cyan-400 bg-gradient-to-br from-cyan-900/40 to-black shadow-[0_0_8px_rgba(34,211,238,0.2)]';
                      case 'uncommon':
                          return 'border-emerald-500 bg-emerald-900/30 shadow-[0_0_5px_rgba(16,185,129,0.2)]';
                      default:
                          return 'border-slate-700 bg-slate-800/40 hover:border-slate-500';
                  }
              };

              return (
              <motion.div
                key={item.id}
                onClick={() => handleBackpackClick(item)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.01 }}
                className={`aspect-square rounded-lg border relative cursor-pointer group transition-all duration-300 overflow-hidden
                  ${getRarityStyles(item.rarity)}
                  hover:scale-105 hover:brightness-125
                `}
              >
                  {/* Legendary/Epic Shine Effect */}
                  {(item.rarity === 'legendary' || item.rarity === 'epic') && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
                  )}
                  
                  {/* Background Glow for high tier */}
                  {item.rarity === 'legendary' && (
                       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 to-transparent pointer-events-none"></div>
                  )}

                {/* 阶级/类型标记 */}
                <div className="absolute top-0.5 left-0.5 z-10 text-[8px] text-slate-400 font-mono leading-none">
                  {item.tier ? `${item.tier}阶` : ''}
                </div>
                
                {/* 图标 */}
                <div className="w-full h-full flex flex-col items-center justify-center p-1 pb-4 relative z-10">
                  <ItemIcon type={item.icon} className={`mb-1 transition-transform group-hover:scale-110 ${
                      item.rarity === 'legendary' ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]' : 
                      item.rarity === 'epic' ? 'text-purple-300 drop-shadow-[0_0_5px_rgba(216,180,254,0.5)]' : 
                      item.rarity === 'rare' ? 'text-cyan-300 drop-shadow-[0_0_3px_rgba(103,232,249,0.4)]' : 
                      item.rarity === 'uncommon' ? 'text-emerald-300' :
                      'text-slate-400'
                  }`} />
                </div>

                {/* 物品名称 */}
                <div className={`absolute bottom-0 left-0 w-full text-center text-[10px] scale-90 font-bold truncate px-0.5 pb-0.5 z-20 ${
                    item.rarity === 'legendary' ? 'text-yellow-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]' : 
                    item.rarity === 'epic' ? 'text-purple-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]' : 
                    item.rarity === 'rare' ? 'text-cyan-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]' : 
                    'text-slate-300 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]'
                }`}>
                    {item.name}
                </div>
                
                {/* 数量 */}
                <div className="absolute top-0.5 right-1 z-20 text-[8px] text-gray-300 font-mono bg-black/60 px-1 rounded backdrop-blur-[1px]">
                  {item.count > 1 ? `x${item.count}` : ''}
                </div>
              </motion.div>
            )})}
          </div>
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

function EquipSlotSmall({ data, onClick }) {
    if (!data) return <div className="w-12 h-12 bg-slate-800/50 rounded-lg border border-slate-700/50"></div>;
    const { tier, level, icon, rarity, isEmpty } = data;
    
    if (isEmpty) {
        return <div className="w-12 h-12 bg-slate-800/20 rounded-lg border border-slate-700/30 flex items-center justify-center relative">
            <ItemIcon type={icon} className="text-slate-700 w-5 h-5 relative z-10" />
        </div>;
    }
  
    // Expanded rarity colors to match EquipmentRarity enum and ShopUI/Backpack styles
    const colors = {
      common: 'border-slate-600 bg-slate-800/40 shadow-[inset_0_0_5px_rgba(148,163,184,0.1)]',
      uncommon: 'border-emerald-500/50 bg-emerald-900/40 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]',
      rare: 'border-cyan-500/50 bg-cyan-900/40 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]',
      epic: 'border-purple-500/50 bg-purple-900/40 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]', // epic maps to purple
      legendary: 'border-yellow-500/50 bg-yellow-900/40 shadow-[inset_0_0_10px_rgba(234,179,8,0.2)]', // legendary maps to gold/yellow
      
      // Fallback for old codes if any
      purple: 'border-purple-500/50 bg-purple-900/40 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]',
      gold: 'border-yellow-500/50 bg-yellow-900/40 shadow-[inset_0_0_10px_rgba(234,179,8,0.2)]',
      red: 'border-red-500/50 bg-red-900/40 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]', // Maybe reserve red for mythic/artifact if added later
    };
  
    const textColors = {
      common: 'text-slate-300',
      uncommon: 'text-emerald-300',
      rare: 'text-cyan-300',
      epic: 'text-purple-300',
      legendary: 'text-yellow-300',

      purple: 'text-purple-300',
      gold: 'text-yellow-300',
      red: 'text-red-300',
    };
  
    return (
      <div
        className={`w-12 h-12 rounded-lg border-2 ${colors[rarity] || colors.common} relative flex items-center justify-center cursor-pointer overflow-hidden group hover:scale-110 hover:brightness-125 transition-all z-20 bg-slate-900/80 backdrop-blur-sm`}
        onClick={onClick}
      >
        {/* Tier */}
        <div className="absolute top-0 left-0 bg-black/60 px-1 rounded-br text-[8px] font-bold text-white border-b border-r border-white/10 z-10 leading-3">
          {tier || '1阶'}
        </div>
  
        {/* Icon */}
        <ItemIcon type={icon} className={`w-5 h-5 ${textColors[rarity] || textColors.common} opacity-90 group-hover:scale-110 transition-transform duration-300 relative z-10`} />
  
        {/* Level */}
        <div className="absolute bottom-0 right-0 w-full bg-black/70 py-0.5 text-right px-1 leading-3 z-10">
          <span className="text-[8px] font-bold text-white">{level || '1级'}</span>
        </div>
  
        {/* Decorative Corners */}
        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/40 z-10"></div>
        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/40 z-10"></div>
      </div>
    );
  }

function ItemIcon({ type, className }) {
  switch (type) {
    case 'sword':
       return <Swords className={className} />;
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
    case 'ring':
      return <Gem className={className} />;
    case 'necklace':
      return <Gem className={className} />;
    case 'artifact':
      return <Crosshair className={className} />;
    default:
      return <Box className={className} />;
  }
}
