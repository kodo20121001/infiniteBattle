
import {customSin, customCos} from "./sin_cos"
import {customAtan2} from "./atan2"
import { customSqrt } from "./sqrt"

export default class FixedMaths
{
    static seed = 1

    static cos(degrees)
    {
      return customCos(degrees)
    } 

    static sin(degrees)
    {
      return customSin(degrees)
    }

    static atan2(y, x)
    {
      return customAtan2(y, x)
    }

    static sqrt(x)
    {
      return customSqrt(x)
    }

    static rotate(ps, angleInDegrees)
    {
      const cosTheta = FixedMaths.cos(angleInDegrees);
      const sinTheta = FixedMaths.sin(angleInDegrees);
  
      return ps.map(([dx, dy]) => {
        const new_dx = Math.round(dx * cosTheta + dy * sinTheta);
        const new_dy = Math.round(-dx * sinTheta + dy * cosTheta);
        return [new_dx, new_dy];
      });
    }

    // 使用线性同余生成器
    static random() 
    {
      FixedMaths.seed = (FixedMaths.seed * 16807) % 2147483647;
      return (FixedMaths.seed - 1) / 2147483646;
    }

    static lerpAngle(a, b, t) {
      var delta = ((b - a + 180) % 360) - 180;
      return a + delta * t;
    }

    static lerp(start, end, t) {
      return (1 - t) * start + t * end;
    }
}
