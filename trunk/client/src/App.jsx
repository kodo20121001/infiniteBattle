import React, { useState, useEffect, lazy, Suspense } from 'react';
import DiabloTheme from './theme/diablo';
import CyberTheme from './theme/cyberpunk';
import LoginPanel from './features/auth/LoginPanel.jsx';
import GameView from './features/game/GameView.jsx';

// 动态导入编辑器入口
const EditorHub = lazy(() => import('./features/editor/EditorHub.jsx'));
const TestHub = lazy(() => import('./features/test/TestHub.jsx'));

export default function App() {
  const [currentThemeName, setCurrentThemeName] = useState('diablo');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMode, setCurrentMode] = useState('login'); // 'login', 'game', 'editor', 'test'
  const activeTheme = currentThemeName === 'diablo' ? DiabloTheme : CyberTheme;

  // 读取URL参数或localStorage来决定启动模式
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const savedMode = localStorage.getItem('startupMode');
    
    if (urlMode === 'editor') {
      setCurrentMode('editor');
    } else if (urlMode === 'test') {
      setCurrentMode('test');
    } else if (urlMode === 'game') {
      setCurrentMode('game');
      setIsLoggedIn(true);
    } else if (savedMode === 'editor') {
      setCurrentMode('editor');
    } else if (savedMode === 'test') {
      setCurrentMode('test');
    } else if (savedMode === 'game') {
      setCurrentMode('game');
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (username) => {
    console.log(`User logged in: ${username}`);
    setIsLoggedIn(true);
    setCurrentMode('game');
  };

  // 切换启动模式（保存到localStorage）
  const switchMode = (mode) => {
    setCurrentMode(mode);
    localStorage.setItem('startupMode', mode);
    if (mode === 'game') {
      setIsLoggedIn(true);
    } else if (mode === 'login') {
      setIsLoggedIn(false);
      localStorage.removeItem('startupMode');
    }
  };

  // 加载提示组件
  const LoadingFallback = () => (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">加载编辑器中...</p>
      </div>
    </div>
  );

  // 如果是编辑器模式，显示编辑器入口
  if (currentMode === 'editor') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <EditorHub onBack={() => switchMode('login')} />
      </Suspense>
    );
  }

  // 测试模式
  if (currentMode === 'test') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <TestHub onBack={() => switchMode('login')} />
      </Suspense>
    );
  }

  // 如果已登录，显示游戏界面
  if (isLoggedIn) {
    return <GameView />;
  }

  // 否则显示登录界面
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${activeTheme.background}`}>
      <LoginPanel theme={activeTheme} onLogin={handleLogin} />
    </div>
  );
}
