/**
 * 关卡管理器
 * 封装关卡生命周期管理，包括加载、初始化、事件处理等
 * 类似于 SkillSystem，提供简洁的接口
 */

import type { Game } from './GameSystem';
import type { SceneManager } from './SceneManager';
import type { LevelConfig, LevelTriggerConfig, LevelActionConfig, LevelTriggerEventType } from '../config/LevelConfig';
import type { MapConfig } from './Map';
import { MovementSystem } from './MovementSystem';

/**
 * 关卡事件类型
 */
export type LevelEventType = 
  | 'levelLoaded'      // 关卡加载完成
  | 'levelStarted'     // 关卡开始
  | 'levelPaused'      // 关卡暂停
  | 'levelResumed'     // 关卡恢复
  | 'levelEnded'       // 关卡结束
  | 'triggerFired'     // 触发器触发
  | 'victoryCondition' // 胜利条件满足
  | 'defeatCondition'  // 失败条件满足
  | 'unitSpawned'      // 单位生成
  | 'unitRemoved'      // 单位移除
  | 'customEvent';     // 自定义事件

/**
 * 关卡事件监听器
 */
export type LevelEventListener = (data: any) => void;

/**
 * 关卡管理器
 */
export class LevelManager {
  private _game: Game;
  private _sceneManager: SceneManager;
  private _currentLevelConfig: LevelConfig | null = null;
  private _currentMapConfig: MapConfig | null = null;
  private _isRunning: boolean = false;
  private _listeners: Map<LevelEventType, Set<LevelEventListener>> = new Map();
  private _levelVariables: Map<string, any> = new Map();
  private _scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private _triggers: LevelTriggerConfig[] = [];

  constructor(game: Game, sceneManager: SceneManager) {
    this._game = game;
    this._sceneManager = sceneManager;
  }

  /**
   * 初始化并加载关卡
   * @param levelConfig 关卡配置
   * @param mapConfig 地图配置
   */
  loadLevel(levelConfig: LevelConfig, mapConfig: MapConfig): void {
    // 清理上一个关卡
    this.unloadLevel();

    this._currentLevelConfig = levelConfig;
    this._currentMapConfig = mapConfig;
    this._triggers = levelConfig.triggers || [];

    // 使用 SceneManager 加载场景
    this._sceneManager.loadScene(levelConfig, mapConfig);

    // 初始化关卡变量（可用于触发器和条件检查）
    this._initializeVariables(levelConfig);

    // 触发关卡加载完成事件
    this._emit('levelLoaded', {
      levelId: levelConfig.id,
      levelName: levelConfig.name
    });

    console.log(`[LevelManager] Level loaded: ${levelConfig.name} (ID: ${levelConfig.id})`);
  }

  /**
   * 启动关卡
   */
  startLevel(): void {
    if (this._isRunning) {
      console.warn('[LevelManager] Level is already running');
      return;
    }

    if (!this._currentLevelConfig) {
      console.error('[LevelManager] No level loaded');
      return;
    }

    this._isRunning = true;

    // 运行关卡开始触发器
    this._runEventTriggers('levelStart');

    // 触发关卡开始事件
    this._emit('levelStarted', {
      levelId: this._currentLevelConfig.id
    });

    console.log(`[LevelManager] Level started: ${this._currentLevelConfig.name}`);
  }

  /**
   * 暂停关卡
   */
  pauseLevel(): void {
    if (!this._isRunning) {
      console.warn('[LevelManager] Level is not running');
      return;
    }

    this._isRunning = false;
    this._emit('levelPaused', {
      levelId: this._currentLevelConfig?.id
    });

    console.log('[LevelManager] Level paused');
  }

  /**
   * 恢复关卡
   */
  resumeLevel(): void {
    if (this._isRunning) {
      console.warn('[LevelManager] Level is already running');
      return;
    }

    if (!this._currentLevelConfig) {
      console.error('[LevelManager] No level loaded');
      return;
    }

    this._isRunning = true;
    this._emit('levelResumed', {
      levelId: this._currentLevelConfig.id
    });

    console.log('[LevelManager] Level resumed');
  }

  /**
   * 结束关卡
   * @param reason 结束原因 ('victory' | 'defeat' | 'quit')
   * @param data 额外数据
   */
  endLevel(reason: 'victory' | 'defeat' | 'quit', data?: any): void {
    if (!this._isRunning) {
      console.warn('[LevelManager] Level is not running');
      return;
    }

    this._isRunning = false;

    // 清理计划任务
    this._clearScheduledTasks();

    // 触发对应事件
    if (reason === 'victory') {
      this._emit('victoryCondition', {
        levelId: this._currentLevelConfig?.id,
        ...data
      });
    } else if (reason === 'defeat') {
      this._emit('defeatCondition', {
        levelId: this._currentLevelConfig?.id,
        ...data
      });
    }

    this._emit('levelEnded', {
      levelId: this._currentLevelConfig?.id,
      reason,
      ...data
    });

    console.log(`[LevelManager] Level ended: ${reason}`);
  }

  /**
   * 卸载关卡
   */
  unloadLevel(): void {
    this._clearScheduledTasks();
    this._clearListeners();
    this._levelVariables.clear();
    this._triggers = [];
    this._currentLevelConfig = null;
    this._currentMapConfig = null;
    this._isRunning = false;
  }

