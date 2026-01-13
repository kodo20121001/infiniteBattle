import React from 'react';

const CyberCard = ({ children }) => (
  <div className="bg-zinc-900 border-2 border-yellow-400 p-8 max-w-md w-full relative shadow-[8px_8px_0px_#06b6d4]">
    <div className="absolute -top-3 -right-3 bg-cyan-500 text-black font-bold px-2 py-1 text-xs font-mono">
      NET.RUNNER
    </div>
    {children}
  </div>
);

export default CyberCard;
