
import { Runtime } from "../../Runtime";
import { FixedVector2 } from "../../base/fixed/FixedVector2";
import { Actor } from "./Actor";
import { getMapConfig, MapConfig } from "../../config/MapConfig";
import type { MapPath, MapPoint } from "../../config/MapConfig";

export class GameMap extends Actor
{
    private mapId: number = 1; // 地图ID，写死为1
    private mapConfig: MapConfig | undefined;
    positions = {}
    paths = {}
    atkPaths = []
    defPaths = []
    canMovePaths = []
    obstacles = []

    StartLogic()
    {
        Runtime.map = this

        // 从配置中加载地图数据
        this.loadMapConfig();

        super.StartLogic()
    }

    /**
     * 从配置中加载地图数据
     */
    private loadMapConfig() {
        this.mapConfig = getMapConfig(this.mapId);
        if (!this.mapConfig) {
            console.error(`地图配置 ID ${this.mapId} 未找到`);
            return;
        }

        // 从配置加载路径数据
        this.loadPaths();

        // 从配置加载位置数据
        this.loadPositions();
    }

    /**
     * 从配置加载路径数据
     */
    private loadPaths() {
        if (!this.mapConfig || !this.mapConfig.paths) {
            console.warn('地图配置中没有路径数据');
            return;
        }

        // 按路径ID分组
        for (const mapPath of this.mapConfig.paths) {
            if (!this.paths[mapPath.id]) {
                this.paths[mapPath.id] = {};
            }
            
            // 将路径点转换为 FixedVector2
            const pathPoints = mapPath.points.map(point => 
                new FixedVector2(point.x, point.y)
            );

            // 使用路径名称作为子键（如果没有名称则使用0）
            const pathKey = mapPath.name || '0';
            this.paths[mapPath.id][pathKey] = pathPoints;
        }

        console.log('加载路径数据:', this.paths);
    }

    /**
     * 从配置加载位置数据
     */
    private loadPositions() {
        if (!this.mapConfig || !this.mapConfig.points) {
            console.warn('地图配置中没有位置数据');
            this.positions = {};
            return;
        }

        this.positions = {};

        // 将点转换为位置数据
        for (const point of this.mapConfig.points) {
            const pointId = point.id ?? 0;
            
            // 以点ID作为键，存储为 region 1 的位置
            if (!this.positions[1]) {
                this.positions[1] = {};
            }
            
            this.positions[1][pointId] = new FixedVector2(point.x, point.y);
        }

        console.log('加载位置数据:', this.positions);
    }
    

    GetPath(pathName)
    {
        return this.paths[pathName]
    }

    GetPathPosition(pathName, pathIndex)
    {
        return {pos: this.paths[pathName][pathIndex].clone(), angleY: 0}
    }

    GetPosition(region, positionName)
    {
        return {pos: this.positions[region][positionName].clone(), angleY: 0}
    }
}
