/**
 * 火球特效插件
 * 纯 Shader 锥形火焰 (无粒子)
 * 包含核心发光球 + 外层锥形火焰
 */

/**
 * 火球特效插件
 * @implements {SpritePlugin}
 */
const fireballPlugin = {
    /**
     * 初始化插件（当插件被加入Sprite时调用）
     * @param {Sprite} sprite - 精灵对象
     * @param {Object} THREE - Three.js 库对象
     */
    onAttach(sprite, THREE) {
        const threeObject = sprite.getThreeObject();
        if (!threeObject) {
            console.warn('FireBall plugin: sprite has no three object');
            return;
        }

        // ==========================================
        // 公用噪声函数 (Simplex 3D Noise)
        // ==========================================
        const noiseChunk = `
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

            float snoise(vec3 v) {
                const vec2  C = vec2(1.0/6.0, 1.0/3.0);
                const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3  ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
        `;

        // ==========================================
        // 1. 核心火球 (Core) - 保持实心感
        // ==========================================
        const coreVertexShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vNoise;
            ${noiseChunk}

            void main() {
                vUv = uv;
                // 核心噪声：低频，缓慢
                float noise = snoise(position * 2.0 + vec3(0.0, uTime * 2.0, 0.0));
                vNoise = noise;
                
                // 顶点位移：让球体表面起伏
                float displacement = noise * 0.15; 
                vec3 newPosition = position + normal * displacement;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `;

        const coreFragmentShader = `
            varying float vNoise;
            void main() {
                // 核心颜色：非常亮，偏白/黄
                vec3 colorInner = vec3(1.0, 1.0, 0.8); 
                vec3 colorOuter = vec3(1.0, 0.4, 0.0); 

                float n = vNoise * 0.5 + 0.5; // 归一化 0~1
                
                // 混合颜色
                vec3 finalColor = mix(colorOuter, colorInner, n * n);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        // ==========================================
        // 2. 外焰 (Outer Flame) - 锥形、透明、流动
        // ==========================================
        const flameVertexShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation; // 传递高度信息给片元
            ${noiseChunk}

            void main() {
                vUv = uv;
                
                // 基础位置
                vec3 pos = position;
                
                // --- 锥形处理 ---
                // uv.y = 0 是底部，uv.y = 1 是顶部
                // 底部保持宽阔 (1.0)，顶部收缩到几乎为 0
                float taper = 1.0 - uv.y * 0.8; // 顶部保留 20% 宽度
                pos.x *= taper;
                pos.z *= taper;

                // --- 噪声波动 ---
                float noiseScale = 3.0;
                float timeSpeed = 3.0;
                
                // 主噪声：控制整体形态扭曲
                float n = snoise(vec3(pos.x * noiseScale, pos.y * 1.5 - uTime * timeSpeed, pos.z * noiseScale));
                
                // 随着高度增加，扭曲幅度变大
                float distortionStrength = 0.5 * uv.y; 
                pos.x += n * distortionStrength;
                pos.z += n * distortionStrength;

                vElevation = uv.y; // 传递高度，用于颜色渐变

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const flameFragmentShader = `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation;
            ${noiseChunk}

            void main() {
                // 纹理噪声
                float n = snoise(vec3(vUv.x * 10.0, vUv.y * 8.0 - uTime * 6.0, 0.0));
                
                // --- 形状遮罩 (Shape Mask) ---
                float bottomMask = smoothstep(0.0, 0.2, vUv.y);
                float topMask = 1.0 - smoothstep(0.6, 1.0, vUv.y);
                
                float alpha = (n * 0.5 + 0.5);
                alpha += (1.0 - vElevation) * 0.5;
                alpha *= bottomMask * topMask;

                // 阈值切割
                if (alpha < 0.1) discard; 

                // --- 颜色渐变 ---
                vec3 colorBottom = vec3(1.0, 0.9, 0.3); // 亮黄
                vec3 colorMiddle = vec3(1.0, 0.4, 0.0); // 橙红
                vec3 colorTop    = vec3(0.4, 0.0, 0.0); // 暗红

                vec3 finalColor = mix(colorBottom, colorMiddle, vElevation * 1.5);
                finalColor = mix(finalColor, colorTop, smoothstep(0.4, 1.0, vElevation));

                // 增加发光强度
                finalColor *= 1.5;

                gl_FragColor = vec4(finalColor, alpha);
            }
        `;

        // ==========================================
        // 构建网格对象
        // ==========================================

        // 1. 核心发光球
        const coreGeo = new THREE.IcosahedronGeometry(0.5, 15);
        const coreMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: coreVertexShader,
            fragmentShader: coreFragmentShader,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = 0.2;
        threeObject.add(coreMesh);

        // 添加点光源
        const light = new THREE.PointLight(0xffaa00, 10, 10);
        light.position.set(0, 1, 0);
        threeObject.add(light);

        // 2. 外层火焰
        const flameGeo = new THREE.CylinderGeometry(0.6, 0.6, 3.5, 32, 64, true);
        flameGeo.translate(0, 1.75, 0);

        const flameMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: flameVertexShader,
            fragmentShader: flameFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const flameMesh = new THREE.Mesh(flameGeo, flameMat);
        threeObject.add(flameMesh);

        // 存储到插件实例
        this.coreMat = coreMat;
        this.flameMat = flameMat;
        this.flameMesh = flameMesh;
        this.time = 0;
    },

    /**
     * 每帧更新
     */
    onUpdate(sprite, deltaTime) {
        if (!this.flameMat) return;

        this.time += deltaTime;

        // 更新 Shader 时间
        this.coreMat.uniforms.uTime.value = this.time;
        this.flameMat.uniforms.uTime.value = this.time;

        // 让火焰旋转
        this.flameMesh.rotation.y = -this.time * 0.2;
    },

    /**
     * 插件卸载
     */
    onDetach(sprite) {
        if (this.flameMesh) {
            this.flameMesh.geometry.dispose();
            this.flameMesh.material.dispose();
        }
        
        this.coreMat = null;
        this.flameMat = null;
        this.flameMesh = null;
    }
};

// 不使用 ES 模块 export，直接声明插件对象供外部使用
// 通过 Function 构造器加载时会返回此对象
fireballPlugin;
