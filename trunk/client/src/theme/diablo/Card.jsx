import React from 'react';

const DiabloCard = ({ children }) => (
  <div className="bg-black border border-stone-800 p-8 max-w-md w-full relative shadow-2xl">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-red-900 px-4 py-1 text-red-700 text-xs tracking-[0.2em] uppercase font-serif">
      Sanctuary
    </div>
    {children}
  </div>
);

export default DiabloCard;
