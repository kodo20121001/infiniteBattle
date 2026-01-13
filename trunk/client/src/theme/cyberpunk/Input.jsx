import React from 'react';

const CyberInput = ({ icon: Icon, ...props }) => (
  <div className="relative group skew-x-[-10deg]">
    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-cyan-600 z-10">
      {Icon && <Icon size={18} className="skew-x-[10deg]" />}
    </div>
    <input 
      className="w-full bg-zinc-900 border-2 border-zinc-700 text-cyan-400 py-3 pl-10 pr-4 focus:outline-none focus:border-yellow-400 focus:bg-zinc-800 placeholder-zinc-600 font-mono transition-all"
      {...props}
    />
  </div>
);

export default CyberInput;
