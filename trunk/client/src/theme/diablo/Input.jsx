import React from 'react';

const DiabloInput = ({ icon: Icon, ...props }) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-stone-500 group-focus-within:text-red-500 transition-colors">
      {Icon && <Icon size={18} />}
    </div>
    <input 
      className="w-full bg-stone-950 border border-stone-800 text-stone-300 py-3 pl-10 pr-4 focus:outline-none focus:border-red-700 focus:ring-1 focus:ring-red-900 placeholder-stone-700 font-serif transition-all"
      {...props}
    />
  </div>
);

export default DiabloInput;
