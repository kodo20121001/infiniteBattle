/**
 * 生成噪音纹理并保存为PNG
 * 用法: node generateNoiseTexture.js [width=512] [height=512] [output=noise.png]
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// 简单的Perlin噪音实现（2D）
class PerlinNoise {
  constructor(seed = 0) {
    this.permutation = Array.from({ length: 256 }, (_, i) => i);
    // 用种子进行洗牌
    for (let i = 255; i > 0; i--) {
      const j = Math.floor((seed + Math.random()) * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    // 扩展到512
    this.p = [...this.permutation, ...this.permutation];
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 8 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const p = this.p;
    const aa = p[p[xi] + yi];
    const ba = p[p[xi + 1] + yi];
    const ab = p[p[xi] + yi + 1];
    const bb = p[p[xi + 1] + yi + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));
    return this.lerp(v, x1, x2);
  }
}

// 生成分形布朗运动（fBm）噪音
function generateFbmNoise(width, height, scale = 50, octaves = 4, persistence = 0.5) {
  const noise = new PerlinNoise();
  const imageData = new Uint8ClampedArray(width * height * 4);

  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  // 第一遍：计算最大值用于归一化
  const values = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      amplitude = 1;
      frequency = 1;
      for (let i = 0; i < octaves; i++) {
        value += amplitude * noise.noise(x * frequency / scale, y * frequency / scale);
        maxValue = Math.max(maxValue, value);
        amplitude *= persistence;
        frequency *= 2;
      }
      values[y * width + x] = value;
    }
  }

  // 第二遍：写入像素数据
  for (let i = 0; i < width * height; i++) {
    // 归一化到 0-255
    const normalized = ((values[i] / maxValue + 1) / 2) * 255;
    const gray = Math.max(0, Math.min(255, Math.floor(normalized)));
    imageData[i * 4 + 0] = gray;     // R
    imageData[i * 4 + 1] = gray;     // G
    imageData[i * 4 + 2] = gray;     // B
    imageData[i * 4 + 3] = 255;      // A
  }

  return imageData;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const width = parseInt(args[0]) || 512;
  const height = parseInt(args[1]) || 512;
  const output = args[2] || 'noise.png';

  console.log(`生成噪音纹理: ${width}x${height}`);
  console.log('参数: scale=50, octaves=4, persistence=0.5');

  // 创建Canvas并生成噪音
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 生成噪音数据
  const imageData = generateFbmNoise(width, height);
  const imgData = ctx.createImageData(width, height);
  imgData.data.set(imageData);
  ctx.putImageData(imgData, 0, 0);

  // 保存为PNG
  const outputPath = path.join(__dirname, '..', 'public', 'effect', output);
  const dir = path.dirname(outputPath);
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ 已保存到: ${outputPath}`);
  console.log(`文件大小: ${(buffer.length / 1024).toFixed(2)}KB`);
}

main().catch(console.error);
