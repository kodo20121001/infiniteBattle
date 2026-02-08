import React from 'react';

/**
 * 渲染单个字段编辑器
 */
const FieldEditor = ({ field, value, onChange }) => {
  const handleChange = (newValue) => {
    onChange(field.key, newValue);
  };

  const renderInput = () => {
    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value ?? field.default}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          />
        );

      case 'string':
        return (
          <input
            type="text"
            value={value ?? field.default}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.description}
            className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value ?? field.default}
              onChange={(e) => handleChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">启用</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={value ?? field.default}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiSelect':
        const selectedValues = value ?? field.default ?? [];
        return (
          <div className="space-y-1">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    handleChange(newValues);
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'array':
        const arrayValue = value ?? field.default ?? [];
        return (
          <div className="space-y-2">
            {arrayValue.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                {field.itemType === 'object' ? (
                  <input
                    type="text"
                    value={typeof item === 'string' ? item : JSON.stringify(item)}
                    onChange={(e) => {
                      try {
                        const newItem = JSON.parse(e.target.value);
                        const newArray = [...arrayValue];
                        newArray[index] = newItem;
                        handleChange(newArray);
                      } catch {
                        // 保持原样
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newArray = [...arrayValue];
                      newArray[index] = e.target.value;
                      handleChange(newArray);
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                )}
                <button
                  onClick={() => {
                    const newArray = arrayValue.filter((_, i) => i !== index);
                    handleChange(newArray);
                  }}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                >
                  删除
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newItem = field.itemType === 'object' ? {} : '';
                handleChange([...arrayValue, newItem]);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
            >
              + 添加项
            </button>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value ?? field.default ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200">{field.label}</label>
        {field.description && (
          <span className="text-xs text-gray-500" title={field.description}>
            ❓
          </span>
        )}
      </div>
      {renderInput()}
      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
};

/**
 * 能力字段编辑器
 * @param {Object} props
 * @param {Object} props.abilityDef - 能力定义（来自 building_ability.json）
 * @param {Object} props.config - 当前配置值
 * @param {Function} props.onChange - 配置变化回调
 */
const AbilityFields = ({ abilityDef, config, onChange }) => {
  if (!abilityDef || !abilityDef.fields) {
    return (
      <div className="p-4 text-center text-gray-500">
        未找到能力定义
      </div>
    );
  }

  const handleFieldChange = (fieldKey, value) => {
    onChange({
      ...config,
      [fieldKey]: value
    });
  };

  return (
    <div className="space-y-4">
      {/* 能力信息 */}
      <div className="flex items-center space-x-3 pb-3 border-b border-gray-700">
        <span className="text-2xl">{abilityDef.icon || '⚙️'}</span>
        <div>
          <h3 className="font-bold text-white">{abilityDef.name}</h3>
          <p className="text-sm text-gray-400">{abilityDef.description}</p>
        </div>
      </div>

      {/* 字段编辑器 */}
      <div className="space-y-4">
        {abilityDef.fields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={config?.[field.key]}
            onChange={handleFieldChange}
          />
        ))}
      </div>
    </div>
  );
};

export default AbilityFields;
