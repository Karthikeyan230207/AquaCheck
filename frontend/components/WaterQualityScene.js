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

  if (mode === "normal") {
    // Normal / baseline visual: minimal particle density
    return 4;
  }

  const reference = parameter.reference_maximum ?? parameter.permissible_maximum;
  const relativeValue =
    reference && reference > 0
      ? Math.min(parameter.value / reference, 2.5)
      : 0.4;
  const statusBoost =
    parameter.status === "outside_range"
      ? 12
      : parameter.status === "attention"
        ? 6
        : 0;
  return Math.max(3, Math.min(32, 4 + Math.round(relativeValue * 10) + statusBoost));
}

function getWaterColor(parameters, mode = "sample") {
  if (mode === "normal") {
    return { color: "#55c6e5", opacity: 0.42, glow: "#49c9e4" };
  }

  const phParam = parameters.find((p) => p.parameter === "pH");
  const turbParam = parameters.find((p) => p.parameter === "Turbidity");
  const ironParam = parameters.find((p) => p.parameter === "Iron");

  let color = "#55c6e5";
  let opacity = 0.48;
  let glow = "#49c9e4";

  if (phParam && phParam.value != null) {
    if (phParam.value < 6.5) {
      color = "#e5987d"; // acidic yellowish/orange tint
      glow = "#e5825d";
    } else if (phParam.value > 8.5) {
      color = "#6f7de5"; // high alkaline purplish/deep blue
      glow = "#586be5";
    }
  }

  if (ironParam && ironParam.status === "outside_range") {
    color = "#cc885a";
    glow = "#d97d41";
    opacity = 0.58;
  } else if (turbParam && turbParam.status === "outside_range") {
    opacity = 0.65;
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
    let waterGroup;
    let raycaster;
    let mouse;
    let interactiveMeshes = [];

    async function startScene() {
      try {
        const THREE = await import("three");
        const host = hostRef.current;
        if (!host || disposed) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 5.2);

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

        scene.add(new THREE.AmbientLight(0xc9efff, 2.2));
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
        keyLight.position.set(-3, 4, 5);
        scene.add(keyLight);
        const glowLight = new THREE.PointLight(0x4bd7f2, 35, 12);
        glowLight.position.set(2, -1, 2);
        scene.add(glowLight);

        waterGroup = new THREE.Group();
        scene.add(waterGroup);

        const waterAppearance = getWaterColor(parameters, viewMode);

        const water = new THREE.Mesh(
          new THREE.SphereGeometry(1.35, 64, 48),
          new THREE.MeshPhysicalMaterial({
            color: waterAppearance.color,
            metalness: 0.05,
            roughness: 0.12,
            transparent: true,
            opacity: waterAppearance.opacity,
            transmission: 0.28,
            thickness: 0.8,
            clearcoat: 1,
            clearcoatRoughness: 0.08,
          }),
        );
        waterGroup.add(water);

        const innerGlow = new THREE.Mesh(
          new THREE.SphereGeometry(1.27, 48, 36),
          new THREE.MeshBasicMaterial({
            color: waterAppearance.glow,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
          }),
        );
        waterGroup.add(innerGlow);

        const particlesGroup = new THREE.Group();
        waterGroup.add(particlesGroup);
        interactiveMeshes = [];

        parameters.forEach((param, parameterIndex) => {
          const cfg = PARTICLE_CONFIG[param.parameter] || {
            color: "#d6f2ff",
            label: param.parameter,
            role: "Water quality parameter",
          };
          const count = getParticleCount(param, viewMode);
          if (!count) return;

          const isSelected = selectedParameterName === param.parameter;

          const material = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.color,
            emissiveIntensity:
              isSelected
                ? 0.95
                : param.status === "outside_range"
                  ? 0.7
                  : param.status === "attention"
                    ? 0.4
                    : 0.18,
            roughness: 0.28,
            metalness: 0.04,
          });

          const baseRadius = isSelected ? 0.055 : 0.035;
          const geometry = new THREE.SphereGeometry(baseRadius, 12, 10);

          for (let index = 0; index < count; index += 1) {
            const seed = (parameterIndex + 1) * 91 + index * 37;
            const y = 1 - (index / count) * 2;
            const radius = 1.12 * Math.sqrt(1 - y * y);
            const angle = seed * 2.399963;
            const depth = ((seed % 17) / 17 - 0.5) * 0.72;
            const dot = new THREE.Mesh(geometry, material);
            const size = 0.65 + ((seed * 7) % 9) / 12;
            dot.scale.setScalar(size);
            dot.position.set(
              Math.cos(angle) * radius,
              y * 1.12,
              Math.sin(angle) * radius + depth,
            );
            dot.userData = {
              parameter: param.parameter,
              info: cfg,
              data: param,
            };
            particlesGroup.add(dot);
            interactiveMeshes.push(dot);
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

        // Pointer interactions for clicking/hovering particles
        const handlePointerMove = (event) => {
          const rect = host.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(interactiveMeshes);
          if (intersects.length > 0) {
            const topHit = intersects[0].object.userData;
            setHoveredInfo(topHit);
            host.style.cursor = "pointer";
          } else {
            setHoveredInfo(null);
            host.style.cursor = "default";
          }
        };

        const handleClick = (event) => {
          const rect = host.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(interactiveMeshes);
          if (intersects.length > 0) {
            const hitData = intersects[0].object.userData;
            if (onSelectParameter) {
              onSelectParameter(hitData.parameter);
            }
          }
        };

        host.addEventListener("pointermove", handlePointerMove);
        host.addEventListener("click", handleClick);

        const render = () => {
          if (disposed) return;
          if (!reducedMotion && waterGroup) waterGroup.rotation.y += 0.0022;
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };
        render();

        return () => {
          host.removeEventListener("pointermove", handlePointerMove);
          host.removeEventListener("click", handleClick);
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
        aria-label="Interactive 3D water quality sphere"
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
              : "No value"} · {hoveredInfo.data.status.replaceAll("_", " ")}
          </span>
          <p>{hoveredInfo.info.role}</p>
          <small className={styles.hint}>Click to inspect parameter details</small>
        </div>
      ) : null}
      {sceneError ? (
        <p className={styles.sceneError} role="status">
          {sceneError}
        </p>
      ) : null}
    </div>
  );
}
