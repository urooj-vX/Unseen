// UNSEEN — Real-Time 3D Walk Expedition Scene (Three.js)
// Art Direction: Citrus Fields Living Botanical Sanctuary
// Features: Undulating terrain with organic elevation & soil strata, winding 3D trail,
// layered sculptural trees, 3D explorer character at milestone waypoints,
// mountain stream, blossom wildflowers, discovery obelisk landmark,
// drifting golden spores, and serene twilight active-walk atmospheric shift.

import * as THREE from 'three';

export class WalkScene3D {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.options = options;
    this.onSelectDuration = options.onSelectDuration || (() => {});
    this.onSelectObservation = options.onSelectObservation || (() => {});

    // State
    this.currentMode = 'setup'; // 'setup' | 'active' | 'observe'
    this.selectedDuration = 25; // 10, 15, 20, 25, 30, 35, 45, 60
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isPaused = false;

    // Disposables tracking
    this.disposables = [];
    this.swayMeshes = [];
    this.waypointMeshes = new Map();
    this.particleSystem = null;
    this.fireflySystem = null;

    // Milestone Spline Parameters (t: 0.0 to 1.0 along the trail)
    this.milestoneT = {
      10: 0.10,
      15: 0.22,
      20: 0.35,
      25: 0.48,
      30: 0.60,
      35: 0.72,
      45: 0.85,
      60: 0.96
    };

    // Explorer animation
    this.explorerT = this.milestoneT[25];
    this.targetExplorerT = this.milestoneT[25];
    this.explorerStridePhase = 0;

    // Camera animation & mouse parallax
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    this.cameraBasePos = new THREE.Vector3(12, 10, 21);
    this.cameraLookTarget = new THREE.Vector3(1, 1.2, -1);
    this.currentLookTarget = new THREE.Vector3(1, 1.2, -1);

    // Observation Camera Presets & Interactive Orbiting
    this.activeObservationKey = 'sample_archway';
    this.observationTargets = {
      sample_archway: {
        id: 'sample_archway',
        name: 'Overgrown Stone Archway',
        camPos: new THREE.Vector3(2.6, 4.4, -5.8),
        lookTarget: new THREE.Vector3(6.2, 2.9, -11.5),
        accentColor: '#E7CA49'
      },
      sample_stream: {
        id: 'sample_stream',
        name: 'Forest Runoff Stream & Reeds',
        camPos: new THREE.Vector3(-5.0, 3.4, 6.8),
        lookTarget: new THREE.Vector3(-9.2, 1.2, 1.5),
        accentColor: '#8EC9E8'
      },
      sample_trailhead: {
        id: 'sample_trailhead',
        name: 'Compacted Trailhead & Forest Pine',
        camPos: new THREE.Vector3(8.2, 4.8, 11.8),
        lookTarget: new THREE.Vector3(4.2, 1.8, 6.0),
        accentColor: '#538B57'
      }
    };

