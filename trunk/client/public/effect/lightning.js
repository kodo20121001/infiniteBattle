/**
 * 闪电特效插件
 * 在 Canvas 纹理上绘制闪电效果
 */

const lightningPlugin = {
    /**
     * 初始化插件
     * @param {Sprite} sprite - 精灵对象
     * @param {Object} THREE - Three.js 库对象
     * @param {Object} blackboard - 黑板数据 { startPosition, currentPosition, targetPosition, ... }
     */
    onAttach(sprite, THREE, blackboard) {
        if (!blackboard) {
            console.warn('Lightning plugin: no blackboard data');
            return;
        }

        const startPos = blackboard.startPosition || { x: 0, y: 0, z: 0 };
        const targetPos = blackboard.targetPosition || { x: 0, y: 0, z: 0 };
        
        console.log('[Lightning] onAttach called', { startPos, targetPos });

        // 创建 Shader Material 绘制闪电
        const material = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            uniforms: {
                uStartPos: { value: new THREE.Vector3(startPos.x, startPos.y, startPos.z) },
                uEndPos: { value: new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z) },
                uTime: { value: 0.0 },
                uLife: { value: 1.0 }
            },
            vertexShader: `
                varying vec3 vPosition;
                varying vec2 vUv;
                void main() {
                    vPosition = position;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uStartPos;
                uniform vec3 uEndPos;
                uniform float uTime;
                uniform float uLife;
                
                varying vec3 vPosition;
                varying vec2 vUv;
                
                // 伪随机函数
                float rand(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                // Perlin-like noise
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = rand(i);
                    float b = rand(i + vec2(1.0, 0.0));
                    float c = rand(i + vec2(0.0, 1.0));
                    float d = rand(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }
                
                // 绘制闪电线条
                float lightning(vec2 uv, float t) {
                    vec2 start = vec2(-1.0, 0.0);
                    vec2 end = vec2(1.0, 0.0);
                    
                    vec2 p = uv;
                    float x = (p.x + 1.0) * 0.5;
                    
                    float bolt = 0.0;
                    
                    if (x >= 0.0 && x <= 1.0) {
                        // 基础中心线
                        float centerY = mix(start.y, end.y, x);
                        
                        // 多层随机波形，产生锯齿效果
                        float n1 = noise(vec2(x * 10.0, t * 2.0)) * 0.5 - 0.25;
                        float n2 = noise(vec2(x * 20.0, t * 3.5)) * 0.3 - 0.15;
                        float n3 = noise(vec2(x * 40.0, t * 5.0)) * 0.1 - 0.05;
                        
                        centerY += (n1 + n2 + n3) * 0.6;
                        
                        // 闪电中心（白色，更亮）
                        float dist = abs(p.y - centerY);
                        float core = smoothstep(0.04, 0.0, dist);
                        bolt += core * 1.2;
                        
                        // 中间层（蓝白色）
                        float mid = smoothstep(0.08, 0.04, dist);
                        bolt += mid * 0.7;
                        
                        // 外层光晕（蓝色）
                        float glow = smoothstep(0.15, 0.08, dist);
                        bolt += glow * 0.3;
                    }
                    
                    return bolt;
                }
                
                void main() {
                    vec2 uv = vUv * 2.0 - 1.0;
                    
                    // 绘制多条闪电以获得更好的效果
                    float bolt = lightning(uv, uTime);
                    
                    // 添加轻微的闪烁
                    float flicker = 0.8 + 0.2 * sin(uTime * 20.0);
                    
                    // 颜色：蓝白色
                    vec3 color = mix(vec3(0.5, 0.7, 1.0), vec3(1.0, 1.0, 1.0), bolt * 0.8);
                    
                    // 衰退效果
                    float alpha = bolt * uLife * flicker;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `
        });

        // 计算起点和终点的距离和中点
        const startVec = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
        const endVec = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
        const direction = endVec.clone().sub(startVec);
        const distance = direction.length();
        
        // 创建平面几何，宽度为距离，高度为固定值
        const geometry = new THREE.PlaneGeometry(distance || 1, 5);
        const mesh = new THREE.Mesh(geometry, material);
        
        // mesh 的位置设置为本地坐标（相对于 sprite），初始在原点
        mesh.position.set(0, 0.5, 0);  // 略微抬起避免 z-fighting
        // 让平面水平，适配俯视角
        mesh.rotation.x = Math.PI / 2;
        
        // 获取或创建 sprite 的 Three.js 对象
        let threeObject = sprite.getThreeObject();
        if (!threeObject) {
            threeObject = new THREE.Group();
            sprite.setThreeObject(threeObject);
        }
        
        // 将 Mesh 添加到 sprite
        threeObject.add(mesh);
        
        // 设置 sprite 的位置为起点
        //sprite.setPosition(startVec.x, startVec.y, startVec.z);
        
        // 设置 sprite 初始旋转指向目标方向（参考Bullet的方向计算）
        if (distance > 0.001) {
            const dx = endVec.x - startVec.x;
            const dz = endVec.z - startVec.z;
            // 使用相同的角度计算方式：atan2(dz, -dx)
            const angleRad = Math.atan2(dz, -dx);
            sprite.setInitialRotation(0, angleRad, 0);  // 初始旋转使用弧度
        }
        console.log('[Lightning] Mesh added to sprite');

        const bolts = [];
        let elapsed = 0;
        const duration = 0.8;
        let frameCount = 0;

        // ==========================================
        // 创建更新回调
        // ==========================================
        const updateFunc = (sprite, deltaTime) => {
            frameCount++;
            elapsed += (typeof deltaTime === 'number' ? deltaTime : 0.016);

            // 更新 shader uniform
            material.uniforms.uTime.value = elapsed;
            material.uniforms.uLife.value = Math.max(0, 1.0 - elapsed / duration);

            if (frameCount % 10 === 0) {
                console.log('[Lightning] frame:', frameCount, 'elapsed:', elapsed.toFixed(3), 'life:', material.uniforms.uLife.value.toFixed(3));
            }

            // 如果特效播放完成，停止更新
            if (elapsed >= duration) {
                console.log('[Lightning] Effect complete');
                sprite.removePlugin(this);
            }
        };

        this.onUpdate = updateFunc;
    }
};

// 返回插件对象供外部使用
return lightningPlugin;