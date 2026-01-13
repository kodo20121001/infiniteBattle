import React, { useState } from 'react';
import DiabloTheme from './theme/diablo';
import CyberTheme from './theme/cyberpunk';
import LoginPanel from './features/auth/LoginPanel.jsx';
import GameView from './features/game/GameView.jsx';

export default function App() {
  const [currentThemeName, setCurrentThemeName] = useState('diablo');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const activeTheme = currentThemeName === 'diablo' ? DiabloTheme : CyberTheme;

  const handleLogin = (username) => {
    console.log(`User logged in: ${username}`);
    setIsLoggedIn(true);
  };

  // 如果已登录，显示游戏界面
  if (isLoggedIn) {
    return <GameView />;
  }

  // 否则显示登录界面
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${activeTheme.background}`}>
      {/* 顶部切换开关 (仅用于演示) */}
      <div className="absolute top-8 flex gap-4 bg-white/10 p-2 rounded-lg backdrop-blur-sm">
        <button 
          onClick={() => setCurrentThemeName('diablo')}
          className={`px-4 py-2 rounded ${currentThemeName === 'diablo' ? 'bg-red-900 text-white' : 'text-white/50'}`}
        >
          Diablo Mode
        </button>
        <button 
          onClick={() => setCurrentThemeName('cyber')}
          className={`px-4 py-2 rounded ${currentThemeName === 'cyber' ? 'bg-yellow-400 text-black' : 'text-white/50'}`}
        >
          Cyber Mode
        </button>
      </div>
      {/* 业务组件：传入当前的皮肤 */}
      <LoginPanel theme={activeTheme} onLogin={handleLogin} />
    </div>
  );
}
