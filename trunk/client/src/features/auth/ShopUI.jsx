import React, { useState } from 'react';
import { Diamond, User, Shield, Package, Zap } from 'lucide-react';

const mockShopData = {
  gems: [
    { id: 1, name: '一小袋宝石', price: '¥6', amount: 100, icon: Diamond, color: 'text-cyan-400', popular: false },
    { id: 2, name: '英雄宝石箱', price: '¥30', amount: 550, icon: Diamond, color: 'text-cyan-400', popular: true },
    { id: 3, name: '传说宝石堆', price: '¥98', amount: 1800, icon: Diamond, color: 'text-cyan-400', popular: false },
    { id: 4, name: '史诗宝石山', price: '¥198', amount: 4000, icon: Diamond, color: 'text-cyan-400', popular: false },
  ],
  characters: [
    { id: 1, name: '暗影刺客', price: 2000, type: 'gem', rank: 'SR', desc: '神出鬼没的致命杀手', image: '👤' },
    { id: 2, name: '圣光骑士', price: 4500, type: 'gem', rank: 'SSR', desc: '坚不可摧的团队守护者', image: '🛡️' },
    { id: 3, name: '元素使者', price: 1500, type: 'gem', rank: 'SR', desc: '掌控自然之力的法师', image: '🔥' },
  ],
  equipment: [
    { id: 1, name: '精钢长剑', price: 500, type: 'coin', rank: 'R', power: '+25 攻击', icon: Shield },
    { id: 2, name: '龙鳞胸甲', price: 1200, type: 'coin', rank: 'SR', power: '+120 生命', icon: Shield },
    { id: 3, name: '风行之靴', price: 800, type: 'coin', rank: 'SR', power: '+15 速度', icon: Shield },
  ],
  resources: [
    { id: 1, name: '大金币箱', price: 200, type: 'gem', amount: '100k 金币', icon: Package },
    { id: 2, name: '体力药剂', price: 50, type: 'gem', amount: '60 体力', icon: Package },
    { id: 3, name: '经验卷轴', price: 100, type: 'gem', amount: '10k 经验', icon: Package },
  ],
  items: [
    { id: 1, name: '传送卷轴', price: 50, type: 'gem', desc: '瞬间移动到指定位置', icon: Zap },
    { id: 2, name: '复活十字架', price: 300, type: 'gem', rank: 'SR', desc: '死亡后立即复活', icon: Zap },
    { id: 3, name: '隐形药水', price: 150, type: 'coin', desc: '隐身 30 秒', icon: Zap },
  ]
};

const TabButton = ({ active, label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors font-bold text-sm border-b-2
      ${active 
        ? 'bg-slate-800 text-cyan-400 border-cyan-400' 
        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'}`}
  >
    <Icon size={16} />
    {label}
  </button>
);

const ShopCard = ({ item, isGem }) => (
  <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 flex flex-col items-center relative overflow-hidden group hover:border-cyan-500/50 transition-all">
    {/* Highlight for Popular Items */}
    {item.popular && (
      <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold z-10">
        热销
      </div>
    )}
    
    <div className={`w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 shadow-inner
      ${item.rank === 'SSR' ? 'border-2 border-orange-500 shadow-orange-500/20' : 
        item.rank === 'SR' ? 'border-2 border-purple-500 shadow-purple-500/20' : 'border border-slate-600'}`}>
        
        {item.icon ? (
            <item.icon size={32} className={item.color || 'text-slate-300'} />
        ) : (
            <span className="text-3xl">{item.image}</span>
        )}
    </div>

    <div className="text-center w-full">
      <div className="text-slate-200 font-bold truncate text-sm">{item.name}</div>
      {item.desc && <div className="text-[10px] text-slate-500 truncate mb-1">{item.desc}</div>}
      
      {/* Price Button */}
      <button className="mt-2 w-full py-1.5 rounded bg-slate-800 hover:bg-cyan-900 border border-slate-600 hover:border-cyan-500/50 flex items-center justify-center gap-1 transition-colors">
        {isGem ? (
           <span className="text-white font-bold">{item.price}</span>
        ) : (
           <>
             {item.type === 'gem' ? <Diamond size={12} className="text-cyan-400" /> : <div className="w-3 h-3 rounded-full bg-yellow-500" />}
             <span className="text-sm font-mono text-slate-200">{item.price}</span>
           </>
        )}
      </button>
    </div>
  </div>
);

export default function ShopUI() {
  const [activeTab, setActiveTab] = useState('gems');

  return (
    <div className="flex flex-col h-full w-full bg-[#050510] relative">
      {/* Header Tabs */}
      <div className="flex w-full overflow-x-auto bg-black/40 px-2 pt-2 gap-1 border-b border-slate-800 shrink-0">
        <TabButton active={activeTab === 'gems'} label="宝石" icon={Diamond} onClick={() => setActiveTab('gems')} />
        <TabButton active={activeTab === 'characters'} label="角色" icon={User} onClick={() => setActiveTab('characters')} />
        <TabButton active={activeTab === 'equipment'} label="装备" icon={Shield} onClick={() => setActiveTab('equipment')} />
        <TabButton active={activeTab === 'items'} label="道具" icon={Zap} onClick={() => setActiveTab('items')} />
        <TabButton active={activeTab === 'resources'} label="资源" icon={Package} onClick={() => setActiveTab('resources')} />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Banner Area */}
        <div className="w-full h-32 rounded-xl bg-gradient-to-r from-indigo-900 to-cyan-900 mb-6 flex items-center px-6 shadow-lg border border-cyan-500/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://placehold.co/200x200/png')] opacity-20 mix-blend-overlay"></div>
          <div className="z-10">
            <div className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-1">限时特惠</div>
            <div className="text-white font-bold text-2xl mb-1">星际礼包</div>
            <div className="text-cyan-200 text-sm">绝版SSR角色等你来拿</div>
            <button className="mt-2 text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-500 transition">
                查看详情
            </button>
          </div>
        </div>

        {/* Dynamic Grid */}
        <div className="grid grid-cols-2 gap-3 pb-20">
          {mockShopData[activeTab].map(item => (
            <ShopCard key={item.id} item={item} isGem={activeTab === 'gems'} />
          ))}
        </div>
      </div>
    </div>
  );
}
