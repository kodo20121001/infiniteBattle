import React from 'react';

const DiabloPanel = ({ children, className = '' }) => (
  <div
    className={`bg-black/95 border-t border-stone-800 px-6 py-5 shadow-[0_-20px_40px_rgba(0,0,0,0.6)] ${className}`}
  >
    {children}
  </div>
);

export default DiabloPanel;
