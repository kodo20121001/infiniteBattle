import React from 'react';

const UnityTester = ({ onBack }) => {
  return (
    <div className="relative w-full h-screen bg-black">
      <iframe
        src="/unity/index.html"
        className="w-full h-full border-none"
        title="Unity WebGL Scene"
      />
      <button
        onClick={onBack}
        className="absolute top-4 left-4 px-4 py-2 bg-slate-800/80 text-white rounded hover:bg-slate-700 z-10 backdrop-blur"
      >
        返回测试中心
      </button>
    </div>
  );
};

export default UnityTester;
