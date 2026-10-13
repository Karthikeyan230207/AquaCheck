"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./WaterQualityScene.module.css";

const PARTICLE_CONFIG = {
  TDS: {
    color: "#bcecff",
    label: "Total Dissolved Solids (TDS)",
    role: "Mineral salts and organic matter dissolved in water.",
  },
  Turbidity: {
    color: "#82e8c1",
    label: "Turbidity",
    role: "Suspended particles causing haziness or cloudiness.",
  },
  "Total Hardness": {
    color: "#9bd5f2",
    label: "Total Hardness",
    role: "Calcium and magnesium minerals dissolved from rock/soil.",
  },
  Chloride: {
    color: "#c5e7ff",
    label: "Chloride",
    role: "Naturally occurring salt ion or indicator of industrial/road runoff.",
  },
  Fluoride: {
    color: "#9ce4ff",
    label: "Fluoride",
    role: "Mineral important in trace amounts but hazardous at higher levels.",
  },
  Nitrate: {
    color: "#c5a9ff",
    label: "Nitrate (NO3)",
    role: "Common runoff contaminant from synthetic fertilizers and sewage.",
  },
  Iron: {
    color: "#ffc080",
    label: "Iron (Fe)",
    role: "Metal affecting color, taste, and causing reddish pipe staining.",
  },
};

function getParticleCount(parameter, mode = "sample") {
  if (parameter.parameter === "pH" || parameter.value == null) return 0;
  if (mode === "normal") return 4;

  const reference = parameter.reference_maximum ?? parameter.permissible_maximum;
  const relativeValue =
    reference && reference > 0
      ? Math.min(parameter.value / reference, 2.5)
      : 0.4;
  const statusBoost =
    parameter.status === "outside_range"
      ? 14
      : parameter.status === "attention"
        ? 7
        : 0;
  return Math.max(4, Math.min(40, 6 + Math.round(relativeValue * 12) + statusBoost));
}

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

function getWaterColor(parameters, mode = "sample") {
  if (mode === "normal") {
    return { color: "#5fc9e8", opacity: 0.5, glow: "#4fd0e6" };
  }

  const phParam = parameters.find((p) => p.parameter === "pH");
  const turbParam = parameters.find((p) => p.parameter === "Turbidity");
  const ironParam = parameters.find((p) => p.parameter === "Iron");

  let color = "#5fc9e8";
  let opacity = 0.55;
  let glow = "#4fd0e6";

  if (phParam && phParam.value != null) {
    if (phParam.value < 6.5) {
      color = "#e59a80";
      glow = "#e5825d";
    } else if (phParam.value > 8.5) {
      color = "#7280e8";
      glow = "#5f6ee6";
    }
  }

  if (ironParam && ironParam.status === "outside_range") {
    color = "#cf8a5c";
    glow = "#d97d41";
    opacity = 0.62;
  } else if (turbParam && turbParam.status === "outside_range") {
    opacity = 0.72;
  }

  return { color, opacity, glow };
}

