/**
 * 火球特效插件 (优化版)
 * 使用预生成的噪音纹理而不是实时 Simplex Noise
 * 包含核心发光球 + 外层锥形火焰
 */

// ==========================================
// 全局纹理缓存（所有火球实例共享）
// ==========================================
let fireballNoiseTextures = null;

/**
 * 懒加载纹理（第一次调用时加载，之后复用）
 * 使用 Assets 进行缓存和引用计数管理
 */
async function getFireballNoiseTextures(assets, THREE) {
    if (fireballNoiseTextures !== null) {
        return fireballNoiseTextures;
    }

    if (!assets) {
        console.warn('FireBall: assets not available');
        return null;
    }

    fireballNoiseTextures = [];
    const frameCount = 8;
    
    // 使用 assets 加载纹理，自动缓存和管理引用计数
    for (let i = 0; i < frameCount; i++) {
        const frameNum = String(i).padStart(2, '0');
        const texturePath = `/effect/noise_${frameNum}.png`;
        
        try {
            // 通过 assets 加载图片（会自动缓存）
            const image = await assets.getImage(texturePath);
            // 通过 assets.getThreeTexture 获取 THREE 纹理（会缓存到 assets.textureCache）
            const threeTexture = assets.getThreeTexture(image, texturePath);
            fireballNoiseTextures.push(threeTexture);
        } catch (err) {
            console.warn(`Failed to load noise texture ${frameNum}:`, err);
        }
    }
    
    // 如果全部加载失败，返回 null，会使用降级方案
    return fireballNoiseTextures.length > 0 ? fireballNoiseTextures : null;
}

/**
 * 火球特效插件
 * @implements {SpritePlugin}
 */
const fireballPlugin = {
    /**
     * 初始化插件（当插件被加入Sprite时调用）
     * @param {Sprite} sprite - 精灵对象
     * @param {Object} THREE - Three.js 库对象
     * @param {Object} assets - Assets 管理器
     * @param {Object} blackboard - 黑板对象
     */
    onAttach(sprite, THREE, assets, blackboard) {
        const threeObject = sprite.getThreeObject();
        if (!threeObject) {
            console.warn('FireBall plugin: sprite has no three object');
            return;
        }

        // ==========================================
        // 创建默认灰色纹理（用于加载时的过渡）
        // ==========================================
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 64, 64);
        const defaultTexture = new THREE.CanvasTexture(canvas);
        defaultTexture.magFilter = THREE.NearestFilter;
        defaultTexture.minFilter = THREE.NearestFilter;
        
        // 启动异步加载纹理
        let loadedTextures = null;
        getFireballNoiseTextures(assets, THREE).then(textures => {
            loadedTextures = textures;
        });

        // ==========================================
        // 1. 核心火球 (Core) - 使用纹理采样
        // ==========================================
        const coreVertexShader = `
            uniform sampler2D uNoiseTexture;
            varying vec2 vUv;
            varying float vNoise;

            void main() {
                vUv = uv;
                // 从纹理采样噪声
                float noise = texture2D(uNoiseTexture, uv).r * 2.0 - 1.0;
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
        // 2. 外焰 (Outer Flame) - 使用纹理采样
        // ==========================================
        const flameVertexShader = `
            uniform sampler2D uNoiseTexture;
            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vDistortion;

            void main() {
                vUv = uv;
                
                // 基础位置
                vec3 pos = position;
                
                // --- 锥形处理 ---
                float taper = 1.0 - uv.y * 0.8; // 顶部保留 20% 宽度
                pos.x *= taper;
                pos.z *= taper;

                // --- 使用纹理噪声波动 ---
                vec2 noiseUv = vec2(uv.x * 0.5 + 0.25, uv.y * 0.5);
                float n = texture2D(uNoiseTexture, noiseUv).r * 2.0 - 1.0;
                
                // 随着高度增加，扭曲幅度变大
                float distortionStrength = 0.5 * uv.y; 
                pos.x += n * distortionStrength;
                pos.z += n * distortionStrength;

                vElevation = uv.y;
                vDistortion = vec3(uv.xy, n);

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const flameFragmentShader = `
            uniform sampler2D uNoiseTexture;
            varying vec2 vUv;
            varying float vElevation;
            varying vec3 vDistortion;

            void main() {
                // 从纹理采样噪声
                float n = texture2D(uNoiseTexture, vUv * vec2(1.0, 0.5)).r * 2.0 - 1.0;
                
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
            uniforms: { 
                uNoiseTexture: { value: defaultTexture }
            },
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
            uniforms: { 
                uNoiseTexture: { value: defaultTexture }
            },
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
        this.loadedTextures = null;  // 在加载完成后设置
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameInterval = 0.1; // 每 0.1 秒切换一帧
        
        // 异步完成后更新引用
        if (loadedTextures) {
            this.loadedTextures = loadedTextures;
        }

    },

    /**
     * 每帧更新
     */
    onUpdate(sprite, deltaTime) {
        if (!this.flameMat) return;

        // 如果纹理加载完成，开始动画循环
        if (!this.loadedTextures && fireballNoiseTextures) {
            this.loadedTextures = fireballNoiseTextures;
        }

        const textures = this.loadedTextures;
        if (!textures || textures.length === 0) {
            // 还在加载，skip
            return;
        }

        this.frameTime += deltaTime;

        // 按指定间隔切换纹理帧
        if (this.frameTime >= this.frameInterval) {
            this.frameTime -= this.frameInterval;
            this.currentFrame = (this.currentFrame + 1) % textures.length;
            
            // 更新两个材质的纹理
            this.coreMat.uniforms.uNoiseTexture.value = textures[this.currentFrame];
            this.flameMat.uniforms.uNoiseTexture.value = textures[this.currentFrame];
        }

        // 让火焰旋转
        this.flameMesh.rotation.y += deltaTime * 0.2;
    },

    /**
     * 插件卸载
     */
    onDetach(sprite) {
        if (this.flameMesh) {
            this.flameMesh.geometry.dispose();
            this.flameMesh.material.dispose();
        }
        
        // 注意：不释放纹理，因为是全局共享的（由 assets 管理）
        
        this.coreMat = null;
        this.flameMat = null;
        this.flameMesh = null;
        this.loadedTextures = null;
    }
};

// 返回插件对象供外部使用
return fireballPlugin;
