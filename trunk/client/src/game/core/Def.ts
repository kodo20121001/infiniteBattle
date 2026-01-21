import FixedMaths from "./base/fixed/FixedMaths"
import { FixedVector2 } from "./base/fixed/FixedVector2"

export class ActorType
{
    static map = 1
    static hero = 2
    static soldier = 3
    static building = 4
    static bullet = 5
}

export class Relation
{
    static friend = 1
    static enemy = 2
}

export const one_frame_time = 1 / 30

export const time_out_time = one_frame_time * 2

export const sync_frame = 2 / one_frame_time;

//地图格子尺寸
export const map_grid_size = 0.5

//位移步长
export const unit_move_step = 0.3

//位移最小距离
export const unit_move_min_step = 0.01

//单位位移阻挡后原地踏步时间
export const unit_move_block_wait_time = 0.2

//索敌时间间隔
export const unit_search_target_interval_time = 0.5;

//追击目标时间间隔
export const unit_chase_target_interval_time = 0.5;

//单次追击时间
export const unit_chase_target_time_one_times = 0.5;

//技能默认移动到这个距离的位置
export const unit_skill_pos_ratio = 0.8;

//移动到技能位置的最小距离
export const unit_move_to_skill_pos_min_dis = 0.2;

//尝试放技能时间间隔
export const unit_try_cast_skill_interval_time = 0.1;

//转向目标时间间隔
export const unit_turn_to_target_interval_time = 0.5;

export const unit_avoid_block_walk_time = 0.3;

export const bullet_move_step = 0.3

//位移最小距离
export const bullet_move_min_step = 0.01

export function PositionToGrid(position) : FixedVector2
{
    let posX = position.x / map_grid_size;
    let posY = position.y / map_grid_size;
    posX = posX < 0 ? Math.ceil(posX) : Math.floor(posX)
    posY = posY < 0 ? Math.ceil(posY) : Math.floor(posY)
    return new FixedVector2(posX, posY)
}

export function GridToPosition(grid) : FixedVector2
{
    return new FixedVector2(grid.x * map_grid_size, grid.y * map_grid_size)
}

export class CreateContext {
    actorType: number;
    unitType: number;
    camp: number;
    pos: FixedVector2;
    angleY: number;
    scale: number;
    group: number;
    offset?;
    config?;

    attrs;

    // hero
    skillSlotId?: number;
    skills?: any[];
    passiveSkills?: any[];
    
    // soldier
    soldierType?: number;

    // building
    grids?;
    buildingId?: number;
    radius?: number;
    level?: number;

    // bullet
    createActor?;
    targetPos?;
    hitY?;
    y?;
    res?;
    trackingUnit?;
    isTracking?;
    tureDamage?:number[]
}

export class AttackInfo {
    hitConfig: any
    ratio: number
    attacker: any
    tureDamage?: number[]
}

