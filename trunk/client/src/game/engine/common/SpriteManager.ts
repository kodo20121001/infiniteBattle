import { Sprite2D } from '../base/Sprite2D';

/**
 * SpriteManager - 精灵管理器
 * 统一管理所有精灵的创建、更新、渲染和销毁
 */
export class SpriteManager {
    private sprites: Map<string, Sprite2D> = new Map();
    private spriteList: Sprite2D[] = [];
    private renderOrder: Sprite2D[] = [];
    private _destroyed = false;

    /**
     * 添加精灵
     */
    add(id: string, sprite: Sprite2D): void {
        if (this.sprites.has(id)) {
            console.warn(`Sprite with id "${id}" already exists`);
            return;
        }
        this.sprites.set(id, sprite);
        this.spriteList.push(sprite);
        this.renderOrder.push(sprite);
    }

    /**
     * 获取精灵
     */
    get(id: string): Sprite2D | undefined {
        return this.sprites.get(id);
    }

    /**
     * 移除精灵
     */
    remove(id: string): boolean {
        const sprite = this.sprites.get(id);
        if (!sprite) return false;

        this.sprites.delete(id);
        
        const listIndex = this.spriteList.indexOf(sprite);
        if (listIndex !== -1) {
            this.spriteList.splice(listIndex, 1);
        }

        const renderIndex = this.renderOrder.indexOf(sprite);
        if (renderIndex !== -1) {
            this.renderOrder.splice(renderIndex, 1);
        }

        return true;
    }

    /**
     * 检查是否存在
     */
    has(id: string): boolean {
        return this.sprites.has(id);
    }

    /**
     * 获取所有精灵
     */
    getAll(): Sprite2D[] {
        return [...this.spriteList];
    }

    /**
     * 按 Z 轴排序渲染顺序
     */
    sortByZIndex(getZIndex: (sprite: Sprite2D) => number): void {
        this.renderOrder.sort((a, b) => getZIndex(a) - getZIndex(b));
    }

    /**
     * 渲染所有精灵（支持 WebGL）
     */
    render(gl: WebGL2RenderingContext): void {
        for (const sprite of this.renderOrder) {
            if (sprite.visible && !sprite.destroyed) {
                sprite.render(gl);
            }
        }
    }

    /**
     * 清除所有精灵
     */
    clear(): void {
        for (const sprite of this.spriteList) {
            sprite.destroy();
        }
        this.sprites.clear();
        this.spriteList = [];
        this.renderOrder = [];
    }

    /**
     * 获取精灵数量
     */
    get count(): number {
        return this.spriteList.length;
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        if (!this._destroyed) {
            this.clear();
            this._destroyed = true;
        }
    }

    get destroyed(): boolean {
        return this._destroyed;
    }
}
