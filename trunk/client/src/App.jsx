import React, { useState, useEffect, lazy, Suspense } from 'react';
import DiabloTheme from './theme/diablo';
import CyberTheme from './theme/cyberpunk';
import LoginPanel from './features/auth/LoginPanel.jsx';
import MainUI from './features/auth/MainUI.jsx';
import GameView from './features/game/GameView.jsx';
import { PlayerData } from './data/PlayerData';

// 动态导入编辑器入口
const EditorHub = lazy(() => import('./features/editor/EditorHub.jsx'));
const TestHub = lazy(() => import('./features/test/TestHub.jsx'));

export default function App() {
  const [currentThemeName, setCurrentThemeName] = useState('diablo');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMode, setCurrentMode] = useState('login'); // 'login', 'game', 'main_ui', 'editor', 'test'
  const activeTheme = currentThemeName === 'diablo' ? DiabloTheme : CyberTheme;

  // 读取URL参数或localStorage来决定启动模式
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const savedMode = localStorage.getItem('startupMode');
    const lastUser = localStorage.getItem('infinite_play_last_user');
    
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
    } else if (lastUser) {
      // 如果有上次登录的账号，自动登录并进入主界面
      PlayerData.switchUser(lastUser);
      setIsLoggedIn(true);
      setCurrentMode('main_ui');
    } else {
      // 默认进入登录界面
      setCurrentMode('login');
    }
  }, []);

  const handleLogin = (username) => {
    console.log(`User logged in: ${username}`);
    PlayerData.switchUser(username);
    setIsLoggedIn(true);
    setCurrentMode('main_ui');
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
      localStorage.removeItem('infinite_play_last_user'); // 退出登录时清除上次登录记录
    } else if (mode === 'main_ui') {
       // MainUI 不需要强制登录状态，或者视作已登录
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
  if (currentMode === 'game') {
    return <GameView theme={activeTheme} levelId={1} />;
  }
  
  // 主界面UI (不经过游戏引擎)
  if (currentMode === 'main_ui') {
    return (
      <div className="w-full h-screen bg-gray-900 overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
           <p className="text-4xl font-bold text-white">Game World Placeholder</p>
        </div>
        <MainUI 
          theme={activeTheme} 
          buildings={[
            { id: 'town_hall_001', name: '指挥中心', count: 1 },
            { id: 'cannon_tower_001', name: '防御塔', count: 5 },
            { id: 'barracks_001', name: '兵营', count: 3 }
          ]}
          onPlace={(b) => console.log('Place:', b)}
          onToggle={(expanded) => console.log('Toggle:', expanded)}
        />
      </div>
    );
  }

  // 否则显示登录界面
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#050510] relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d41a_1px,transparent_1px),linear-gradient(to_bottom,#06b6d41a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/30 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/30 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '5s' }}></div>
      </div>
      
      <LoginPanel onLogin={handleLogin} />
    </div>
  );
}
