import React, { useState, useEffect } from 'react';
import { Diamond, User, Shield, Package, Zap } from 'lucide-react';
import { PlayerData } from '../../data/PlayerData';

const IconMap = {
  Diamond,
  User,
  Shield,
  Package,
  Zap
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

const ShopCard = ({ item, onBuy }) => {
  const IconComponent = IconMap[item.ui?.icon];
  const isEmoji = !IconComponent && item.ui?.icon;
  
  const isRmb = item.cost.id === 'rmb';
  const isGem = item.cost.id === 'diamond';
  const isCoin = item.cost.id === 'gold';

  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 flex flex-col items-center relative overflow-hidden group hover:border-cyan-500/50 transition-all">
      {/* Highlight for Popular Items */}
      {item.ui?.popular && (
        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-bl font-bold z-10">
          热销
        </div>
      )}
      
      <div className={`w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2 shadow-inner
        ${item.ui?.rank === 'SSR' ? 'border-2 border-orange-500 shadow-orange-500/20' : 
          item.ui?.rank === 'SR' ? 'border-2 border-purple-500 shadow-purple-500/20' : 'border border-slate-600'}`}>
          
          {IconComponent ? (
              <IconComponent size={32} className={item.ui?.color || 'text-slate-300'} />
          ) : isEmoji ? (
              <span className="text-3xl">{item.ui.icon}</span>
          ) : null}
      </div>

      <div className="text-center w-full">
        <div className="text-slate-200 font-bold truncate text-sm">{item.name}</div>
        {item.desc && <div className="text-[10px] text-slate-500 truncate mb-1">{item.desc}</div>}
        {item.ui?.power && <div className="text-[10px] text-green-400 truncate mb-1">{item.ui.power}</div>}
        {item.ui?.amountText && <div className="text-[10px] text-yellow-400 truncate mb-1">{item.ui.amountText}</div>}
        
        {/* Price Button */}
        <button 
          onClick={() => onBuy(item)}
          className="mt-2 w-full py-1.5 rounded bg-slate-800 hover:bg-cyan-900 border border-slate-600 hover:border-cyan-500/50 flex items-center justify-center gap-1 transition-colors"
        >
          {isRmb ? (
             <span className="text-white font-bold">¥{item.cost.count}</span>
          ) : (
             <>
               {isGem ? <Diamond size={12} className="text-cyan-400" /> : isCoin ? <div className="w-3 h-3 rounded-full bg-yellow-500" /> : null}
               <span className="text-sm font-mono text-slate-200">{item.cost.count}</span>
             </>
          )}
        </button>
      </div>
    </div>
  );
};

export default function ShopUI() {
  const [activeTab, setActiveTab] = useState('gems');
  const [shopData, setShopData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Load shop config
    fetch('/config/shop.json')
      .then(res => res.json())
      .then(data => {
        // Sort by weight descending
        data.sort((a, b) => (b.sortWeight || 0) - (a.sortWeight || 0));
        setShopData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load shop config:', err);
        setLoading(false);
      });
  }, []);

  const handleBuy = (item) => {
    const player = PlayerData.getInstance();
    
    // Special case for RMB purchases (mocking real money purchase)
    if (item.cost.id === 'rmb') {
      player.addThing(item.reward);
      showMessage(`购买成功！获得 ${item.reward.count} ${item.reward.id}`);
      // 触发一个自定义事件，通知其他UI更新资源显示
      window.dispatchEvent(new CustomEvent('playerDataChanged'));
      return;
    }

    const checkResult = player.canBuyShopItem(item);
    if (!checkResult.canBuy) {
      showMessage(`购买失败: ${checkResult.reason}`, true);
      return;
    }

    if (player.buyShopItem(item)) {
      showMessage(`购买成功！获得 ${item.reward.count} ${item.reward.id}`);
      // 触发一个自定义事件，通知其他UI更新资源显示
      window.dispatchEvent(new CustomEvent('playerDataChanged'));
    } else {
      showMessage('购买失败，发生未知错误', true);
    }
  };

  const showMessage = (msg, isError = false) => {
    setMessage({ text: msg, isError });
    setTimeout(() => setMessage(null), 2000);
  };

  const currentItems = shopData.filter(item => item.category === activeTab);

  return (
    <div className="flex flex-col h-full w-full bg-[#050510] relative">
      {/* Toast Message */}
      {message && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded shadow-lg text-sm font-bold transition-all
          ${message.isError ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
          {message.text}
        </div>
      )}

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
          {loading ? (
            <div className="col-span-2 text-center text-slate-500 py-10">加载中...</div>
          ) : currentItems.length > 0 ? (
            currentItems.map(item => (
              <ShopCard key={item.id} item={item} onBuy={handleBuy} />
            ))
          ) : (
            <div className="col-span-2 text-center text-slate-500 py-10">暂无商品</div>
          )}
        </div>
      </div>
    </div>
  );
}
