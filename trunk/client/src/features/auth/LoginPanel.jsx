import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Gamepad2, Terminal, Cpu } from 'lucide-react';

const LoginPanel = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [hexCode, setHexCode] = useState('0x0000');

  // 模拟动态变化的十六进制代码，增加科技感
  useEffect(() => {
    const interval = setInterval(() => {
      setHexCode('0x' + Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0'));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      setError('');
      onLogin(username.trim());
    } else {
      setError('请输入账号和密码');
    }
  };

  return (
    <div className="w-full max-w-md relative group">
      {/* Decorative HUD Elements (Corners) */}
      <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-lg transition-all duration-500 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] z-10"></div>
      <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-lg transition-all duration-500 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] z-10"></div>
      <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-lg transition-all duration-500 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] z-10"></div>
      <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-cyan-500/50 rounded-br-lg transition-all duration-500 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] z-10"></div>

      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
        
        {/* Animated Scanning Line */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-50 pointer-events-none" style={{ animation: 'scan 3s linear infinite' }}></div>
        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(400%); }
          }
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
          @keyframes glitch {
            0% { transform: translate(0) }
            20% { transform: translate(-2px, 2px) }
            40% { transform: translate(-2px, -2px) }
            60% { transform: translate(2px, 2px) }
            80% { transform: translate(2px, -2px) }
            100% { transform: translate(0) }
          }
          @keyframes spin-slow {
            100% { transform: rotate(360deg); }
          }
        `}</style>

        {/* Background Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-colors duration-700"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-700"></div>

        <div className="text-center mb-10 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)] relative overflow-hidden group/icon">
            {/* Rotating Border Effect */}
            <div className="absolute w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,1)_360deg)] animate-[spin-slow_3s_linear_infinite] opacity-50"></div>
            <div className="absolute inset-[2px] bg-slate-900 rounded-2xl z-0"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 z-0"></div>
            <Gamepad2 size={32} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] relative z-10 group-hover/icon:scale-110 transition-transform duration-300" />
          </div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider uppercase drop-shadow-sm hover:animate-[glitch_0.2s_ease-in-out_infinite] cursor-default">
            Infinite Play
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 text-cyan-500/70 text-xs font-mono">
            <Terminal size={12} className="animate-pulse" />
            <span>SYSTEM.AUTH // <span className="text-cyan-400 font-bold">{hexCode}</span></span>
          </div>
        </div>

        <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-slate-500 group-focus-within/input:text-cyan-400 transition-colors duration-300" />
              </div>
              <input 
                type="text" 
                placeholder="请输入账号" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-cyan-50 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 focus:bg-slate-900/80 transition-all duration-300 shadow-inner"
              />
              {/* Input Glow */}
              <div className="absolute inset-0 -z-10 rounded-xl bg-cyan-400/0 group-focus-within/input:bg-cyan-400/5 blur-md transition-colors duration-300"></div>
            </div>
            
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-500 group-focus-within/input:text-cyan-400 transition-colors duration-300" />
              </div>
              <input 
                type="password" 
                placeholder="请输入密码 (任意字符即可)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-cyan-50 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 focus:bg-slate-900/80 transition-all duration-300 shadow-inner"
              />
              <div className="absolute inset-0 -z-10 rounded-xl bg-cyan-400/0 group-focus-within/input:bg-cyan-400/5 blur-md transition-colors duration-300"></div>
            </div>
          </div>

          {error && (
            <div className="text-rose-400 text-sm text-center font-bold flex items-center justify-center gap-1.5 bg-rose-500/10 py-2.5 rounded-lg border border-rose-500/20">
              <Cpu size={14} className="animate-pulse" />
              {error}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              className="relative w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden group/btn border border-cyan-400/50"
            >
              {/* Button Glare */}
              <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
              
              <span className="relative z-10 tracking-widest">系统接入</span>
              <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>
        
        <div className="mt-8 text-center text-xs text-slate-500 relative z-10 flex items-center justify-center gap-3">
          <div className="w-10 h-[1px] bg-slate-700/50"></div>
          <span className="tracking-wider">输入不同账号创建独立存档</span>
          <div className="w-10 h-[1px] bg-slate-700/50"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPanel;