export default function WaterQualityScene({
  parameters = [],
  viewMode = "sample",
  onSelectParameter,
  selectedParameterName,
}) {
  const hostRef = useRef(null);
  const [sceneError, setSceneError] = useState("");
  const [hoveredInfo, setHoveredInfo] = useState(null);

  useEffect(() => {
    let disposed = false;
    let renderer;
    let animationFrame;
    let resizeObserver;
    let scene;
    let camera;
    let glassGroup;
    let raycaster;
    let mouse;
    let waterSurface;
    let particleMeshes = [];
    let basePositions = [];
    const clock = { t: 0 };

    async function startScene() {
      try {
        const THREE = await import("three");
        const host = hostRef.current;
        if (!host || disposed) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.set(0, 0.15, 6.4);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        host.innerHTML = "";
        host.appendChild(renderer.domElement);

        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2(-999, -999);

        scene.add(new THREE.AmbientLight(0xd6f2ff, 2.4));
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
        keyLight.position.set(-4, 6, 6);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x9fe8ff, 2.0);
        rimLight.position.set(5, -2, -4);
        scene.add(rimLight);
        const underGlow = new THREE.PointLight(0x4bd7f2, 28, 14);
        underGlow.position.set(0, -2.4, 1.5);
        scene.add(underGlow);

        glassGroup = new THREE.Group();
        scene.add(glassGroup);

        const appearance = getWaterColor(parameters, viewMode);
        const glassR = 1.55;
        const glassH = 2.9;

        // Glass body (open cylinder, double-sided, transparent)
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xd9f4ff,
          metalness: 0,
          roughness: 0.05,
          transparent: true,
          opacity: 0.16,
          transmission: 0.9,
          thickness: 0.4,
          side: THREE.DoubleSide,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          depthWrite: false,
        });
        const glassBody = new THREE.Mesh(
          new THREE.CylinderGeometry(glassR, glassR * 0.86, glassH, 64, 1, true),
          glassMat,
        );
        glassGroup.add(glassBody);

        // Glass base (disc)
        const glassBase = new THREE.Mesh(
          new THREE.CylinderGeometry(glassR * 0.86, glassR * 0.86, 0.08, 64),
          new THREE.MeshPhysicalMaterial({
            color: 0xd9f4ff,
            roughness: 0.06,
            transparent: true,
            opacity: 0.35,
            transmission: 0.7,
            thickness: 0.3,
            side: THREE.DoubleSide,
          }),
        );
        glassBase.position.y = -glassH / 2 - 0.04;
        glassGroup.add(glassBase);

        // Rim highlight ring
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(glassR, 0.035, 12, 64),
          new THREE.MeshStandardMaterial({
            color: 0xeafcff,
            emissive: 0x9fe8ff,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.1,
          }),
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = glassH / 2;
        glassGroup.add(rim);

        // Water fill (inside the glass)
        const fillR = glassR - 0.05;
        const fillH = glassH * 0.74;
        const fillY = -glassH / 2 + fillH / 2 + 0.04;
        const water = new THREE.Mesh(
          new THREE.CylinderGeometry(fillR, fillR * 0.9, fillH, 64, 1, true),
          new THREE.MeshPhysicalMaterial({
            color: appearance.color,
            metalness: 0.05,
            roughness: 0.1,
            transparent: true,
            opacity: appearance.opacity,
            transmission: 0.4,
            thickness: 1.2,
            side: THREE.DoubleSide,
            clearcoat: 1,
            clearcoatRoughness: 0.06,
          }),
        );
        water.position.y = fillY;
        glassGroup.add(water);

        // Water surface (top disc, wobbles)
        waterSurface = new THREE.Mesh(
          new THREE.CircleGeometry(fillR, 64),
          new THREE.MeshPhysicalMaterial({
            color: appearance.glow,
            emissive: appearance.glow,
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.5,
            roughness: 0.05,
            side: THREE.DoubleSide,
          }),
        );
        waterSurface.rotation.x = -Math.PI / 2;
        waterSurface.position.y = -glassH / 2 + fillH + 0.04;
        glassGroup.add(waterSurface);

        // Floating particles (the report's contaminants)
        const particlesGroup = new THREE.Group();
        glassGroup.add(particlesGroup);
        particleMeshes = [];
        basePositions = [];
        const rng = makeRng(parameters.length * 977 + 13);
        const waterTop = fillY + fillH / 2;
        const waterBottom = fillY - fillH / 2;

        parameters.forEach((param) => {
          const cfg = PARTICLE_CONFIG[param.parameter] || {
            color: "#d6f2ff",
            label: param.parameter,
            role: "Water quality parameter",
          };
          const count = getParticleCount(param, viewMode);
          if (!count) return;

          const isSelected = selectedParameterName === param.parameter;
          const isNormal = viewMode === "normal";
          const emissive = isNormal
            ? 0.18
            : isSelected
              ? 1.0
              : param.status === "outside_range"
                ? 0.75
                : param.status === "attention"
                  ? 0.45
                  : 0.2;

          const material = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.color,
            emissiveIntensity: emissive,
            roughness: 0.3,
            metalness: 0.05,
          });
          const geometry = new THREE.SphereGeometry(1, 12, 10);

          for (let i = 0; i < count; i += 1) {
            const mesh = new THREE.Mesh(geometry, material);
            const a = rng() * Math.PI * 2;
            const rad = Math.sqrt(rng()) * (fillR - 0.18);
            const x = Math.cos(a) * rad;
            const z = Math.sin(a) * rad;
            const y = waterBottom + 0.12 + rng() * (waterTop - waterBottom - 0.2);
            const size = (isSelected ? 0.075 : 0.05) * (0.7 + rng() * 0.7);
            mesh.scale.setScalar(size);
            mesh.position.set(x, y, z);
            mesh.userData = {
              parameter: param.parameter,
              info: cfg,
              data: param,
              phase: rng() * Math.PI * 2,
              speed: 0.4 + rng() * 0.6,
              spin: (rng() - 0.5) * 0.02,
            };
            particlesGroup.add(mesh);
            particleMeshes.push(mesh);
            basePositions.push(mesh.position.clone());
          }
        });

        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        const resize = () => {
          if (!hostRef.current || !renderer || !camera) return;
          const width = hostRef.current.clientWidth;
          const height = hostRef.current.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        let isDragging = false;
        let previousPointer = { x: 0, y: 0 };
        let rotationY = 0;
        let rotationX = 0;
        let velocityY = 0;
        let velocityX = 0;
        let totalDragDistance = 0;

        host.style.cursor = "grab";

        const handlePointerDown = (event) => {
          isDragging = true;
          previousPointer = { x: event.clientX, y: event.clientY };
          totalDragDistance = 0;
          velocityY = 0;
          velocityX = 0;
          try {
            host.setPointerCapture(event.pointerId);
          } catch {}
          host.style.cursor = "grabbing";
        };

        const handlePointerMove = (event) => {
          const rect = host.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          if (isDragging) {
            const deltaX = event.clientX - previousPointer.x;
            const deltaY = event.clientY - previousPointer.y;
            previousPointer = { x: event.clientX, y: event.clientY };
            totalDragDistance += Math.abs(deltaX) + Math.abs(deltaY);

            rotationY += deltaX * 0.012; // 360-degree horizontal rotation
            rotationX = Math.max(-0.65, Math.min(0.65, rotationX + deltaY * 0.008)); // Vertical tilt
            velocityY = deltaX * 0.007;
            velocityX = deltaY * 0.004;
            host.style.cursor = "grabbing";
          } else {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(particleMeshes);
            if (intersects.length > 0) {
              setHoveredInfo(intersects[0].object.userData);
              host.style.cursor = "pointer";
            } else {
              setHoveredInfo(null);
              host.style.cursor = "grab";
            }
          }
        };

        const handlePointerUp = (event) => {
          if (isDragging) {
            isDragging = false;
            try {
              host.releasePointerCapture(event.pointerId);
            } catch {}
            host.style.cursor = "grab";

            // If user clicked without dragging, select the hovered particle:
            if (totalDragDistance < 6) {
              raycaster.setFromCamera(mouse, camera);
              const intersects = raycaster.intersectObjects(particleMeshes);
              if (intersects.length > 0 && onSelectParameter) {
                onSelectParameter(intersects[0].object.userData.parameter);
              }
            }
          }
        };

        const handlePointerCancel = (event) => {
          isDragging = false;
          try {
            host.releasePointerCapture(event.pointerId);
          } catch {}
          host.style.cursor = "grab";
        };

        host.addEventListener("pointerdown", handlePointerDown);
        host.addEventListener("pointermove", handlePointerMove);
        host.addEventListener("pointerup", handlePointerUp);
        host.addEventListener("pointercancel", handlePointerCancel);

        const render = () => {
          if (disposed) return;
          clock.t += 0.016;

          if (!isDragging) {
            // Apply inertia with smooth damping
            velocityY *= 0.92;
            velocityX *= 0.92;
            rotationY += velocityY;
            rotationX = Math.max(-0.65, Math.min(0.65, rotationX + velocityX));

            // Gentle ambient rotation when not interacting
            if (Math.abs(velocityY) < 0.0004 && !reducedMotion) {
              rotationY += 0.002;
            }
          }

          glassGroup.rotation.y = rotationY;
          glassGroup.rotation.x = rotationX;

          if (!reducedMotion) {
            glassGroup.rotation.z = Math.sin(clock.t * 0.31) * 0.02;
            glassGroup.position.y = Math.sin(clock.t * 0.9) * 0.05;
            waterSurface.position.x = Math.sin(clock.t * 1.6) * 0.02;
            waterSurface.position.z = Math.cos(clock.t * 1.3) * 0.02;
            particleMeshes.forEach((m, idx) => {
              const ud = m.userData;
              const base = basePositions[idx];
              m.position.y = base.y + Math.sin(clock.t * ud.speed + ud.phase) * 0.09;
              m.position.x = base.x + Math.sin(clock.t * ud.speed * 0.7 + ud.phase) * 0.05;
              m.position.z = base.z + Math.cos(clock.t * ud.speed * 0.6 + ud.phase) * 0.05;
              m.rotation.y += ud.spin;
            });
          }
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };
        render();

        return () => {
          host.removeEventListener("pointerdown", handlePointerDown);
          host.removeEventListener("pointermove", handlePointerMove);
          host.removeEventListener("pointerup", handlePointerUp);
          host.removeEventListener("pointercancel", handlePointerCancel);
        };
      } catch {
        if (!disposed) {
          setSceneError(
            "The 3D preview could not start in this browser. The report results are still available below.",
          );
        }
      }
    }

    startScene();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      if (scene) {
        scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
      }
    };
  }, [parameters, viewMode, selectedParameterName, onSelectParameter]);

  return (
    <div className={styles.sceneFrame}>
      <div
        aria-label="Interactive 3D glass of water showing suspended particles"
        className={styles.scene}
        ref={hostRef}
        role="img"
      />
      {hoveredInfo ? (
        <div className={styles.particleTooltip} role="status">
          <strong>{hoveredInfo.info.label}</strong>
          <span>
            {hoveredInfo.data.value != null
              ? `${hoveredInfo.data.value} ${hoveredInfo.data.unit}`
              : "No value"} Â· {hoveredInfo.data.status.replaceAll("_", " ")}
          </span>
          <p>{hoveredInfo.info.role}</p>
          <small className={styles.hint}>Click to inspect parameter details</small>
        </div>
      ) : null}
      <div className={styles.rotateBadge} aria-hidden="true">
        <span>🔄 Drag to rotate 360°</span>
      </div>
      {sceneError ? (
        <p className={styles.sceneError} role="status">
          {sceneError}
        </p>
      ) : null}
    </div>
  );
}
