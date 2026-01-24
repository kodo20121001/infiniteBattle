
import FixedMaths, {} from "./FixedMaths"

export class FixedVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  normalize() {
    let len = this.x * this.x + this.y * this.y + this.z * this.z;
    if (len > 0) {
      len = 1 / FixedMaths.sqrt(len);
      return new FixedVector3(this.x * len, this.y * len, this.z * len);
    }
    return new FixedVector3(this.x, this.y, this.z);
  }

  length() {
    return FixedMaths.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  sub(other: FixedVector3) {
    return new FixedVector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  add(other: FixedVector3) {
    return new FixedVector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  mul(scalar: number) {
    return new FixedVector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  div(scalar: number) {
    if (scalar !== 0) {
      return new FixedVector3(this.x / scalar, this.y / scalar, this.z / scalar);
    } else {
      console.error('Cannot divide by zero');
      return new FixedVector3(this.x, this.y, this.z);
    }
  }

  distanceTo(other: FixedVector3) {
    var x = this.x - other.x;
    var y = this.y - other.y;
    var z = this.z - other.z;
    return FixedMaths.sqrt(x * x + y * y + z * z);
  }
}
