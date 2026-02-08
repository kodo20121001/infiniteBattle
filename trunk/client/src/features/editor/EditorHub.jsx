import React, { useState, useEffect, lazy, Suspense } from 'react';

// 动态导入具体编辑器
const SkillBehaviorEditor = lazy(() => import('./SkillBehaviorEditor.jsx'));
const MapEditor = lazy(() => import('./MapEditor.jsx'));
const BuildingEditor = lazy(() => import('./BuildingEditor.jsx'));
const ModelEditor = lazy(() => import('./ModelEditor.jsx'));
const LevelEditor = lazy(() => import('./LevelEditor.tsx'));
const BulletEditor = lazy(() => import('./BulletEditor.tsx'));

const EditorHub = ({ onBack }) => {
  const [currentEditor, setCurrentEditor] = useState(null); // null 表示在编辑器列表页

  // 读取URL参数来决定显示哪个编辑器
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEditorType = params.get('type');
    if (urlEditorType && urlEditorType !== 'hub') {
      setCurrentEditor(urlEditorType);
    }
  }, []);
  const editors = [
    {
      id: 'skill-behavior',
      title: '技能行为编辑器',
      description: '编辑技能的行为逻辑、触发条件和效果',
      icon: '⚔️',
      color: 'from-purple-600 to-blue-600',
      route: 'skill-behavior'
    },
    {
      id: 'ai-behavior',
      title: 'AI行为树编辑器',
      description: '编辑单位的AI行为树和决策逻辑',
      icon: '🤖',
      color: 'from-green-600 to-emerald-600',
      route: 'ai-behavior',
      disabled: true
    },
    {
      id: 'unit-config',
      title: '单位配置编辑器',
      description: '编辑单位的属性、模型和配置参数',
      icon: '👤',
      color: 'from-orange-600 to-red-600',
      route: 'unit-config',
      disabled: true
    },
    {
      id: 'map-editor',
      title: '地图编辑器',
      description: '创建和编辑战斗地图、地形和障碍物',
      icon: '🗺️',
      color: 'from-yellow-600 to-orange-600',
      route: 'map-editor',
      disabled: false
    },
    {
      id: 'building-editor',
      title: '建筑编辑器',
      description: '编辑建筑属性、能力、占用格子（War3风格）',
      icon: '🏰',
      color: 'from-amber-600 to-orange-600',
      route: 'building-editor',
      disabled: false
    },
    {
      id: 'model-editor',
      title: '模型编辑器',
      description: '编辑模型配置与预览（2D/3D）',
      icon: '🧩',
      color: 'from-indigo-600 to-violet-600',
      route: 'model-editor',
      disabled: false
    },
    {
      id: 'level-editor',
      title: '关卡编辑器',
      description: '编辑关卡属性、阵营、单位、关系、触发器等',
      icon: '🎮',
      color: 'from-blue-600 to-cyan-600',
      route: 'level-editor',
      disabled: false
    },
    {
      id: 'bullet-editor',
      title: '子弹编辑器',
      description: '编辑子弹配置、分段、触发器、条件和飞行行为',
      icon: '💥',
      color: 'from-red-600 to-pink-600',
      route: 'bullet-editor',
      disabled: false
    }
  ];

  const handleEditorClick = (editor) => {
    if (editor.disabled) return;
    setCurrentEditor(editor.route);
  };

  const handleBackToHub = () => {
    setCurrentEditor(null);
  };

  const handleGoToTest = () => {
    localStorage.setItem('startupMode', 'test');
    const basePath = window.location.pathname || '/';
    window.location.href = `${basePath}?mode=test`;
  };

  // 加载提示组件
  const LoadingFallback = () => (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">加载编辑器中...</p>
      </div>
    </div>
  );

  // 如果选择了具体编辑器，显示该编辑器
  if (currentEditor === 'skill-behavior') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <div className="relative w-full h-screen">
          <SkillBehaviorEditor />
          {/* 导航按钮 */}
          <div className="absolute top-4 right-4 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm z-10">
            <button 
              onClick={handleBackToHub}
              className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-700 text-white"
            >
              返回编辑器中心
            </button>
            <button 
              onClick={handleGoToTest}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              去测试中心
            </button>
            <button 
              onClick={onBack}
              className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              返回主界面
            </button>
          </div>
        </div>
      </Suspense>
    );
  }

  if (currentEditor === 'map-editor') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <div className="relative w-full h-screen">
          <MapEditor />
          <div className="absolute top-4 right-4 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm z-10">
            <button 
              onClick={handleBackToHub}
              className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-700 text-white"
            >
              返回编辑器中心
            </button>
            <button 
              onClick={handleGoToTest}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              去测试中心
            </button>
            <button 
              onClick={onBack}
              className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              返回主界面
            </button>
          </div>
        </div>
      </Suspense>
    );
  }

  if (currentEditor === 'model-editor') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <div className="relative w-full h-screen">
          <ModelEditor />
          <div className="absolute top-4 right-4 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm z-10">
            <button 
              onClick={handleBackToHub}
              className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-700 text-white"
            >
              返回编辑器中心
            </button>
            <button 
              onClick={handleGoToTest}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              去测试中心
            </button>
            <button 
              onClick={onBack}
              className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              返回主界面
            </button>
          </div>
        </div>
      </Suspense>
    );
  }

  if (currentEditor === 'level-editor') {
    return (
      <Suspense fallback={<LoadingFallback/>}>
        <div className="relative w-full h-screen">
          <LevelEditor />
          <div className="absolute top-4 right-4 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm z-10">
            <button 
              onClick={handleBackToHub}
              className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-700 text-white"
            >
              返回编辑器中心
            </button>
            <button 
              onClick={handleGoToTest}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              去测试中心
            </button>
            <button 
              onClick={onBack}
              className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              返回主界面
            </button>
          </div>
        </div>
      </Suspense>
    );
  }

  if (currentEditor === 'bullet-editor') {
    return (
      <Suspense fallback={<LoadingFallback/>}>
        <div className="relative w-full h-screen">
          <BulletEditor />
          <div className="absolute top-4 right-4 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm z-10">
            <button 
              onClick={handleBackToHub}
              className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-700 text-white"
            >
              返回编辑器中心
            </button>
            <button 
              onClick={handleGoToTest}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              去测试中心
            </button>
            <button 
              onClick={onBack}
              className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              返回主界面
            </button>
          </div>
        </div>
      </Suspense>
    );
  }

  if (currentEditor === 'building-editor') {
    return (
      <Suspense fallback={<LoadingFallback/>}>
        <div className="relative w-full h-screen">
          <BuildingEditor />
          <div className="absolute top-4 right-4 flex gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm z-10">
            <button 
              onClick={handleBackToHub}
              className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-700 text-white"
            >
              返回编辑器中心
            </button>
            <button 
              onClick={handleGoToTest}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              去测试中心
            </button>
            <button 
              onClick={onBack}
              className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              返回主界面
            </button>
          </div>
        </div>
      </Suspense>
    );
  }

  // 如果选择了未实现的编辑器
  if (currentEditor) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">该编辑器尚未实现</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleBackToHub}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              返回编辑器中心
            </button>
            <button 
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              返回主界面
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 默认显示编辑器列表

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* 头部 */}
      <div className="border-b border-gray-700 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">编辑器中心</h1>
            <p className="text-sm text-gray-400 mt-1">选择一个编辑器开始工作</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            返回主界面
          </button>
        </div>
      </div>

      {/* 编辑器网格 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {editors.map((editor) => (
            <button
              key={editor.id}
              onClick={() => handleEditorClick(editor)}
              disabled={editor.disabled}
              className={`
                relative group text-left p-6 rounded-xl border-2 transition-all duration-300
                ${editor.disabled 
                  ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed' 
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-400 hover:bg-gray-800/70 cursor-pointer hover:scale-105 hover:shadow-2xl'
                }
              `}
            >
              {/* 背景渐变效果 */}
              {!editor.disabled && (
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${editor.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              )}
              
              {/* 内容 */}
              <div className="relative z-10">
                <div className="text-4xl mb-3">{editor.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  {editor.title}
                  {editor.disabled && (
                    <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">即将推出</span>
                  )}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {editor.description}
                </p>
              </div>

              {/* 右上角装饰 */}
              {!editor.disabled && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>


    </div>
  );
};

export default EditorHub;
