import React, { useEffect, useState } from 'react';
import AbilityFields from './BuildingEditor/AbilityFields';
import BuildingDemoPreview from './BuildingEditor/BuildingDemoPreview';
import OccupiedCellsEditor from './BuildingEditor/OccupiedCellsEditor';
import { buildingTemplates, createBuildingFromTemplate } from './BuildingEditor/templates';

const fetchBuildingConfigs = async () => {
  const res = await fetch('/config/building.json');
  if (!res.ok) throw new Error('加载 building.json 失败');
  return res.json();
};

const fetchAbilityDefs = async () => {
  const res = await fetch('/config/building_ability.json');
  if (!res.ok) throw new Error('加载 building_ability.json 失败');
  return res.json();
};

/**
 * 建筑编辑器主组件
 * 基于魔兽争霸III的组件化设计
 */
const BuildingEditor = () => {
  const [buildings, setBuildings] = useState([]);
  const [abilityDefs, setAbilityDefs] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [currentBuilding, setCurrentBuilding] = useState(null);
  const [status, setStatus] = useState('loading');
  const [activeTab, setActiveTab] = useState('base'); // base | abilities
  const [selectedAbilityIndex, setSelectedAbilityIndex] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const [showCellsEditor, setShowCellsEditor] = useState(false);
  const [dirHandle, setDirHandle] = useState(null);
  const [savePathName, setSavePathName] = useState('');

  // 加载配置
  useEffect(() => {
    Promise.all([fetchBuildingConfigs(), fetchAbilityDefs()])
      .then(([buildingData, abilityData]) => {
        setBuildings(buildingData || []);
        setAbilityDefs(abilityData || {});
        if (buildingData && buildingData.length > 0) {
          setSelectedId(buildingData[0].id);
          setCurrentBuilding(structuredClone(buildingData[0]));
        }
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');
      });
  }, []);

  // 当选择变化时更新当前建筑
  useEffect(() => {
    if (!selectedId) return;
    const found = buildings.find((b) => b.id === selectedId);
    if (found) {
      setCurrentBuilding(structuredClone(found));
      setSelectedAbilityIndex(null);
    }
  }, [selectedId, buildings]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  // 保存配置
  const saveConfigs = async () => {
    try {
      if (!currentBuilding) return;
      const merged = buildings.map((b) => (b.id === currentBuilding.id ? currentBuilding : b));
      setBuildings(merged);

      let handle = dirHandle;
      if (handle) {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          const req = await handle.requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') handle = null;
        }
      }
      if (!handle) {
        handle = await window.showDirectoryPicker();
        setDirHandle(handle);
        let fullPath = '';
        try {
          const pathArray = await handle.getFullPath();
          fullPath = '/' + pathArray.join('/');
        } catch (e) {
          fullPath = handle.name;
        }
        setSavePathName(fullPath);
      }

      const fileHandle = await handle.getFileHandle('building.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(merged, null, 2));
      await writable.close();

      showToast('✅ 已保存 building.json');
    } catch (err) {
      showToast('✗ 保存失败: ' + err.message);
    }
  };

  // 新建建筑（从模板）
  const handleCreateFromTemplate = (templateId) => {
    const newBuilding = createBuildingFromTemplate(templateId);
    setBuildings([...buildings, newBuilding]);
    setSelectedId(newBuilding.id);
    setCurrentBuilding(newBuilding);
    setShowTemplateModal(false);
    showToast(`✅ 已创建建筑: ${newBuilding.name}`);
  };

  // 删除建筑
  const handleDelete = () => {
    if (!currentBuilding) return;
    if (!confirm(`确定要删除 "${currentBuilding.name}" 吗？`)) return;
    const newBuildings = buildings.filter((b) => b.id !== currentBuilding.id);
    setBuildings(newBuildings);
    setSelectedId(newBuildings[0]?.id || null);
    showToast('✅ 已删除建筑');
  };

  // 添加能力
  const handleAddAbility = (abilityType) => {
    if (!currentBuilding) return;
    const abilityDef = abilityDefs[abilityType];
    if (!abilityDef) return;

    const newAbility = {
      type: abilityType,
      config: {}
    };

    // 初始化默认值
    abilityDef.fields.forEach((field) => {
      newAbility.config[field.key] = field.default;
    });

    const newBuilding = structuredClone(currentBuilding);
    newBuilding.abilities = newBuilding.abilities || [];
    newBuilding.abilities.push(newAbility);
    setCurrentBuilding(newBuilding);
    setSelectedAbilityIndex(newBuilding.abilities.length - 1);
  };

  // 删除能力
  const handleRemoveAbility = (index) => {
    if (!currentBuilding) return;
    const newBuilding = structuredClone(currentBuilding);
    newBuilding.abilities.splice(index, 1);
    setCurrentBuilding(newBuilding);
    if (selectedAbilityIndex === index) {
      setSelectedAbilityIndex(null);
    }
  };

  // 更新能力配置
  const handleAbilityConfigChange = (index, newConfig) => {
    if (!currentBuilding) return;
    const newBuilding = structuredClone(currentBuilding);
    newBuilding.abilities[index].config = newConfig;
    setCurrentBuilding(newBuilding);
  };

  // 更新基础数据
  const handleBaseDataChange = (path, value) => {
    if (!currentBuilding) return;
    const newBuilding = structuredClone(currentBuilding);
    const keys = path.split('.');
    let obj = newBuilding;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setCurrentBuilding(newBuilding);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        加载中...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-red-500">
        加载配置失败
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* 左侧：建筑列表 */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 space-y-2">
          <h1 className="text-xl font-bold mb-3">建筑编辑器</h1>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
          >
            + 新建建筑
          </button>
          <button
            onClick={saveConfigs}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            💾 保存 building.json
          </button>
          <button
            onClick={async () => {
              try {
                const handle = await window.showDirectoryPicker();
                setDirHandle(handle);
                let fullPath = '';
                try {
                  const pathArray = await handle.getFullPath();
                  fullPath = '/' + pathArray.join('/');
                } catch (e) {
                  fullPath = handle.name;
                }
                setSavePathName(fullPath);
              } catch (err) {
                if (err?.name === 'AbortError') return;
                showToast('✗ 选择路径失败: ' + err.message);
              }
            }}
            title={savePathName ? `当前路径: ${savePathName}` : '选择保存路径'}
            className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm truncate"
          >
            {savePathName ? `📁 ${savePathName}` : '📁 选择保存路径'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <label className="block text-xs text-gray-400 mb-2">选择建筑</label>
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
          >
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={handleDelete}
            disabled={!currentBuilding}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ 删除当前
          </button>
          <button
            onClick={() => setDemoOpen(true)}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
          >
            🎮 预览演示
          </button>
        </div>
      </div>

      {/* 中间：编辑区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold">{currentBuilding?.name || '未选择'}</h2>
            <span className="text-xs text-gray-500">{currentBuilding?.id}</span>
          </div>
          <div className="flex items-center space-x-2" />
        </div>

        {/* 标签页 */}
        <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 space-x-1">
          <button
            onClick={() => setActiveTab('base')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              activeTab === 'base'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📊 基础属性
          </button>
          <button
            onClick={() => setActiveTab('abilities')}
            className={`px-4 py-2 rounded text-sm font-medium ${
              activeTab === 'abilities'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚙️ 能力系统
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'base' && currentBuilding && (
            <div className="max-w-2xl space-y-6">
              {/* 基本信息 */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-white mb-3">基本信息</h3>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ID</label>
                  <input
                    type="text"
                    value={currentBuilding.id}
                    onChange={(e) => handleBaseDataChange('id', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">名称</label>
                  <input
                    type="text"
                    value={currentBuilding.name}
                    onChange={(e) => handleBaseDataChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">描述</label>
                  <textarea
                    value={currentBuilding.description || ''}
                    onChange={(e) => handleBaseDataChange('description', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">模型ID (关联model.json)</label>
                  <input
                    type="text"
                    value={currentBuilding.modelId || ''}
                    onChange={(e) => handleBaseDataChange('modelId', e.target.value)}
                    placeholder="例: barracks, arrow_tower"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
              </div>

              {/* 战斗属性 */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-white mb-3">战斗属性</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">生命值</label>
                    <input
                      type="number"
                      value={currentBuilding.baseData?.hp || 0}
                      onChange={(e) => handleBaseDataChange('baseData.hp', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">护甲</label>
                    <input
                      type="number"
                      value={currentBuilding.baseData?.armor || 0}
                      onChange={(e) => handleBaseDataChange('baseData.armor', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">护甲类型</label>
                    <select
                      value={currentBuilding.baseData?.armorType || 'light'}
                      onChange={(e) => handleBaseDataChange('baseData.armorType', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    >
                      <option value="light">Light</option>
                      <option value="medium">Medium</option>
                      <option value="heavy">Heavy</option>
                      <option value="fortified">Fortified</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 建造信息 */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-white mb-3">建造信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">金币消耗</label>
                    <input
                      type="number"
                      value={currentBuilding.baseData?.cost?.gold || 0}
                      onChange={(e) => handleBaseDataChange('baseData.cost.gold', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">木材消耗</label>
                    <input
                      type="number"
                      value={currentBuilding.baseData?.cost?.wood || 0}
                      onChange={(e) => handleBaseDataChange('baseData.cost.wood', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">建造时间(秒)</label>
                    <input
                      type="number"
                      value={currentBuilding.baseData?.buildTime || 0}
                      onChange={(e) => handleBaseDataChange('baseData.buildTime', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 占用格子 */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white">占用格子</h3>
                  <button
                    onClick={() => setShowCellsEditor(true)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                  >
                    打开格子编辑器
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  格子坐标相对于建筑中心点(0,0)，格式: [x, y]
                </p>
                <div className="space-y-2">
                  {(currentBuilding.baseData?.occupiedCells || []).map((cell, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-gray-500 text-sm w-8">#{index + 1}</span>
                      <input
                        type="number"
                        value={cell[0]}
                        onChange={(e) => {
                          const newCells = [...(currentBuilding.baseData?.occupiedCells || [])];
                          newCells[index] = [parseInt(e.target.value) || 0, cell[1]];
                          handleBaseDataChange('baseData.occupiedCells', newCells);
                        }}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        placeholder="X"
                      />
                      <input
                        type="number"
                        value={cell[1]}
                        onChange={(e) => {
                          const newCells = [...(currentBuilding.baseData?.occupiedCells || [])];
                          newCells[index] = [cell[0], parseInt(e.target.value) || 0];
                          handleBaseDataChange('baseData.occupiedCells', newCells);
                        }}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                        placeholder="Y"
                      />
                      <button
                        onClick={() => {
                          const newCells = (currentBuilding.baseData?.occupiedCells || []).filter((_, i) => i !== index);
                          handleBaseDataChange('baseData.occupiedCells', newCells);
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newCells = [...(currentBuilding.baseData?.occupiedCells || []), [0, 0]];
                      handleBaseDataChange('baseData.occupiedCells', newCells);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                  >
                    + 添加格子
                  </button>
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <button
                      onClick={() => {
                        // 快速生成 2x2 格子
                        handleBaseDataChange('baseData.occupiedCells', [
                          [-1, -1], [0, -1],
                          [-1, 0], [0, 0]
                        ]);
                      }}
                      className="mr-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                    >
                      2x2
                    </button>
                    <button
                      onClick={() => {
                        // 快速生成 3x3 格子
                        handleBaseDataChange('baseData.occupiedCells', [
                          [-1, -1], [0, -1], [1, -1],
                          [-1, 0], [0, 0], [1, 0],
                          [-1, 1], [0, 1], [1, 1]
                        ]);
                      }}
                      className="mr-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                    >
                      3x3
                    </button>
                    <button
                      onClick={() => {
                        // 快速生成 4x4 格子
                        handleBaseDataChange('baseData.occupiedCells', [
                          [-2, -2], [-1, -2], [0, -2], [1, -2],
                          [-2, -1], [-1, -1], [0, -1], [1, -1],
                          [-2, 0], [-1, 0], [0, 0], [1, 0],
                          [-2, 1], [-1, 1], [0, 1], [1, 1]
                        ]);
                      }}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                    >
                      4x4
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'abilities' && currentBuilding && (
            <div className="grid grid-cols-2 gap-6">
              {/* 左侧：能力列表 */}
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white">已挂载能力</h3>
                    <div className="relative group">
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                        + 添加能力
                      </button>
                      <div className="absolute right-0 mt-1 w-56 bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="p-2 max-h-96 overflow-y-auto">
                          {Object.entries(abilityDefs).map(([type, def]) => (
                            <button
                              key={type}
                              onClick={() => handleAddAbility(type)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center space-x-2"
                            >
                              <span className="text-lg">{def.icon}</span>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">{def.name}</div>
                                <div className="text-xs text-gray-500">{def.description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {currentBuilding.abilities?.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        暂无能力，点击上方添加
                      </p>
                    ) : (
                      currentBuilding.abilities?.map((ability, index) => {
                        const abilityDef = abilityDefs[ability.type];
                        const isSelected = selectedAbilityIndex === index;
                        return (
                          <div
                            key={index}
                            onClick={() => setSelectedAbilityIndex(index)}
                            className={`p-3 rounded border cursor-pointer ${
                              isSelected
                                ? 'bg-gray-800 border-blue-500'
                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{abilityDef?.icon || '⚙️'}</span>
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {abilityDef?.name || ability.type}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {abilityDef?.description}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAbility(index);
                                }}
                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 右侧：能力配置 */}
              <div>
                {selectedAbilityIndex !== null && currentBuilding.abilities?.[selectedAbilityIndex] ? (
                  <div className="bg-gray-900 rounded-lg p-4">
                    <AbilityFields
                      abilityDef={abilityDefs[currentBuilding.abilities[selectedAbilityIndex].type]}
                      config={currentBuilding.abilities[selectedAbilityIndex].config}
                      onChange={(newConfig) => handleAbilityConfigChange(selectedAbilityIndex, newConfig)}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-lg p-4 text-center text-gray-500">
                    ← 选择一个能力以编辑配置
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* 模板选择模态框 */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">选择建筑模板</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {buildingTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleCreateFromTemplate(template.id)}
                  className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-3xl">{template.icon}</span>
                    <div className="font-bold text-white">{template.name}</div>
                  </div>
                  <p className="text-sm text-gray-400">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg shadow-lg text-white animate-fade-in">
          {toast}
        </div>
      )}

      {/* 演示预览 */}
      <BuildingDemoPreview
        buildingConfig={currentBuilding}
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
      />

      {/* 占用格子编辑器 */}
      <OccupiedCellsEditor
        isOpen={showCellsEditor}
        occupiedCells={currentBuilding?.baseData?.occupiedCells || []}
        onApply={(cells) => {
          handleBaseDataChange('baseData.occupiedCells', cells);
          setShowCellsEditor(false);
        }}
        onClose={() => setShowCellsEditor(false)}
      />
    </div>
  );
};

export default BuildingEditor;
