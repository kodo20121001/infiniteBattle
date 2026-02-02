import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Castle, Swords, Shield } from 'lucide-react';

const defaultBuildings = [
  {
    id: 'tower',
    name: '箭塔',
    icon: Castle,
    count: 3,
  },
  {
    id: 'barracks',
    name: '兵营',
    icon: Swords,
    count: 2,
  },
  {
    id: 'barrier',
    name: '路障',
    icon: Shield,
    count: 5,
  },
];

const GameUI = ({ theme, buildings = defaultBuildings, onPlace, onToggle }) => {
  const [expanded, setExpanded] = useState(false);
  const { Button, Panel, titleColor } = theme;

  const list = useMemo(() => buildings, [buildings]);

  return (
    <div className="absolute left-0 right-0 bottom-0 pointer-events-none">
      {/* Small arrow button in bottom-right corner when panel is hidden */}
      {!expanded && (
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <Button
            variant="primary"
            onClick={() => {
              setExpanded(true);
              onToggle?.(true);
            }}
            className="!w-12 !h-12 !rounded-full !p-0 flex items-center justify-center"
          >
            <ChevronUp size={24} />
          </Button>
        </div>
      )}

      {/* Building panel */}
      {expanded && (
        <div className="pointer-events-auto relative">
          {/* Close button in top-right corner */}
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="primary"
              onClick={() => {
                setExpanded(false);
                onToggle?.(false);
              }}
              className="!w-10 !h-10 !rounded-full !p-0 flex items-center justify-center"
            >
              <ChevronDown size={20} />
            </Button>
          </div>

          <Panel className="w-full rounded-none border-t-2 border-cyan-500/30">
            <div className="py-3 px-4 bg-gradient-to-b from-black/40 to-transparent">
              {/* Header with decorative line */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-full"></div>
                <Building2 size={16} className="text-cyan-400" />
                <p className={`text-sm font-bold uppercase ${titleColor}`}>
                  建筑放置
                </p>
                <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent ml-2"></div>
              </div>

              {/* Horizontal scrollable building icons */}
              <div className="overflow-x-auto -mx-4 px-4" style={{ pointerEvents: 'auto' }}>
                <div className="flex gap-4 pb-2">
                  {list.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onPlace?.(item, e);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          onPlace?.(item, e.touches[0]);
                        }}
                        style={{ pointerEvents: 'auto' }}
                        className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105 opacity-80 hover:opacity-100"
                      >
                        {/* Decorative corner elements */}
                        <div className="relative pointer-events-none">
                          <div className="w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all backdrop-blur-sm border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-black/50 hover:border-purple-400/60 hover:shadow-md hover:shadow-purple-500/30">
                            <Icon size={28} className="text-purple-300/80" />
                          </div>
                        </div>
                        {/* Name and count with background */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded border transition-all bg-black/40 border-purple-500/30 pointer-events-none">
                          <p className="text-xs font-medium text-white/90">
                            {item.name}
                          </p>
                          <p className="text-xs font-semibold text-purple-400">
                            ×{item.count}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
};

export default GameUI;
