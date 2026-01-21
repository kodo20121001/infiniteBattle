import React, { useEffect, useRef, useState } from 'react';

const ImageTool = ({ mapData, setMapData, selectedNodeId, setSelectedNodeId }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const fileInputRef = useRef(null);
  const dragSourceIdRef = useRef(null); // 用于树节点拖拽

  useEffect(() => {
    if (selectedNodeId == null) {
      setSelectedNode(null);
      return;
    }
    const findNode = (nodes, id) => {
      if (!nodes) return null;
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
      }
      return null;
    };
    const found = findNode(mapData.imageTree, selectedNodeId);
    setSelectedNode(found);
  }, [selectedNodeId, mapData.imageTree]);

  const updateNode = (id, updates) => {
    const updateHelper = (nodes) => {
      if (!nodes) return false;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          nodes[i] = { ...nodes[i], ...updates };
          return true;
        }
        if (updateHelper(nodes[i].children)) return true;
      }
      return false;
    };
    setMapData((p) => {
      const next = structuredClone(p);
      updateHelper(next.imageTree);
      return next;
    });
  };

  const deleteNode = (id) => {
    const deleteHelper = (nodes) => {
      if (!nodes) return false;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          nodes.splice(i, 1);
          return true;
        }
        if (deleteHelper(nodes[i].children)) return true;
      }
      return false;
    };
    setMapData((p) => {
      const next = structuredClone(p);
      deleteHelper(next.imageTree);
      return next;
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;
    const path = `/map/${file.name}`;
    updateNode(selectedNode.id, { path });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getMaxNodeId = (nodes) => {
    if (!nodes) return 0;
    let max = 0;
    for (const n of nodes) {
      max = Math.max(max, Number(n.id) || 0, getMaxNodeId(n.children));
    }
    return max;
  };

  const moveNode = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    setMapData((p) => {
      const next = structuredClone(p);
      let removed = null;
      const removeHelper = (nodes) => {
        if (!nodes) return false;
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === sourceId) {
            removed = nodes.splice(i, 1)[0];
            return true;
          }
          if (removeHelper(nodes[i].children)) return true;
        }
        return false;
      };
      removeHelper(next.imageTree);
      if (!removed) return p;

      if (targetId == null) {
        next.imageTree.push(removed);
      } else {
        const findHelper = (nodes) => {
          if (!nodes) return null;
          for (const n of nodes) {
            if (n.id === targetId) return n;
            const found = findHelper(n.children);
            if (found) return found;
          }
          return null;
        };
        const target = findHelper(next.imageTree);
        if (!target) {
          next.imageTree.push(removed);
        } else {
          target.children = target.children ?? [];
          target.children.push(removed);
        }
      }
      return next;
    });
    setSelectedNodeId(sourceId);
  };

  const TreeItem = ({ node, depth = 0 }) => {
    const isCollapsed = collapsedIds.has(node.id);
    return (
      <div>
        <div className="flex items-center mb-1" style={{ paddingLeft: `${depth * 12}px` }}>
          <button
            onClick={() => {
              setCollapsedIds((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              });
            }}
            className="w-4 text-center px-0 text-[10px] text-slate-300 flex-shrink-0"
            title={isCollapsed ? '展开' : '收起'}
          >
            {node.children?.length ? (isCollapsed ? '▶' : '▼') : '•'}
          </button>
          <button
            draggable
            onDragStart={(e) => {
              dragSourceIdRef.current = node.id;
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const sourceId = dragSourceIdRef.current;
              dragSourceIdRef.current = null;
              if (sourceId && sourceId !== node.id) {
                moveNode(sourceId, node.id);
              }
            }}
            onDragEnd={() => {
              dragSourceIdRef.current = null;
            }}
            onClick={() => setSelectedNodeId(node.id)}
            className={`flex-1 text-left px-2 py-1 text-xs rounded border transition-colors ${
              selectedNodeId === node.id ? 'border-blue-500 bg-blue-600/40' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
            }`}
          >
            📦 {node.name}
          </button>
        </div>
        {!isCollapsed && node.children?.map((child) => (
          <TreeItem key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="text-sm font-semibold mb-2">图片层级</div>
        <button
          onClick={() => {
            const newId = getMaxNodeId(mapData.imageTree ?? []) + 1;
            const newNode = { id: newId, name: `image-${newId}`, x: 0, y: 0 };
            setMapData((p) => ({ ...p, imageTree: [...(p.imageTree ?? []), newNode] }));
          }}
          className="w-full mb-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs border border-green-500"
        >
          新增根节点
        </button>
        <div
          className="flex-1 overflow-y-auto pr-1 space-y-0.5 border border-slate-700 rounded bg-slate-900/50 p-2 mb-3"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const sourceId = dragSourceIdRef.current;
            dragSourceIdRef.current = null;
            if (sourceId) {
              moveNode(sourceId, null);
            }
          }}
        >
          {(mapData.imageTree ?? []).map((node) => (
            <TreeItem key={node.id} node={node} />
          ))}
          <div className="mt-2 h-10 rounded border border-dashed border-slate-700 text-slate-400 text-xs flex items-center justify-center">
            拖到此处放到根
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-800/60 rounded border border-slate-700 text-xs">
          <div className="text-sm font-semibold sticky top-0 bg-slate-800 py-1 mb-2">属性：{selectedNode.name}</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-slate-400 text-[10px]">名称</div>
              <input
                value={selectedNode.name ?? ''}
                onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">路径</div>
              <div className="flex gap-1 mt-1">
                <input
                  value={selectedNode.path ?? ''}
                  onChange={(e) => updateNode(selectedNode.id, { path: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                />
                <button
                  onClick={openFileDialog}
                  className="px-2 bg-slate-700 hover:bg-slate-600 rounded border border-slate-500 text-[11px]"
                >
                  选图
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-slate-400 text-[10px]">X</div>
              <input
                type="number"
                value={selectedNode.x ?? 0}
                onChange={(e) => updateNode(selectedNode.id, { x: Number(e.target.value) || 0 })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">Y</div>
              <input
                type="number"
                value={selectedNode.y ?? 0}
                onChange={(e) => updateNode(selectedNode.id, { y: Number(e.target.value) || 0 })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">宽度</div>
              <input
                type="number"
                value={selectedNode.width ?? 0}
                onChange={(e) => updateNode(selectedNode.id, { width: Number(e.target.value) || 0 })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">高度</div>
              <input
                type="number"
                value={selectedNode.height ?? 0}
                onChange={(e) => updateNode(selectedNode.id, { height: Number(e.target.value) || 0 })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-slate-400 text-[10px]">旋转</div>
              <input
                type="number"
                value={selectedNode.rotation ?? 0}
                onChange={(e) => updateNode(selectedNode.id, { rotation: Number(e.target.value) || 0 })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">缩放</div>
              <input
                type="number"
                value={selectedNode.scale ?? 1}
                onChange={(e) => updateNode(selectedNode.id, { scale: Number(e.target.value) || 1 })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">透明度</div>
              <input
                type="number"
                value={selectedNode.alpha ?? 1}
                onChange={(e) => updateNode(selectedNode.id, { alpha: Number(e.target.value) || 0 })}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedNode.visible ?? true}
              onChange={(e) => updateNode(selectedNode.id, { visible: e.target.checked })}
            />
            <span className="text-slate-300 text-xs">可见</span>
          </div>
          <button
            onClick={() => deleteNode(selectedNode.id)}
            className="w-full py-1 bg-red-600 hover:bg-red-700 rounded border border-red-500 text-xs"
          >
            删除节点
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default ImageTool;
