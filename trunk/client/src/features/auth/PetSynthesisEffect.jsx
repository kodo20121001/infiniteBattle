import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * PetSynthesisEffect
 *
 * Full-screen Three.js synthesis animation overlay.
 * Sequence: idle (cards orbit) → gathering (cards spiral to center) →
 *           white flash → black screen → calls onComplete
 *
 * Props:
 *   onComplete  — called when the screen reaches full black (parent runs
 *                 the actual synthesis logic and fades this overlay out)
 */
export default function PetSynthesisEffect({ onComplete }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // ── Scene ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06040f, 0.018);

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
    camera.position.set(0, 5, 14);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x06040f);
    container.appendChild(renderer.domElement);

    // ── Lights ─────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    const centerLight = new THREE.PointLight(0xffaa00, 0, 25);
    centerLight.position.set(0, 2, 0);
    scene.add(centerLight);

    // ── Card texture helpers ───────────────────────────────────────
    function createCardFrontTexture(name, c1, c2) {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 384;
      const ctx = cv.getContext('2d');

      const bg = ctx.createLinearGradient(0, 0, 256, 384);
      bg.addColorStop(0, c1); bg.addColorStop(1, c2);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 384);

      // Decorative arcs
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 7;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(128, 200, 35 + i * 28, 0, Math.PI * 2); ctx.stroke();
      }
      // Border
      ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 11;
      ctx.strokeRect(8, 8, 240, 368);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, 220, 348);
      // Name strip
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(18, 22, 220, 46);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, 128, 45);
      // Center radial glow
      const glow = ctx.createRadialGradient(128, 210, 5, 128, 210, 90);
      glow.addColorStop(0, 'rgba(255,255,255,0.85)');
      glow.addColorStop(0.5, 'rgba(170,0,255,0.45)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(128, 210, 90, 0, Math.PI * 2); ctx.fill();

      return new THREE.CanvasTexture(cv);
    }

    function createCardBackTexture() {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 384;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#110022'; ctx.fillRect(0, 0, 256, 384);
      ctx.strokeStyle = '#552288'; ctx.lineWidth = 11;
      ctx.strokeRect(8, 8, 240, 368);
      ctx.fillStyle = '#331155';
      ctx.beginPath(); ctx.arc(128, 192, 65, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#aa55ff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(128, 192, 52, 0, Math.PI * 2); ctx.stroke();
      return new THREE.CanvasTexture(cv);
    }

    const backTex = createCardBackTexture();
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const cardGeo = new THREE.BoxGeometry(2.2, 3.3, 0.05);

    // ── 5 material cards ───────────────────────────────────────────
    const infos = [
      { name: '幽影紫狐', c1: '#4a00e0', c2: '#8e2de2' },
      { name: '烈焰火鸟', c1: '#ff416c', c2: '#ff4b2b' },
      { name: '暗夜魔狼', c1: '#1f1c2c', c2: '#928dab' },
      { name: '星芒灵猫', c1: '#654ea3', c2: '#eaafc8' },
      { name: '赤炎狂狮', c1: '#f12711', c2: '#f5af19' },
    ];

    const cardGroup = new THREE.Group();
    scene.add(cardGroup);
    const cardsData = [];

    infos.forEach((info, i) => {
      const frontMat = new THREE.MeshStandardMaterial({
        map: createCardFrontTexture(info.name, info.c1, info.c2),
        roughness: 0.25, metalness: 0.1,
      });
      const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.5 });
      const mats = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
      const card = new THREE.Mesh(cardGeo, mats);

      const angle = (i / 5) * Math.PI * 2;
      const radius = 4.5;
      card.position.set(Math.cos(angle) * radius, 2, Math.sin(angle) * radius);
      card.lookAt(0, 2, 0);
      card.rotation.x -= 0.2;

      cardGroup.add(card);
      cardsData.push({ mesh: card, angle, radius, baseY: 2 });
    });

    // ── Particles ──────────────────────────────────────────────────
    const PARTICLE_COUNT = 700;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    const pSpeeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = Math.random() * 9;
      const th = Math.random() * Math.PI * 2;
      pPos[i * 3] = Math.cos(th) * r;
      pPos[i * 3 + 1] = Math.random() * 11 - 2;
      pPos[i * 3 + 2] = Math.sin(th) * r;
      pSpeeds[i] = Math.random() * 0.05 + 0.015;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

    const pcv = document.createElement('canvas');
    pcv.width = 16; pcv.height = 16;
    const pctx = pcv.getContext('2d');
    pctx.fillStyle = '#fff';
    pctx.beginPath(); pctx.arc(8, 8, 8, 0, Math.PI * 2); pctx.fill();

    const pMat = new THREE.PointsMaterial({
      size: 0.13, map: new THREE.CanvasTexture(pcv),
      transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, color: 0xff88ff,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── Flash & black DOM overlays ─────────────────────────────────
    const flashDiv = document.createElement('div');
    flashDiv.style.cssText =
      'position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:5;';
    container.appendChild(flashDiv);

    const blackDiv = document.createElement('div');
    blackDiv.style.cssText =
      'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:6;transition:opacity 0.55s ease-in;';
    container.appendChild(blackDiv);

    // ── State machine ──────────────────────────────────────────────
    // idle → gathering → flashing → blackout → (done)
    let state = 'idle';
    let stateTime = 0;
    const IDLE_DUR    = 1.0;
    const GATHER_DUR  = 2.8;
    const FLASH_DUR   = 0.18;
    const BLACKOUT_DUR= 0.7;

    let completed = false;
    const clock = new THREE.Clock();
    let animId;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt  = clock.getDelta();
      const t   = clock.getElapsedTime();
      stateTime += dt;

      // Particles always rise, spin faster during gather
      const ptSpeed = state === 'gathering' ? 4 : 1;
      particles.rotation.y += dt * (state === 'gathering' ? 2.5 : 0.25);
      const pa = pGeo.attributes.position;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pa.array[i * 3 + 1] += pSpeeds[i] * ptSpeed;
        if (pa.array[i * 3 + 1] > 9) pa.array[i * 3 + 1] = -2;
      }
      pa.needsUpdate = true;

      // ── idle ──
      if (state === 'idle') {
        cardsData.forEach((c, i) => {
          c.mesh.position.y = c.baseY + Math.sin(t * 2 + i) * 0.28;
          c.angle += dt * 0.12;
          c.mesh.position.x = Math.cos(c.angle) * c.radius;
          c.mesh.position.z = Math.sin(c.angle) * c.radius;
          c.mesh.lookAt(0, c.mesh.position.y, 0);
          c.mesh.rotation.x -= 0.2;
        });
        if (stateTime > IDLE_DUR) { state = 'gathering'; stateTime = 0; }
      }

      // ── gathering ──
      else if (state === 'gathering') {
        const p = Math.min(stateTime / GATHER_DUR, 1);
        const ease = p * p * p;

        cardsData.forEach((c) => {
          c.angle  += dt * (0.5 + ease * 18);
          c.radius  = 4.5 * (1 - ease);
          c.mesh.position.x = Math.cos(c.angle) * c.radius;
          c.mesh.position.z = Math.sin(c.angle) * c.radius;
          c.mesh.position.y += (2 - c.mesh.position.y) * 0.1;
          c.mesh.rotation.y += dt * 12 * ease;
          c.mesh.rotation.x += dt *  6 * ease;
        });

        centerLight.intensity = ease * 14;

        // Camera shake in last 40 %
        if (stateTime > GATHER_DUR * 0.6) {
          const shk = (stateTime - GATHER_DUR * 0.6) * 0.35;
          camera.position.x = (Math.random() - 0.5) * shk;
          camera.position.y = 5 + (Math.random() - 0.5) * shk;
        }

        if (stateTime >= GATHER_DUR) {
          state = 'flashing'; stateTime = 0;
          cardGroup.visible = false;
          // Instant white flash
          flashDiv.style.transition = 'opacity 0.06s ease-out';
          flashDiv.style.opacity = '1';
        }
      }

      // ── flashing ──
      else if (state === 'flashing') {
        if (stateTime >= FLASH_DUR) {
          state = 'blackout'; stateTime = 0;
          flashDiv.style.transition = 'opacity 0.3s ease-in';
          flashDiv.style.opacity = '0';
          blackDiv.style.opacity = '1';  // CSS transition fades to black
        }
      }

      // ── blackout ──
      else if (state === 'blackout') {
        if (stateTime >= BLACKOUT_DUR && !completed) {
          completed = true;
          onComplete?.();
        }
      }

      // Smoothly return camera when not shaking
      if (state !== 'gathering' || stateTime < GATHER_DUR * 0.6) {
        camera.position.x += (0 - camera.position.x) * 0.1;
        camera.position.y += (5 - camera.position.y) * 0.1;
      }
      camera.lookAt(0, 1, 0);

      renderer.render(scene, camera);
    }

    animate();

    // Resize
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(flashDiv))  container.removeChild(flashDiv);
      if (container.contains(blackDiv))  container.removeChild(blackDiv);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        zIndex: 200,
        overflow: 'hidden',
        background: '#06040f',
      }}
    />
  );
}