  /**
   * 订阅关卡事件
   * @param eventType 事件类型
   * @param listener 监听器
   */
  on(eventType: LevelEventType, listener: LevelEventListener): () => void {
    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }

    this._listeners.get(eventType)!.add(listener);

    // 返回取消订阅函数
    return () => {
      this._listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * 取消订阅关卡事件
   * @param eventType 事件类型
   * @param listener 监听器
   */
  off(eventType: LevelEventType, listener: LevelEventListener): void {
    this._listeners.get(eventType)?.delete(listener);
  }

  /**
   * 获取关卡变量
   * @param key 变量名
   * @returns 变量值
   */
  getVariable(key: string): any {
    return this._levelVariables.get(key);
  }

  /**
   * 设置关卡变量
   * @param key 变量名
   * @param value 变量值
   */
  setVariable(key: string, value: any): void {
    this._levelVariables.set(key, value);
    
    // 触发自定义事件（变量更改）
    this._emit('customEvent', {
      type: 'variableChanged',
      key,
      value
    });
  }

  /**
   * 获取当前关卡配置
   */
  getCurrentLevelConfig(): LevelConfig | null {
    return this._currentLevelConfig;
  }

  /**
   * 获取当前地图配置
   */
  getCurrentMapConfig(): MapConfig | null {
    return this._currentMapConfig;
  }

  /**
   * 关卡是否运行中
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 在指定延迟后执行任务
   * @param taskId 任务 ID
   * @param callback 回调函数
   * @param delaySeconds 延迟时间（秒）
   */
  scheduleTask(taskId: string, callback: () => void, delaySeconds: number): void {
    // 取消同名的任务
    if (this._scheduledTasks.has(taskId)) {
      clearTimeout(this._scheduledTasks.get(taskId));
    }

    const timeout = setTimeout(() => {
      callback();
      this._scheduledTasks.delete(taskId);
    }, delaySeconds * 1000);

    this._scheduledTasks.set(taskId, timeout);
  }

  /**
   * 取消计划任务
   * @param taskId 任务 ID
   */
  cancelTask(taskId: string): void {
    const timeout = this._scheduledTasks.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this._scheduledTasks.delete(taskId);
    }
  }

  /**
   * 初始化关卡变量（从配置中）
   */
  private _initializeVariables(levelConfig: LevelConfig): void {
    // 初始化资源
    if (levelConfig.initialResources) {
      for (const [key, value] of Object.entries(levelConfig.initialResources)) {
        this._levelVariables.set(key, value);
      }
    }

    // 初始化其他关卡状态
    this._levelVariables.set('unitCount', levelConfig.startUnits?.length || 0);
    this._levelVariables.set('elapsedTime', 0);
  }

  /**
   * 初始化触发器（未来实现）
   */
  private _runEventTriggers(eventType: LevelTriggerEventType, context: any = {}): void {
    if (!this._currentLevelConfig || this._triggers.length === 0) return;

    const movement = this._game.getSystem('movement');
    const actors = this._game.getActors();

    const matched = this._triggers.filter(t => t.eventType === eventType);
    for (const trigger of matched) {
      // 暂不处理条件，直接执行动作
      for (const action of trigger.actions || []) {
        this._executeAction(action, { movement, actors });
      }

      this._emit('triggerFired', { triggerId: trigger.id, eventType });
    }
  }

  private _executeAction(action: LevelActionConfig, ctx: { movement: any; actors: any[] }): void {
    switch (action.type) {
      case 'moveUnit':
        this._handleMoveUnit(action.params, ctx);
        break;
      default:
        console.warn(`[LevelManager] Unsupported action type: ${action.type}`);
        break;
    }
  }

  private _handleMoveUnit(params: any, ctx: { movement: any; actors: any[] }): void {
    const { movement, actors } = ctx;
    if (!movement) {
      console.warn('[LevelManager] moveUnit: movement system missing');
      return;
    }

    const targetPos = params?.targetPos;
    if (!targetPos || targetPos.x === undefined || targetPos.y === undefined) {
      console.warn('[LevelManager] moveUnit: invalid targetPos');
      return;
    }

    // 选取目标单位：优先 actorId，其次 campId/unitType
    let targetActor = actors.find(a => a.id === params.actorId);
    if (!targetActor && params.campId !== undefined) {
      targetActor = actors.find(a => a.campId === params.campId && (!params.unitType || a.unitType === params.unitType));
    }
    if (!targetActor) {
      console.warn('[LevelManager] moveUnit: no actor found for selector');
      return;
    }

    const speed = params.speed ?? targetActor.getSpeed?.() ?? 5;
    movement.moveTo({
      actorId: targetActor.id,
      targetX: targetPos.x,
      targetZ: targetPos.y,
      speed,
    });
  }

  /**
   * 触发事件
   */
  private _emit(eventType: LevelEventType, data: any): void {
    const listeners = this._listeners.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[LevelManager] Error in listener for event ${eventType}:`, err);
        }
      }
    }
  }

  /**
   * 清理计划任务
   */
  private _clearScheduledTasks(): void {
    for (const timeout of this._scheduledTasks.values()) {
      clearTimeout(timeout);
    }
    this._scheduledTasks.clear();
  }

  /**
   * 清理事件监听器
   */
  private _clearListeners(): void {
    this._listeners.clear();
  }

  /**
   * 销毁关卡管理器
   */
  destroy(): void {
    this.unloadLevel();
  }
}
