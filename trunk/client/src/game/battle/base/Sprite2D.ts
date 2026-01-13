/**
 * 2D Sprite 基础类
 * 封装基本的 2D 精灵功能
 */
export class Sprite2D {
    position = { x: 0, y: 0 };
    scale = { x: 1, y: 1 };
    rotation = 0;
    anchor = { x: 0.5, y: 0.5 };
    visible = true;
    alpha = 1;
    
    // PIXI.js sprite reference
    pixiSprite = null;

    constructor(texture = null) {
        if (texture) {
            this.pixiSprite = new PIXI.Sprite(texture);
            this.pixiSprite.anchor.set(this.anchor.x, this.anchor.y);
        }
    }

    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        if (this.pixiSprite) {
            this.pixiSprite.position.set(x, y);
        }
    }

    setScale(x, y) {
        this.scale.x = x;
        this.scale.y = y;
        if (this.pixiSprite) {
            this.pixiSprite.scale.set(x, y);
        }
    }

    setRotation(rotation) {
        this.rotation = rotation;
        if (this.pixiSprite) {
            this.pixiSprite.rotation = rotation;
        }
    }

    setAnchor(x, y) {
        this.anchor.x = x;
        this.anchor.y = y;
        if (this.pixiSprite) {
            this.pixiSprite.anchor.set(x, y);
        }
    }

    setAlpha(alpha) {
        this.alpha = alpha;
        if (this.pixiSprite) {
            this.pixiSprite.alpha = alpha;
        }
    }

    setVisible(visible) {
        this.visible = visible;
        if (this.pixiSprite) {
            this.pixiSprite.visible = visible;
        }
    }

    destroy() {
        if (this.pixiSprite) {
            this.pixiSprite.destroy();
            this.pixiSprite = null;
        }
    }
}
