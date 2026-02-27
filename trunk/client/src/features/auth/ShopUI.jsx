import React, { useState, useEffect } from 'react';
import { Diamond, User, Shield, Package, Zap, Ghost } from 'lucide-react';
import { PlayerData } from '../../data/PlayerData';

const IconMap = {
  Diamond,
  User,
  Shield,
  Package,
  Zap,
  Ghost
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

  // Determine styles based on rank/rarity
  const rank = item.ui?.rank || 'N';
  const rarityStyles = {
    SSR: {
      border: 'border-yellow-500/50 hover:border-yellow-400',
      bg: 'bg-gradient-to-br from-yellow-900/40 to-slate-900',
      iconBg: 'bg-yellow-950/50 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
      text: 'text-yellow-400',
      glow: 'bg-yellow-500/10'
    },
    SR: {
      border: 'border-purple-500/50 hover:border-purple-400',
      bg: 'bg-gradient-to-br from-purple-900/40 to-slate-900',
      iconBg: 'bg-purple-950/50 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
      text: 'text-purple-400',
      glow: 'bg-purple-500/10'
    },
    R: {
      border: 'border-cyan-500/50 hover:border-cyan-400',
      bg: 'bg-gradient-to-br from-cyan-900/40 to-slate-900',
      iconBg: 'bg-cyan-950/50 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      text: 'text-cyan-400',
      glow: 'bg-cyan-500/5'
    },
    N: {
      border: 'border-slate-700 hover:border-slate-500',
      bg: 'bg-slate-900/80',
      iconBg: 'bg-slate-800 border-slate-600',
      text: 'text-slate-300',
      glow: 'bg-transparent'
    }
  };

  const style = rarityStyles[rank] || rarityStyles.N;

  return (
    <div className={`relative rounded-xl p-3 flex flex-col items-center overflow-hidden group transition-all duration-300 border ${style.border} ${style.bg}`}>
      {/* Background Glow */}
      <div className={`absolute inset-0 ${style.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}></div>

      {/* Highlight for Popular Items */}
      {item.ui?.popular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-rose-600 to-red-500 text-white text-[10px] px-3 py-0.5 rounded-bl-lg font-bold z-10 shadow-md">
          热销
        </div>
      )}
      
      {/* Rank Badge */}
      {rank !== 'N' && (
        <div className={`absolute top-2 left-2 text-[10px] font-black italic ${style.text} z-10 drop-shadow-md`}>
          {rank}
        </div>
      )}

      <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 relative z-10 border ${style.iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1`}>
          {/* Inner Glow for Icon */}
          <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          {IconComponent ? (
              <IconComponent size={32} className={`${item.ui?.color || style.text} drop-shadow-lg`} />
          ) : isEmoji ? (
              <span className="text-3xl drop-shadow-lg">{item.ui.icon}</span>
          ) : null}
      </div>

      <div className="text-center w-full relative z-10 flex flex-col flex-1">
        <div className={`font-bold truncate text-sm mb-0.5 ${rank === 'SSR' || rank === 'SR' ? style.text : 'text-slate-200'}`}>
          {item.name}
        </div>
        
        <div className="flex-1 flex flex-col justify-center min-h-[32px]">
          {item.desc && <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{item.desc}</div>}
          {item.ui?.power && <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{item.ui.power}</div>}
          {item.ui?.amountText && <div className="text-[10px] text-amber-400 font-bold mt-0.5">{item.ui.amountText}</div>}
        </div>
        
        {/* Price Button */}
        <button 
          onClick={() => onBuy(item)}
          className="mt-3 w-full py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 border border-cyan-500/30 bg-slate-900/80 hover:bg-cyan-950/90 hover:border-cyan-400 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 relative overflow-hidden group/btn"
        >
          {/* Animated Scanning Line */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent -translate-y-full group-hover/btn:animate-[scan_2s_linear_infinite]"></div>
          
          {/* Button Glare */}
          <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"></div>
          
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400 opacity-50 group-hover/btn:opacity-100 transition-opacity"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400 opacity-50 group-hover/btn:opacity-100 transition-opacity"></div>

          <div className="relative z-10 flex items-center justify-center gap-1.5">
            {isRmb ? (
               <span className="font-black tracking-wider text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.8)]">¥{item.cost.count}</span>
            ) : (
               <>
                 {isGem ? (
                   <Diamond size={14} className="text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.8)] animate-pulse" />
                 ) : isCoin ? (
                   <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border border-yellow-200 shadow-[0_0_5px_rgba(234,179,8,0.5)] animate-pulse" />
                 ) : null}
                 <span className="text-sm font-black font-mono tracking-wide text-cyan-50 drop-shadow-[0_0_2px_rgba(6,182,212,0.8)]">{item.cost.count}</span>
               </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default function ShopUI() {
  const [activeTab, setActiveTab] = useState('resources');
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
    const rank = item.ui?.rank || 'N';
    
    // Special case for RMB purchases (mocking real money purchase)
    if (item.cost.id === 'rmb') {
      player.addThing(item.reward);
      showMessage('购买成功！', `获得 ${item.name} x ${item.reward.count}`, false, rank, item.name);
      // 触发一个自定义事件，通知其他UI更新资源显示
      window.dispatchEvent(new CustomEvent('playerDataChanged'));
      return;
    }

    const checkResult = player.canBuyShopItem(item);
    if (!checkResult.canBuy) {
      showMessage('购买失败', checkResult.reason, true);
      return;
    }

    if (player.buyShopItem(item)) {
      showMessage('购买成功！', `获得 ${item.name} x ${item.reward.count}`, false, rank, item.name);
      // 触发一个自定义事件，通知其他UI更新资源显示
      window.dispatchEvent(new CustomEvent('playerDataChanged'));
    } else {
      showMessage('购买失败', '发生未知错误', true);
    }
  };

  const showMessage = (title, detail, isError = false, rank = 'N', itemName = '') => {
    setMessage({ title, detail, isError, rank, itemName });
    setTimeout(() => setMessage(null), 2500);
  };

  const currentItems = shopData.filter(item => item.category === activeTab);

  // Helper to get toast colors based on rank
  const getToastColors = (isError, rank) => {
    if (isError) {
      return {
        border: 'border-rose-500/40',
        text: 'text-rose-100',
        shadow: 'shadow-[0_0_30px_rgba(225,29,72,0.2)]',
        line: 'bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.8)]',
        icon: 'text-rose-400 drop-shadow-[0_0_5px_rgba(225,29,72,0.5)]',
        detailBg: 'bg-rose-950/50 border-rose-500/20',
        detailText: 'text-rose-200',
        itemNameColor: 'text-rose-200'
      };
    }
    
    // Base colors for success toast (always Cyan theme)
    const baseColors = {
      border: 'border-cyan-400/40',
      text: 'text-cyan-50',
      shadow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]',
      line: 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]',
      icon: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]',
      detailBg: 'bg-cyan-950/50 border-cyan-400/20',
      detailText: 'text-cyan-200'
    };

    // Only change the item name color based on rank
    switch (rank) {
      case 'SSR':
        return { ...baseColors, itemNameColor: 'text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' };
      case 'SR':
        return { ...baseColors, itemNameColor: 'text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]' };
      case 'R':
        return { ...baseColors, itemNameColor: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]' };
      default: // N or unknown
        return { ...baseColors, itemNameColor: 'text-slate-300' };
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050510] relative">
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes slideDown {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      {/* Toast Message */}
      {message && (() => {
        const colors = getToastColors(message.isError, message.rank);
        
        // Helper to render detail text with colored item name
        const renderDetail = () => {
          if (!message.itemName || message.isError) return message.detail;
          
          // Split the detail string to wrap the item name in a span with the specific color
          const parts = message.detail.split(message.itemName);
          if (parts.length === 2) {
            return (
              <>
                {parts[0]}
                <span className={`font-black ${colors.itemNameColor}`}>{message.itemName}</span>
                {parts[1]}
              </>
            );
          }
          return message.detail;
        };

        return (
          <div className="absolute top-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className={`flex flex-col items-center px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9)] border backdrop-blur-xl animate-[slideDown_0.4s_cubic-bezier(0.16,1,0.3,1)]
              bg-slate-900/95 ${colors.border} ${colors.text} ${colors.shadow}`}>
              
              {/* Decorative Top Line */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] rounded-b-full ${colors.line}`}></div>

              <div className="flex items-center gap-2.5 mb-2">
                {message.isError ? <Shield size={18} className={colors.icon} /> : <Package size={18} className={colors.icon} />}
                <span className="font-black tracking-widest text-base drop-shadow-md">{message.title}</span>
              </div>
              {message.detail && (
                <div className={`text-sm font-bold px-5 py-2 rounded-xl whitespace-nowrap border ${colors.detailBg} ${colors.detailText}`}>
                  {renderDetail()}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Header Tabs */}
      <div className="flex w-full overflow-x-auto bg-black/40 px-2 pt-2 gap-1 border-b border-slate-800 shrink-0">
        <TabButton active={activeTab === 'resources'} label="资源" icon={Package} onClick={() => setActiveTab('resources')} />
        <TabButton active={activeTab === 'pets'} label="宠物" icon={Ghost} onClick={() => setActiveTab('pets')} />
        <TabButton active={activeTab === 'equipment'} label="装备" icon={Shield} onClick={() => setActiveTab('equipment')} />
        <TabButton active={activeTab === 'items'} label="道具" icon={Zap} onClick={() => setActiveTab('items')} />
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