    this.orbitAngleX = 0;
    this.orbitAngleY = 0;
    this.targetOrbitAngleX = 0;
    this.targetOrbitAngleY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    // Twilight transition factor (0.0 = day, 1.0 = twilight)
    this.twilightFactor = 0.0;
    this.targetTwilightFactor = 0.0;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.init();
  }

  init() {
    try {
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupLighting();
      this.buildTerrain();
      this.buildStream();
      this.buildTrail();
      this.buildTrees();
      this.buildFoliageAndRocks();
      this.buildLandmark();
      this.buildArchway();
      this.buildTrailJunction();
      this.buildExplorer();
      this.buildParticles();
      this.setupEvents();
      this.animate();
    } catch (err) {
      console.warn('WalkScene3D initialization error:', err);
    }
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    // Warm morning sky color (#EAF6EE to #F8F2E6)
    this.daySkyColor = new THREE.Color('#EBF5EE');
    this.twilightSkyColor = new THREE.Color('#08331E');
    this.scene.background = this.daySkyColor.clone();

    // Atmospheric depth fog
    this.dayFogColor = new THREE.Color('#DCEFE2');
    this.twilightFogColor = new THREE.Color('#0B291A');
    this.fog = new THREE.FogExp2(this.dayFogColor, 0.018);
    this.scene.fog = this.fog;
  }

  setupCamera() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const aspect = width / (height || 1);

    // Cinematic perspective camera with gentle telephoto compression (42° FOV)
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 120);
    this.camera.position.copy(this.cameraBasePos);
    this.camera.lookAt(this.currentLookTarget);
  }

  setupLighting() {
    // 1. Sky / Meadow Hemisphere Light
    this.hemiLight = new THREE.HemisphereLight('#E2F4FA', '#A9D6BA', 1.15);
    this.scene.add(this.hemiLight);

    // 2. Sunlight (Directional Light with soft PCF shadows)
    this.sunLight = new THREE.DirectionalLight('#FFF5D1', 2.2);
    this.sunLight.position.set(22, 28, 14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 70;
    this.sunLight.shadow.camera.left = -25;
    this.sunLight.shadow.camera.right = 25;
    this.sunLight.shadow.camera.top = 25;
    this.sunLight.shadow.camera.bottom = -25;
    this.sunLight.shadow.bias = -0.0003;
    this.scene.add(this.sunLight);

    // 3. Gentle Golden Rim & Horizon Fill Light
    this.fillLight = new THREE.DirectionalLight('#95D5B2', 0.6);
    this.fillLight.position.set(-18, 12, -18);
    this.scene.add(this.fillLight);

    // 4. Landmark Discovery Point Light (Citrus glow)
    this.beaconPointLight = new THREE.PointLight('#E7CA49', 1.8, 22, 1.4);
    this.beaconPointLight.position.set(6, 4.5, -12);
    this.scene.add(this.beaconPointLight);
  }

  // Terrain height calculation function
  getElevation(x, z) {
    // Rolling gentle topography
    const hill1 = Math.sin(x * 0.11) * Math.cos(z * 0.13) * 2.2;
    const hill2 = Math.cos(x * 0.05 + z * 0.07) * 1.6;

    // Valley carved on the left for the winding mountain stream (x around -8 to -12)
    const streamCenter = -9 + Math.sin(z * 0.12) * 2.8;
    const streamDist = Math.abs(x - streamCenter);
    const streamValley = -Math.exp(-streamDist * streamDist * 0.2) * 2.0;

    // Gentle ridge where the trail meanders (x around 3 to 6)
    const trailCenter = 4.2 + Math.sin(z * 0.09) * 3.4;
    const trailDist = Math.abs(x - trailCenter);
    const trailRidge = Math.exp(-trailDist * trailDist * 0.15) * 0.55;

    // Distant mountain slope rise towards negative z
    const backRise = Math.max(0, -z - 4) * 0.24;

    return hill1 + hill2 + streamValley + trailRidge + backRise;
  }

  buildTerrain() {
    const width = 64;
    const depth = 52;
    const segX = 96;
    const segZ = 78;

    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Palettes for vertex coloring:
    // Forest: #064E2D (0.024, 0.306, 0.176)
    // Fern: #538B57 (0.325, 0.545, 0.341)
    // Mint: #95D5B2 (0.584, 0.835, 0.698)
    // Linen: #EDEAE4 (0.929, 0.918, 0.894)
    const colForest = new THREE.Color('#064E2D');
    const colFern = new THREE.Color('#538B57');
    const colMint = new THREE.Color('#95D5B2');
    const colLinen = new THREE.Color('#EDEAE4');

    const tempCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getElevation(x, z);
      pos.setY(i, y);

      // Color blending based on height and slope
      const normY = THREE.MathUtils.clamp((y + 1.5) / 5.5, 0, 1);

      if (normY > 0.65) {
        // High crests: Mint blended into Fern
        tempCol.lerpColors(colFern, colMint, (normY - 0.65) / 0.35);
      } else if (normY > 0.28) {
        // Mid slopes: Fern
        tempCol.lerpColors(colForest, colFern, (normY - 0.28) / 0.37);
      } else {
        // Valley bottom & stream banks: Forest into Linen
        tempCol.lerpColors(colLinen, colForest, Math.min(1, normY * 3.5));
      }

      colors[i * 3] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: false
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
    this.disposables.push(geo, mat);

    // Visible soil / cliff strata base surrounding the terrain
    this.buildSoilBase(width, depth);
  }

  buildSoilBase(w, d) {
    const baseGeo = new THREE.BoxGeometry(w, 4, d);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2C3F33'),
      roughness: 0.95,
      metalness: 0.05
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -3.8;
    this.scene.add(baseMesh);
    this.disposables.push(baseGeo, baseMat);
  }

  buildStream() {
    // 3D Spline for the winding mountain stream
    const points = [];
    for (let z = -24; z <= 24; z += 3) {
      const x = -9 + Math.sin(z * 0.12) * 2.8;
      const y = this.getElevation(x, z) + 0.15;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const streamGeo = new THREE.TubeGeometry(curve, 64, 1.1, 8, false);

    // Translucent Sky-Blue Water (#8EC9E8)
    const streamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8EC9E8'),
      roughness: 0.16,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88
    });

    this.streamMesh = new THREE.Mesh(streamGeo, streamMat);
    this.streamMesh.receiveShadow = true;
    this.streamMesh.userData = { observationKey: 'sample_stream', isObservationLandmark: true };
    this.scene.add(this.streamMesh);
    this.disposables.push(streamGeo, streamMat);

    // River granite stones & wetland reeds along stream channel
    const riverStones = [
      { x: -9.8, z: 2.2, r: 0.65 },
      { x: -8.2, z: 0.8, r: 0.52 },
      { x: -9.5, z: -2.0, r: 0.72 },
      { x: -7.6, z: 3.8, r: 0.48 }
    ];

    const stoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6E7B71'),
      roughness: 0.88
    });

    riverStones.forEach(st => {
      const stGeo = new THREE.DodecahedronGeometry(st.r, 0);
      const stMesh = new THREE.Mesh(stGeo, stoneMat);
      const sy = this.getElevation(st.x, st.z) + st.r * 0.35;
      stMesh.position.set(st.x, sy, st.z);
      stMesh.rotation.set(0.3, 0.4, 0.2);
      stMesh.castShadow = true;
      stMesh.receiveShadow = true;
      stMesh.userData = { observationKey: 'sample_stream', isObservationLandmark: true };
      this.scene.add(stMesh);
      this.disposables.push(stGeo);
    });
    this.disposables.push(stoneMat);

    // Wetland Reeds along the banks (#95D5B2 Mint & #538B57 Fern)
    const reedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#95D5B2'),
      roughness: 0.8
    });
    for (let i = 0; i < 14; i++) {
      const rx = -7.8 - (i % 3) * 0.4 + (Math.random() - 0.5) * 0.5;
      const rz = -3 + i * 0.8;
      const ry = this.getElevation(rx, rz);
      const reedGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.2 + (i % 3) * 0.3, 4);
      const reedMesh = new THREE.Mesh(reedGeo, reedMat);
      reedMesh.position.set(rx, ry + 0.6, rz);
      reedMesh.rotation.z = 0.08 * (i % 2 === 0 ? 1 : -1);
      reedMesh.castShadow = true;
      reedMesh.userData = { observationKey: 'sample_stream', isObservationLandmark: true };
      this.scene.add(reedMesh);
      this.swayMeshes.push(reedMesh);
      this.disposables.push(reedGeo);
    }
    this.disposables.push(reedMat);
  }

  buildTrail() {
    // 3D CatmullRom spline following the terrain contours from distance to foreground
    const trailPoints = [
      new THREE.Vector3(7.5, 0, -22),
      new THREE.Vector3(6.8, 0, -18),
      new THREE.Vector3(5.2, 0, -13),
      new THREE.Vector3(3.8, 0, -8),
      new THREE.Vector3(2.5, 0, -3),
      new THREE.Vector3(3.2, 0, 2),
      new THREE.Vector3(4.8, 0, 7),
      new THREE.Vector3(5.9, 0, 12),
      new THREE.Vector3(5.0, 0, 17),
      new THREE.Vector3(3.5, 0, 22)
    ];

    // Align y to terrain elevation plus a gentle offset
    trailPoints.forEach(pt => {
      pt.y = this.getElevation(pt.x, pt.z) + 0.14;
    });

    this.trailCurve = new THREE.CatmullRomCurve3(trailPoints);

    // Extrude trail ribbon
    const trailShape = new THREE.Shape();
    trailShape.moveTo(-0.7, 0);
    trailShape.lineTo(0.7, 0);
    trailShape.lineTo(0.55, -0.15);
    trailShape.lineTo(-0.55, -0.15);
    trailShape.closePath();

    const extrudeSettings = {
      steps: 120,
      bevelEnabled: false,
      extrudePath: this.trailCurve
    };

    const trailGeo = new THREE.ExtrudeGeometry(trailShape, extrudeSettings);
    const trailMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F8F2E6'), // Warm Cream
      roughness: 0.92,
      metalness: 0.02
    });

    this.trailMesh = new THREE.Mesh(trailGeo, trailMat);
    this.trailMesh.receiveShadow = true;
    this.scene.add(this.trailMesh);
    this.disposables.push(trailGeo, trailMat);

    // Build 8 Milestone Waypoint Markers along the 3D spline
    this.buildWaypointPedestals();
  }

  buildWaypointPedestals() {
    const durations = [10, 15, 20, 25, 30, 35, 45, 60];

    durations.forEach(dur => {
      const t = this.milestoneT[dur];
      const pos = this.trailCurve.getPointAt(t);

      // Group offset slightly to side of trail
      const tangent = this.trailCurve.getTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const markerPos = pos.clone().add(normal.multiplyScalar(1.2));
      markerPos.y = this.getElevation(markerPos.x, markerPos.z) + 0.05;

      const group = new THREE.Group();
      group.position.copy(markerPos);
      group.userData = { duration: dur, isWaypoint: true };

      // 1. Mossy Stone Plinth
      const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.4, 6);
      const baseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#CAD8C5'),
        roughness: 0.9
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.2;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // 2. Wooden Post with Milestone Ring
      const postGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.7, 6);
      const postMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#3D291D'),
        roughness: 0.85
      });
      const postMesh = new THREE.Mesh(postGeo, postMat);
      postMesh.position.y = 0.65;
      postMesh.castShadow = true;
      group.add(postMesh);

      // 3. Glowing Citrus Gem / Marker
      const gemGeo = new THREE.OctahedronGeometry(0.24, 0);
      const gemMat = new THREE.MeshStandardMaterial({
        color: dur === 25 ? new THREE.Color('#E7CA49') : new THREE.Color('#EDEAE4'),
        emissive: dur === 25 ? new THREE.Color('#E7CA49') : new THREE.Color('#000000'),
        emissiveIntensity: dur === 25 ? 0.75 : 0.0,
        roughness: 0.2,
        metalness: 0.4
      });
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      gemMesh.position.y = 1.15;
      group.add(gemMesh);

      this.scene.add(group);
      this.waypointMeshes.set(dur, { group, gemMesh, gemMat });
      this.disposables.push(baseGeo, baseMat, postGeo, postMat, gemGeo, gemMat);
    });
  }

  buildExplorer() {
    this.explorerGroup = new THREE.Group();

    // 1. Cloak / Body: Tapered sculptural cylinder in Forest Green (#064E2D)
    const bodyGeo = new THREE.CylinderGeometry(0.16, 0.32, 0.85, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#064E2D'),
      roughness: 0.8
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.52;
    bodyMesh.castShadow = true;
    this.explorerGroup.add(bodyMesh);

    // 2. Head / Cap
    const headGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.position.y = 1.05;
    headMesh.castShadow = true;
    this.explorerGroup.add(headMesh);

    // 3. Explorer Satchel: Citrus Yellow (#E7CA49)
    const packGeo = new THREE.BoxGeometry(0.22, 0.28, 0.18);
    const packMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E7CA49'),
      roughness: 0.65
    });
    const packMesh = new THREE.Mesh(packGeo, packMat);
    packMesh.position.set(-0.18, 0.6, 0.1);
    packMesh.castShadow = true;
    this.explorerGroup.add(packMesh);

    // 4. Wooden Walking Staff (#8A6B47)
    const staffGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.35, 6);
    const staffMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8A6B47'),
      roughness: 0.9
    });
    const staffMesh = new THREE.Mesh(staffGeo, staffMat);
    staffMesh.position.set(0.32, 0.67, 0.15);
    staffMesh.rotation.z = -0.12;
    staffMesh.castShadow = true;
    this.explorerGroup.add(staffMesh);

    // 5. Soft Ground Shadow Decal
    const shadowGeo = new THREE.CircleGeometry(0.42, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#14281D'),
      transparent: true,
      opacity: 0.4
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.explorerGroup.add(shadowMesh);

    this.scene.add(this.explorerGroup);
    this.disposables.push(bodyGeo, bodyMat, headGeo, packGeo, packMat, staffGeo, staffMat, shadowGeo, shadowMat);

    // Position at default milestone (25m)
    this.updateExplorerPosition(this.milestoneT[25]);
  }

  updateExplorerPosition(t) {
    if (!this.trailCurve || !this.explorerGroup) return;

    const pos = this.trailCurve.getPointAt(t);
    pos.y = this.getElevation(pos.x, pos.z) + 0.12;
    this.explorerGroup.position.copy(pos);

    const tangent = this.trailCurve.getTangentAt(t);
    const angle = Math.atan2(tangent.x, tangent.z);
    this.explorerGroup.rotation.y = angle;
  }

  buildTrees() {
    // Tree coordinates (intentional botanical composition framing the landscape)
    const treeSpecs = [
      // Left foreground oak cluster
      { x: -5, z: 12, type: 'oak', scale: 1.3 },
      { x: -7, z: 15, type: 'oak', scale: 1.0 },
      { x: -3, z: 18, type: 'oak', scale: 0.9 },
      // Right foreground framing pine
      { x: 10, z: 14, type: 'pine', scale: 1.4 },
      { x: 12, z: 10, type: 'pine', scale: 1.1 },
      // Midground oaks & pines along ridge
      { x: 12, z: -2, type: 'oak', scale: 1.2 },
      { x: 9, z: -8, type: 'pine', scale: 1.3 },
      { x: 14, z: -12, type: 'pine', scale: 1.1 },
      // Far valley pines
      { x: -16, z: -4, type: 'pine', scale: 1.2 },
      { x: -14, z: -12, type: 'pine', scale: 1.4 },
      { x: -6, z: -18, type: 'oak', scale: 1.1 },
      { x: 2, z: -20, type: 'pine', scale: 1.0 },
      { x: 11, z: -22, type: 'pine', scale: 1.3 }
    ];

    treeSpecs.forEach(spec => {
      const y = this.getElevation(spec.x, spec.z);
      const tree = spec.type === 'oak' 
        ? this.createOakTree(spec.scale) 
        : this.createPineTree(spec.scale);

      tree.position.set(spec.x, y, spec.z);
      this.scene.add(tree);
      this.swayMeshes.push(tree);
    });
  }

  createOakTree(scale) {
    const group = new THREE.Group();

    // Trunk (#3D291D)
    const trunkGeo = new THREE.CylinderGeometry(0.28 * scale, 0.44 * scale, 2.2 * scale, 7);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3D291D'),
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1 * scale;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Layered, sculptural foliage clusters (Forest #064E2D, Fern #538B57, Mint #95D5B2)
    const folColors = ['#064E2D', '#538B57', '#95D5B2'];
    const folGroup = new THREE.Group();

    const folPositions = [
      { x: 0, y: 2.4 * scale, z: 0, r: 1.4 * scale, col: folColors[0] },
      { x: -0.6 * scale, y: 2.1 * scale, z: 0.4 * scale, r: 1.1 * scale, col: folColors[1] },
      { x: 0.7 * scale, y: 2.2 * scale, z: -0.3 * scale, r: 1.05 * scale, col: folColors[1] },
      { x: 0.1 * scale, y: 3.1 * scale, z: 0.1 * scale, r: 0.95 * scale, col: folColors[2] }
    ];

    folPositions.forEach(fp => {
      const folGeo = new THREE.DodecahedronGeometry(fp.r, 1);
      const folMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(fp.col),
        roughness: 0.85
      });
      const folMesh = new THREE.Mesh(folGeo, folMat);
      folMesh.position.set(fp.x, fp.y, fp.z);
      folMesh.castShadow = true;
      folMesh.receiveShadow = true;
      folGroup.add(folMesh);
      this.disposables.push(folGeo, folMat);
    });

    group.add(folGroup);
    group.userData.folGroup = folGroup;
    this.disposables.push(trunkGeo, trunkMat);

    return group;
  }

  createPineTree(scale) {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.6 * scale, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#382519'),
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.3 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    // Tiered conical boughs
    const tiers = [
      { y: 1.8 * scale, r: 1.35 * scale, h: 1.4 * scale, col: '#163B23' },
      { y: 2.7 * scale, r: 1.1 * scale, h: 1.3 * scale, col: '#225434' },
      { y: 3.6 * scale, r: 0.85 * scale, h: 1.2 * scale, col: '#32734A' },
      { y: 4.4 * scale, r: 0.55 * scale, h: 1.0 * scale, col: '#469162' }
    ];

    const folGroup = new THREE.Group();
    tiers.forEach(tr => {
      const coneGeo = new THREE.ConeGeometry(tr.r, tr.h, 7);
      const coneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(tr.col),
        roughness: 0.82
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      coneMesh.position.y = tr.y;
      coneMesh.castShadow = true;
      coneMesh.receiveShadow = true;
      folGroup.add(coneMesh);
      this.disposables.push(coneGeo, coneMat);
    });

    group.add(folGroup);
    group.userData.folGroup = folGroup;
    this.disposables.push(trunkGeo, trunkMat);

    return group;
  }

  buildFoliageAndRocks() {
    // 1. Natural Granite Boulders along hillsides and stream
    const boulderCoords = [
      { x: -7, z: 8, s: 1.1 },
      { x: -11, z: 4, s: 1.4 },
      { x: -6, z: -5, s: 0.9 },
      { x: 1, z: 8, s: 0.8 },
      { x: 8, z: 4, s: 1.2 },
      { x: 10, z: -6, s: 1.0 },
      { x: -4, z: -14, s: 1.3 }
    ];

    boulderCoords.forEach(b => {
      const geo = new THREE.DodecahedronGeometry(b.s, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#94A198'),
        roughness: 0.92,
        metalness: 0.05
      });
      const mesh = new THREE.Mesh(geo, mat);
      const y = this.getElevation(b.x, b.z) + b.s * 0.45;
      mesh.position.set(b.x, y, b.z);
      mesh.rotation.set(b.x * 0.3, b.z * 0.4, 0.2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.disposables.push(geo, mat);
    });

    // 2. 3D Wildflower Clusters (Blossom Pink #F4C6D7 & Citrus Yellow #E7CA49)
    const flowerClusters = [
      { cx: 3, cz: 14, color: '#F4C6D7', count: 8 },
      { cx: 6, cz: 16, color: '#E7CA49', count: 6 },
      { cx: 1, cz: 5, color: '#F4C6D7', count: 7 },
      { cx: 5, cz: -1, color: '#E7CA49', count: 5 },
      { cx: 7, cz: -10, color: '#F4C6D7', count: 9 },
      { cx: -4, cz: 10, color: '#F4C6D7', count: 6 },
      { cx: -8, cz: 2, color: '#E7CA49', count: 7 }
    ];

    flowerClusters.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        const ox = (Math.random() - 0.5) * 2.2;
        const oz = (Math.random() - 0.5) * 2.2;
        const fx = c.cx + ox;
        const fz = c.cz + oz;
        const fy = this.getElevation(fx, fz);

        const flower = this.createFlower(c.color);
        flower.position.set(fx, fy, fz);
        flower.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(flower);
        this.swayMeshes.push(flower);
      }
    });
  }

  createFlower(petalHex) {
    const group = new THREE.Group();

    // Stem: Forest green
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4);
    const stemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3A754B'),
      roughness: 0.8
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.2;
    group.add(stem);

    // Blossom Petals: Blossom Pink (#F4C6D7) or Citrus (#E7CA49)
    const petalGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const petalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(petalHex),
      roughness: 0.6
    });
    const blossom = new THREE.Mesh(petalGeo, petalMat);
    blossom.position.y = 0.4;
    group.add(blossom);

    // Core Center Dot
    const centerGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const centerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFF8D1'),
      roughness: 0.4
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = 0.45;
    group.add(center);

    this.disposables.push(stemGeo, stemMat, petalGeo, petalMat, centerGeo, centerMat);
    return group;
  }

  buildLandmark() {
    // Ancient Sunlit Discovery Keystone on ridge promontory overlooking trail
    const landmarkGroup = new THREE.Group();
    const lx = 6;
    const lz = -12;
    const ly = this.getElevation(lx, lz);
    landmarkGroup.position.set(lx, ly, lz);

    // 1. Carved Stepped Stone Dais (#CAD8C5)
    const daisGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.5, 8);
    const daisMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#CAD8C5'),
      roughness: 0.88
    });
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = 0.25;
    dais.castShadow = true;
    dais.receiveShadow = true;
    landmarkGroup.add(dais);

    // 2. Ancient Carved Compass Obelisk
    const obeliskGeo = new THREE.ConeGeometry(0.55, 2.4, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4E705A'),
      roughness: 0.75
    });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.y = 1.6;
    obelisk.rotation.y = Math.PI / 4;
    obelisk.castShadow = true;
    landmarkGroup.add(obelisk);

    // 3. Floating Citrus Discovery Gem (Slowly rotating)
    const gemGeo = new THREE.OctahedronGeometry(0.42, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E7CA49'),
      emissive: new THREE.Color('#E7CA49'),
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.6
    });
    this.landmarkGem = new THREE.Mesh(gemGeo, gemMat);
    this.landmarkGem.position.y = 3.3;
    landmarkGroup.add(this.landmarkGem);

    this.scene.add(landmarkGroup);
    this.disposables.push(daisGeo, daisMat, obeliskGeo, obeliskMat, gemGeo, gemMat);
  }

  buildArchway() {
    // Weathered Granite Stone Archway & Golden Keystone Specimen Landmark
    const archGroup = new THREE.Group();
    const ax = 6.2;
    const az = -11.5;
    const ay = this.getElevation(ax, az);
    archGroup.position.set(ax, ay, az);
    archGroup.userData = { observationKey: 'sample_archway', isObservationLandmark: true };

    const stoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#5E6B62'), // Weathered granite
      roughness: 0.92,
      metalness: 0.05
    });

    const mossMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3B6347'), // Ivy & moss
      roughness: 0.85
    });

    // 1. Two Granite Pillars
    const pillarGeo = new THREE.BoxGeometry(0.8, 3.4, 0.8);
    const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
    leftPillar.position.set(-1.45, 1.7, 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    archGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
    rightPillar.position.set(1.45, 1.7, 0);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    archGroup.add(rightPillar);

    // Pillar Caps
    const capGeo = new THREE.BoxGeometry(1.0, 0.28, 1.0);
    const leftCap = new THREE.Mesh(capGeo, stoneMat);
    leftCap.position.set(-1.45, 3.5, 0);
    leftCap.castShadow = true;
    archGroup.add(leftCap);

    const rightCap = new THREE.Mesh(capGeo, stoneMat);
    rightCap.position.set(1.45, 3.5, 0);
    rightCap.castShadow = true;
    archGroup.add(rightCap);

    // 2. Curving Arch Ring (Torus arc spanning between pillars)
    const archGeo = new THREE.TorusGeometry(1.45, 0.38, 8, 16, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, stoneMat);
    archMesh.position.set(0, 3.5, 0);
    archMesh.castShadow = true;
    archMesh.receiveShadow = true;
    archGroup.add(archMesh);

    // 3. Golden Keystone at the apex (#E7CA49 Citrus)
    const keystoneGeo = new THREE.BoxGeometry(0.58, 0.72, 0.9);
    const keystoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E7CA49'),
      emissive: new THREE.Color('#E7CA49'),
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.45
    });
    const keystoneMesh = new THREE.Mesh(keystoneGeo, keystoneMat);
    keystoneMesh.position.set(0, 4.98, 0);
    keystoneMesh.castShadow = true;
    archGroup.add(keystoneMesh);

    // 4. Cascading Ivy Tendrils & Roots (#538B57 & #95D5B2)
    const vineGeo1 = new THREE.CylinderGeometry(0.06, 0.04, 2.9, 5);
    const vine1 = new THREE.Mesh(vineGeo1, mossMat);
    vine1.position.set(-1.62, 2.3, 0.38);
    vine1.rotation.z = 0.09;
    archGroup.add(vine1);

    const vineGeo2 = new THREE.CylinderGeometry(0.05, 0.03, 2.4, 5);
    const vine2 = new THREE.Mesh(vineGeo2, mossMat);
    vine2.position.set(1.62, 2.5, 0.38);
    vine2.rotation.z = -0.11;
    archGroup.add(vine2);

    // 5. Weathered Stone Threshold / Steps
    const stepGeo = new THREE.BoxGeometry(3.8, 0.22, 1.6);
    const stepMesh = new THREE.Mesh(stepGeo, stoneMat);
    stepMesh.position.set(0, 0.11, 0);
    stepMesh.receiveShadow = true;
    archGroup.add(stepMesh);

    // 6. Base Wildflowers (Blossom Pink #F4C6D7 & Citrus #E7CA49)
    const flower1 = this.createFlower('#F4C6D7');
    flower1.position.set(-2.2, 0, 0.6);
    archGroup.add(flower1);

    const flower2 = this.createFlower('#E7CA49');
    flower2.position.set(2.2, 0, 0.5);
    archGroup.add(flower2);

    this.scene.add(archGroup);
    this.archwayMesh = archGroup;
    this.disposables.push(stoneMat, mossMat, pillarGeo, capGeo, archGeo, keystoneGeo, keystoneMat, vineGeo1, vineGeo2, stepGeo);
  }

  buildTrailJunction() {
    // Compacted Trailhead Junction & Timber Signpost Specimen Landmark
    const junctionGroup = new THREE.Group();
    const jx = 4.2;
    const jz = 6.2;
    const jy = this.getElevation(jx, jz);
    junctionGroup.position.set(jx, jy, jz);
    junctionGroup.userData = { observationKey: 'sample_trailhead', isObservationLandmark: true };

    // 1. Weathered Wooden Signpost (#3D291D)
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.5, 6);
    const postMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3D291D'),
      roughness: 0.92
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 1.25;
    post.castShadow = true;
    junctionGroup.add(post);

    // 2. Carved Signpost Cross Arms
    const armGeo = new THREE.BoxGeometry(1.3, 0.26, 0.1);
    const armMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4A3222'),
      roughness: 0.85
    });
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.position.set(0.42, 1.95, 0);
    arm1.rotation.y = 0.28;
    arm1.castShadow = true;
    junctionGroup.add(arm1);

    // Citrus Painted Direction Arrow Tip (#E7CA49)
    const tipGeo = new THREE.ConeGeometry(0.18, 0.36, 3);
    const tipMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E7CA49'),
      roughness: 0.55
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(1.12, 1.95, 0.05);
    tip.rotation.z = -Math.PI / 2;
    junctionGroup.add(tip);

    // 3. Stone Cairn Foundation
    const cairnGeo = new THREE.CylinderGeometry(0.48, 0.72, 0.55, 6);
    const cairnMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#788A7E'),
      roughness: 0.95
    });
    const cairn = new THREE.Mesh(cairnGeo, cairnMat);
    cairn.position.y = 0.28;
    cairn.castShadow = true;
    junctionGroup.add(cairn);

    // 4. Wildflower accent
    const flower = this.createFlower('#F4C6D7');
    flower.position.set(-0.8, 0, 0.4);
    junctionGroup.add(flower);

    this.scene.add(junctionGroup);
    this.trailJunctionMesh = junctionGroup;
    this.disposables.push(postGeo, postMat, armGeo, armMat, tipGeo, tipMat, cairnGeo, cairnMat);
  }

  buildParticles() {
    // Drifting Golden Pollen Spores & Pink Petals
    const count = 48;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const c1 = new THREE.Color('#E7CA49'); // Citrus
    const c2 = new THREE.Color('#F4C6D7'); // Blossom Pink

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = 1.2 + Math.random() * 8.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 32;

      const col = Math.random() > 0.4 ? c1 : c2;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.82
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this.scene.add(this.particleSystem);
    this.disposables.push(geo, mat);
  }

  setupEvents() {
    this.boundOnPointerMove = (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.targetMouse.set(this.pointer.x * 0.45, this.pointer.y * 0.25);

      if (this.isDragging && this.currentMode === 'observe') {
        const dx = (e.clientX - this.dragStart.x) * 0.006;
        const dy = (e.clientY - this.dragStart.y) * 0.005;
        this.targetOrbitAngleX = THREE.MathUtils.clamp(this.targetOrbitAngleX - dx, -0.45, 0.45);
        this.targetOrbitAngleY = THREE.MathUtils.clamp(this.targetOrbitAngleY + dy, -0.22, 0.26);
        this.dragStart = { x: e.clientX, y: e.clientY };
      }
    };

    this.boundOnPointerDown = (e) => {
      if (this.currentMode !== 'observe') return;
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
    };

    this.boundOnPointerUp = () => {
      this.isDragging = false;
    };

    this.boundOnTouchStart = (e) => {
      if (this.currentMode !== 'observe' || e.touches.length !== 1) return;
      this.isDragging = true;
      this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    this.boundOnTouchMove = (e) => {
      if (this.isDragging && this.currentMode === 'observe' && e.touches.length === 1) {
        const dx = (e.touches[0].clientX - this.dragStart.x) * 0.006;
        const dy = (e.touches[0].clientY - this.dragStart.y) * 0.005;
        this.targetOrbitAngleX = THREE.MathUtils.clamp(this.targetOrbitAngleX - dx, -0.45, 0.45);
        this.targetOrbitAngleY = THREE.MathUtils.clamp(this.targetOrbitAngleY + dy, -0.22, 0.26);
        this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    this.boundOnTouchEnd = () => {
      this.isDragging = false;
    };

    this.boundOnClick = (e) => {
      if (this.currentMode === 'active') return;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      for (let hit of intersects) {
        let cur = hit.object;
        while (cur && cur !== this.scene) {
          if (this.currentMode === 'observe' && cur.userData && cur.userData.isObservationLandmark) {
            const key = cur.userData.observationKey;
            if (key) {
              this.focusObservation(key);
              this.onSelectObservation(key);
              return;
            }
          }
          if (this.currentMode === 'setup' && cur.userData && cur.userData.isWaypoint) {
            this.setDuration(cur.userData.duration);
            this.onSelectDuration(cur.userData.duration);
            return;
          }
          cur = cur.parent;
        }
      }
    };

    this.boundOnResize = () => this.resize();

    window.addEventListener('pointermove', this.boundOnPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.boundOnPointerDown, { passive: true });
    window.addEventListener('pointerup', this.boundOnPointerUp);
    window.addEventListener('pointercancel', this.boundOnPointerUp);
    window.addEventListener('touchstart', this.boundOnTouchStart, { passive: true });
    window.addEventListener('touchmove', this.boundOnTouchMove, { passive: true });
    window.addEventListener('touchend', this.boundOnTouchEnd);
    window.addEventListener('click', this.boundOnClick);
    window.addEventListener('resize', this.boundOnResize);
  }

  setDuration(durationMinutes) {
    const dur = parseInt(durationMinutes, 10);
    if (!this.milestoneT[dur]) return;

    this.selectedDuration = dur;
    this.targetExplorerT = this.milestoneT[dur];

    // Highlight active waypoint gem in 3D
    this.waypointMeshes.forEach((item, d) => {
      if (d === dur) {
        item.gemMat.color.set('#E7CA49');
        item.gemMat.emissive.set('#E7CA49');
        item.gemMat.emissiveIntensity = 0.9;
        item.gemMesh.scale.set(1.3, 1.3, 1.3);
      } else {
        item.gemMat.color.set('#EDEAE4');
        item.gemMat.emissive.set('#000000');
        item.gemMat.emissiveIntensity = 0.0;
        item.gemMesh.scale.set(1.0, 1.0, 1.0);
      }
    });

    // Gently nudge camera target to follow the waypoint
    const waypointPos = this.trailCurve.getPointAt(this.targetExplorerT);
    this.cameraLookTarget.set(
      waypointPos.x * 0.35 + 0.5,
      1.2,
      waypointPos.z * 0.35 - 1.0
    );
  }

  focusObservation(key) {
    const target = this.observationTargets[key];
    if (!target) return;

    this.activeObservationKey = key;
    this.targetOrbitAngleX = 0;
    this.targetOrbitAngleY = 0;

    // Smoothly fly camera to landmark viewpoint
    this.cameraBasePos.copy(target.camPos);
    this.cameraLookTarget.copy(target.lookTarget);
  }

  setMode(mode) {
    this.currentMode = mode;
    this.targetTwilightFactor = mode === 'active' ? 1.0 : 0.0;

    if (mode === 'active') {
      // Intimate, meditative framing focusing on countdown & twilight world
      this.cameraBasePos.set(9, 7.5, 17);
      this.cameraLookTarget.set(1, 1.2, -1);
    } else if (mode === 'observe') {
      // Crisp daylight illumination & landmark focus
      this.focusObservation(this.activeObservationKey || 'sample_archway');
    } else {
      // Spacious expedition setup framing
      this.cameraBasePos.set(12, 10, 21);
      this.cameraLookTarget.set(1, 1.2, -1);
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.clock.start();
  }

  resize() {
    if (!this.renderer || !this.camera || !this.canvas) return;

    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());

    if (this.isPaused) return;

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Mouse parallax interpolation
    if (!this.isReducedMotion) {
      this.mouse.lerp(this.targetMouse, 0.05);
    }

    // 2. Camera position & lookAt smoothing
    if (this.currentMode === 'observe') {
      this.orbitAngleX = THREE.MathUtils.lerp(this.orbitAngleX, this.targetOrbitAngleX, 0.08);
      this.orbitAngleY = THREE.MathUtils.lerp(this.orbitAngleY, this.targetOrbitAngleY, 0.08);

      const baseOffset = this.cameraBasePos.clone().sub(this.cameraLookTarget);
      baseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.orbitAngleX);
      const pitchAxis = new THREE.Vector3(-baseOffset.z, 0, baseOffset.x).normalize();
      baseOffset.applyAxisAngle(pitchAxis, this.orbitAngleY);

      const desiredCamPos = this.cameraLookTarget.clone().add(baseOffset).add(
        new THREE.Vector3(this.mouse.x * 0.5, this.mouse.y * 0.35, 0)
      );
      this.camera.position.lerp(desiredCamPos, 0.045);
      this.currentLookTarget.lerp(this.cameraLookTarget, 0.045);
      this.camera.lookAt(this.currentLookTarget);
    } else {
      const desiredCamPos = this.cameraBasePos.clone().add(
        new THREE.Vector3(this.mouse.x * 1.8, this.mouse.y * 1.2, 0)
      );
      this.camera.position.lerp(desiredCamPos, 0.04);
      this.currentLookTarget.lerp(this.cameraLookTarget, 0.04);
      this.camera.lookAt(this.currentLookTarget);
    }

    // 3. Smooth twilight atmospheric transition
    if (Math.abs(this.twilightFactor - this.targetTwilightFactor) > 0.005) {
      this.twilightFactor = THREE.MathUtils.lerp(this.twilightFactor, this.targetTwilightFactor, 0.04);

      // Sky & Fog color blend
      const curSky = this.daySkyColor.clone().lerp(this.twilightSkyColor, this.twilightFactor);
      this.scene.background = curSky;

      const curFog = this.dayFogColor.clone().lerp(this.twilightFogColor, this.twilightFactor);
      this.fog.color = curFog;

      // Sun dimming into moonlight
      this.sunLight.intensity = THREE.MathUtils.lerp(2.2, 0.65, this.twilightFactor);
      this.hemiLight.intensity = THREE.MathUtils.lerp(1.15, 0.5, this.twilightFactor);
    }

    // 4. Explorer smooth movement along the trail
    if (Math.abs(this.explorerT - this.targetExplorerT) > 0.002) {
      this.explorerT = THREE.MathUtils.lerp(this.explorerT, this.targetExplorerT, 0.08);
      this.explorerStridePhase += delta * 12;
      this.updateExplorerPosition(this.explorerT);
      // Gentle stride bobbing
      if (this.explorerGroup) {
        this.explorerGroup.position.y += Math.abs(Math.sin(this.explorerStridePhase)) * 0.08;
      }
    } else if (this.currentMode === 'active') {
      // Serene walking bobbing while active walk session is ticking
      this.explorerStridePhase += delta * 3.5;
      if (this.explorerGroup) {
        const basePos = this.trailCurve.getPointAt(this.explorerT);
        const y = this.getElevation(basePos.x, basePos.z) + 0.12;
        this.explorerGroup.position.y = y + Math.abs(Math.sin(this.explorerStridePhase)) * 0.05;
      }
    }

    // 5. Environmental Foliage Sway (Gentle natural wind)
    if (!this.isReducedMotion) {
      this.swayMeshes.forEach((mesh, idx) => {
        const offset = idx * 0.45;
        if (mesh.userData && mesh.userData.folGroup) {
          mesh.userData.folGroup.rotation.z = Math.sin(time * 1.6 + offset) * 0.025;
        } else {
          mesh.rotation.z = Math.sin(time * 2.2 + offset) * 0.04;
        }
      });
    }

    // 6. Rotating Landmark Discovery Gem
    if (this.landmarkGem) {
      this.landmarkGem.rotation.y = time * 0.8;
      this.landmarkGem.position.y = 3.3 + Math.sin(time * 1.5) * 0.12;
    }

    // 7. Drifting Spores / Pollen Particles
    if (this.particleSystem) {
      const pos = this.particleSystem.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let py = pos.getY(i) - delta * 0.35;
        let px = pos.getX(i) + Math.sin(time + i) * delta * 0.25;
        if (py < 0.8) py = 9.0;
        pos.setY(i, py);
        pos.setX(i, px);
      }
      pos.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);

    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    window.removeEventListener('pointercancel', this.boundOnPointerUp);
    window.removeEventListener('touchstart', this.boundOnTouchStart);
    window.removeEventListener('touchmove', this.boundOnTouchMove);
    window.removeEventListener('touchend', this.boundOnTouchEnd);
    window.removeEventListener('click', this.boundOnClick);
    window.removeEventListener('resize', this.boundOnResize);

    this.disposables.forEach(d => {
      if (d && d.dispose) d.dispose();
    });

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}
