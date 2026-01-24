import FixedMaths from "../../core/base/fixed/FixedMaths";

export class QuadTree {
    constructor(boundary, capacity, depth = 0, maxDepth = 10) {
        this.boundary = boundary;
        this.capacity = capacity;
        this.objs = [];
        this.divided = false;
        this.depth = depth;
        this.maxDepth = maxDepth;
    }

    insert(circle, obj) {
        if (!this.intersects(this.boundary, circle)) {
            return false;
        }

        if (this.objs.length < this.capacity) {
            this.objs.push({ circle, obj });
            return true;
        }

        if (!this.divided && this.depth < this.maxDepth) {
            this.subdivide();
        }

        if (this.divided) {
            this.nw.insert(circle, obj);
            this.ne.insert(circle, obj);
            this.sw.insert(circle, obj);
            this.se.insert(circle, obj);
        } else {
            this.objs.push({ circle, obj });
        }

        return true;
    }

    remove(circle, obj) {
        if (!this.intersects(this.boundary, circle)) {
            return false;
        }

        let removed = false;

        this.objs = this.objs.filter(el => el.obj !== obj);
        removed = this.objs.length < this.objs.filter(el => el.obj !== obj).length;

        if (this.divided) {
            removed = this.nw.remove(circle, obj) || removed;
            removed = this.ne.remove(circle, obj) || removed;
            removed = this.sw.remove(circle, obj) || removed;
            removed = this.se.remove(circle, obj) || removed;
        }

        return removed;
    }

    intersects(rect, circle) {
        let deltaX = circle.x - Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        let deltaY = circle.y - Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        return (deltaX * deltaX + deltaY * deltaY) <= (circle.radius * circle.radius);
    }

    subdivide() {
        const x = this.boundary.x;
        const y = this.boundary.y;
        const w = this.boundary.width / 2;
        const h = this.boundary.height / 2;
        const newDepth = this.depth + 1;

        let neBoundary = { x: x + w, y: y, width: w, height: h };
        let nwBoundary = { x: x, y: y, width: w, height: h };
        let seBoundary = { x: x + w, y: y + h, width: w, height: h };
        let swBoundary = { x: x, y: y + h, width: w, height: h };

        this.ne = new QuadTree(neBoundary, this.capacity, newDepth, this.maxDepth);
        this.nw = new QuadTree(nwBoundary, this.capacity, newDepth, this.maxDepth);
        this.se = new QuadTree(seBoundary, this.capacity, newDepth, this.maxDepth);
        this.sw = new QuadTree(swBoundary, this.capacity, newDepth, this.maxDepth);

        this.divided = true;
    }

    query(range, found = []) {
        if (!this.intersectsRect(this.boundary, range)) {
            return found;
        }

        for (const el of this.objs) {
            if (this.intersectsRect(range, el.circle)) {
                found.push(el.obj);
            }
        }

        if (this.divided) {
            this.nw.query(range, found);
            this.ne.query(range, found);
            this.sw.query(range, found);
            this.se.query(range, found);
        }

        return found;
    }

    collides(circle, excludeObj) {
        if (!this.intersects(this.boundary, circle)) {
            return false; // 如果圆不在当前节点的边界内，则直接返回false
        }
    
        for (const el of this.objs) {
            // 如果传入了排除对象，并且当前对象是排除对象，则跳过检查
            if (excludeObj && el.obj.actorId === excludeObj.actorId) {
                continue;
            }
    
            if (this.intersectCircles(circle, el.circle)) {
                return true; // 找到碰撞
            }
        }
    
        if (this.divided) {
            // 递归检查每个子节点
            if (this.nw.collides(circle, excludeObj)) return true;
            if (this.ne.collides(circle, excludeObj)) return true;
            if (this.sw.collides(circle, excludeObj)) return true;
            if (this.se.collides(circle, excludeObj)) return true;
        }
    
        return false; // 没有发现碰撞
    }
    

    // 检查两个圆是否相交
    intersectCircles(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distance = FixedMaths.sqrt(dx * dx + dy * dy);
        return distance < (circle1.radius + circle2.radius);
    }

    intersectsRect(rect1, rect2) {
        return !(rect2.x > rect1.x + rect1.width ||
                 rect2.x + rect2.width < rect1.x ||
                 rect2.y > rect1.y + rect1.height ||
                 rect2.y + rect2.height < rect1.y);
    }
}
