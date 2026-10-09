import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Scenario, Layer } from '../types';
import {
  RotateCcw,
  Sun,
  Sunset,
  Moon,
  Camera,
  Play,
  Pause,
  Maximize2,
  Image,
  Info,
  X,
  Building,
  TreePine,
  Compass,
} from 'lucide-react';

interface Urban3DViewerProps {
  scenario: Scenario | null;
  layers: Layer[];
  onSelectFeature?: (props: any) => void;
}

export const Urban3DViewer: React.FC<Urban3DViewerProps> = ({
  scenario,
  layers,
  onSelectFeature,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [lightingPreset, setLightingPreset] = useState<'day' | 'sunset' | 'night'>('day');
  const [showRenderModal, setShowRenderModal] = useState(false);

  // References to Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const controlsState = useRef({
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    rotation: { x: 0.6, y: -0.7 },
    distance: 450,
    target: new THREE.Vector3(0, 0, 0),
  });

  const renderImageUrl = scenario?.layout_geojson?.metadata?.render_image_url || '/renders/eco_city_3d_masterplan.jpg';

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 560;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0012);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    camera.position.set(280, 260, 320);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111827, 0.7);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    dirLight.position.set(250, 400, 150);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 1200;
    const d = 400;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // 5. Ground Canvas Plane
    const groundGeo = new THREE.PlaneGeometry(1200, 1200, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Subtle Engineering Grid
    const grid = new THREE.GridHelper(1000, 50, 0x10b981, 0x1e293b);
    grid.position.y = 0.2;
    scene.add(grid);

    // 6. Interactive Raycasting for 3D building inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      if (!mountRef.current || !cameraRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        if (hit.object.userData && hit.object.userData.building) {
          setSelectedBuilding(hit.object.userData.building);
          if (onSelectFeature) onSelectFeature(hit.object.userData);
          break;
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // 7. Mouse Orbit Controls
    const onMouseDown = (e: MouseEvent) => {
      controlsState.current.isDragging = true;
      controlsState.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!controlsState.current.isDragging) return;
      const deltaX = e.clientX - controlsState.current.previousMousePosition.x;
      const deltaY = e.clientY - controlsState.current.previousMousePosition.y;

      controlsState.current.rotation.y -= deltaX * 0.005;
      controlsState.current.rotation.x = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, controlsState.current.rotation.x + deltaY * 0.005)
      );

      controlsState.current.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      controlsState.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      controlsState.current.distance = Math.max(
        80,
        Math.min(900, controlsState.current.distance + e.deltaY * 0.5)
      );
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // 8. Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isAutoRotating) {
        controlsState.current.rotation.y += 0.002;
      }

      // Update camera position from spherical coordinates
      const { rotation, distance, target } = controlsState.current;
      const x = distance * Math.sin(rotation.y) * Math.cos(rotation.x);
      const y = distance * Math.sin(rotation.x);
      const z = distance * Math.cos(rotation.y) * Math.cos(rotation.x);

      camera.position.set(target.x + x, target.y + y, target.z + z);
      camera.lookAt(target);

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('click', handleClick);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && domEl) {
        mountRef.current.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, []);

  // Update Scene with 3D Buildings, Roads, Greenery, and Water
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing extruded objects (keep lights and ground)
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData && obj.userData.isProceduralUrbanObject) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => scene.remove(obj));

    // Reference center in lat/lon to convert to local 3D coordinates
    const centerLon = 85.820;
    const centerLat = 20.295;
    const scale = 25000.0; // metric scale for Three.js coordinates

    const to3DCoords = (lon: number, lat: number) => {
      const x = (lon - centerLon) * scale;
      const z = -(lat - centerLat) * scale;
      return { x, z };
    };

    // 1. Render 3D Water Streams & Canals from layers
    layers.forEach((layer) => {
      if (layer.layer_type === 'water' && layer.geojson_data) {
        const features = layer.geojson_data.features || [];
        features.forEach((feat: any) => {
          const geom = feat.geometry;
          if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
            const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
            polys.forEach((ringCoords: any) => {
              const ring = ringCoords[0];
              if (!ring || ring.length < 3) return;

              const shape = new THREE.Shape();
              const first = to3DCoords(ring[0][0], ring[0][1]);
              shape.moveTo(first.x, first.z);
              for (let i = 1; i < ring.length; i++) {
                const pt = to3DCoords(ring[i][0], ring[i][1]);
                shape.lineTo(pt.x, pt.z);
              }

              const waterGeo = new THREE.ShapeGeometry(shape);
              const waterMat = new THREE.MeshStandardMaterial({
                color: 0x0284c7,
                roughness: 0.1,
                metalness: 0.8,
                transparent: true,
                opacity: 0.85,
              });
              const waterMesh = new THREE.Mesh(waterGeo, waterMat);
              waterMesh.rotation.x = Math.PI / 2;
              waterMesh.position.y = 0.5;
              waterMesh.userData = { isProceduralUrbanObject: true };
              scene.add(waterMesh);
            });
          }
        });
      }
    });

    // 2. Render 3D Buildings, Roads, and Parks from Scenario Features
    if (!scenario || !scenario.layout_geojson) return;
    const features = scenario.layout_geojson.features || [];

    features.forEach((f: any, idx: number) => {
      const props = f.properties || {};
      const cat = props.category || '';
      const geom = f.geometry;
      if (!geom || geom.type !== 'Polygon') return;

      const ring = geom.coordinates[0];
      if (!ring || ring.length < 3) return;

      // Calculate centroid in 3D
      let sumX = 0;
      let sumZ = 0;
      for (const pt of ring) {
        const c = to3DCoords(pt[0], pt[1]);
        sumX += c.x;
        sumZ += c.z;
      }
      const cX = sumX / ring.length;
      const cZ = sumZ / ring.length;

      // Estimate parcel width and depth
      const minX = Math.min(...ring.map((p: any) => to3DCoords(p[0], p[1]).x));
      const maxX = Math.max(...ring.map((p: any) => to3DCoords(p[0], p[1]).x));
      const minZ = Math.min(...ring.map((p: any) => to3DCoords(p[0], p[1]).z));
      const maxZ = Math.max(...ring.map((p: any) => to3DCoords(p[0], p[1]).z));
      const pW = Math.max(10, (maxX - minX) * 0.7);
      const pD = Math.max(10, (maxZ - minZ) * 0.7);

      if (cat === 'Residential' || cat === 'Civic / Services' || cat === 'Commercial') {
        const bld = props.building || {};
        const heightM = bld.height_meters || 20;
        const storeys = bld.storeys || 6;
        const isViolation = props.is_deliberate_violation;

        // Create 3D Building Extrusion
        const bGeo = new THREE.BoxGeometry(pW, heightM, pD);

        // Building facade material
        let bColor = 0xe2e8f0; // Off-white modern
        if (cat === 'Residential') {
          bColor = isViolation ? 0xef4444 : props.land_use?.includes('high') ? 0xf97316 : 0xf59e0b;
        } else if (cat === 'Civic / Services') {
          bColor = 0x38bdf8;
        } else if (isViolation) {
          bColor = 0xdc2626;
        }

        const bMat = new THREE.MeshStandardMaterial({
          color: bColor,
          roughness: 0.35,
          metalness: 0.25,
        });

        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(cX, heightM / 2, cZ);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        bMesh.userData = {
          isProceduralUrbanObject: true,
          building: {
            ...bld,
            cell_id: props.cell_id,
            land_use: props.land_use,
            category: cat,
            area_ha: props.area_ha,
            is_deliberate_violation: isViolation,
          },
        };
        scene.add(bMesh);

        // Rooftop Solar / Sky Garden Green Terrace
        const roofGeo = new THREE.BoxGeometry(pW * 0.95, 1.2, pD * 0.95);
        const roofMat = new THREE.MeshStandardMaterial({
          color: 0x15803d, // Green roof canopy
          roughness: 0.8,
        });
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.position.set(cX, heightM + 0.6, cZ);
        roofMesh.userData = { isProceduralUrbanObject: true };
        scene.add(roofMesh);

        // Violation pulsing marker if flagged
        if (isViolation) {
          const beaconGeo = new THREE.CylinderGeometry(2, 6, 30, 16);
          const beaconMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            wireframe: true,
          });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(cX, heightM + 20, cZ);
          beacon.userData = { isProceduralUrbanObject: true };
          scene.add(beacon);
        }

        // Add 2-3 Landscaped Trees in parcel courtyard
        for (let t = 0; t < 2; t++) {
          const treeGroup = create3DTree();
          const offsetX = (t === 0 ? 1 : -1) * (pW * 0.55);
          const offsetZ = (t === 0 ? 1 : -1) * (pD * 0.55);
          treeGroup.position.set(cX + offsetX, 0, cZ + offsetZ);
          treeGroup.userData = { isProceduralUrbanObject: true };
          scene.add(treeGroup);
        }
      } else if (cat === 'Transportation') {
        // 3D Road Ribbon with Asphalt & Lane Stripe
        const rGeo = new THREE.BoxGeometry(pW * 1.3, 0.4, pD * 1.3);
        const rMat = new THREE.MeshStandardMaterial({
          color: 0x334155, // dark asphalt
          roughness: 0.9,
        });
        const rMesh = new THREE.Mesh(rGeo, rMat);
        rMesh.position.set(cX, 0.2, cZ);
        rMesh.receiveShadow = true;
        rMesh.userData = { isProceduralUrbanObject: true };
        scene.add(rMesh);

        // Center line
        const stripeGeo = new THREE.BoxGeometry(1.2, 0.42, pD * 1.25);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(cX, 0.22, cZ);
        stripe.userData = { isProceduralUrbanObject: true };
        scene.add(stripe);
      } else if (cat === 'Green Space') {
        // Landscaped Park with grass base & clump of 3D trees
        const parkGeo = new THREE.BoxGeometry(pW * 1.2, 0.6, pD * 1.2);
        const parkMat = new THREE.MeshStandardMaterial({
          color: 0x16a34a,
          roughness: 0.85,
        });
        const pMesh = new THREE.Mesh(parkGeo, parkMat);
        pMesh.position.set(cX, 0.3, cZ);
        pMesh.receiveShadow = true;
        pMesh.userData = { isProceduralUrbanObject: true };
        scene.add(pMesh);

        // Add 4-5 Trees
        const treeOffsets = [
          [0, 0],
          [-pW * 0.3, -pD * 0.3],
          [pW * 0.3, pD * 0.3],
          [-pW * 0.25, pD * 0.25],
        ];
        treeOffsets.forEach(([ox, oz]) => {
          const t = create3DTree();
          t.position.set(cX + ox, 0.6, cZ + oz);
          t.userData = { isProceduralUrbanObject: true };
          scene.add(t);
        });
      }
    });
  }, [scenario, layers]);

  // Helper to construct a realistic 3D tree
  const create3DTree = () => {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.8, 1.2, 6, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage (layered cones/spheres)
    const foliageGeo = new THREE.DodecahedronGeometry(5, 1);
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7,
      flatShading: true,
    });
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 8;
    foliage.castShadow = true;
    group.add(foliage);

    return group;
  };

  // Environment Lighting Presets
  const applyLightingPreset = (preset: 'day' | 'sunset' | 'night') => {
    setLightingPreset(preset);
    const dir = dirLightRef.current;
    const hemi = hemiLightRef.current;
    const scene = sceneRef.current;
    if (!dir || !hemi || !scene) return;

    if (preset === 'day') {
      scene.background = new THREE.Color(0x0a0f1d);
      scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0012);
      dir.color.setHex(0xfff5e6);
      dir.intensity = 1.4;
      hemi.color.setHex(0xffffff);
      hemi.groundColor.setHex(0x111827);
    } else if (preset === 'sunset') {
      scene.background = new THREE.Color(0x2d1527);
      scene.fog = new THREE.FogExp2(0x2d1527, 0.0014);
      dir.color.setHex(0xf97316);
      dir.intensity = 1.6;
      hemi.color.setHex(0xfdba74);
      hemi.groundColor.setHex(0x311b92);
    } else {
      scene.background = new THREE.Color(0x030712);
      scene.fog = new THREE.FogExp2(0x030712, 0.0018);
      dir.color.setHex(0x38bdf8);
      dir.intensity = 0.5;
      hemi.color.setHex(0x1e1b4b);
      hemi.groundColor.setHex(0x030712);
    }
  };

  const setCameraView = (type: 'aerial' | 'pedestrian' | 'top') => {
    if (type === 'aerial') {
      controlsState.current.rotation = { x: 0.65, y: -0.7 };
      controlsState.current.distance = 420;
    } else if (type === 'pedestrian') {
      controlsState.current.rotation = { x: 0.15, y: -0.4 };
      controlsState.current.distance = 140;
    } else {
      controlsState.current.rotation = { x: Math.PI / 2 - 0.01, y: 0 };
      controlsState.current.distance = 550;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', background: '#0a0f1d' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Floating Controls */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 100,
        display: 'flex',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(10px)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
      }}>
        <button
          onClick={() => setCameraView('aerial')}
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '11px' }}
          title="Bird's Eye Aerial View"
        >
          <Camera size={13} />
          Aerial 45°
        </button>

        <button
          onClick={() => setCameraView('pedestrian')}
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '11px' }}
          title="Street Level Pedestrian View"
        >
          <Camera size={13} />
          Street View
        </button>

        <button
          onClick={() => setCameraView('top')}
          className="btn btn-secondary"
          style={{ padding: '6px 10px', fontSize: '11px' }}
          title="Top Down Master Plan"
        >
          <Compass size={13} />
          Top Plan
        </button>

        <div style={{ width: 1, background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Orbit toggle */}
        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          className={`btn ${isAutoRotating ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 10px', fontSize: '11px' }}
          title="Toggle Cinematic Auto Orbit"
        >
          {isAutoRotating ? <Pause size={13} /> : <Play size={13} />}
          {isAutoRotating ? 'Pause' : 'Orbit'}
        </button>
      </div>

      {/* Top Right: Lighting Presets & Photorealistic Render View Button */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 100,
        display: 'flex',
        gap: '8px',
      }}>
        {/* Photorealistic 3D Render Gallery Button */}
        <button
          onClick={() => setShowRenderModal(true)}
          className="btn btn-primary"
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
          }}
        >
          <Image size={15} />
          View 3D Architectural Render
        </button>

        {/* Atmosphere Presets */}
        <div style={{
          display: 'flex',
          gap: '4px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}>
          <button
            onClick={() => applyLightingPreset('day')}
            className={`btn ${lightingPreset === 'day' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px', borderRadius: '4px' }}
            title="Daylight"
          >
            <Sun size={14} />
          </button>
          <button
            onClick={() => applyLightingPreset('sunset')}
            className={`btn ${lightingPreset === 'sunset' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px', borderRadius: '4px' }}
            title="Sunset Golden Hour"
          >
            <Sunset size={14} />
          </button>
          <button
            onClick={() => applyLightingPreset('night')}
            className={`btn ${lightingPreset === 'night' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px', borderRadius: '4px' }}
            title="Night"
          >
            <Moon size={14} />
          </button>
        </div>
      </div>

      {/* Bottom Controls Info Banner */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        padding: '6px 14px',
        fontSize: '11px',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span><b>Controls:</b> Left Click + Drag to Rotate • Scroll to Zoom</span>
        <span>• Click any 3D building to inspect architectural specs</span>
      </div>

      {/* Building Inspection HUD (When clicking a 3D building) */}
      {selectedBuilding && (
        <div
          className="card"
          style={{
            position: 'absolute',
            bottom: 60,
            right: 16,
            zIndex: 100,
            width: '320px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(14px)',
            border: `1px solid ${selectedBuilding.is_deliberate_violation ? '#ef4444' : 'var(--border-glow)'}`,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} color={selectedBuilding.is_deliberate_violation ? '#ef4444' : '#10b981'} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                {selectedBuilding.building_id || 'Architectural Mass'}
              </span>
            </div>
            <button
              onClick={() => setSelectedBuilding(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px' }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8', marginBottom: '8px' }}>
            {selectedBuilding.building_name || selectedBuilding.building_type || 'Urban Structure'}
          </div>

          {selectedBuilding.is_deliberate_violation && (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '4px',
              color: '#fca5a5',
              fontSize: '11px',
              fontWeight: 600,
              marginBottom: '10px',
            }}>
              ⚠️ ENCROACHMENT: Located inside restricted sanctuary zone!
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Building Height:</span>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{selectedBuilding.height_meters || 24} meters</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Storeys / Floors:</span>
              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{selectedBuilding.storeys || 8} Floors</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Housing Units:</span>
              <div style={{ fontWeight: 700, color: '#f97316' }}>{selectedBuilding.housing_units || 0} DU</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Parcel Land Use:</span>
              <div style={{ fontWeight: 700, color: '#22c55e' }}>{selectedBuilding.land_use || 'Residential'}</div>
            </div>
          </div>

          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div><b>Roof Typology:</b> {selectedBuilding.roof_type || 'Rooftop Solar & Sky Garden'}</div>
            {selectedBuilding.facade_material && (
              <div style={{ marginTop: '3px' }}><b>Facade:</b> {selectedBuilding.facade_material}</div>
            )}
          </div>
        </div>
      )}

      {/* Photorealistic 3D Architectural Render Modal */}
      {showRenderModal && (
        <div className="modal-overlay" onClick={() => setShowRenderModal(false)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '960px', padding: '20px', background: '#0a0f1d' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  Photorealistic 3D Architectural Master Plan Visualization
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Scenario: {scenario?.name} • Bhubaneswar Eco-Planning Sector
                </p>
              </div>

              <button onClick={() => setShowRenderModal(false)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
              <img
                src={renderImageUrl}
                alt="3D Architectural Master Plan"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '14px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-success">3D DIGITAL TWIN</span>
                <span>Ultra-high resolution aerial perspective of buildings, riparian buffer, and road avenues.</span>
              </div>

              <a
                href={renderImageUrl}
                download={`utkal_3d_render_${scenario?.strategy || 'masterplan'}.jpg`}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Download 3D Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
