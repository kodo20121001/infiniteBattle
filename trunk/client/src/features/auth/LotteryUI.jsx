import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { motion } from 'framer-motion';

export default function LotteryUI() {
  const mountRef = useRef(null);
  const [diceResult, setDiceResult] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [playerPositionIndex, setPlayerPositionIndex] = useState(0);

  useEffect(() => {
    // --- Configuration ---
    const BOARD_SIZE = 10;
    const TILE_SIZE = 2;
    const TILE_SPACING = 0.2;
    const COLORS = {
      bg: 0x202025,
      tileOdd: 0x6d5a7a, // Lighter purple
      tileEven: 0x856e91, // Even lighter purple
      player: 0x3b82f6,
      boss: 0xef4444,
      wall: 0x2d2d2d,
      ground: 0x1a221a // Dark green ground
    };

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);
    scene.fog = new THREE.Fog(COLORS.bg, 40, 120);

    const getContainerSize = () => {
        if (mountRef.current) {
            return { width: mountRef.current.clientWidth, height: mountRef.current.clientHeight };
        }
        return { width: window.innerWidth, height: window.innerHeight };
    };

    const { width, height } = getContainerSize();
    const aspect = width / height;
    const d = 22;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    
    // Initial camera setup - ensure we see the board
    // Board is roughly centered, but let's look at the center of the board
    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Fix: Modern Three.js uses Linear sRGB by default which looks dark. 
    // We must convert to SRGBColorSpace to match the old bright look.
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    if (mountRef.current) {
        mountRef.current.innerHTML = '';
        mountRef.current.appendChild(renderer.domElement);
    }

    // --- Lighting ---
    // With SRGBColorSpace and modern physically correct lighting, we need stronger values.
    
    // 1. Ambient - Base brightness
    const ambientLight = new THREE.AmbientLight(0xffffff, 3.5);
    scene.add(ambientLight);

    // 2. Main Directional Light (Sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 5.0);
    dirLight.position.set(20, 40, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    // 3. Fill Light
    const fillLight = new THREE.DirectionalLight(0xaaccff, 2.5);
    fillLight.position.set(-20, 10, -20);
    scene.add(fillLight);

    // --- Board Generation ---
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);

    const tileMat1 = new THREE.MeshStandardMaterial({ color: COLORS.tileOdd, roughness: 0.1 });
    const tileMat2 = new THREE.MeshStandardMaterial({ color: COLORS.tileEven, roughness: 0.1 });

    const pathTiles = [];
    const pathCoordinates = [];

    function createTile(x, z, index) {
      const geometry = new THREE.BoxGeometry(TILE_SIZE, 0.6, TILE_SIZE);
      const mat = index % 2 === 0 ? tileMat1 : tileMat2;
      const tile = new THREE.Mesh(geometry, mat);
      tile.position.set(x, 0, z);
      tile.receiveShadow = true;
      tile.castShadow = true;

      boardGroup.add(tile);
      pathTiles.push(tile);
      // y=0.6 because tile height is 0.6, so top is at 0.3. However, original code implies player stands higher?
      // Re-checking original code: "pathCoordinates.push(new THREE.Vector3(x, 0.6, z));"
      // Wait, box geometry height 0.6 means y ranges from -0.3 to +0.3 if centered at 0.
      // Tile position y=0. Top surface is at +0.3. Player needs to be at least at 0.3.
      // Original code had 0.6, maybe to float a bit? Let's stick to 0.6.
      pathCoordinates.push(new THREE.Vector3(x, 0.6, z));

      const rand = Math.random();
      if (index !== 0) {
          if (rand > 0.8) {
              // Chest
              const geo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
              const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.3 });
              const prop = new THREE.Mesh(geo, mat);
              prop.position.y = 0.7; // 0.3 (tile top) + 0.4 (half height)
              
              // Add lock detail (from HTML version)
              const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.1), new THREE.MeshBasicMaterial({color:0x000000}));
              lock.position.z = 0.4;
              prop.add(lock);

              prop.castShadow = true;
              tile.add(prop);
          } else if (rand > 0.6) {
              // Question block
              const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
              const mat = new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x114411 });
              const prop = new THREE.Mesh(geo, mat);
              prop.position.y = 1.2;
              prop.rotation.x = Math.PI / 4; // Added from HTML
              prop.rotation.y = Math.PI / 4;
              prop.castShadow = true;
              tile.add(prop);
              gsap.to(prop.position, { y: 1.5, duration: 1, yoyo: true, repeat: -1, ease: "sine.inOut" });
              gsap.to(prop.rotation, { y: Math.PI * 2.25, duration: 3, repeat: -1, ease: "linear" });
          } else if (rand > 0.4) {
             // Equipment (Sword) - Added from HTML
            const group = new THREE.Group();
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.1), new THREE.MeshStandardMaterial({color: 0xdddddd, metalness: 0.8, roughness: 0.2}));
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.15), new THREE.MeshStandardMaterial({color: 0x8b4513}));
            blade.position.y = 0.75;
            group.add(blade);
            group.add(handle);
            group.position.y = 0.6;
            group.rotation.z = Math.PI / 6;
            group.castShadow = true;
            tile.add(group);
        }
      }
    }

    // Path Generation (Square Loop)
    const offset = (BOARD_SIZE * (TILE_SIZE + TILE_SPACING)) / 2;
    // Bottom
    for(let i=0; i<BOARD_SIZE; i++) createTile(offset - i * (TILE_SIZE + TILE_SPACING), offset, pathTiles.length);
    // Left
    for(let i=1; i<BOARD_SIZE; i++) createTile(-offset + (TILE_SIZE + TILE_SPACING), offset - i * (TILE_SIZE + TILE_SPACING), pathTiles.length);
    // Top
    for(let i=1; i<BOARD_SIZE; i++) createTile(-offset + (i+1) * (TILE_SIZE + TILE_SPACING), -offset + (TILE_SIZE + TILE_SPACING), pathTiles.length);
    // Right
    for(let i=1; i<BOARD_SIZE - 1; i++) createTile(offset, -offset + (i+1) * (TILE_SIZE + TILE_SPACING), pathTiles.length);

    // Center Boss Area
    const centerGeo = new THREE.BoxGeometry(BOARD_SIZE * 1.5, 3, BOARD_SIZE * 1.5);
    const centerMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const centerPlatform = new THREE.Mesh(centerGeo, centerMat);
    centerPlatform.position.y = -1.5;
    centerPlatform.receiveShadow = true;
    scene.add(centerPlatform);

    // Boss
    const bossGroup = new THREE.Group();
    const bodyGeo = new THREE.DodecahedronGeometry(2.5, 0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x883333, flatShading: true });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.5;
    bossGroup.add(body);

    // Glowing Eyes (Added from HTML)
    const eyeGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(0.8, 3, 2);
    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye2.position.set(-0.8, 3, 2);
    bossGroup.add(eye1, eye2);

    bossGroup.rotation.y = Math.PI / 4;
    bossGroup.castShadow = true;
    scene.add(bossGroup);
    gsap.to(bossGroup.position, { y: 0.5, duration: 2, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // Player
    const playerGroup = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pBody.position.y = 0.6;
    const pHat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pHat.position.y = 1.6;
    const pBeak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    pBeak.rotation.x = -Math.PI / 2;
    pBeak.position.set(0, 1.4, 0.5);
    playerGroup.add(pBody, pHat, pBeak);
    playerGroup.castShadow = true;
    scene.add(playerGroup);

    playerGroup.position.copy(pathCoordinates[0]);

    // Expose move function to component
    window.gameMovePlayer = (steps) => {
        let currentStep = 0;
        let pIndex = window.currentPlayerIndex || 0;

        function takeStep() {
            if (currentStep >= steps) {
                setIsRolling(false);
                 // land effect
                 const currentTile = pathTiles[pIndex];
                 if(currentTile) {
                    gsap.to(currentTile.position, { y: -0.3, duration: 0.1, yoyo: true, repeat: 1 });
                    const originalColor = currentTile.material.color.getHex();
                    currentTile.material.color.setHex(0xffffff);
                    setTimeout(() => currentTile.material.color.setHex(originalColor), 200);
                 }
                return;
            }

            pIndex = (pIndex + 1) % pathCoordinates.length;
            window.currentPlayerIndex = pIndex; // Update global state
            
            const nextPos = pathCoordinates[pIndex];
            playerGroup.lookAt(nextPos.x, playerGroup.position.y, nextPos.z);

            const tl = gsap.timeline({ onComplete: takeStep });
            
            tl.to(playerGroup.position, {
                x: nextPos.x,
                z: nextPos.z,
                duration: 0.35,
                ease: "power1.inOut"
            }, 0);
            
            tl.to(playerGroup.position, {
                y: nextPos.y + 1.5,
                duration: 0.175,
                ease: "power1.out",
                yoyo: true,
                repeat: 1
            }, 0);

            tl.to(playerGroup.scale, { y: 1.2, x: 0.8, z: 0.8, duration: 0.1 }, 0);
            tl.to(playerGroup.scale, { y: 0.8, x: 1.2, z: 1.2, duration: 0.1 }, 0.25);
            tl.to(playerGroup.scale, { y: 1, x: 1, z: 1, duration: 0.1 }, 0.35);

            gsap.to(camera.position, {
                x: nextPos.x + 30,
                z: nextPos.z + 30,
                duration: 0.8,
                ease: "power2.out"
            });

            currentStep++;
        }
        takeStep();
    }
    
    // Initial state
    window.currentPlayerIndex = 0;

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if (!mountRef.current) return;
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        const aspect = width / height;
        
        camera.left = -d * aspect;
        camera.right = d * aspect;
        camera.top = d;
        camera.bottom = -d;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if(mountRef.current) mountRef.current.innerHTML = ''; // Cleanup
      delete window.gameMovePlayer;
      delete window.currentPlayerIndex;
    };
  }, []);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    const steps = Math.floor(Math.random() * 6) + 1;
    setDiceResult(steps);
    
    // Slight delay for animation sync
    setTimeout(() => {
        if(window.gameMovePlayer) window.gameMovePlayer(steps);
    }, 500);

    // Hide result after a bit
    setTimeout(() => setDiceResult(''), 1500);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* 3D Container */}
      <div ref={mountRef} className="absolute inset-0 z-0"></div>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10">
        
        {/* Top Bar */}
        <div className="p-4 flex justify-between items-start">
            <div className="bg-black/60 border-2 border-slate-600 rounded-full px-4 py-1.5 flex items-center gap-2 text-white font-bold">
                <div className="w-5 h-5 bg-rose-500 border border-white rotate-45 transform"></div>
                <span>132</span>
            </div>
            <div className="bg-black/60 border-2 border-slate-600 rounded-full px-4 py-1.5 text-white font-bold min-w-[50px] text-center">
                ||
            </div>
        </div>

        {/* Dice Result Display */}
        {diceResult && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.5, y: "-50%", x: "-50%" }}
             animate={{ opacity: 1, scale: 1.5, y: "-50%", x: "-50%" }}
             exit={{ opacity: 0 }}
             className="absolute top-1/2 left-1/2 text-8xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] z-20 pointer-events-none"
           >
             {diceResult}
           </motion.div>
        )}

        {/* Bottom Controls */}
        <div className="p-6 flex flex-col items-center gap-4 pointer-events-auto bg-gradient-to-t from-black/80 to-transparent pb-24">
            {/* HP Bar */}
            <div className="w-[300px] h-6 bg-gray-800 border-[3px] border-black relative flex items-center justify-center">
                <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-800 border-2 border-white rotate-45 flex items-center justify-center z-10">
                    <span className="text-white font-bold -rotate-45 text-sm">8</span>
                </div>
                <div className="absolute left-0 top-0 h-full bg-green-400 w-full z-0"></div>
                <span className="relative z-10 text-white text-xs font-bold drop-shadow-md">475 / 475</span>
            </div>

            {/* Equip Bar */}
            <div className="flex gap-2.5 bg-black/70 p-2.5 border-2 border-black rounded">
                 <EquipSlot active level={7} color="cyan" />
                 <EquipSlot level={5} color="gold" shape="circle" />
                 <EquipSlot level={8} color="purple" />
                 <EquipSlot level={8} color="gray" />
            </div>

            {/* Roll Button */}
            <motion.button
              whileTap={{ scale: 0.95, y: 4 }}
              disabled={isRolling}
              onClick={handleRoll}
              className={`
                w-40 h-16 rounded-xl border-none 
                text-2xl font-black text-white tracking-widest uppercase
                shadow-lg transition-all
                ${isRolling 
                    ? 'bg-gray-600 cursor-not-allowed border-b-4 border-gray-800' 
                    : 'bg-red-500 border-b-[6px] border-red-800 hover:bg-red-400 cursor-pointer'}
              `}
            >
              ROLL
            </motion.button>
        </div>
      </div>
    </div>
  );
}

function EquipSlot({ active, level, color, shape }) {
    return (
        <div className={`w-12 h-12 bg-[#222] border-2 flex items-center justify-center relative ${active ? 'border-green-400' : 'border-gray-600'}`}>
            <span className="absolute top-0.5 left-0.5 text-[10px] text-white font-mono leading-none">{level}</span>
            <div 
              className="w-8 h-8" 
              style={{ 
                  background: color,
                  borderRadius: shape === 'circle' ? '50%' : '2px',
                  // simplistic triangle approximation for demo if needed, but css clip-path is better
                  clipPath: color === 'cyan' ? 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' : 'none' 
              }} 
            />
        </div>
    );
}
