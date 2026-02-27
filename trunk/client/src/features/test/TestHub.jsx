import React, { useState, lazy, Suspense } from 'react';

const PathfindingTester = lazy(() => import('./PathfindingTester.jsx'));
const GroupMovementTester = lazy(() => import('./GroupMovementTester.jsx'));
const EncircleTester = lazy(() => import('./EncircleTester.jsx'));
const CoordinateTester = lazy(() => import('./CoordinateTester.jsx'));
const VrmTester = lazy(() => import('./VrmTester.jsx'));
const UnityTester = lazy(() => import('./UnityTester.jsx'));
const Model3DTester = lazy(() => import('./Model3DTester.jsx'));

const tests = [
  {
    id: 'model3d',
    title: '3D 模型测试',
    description: '加载并显示 3D 目录中的模型与动作',
    icon: '🎭',
    color: 'from-fuchsia-600 to-pink-600'
  },
  {
    id: 'unity',
    title: 'Unity 场景测试',
    description: '加载并显示导出的 Unity WebGL 场景',
    icon: '🎮',
    color: 'from-indigo-600 to-blue-600'
  },
  {
    id: 'vrm',
    title: 'VRM 模型测试',
    description: '加载并显示 AvatarSample_D1.vrm 模型',
    icon: '🧍',
    color: 'from-pink-600 to-purple-600'
  },
  {
    id: 'coordinate',
    title: '坐标测试',
    description: '俯视角点击获取 Canvas、NDC、World 坐标',
    icon: '📍',
    color: 'from-cyan-600 to-blue-600'
  },
  {
    id: 'pathfinding',
    title: '寻路测试',
    description: '选择地图后启动，小兵会从 1 号点移动到 2 号点',
    icon: '🧭',
    color: 'from-emerald-600 to-cyan-600'
  },
  {
    id: 'groupmove',
    title: '群体移动测试',
    description: '批量生成单位并从 1 移动到 2，观察避让与滑动效果',
    icon: '👥',
    color: 'from-violet-600 to-fuchsia-600'
  },
  {
    id: 'encircle',
    title: '全体包围测试',
    description: '点1生成攻击方，点2生成敌人，攻击方 AttackMove 点2',
    icon: '🛡️',
    color: 'from-amber-600 to-rose-600'
  }
];

const Loading = () => (
  <div className="w-full h-full flex items-center justify-center text-slate-200">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
    加载测试中...
  </div>
);

const TestHub = ({ onBack }) => {
  const [current, setCurrent] = useState(null);

  const handleGoToEditor = () => {
    localStorage.setItem('startupMode', 'editor');
    const basePath = window.location.pathname || '/';
    window.location.href = `${basePath}?mode=editor`;
  };

  if (current === 'coordinate') {
    return (
      <Suspense fallback={<Loading />}> 
        <CoordinateTester onBack={() => setCurrent(null)} />
      </Suspense>
    );
  }
  if (current === 'pathfinding') {
    return (
      <Suspense fallback={<Loading />}> 
        <PathfindingTester onBack={onBack} onBackToHub={() => setCurrent(null)} />
      </Suspense>
    );
  }
  if (current === 'groupmove') {
    return (
      <Suspense fallback={<Loading />}> 
        <GroupMovementTester onBack={onBack} onBackToHub={() => setCurrent(null)} />
      </Suspense>
    );
  }
  if (current === 'encircle') {
    return (
      <Suspense fallback={<Loading />}> 
        <EncircleTester onBack={onBack} onBackToHub={() => setCurrent(null)} />
      </Suspense>
    );
  }
  if (current === 'vrm') {
    return (
      <Suspense fallback={<Loading />}> 
        <VrmTester onBack={() => setCurrent(null)} />
      </Suspense>
    );
  }
  if (current === 'unity') {
    return (
      <Suspense fallback={<Loading />}> 
        <UnityTester onBack={() => setCurrent(null)} />
      </Suspense>
    );
  }
  if (current === 'model3d') {
    return (
      <Suspense fallback={<Loading />}> 
        <Model3DTester onBack={() => setCurrent(null)} />
      </Suspense>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 text-white flex">
      <div className="w-[420px] border-r border-slate-800 p-6 flex flex-col gap-4 bg-slate-900/70">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">测试中心</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToEditor}
              className="px-3 py-1 text-xs rounded bg-emerald-700 hover:bg-emerald-600"
            >去编辑器</button>
            <button
              onClick={onBack}
              className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
            >返回主界面</button>
          </div>
        </div>
        <p className="text-slate-400 text-sm">选择一个测试场景，快速验证核心功能。</p>
        <div className="grid grid-cols-1 gap-3">
          {tests.map((t) => (
            <button
              key={t.id}
              onClick={() => setCurrent(t.id)}
              className={`flex items-center gap-3 p-4 rounded-lg border border-slate-800 bg-gradient-to-r ${t.color} text-left hover:scale-[1.01] transition`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span>
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-slate-100/80">{t.description}</div>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-400">
        选择左侧测试卡片开始
      </div>
    </div>
  );
};

export default TestHub;
