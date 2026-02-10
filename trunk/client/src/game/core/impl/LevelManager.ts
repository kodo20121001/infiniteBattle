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
import { Unit } from './Unit';
import { ActorType } from './Actor';
import { FixedVector3 } from '../base/fixed/FixedVector3';
import { getUnitConfig } from '../config/UnitConfig';
import { getModelConfig } from '../config/ModelConfig';
import type { StatusSystem } from './StatusSystem';

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
  private _scheduledTasks: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private _triggers: LevelTriggerConfig[] = [];
  private _triggerTimers: Map<string, number> = new Map(); // 跟踪 intervalTimer 的经过时间

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

    // 初始化定时器触发器
    this._initializeTimers();

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
    this._triggerTimers.clear();
    this._currentLevelConfig = null;
    this._currentMapConfig = null;
    this._isRunning = false;
  }

  /**
   * 获取场景管理器
   */
  getSceneManager(): SceneManager {
    return this._sceneManager;
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

    let matched = this._triggers.filter(t => t.eventType === eventType);
    
    // 如果有context.triggerId，则只匹配该especific触发器（用于intervalTimer）
    if (context.triggerId !== undefined) {
      matched = matched.filter(t => t.id === context.triggerId);
    }

    for (const trigger of matched) {
      // 暂不处理条件，直接执行动作
      for (const action of trigger.actions || []) {
        this._executeAction(action, { movement, actors, mapConfig: this._currentMapConfig });
      }

      this._emit('triggerFired', { triggerId: trigger.id, eventType });
    }
  }

  private _executeAction(action: LevelActionConfig, ctx: { movement: any; actors: any[]; mapConfig?: any }): void {
    switch (action.type) {
      case 'createUnit':
        this._handleCreateUnit(action.params, ctx);
        break;
      case 'moveUnit':
        this._handleMoveUnit(action.params, ctx);
        break;
      case 'moveCamp':
        this._handleMoveCamp(action.params, ctx);
        break;
      case 'issueCommandToCamp':
        this._handleIssueCommandToCamp(action.params);
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

    // 选取目标单位：优先 actorId，其次 campId/unitId
    let targetActor = actors.find(a => a.id === params.actorId);
    if (!targetActor && params.campId !== undefined) {
      targetActor = actors.find(a => a.campId === params.campId && (!params.unitId || (a instanceof Unit && a.unitId === params.unitId)));
    }
    if (!targetActor) {
      console.warn('[LevelManager] moveUnit: no actor found for selector');
      return;
    }

    const speed = params.speed ?? targetActor.getSpeed?.() ?? 5;
    movement.moveTo({
      actorId: targetActor.actorNo,
      targetX: targetPos.x,
      targetZ: targetPos.y,
      speed,
    });
  }

  private _handleMoveCamp(params: any, ctx: { movement: any; actors: any[] }): void {
    const { movement, actors } = ctx;
    if (!movement) {
      console.warn('[LevelManager] moveCamp: movement system missing');
      return;
    }

    const targetPos = params?.targetPos;
    if (!targetPos || targetPos.x === undefined || targetPos.y === undefined) {
      console.warn('[LevelManager] moveCamp: invalid targetPos');
      return;
    }

    const campId = params?.campId;
    if (campId === undefined) {
      console.warn('[LevelManager] moveCamp: campId missing');
      return;
    }

    const campActors = actors.filter(a => a.campId === campId);
    for (const a of campActors) {
      const speed = params.speed ?? a.getSpeed?.() ?? 5;
      movement.moveTo({
        actorId: a.id,
        targetX: targetPos.x,
        targetZ: targetPos.y,
        speed,
      });
    }
  }

  /**
   * 下达命令给阵营单位
   */
  private _handleIssueCommandToCamp(params: any): void {
    const campId = params?.campId;
    const commandType = params?.commandType;
    const commandParams = params?.commandParams || {};
    const unitStatus = params?.unitStatus || 'Idle';

    if (campId === undefined || !commandType) {
      console.warn('[LevelManager] issueCommandToCamp: campId or commandType missing', { campId, commandType });
      return;
    }

    const commandSystem = this._game.getSystem('unitCommand');
    if (!commandSystem) {
      console.warn('[LevelManager] issueCommandToCamp: unitCommand system not found');
      return;
    }

    const statusSystem = this._game.getSystem<StatusSystem>('status');
    const actors = this._game.getActors();

    // 过滤目标单位：指定阵营 + 指定状态
    const targetActors = actors.filter(actor => {
      if (actor.actorType !== ActorType.Unit) {
        return false;
      }
      if (actor.campId !== campId) {
        return false;
      }
      
      // 检查状态（如果提供了状态系统）
      if (statusSystem) {
        const statusData = statusSystem.get(actor.actorNo);
        if (!statusData) return false;
        
        // 根据状态字符串匹配布尔字段
        switch (unitStatus) {
          case 'Idle':
            if (!statusData.isIdle) return false;
            break;
          case 'Walk':
          case 'Moving':
            if (!statusData.isWalk) return false;
            break;
          case 'Cast':
          case 'Casting':
            if (!statusData.isCast) return false;
            break;
          case 'Die':
          case 'Dead':
            if (!statusData.isDie) return false;
            break;
          default:
            // 如果状态未知，跳过检查
            break;
        }
      }
      
      return true;
    });

    // 下达命令
    for (const actor of targetActors) {
      const command: any = {
        type: commandType,
        ...commandParams
      };
      
      commandSystem.issueCommand(actor.actorNo, command);
    }
  }

  /**
   * 创建单位动作处理
   */
  private _handleCreateUnit(params: any, ctx: { mapConfig?: any }): void {
    let unitId = params?.unitId;
    const campId = params?.campId;
    let positionName = params?.positionName;

    // 将unitId转换为数字
    if (typeof unitId === 'string') {
      unitId = Number(unitId);
    }

    // 将positionName转换为数字（地图点id是数字）
    if (typeof positionName === 'string') {
      positionName = Number(positionName);
    }

    if (unitId === undefined || isNaN(unitId) || campId === undefined) {
      console.warn('[LevelManager] createUnit: unitId or campId missing');
      return;
    }

    const unitConfig = getUnitConfig(unitId);
    if (!unitConfig) {
      console.warn(`[LevelManager] createUnit: Unit config not found: ${unitId}`);
      return;
    }

    const modelConfig = getModelConfig(unitConfig.modelId);
    if (!modelConfig) {
      console.warn(`[LevelManager] createUnit: Model config not found: ${unitConfig.modelId}`);
      return;
    }

    // 获取单位位置（从地图配置中查找）
    let x = 0, y = 0, z = 0;
    if (ctx.mapConfig && ctx.mapConfig.points && positionName !== undefined) {
      const point = ctx.mapConfig.points.find((p: any) => p.id === positionName);
      if (point) {
        x = point.x;
        y = point.y ?? 0;
        z = point.z ?? 0;
      } else {
        console.warn(`[LevelManager] createUnit: Position not found: ${positionName}`);
      }
    }

    // 创建角色
    const actorId = `${campId}_${unitId}_${Date.now()}_${Math.random()}`;
    const position = new FixedVector3(x, y, z);
    const unit = new Unit(
      actorId,
      unitConfig.modelId,
      unitId,  // 单位类型（对应 unit.json 的 id）
      campId,
      position
    );

    // 初始化角色
    unit.init(unitConfig, modelConfig);

    // 添加到游戏
    this._game.addActor(unit);

    // 初始化状态
    const statusSystem = this._game.getSystem<StatusSystem>('status');
    statusSystem?.setIdle(unit.actorNo);
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
   * 初始化定时器触发器
   */
  private _initializeTimers(): void {
    // 为所有 intervalTimer 类型的触发器初始化定时器
    for (const trigger of this._triggers) {
      if (trigger.eventType === 'intervalTimer') {
        const triggerId = String(trigger.id);
        this._triggerTimers.set(triggerId, 0);
      }
    }
  }

  /**
   * 更新关卡（每帧调用）
   */
  update(deltaTime: number): void {
    if (!this._isRunning) return;

    // 处理 intervalTimer 触发器
    for (const trigger of this._triggers) {
      if (trigger.eventType === 'intervalTimer') {
        const triggerId = String(trigger.id);
        const elapsedTime = this._triggerTimers.get(triggerId) ?? 0;
        const intervalSec = trigger.params?.intervalSec ?? 1;
        
        const newElapsedTime = elapsedTime + deltaTime;
        
        // 如果经过的时间超过了间隔，触发并重置计时器
        if (newElapsedTime >= intervalSec) {
          this._runEventTriggers('intervalTimer', { triggerId: trigger.id });
          this._triggerTimers.set(triggerId, 0);
        } else {
          this._triggerTimers.set(triggerId, newElapsedTime);
        }
      }
    }
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
