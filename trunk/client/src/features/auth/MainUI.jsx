import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  User,
  Cpu,
  Swords,
  Warehouse,
  Shield,
  Flag,
  Diamond,
  Coins,
  Drumstick,
  Gift,
  Ghost,
} from 'lucide-react';
import CharacterUI from './CharacterUI';
import GameUI from './GameUI';
import LotteryUI from './LotteryUI';
import BattleUI from './BattleUI';
import ShopUI from './ShopUI';
import PetUI from './PetUI';
import { PlayerData } from '../../data/PlayerData';

export default function MainUI({ theme, buildings, onPlace, onToggle }) {
  const [activeNav, setActiveNav] = useState('lottery');
  
  // Real user data state
  const [userData, setUserData] = useState({
    name: 'Player',
    level: 1,
    avatar: '/api/placeholder/44/44',
    experience: 0,
    resources: {
      diamond: 0,
      coins: 0,
      stamina: '0/30', // Custom format for UI
    },
    power: 0,
  });

  // Load and subscribe to player data
  useEffect(() => {
    const loadData = () => {
      const player = PlayerData.getInstance();
      setUserData({
        name: player.name,
        level: player.level,
        avatar: '/api/placeholder/44/44', // Still placeholder for now
        experience: 0, // Not fully implemented in PlayerData yet
        resources: {
          diamond: player.resources.diamond,
          coins: player.resources.coins,
          stamina: `${player.resources.stamina}/100`, // Assuming max stamina is 100
        },
        power: 0, // Not implemented yet
      });
    };

    loadData();

    // Listen for changes
    const handleDataChange = () => loadData();
    window.addEventListener('playerDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('playerDataChanged', handleDataChange);
    };
  }, []);

  const navItems = [
    { id: 'shop', name: '商城', icon: ShoppingCart },
    { id: 'character', name: '角色', icon: User },
    { id: 'lottery', name: '抽奖', icon: Gift, special: true }, // The new center
    { id: 'pet', name: '战宠', icon: Ghost },
    { id: 'battle', name: '战斗', icon: Swords },
    { id: 'journey', name: '征途', icon: Flag },
  ];

  const bgColor = 'bg-[#03060a] pointer-events-auto';

  return (
    <div className={`flex flex-col h-screen w-full ${bgColor} text-cyan-50 font-sans overflow-hidden select-none max-w-md mx-auto border-x border-cyan-900/30 shadow-2xl relative transition-colors duration-300`}>
      
      {/* 背景装饰：动态网格 (仅在非透明背景下显示) */}
      {activeNav !== 'base' && (
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        ></div>
      )}

      {/* ================= 顶部信息栏 ================= */}
      <div className="flex items-center justify-between px-2 py-2 bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/20 z-20 shrink-0 gap-2 pointer-events-auto">
        {/* 头像与等级 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <div className="w-11 h-11 rounded-full border-2 border-orange-500 bg-slate-800 overflow-hidden relative shadow-[0_0_10px_rgba(249,115,22,0.4)]">
              <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -top-1 -left-1 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-orange-400 z-10">
              {userData.level}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-wide shadow-black drop-shadow-md">
              {userData.name}
            </span>
            {/* 经验条 */}
            <div className="w-20 h-1.5 bg-slate-800 mt-1 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all"
                style={{ width: `${userData.experience}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 资源显示 (紧凑排列) */}
        <div className="flex flex-1 justify-end gap-1.5 overflow-hidden">
          <ResourcePill icon={Diamond} value={userData.resources.diamond} color="text-cyan-300" />
          <ResourcePill icon={Coins} value={userData.resources.coins} color="text-yellow-400" />
          <ResourcePill icon={Drumstick} value={userData.resources.stamina} color="text-red-400" />
        </div>
      </div>

      {/* ================= 内容区域 ================= */}
      <div className="flex-1 relative z-10 overflow-hidden">
        {activeNav === 'base' && (
          /* Render nothing for base content, as GameUI acts as an overlay */
          <div className="flex-1 h-full w-full"></div>
        )}
        {activeNav === 'character' && <CharacterUI userData={userData} />}
        {activeNav === 'lottery' && <LotteryUI />}
        {activeNav === 'pet' && <PetUI onClose={() => setActiveNav('character')} />}
        {activeNav === 'battle' && <BattleUI />}
        {activeNav === 'shop' && <ShopUI />}
        {activeNav === 'journey' && (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <span>征途功能开发中...</span>
          </div>
        )}
        
        {/* GameUI 作为基地建设的 overlay */}
        {activeNav === 'base' && theme && (
          <div className="absolute inset-0 pointer-events-none">
             <GameUI 
                theme={theme}
                buildings={buildings}
                onPlace={onPlace}
                onToggle={onToggle}
             />
          </div>
        )}
      </div>

      {/* ================= 底部导航 ================= */}
      <div className="bg-black/95 border-t border-slate-800 px-1 pb-2 pt-2 shrink-0 z-30 pointer-events-auto">
        <div className="flex justify-between items-end">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <motion.div
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className="flex flex-col items-center justify-center flex-1 cursor-pointer relative"
                whileTap={{ scale: 0.9 }}
              >
                {/* 选中背景光效 */}
                {isActive && (
                  <div className="absolute -top-6 w-12 h-12 bg-orange-500/10 rounded-full blur-xl pointer-events-none"></div>
                )}

                <div
                  className={`relative p-1.5 transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}
                >
                  {/* 角色按钮的特殊背景 */}
                  {item.special && isActive && (
                    <div className="absolute inset-0 bg-orange-500 rounded-lg opacity-20 blur-sm"></div>
                  )}

                  <item.icon
                    size={isActive ? 36 : 30}
                    className={`${
                      isActive ? 'text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]' : 'text-slate-500'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span
                  className={`text-[9px] font-bold tracking-tight transition-all ${
                    isActive ? 'text-orange-400' : 'text-slate-600'
                  }`}
                >
                  {item.name}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- 子组件 ---

function ResourcePill({ icon: Icon, value, color }) {
  return (
    <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full border border-slate-700 min-w-[60px] justify-center">
      <Icon size={10} className={color} />
      <span className="text-[10px] font-mono font-bold text-white">{value}</span>
    </div>
  );
}
