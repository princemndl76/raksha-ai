import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Globe,
  Mountain,
  Layers,
  Crosshair,
  RotateCcw,
  Activity,
  AlertTriangle,
  Waves,
  Shield,
  Radio,
  Plane,
  Building2,
  Sliders,
  Maximize2,
  X,
  MapPin,
  Flame,
  Info,
} from "lucide-react";

// Geographic bounds for Nepal terrain box
const NEPAL_CENTER = { lat: 28.3949, lon: 84.124 };
const TERRAIN_SIZE = 120; // 3D units

// Helper: Convert Lat/Lon to 3D spherical coordinates on globe of radius R
function latLonToVector3(lat, lon, radius, altOffset = 0) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = radius + altOffset;
  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Helper: Convert Lat/Lon to local 2.5D Himalayan terrain mesh coordinates
function latLonToTerrainCoords(lat, lon) {
  // Nepal ranges approx lat 26.3 - 30.5, lon 80.0 - 88.2
  const xPercent = (lon - 80.0) / (88.5 - 80.0);
  const zPercent = (30.5 - lat) / (30.5 - 26.3);
  const x = (xPercent - 0.5) * TERRAIN_SIZE;
  const z = (zPercent - 0.5) * (TERRAIN_SIZE * 0.55);
  return { x, z };
}

// Procedural altitude generator mimicking Nepal's topography:
// Terai south (low) -> Middle Hills -> High Himalayas north (steep snow peaks)
function getHimalayanAltitude(x, z) {
  // Normalize z from south (positive z) to north (negative z)
  const northRatio = THREE.MathUtils.clamp(((-z) / (TERRAIN_SIZE * 0.3) + 1) * 0.5, 0, 1);
  
  // Base Himalayan gradient: rises drastically toward the north
  let alt = Math.pow(northRatio, 2.2) * 16.0;

  // Mountain ridges & valleys (multiple octave pseudo-perlin wave)
  const wave1 = Math.sin(x * 0.12) * Math.cos(z * 0.15) * 3.5;
  const wave2 = Math.sin(x * 0.28 + 1.2) * Math.sin(z * 0.35) * 2.0;
  const wave3 = Math.cos(x * 0.55) * Math.sin(z * 0.6) * 1.1;

  // Kathmandu & Pokhara valleys depression carving
  const dKathmandu = Math.hypot(x - 8, z - 2);
  const vKathmandu = Math.exp(-Math.pow(dKathmandu / 7.0, 2)) * 6.5;

  const dPokhara = Math.hypot(x + 16, z - 1);
  const vPokhara = Math.exp(-Math.pow(dPokhara / 8.0, 2)) * 5.5;

  // Trishuli river gorge depression
  const gorge = Math.abs(Math.sin(x * 0.08 + z * 0.04)) < 0.15 ? -2.2 : 0;

  alt = Math.max(0.4, alt + wave1 + wave2 + wave3 - vKathmandu - vPokhara + gorge);
  return alt;
}

