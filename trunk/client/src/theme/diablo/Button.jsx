import React from 'react';

const DiabloButton = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseStyle = "font-serif uppercase tracking-widest transition-all duration-300 border px-6 py-3 relative group";
  const variants = {
    primary: "bg-red-950/80 border-red-800 text-red-100 hover:bg-red-900 hover:border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]",
    secondary: "bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500",
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      <span className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-current opacity-50" />
      <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-current opacity-50" />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

export default DiabloButton;
