import React from 'react';

const CyberPanel = ({ children, className = '' }) => (
  <div
    className={`bg-zinc-950/90 border-t-2 border-yellow-400 px-6 py-5 shadow-[0_-8px_30px_rgba(6,182,212,0.2)] backdrop-blur ${className}`}
  >
    {children}
  </div>
);

export default CyberPanel;
