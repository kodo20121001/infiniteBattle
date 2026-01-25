import React from 'react';

const BlockTool = ({ gridColCount, gridRowCount, showBlockedCells, setShowBlockedCells }) => {
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
      </div>
    </div>
  );
};

export default BlockTool;
