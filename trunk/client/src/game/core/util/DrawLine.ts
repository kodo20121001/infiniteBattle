import { Component, Graphics, Vec2 } from 'cc';

const ANGLE = 53.13010235415598; // 等距投影角度

@ccclass('DrawLine')
export class DrawLine extends Component {
    private lineWidth: number = 10;

    private drawings: DrawingObject[] = [];

    start() {
        this.addShape({
            type: 'rhombus',
            duration: 10,
            color: Color.RED,
            center: new Vec2(0, 0),
            radius: 200,
            lineWidth: this.lineWidth,
        })

        this.addShape({
            type: 'ellipse',
            duration: 10,
            color: Color.RED,
            center: new Vec2(0, 0),
            radius: 200,
            lineWidth: this.lineWidth,
        })

        this.addShape({
            type: 'rect',
            duration: 10,
            color: Color.BLUE,
            center: new Vec2(0, 0),
            size: new Vec2(400, 400),
            lineWidth: this.lineWidth,
        })

        this.addShape({
            type: 'circle',
            duration: 10,
            center: new Vec2(0, 0),
            color: Color.BLUE,
            radius: 200,
            lineWidth: this.lineWidth,
        })
    }

    update(deltaTime: number) {
        const now = sys.now();
        for(let i = this.drawings.length - 1; i >= 0; i--) {
            const drawing = this.drawings[i];
            if (now >= drawing.duration) {
                if(drawing.node)
                    this.node.removeChild(drawing.node);
                this.drawings.splice(i, 1);
            }
        }
    }

    addShape(shape: ShapeParams) {
        const drawing: DrawingObject = {
            type: shape.type,
            points: shape.points,
            center: shape.center,
            size: shape.size,
            radius: shape.radius,
            duration: sys.now() + shape.duration * 1000, // 持续时间
            drawn: false,
            color: shape.color || Color.RED, // 默认颜色为白色
            lineWidth: shape.lineWidth || this.lineWidth,
        };
        this.drawings.push(drawing);
        this.draw();
    }

    private draw() {
        this.drawings.forEach(drawing => {
            if (!drawing.drawn) {
                let node = new Node(drawing.type);
                let graphics = node.addComponent(Graphics);
                this.node.addChild(node);
                graphics.strokeColor = drawing.color;
                graphics.fillColor = drawing.color;
                graphics.lineWidth = drawing.lineWidth;
                drawing.node = node;

                switch (drawing.type) {
                    case 'line':
                        this.drawLine(drawing.points, graphics);
                        break;
                    case 'rect':
                        this.drawRectangle(drawing.center, drawing.size, graphics);
                        break;
                    case 'circle':
                        this.drawCircle(drawing.center, drawing.radius, graphics);
                        break;
                    case 'ellipse':
                        this.drawEllipse(drawing.center, drawing.radius, graphics);
                        break;
                    case 'rhombus' :
                        this.drawRhombus(drawing.center, drawing.radius, ANGLE, graphics);
                        break;
                }
                graphics.stroke(); // 绘制线条
                drawing.drawn = true; // 标记为已绘制
            }
        });
    }

    private drawLine(points: Vec2[], graphics) {
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
    }

    private drawRectangle(center: Vec2, size: Vec2, graphics: Graphics) {
        const x = center.x - size.x / 2;
        const y = center.y - size.y / 2;
        graphics.rect(x, y, size.x, size.y);
    }

    private drawRhombus(center: Vec2, radius: number, angle: number, graphics: Graphics) {
        // 实现菱形绘制逻辑
        let cx = center.x;
        let cy = center.y;
    
        let angleInRadians = angle * Math.PI / 180; // 将角度转换为弧度
        let halfDiagonal = Math.tan(angleInRadians / 2) * radius;
    
        // 计算菱形四个顶点的坐标
        let vertices = [
            new Vec2(cx - radius, cy), // 顶点1
            new Vec2(cx, cy - halfDiagonal),  // 顶点3
            new Vec2(cx + radius, cy), // 顶点2
            new Vec2(cx, cy + halfDiagonal),
            new Vec2(cx - radius, cy)// 顶点5
        ];
        this.drawLine(vertices, graphics)
    }



    private drawCircle(center: Vec2, radius: number, graphics: Graphics) {
        graphics.circle(center.x, center.y, radius);
    }

    private drawEllipse(center: Vec2, radius: number, graphics: Graphics) {
        graphics.ellipse(center.x, center.y, radius, radius * Math.tan(ANGLE / 2 * Math.PI / 180));
    }

}

interface DrawingObject {
    type: 'line' | 'rect' | 'circle' | 'ellipse' | 'rhombus';
    points?: Vec2[];
    center?: Vec2;
    size?: Vec2;
    radius?: number;
    duration: number; // 持续时间，单位毫秒
    drawn: boolean;
    color: Color;
    node?: Node;
    lineWidth: number;
}

interface ShapeParams {
    type: 'line' | 'rect' | 'circle' | 'ellipse' | 'rhombus';
    points?: Vec2[];
    center?: Vec2;
    size?: Vec2;
    radius?: number;
    duration: number; // 持续时间，单位秒
    color?: Color;
    lineWidth?: number;
}