export default function Tactical3DCommand({ alerts = [], isSimulating = false }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);

  // Object group references for dynamic updates
  const globeGroupRef = useRef(null);
  const terrainGroupRef = useRef(null);
  const waterMeshRef = useRef(null);
  const animatedObjectsRef = useRef([]);

  // Component UI state
  const [viewMode, setViewMode] = useState("terrain"); // 'terrain' | 'globe'
  const [floodHeight, setFloodHeight] = useState(2.5); // meters scale
  const [showSlopeHazard, setShowSlopeHazard] = useState(false);
  const [showFaults, setShowFaults] = useState(true);
  const [showHelipads, setShowHelipads] = useState(true);
  const [showUndergroundHypocenters, setShowUndergroundHypocenters] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [hoveredEntity, setHoveredEntity] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [cameraTelemetry, setCameraTelemetry] = useState({
    pitch: "42°",
    bearing: "018°",
    altitude: "14,800m",
  });

  // Critical infrastructure data for 3D overlay
  const infrastructureData = useMemo(() => [
    {
      id: "dam-kulekhani",
      name: "Kulekhani Hydropower Dam",
      type: "DAM",
      lat: 27.6042,
      lon: 85.1578,
      status: "OPERATIONAL",
      metric: "92% Full Reservoir",
    },
    {
      id: "dam-trishuli",
      name: "Trishuli Barrage & Station",
      type: "DAM",
      lat: 27.9167,
      lon: 85.1500,
      status: "HIGH INFLOW",
      metric: "Flood Crest Warning",
    },
    {
      id: "dam-uppertamakoshi",
      name: "Upper Tamakoshi Hydropower Dam",
      type: "DAM",
      lat: 27.8864,
      lon: 86.1558,
      status: "MONITORED",
      metric: "GLOF Corridor Alert",
    },
    {
      id: "air-tia",
      name: "TIA Kathmandu (Rescue Wing)",
      type: "AIRFIELD",
      lat: 27.6966,
      lon: 85.3591,
      status: "PRIMARY HUB",
      metric: "12 Helipads Active",
    },
    {
      id: "air-pokhara",
      name: "Pokhara Base (Regional Airlift)",
      type: "AIRFIELD",
      lat: 28.1889,
      lon: 83.9889,
      status: "OPERATIONAL",
      metric: "6 High-Altitude Helis",
    },
    {
      id: "air-surkhet",
      name: "Surkhet Army Aviation Forward",
      type: "AIRFIELD",
      lat: 28.5861,
      lon: 81.6361,
      status: "FORWARD BASE",
      metric: "Western Response Grid",
    },
  ], []);

  // Filter alerts for 3D placement
  const validAlerts = useMemo(() => {
    return (alerts || []).filter(
      (a) => typeof a?.latitude === "number" && typeof a?.longitude === "number"
    );
  }, [alerts]);

  // Build the 3D Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060911);
    scene.fog = new THREE.FogExp2(0x060911, 0.004);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    camera.position.set(0, 52, 75);
    cameraRef.current = camera;

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 220;
    controls.minDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below horizon in terrain mode
    controlsRef.current = controls;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xd6e4ff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sunLight.position.set(40, 80, 50);
    scene.add(sunLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00f3ff, 0.8);
    cyanRimLight.position.set(-60, 20, -40);
    scene.add(cyanRimLight);

    // =========================================================================
    // A. BUILD PROCEDURAL 3D HIMALAYAN TERRAIN DIGITAL TWIN
    // =========================================================================
    const terrainGroup = new THREE.Group();
    terrainGroupRef.current = terrainGroup;
    scene.add(terrainGroup);

    const segmentsX = 140;
    const segmentsZ = 90;
    const terrainGeo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE * 0.55,
      segmentsX,
      segmentsZ
    );
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = getHimalayanAltitude(x, z);
      posAttr.setY(i, y);

      // Color based on elevation:
      // <2m: fertile green/terai lowlands
      // 2m-8m: middle hills rock/amber
      // >8m: high snowy himalayan crystalline peaks
      let r, g, b;
      if (y < 2.5) {
        r = 0.08 + y * 0.04;
        g = 0.28 + y * 0.05;
        b = 0.16 + y * 0.02;
      } else if (y < 8.0) {
        const t = (y - 2.5) / 5.5;
        r = 0.25 + t * 0.35;
        g = 0.28 + t * 0.22;
        b = 0.32 + t * 0.18;
      } else {
        const t = Math.min(1.0, (y - 8.0) / 7.0);
        r = 0.72 + t * 0.28;
        g = 0.82 + t * 0.18;
        b = 0.95 + t * 0.05;
      }

      colorAttr[i * 3] = r;
      colorAttr[i * 3 + 1] = g;
      colorAttr[i * 3 + 2] = b;
    }

    terrainGeo.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.12,
      flatShading: false,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainGroup.add(terrainMesh);

    // Underground Crust Block (Semi-transparent base representing subterranean crust)
    const crustGeo = new THREE.BoxGeometry(TERRAIN_SIZE, 18, TERRAIN_SIZE * 0.55);
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0x0c1322,
      transparent: true,
      opacity: 0.75,
      roughness: 0.9,
    });
    const crustMesh = new THREE.Mesh(crustGeo, crustMat);
    crustMesh.position.y = -9;
    terrainGroup.add(crustMesh);

    // Dynamic 3D Volumetric Water Surface (River gorges & valleys)
    const waterGeo = new THREE.PlaneGeometry(TERRAIN_SIZE * 0.98, TERRAIN_SIZE * 0.53, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.8,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = floodHeight;
    waterMeshRef.current = waterMesh;
    terrainGroup.add(waterMesh);

    // Tactical Grid Floor below terrain
    const gridHelper = new THREE.GridHelper(TERRAIN_SIZE * 1.3, 26, 0x00f3ff, 0x1e293b);
    gridHelper.position.y = -18.05;
    terrainGroup.add(gridHelper);

    // =========================================================================
    // B. BUILD 3D STRATEGIC TACTICAL GLOBE
    // =========================================================================
    const globeGroup = new THREE.Group();
    globeGroupRef.current = globeGroup;
    globeGroup.visible = false;
    scene.add(globeGroup);

    const GLOBE_RADIUS = 32;
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);

    // Create high-tech tactical wireframe + continents canvas texture
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, 1024, 512);

      // Draw grid lines
      ctx.strokeStyle = "rgba(0, 243, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let lat = -80; lat <= 80; lat += 20) {
        const y = ((90 - lat) / 180) * 512;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }
      for (let lon = -180; lon <= 180; lon += 30) {
        const x = ((lon + 180) / 360) * 1024;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }

      // Highlight Equator & Tropic lines
      ctx.strokeStyle = "rgba(0, 243, 255, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, 256);
      ctx.lineTo(1024, 256);
      ctx.stroke();

      // Highlight Nepal region on texture (lat 28, lon 84)
      const nepalX = ((84.1 + 180) / 360) * 1024;
      const nepalY = ((90 - 28.4) / 180) * 512;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(nepalX, nepalY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Nepal label on texture
      ctx.fillStyle = "#00f3ff";
      ctx.font = "bold 12px monospace";
      ctx.fillText("NEPAL COMMAND [MHT]", nepalX + 8, nepalY - 4);
    }

    const globeTexture = new THREE.CanvasTexture(canvas);
    const globeMat = new THREE.MeshStandardMaterial({
      map: globeTexture,
      roughness: 0.6,
      metalness: 0.2,
      bumpScale: 0.05,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    // Atmospheric Corona / Glow Mesh
    const coronaGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 48, 48);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    globeGroup.add(coronaMesh);

    // Orbiting Earth Observation Satellite
    const satGroup = new THREE.Group();
    const satGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
    const satMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const satBody = new THREE.Mesh(satGeo, satMat);

    // Solar panels
    const panelGeo = new THREE.BoxGeometry(3.5, 0.05, 0.9);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8 });
    const panels = new THREE.Mesh(panelGeo, panelMat);
    satGroup.add(satBody);
    satGroup.add(panels);

    // Conical Sensor Ray down to Earth
    const coneGeo = new THREE.ConeGeometry(5.0, GLOBE_RADIUS * 0.35, 16, 1, true);
    coneGeo.rotateX(-Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.z = -GLOBE_RADIUS * 0.18;
    satGroup.add(coneMesh);

    satGroup.position.set(0, 0, GLOBE_RADIUS + 10);
    globeGroup.add(satGroup);

    // Animated list keeper
    const animatedItems = [];
    animatedItems.push({
      type: "satellite",
      group: satGroup,
      angle: 0,
      speed: 0.012,
      orbitRadius: GLOBE_RADIUS + 12,
    });

    // 5. Animation Render Loop
    let angleSat = 0;
    let wavePulse = 0;

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      controls.update();

      // Satellite orbit
      angleSat += 0.008;
      satGroup.position.x = Math.sin(angleSat) * (GLOBE_RADIUS + 10);
      satGroup.position.y = Math.cos(angleSat * 0.8) * 8;
      satGroup.position.z = Math.cos(angleSat) * (GLOBE_RADIUS + 10);
      satGroup.lookAt(0, 0, 0);

      // Pulse underground seismic wave rings
      wavePulse += 0.035;
      animatedItems.forEach((item) => {
        if (item.type === "shockwave" && item.mesh) {
          const s = 1.0 + (Math.sin(wavePulse * 2.5 + item.offset) + 1) * 0.8;
          item.mesh.scale.set(s, s, s);
          if (item.mesh.material) {
            item.mesh.material.opacity = Math.max(0.1, 0.8 - (s - 1.0) * 0.45);
          }
        }
        if (item.type === "helicopter" && item.mesh) {
          item.mesh.position.x += Math.sin(wavePulse * 0.5) * 0.03;
          item.mesh.position.z += Math.cos(wavePulse * 0.5) * 0.03;
        }
      });

      // Update camera telemetry readout
      const cam = camera.position;
      const pitchDeg = Math.round(
        (Math.atan2(cam.y, Math.hypot(cam.x, cam.z)) * 180) / Math.PI
      );
      const bearingDeg = Math.round(
        (((Math.atan2(cam.x, cam.z) * 180) / Math.PI + 360) % 360)
      );
      const altM = Math.round(cam.length() * 220);

      setCameraTelemetry({
        pitch: `${pitchDeg}°`,
        bearing: `${String(bearingDeg).padStart(3, "0")}°`,
        altitude: `${altM.toLocaleString()}m AMSL`,
      });

      renderer.render(scene, camera);
    };

    animate();
    animatedObjectsRef.current = animatedItems;

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      renderer.dispose();
    };
  }, []);

  // Update dynamic Water Level
  useEffect(() => {
    if (waterMeshRef.current) {
      waterMeshRef.current.position.y = floodHeight;
      waterMeshRef.current.material.opacity = floodHeight > 3.5 ? 0.8 : 0.6;
    }
  }, [floodHeight]);

  // Update View Mode (Terrain vs Globe)
  useEffect(() => {
    if (terrainGroupRef.current && globeGroupRef.current) {
      if (viewMode === "terrain") {
        terrainGroupRef.current.visible = true;
        globeGroupRef.current.visible = false;
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(0, 48, 70);
          controlsRef.current.target.set(0, 2, 0);
          controlsRef.current.maxPolarAngle = Math.PI / 2 - 0.02;
        }
      } else {
        terrainGroupRef.current.visible = false;
        globeGroupRef.current.visible = true;
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(0, 15, 80);
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.maxPolarAngle = Math.PI; // Full 360 orbit around globe
        }
      }
    }
  }, [viewMode]);

  // Build Markers on the Terrain and Globe
  useEffect(() => {
    const terrainGroup = terrainGroupRef.current;
    const globeGroup = globeGroupRef.current;
    if (!terrainGroup || !globeGroup) return;

    // Clean previous dynamic markers
    const markersToRemove = [];
    terrainGroup.children.forEach((child) => {
      if (child.userData?.isDynamicMarker) markersToRemove.push(child);
    });
    markersToRemove.forEach((child) => terrainGroup.remove(child));

    const globeMarkersToRemove = [];
    globeGroup.children.forEach((child) => {
      if (child.userData?.isDynamicMarker) globeMarkersToRemove.push(child);
    });
    globeMarkersToRemove.forEach((child) => globeGroup.remove(child));

    const newAnimatedItems = animatedObjectsRef.current.filter(
      (it) => it.type === "satellite"
    );

    // 1. ADD TECTONIC FAULT LINE (Main Himalayan Thrust)
    if (showFaults) {
      // On Terrain
      const faultPoints = [
        { lat: 29.5, lon: 80.5 },
        { lat: 29.0, lon: 82.0 },
        { lat: 28.4, lon: 83.8 },
        { lat: 28.1, lon: 84.8 },
        { lat: 27.8, lon: 85.9 },
        { lat: 27.4, lon: 87.2 },
        { lat: 27.1, lon: 88.3 },
      ];

      const terrainFaultVectors = faultPoints.map((p) => {
        const { x, z } = latLonToTerrainCoords(p.lat, p.lon);
        const y = getHimalayanAltitude(x, z) + 0.3;
        return new THREE.Vector3(x, y, z);
      });

      const faultCurve = new THREE.CatmullRomCurve3(terrainFaultVectors);
      const tubeGeo = new THREE.TubeGeometry(faultCurve, 32, 0.25, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, wireframe: false });
      const faultMesh = new THREE.Mesh(tubeGeo, tubeMat);
      faultMesh.userData = { isDynamicMarker: true };
      terrainGroup.add(faultMesh);

      // On Globe
      const globeFaultVectors = faultPoints.map((p) =>
        latLonToVector3(p.lat, p.lon, 32.1)
      );
      const globeFaultCurve = new THREE.CatmullRomCurve3(globeFaultVectors);
      const globeTubeGeo = new THREE.TubeGeometry(globeFaultCurve, 32, 0.35, 8, false);
      const globeFaultMesh = new THREE.Mesh(globeTubeGeo, tubeMat);
      globeFaultMesh.userData = { isDynamicMarker: true };
      globeGroup.add(globeFaultMesh);
    }

    // 2. ADD CRITICAL INFRASTRUCTURE (Dams, Airfields)
    infrastructureData.forEach((infra) => {
      const { x, z } = latLonToTerrainCoords(infra.lat, infra.lon);
      const y = getHimalayanAltitude(x, z);

      const isDam = infra.type === "DAM";
      const markerColor = isDam ? 0x06b6d4 : 0x10b981;

      // 3D Extruded Hex Pillar
      const pillarGeo = new THREE.CylinderGeometry(1.0, 1.2, 3.5, 6);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: markerColor,
        metalness: 0.8,
        roughness: 0.2,
      });
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.set(x, y + 1.75, z);
      pillarMesh.userData = {
        isDynamicMarker: true,
        entity: infra,
        title: infra.name,
      };
      terrainGroup.add(pillarMesh);

      // Light beacon on top
      const beaconGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: markerColor });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(x, y + 3.8, z);
      beaconMesh.userData = { isDynamicMarker: true };
      terrainGroup.add(beaconMesh);
    });

    // 3. ADD 3D EARTHQUAKES & HYPOCENTERS (At True Depth km)
    const earthquakes = validAlerts.filter((a) => a.type === "EARTHQUAKE");
    earthquakes.forEach((eq, idx) => {
      const { x, z } = latLonToTerrainCoords(eq.latitude, eq.longitude);
      const surfaceY = getHimalayanAltitude(x, z);

      // True Depth scaling: 10km depth -> 2.8 units down into crust
      const depthKm = eq.depth || 15.0;
      const depthOffset = Math.min(14.0, (depthKm / 70.0) * 12.0 + 1.5);
      const hypocenterY = surfaceY - depthOffset;

      const mag = eq.magnitude || 5.0;
      const radius = Math.max(0.8, (mag / 8.0) * 2.2);

      // Surface Epicenter Ring
      const ringGeo = new THREE.RingGeometry(radius * 0.8, radius * 1.5, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x, surfaceY + 0.15, z);
      ringMesh.userData = { isDynamicMarker: true, entity: eq };
      terrainGroup.add(ringMesh);

      // Underground Hypocenter Sphere
      if (showUndergroundHypocenters) {
        const hypoGeo = new THREE.SphereGeometry(radius, 16, 16);
        const hypoMat = new THREE.MeshStandardMaterial({
          color: 0xff2222,
          emissive: 0xaa0000,
          roughness: 0.3,
        });
        const hypoMesh = new THREE.Mesh(hypoGeo, hypoMat);
        hypoMesh.position.set(x, hypocenterY, z);
        hypoMesh.userData = { isDynamicMarker: true, entity: eq };
        terrainGroup.add(hypoMesh);

        // Vertical Seismic Ray from Hypocenter up to Epicenter
        const rayGeo = new THREE.CylinderGeometry(0.1, 0.1, depthOffset, 8);
        const rayMat = new THREE.MeshBasicMaterial({
          color: 0xff6666,
          transparent: true,
          opacity: 0.6,
        });
        const rayMesh = new THREE.Mesh(rayGeo, rayMat);
        rayMesh.position.set(x, hypocenterY + depthOffset / 2, z);
        rayMesh.userData = { isDynamicMarker: true };
        terrainGroup.add(rayMesh);

        // Subterranean Shockwave expansion sphere
        const shockGeo = new THREE.SphereGeometry(radius * 2.2, 16, 16);
        const shockMat = new THREE.MeshBasicMaterial({
          color: 0xff4444,
          wireframe: true,
          transparent: true,
          opacity: 0.45,
        });
        const shockMesh = new THREE.Mesh(shockGeo, shockMat);
        shockMesh.position.set(x, hypocenterY, z);
        shockMesh.userData = { isDynamicMarker: true };
        terrainGroup.add(shockMesh);

        newAnimatedItems.push({
          type: "shockwave",
          mesh: shockMesh,
          offset: idx * 1.5,
        });
      }

      // Add to Globe View as 3D Pin
      const globePos = latLonToVector3(eq.latitude, eq.longitude, 32.0, 1.2);
      const globePinGeo = new THREE.ConeGeometry(0.8, 2.4, 8);
      globePinGeo.rotateX(Math.PI);
      const globePinMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const globePinMesh = new THREE.Mesh(globePinGeo, globePinMat);
      globePinMesh.position.copy(globePos);
      globePinMesh.lookAt(0, 0, 0);
      globePinMesh.userData = { isDynamicMarker: true, entity: eq };
      globeGroup.add(globePinMesh);
    });

    // 4. ADD 3D FLOOD RISKS (River Inundation Markers)
    const floods = validAlerts.filter((a) => a.type === "FLOOD");
    floods.forEach((fl) => {
      const { x, z } = latLonToTerrainCoords(fl.latitude, fl.longitude);
      const y = getHimalayanAltitude(x, z);

      // Water surge cone
      const floodGeo = new THREE.CylinderGeometry(2.0, 0.4, 2.5, 12);
      const floodMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
      });
      const floodMesh = new THREE.Mesh(floodGeo, floodMat);
      floodMesh.position.set(x, y + 1.25, z);
      floodMesh.userData = { isDynamicMarker: true, entity: fl };
      terrainGroup.add(floodMesh);

      // Globe flood pin
      const globePos = latLonToVector3(fl.latitude, fl.longitude, 32.0, 1.0);
      const gPinGeo = new THREE.SphereGeometry(0.7, 8, 8);
      const gPinMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
      const gPinMesh = new THREE.Mesh(gPinGeo, gPinMat);
      gPinMesh.position.copy(globePos);
      gPinMesh.userData = { isDynamicMarker: true, entity: fl };
      globeGroup.add(gPinMesh);
    });

    // 5. ADD 3D TACTICAL HELICOPTER FLIGHT CORRIDORS
    if (showHelipads) {
      // Flight path from TIA Kathmandu to Gorkha disaster zone
      const p1 = latLonToTerrainCoords(27.6966, 85.3591); // TIA
      const p2 = latLonToTerrainCoords(28.1473, 84.7079); // Gorkha

      const v1 = new THREE.Vector3(p1.x, getHimalayanAltitude(p1.x, p1.z) + 6.0, p1.z);
      const v2 = new THREE.Vector3(p2.x, getHimalayanAltitude(p2.x, p2.z) + 5.5, p2.z);
      const mid = new THREE.Vector3(
        (v1.x + v2.x) / 2,
        Math.max(v1.y, v2.y) + 4.5,
        (v1.z + v2.z) / 2
      );

      const heliPath = new THREE.QuadraticBezierCurve3(v1, mid, v2);
      const heliLineGeo = new THREE.BufferGeometry().setFromPoints(heliPath.getPoints(24));
      const heliLineMat = new THREE.LineDashedMaterial({
        color: 0x22c55e,
        dashSize: 1.5,
        gapSize: 0.8,
      });
      const heliLine = new THREE.Line(heliLineGeo, heliLineMat);
      heliLine.computeLineDistances();
      heliLine.userData = { isDynamicMarker: true };
      terrainGroup.add(heliLine);

      // Tactical Helicopter Mesh
      const heliGeo = new THREE.ConeGeometry(0.6, 1.6, 6);
      heliGeo.rotateZ(Math.PI / 2);
      const heliMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
      const heliMesh = new THREE.Mesh(heliGeo, heliMat);
      heliMesh.position.copy(mid);
      heliMesh.userData = {
        isDynamicMarker: true,
        entity: {
          name: "Nepal Army MI-17 (SAR-01)",
          type: "AIRCRAFT",
          status: "AIRBORNE AIRLIFT",
          mission: "Relief drops along Trishuli-Gorkha air corridor",
          altitude: "3,200m MSL",
        },
      };
      terrainGroup.add(heliMesh);

      newAnimatedItems.push({
        type: "helicopter",
        mesh: heliMesh,
      });
    }

    animatedObjectsRef.current = newAnimatedItems;
  }, [validAlerts, showFaults, showHelipads, showUndergroundHypocenters, infrastructureData]);

  // Click Raycaster for Entity Selection
  const handleCanvasClick = useCallback(
    (event) => {
      const container = mountRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!container || !camera || !scene) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const activeGroup = viewMode === "terrain" ? terrainGroupRef.current : globeGroupRef.current;
      if (!activeGroup) return;

      const intersects = raycaster.intersectObjects(activeGroup.children, true);
      const hit = intersects.find((i) => i.object.userData?.entity);

      if (hit) {
        setSelectedEntity(hit.object.userData.entity);
      } else {
        setSelectedEntity(null);
      }
    },
    [viewMode]
  );

  // Camera Presets (Quick Fly-to)
  const flyToLocation = (targetName) => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    if (viewMode === "terrain") {
      if (targetName === "kathmandu") {
        const { x, z } = latLonToTerrainCoords(27.7172, 85.3240);
        controls.target.set(x, 4, z);
        camera.position.set(x, 18, z + 24);
      } else if (targetName === "pokhara") {
        const { x, z } = latLonToTerrainCoords(28.2096, 83.9856);
        controls.target.set(x, 4, z);
        camera.position.set(x, 20, z + 26);
      } else if (targetName === "gorkha") {
        const { x, z } = latLonToTerrainCoords(28.1473, 84.7079);
        controls.target.set(x, 6, z);
        camera.position.set(x, 22, z + 28);
      } else {
        // Reset full view
        controls.target.set(0, 2, 0);
        camera.position.set(0, 52, 75);
      }
    } else {
      // Globe preset
      controls.target.set(0, 0, 0);
      camera.position.set(0, 15, 80);
    }
  };

  return (
    <div className="tactical-3d-wrapper">
      {/* 3D Viewport Controls & HUD Header */}
      <div className="tactical-hud-top">
        <div className="hud-brand">
          <Shield size={16} className="text-cyan" />
          <span className="hud-title-full">NEOC 3D DIGITAL TWIN COMMAND</span>
          <span className="hud-title-short">3D TWIN</span>
          <span className="hud-badge">{viewMode.toUpperCase()}</span>
          {isSimulating && <span className="hud-badge drill-badge">DRILL</span>}
        </div>

        <div className="hud-telemetry">
          <div className="hud-stat">
            <small>PITCH</small>
            <strong>{cameraTelemetry.pitch}</strong>
          </div>
          <div className="hud-stat">
            <small>BEARING</small>
            <strong>{cameraTelemetry.bearing}</strong>
          </div>
          <div className="hud-stat">
            <small>ALTITUDE</small>
            <strong>{cameraTelemetry.altitude}</strong>
          </div>
        </div>

        <div className="hud-controls-right">
          <div className="mode-toggle-group">
            <button
              className={`tactical-toggle-btn ${viewMode === "terrain" ? "active" : ""}`}
              onClick={() => setViewMode("terrain")}
              title="3D Himalayan Topographic Valley Twin"
            >
              <Mountain size={14} />
              <span className="btn-label">3D TERRAIN</span>
            </button>
            <button
              className={`tactical-toggle-btn ${viewMode === "globe" ? "active" : ""}`}
              onClick={() => setViewMode("globe")}
              title="3D Strategic Earth Orbit View"
            >
              <Globe size={14} />
              <span className="btn-label">3D GLOBE</span>
            </button>
          </div>

          <button
            className="tactical-icon-btn"
            onClick={() => flyToLocation("reset")}
            title="Reset Camera Orientation"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="tactical-canvas-container"
        onClick={handleCanvasClick}
      />

      {/* Floating Tactical Layer Toolbar with Mobile Collapse */}
      <div className={`tactical-floating-toolbar ${toolsOpen ? "mobile-expanded" : ""}`}>
        <button
          type="button"
          className="toolbar-header-toggle"
          onClick={() => setToolsOpen(!toolsOpen)}
          aria-expanded={toolsOpen}
        >
          <div className="toolbar-header">
            <Layers size={13} />
            <span>3D HAZARD LAYERS</span>
          </div>
          <span className="toolbar-toggle-indicator">
            {toolsOpen ? "HIDE ▲" : "TOOLS ▼"}
          </span>
        </button>

        <div className="toolbar-collapsible-body">
          <button
            className={`layer-chip ${showUndergroundHypocenters ? "active" : ""}`}
            onClick={() => setShowUndergroundHypocenters(!showUndergroundHypocenters)}
          >
            <Activity size={12} />
            <span>Subterranean Hypocenters</span>
          </button>

          <button
            className={`layer-chip ${showFaults ? "active" : ""}`}
            onClick={() => setShowFaults(!showFaults)}
          >
            <Flame size={12} />
            <span>MHT Tectonic Fault</span>
          </button>

          <button
            className={`layer-chip ${showHelipads ? "active" : ""}`}
            onClick={() => setShowHelipads(!showHelipads)}
          >
            <Plane size={12} />
            <span>Army Air Corridors</span>
          </button>

          {viewMode === "terrain" && (
            <div className="water-level-slider-panel">
              <div className="slider-label-row">
                <Waves size={12} className="text-cyan" />
                <span>RIVER INUNDATION CREST</span>
                <strong>+{floodHeight.toFixed(1)}m</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="9.0"
                step="0.5"
                value={floodHeight}
                onChange={(e) => setFloodHeight(parseFloat(e.target.value))}
                className="tactical-range"
              />
              <div className="slider-ticks">
                <span>NORMAL</span>
                <span>MED</span>
                <span>SURGE</span>
                <span>GLOF</span>
              </div>
            </div>
          )}

          {/* Quick Fly-To Sector Selector */}
          <div className="sector-selector">
            <span>FLY-TO:</span>
            <button onClick={() => flyToLocation("kathmandu")}>KTM</button>
            <button onClick={() => flyToLocation("pokhara")}>PKR</button>
            <button onClick={() => flyToLocation("gorkha")}>GORKHA</button>
          </div>
        </div>
      </div>

      {/* Selected Entity Dossier Modal */}
      {selectedEntity && (
        <div className="entity-dossier-card">
          <div className="dossier-head">
            <div className="dossier-title-cluster">
              <Crosshair size={14} className="text-cyan" />
              <strong>{selectedEntity.title || selectedEntity.name || selectedEntity.type}</strong>
            </div>
            <button onClick={() => setSelectedEntity(null)} className="dossier-close">
              <X size={14} />
            </button>
          </div>

          <div className="dossier-body">
            <div className="dossier-row">
              <span>LOCATION / SECTOR:</span>
              <strong>{selectedEntity.location || `${selectedEntity.lat?.toFixed(2)}N, ${selectedEntity.lon?.toFixed(2)}E`}</strong>
            </div>

            {selectedEntity.depth !== undefined && (
              <div className="dossier-row">
                <span>FOCAL DEPTH:</span>
                <strong className="text-red">{selectedEntity.depth} km ({selectedEntity.depth_category || "Sub-surface"})</strong>
              </div>
            )}

            {selectedEntity.magnitude && (
              <div className="dossier-row">
                <span>MAGNITUDE / MMI:</span>
                <strong>M{selectedEntity.magnitude} &middot; {selectedEntity.mmi || "Strong"}</strong>
              </div>
            )}

            {selectedEntity.river_discharge_m3s && (
              <div className="dossier-row">
                <span>DISCHARGE DISRUPTION:</span>
                <strong className="text-cyan">
                  {selectedEntity.river_discharge_m3s} m³/s ({selectedEntity.discharge_ratio}x baseline)
                </strong>
              </div>
            )}

            {selectedEntity.metric && (
              <div className="dossier-row">
                <span>CAPACITY / STATUS:</span>
                <strong>{selectedEntity.metric}</strong>
              </div>
            )}

            {selectedEntity.message && (
              <p className="dossier-message">{selectedEntity.message}</p>
            )}

            <div className="dossier-sop">
              <small>NEOC STANDARD DIRECTIVE:</small>
              <p>
                {selectedEntity.type === "EARTHQUAKE"
                  ? "Deploy Army 11th Brigade air reconnaissance; inspect Trishuli and Kulekhani dam structures for seismic displacement."
                  : selectedEntity.type === "FLOOD"
                  ? "Alert downstream barrage gates; initiate sirens for low-lying river settlements within 15 km."
                  : "Maintain 100% operational readiness for helicopter search & rescue sorties."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
