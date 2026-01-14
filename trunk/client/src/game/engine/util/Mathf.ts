const SIZE = 64

export class Mathf {

    static fromAngle(angleInDegrees: number) {
        // 将角度转换为弧度
        let angleInRadians = (90 - angleInDegrees) * (Math.PI / 180);
        
        // 返回使用弧度的余弦和正弦计算的结果
        return [Math.cos(angleInRadians), Math.sin(angleInRadians)];
    }

    static toAngle(p) {
        // 计算弧度
        let angleRadians = Math.atan2(p[1], p[0]);
        // 将弧度转换为度
        let angleDegrees = angleRadians * (180 / Math.PI);
        // 计算最终角度
        return 90 - angleDegrees;
    }

    static transform3dTo2d(point3d, angleDegrees = 53.13010235415598) {

        // 将角度从度转换为弧度
        const angleRadians = angleDegrees * Math.PI / 180;
    
        // 计算菱形网格的变换矩阵
        const sinAngle = Math.sin(angleRadians);
        const cosAngle = Math.cos(angleRadians);
        const matrix = [
            [1, cosAngle, 0, 0],
            [0, sinAngle, 0, 0],
            [0, 0, 1, 0]
        ];

        // 将3D点转换为齐次坐标
        const point3dHomogeneous = point3d.concat([1]);
    
        // 进行矩阵乘法变换
        let point2dHomogeneous = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                point2dHomogeneous[i] += matrix[i][j] * point3dHomogeneous[j];
            }
        }
    
        // 从齐次坐标中提取2D点坐标
        const point2d = point2dHomogeneous.slice(0, 2);
    
        // 将2D点旋转传入角度的一半（逆时针）
        const rotationAngleRad = angleDegrees / 2 * Math.PI / 180;
        const rotatedX = point2d[0] * Math.cos(rotationAngleRad) + point2d[1] * Math.sin(rotationAngleRad);
        const rotatedY = -point2d[0] * Math.sin(rotationAngleRad) + point2d[1] * Math.cos(rotationAngleRad);
    
        return [rotatedX * SIZE, rotatedY * SIZE];
    }
    
    static transform2dTo3d(point2d, angleDegrees = 53.13010235415598) {

        point2d[0] = point2d[0] / SIZE;
        point2d[1] = point2d[1] / SIZE;

         // 将2D点旋转传入角度的一半（顺时针）
        const rotationAngleRad = -angleDegrees / 2 * Math.PI / 180;
        const rotatedX = point2d[0] * Math.cos(rotationAngleRad) + point2d[1] * Math.sin(rotationAngleRad);
        const rotatedY = -point2d[0] * Math.sin(rotationAngleRad) + point2d[1] * Math.cos(rotationAngleRad);

        // 将旋转后的2D点转换为齐次坐标
        const point2dHomogeneous = [rotatedX, rotatedY, 1];

        // 计算菱形网格的逆变换矩阵
        const angleRadians = angleDegrees * Math.PI / 180;
        const sinAngle = Math.sin(angleRadians);
        const cosAngle = Math.cos(angleRadians);
        const inverseMatrix = [
            [1, -cosAngle / sinAngle, 0],
            [0, 1 / sinAngle, 0],
            [0, 0, 1]
        ];

        // 进行矩阵乘法变换
        let point3dHomogeneous = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                point3dHomogeneous[i] += inverseMatrix[i][j] * point2dHomogeneous[j];
            }
        }

        // 从齐次坐标中提取3D点坐标
        const point3d = point3dHomogeneous.slice(0, 3);
        
        return point3d;
    }

    // 抛物线高度转像素
    static transformYToPosY(y, angleDegrees = 53.13010235415598)
    {
        let angleRadians = angleDegrees * Math.PI / 180;
        let sinAngle = Math.sin(angleRadians);

        return y * sinAngle * SIZE;
    }

    static lerp(start, end, t: number) {
        return {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t
        };
    }


    static getDir(angle)
    {
        let dir = Mathf.fromAngle(angle)
        let dir1 = Mathf.transform3dTo2d([dir[0], dir[1], 0]);
        angle = Mathf.toAngle(dir1)

        angle += 0.1
        if(angle == 0) return 1;
        // let dir = Mathf.fromAngle(angle)
        // let dir1 = Mathf.transform3dTo2d([dir[0], dir[1], 0]);
        // angle = Mathf.toAngle(dir1)

        angle = angle % 360;
        if(angle < 0) angle += 360;

        return Math.ceil(angle / 90);
    }

    static calculateTangentAngle(slope: number): number {
        let angleInRadians = Math.atan(slope);
      
        // 将弧度转换为度
        let angleInDegrees = angleInRadians * (180 / Math.PI);
      
        // 调整角度使其在 0 到 360 度之间
        // 如果角度是负的，加上 360 度
        angleInDegrees = (angleInDegrees + 360) % 360;
      
        // 返回计算得到的旋转角度
        return angleInDegrees;
      }

}


