import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function BattleUI() {
  const mountRef = useRef(null);
  const [gameState, setGameState] = useState({
      score: 0,
      wave: 1,
      heroCount: 5, // Initial count matching logical setup
      isGameOver: false
  });

  useEffect(() => {
    // --- Configuration ---
    let rafId;
    let heroes = [];
    let enemies = [];
    let projectiles = [];
    let particles = [];
    let lastTime = 0;
    let spawnTimer = 0;
    
    // Game State (Mutable for loop)
    let score = 0;
    let wave = 1;
    let gameActive = true;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const bgColor = 0x050510; 
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 40, 120); 

    const getContainerSize = () => {
        if (mountRef.current) {
            return { width: mountRef.current.clientWidth, height: mountRef.current.clientHeight };
        }
        return { width: window.innerWidth, height: window.innerHeight };
    };

    const { width, height } = getContainerSize();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
    camera.position.set(0, 25, 35); 
    camera.lookAt(0, 0, -20);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Enable SRGB for brighter colors

    if (mountRef.current) {
        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(renderer.domElement);
    }

    // --- Lights ---
    // Make scene brighter
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Boosted ambient
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); // Sky light
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0); // Bright sun
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffaa00, 2.0, 50); // Brighter glow
    pointLight.position.set(0, 10, 10);
    scene.add(pointLight);

    // --- Ground ---
    // Ground consists of two zones: Player (Blue/Alliance) and Enemy (Red/Horde)
    function createColoredGridTexture(bgColor, lineColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Background
        context.fillStyle = bgColor;
        context.fillRect(0, 0, 512, 512);

        // Grid Lines
        context.lineWidth = 8;
        context.strokeStyle = lineColor;
        context.strokeRect(0, 0, 512, 512);

        // Inner cross for finer detail (2.5 units per subcell)
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(256, 0); context.lineTo(256, 512);
        context.moveTo(0, 256); context.lineTo(512, 256);
        context.stroke();

        // Highlighting corners
        context.fillStyle = lineColor;
        const s = 40;
        context.fillRect(0, 0, s, s);
        context.fillRect(512-s, 0, s, s);
        context.fillRect(0, 512-s, s, s);
        context.fillRect(512-s, 512-s, s, s);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter; 
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        if (renderer.capabilities.getMaxAnisotropy) {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
        return texture;
    }

    const groundGroup = new THREE.Group();
    scene.add(groundGroup);

    // 1. Player Zone (Alliance - Blue)
    // Covers Z from -20 to 180 (Length 200)
    const playerTex = createColoredGridTexture('#0f172a', '#3b82f6'); // Slate/Blue
    playerTex.repeat.set(20, 40); 
    const playerGeo = new THREE.PlaneGeometry(100, 200);
    const playerMat = new THREE.MeshStandardMaterial({ 
        map: playerTex, roughness: 0.5, metalness: 0.1, color: 0xddeeff 
    });
    const playerGround = new THREE.Mesh(playerGeo, playerMat);
    playerGround.rotation.x = -Math.PI / 2;
    playerGround.position.set(0, 0, 80); 
    playerGround.receiveShadow = true;
    groundGroup.add(playerGround);

    // 2. Enemy Zone (Horde - Red)
    // Covers Z from -220 to -20 (Length 200)
    const enemyTex = createColoredGridTexture('#1a0505', '#ef4444'); // Dark Red/Red
    enemyTex.repeat.set(20, 40);
    const enemyGeo = new THREE.PlaneGeometry(100, 200);
    const enemyMat = new THREE.MeshStandardMaterial({ 
        map: enemyTex, roughness: 0.6, metalness: 0.2, color: 0xffcccc 
    });
    const enemyGround = new THREE.Mesh(enemyGeo, enemyMat);
    enemyGround.rotation.x = -Math.PI / 2;
    enemyGround.position.set(0, 0, -120);
    enemyGround.receiveShadow = true;
    groundGroup.add(enemyGround);

    // 3. Battle Front Line (Connection)
    const lineGeo = new THREE.BoxGeometry(100, 0.2, 1);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const frontLine = new THREE.Mesh(lineGeo, lineMat);
    frontLine.position.set(0, 0.05, -20);
    groundGroup.add(frontLine);

    // --- Classes ---
    const HERO_TYPES = {
        TANK: { color: 0xff3333, hp: 300, range: 4, dmg: 25, speed: 1.2, scale: [2, 2.5, 2] },
        MAGE: { color: 0x33ccff, hp: 100, range: 18, dmg: 40, speed: 1.8, scale: [1.2, 2, 1.2] },
        ARCHER: { color: 0x33ff33, hp: 120, range: 14, dmg: 15, speed: 0.6, scale: [1.5, 2, 1.5] }
    };

    class Hero {
        constructor(x, z, typeKey) {
            const stats = HERO_TYPES[typeKey];
            this.stats = stats;
            
            // Create Group for the character
            this.mesh = new THREE.Group();
            this.mesh.position.set(x, 0, z); // Base position

            // 1. Body (Cylinder) - Tinted with Hero Type Color
            const bodyGeo = new THREE.CylinderGeometry(0.4, 0.6, 1.2, 8);
            const bodyMat = new THREE.MeshStandardMaterial({ 
                color: stats.color, 
                roughness: 0.3,
                metalness: 0.1
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.6;
            body.castShadow = true;
            this.mesh.add(body);

            // 2. Hat (Cone) - Dark
            const hatGeo = new THREE.ConeGeometry(0.7, 1, 8);
            const hatMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Dark hat
            const hat = new THREE.Mesh(hatGeo, hatMat);
            hat.position.y = 1.6;
            hat.castShadow = true;
            this.mesh.add(hat);

            // 3. Beak/Mask - White
            const beakGeo = new THREE.ConeGeometry(0.15, 0.6, 8);
            const beakMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
            const beak = new THREE.Mesh(beakGeo, beakMat);
            beak.rotation.x = -Math.PI / 2;
            beak.position.set(0, 1.4, 0.5);
            beak.castShadow = true;
            this.mesh.add(beak);

            // Scale based on hero type
            // Normalize scale to not be too huge, as the box scale was large relative to this model
            // Original box: Tank [2, 2.5, 2] -> This model height is ~2.1.
            // Let's use the first component of scale for uniform scaling
            const scaleFactor = stats.scale[0] * 0.8; 
            this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

            scene.add(this.mesh);

            const ringGeo = new THREE.RingGeometry(1.5, 1.8, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: stats.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
            this.ring = new THREE.Mesh(ringGeo, ringMat);
            this.ring.rotation.x = -Math.PI / 2;
            this.ring.position.y = 0.1;
            this.mesh.add(this.ring);

            this.hp = stats.hp;
            this.maxHp = stats.hp;
            this.cooldown = 0;
            this.dead = false;
        }

        update(dt) {
            if (this.dead) return;
            
            // Floating animation
            this.mesh.position.y = Math.max(0, Math.sin(Date.now() * 0.005) * 0.1);

            if (this.cooldown > 0) this.cooldown -= dt;
            else {
                const target = this.findTarget();
                if (target) {
                    this.attack(target);
                    this.cooldown = this.stats.speed;
                }
            }

            // Orientation Logic:
            // The model is built with the Beak facing +Z.
            // Enemies spawn at -Z (approx -90).
            // Three.js lookAt(target) points the object's -Z axis towards the target.
            // If we lookAt(0, 0, 100) -> -Z points to +100 (Camera). +Z points to -100 (Enemies).
            // So the Beak (+Z) will face the enemies (-Z).
            this.mesh.lookAt(this.mesh.position.x, this.mesh.position.y, 100);
        }

        findTarget() {
            let closest = null;
            let minDist = this.stats.range;
            for (let e of enemies) {
                const d = this.mesh.position.distanceTo(e.mesh.position);
                if (d < minDist) {
                    minDist = d;
                    closest = e;
                }
            }
            return closest;
        }

        attack(target) {
            createProjectile(this.mesh.position, target, this.stats.color, this.stats.dmg);
            this.mesh.position.z += 0.3;
            setTimeout(() => { if(!this.dead) this.mesh.position.z -= 0.3; }, 100);
        }

        takeDamage(amount) {
            this.hp -= amount;
            createParticles(this.mesh.position, 0xffffff, 3);
            if (this.hp <= 0) {
                this.dead = true;
                scene.remove(this.mesh);
                syncUI();
            }
        }
    }

    class Enemy {
        constructor() {
            const lane = (Math.random() - 0.5) * 20; 
            const zStart = -90; 
            
            this.hp = 40 + (wave * 15);
            this.speed = 4 + (wave * 0.3);
            this.dmg = 10 + wave;

            const geo = new THREE.IcosahedronGeometry(1.2, 0);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.1, metalness: 0.5 });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.set(lane, 1.2, zStart);
            this.mesh.castShadow = true;
            scene.add(this.mesh);
            this.dead = false;
        }

        update(dt) {
            if (this.dead) return;
            this.mesh.rotation.x += dt * 2;
            this.mesh.rotation.z += dt * 2;
            const liveHeroes = heroes.filter(h => !h.dead);
            
            if (liveHeroes.length === 0) {
                this.mesh.position.z += this.speed * dt;
                return;
            }

            let target = null;
            let minDist = Infinity;
            for (let h of liveHeroes) {
                const d = this.mesh.position.distanceTo(h.mesh.position);
                if (d < minDist) {
                    minDist = d;
                    target = h;
                }
            }

            if (target) {
                const dir = new THREE.Vector3().subVectors(target.mesh.position, this.mesh.position).normalize();
                if (minDist > 2) {
                    this.mesh.position.add(dir.multiplyScalar(this.speed * dt));
                } else {
                    target.takeDamage(this.dmg);
                    this.die(false);
                }
            }
        }

        takeDamage(amount) {
            this.hp -= amount;
            this.mesh.scale.multiplyScalar(0.9);
            if (this.hp <= 0) this.die(true);
        }

        die(killedByPlayer) {
            this.dead = true;
            scene.remove(this.mesh);
            createParticles(this.mesh.position, 0xff0055, 8);
            if (killedByPlayer) {
                score += 10;
                syncUI();
            }
        }
    }

    class Projectile {
        constructor(start, target, color, dmg) {
            this.target = target;
            this.dmg = dmg;
            this.speed = 30;
            this.dead = false;
            const geo = new THREE.SphereGeometry(0.3, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color: color });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.copy(start);
            this.mesh.position.y += 0.5; 
            scene.add(this.mesh);
        }

        update(dt) {
            if (this.dead) return;
            if (this.target.dead) {
                this.dead = true;
                scene.remove(this.mesh);
                return;
            }
            const dir = new THREE.Vector3().subVectors(this.target.mesh.position, this.mesh.position).normalize();
            const move = this.speed * dt;
            if (this.mesh.position.distanceTo(this.target.mesh.position) < move) {
                if (typeof this.target.takeDamage === 'function') {
                    this.target.takeDamage(this.dmg);
                } else {
                    console.warn("Target takes no damage", this.target);
                }
                this.dead = true;
                scene.remove(this.mesh);
            } else {
                this.mesh.position.add(dir.multiplyScalar(move));
            }
        }
    }

    class Particle {
        constructor(pos, color) {
            const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const mat = new THREE.MeshBasicMaterial({ color: color });
            this.mesh = new THREE.Mesh(geo, mat);
            this.mesh.position.copy(pos);
            this.vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 8, (Math.random() - 0.5) * 8);
            this.life = 1.0;
            scene.add(this.mesh);
        }
        update(dt) {
            this.life -= dt * 3;
            this.vel.y -= 20 * dt;
            this.mesh.position.add(this.vel.clone().multiplyScalar(dt));
            this.mesh.scale.setScalar(this.life);
            this.mesh.rotation.x += dt * 5;
            if (this.life <= 0) {
                scene.remove(this.mesh);
                return false;
            }
            return true;
        }
    }

    // --- Helpers ---
    function createProjectile(s, t, c, d) { projectiles.push(new Projectile(s, t, c, d)); }
    function createParticles(p, c, n) { for(let i=0; i<n; i++) particles.push(new Particle(p, c)); }
    
    // Sync React State throttled
    let uiUpdatePending = false;
    function syncUI() {
        if(uiUpdatePending) return;
        uiUpdatePending = true;
        
        requestAnimationFrame(() => {
            const count = heroes.filter(h => !h.dead).length;
            if (count === 0 && gameActive) {
                gameActive = false;
            }
            setGameState({
                score,
                wave,
                heroCount: count,
                isGameOver: count === 0
            });
            uiUpdatePending = false;
        });
    }

    // --- Init & Loop ---
    function initGame() {
        heroes.push(new Hero(0, 5, 'TANK'));
        heroes.push(new Hero(-3, 6, 'TANK'));
        heroes.push(new Hero(3, 6, 'TANK'));
        heroes.push(new Hero(-2, 10, 'MAGE'));
        heroes.push(new Hero(2, 10, 'ARCHER'));
        syncUI();
    }

    function animate(time) {
        rafId = requestAnimationFrame(animate);
        if (!gameActive) return;

        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            enemies.push(new Enemy());
            spawnTimer = Math.max(0.3, 2.0 - (wave * 0.15));
            if (score > wave * 200) {
                wave++;
                syncUI();
            }
        }

        heroes.forEach(h => h.update(dt));
        
        // Remove dead or out-of-bounds enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.update(dt);
            if (e.mesh.position.z > 20 || e.dead) {
                if (e.mesh.position.z > 20) scene.remove(e.mesh);
                enemies.splice(i, 1);
            }
        }

        // Remove dead projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.update(dt);
            if (p.dead) projectiles.splice(i, 1);
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            if (!particles[i].update(dt)) particles.splice(i, 1);
        }

        renderer.render(scene, camera);
    }

    initGame();
    rafId = requestAnimationFrame(animate);

    const handleResize = () => {
        if (!mountRef.current) return;
        const {width, height} = getContainerSize();
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(rafId);
        // Cleanup Three.js stuff to avoid leaks (optional but good)
        if(mountRef.current) mountRef.current.innerHTML = '';
        gameActive = false;
        // Note: Full cleanup of geometries/materials is skipped for brevity
    };
  }, []);

  const handleRestart = () => {
      // Simple reload for now, or implement soft reset logic
      window.location.reload(); 
      // In a real app we would reset all arrays and remove meshes from scene
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050510]">
      {/* 3D Container */}
      <div ref={mountRef} className="absolute inset-0 z-0"></div>

      {/* UI Overlay */}
      <div className="absolute top-5 left-5 pointer-events-none z-10 
                      bg-black/50 border border-cyan-400 rounded-lg p-4 
                      text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]">
         <h1 className="text-xl font-bold uppercase tracking-widest mb-2 text-white">防守阵线</h1>
         <div className="text-base my-1">分数: <span className="font-mono font-bold text-white">{gameState.score}</span></div>
         <div className="text-base my-1">波次: <span className="font-mono font-bold text-white">{gameState.wave}</span></div>
         <div className="text-base my-1">存活: <span className="font-mono font-bold text-white">{gameState.heroCount}</span></div>
      </div>

      {/* Game Over Modal */}
      {gameState.isGameOver && (
          <div 
             onClick={handleRestart}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        bg-black/90 border-2 border-rose-600 shadow-[0_0_30px_rgba(225,29,72,0.6)]
                        p-10 rounded text-center cursor-pointer z-50 animate-bounce-in"
          >
             <div className="text-4xl font-bold text-white mb-2">防线失守</div>
             <div className="text-lg text-gray-400">点击重新开始</div>
          </div>
      )}
    </div>
  );
}
