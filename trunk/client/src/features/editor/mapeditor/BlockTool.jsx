import React from 'react';

const BlockTool = ({ gridColCount, gridRowCount, showBlockedCells, setShowBlockedCells, mapData, setMapData, setToast }) => {
  const handleClearAllBlocks = () => {
    if (!mapData || !mapData.gridCells || mapData.gridCells.length === 0) {
      setToast('✗ 没有可清除的阻挡');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    // 显示确认对话框
    if (confirm(`确认清除所有 ${mapData.gridCells.length} 个阻挡格子吗？此操作不可撤销。`)) {
      setMapData((prev) => {
        const next = { ...prev };
        next.gridCells = [];
        return next;
      });
      setToast(`✓ 已清除 ${mapData.gridCells.length} 个阻挡`);
      setTimeout(() => setToast(''), 2000);
    }
  };

  return (
    <div className="space-y-3 text-sm bg-slate-800/60 rounded-lg p-3 border border-slate-700">
      <div className="font-semibold text-slate-200">阻挡刷子</div>
      <div className="text-xs text-slate-400">左键在画布上切换格子可行/阻挡</div>
      
      <div className="pt-2 border-t border-slate-700 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showBlockedCells} 
            onChange={(e) => setShowBlockedCells(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-slate-300">显示阻挡格子</span>
        </label>
        
        <div className="pt-2 border-t border-slate-700">
          <button
            onClick={handleClearAllBlocks}
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold transition-colors"
          >
            一键清除全部阻挡
          </button>
          {mapData?.gridCells && mapData.gridCells.length > 0 && (
            <div className="mt-1 text-xs text-slate-400 text-center">
              当前阻挡数: {mapData.gridCells.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockTool;
