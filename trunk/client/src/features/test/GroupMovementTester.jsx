import React, { useEffect, useRef, useState, useMemo } from 'react';
import { World } from '@/game/engine/common/World';
import { ClientGameRunner } from '@/game/core/impl';
import { ConfigManager } from '@/common/ConfigManager';
import { Configs } from '@/game/common/Configs';

const TEST_LEVEL_ID = 99002;
const TEST_UNIT_ID = 101; // 使用与寻路测试相同的单位

const GroupMovementTester = ({ onBack, onBackToHub }) => {
  const canvasRef = useRef(null);
  const runnerRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('请选择地图并启动群体移动测试');
  const [count, setCount] = useState(24); // 生成单位数量

  useEffect(() => {
    let cancelled = false;
    fetch('/config/map.json')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Object.values(data || {});
        setMaps(list);
        if (list.length > 0) setSelectedMapId(list[0].id);
      })
      .catch((err) => {
        console.error(err);
        setMessage('✗ 加载地图列表失败');
      });
    return () => { cancelled = true; };
  }, []);

  const selectedMap = useMemo(() => maps.find((m) => m.id === selectedMapId), [maps, selectedMapId]);

  const cleanupRunner = () => {
    if (resizeHandlerRef.current) {
      window.removeEventListener('resize', resizeHandlerRef.current);
      resizeHandlerRef.current = null;
    }
    if (runnerRef.current) {
      runnerRef.current.destroy();
      runnerRef.current = null;
    }
  };

  useEffect(() => cleanupRunner, []);

  const buildStartUnits = (mapId) => {
    // 在 1 号点周围生成网格分布，间距 0.4 米（更紧凑）
    const spacing = 0.4;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const units = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (units.length >= count) break;
        units.push({
          unitId: TEST_UNIT_ID,
          campId: 1,
          positionName: 1,
          offset: { x: (c - cols / 2) * spacing, z: (r - rows / 2) * spacing },
        });
      }
    }
    return units;
  };

  const buildTestLevel = (mapId, targetPos) => {
    return {
      id: TEST_LEVEL_ID,
      name: 'Group Movement Test',
      description: '多单位从 1 号点群体移动到 2 号点',
      mapId,
      camps: [
        { id: 1, name: 'Player', playerControlled: true },
        { id: 2, name: 'Neutral' }
      ],
      alliances: [
        { sourceCampId: 1, targetCampId: 2, relation: 'neutral', shareVision: true },
        { sourceCampId: 2, targetCampId: 1, relation: 'neutral', shareVision: true }
      ],
      startUnits: buildStartUnits(mapId),
      triggers: [
        {
          id: 1,
          name: 'group-move-to-point-2',
          eventType: 'levelStart',
          conditions: [],
          actions: [
            { type: 'moveCamp', params: { campId: 1, targetPos: { x: targetPos.x, y: targetPos.y } } }
          ]
        }
      ]
    };
  };

  const startTest = async () => {
    cleanupRunner();
    if (!selectedMap) {
      setMessage('请选择地图');
      return;
    }

    const p1 = selectedMap.points?.find((p) => p.id === 1);
    const p2 = selectedMap.points?.find((p) => p.id === 2);
    if (!p1 || !p2) {
      setMessage('所选地图缺少 id=1 或 id=2 的点');
      return;
    }

    try {
      setStatus('loading');
      setMessage('初始化中...');

      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect?.width || 0));
      const height = Math.max(1, Math.floor(rect?.height || 0));
      if (canvas) { canvas.width = width; canvas.height = height; }

      const configManager = new ConfigManager();
      Configs.init(configManager);
      const levelConfigs = Configs.Get('level') || {};
      const targetPos = { x: p2.x, y: p2.z ?? p2.y ?? 0 };
      levelConfigs[TEST_LEVEL_ID] = buildTestLevel(selectedMap.id, targetPos);

      const world = new World(canvasRef.current, width || 800, height || 600, 60);
      world.setViewport(width || 800, height || 600);
      const runner = new ClientGameRunner(world);
      runner.init();
      await runner.loadLevel(TEST_LEVEL_ID, selectedMap.id);

      runner.setDebugShowBlockedCells(true);
      runnerRef.current = runner;

      const handleResize = () => {
        const nextRect = canvas?.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.floor(nextRect?.width || 0));
        const nextHeight = Math.max(1, Math.floor(nextRect?.height || 0));
        if (canvas) { canvas.width = nextWidth; canvas.height = nextHeight; }
        runnerRef.current?.getWorld?.()?.setViewport(nextWidth, nextHeight);
      };
      window.addEventListener('resize', handleResize);
      resizeHandlerRef.current = handleResize;
      setStatus('running');
      setMessage(`已启动，${count} 个单位正移动至 2 号点`);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(`✗ 启动失败: ${err.message}`);
      cleanupRunner();
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-white flex">
      <div className="w-[360px] border-r border-slate-800 p-6 flex flex-col gap-4 bg-slate-900/70">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">群体移动测试</h1>
          <div className="flex gap-2">
            <button onClick={onBackToHub} className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600">返回测试中心</button>
            <button onClick={onBack} className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700">主界面</button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-300">选择地图</div>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
            value={selectedMapId ?? ''}
            onChange={(e) => setSelectedMapId(Number(e.target.value))}
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>{m.id} - {m.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-300">单位数量</div>
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value))))}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"
          />
          <div className="text-xs text-slate-400">建议 16~36 以观察避让与滑动效果</div>
        </div>

        <div className="space-y-3">
          <button
            onClick={startTest}
            className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-700 font-semibold"
          >启动群体移动测试</button>
          <div className="text-xs text-slate-400 leading-relaxed">
            • 需要地图中有 id=1 和 id=2 的点。
            <br />• 单位使用 unit.json 中的 #101。
            <br />• 启动后 Camp#1 的所有单位从 1 → 2。
          </div>
        </div>

        <div className="p-3 rounded border border-slate-800 bg-slate-900/60 text-sm">
          <div className="text-slate-400 mb-1">状态</div>
          <div className="font-semibold text-emerald-200">{status}</div>
          <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{message}</div>
        </div>
      </div>

      <div className="flex-1 relative bg-black">
        <canvas ref={canvasRef} className="w-full h-full" width={960} height={720} />
        <div className="absolute top-4 left-4 bg-black/60 px-4 py-2 rounded text-sm">
          群体移动：Camp#1 的单位从 1 → 2
        </div>
      </div>
    </div>
  );
};

export default GroupMovementTester;
