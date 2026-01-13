import React from 'react';

const CyberButton = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseStyle = "font-mono font-bold uppercase transition-all duration-200 skew-x-[-10deg] px-6 py-3 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-yellow-400 text-black hover:bg-yellow-300 border-2 border-transparent hover:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)]",
    secondary: "bg-zinc-800 text-cyan-400 border-2 border-cyan-600 hover:bg-zinc-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]",
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      <span className="skew-x-[10deg]">{children}</span>
    </button>
  );
};

export default CyberButton;
