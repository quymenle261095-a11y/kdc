'use client';

import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const GALAXY_COLOR_PRESETS = {
  phantom_black: { name: 'Phantom Black', hex: '#191a1c', metallic: 0.9, roughness: 0.15, glassColor: '#121213' },
  botanic_green: { name: 'Botanic Green', hex: '#2e3a34', metallic: 0.85, roughness: 0.2, glassColor: '#242e29' },
  cream: { name: 'Cream', hex: '#f3efe6', metallic: 0.8, roughness: 0.18, glassColor: '#ece7dc' },
  lavender: { name: 'Lavender', hex: '#d3cad9', metallic: 0.8, roughness: 0.2, glassColor: '#c6b9cd' },
} as const;

export type GalaxyColorKey = keyof typeof GALAXY_COLOR_PRESETS;
export type GalaxyHotspotKey = 'overall' | 'camera' | 'screen' | 'spen';

const HOTSPOTS: Record<GalaxyHotspotKey, { cameraPos: THREE.Vector3; targetPos: THREE.Vector3 }> = {
  overall: {
    cameraPos: new THREE.Vector3(0, 0, 7),
    targetPos: new THREE.Vector3(0, 0, 0),
  },
  camera: {
    cameraPos: new THREE.Vector3(-0.8, 1.2, -2.8),
    targetPos: new THREE.Vector3(-0.4, 1.4, -0.6),
  },
  screen: {
    cameraPos: new THREE.Vector3(0, 0, 3.2),
    targetPos: new THREE.Vector3(0, 0, 0),
  },
  spen: {
    cameraPos: new THREE.Vector3(0.5, -2.5, 1.5),
    targetPos: new THREE.Vector3(0.5, -1.8, 0),
  },
};

type GalaxyS23ViewerProps = {
  activeColorKey: GalaxyColorKey;
  activeHotspot: GalaxyHotspotKey;
  modelPath?: string;
  onLoadProgress?: (progress: number) => void;
  onModelLoaded?: () => void;
};

export function GalaxyS23Viewer({
  activeColorKey,
  activeHotspot,
  modelPath = '/models/samsung_s23_ultra.glb',
  onLoadProgress,
  onModelLoaded,
}: GalaxyS23ViewerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = React.useRef<THREE.Scene | null>(null);
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = React.useRef<OrbitControls | null>(null);
  const modelRef = React.useRef<THREE.Group | null>(null);
  const targetCamPos = React.useRef(HOTSPOTS.overall.cameraPos.clone());
  const targetLookAt = React.useRef(HOTSPOTS.overall.targetPos.clone());
  const isCameraTransitioningRef = React.useRef(false);
  const colorableMaterialsRef = React.useRef<THREE.MeshStandardMaterial[]>([]);
  const activeColorKeyRef = React.useRef(activeColorKey);
  const onLoadProgressRef = React.useRef(onLoadProgress);
  const onModelLoadedRef = React.useRef(onModelLoaded);

  function cleanMaterial(material: THREE.Material) {
    material.dispose();
    Object.values(material).forEach((value) => {
      if (value && typeof value === 'object' && 'dispose' in value && typeof value.dispose === 'function') {
        value.dispose();
      }
    });
  }

  function applyColor(colorKey: GalaxyColorKey) {
    const preset = GALAXY_COLOR_PRESETS[colorKey];
    colorableMaterialsRef.current.forEach((material) => {
      const name = (material.name || '').toLowerCase();
      material.roughness = preset.roughness;
      material.metalness = preset.metallic;
      material.color.set(name.includes('glass') ? preset.glassColor : preset.hex);
      material.needsUpdate = true;
    });
  }

  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let isCancelled = false;
    let animationFrameId = 0;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.copy(HOTSPOTS.overall.cameraPos);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 1.8;
    controls.addEventListener('start', () => {
      isCameraTransitioningRef.current = false;
    });
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd9e8ff, 1.2);
    fillLight.position.set(-5, 3, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.5);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    const accentLight1 = new THREE.PointLight(0x60a5fa, 1.2, 10);
    accentLight1.position.set(-3, -2, -3);
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xc084fc, 1.2, 10);
    accentLight2.position.set(3, 2, -3);
    scene.add(accentLight2);

    new GLTFLoader().load(
      modelPath,
      (gltf) => {
        if (isCancelled) return;

        const model = gltf.scene;
        modelRef.current = model;

        const phoneMesh = model.getObjectByName('Cube.003') || model;
        const box = new THREE.Box3().setFromObject(phoneMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 3 / maxDim;
          model.scale.set(scale, scale, scale);
        }

        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (child.name === 'Circle' || child.name === 'Cube.004') {
            child.visible = false;
            return;
          }

          child.castShadow = true;
          child.receiveShadow = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach((material) => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;
            material.roughness = Math.max(material.roughness, 0.1);
            const nameLower = (material.name || '').toLowerCase();
            const meshNameLower = (child.name || '').toLowerCase();
            const isColorTarget =
              nameLower.includes('back') ||
              nameLower.includes('cover') ||
              nameLower.includes('side') ||
              nameLower.includes('frame') ||
              nameLower.includes('body') ||
              nameLower.includes('case') ||
              nameLower.includes('pen top') ||
              meshNameLower.includes('back') ||
              meshNameLower.includes('frame');

            if (isColorTarget && !colorableMaterialsRef.current.includes(material)) {
              colorableMaterialsRef.current.push(material);
            }
          });
        });

        scene.add(model);
        applyColor(activeColorKeyRef.current);
        onModelLoadedRef.current?.();
      },
      (xhr) => {
        if (xhr.total > 0 && !isCancelled) {
          onLoadProgressRef.current?.(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (error) => {
        console.error('Error loading Galaxy S23 model:', error);
      },
    );

    const resizeObserver = new ResizeObserver((entries) => {
      if (isCancelled) return;
      const { width: nextWidth, height: nextHeight } = entries[0]?.contentRect ?? {};
      if (!nextWidth || !nextHeight) return;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    });
    resizeObserver.observe(container);

    const animate = () => {
      if (isCancelled) return;
      animationFrameId = requestAnimationFrame(animate);

      if (isCameraTransitioningRef.current) {
        camera.position.lerp(targetCamPos.current, 0.05);
        controls.target.lerp(targetLookAt.current, 0.05);

        if (
          camera.position.distanceTo(targetCamPos.current) < 0.02 &&
          controls.target.distanceTo(targetLookAt.current) < 0.02
        ) {
          camera.position.copy(targetCamPos.current);
          controls.target.copy(targetLookAt.current);
          isCameraTransitioningRef.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) {
        try {
          container.removeChild(rendererRef.current.domElement);
        } catch {
          // Canvas may already be removed during teardown.
        }
      }
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(cleanMaterial);
      });
      controls.dispose();
      renderer.dispose();
    };
  }, [modelPath]);

  React.useEffect(() => {
    onLoadProgressRef.current = onLoadProgress;
    onModelLoadedRef.current = onModelLoaded;
  }, [onLoadProgress, onModelLoaded]);

  React.useEffect(() => {
    activeColorKeyRef.current = activeColorKey;
    applyColor(activeColorKey);
  }, [activeColorKey]);

  React.useEffect(() => {
    const targetSet = HOTSPOTS[activeHotspot] || HOTSPOTS.overall;
    targetCamPos.current.copy(targetSet.cameraPos);
    targetLookAt.current.copy(targetSet.targetPos);
    isCameraTransitioningRef.current = true;
  }, [activeHotspot]);

  return <div ref={containerRef} className="absolute inset-0 z-[1] cursor-grab touch-none active:cursor-grabbing" />;
}
