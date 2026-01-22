import React from 'react';

const BlockTool = ({ gridColCount, gridRowCount }) => {
  return (
    <div className="space-y-2 text-sm bg-slate-800/60 rounded-lg p-3 border border-slate-700">
      <div className="font-semibold text-slate-200">阻挡刷子</div>
      <div className="text-xs text-slate-400">左键在画布上切换格子可行/阻挡</div>
    </div>
  );
};

export default BlockTool;
