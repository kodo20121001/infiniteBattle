import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Info, ChevronLeft, Lock, Sparkles, X, Swords, Shield, Zap, Move } from 'lucide-react';
import { PetConfig } from '../../config/PetConfig';
import { PlayerData } from '../../data/PlayerData';
import { getFragmentsNeeded, upgradePet } from '../../data/Pet';

// --- Detail Modal Component ---
const PetDetailModal = ({ petConfig, petData, onClose, onUpgrade }) => {
  if (!petConfig) return null;

  const isUnlocked = petData && petData.level > 0;
  const currentLevel = petData ? petData.level : 0;
  const currentFragments = petData ? petData.fragments : 0;
  const neededFragments = getFragmentsNeeded(petConfig.id, currentLevel);
  const canUpgrade = currentFragments >= neededFragments;

  // Mock upgrade effects based on level
  const upgradeEffects = [
    { level: 2, desc: '属性加成提升 5%' },
    { level: 3, desc: '解锁被动技能：元素共鸣' },
    { level: 4, desc: '技能冷却时间减少 10%' },
    { level: 5, desc: '基础攻击力提升 15%' },
    { level: 6, desc: '解锁进阶技能效果' },
    { level: 7, desc: '暴击率额外提升 3%' },
    { level: 8, desc: '解锁终极形态外观' },
    { level: 9, desc: '全队属性加成 2%' },
    { level: 10, desc: '解锁极寒大冰弹选项' },
  ];

  const qualityColor = {
    green: 'text-green-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
  }[petConfig.quality] || 'text-gray-500';

  const qualityBg = {
    green: 'bg-green-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100', 
  }[petConfig.quality] || 'bg-gray-100';

  return (
    <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-[#eef2f3] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border-4 border-[#3b4c5a] flex flex-col h-[85vh] relative"
      >
        {/* Header Bar */}
        <div className="bg-[#1c4d7f] p-3 flex items-center justify-between shadow-md z-10">
          <button onClick={onClose} className="bg-red-500 rounded text-white p-1 hover:bg-red-600 transition shadow">
             <X size={20} />
          </button>
          <span className="text-white font-bold text-lg drop-shadow-md">{petConfig.name}</span>
          <div className="w-8"></div> {/* Spacer */}
        </div>
        
        {/* Main Content Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#ccd6dd]">
          
          {/* Top Card Area - Hero Style */}
          <div className="m-3 p-1 bg-[#1a4f8b] rounded-xl shadow-lg border-2 border-[#143d6b]">
             <div className="bg-gradient-to-br from-[#2a6db5] to-[#154176] rounded-lg p-4 flex gap-4 items-center relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                
                {/* Avatar */}
                <div className="w-20 h-20 bg-black/30 rounded-lg border-2 border-white/20 shadow-inner flex items-center justify-center shrink-0 relative z-10">
                    <Sparkles size={40} className={qualityColor} />
                </div>
                
                {/* Info */}
                <div className="flex-1 z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-black text-xl tracking-wide drop-shadow-md">{petConfig.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/30 text-white bg-black/20 uppercase`}>
                           {petConfig.quality}
                        </span>
                    </div>
                    <div className="text-blue-200 text-xs mb-2">战宠等级 {currentLevel}</div>
                    
                    {/* Level Progress Bar */}
                    <div className="w-full h-5 bg-black/40 rounded-full border border-black/50 relative overflow-hidden">
                        <div 
                           className="h-full bg-gradient-to-t from-green-600 to-green-400"
                           style={{ width: `${Math.min((currentFragments / neededFragments) * 100, 100)}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                           {currentFragments} / {neededFragments}
                        </span>
                    </div>
                </div>
             </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 px-3 mb-4">
             {/* Stat Item: HP-like */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-600">
                    <Shield size={18} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">生命加成</span>
                    <span className="text-sm font-black text-gray-800">1221 <span className="text-green-500 text-[10px]">+22</span></span>
                </div>
             </div>
             
             {/* Stat Item: Damage-like */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                    <Swords size={18} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">攻击加成</span>
                    <span className="text-sm font-black text-gray-800">336 <span className="text-green-500 text-[10px]">+6</span></span>
                </div>
             </div>

             {/* Stat Item: Speed */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                    <Move size={18} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">移动速度</span>
                    <span className="text-sm font-black text-gray-800">中等</span>
                </div>
             </div>

             {/* Stat Item: Crit */}
             <div className="bg-white rounded-lg p-1 border-b-[3px] border-[#c0c0c0] flex items-center gap-2 shadow-sm">
                <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-purple-600">
                    <Zap size={18} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">暴击幅度</span>
                    <span className="text-sm font-black text-gray-800">{petConfig.statsBonus ? Object.values(petConfig.statsBonus)[0] : 0}%</span>
                </div>
             </div>
          </div>

          {/* Upgrade Effects List Header */}
          <div className="px-4 py-2 flex items-center gap-2 opacity-60">
             <Settings size={14} className="text-gray-600" />
             <span className="text-xs font-black text-gray-600 uppercase tracking-widest">升级效果预览</span>
          </div>

          {/* Upgrade Effects List */}
          <div className="px-3 pb-20 space-y-2">
             {upgradeEffects.map((effect, idx) => (
                <div key={idx} className={`relative bg-[#dbe2e6] rounded-lg p-3 border-l-4 ${currentLevel >= effect.level ? 'border-green-500 bg-white' : 'border-gray-400 grayscale opacity-70'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center shrink-0 font-black text-sm italic 
                          ${currentLevel >= effect.level ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-400 text-gray-400'}`}>
                            {effect.level}级
                        </div>
                        <p className={`text-xs font-bold leading-tight ${currentLevel >= effect.level ? 'text-gray-800' : 'text-gray-500'}`}>
                           {effect.desc}
                        </p>
                    </div>
                </div>
             ))}
          </div>

        </div>

        {/* Footer Action Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-300 p-3 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] z-20">
            <div className="flex items-center justify-center gap-6 mb-2">
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    <div className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-500 shadow-sm"></div>
                    <span className={`text-xs font-bold font-mono ${true ? 'text-gray-800' : 'text-red-500'}`}>1000</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className={`text-xs font-bold font-mono ${canUpgrade ? 'text-gray-800' : 'text-red-500'}`}>
                        {currentFragments}/{neededFragments}
                    </span>
                 </div>
            </div>

            <button 
               onClick={onUpgrade}
               disabled={!canUpgrade}
               className={`w-full py-3 rounded-xl border-b-4 font-black text-xl tracking-wide shadow-lg active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2
                 ${canUpgrade 
                    ? 'bg-amber-400 border-amber-600 text-amber-900 hover:bg-amber-300' 
                    : 'bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed'}`}
            >
               {canUpgrade ? '升级' : '碎片不足'}
            </button>
            <div className="text-center mt-1">
               <span className="text-[10px] font-bold text-green-600">升级奖励：属性加成 +1.5%</span>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function PetUI({ onClose }) {
  const [activePlan, setActivePlan] = useState(1);
  const [petConfigs, setPetConfigs] = useState([]);
  const [playerPets, setPlayerPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [showSynthModal, setShowSynthModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // New State

  useEffect(() => {
    // Load configs
    const configs = PetConfig.getAllConfigs();
    setPetConfigs(configs);
    if (configs.length > 0 && !selectedPetId) {
      setSelectedPetId(configs[0].id);
    }

    // Load player data
    const playerData = PlayerData.getInstance();
    setPlayerPets(playerData.getAllPets());
  }, []);

  const handleSynthesize = () => {
    // This is now reused for upgrade too
    const playerData = PlayerData.getInstance();
    let pet = playerData.getPet(selectedPetId);
    
    if (!pet) {
      // Create new pet if it doesn't exist
      const config = petConfigs.find(c => c.id === selectedPetId);
      pet = {
        id: selectedPetId,
        name: config.name,
        level: 0,
        fragments: config.baseFragmentsNeeded, 
        skills: config.skills.map(s => ({ id: s.id, level: s.level })),
        activePlan: 1
      };
      playerData.addPet(pet);
    }

    if (upgradePet(pet)) {
      playerData.save();
      setPlayerPets([...playerData.getAllPets()]);
      setShowSynthModal(false);
      setShowDetailModal(false); // Close detail modal if upgrade success
    } else {
        // Handle failure if needed (though UI should prevent)
    }
  };

  const selectedConfig = petConfigs.find(c => c.id === selectedPetId);
  const selectedPlayerPet = playerPets.find(p => p.id === selectedPetId);
  
  const isActivated = selectedPlayerPet && selectedPlayerPet.level > 0;
  const currentFragments = selectedPlayerPet ? selectedPlayerPet.fragments : 0; // Mock: you can change this to test
  const neededFragments = selectedConfig ? getFragmentsNeeded(selectedConfig.id, 0) : 50;
  const canActivate = !isActivated && currentFragments >= neededFragments;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 bg-[#1a1510] flex flex-col font-sans text-white overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 z-20 relative shrink-0">
        <button onClick={onClose} className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-lg font-bold tracking-widest text-amber-500 drop-shadow-md">战宠</div>
        
        {/* Info/Detail Button - REMOVED */}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <PetDetailModal 
             petConfig={selectedConfig} 
             petData={selectedPlayerPet} 
             onClose={() => setShowDetailModal(false)}
             onUpgrade={handleSynthesize}
          />
        )}
      </AnimatePresence>
      
      {/* 3D Model Area (Mock) */}
      <div className="relative flex-1 flex flex-col items-center justify-center z-10">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-transparent to-transparent pointer-events-none"></div>
        
        {/* Pet Model Placeholder */}
        <motion.div 
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 w-64 h-64 flex items-center justify-center"
        >
          {isActivated ? (
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_25px_rgba(167,243,208,0.8)]">
              <path d="M100 20 L140 80 L100 140 L60 80 Z" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="2" />
              <path d="M100 20 L180 60 L140 80 Z" fill="#bae6fd" />
              <path d="M100 20 L20 60 L60 80 Z" fill="#bae6fd" />
              <path d="M140 80 L180 120 L100 140 Z" fill="#7dd3fc" />
              <path d="M60 80 L20 120 L100 140 Z" fill="#7dd3fc" />
              {/* Tail */}
              <path d="M100 140 L120 180 L100 160 L80 180 Z" fill="#e0f2fe" />
              {/* Sparkles */}
              <circle cx="40" cy="40" r="2" fill="#fff" className="animate-ping" />
              <circle cx="160" cy="50" r="3" fill="#fff" className="animate-pulse" />
              <circle cx="150" cy="150" r="2" fill="#fff" className="animate-ping" />
              <circle cx="50" cy="140" r="2" fill="#fff" className="animate-pulse" />
            </svg>
          ) : canActivate ? (
            <div 
              className="w-48 h-48 rounded-full bg-amber-500/20 border-4 border-amber-400/50 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-500/30 transition-colors shadow-[0_0_50px_rgba(251,191,36,0.6)] animate-pulse"
              onClick={() => setShowSynthModal(true)}
            >
              <Sparkles size={48} className="text-amber-300 mb-2" />
              <span className="text-amber-200 font-bold text-lg tracking-widest">点击合成</span>
            </div>
          ) : (
            <div className="w-48 h-48 rounded-full bg-stone-900/50 border-4 border-stone-700/50 flex flex-col items-center justify-center grayscale opacity-50">
              <Lock size={48} className="text-stone-500 mb-2" />
              <span className="text-stone-400 font-bold text-sm">碎片不足</span>
              <span className="text-stone-500 text-xs mt-1">{currentFragments} / {neededFragments}</span>
            </div>
          )}
        </motion.div>

        {/* Platform */}
        <div className="absolute bottom-16 w-72 h-20 bg-amber-900/40 rounded-[100%] border-2 border-amber-700/50 shadow-[0_0_40px_rgba(217,119,6,0.4)]" style={{ transform: 'rotateX(60deg)' }}>
          <div className="absolute inset-2 border border-amber-500/30 rounded-[100%]"></div>
          <div className="absolute inset-4 border border-amber-400/20 rounded-[100%]"></div>
        </div>

        {/* Left side button */}
        <div className="absolute left-4 top-1/4 flex flex-col items-center gap-1 z-20">
          <div className="w-14 h-14 bg-black/60 border-2 border-amber-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.4)] cursor-pointer transition-all">
            <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center">
              <Sparkles size={20} className="text-amber-400" />
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 border border-amber-400 text-amber-400 mt-1">
            {selectedConfig?.name || '战宠'}
          </span>
        </div>

        {/* Plan Selector & Detail Button */}
        <div className="absolute bottom-2 w-full flex items-center justify-center gap-4 z-20 pl-8">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
            {[1, 2, 3, 4, 5].map(plan => (
              <button 
                key={plan}
                onClick={() => setActivePlan(plan)}
                className={`h-8 rounded flex items-center justify-center text-sm font-bold transition-colors ${
                  activePlan === plan 
                    ? 'bg-amber-500 text-black px-3' 
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 w-8'
                }`}
              >
                {activePlan === plan ? `方案${plan}` : plan}
              </button>
            ))}
            <button className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-white">
              <Settings size={16} />
            </button>
          </div>

          {/* Detail Button (Right Side) */}
          <button 
             onClick={() => setShowDetailModal(true)}
             className="h-10 px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg shadow-lg border border-amber-400 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
             <Info size={16} />
             <span>详情</span>
          </button>
        </div>
      </div>

      {/* Bottom Skills Area */}
      <div className="bg-[#2a241d] rounded-t-2xl p-4 border-t-2 border-amber-900/50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20 relative flex flex-col flex-1 min-h-0">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold text-sm">
              {selectedConfig ? Object.keys(selectedConfig.statsBonus)[0] : '属性增幅'}
            </span>
            <span className="text-2xl font-black text-amber-400">
              {selectedConfig ? Object.values(selectedConfig.statsBonus)[0] : 0}%
            </span>
          </div>
        </div>

        {/* Pet Grid */}
        <div className="grid grid-cols-3 gap-3 overflow-y-auto p-1 custom-scrollbar content-start">
          {petConfigs.map(config => {
            const pet = playerPets.find(p => p.id === config.id);
            const isUnlocked = pet && pet.level > 0;
            const isSelected = selectedPetId === config.id;
            
            // Fragments logic (assuming pet object exists if fragments > 0, or we need to look elsewhere?)
            // Based on PlayerData, fragments are stored within the Pet object.
            // If pet doesn't exist, fragments are 0.
            const frags = pet ? pet.fragments : 0;
            const needed = getFragmentsNeeded(config.id, pet ? pet.level : 0);

            const qualityColors = {
              green: 'border-green-500',
              blue: 'border-blue-500',
              purple: 'border-purple-500',
              orange: 'border-orange-500',
            };
            const qColor = qualityColors[config.quality] || qualityColors.blue;

            return (
              <div 
                key={config.id} 
                onClick={() => setSelectedPetId(config.id)}
                className={`relative aspect-[3/4] bg-[#8a8a8a] rounded border-2 ${isSelected ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : qColor} p-1 flex flex-col items-center justify-center shadow-inner cursor-pointer transition-all ${isUnlocked ? 'hover:brightness-110' : 'grayscale opacity-60'}`}
              >
                {/* Name */}
                <div className={`absolute top-1 left-1 right-1 text-center font-bold text-xs drop-shadow-sm ${
                  config.quality === 'green' ? 'text-green-300' :
                  config.quality === 'blue' ? 'text-blue-300' :
                  config.quality === 'purple' ? 'text-purple-300' :
                  config.quality === 'orange' ? 'text-orange-300' : 'text-[#333]'
                }`}>
                  {config.name}
                </div>

                {/* Center Icon (from reference image) */}
                <div className="w-12 h-12 rounded-full bg-[#4a4a4a] flex items-center justify-center shadow-md mt-2">
                  <div className="w-8 h-8 rounded-full bg-[#5a5a5a] flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#aaaaaa] rounded-sm rotate-45"></div>
                  </div>
                </div>
                
                {/* Level text or Fragments */}
                {isUnlocked ? (
                  <div className="absolute bottom-1 right-1 text-[#333] font-black text-xs italic drop-shadow-sm">
                    {pet.level}级
                  </div>
                ) : (
                  <div className="absolute bottom-1 right-1 text-[#333] font-black text-[10px] drop-shadow-sm">
                    {frags}/{needed}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthesis Modal */}
      <AnimatePresence>
        {showSynthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-stone-900 border-2 border-amber-500/50 rounded-xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(217,119,6,0.3)] flex flex-col items-center"
            >
              <Sparkles size={48} className="text-amber-400 mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-amber-500 mb-2">合成战宠</h2>
              <p className="text-stone-300 text-center mb-6">
                是否消耗 <span className="text-amber-400 font-bold">{neededFragments}</span> 个碎片合成 <span className="text-cyan-400 font-bold">{selectedConfig?.name}</span>？
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setShowSynthModal(false)}
                  className="flex-1 py-2 rounded-lg border border-stone-600 text-stone-400 font-bold hover:bg-stone-800 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSynthesize}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-lg hover:brightness-110 transition-all"
                >
                  确认合成
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
