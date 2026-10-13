"use client";

import { useEffect, useRef } from "react";
import styles from "./Background3D.module.css";

/**
 * Creates a high-fidelity realistic water bubble texture with:
 * - Specular highlight reflection (sunlight glint)
 * - Translucent fluid body
 * - Luminous Fresnel refraction rim
 */
function createWaterBubbleTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  // Soft atmospheric aquatic glow
  const glow = ctx.createRadialGradient(64, 64, 42, 64, 64, 64);
  glow.addColorStop(0, "rgba(56, 189, 248, 0.45)");
  glow.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  // Glassy bubble body with translucent center
  const body = ctx.createRadialGradient(64, 64, 18, 64, 64, 52);
  body.addColorStop(0, "rgba(235, 250, 255, 0.05)");
  body.addColorStop(0.65, "rgba(56, 189, 248, 0.22)");
  body.addColorStop(0.92, "rgba(125, 230, 255, 0.85)");
  body.addColorStop(1, "rgba(255, 255, 255, 0.95)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();

  // Specular gleam highlight on top-left of bubble
  const spec = ctx.createRadialGradient(47, 43, 2, 47, 43, 16);
  spec.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  spec.addColorStop(0.5, "rgba(255, 255, 255, 0.45)");
  spec.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(47, 43, 16, 0, Math.PI * 2);
  ctx.fill();

  // Secondary subtle bottom-right bounce reflection
  const bounce = ctx.createRadialGradient(78, 80, 2, 78, 80, 14);
  bounce.addColorStop(0, "rgba(45, 212, 191, 0.65)");
  bounce.addColorStop(1, "rgba(45, 212, 191, 0)");
  ctx.fillStyle = bounce;
  ctx.beginPath();
  ctx.arc(78, 80, 14, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates soft underwater caustics / light ray texture
 */
function createCausticTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.3, "rgba(125, 235, 255, 0.8)");
  grad.addColorStop(0.7, "rgba(45, 212, 191, 0.2)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Interactive 3D Water Background for AquaCheck.
 * Features:
 * - Fluid undulating 3D water surface mesh with live normal calculations & dynamic caustics
 * - Shimmering aquatic wave grid with light reflection
 * - Realistic rising air/water bubbles with specular reflections and buoyancy sway
 * - Interactive mouse ripple physics & smooth camera parallax
 * - Underwater lighting shafts with tropical blue & mint caustics
 */
export default function Background3D() {
  const hostRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let animationFrameId = null;
    let renderer = null;
    let scene = null;
    let camera = null;

    const disposables = [];

    async function init() {
      try {
        const THREE = await import("three");
        const container = hostRef.current;
        if (!container || disposed) return;

        // 1. Scene & Underwater Atmosphere
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x021526, 0.024);

        const width = window.innerWidth || 1200;
        const height = window.innerHeight || 800;

        camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 1000);
        camera.position.set(0, 4.2, 17);
        camera.lookAt(0, -0.5, -3);

        // 2. WebGL Renderer
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0);

        container.innerHTML = "";
        container.appendChild(renderer.domElement);

        // 3. Underwater Lighting
        const ambientLight = new THREE.AmbientLight(0x0e3b54, 2.2);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xcffafe, 3.2);
        sunLight.position.set(-8, 14, 10);
        scene.add(sunLight);

        // Orbiting cyan/teal aquatic light points for water glimmer
        const waterLight1 = new THREE.PointLight(0x38bdf8, 26, 32);
        waterLight1.position.set(-6, -2, 2);
        scene.add(waterLight1);

        const waterLight2 = new THREE.PointLight(0x2dd4bf, 22, 28);
        waterLight2.position.set(7, 2, -2);
        scene.add(waterLight2);

        // -------------------------------------------------------------
        // 4. WATER SURFACE: Dynamic Fluid Ripple Mesh
        // -------------------------------------------------------------
        const planeW = 62;
        const planeH = 62;
        const segX = 48;
        const segY = 48;

        const waterGeom = new THREE.PlaneGeometry(planeW, planeH, segX, segY);
        waterGeom.rotateX(-Math.PI * 0.44);
        waterGeom.translate(0, -4.6, -4);
        disposables.push(waterGeom);

        // Base vertex positions for wave calculations
        const posAttr = waterGeom.attributes.position;
        const vertexCount = posAttr.count;
        const baseCoords = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount * 3; i++) {
          baseCoords[i] = posAttr.array[i];
        }

        // Shimmering physical water surface material
        const waterMat = new THREE.MeshPhysicalMaterial({
          color: 0x0284c7,
          emissive: 0x03283f,
          emissiveIntensity: 0.45,
          roughness: 0.12,
          metalness: 0.1,
          transmission: 0.72,
          transparent: true,
          opacity: 0.48,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          side: THREE.DoubleSide,
        });
        disposables.push(waterMat);

        const waterMesh = new THREE.Mesh(waterGeom, waterMat);
        scene.add(waterMesh);

        // Caustic Wireframe Grid overlay (illuminated water ripples)
        const causticMat = new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          wireframe: true,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
        });
        disposables.push(causticMat);

        const causticMesh = new THREE.Mesh(waterGeom, causticMat);
        causticMesh.position.y += 0.02;
        scene.add(causticMesh);

        // -------------------------------------------------------------
        // 5. WATER BUBBLES: Realistic Rising Air Bubbles
        // -------------------------------------------------------------
        const bubbleTexture = createWaterBubbleTexture(THREE);
        if (bubbleTexture) disposables.push(bubbleTexture);

        const bubbleCount = 95;
        const bubblePositions = new Float32Array(bubbleCount * 3);
        const bubbleColors = new Float32Array(bubbleCount * 3);
        const bubbleData = [];

        const colorAqua = new THREE.Color("#7fe6ff");
        const colorMint = new THREE.Color("#a7f3d0");
        const colorPure = new THREE.Color("#ffffff");
        const tmpColor = new THREE.Color();

        for (let i = 0; i < bubbleCount; i++) {
          const bx = (Math.random() - 0.5) * 36;
          const by = (Math.random() - 0.5) * 26;
          const bz = -18 + Math.random() * 26;

          bubblePositions[i * 3] = bx;
          bubblePositions[i * 3 + 1] = by;
          bubblePositions[i * 3 + 2] = bz;

          const tint = Math.random();
          if (tint > 0.6) {
            tmpColor.copy(colorAqua);
          } else if (tint > 0.3) {
            tmpColor.copy(colorMint);
          } else {
            tmpColor.copy(colorPure);
          }

          bubbleColors[i * 3] = tmpColor.r;
          bubbleColors[i * 3 + 1] = tmpColor.g;
          bubbleColors[i * 3 + 2] = tmpColor.b;

          bubbleData.push({
            vy: 0.015 + Math.random() * 0.028,
            swaySpeed: 0.8 + Math.random() * 1.5,
            swayAmp: 0.012 + Math.random() * 0.02,
            swayPhase: Math.random() * Math.PI * 2,
            baseX: bx,
            z: bz,
          });
        }

        const bubbleGeometry = new THREE.BufferGeometry();
        bubbleGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(bubblePositions, 3)
        );
        bubbleGeometry.setAttribute(
          "color",
          new THREE.BufferAttribute(bubbleColors, 3)
        );
        disposables.push(bubbleGeometry);

        const bubbleMaterial = new THREE.PointsMaterial({
          size: 0.68,
          vertexColors: true,
          transparent: true,
          opacity: 0.82,
          map: bubbleTexture,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        disposables.push(bubbleMaterial);

        const bubblePoints = new THREE.Points(bubbleGeometry, bubbleMaterial);
        scene.add(bubblePoints);

        // -------------------------------------------------------------
        // 6. UNDERWATER CAUSTIC RAYS (Refracted Sunlight Ribbons)
        // -------------------------------------------------------------
        const causticTexture = createCausticTexture(THREE);
        if (causticTexture) disposables.push(causticTexture);

        const raysGroup = new THREE.Group();
        scene.add(raysGroup);

        const rayGeom = new THREE.PlaneGeometry(32, 22);
        disposables.push(rayGeom);

        const rayMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.09,
          map: causticTexture,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        disposables.push(rayMat);

        const rayMesh1 = new THREE.Mesh(rayGeom, rayMat);
        rayMesh1.position.set(-6, 2, -10);
        rayMesh1.rotation.set(-0.35, 0.45, -0.2);
        raysGroup.add(rayMesh1);

        const rayMesh2 = new THREE.Mesh(rayGeom, rayMat);
        rayMesh2.position.set(8, 0, -14);
        rayMesh2.rotation.set(-0.4, -0.35, 0.25);
        raysGroup.add(rayMesh2);

        // -------------------------------------------------------------
        // 7. Interactive Cursor & Motion Tracking
        // -------------------------------------------------------------
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const onPointerMove = (e) => {
          const cx = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
          const cy = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
          mouseX = (cx / window.innerWidth) * 2 - 1;
          mouseY = -(cy / window.innerHeight) * 2 + 1;
        };

        window.addEventListener("pointermove", onPointerMove, { passive: true });

        const onResize = () => {
          if (!renderer || !camera) return;
          const w = window.innerWidth;
          const h = window.innerHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener("resize", onResize, { passive: true });

        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        // -------------------------------------------------------------
        // 8. Animation & Fluid Physics Loop
        // -------------------------------------------------------------
        const clock = new THREE.Clock();

        const render = () => {
          if (disposed) return;

          const delta = Math.min(clock.getDelta(), 0.1);
          const elapsed = clock.getElapsedTime();

          // Damped spring physics for camera parallax
          targetX += (mouseX - targetX) * 0.045;
          targetY += (mouseY - targetY) * 0.045;

          camera.position.x = targetX * 2.4;
          camera.position.y = 4.2 + targetY * 1.4;
          camera.lookAt(targetX * 0.5, -0.5, -3);

          // Animate orbiting underwater lights
          waterLight1.position.x = Math.sin(elapsed * 0.6) * 10 - 2;
          waterLight1.position.z = Math.cos(elapsed * 0.5) * 8 - 4;
          waterLight2.position.x = Math.cos(elapsed * 0.7) * 10 + 2;
          waterLight2.position.z = Math.sin(elapsed * 0.6) * 8 - 6;

          if (!prefersReducedMotion) {
            // A. Fluid Water Surface Wave Simulation
            const pArray = posAttr.array;

            for (let i = 0; i < vertexCount; i++) {
              const bx = baseCoords[i * 3];
              const bz = baseCoords[i * 3 + 2];

              // Multi-harmonic fluid wave formula (creates organic ocean/water swells)
              const wave1 = Math.sin(bx * 0.18 + elapsed * 1.4 + bz * 0.14) * 0.85;
              const wave2 = Math.cos(bx * 0.11 - elapsed * 0.95 + bz * 0.2) * 0.55;
              const wave3 = Math.sin((bx + bz) * 0.28 + elapsed * 1.8) * 0.22;

              // Cursor ripple response (water disturbance near mouse position)
              const dx = bx - targetX * 14;
              const dz = bz - targetY * 8;
              const distFromMouse = Math.sqrt(dx * dx + dz * dz);
              const mouseRipple =
                distFromMouse < 9
                  ? Math.sin(distFromMouse * 1.6 - elapsed * 4.0) *
                    (1 - distFromMouse / 9) *
                    0.4
                  : 0;

              pArray[i * 3 + 1] = baseCoords[i * 3 + 1] + wave1 + wave2 + wave3 + mouseRipple;
            }

            posAttr.needsUpdate = true;
            waterGeom.computeVertexNormals();

            // B. Rising Air/Water Bubbles
            const bArray = bubbleGeometry.attributes.position.array;

            for (let i = 0; i < bubbleCount; i++) {
              const b = bubbleData[i];
              b.swayPhase += b.swaySpeed * delta;

              // Ascend + lateral sinusoidal sway
              bArray[i * 3 + 1] += b.vy;
              bArray[i * 3] = b.baseX + Math.sin(b.swayPhase) * (b.swayAmp * 18);

              // Wrap-around to bottom when reaching the top surface
              if (bArray[i * 3 + 1] > 14) {
                bArray[i * 3 + 1] = -14;
                b.baseX = (Math.random() - 0.5) * 36;
                bArray[i * 3] = b.baseX;
              }
            }
            bubbleGeometry.attributes.position.needsUpdate = true;

            // C. Underwater Light Rays Sway
            rayMesh1.rotation.z = Math.sin(elapsed * 0.3) * 0.08 - 0.2;
            rayMesh2.rotation.z = Math.cos(elapsed * 0.25) * 0.07 + 0.25;
            raysGroup.position.x = Math.sin(elapsed * 0.15) * 1.2;
          }

          renderer.render(scene, camera);
          animationFrameId = window.requestAnimationFrame(render);
        };

        render();

        return () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("resize", onResize);
        };
      } catch (err) {
        console.warn("AquaCheck: 3D water background initialization failed", err);
      }
    }

    const cleanupInitPromise = init();

    return () => {
      disposed = true;
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);

      cleanupInitPromise.then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });

      disposables.forEach((item) => {
        if (item && typeof item.dispose === "function") {
          item.dispose();
        }
      });

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={styles.canvasContainer}
      ref={hostRef}
    />
  );
}
