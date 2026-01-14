
import Logger from "../../../../utils/Logger";
import FixedMaths, {} from "./FixedMaths"

export class FixedVector2 {

  x : number
  y : number

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new FixedVector2(this.x, this.y);
  }

  normalize() {
    let len = this.x * this.x + this.y * this.y;
    if (len > 0) {
      len = 1 / FixedMaths.sqrt(len);
      return new FixedVector2(this.x * len, this.y * len);
    }
    return new FixedVector2(this.x, this.y);
  }

  length() {
    return FixedMaths.sqrt(this.x * this.x + this.y * this.y);
  }

  sub(other) {
    return new FixedVector2(this.x - other.x, this.y - other.y);
  }

  add(other) {
    return new FixedVector2(this.x + other.x, this.y + other.y);
  }

  // Multiply this vector by a scalar and return a new instance
  mul(scalar) {
    return new FixedVector2(this.x * scalar, this.y * scalar);
  }

  // Divide this vector by a scalar and return a new instance
  div(scalar) {
    if (scalar !== 0) {
      return new FixedVector2(this.x / scalar, this.y / scalar);
    } else {
      console.error('Cannot divide by zero');
      return new FixedVector2(this.x, this.y);
    }
  }

  distanceTo(other) {
    var x = this.x - other.x;
    var y = this.y - other.y;
    return FixedMaths.sqrt(x * x + y * y);
  }

  toAngle(){
    let pos = this.normalize()
    return 90 - FixedMaths.atan2(pos.y, pos.x);
  }

  static fromAngle(angleInDegrees) {
      return new FixedVector2(FixedMaths.cos(90 - angleInDegrees), FixedMaths.sin(90 - angleInDegrees));
  }

  // static fromAngle1(angleInDegrees) {
  //     // 将角度从以正北为0度转换为以正东为0度
  //     let angleInRadians = (90 - angleInDegrees) * Math.PI / 180;

  //     // 计算x和y坐标，这里使用cos和sin的顺序对应于转换后的角度
  //     let x = Math.cos(angleInRadians);
  //     let y = Math.sin(angleInRadians);

  //     // 返回单位向量
  //     return {x: x, y: y};
  // }
}

// let x = new FixedVector2(-1, 0).normalize()
// let y = x.toAngle()
// let z = FixedVector2.fromAngle(y)
// let j = FixedVector2.fromAngle1(y)
// let i = 0
// ++i

function testInverse() {
  let angles = [0, 45, 90, 135, 180, 225, 270, 315];
  for (let angle of angles) {
      let vector = FixedVector2.fromAngle(angle);
      let calculatedAngle = vector.toAngle();
      Logger.log(`Original angle: ${angle}, calculated angle: ${calculatedAngle}`);
  }
}

function testInverse1() {
  for (let x = -1; x <= 1; x += 0.1) {
      let y = Math.sqrt(1 - x * x);
      let vector = new FixedVector2(x, y);
      let angle = vector.toAngle();
      let calculatedVector = FixedVector2.fromAngle(angle);
      let distance = vector.distanceTo(calculatedVector);
      if (distance > 0.1) {
          Logger.log(`Original vector: (${x}, ${y}), calculated vector: (${calculatedVector.x}, ${calculatedVector.y}), distance: ${distance}`);
      }
  }
}

//testInverse();
//testInverse1();

