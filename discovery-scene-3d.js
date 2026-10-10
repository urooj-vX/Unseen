// UNSEEN — Real-Time 3D Discovery Specimen Viewer (Three.js)
// Art Direction: Citrus Fields Botanical Sanctuary & Natural History Specimen Viewer
// Features: Real-time 3D dioramas for Stone Archway, Forest Stream, and Compacted Trail,
// smooth orbit & zoom controls, camera reset, raycast landmark inspection,
// drifting golden spores, gentle foliage wind sway, and WebGL error handling.

import * as THREE from 'three';

export class DiscoverySpecimen3D {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.options = options;
    this.onInspectLandmark = options.onInspectLandmark || (() => {});
    this.onCameraChange = options.onCameraChange || (() => {});

    // State
    this.activeSpecimenId = 'sample_archway'; // 'sample_archway' | 'sample_stream' | 'sample_trailhead'
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isPaused = false;
    this.isDisposed = false;

    // Disposables tracking
    this.disposables = [];
    this.swayMeshes = [];
    this.interactiveMeshes = [];
    this.particleSystem = null;

    // Specimen Presets & Camera Targets
    this.specimenPresets = {
      sample_archway: {
        id: 'sample_archway',
        title: 'Weathered Cut-Granite Archway',
        category: 'Historic Masonry & Living Flora',
        description: 'Weathered granite masonry with creeping ivy roots and citrus keystone.',
        defaultElevation: 0.28, // ~16 deg
        defaultAzimuth: 0.45,   // ~26 deg
        defaultDistance: 8.8,
        lookTarget: new THREE.Vector3(0, 2.5, 0),
        accentColor: '#E7CA49'
      },
      sample_stream: {
        id: 'sample_stream',
        title: 'Forest Runoff Stream & Reeds',
        category: 'Freshwater Hydrology & Geology',
        description: 'Clear running mountain water over rounded granite boulders and wetland reeds.',
        defaultElevation: 0.45, // ~26 deg
        defaultAzimuth: -0.38,  // ~-22 deg
        defaultDistance: 7.8,
        lookTarget: new THREE.Vector3(0, 0.7, 0),
        accentColor: '#8EC9E8'
      },
      sample_trailhead: {
        id: 'sample_trailhead',
        title: 'Compacted Trailhead & Forest Pine',
        category: 'Pedestrian Trail & Mountain Flora',
        description: 'Beaten earth footpath with weathered timber marker and stone cairn.',
        defaultElevation: 0.32, // ~18 deg
        defaultAzimuth: 0.52,   // ~30 deg
        defaultDistance: 8.4,
        lookTarget: new THREE.Vector3(0.1, 1.4, 0),
        accentColor: '#538B57'
      }
    };

    // Camera Orbit State
    const defaultPreset = this.specimenPresets[this.activeSpecimenId];
    this.azimuth = defaultPreset.defaultAzimuth;
    this.elevation = defaultPreset.defaultElevation;
    this.distance = defaultPreset.defaultDistance;

    this.targetAzimuth = this.azimuth;
    this.targetElevation = this.elevation;
    this.targetDistance = this.distance;

    this.lookTarget = defaultPreset.lookTarget.clone();
    this.targetLookTarget = defaultPreset.lookTarget.clone();

    this.minDistance = 3.4;
    this.maxDistance = 12.5;

    // Interaction State
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.lastPinchDist = null;
    this.hasMovedSignificantly = false;

    // Transition animation state
    this.isTransitioning = false;
    this.transitionProgress = 1.0;

    // Highlight mesh animation
    this.highlightedMesh = null;
    this.highlightPulse = 0;

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
      this.buildSpecimens();
      this.buildParticles();
      this.setupEvents();
      this.updateCameraImmediate();
      this.animate();
    } catch (err) {
      console.error('[UNSEEN 3D Discovery] WebGL initialization error:', err);
      this.handleWebGLError(err);
    }
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || this.canvas.parentElement?.clientWidth || 600;
    const height = rect.height || this.canvas.parentElement?.clientHeight || 500;

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    // Warm morning sky color (#EBF5EE to #F8F2E6)
    this.scene.background = new THREE.Color('#EBF5EE');

    // Atmospheric depth fog
    this.scene.fog = new THREE.FogExp2(new THREE.Color('#DFEFE3'), 0.022);
  }

  setupCamera() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || this.canvas.parentElement?.clientWidth || 600;
    const height = rect.height || this.canvas.parentElement?.clientHeight || 500;
    const aspect = width / (height || 1);

    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.2, 80);
  }

  setupLighting() {
    // 1. Hemisphere Light (Soft Sky & Ground Bounce)
    const hemiLight = new THREE.HemisphereLight('#EBF5EE', '#8FA490', 0.85);
    hemiLight.position.set(0, 15, 0);
    this.scene.add(hemiLight);

    // 2. Key Sun Directional Light (Warm Golden Sunlight with Soft Shadows)
    this.sunLight = new THREE.DirectionalLight('#FFF9E0', 1.35);
    this.sunLight.position.set(7, 12, 6);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 28;
    this.sunLight.shadow.camera.left = -6;
    this.sunLight.shadow.camera.right = 6;
    this.sunLight.shadow.camera.top = 6;
    this.sunLight.shadow.camera.bottom = -6;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // 3. Fill Directional Light (Mint Ambient Fill)
    const fillLight = new THREE.DirectionalLight('#95D5B2', 0.45);
    fillLight.position.set(-6, 5, -5);
    this.scene.add(fillLight);

    // 4. Subtle Citrus Rim Light
    const rimLight = new THREE.DirectionalLight('#E7CA49', 0.35);
    rimLight.position.set(1, 4, -7);
    this.scene.add(rimLight);
  }

  /* -------------------------------------------------------------------------- */
  /* SPECIMEN DIORAMA BUILDERS                                                  */
  /* -------------------------------------------------------------------------- */
  buildSpecimens() {
    this.specimenGroups = {};

    // 1. Stone Archway Diorama
    this.specimenGroups.sample_archway = this.buildArchwayDiorama();
    this.scene.add(this.specimenGroups.sample_archway);

    // 2. Forest Stream Diorama
    this.specimenGroups.sample_stream = this.buildStreamDiorama();
    this.scene.add(this.specimenGroups.sample_stream);

    // 3. Compacted Trail Diorama
    this.specimenGroups.sample_trailhead = this.buildTrailDiorama();
    this.scene.add(this.specimenGroups.sample_trailhead);

    // Set initial active specimen visibility
    this.applySpecimenVisibility(this.activeSpecimenId);
  }

  // Shared Helper: Organic Stratified Mound Diorama Base
  createDioramaBase(moundRadius = 4.2, grassColorHex = '#3B6347') {
    const group = new THREE.Group();

    // 1. Stratified Soil / Rock Sub-Base Ring (#3D291D)
    const baseGeo = new THREE.CylinderGeometry(moundRadius, moundRadius + 0.35, 0.45, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38281E'),
      roughness: 0.95,
      metalness: 0.05
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.225;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // 2. Stratified Sediment Ring Ledge (#5C4230)
    const strataGeo = new THREE.CylinderGeometry(moundRadius + 0.15, moundRadius + 0.42, 0.2, 32);
    const strataMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#5A4232'),
      roughness: 0.92
    });
    const strataMesh = new THREE.Mesh(strataGeo, strataMat);
    strataMesh.position.y = -0.35;
    strataMesh.receiveShadow = true;
    group.add(strataMesh);

    // 3. Top Sculpted Grass Mound
    const moundGeo = new THREE.CylinderGeometry(moundRadius - 0.1, moundRadius, 0.35, 32);
    const moundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(grassColorHex),
      roughness: 0.88,
      metalness: 0.02
    });
    const moundMesh = new THREE.Mesh(moundGeo, moundMat);
    moundMesh.position.y = 0.15;
    moundMesh.receiveShadow = true;
    group.add(moundMesh);

    // 4. Subtle Ground Shadow Plane
    const shadowGeo = new THREE.CircleGeometry(moundRadius + 1.2, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#14281D'),
      transparent: true,
      opacity: 0.28
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = -0.46;
    group.add(shadowMesh);

    this.disposables.push(baseGeo, baseMat, strataGeo, strataMat, moundGeo, moundMat, shadowGeo, shadowMat);
    return group;
  }

  /* -------------------------------------------------------------------------- */
  /* SPECIMEN 1: STONE ARCHWAY                                                  */
  /* -------------------------------------------------------------------------- */
  buildArchwayDiorama() {
    const group = new THREE.Group();
    group.name = 'specimen_archway';

    // 1. Organic Base Mound
    const mound = this.createDioramaBase(4.2, '#385C43');
    group.add(mound);

    // Granite Materials
    const graniteMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#5E6B62'), // Weathered cut-granite
      roughness: 0.9,
      metalness: 0.05
    });
    const darkGraniteMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#48544C'),
      roughness: 0.95
    });
    const mossMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3B6347'), // Ivy & moss
      roughness: 0.82
    });
    const fernMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#538B57'),
      roughness: 0.75
    });

    // 2. Weathered Stone Threshold Steps & Paving
    const step1Geo = new THREE.BoxGeometry(3.6, 0.18, 1.8);
    const step1 = new THREE.Mesh(step1Geo, graniteMat);
    step1.position.set(0, 0.41, 0);
    step1.receiveShadow = true;
    step1.castShadow = true;
    this.tagLandmark(step1, 'Weathered Stone Threshold', 'Historic Masonry', 'sample_arch_steps');
    group.add(step1);

    const step2Geo = new THREE.BoxGeometry(3.1, 0.16, 1.2);
    const step2 = new THREE.Mesh(step2Geo, darkGraniteMat);
    step2.position.set(0, 0.56, 0);
    step2.receiveShadow = true;
    step2.castShadow = true;
    this.tagLandmark(step2, 'Weathered Stone Threshold', 'Historic Masonry', 'sample_arch_steps');
    group.add(step2);

    // 3. Left Granite Pillar (Multi-course masonry)
    const leftPlinthGeo = new THREE.BoxGeometry(0.95, 0.4, 0.95);
    const leftPlinth = new THREE.Mesh(leftPlinthGeo, darkGraniteMat);
    leftPlinth.position.set(-1.42, 0.82, 0);
    leftPlinth.castShadow = true;
    leftPlinth.receiveShadow = true;
    group.add(leftPlinth);

    const leftShaftGeo = new THREE.BoxGeometry(0.78, 2.7, 0.78);
    const leftShaft = new THREE.Mesh(leftShaftGeo, graniteMat);
    leftShaft.position.set(-1.42, 2.35, 0);
    leftShaft.castShadow = true;
    leftShaft.receiveShadow = true;
    this.tagLandmark(leftShaft, 'Weathered Cut Granite Arch', 'Historic Masonry', 'sample_arch_masonry');
    group.add(leftShaft);

    const leftCapGeo = new THREE.BoxGeometry(0.98, 0.28, 0.98);
    const leftCap = new THREE.Mesh(leftCapGeo, graniteMat);
    leftCap.position.set(-1.42, 3.8, 0);
    leftCap.castShadow = true;
    group.add(leftCap);

    // 4. Right Granite Pillar
    const rightPlinth = new THREE.Mesh(leftPlinthGeo, darkGraniteMat);
    rightPlinth.position.set(1.42, 0.82, 0);
    rightPlinth.castShadow = true;
    rightPlinth.receiveShadow = true;
    group.add(rightPlinth);

    const rightShaft = new THREE.Mesh(leftShaftGeo, graniteMat);
    rightShaft.position.set(1.42, 2.35, 0);
    rightShaft.castShadow = true;
    rightShaft.receiveShadow = true;
    this.tagLandmark(rightShaft, 'Weathered Cut Granite Arch', 'Historic Masonry', 'sample_arch_masonry');
    group.add(rightShaft);

    const rightCap = new THREE.Mesh(leftCapGeo, graniteMat);
    rightCap.position.set(1.42, 3.8, 0);
    rightCap.castShadow = true;
    group.add(rightCap);

    // 5. Curving Stone Arch Ring (Segmented voussoir arc)
    const archRingGeo = new THREE.TorusGeometry(1.42, 0.36, 10, 20, Math.PI);
    const archRing = new THREE.Mesh(archRingGeo, graniteMat);
    archRing.position.set(0, 3.8, 0);
    archRing.castShadow = true;
    archRing.receiveShadow = true;
    this.tagLandmark(archRing, 'Weathered Cut Granite Arch', 'Historic Masonry', 'sample_arch_masonry');
    group.add(archRing);

    // 6. Prominent Citrus Keystone at Apex (#E7CA49)
    const keystoneGeo = new THREE.BoxGeometry(0.62, 0.74, 0.88);
    const keystoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E7CA49'),
      emissive: new THREE.Color('#E7CA49'),
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.4
    });
    this.archKeystone = new THREE.Mesh(keystoneGeo, keystoneMat);
    this.archKeystone.position.set(0, 5.24, 0);
    this.archKeystone.castShadow = true;
    this.tagLandmark(this.archKeystone, 'Carved Citrus Keystone', 'Historic Masonry', 'sample_arch_keystone');
    group.add(this.archKeystone);

    // 7. Climbing Ivy Tendrils & Roots (#3B6347)
    const vine1Geo = new THREE.CylinderGeometry(0.06, 0.04, 2.9, 6);
    const vine1 = new THREE.Mesh(vine1Geo, mossMat);
    vine1.position.set(-1.6, 2.6, 0.35);
    vine1.rotation.z = 0.08;
    vine1.castShadow = true;
    this.tagLandmark(vine1, 'Living Ivy & Wild Ferns', 'Flora / Lichen', 'sample_arch_ivy');
    group.add(vine1);
    this.swayMeshes.push(vine1);

    const vine2Geo = new THREE.CylinderGeometry(0.05, 0.03, 2.4, 6);
    const vine2 = new THREE.Mesh(vine2Geo, mossMat);
    vine2.position.set(1.6, 2.8, 0.35);
    vine2.rotation.z = -0.1;
    vine2.castShadow = true;
    this.tagLandmark(vine2, 'Living Ivy & Wild Ferns', 'Flora / Lichen', 'sample_arch_ivy');
    group.add(vine2);
    this.swayMeshes.push(vine2);

    // Ivy Crown draping across the arch
    const vineTopGeo = new THREE.TorusGeometry(1.44, 0.08, 6, 16, Math.PI * 0.8);
    const vineTop = new THREE.Mesh(vineTopGeo, mossMat);
    vineTop.position.set(0.1, 3.85, 0.32);
    group.add(vineTop);

    // 8. Scattered Tumbled Rocks & Lichen Chunks around base
    const rubbleCoords = [
      { x: -2.3, z: 0.8, r: 0.42 },
      { x: 2.2, z: 0.9, r: 0.36 },
      { x: -1.9, z: -1.1, r: 0.38 },
      { x: 2.1, z: -0.9, r: 0.46 },
      { x: 0.9, z: 1.4, r: 0.28 }
    ];
    rubbleCoords.forEach(rb => {
      const rbGeo = new THREE.DodecahedronGeometry(rb.r, 0);
      const rbMesh = new THREE.Mesh(rbGeo, graniteMat);
      rbMesh.position.set(rb.x, 0.32 + rb.r * 0.4, rb.z);
      rbMesh.rotation.set(rb.x, rb.z, 0.3);
      rbMesh.castShadow = true;
      rbMesh.receiveShadow = true;
      group.add(rbMesh);
      this.disposables.push(rbGeo);
    });

    // 9. Wild Fern Clusters at Arch Base
    const fernCoords = [
      { x: -2.4, z: 0.2, s: 1.1 },
      { x: 2.4, z: 0.3, s: 0.95 },
      { x: -0.9, z: 1.3, s: 0.8 },
      { x: 1.6, z: 1.2, s: 0.85 }
    ];
    fernCoords.forEach(fc => {
      const fern = this.createFernMesh(fc.s, fernMat);
      fern.position.set(fc.x, 0.32, fc.z);
      this.tagLandmark(fern, 'Living Ivy & Wild Ferns', 'Flora / Lichen', 'sample_arch_ivy');
      group.add(fern);
      this.swayMeshes.push(fern);
    });

    // 10. Wildflowers (Blossom Pink #F4C6D7 & Citrus #E7CA49)
    const flowerCoords = [
      { x: -2.6, z: 1.2, color: '#F4C6D7' },
      { x: -2.1, z: 1.6, color: '#E7CA49' },
      { x: 2.5, z: 1.1, color: '#F4C6D7' },
      { x: 2.8, z: -0.4, color: '#E7CA49' },
      { x: 1.2, z: 1.8, color: '#F4C6D7' }
    ];
    flowerCoords.forEach(fl => {
      const flower = this.createFlowerMesh(fl.color);
      flower.position.set(fl.x, 0.32, fl.z);
      group.add(flower);
      this.swayMeshes.push(flower);
    });

    // 11. Background Framing Evergreen Pine
    const bgPine = this.createPineTree(1.25);
    bgPine.position.set(-2.5, 0.32, -2.2);
    group.add(bgPine);

    this.disposables.push(
      graniteMat, darkGraniteMat, mossMat, fernMat, keystoneMat,
      step1Geo, step2Geo, leftPlinthGeo, leftShaftGeo, leftCapGeo,
      archRingGeo, keystoneGeo, vine1Geo, vine2Geo, vineTopGeo
    );
    return group;
  }

  /* -------------------------------------------------------------------------- */
  /* SPECIMEN 2: FOREST STREAM                                                  */
  /* -------------------------------------------------------------------------- */
  buildStreamDiorama() {
    const group = new THREE.Group();
    group.name = 'specimen_stream';

    // 1. Organic Base Mound
    const mound = this.createDioramaBase(4.2, '#31523B');
    group.add(mound);

    // 2. Recessed Stream Corridor Earth Channel
    const riverbedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2C382F'), // Wet river mud & gravel
      roughness: 0.92
    });
    const riverbedGeo = new THREE.CylinderGeometry(1.6, 2.2, 0.3, 24);
    riverbedGeo.scale(1.8, 1, 0.7);
    const riverbed = new THREE.Mesh(riverbedGeo, riverbedMat);
    riverbed.position.set(0, 0.22, 0);
    riverbed.receiveShadow = true;
    group.add(riverbed);

    // 3. Flowing Mountain Stream Channel (Tube Geometry + Translucent Water)
    const streamPoints = [
      new THREE.Vector3(-3.8, 0.38, 2.2),
      new THREE.Vector3(-2.2, 0.34, 1.2),
      new THREE.Vector3(-0.8, 0.28, -0.2),
      new THREE.Vector3(0.6, 0.26, -0.6),
      new THREE.Vector3(2.2, 0.24, -1.4),
      new THREE.Vector3(3.8, 0.22, -2.4)
    ];
    const streamCurve = new THREE.CatmullRomCurve3(streamPoints);
    const streamGeo = new THREE.TubeGeometry(streamCurve, 48, 0.68, 10, false);

    // Translucent Sky-Blue Water Material (#8EC9E8)
    const waterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8EC9E8'),
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88
    });
    this.streamMesh = new THREE.Mesh(streamGeo, waterMat);
    this.streamMesh.receiveShadow = true;
    this.tagLandmark(this.streamMesh, 'Clear Glacial Stream Channel', 'Hydrology', 'sample_stream_water');
    group.add(this.streamMesh);

    // 4. Smooth River Granite Boulders in and along the water
    const boulderCoords = [
      { x: -1.4, z: 0.6, r: 0.58, label: 'Smooth River Granite Rocks' },
      { x: -0.2, z: 0.5, r: 0.44, label: 'Smooth River Granite Rocks' },
      { x: 1.1, z: 0.2, r: 0.52, label: 'Smooth River Granite Rocks' },
      { x: -0.5, z: -1.1, r: 0.62, label: 'Mossy River Granite' },
      { x: 1.8, z: -0.6, r: 0.48, label: 'Smooth River Granite Rocks' },
      { x: -2.6, z: 1.8, r: 0.65, label: 'Riverbank Boulder' },
      { x: 2.8, z: -1.8, r: 0.54, label: 'Riverbank Boulder' }
    ];
    const boulderMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6E7B71'), // River granite
      roughness: 0.78,
      metalness: 0.12
    });
    boulderCoords.forEach(bc => {
      const bGeo = new THREE.DodecahedronGeometry(bc.r, 1);
      const bMesh = new THREE.Mesh(bGeo, boulderMat);
      bMesh.position.set(bc.x, 0.32 + bc.r * 0.45, bc.z);
      bMesh.rotation.set(bc.x * 0.5, bc.z * 0.4, 0.2);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      this.tagLandmark(bMesh, bc.label, 'Geology', 'sample_stream_boulders');
      group.add(bMesh);
      this.disposables.push(bGeo);
    });

    // 5. Wetland Reeds and Cattails along Stream Edges (#95D5B2 Mint & #3B6347)
    const reedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#95D5B2'),
      roughness: 0.75
    });
    const cattailHeadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4A2E1B'),
      roughness: 0.9
    });

    const reedPositions = [
      { x: -2.1, z: 0.2 }, { x: -1.9, z: -0.3 }, { x: -1.7, z: 0.1 },
      { x: -0.8, z: 1.0 }, { x: -0.5, z: 1.2 },  { x: -0.3, z: 1.1 },
      { x: 0.4, z: -1.2 }, { x: 0.7, z: -1.4 },  { x: 0.9, z: -1.2 },
      { x: 1.5, z: 0.8 },  { x: 1.7, z: 0.6 },   { x: 1.9, z: 0.9 },
      { x: 2.4, z: -0.8 }, { x: 2.6, z: -0.6 }
    ];

    reedPositions.forEach((rp, idx) => {
      const reedGroup = new THREE.Group();
      const stemH = 1.2 + (idx % 4) * 0.25;
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, stemH, 5);
      const stem = new THREE.Mesh(stemGeo, reedMat);
      stem.position.y = stemH / 2;
      stem.castShadow = true;
      reedGroup.add(stem);

      if (idx % 2 === 0) {
        // Brown cattail head
        const headGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6);
        const head = new THREE.Mesh(headGeo, cattailHeadMat);
        head.position.y = stemH - 0.2;
        head.castShadow = true;
        reedGroup.add(head);
        this.disposables.push(headGeo);
      }

      reedGroup.position.set(rp.x, 0.32, rp.z);
      reedGroup.rotation.z = (Math.random() - 0.5) * 0.15;
      this.tagLandmark(reedGroup, 'Wetland Reeds & Ferns', 'Flora', 'sample_stream_reeds');
      group.add(reedGroup);
      this.swayMeshes.push(reedGroup);
      this.disposables.push(stemGeo);
    });

    // 6. Overhanging Wild Fern Clumps along riverbank
    const fernMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#538B57'),
      roughness: 0.8
    });
    const fernCoords = [
      { x: -1.2, z: 1.5, s: 1.1 },
      { x: 0.2, z: 1.6, s: 0.9 },
      { x: -2.4, z: -1.2, s: 1.2 },
      { x: 1.4, z: -1.6, s: 1.0 }
    ];
    fernCoords.forEach(fc => {
      const fern = this.createFernMesh(fc.s, fernMat);
      fern.position.set(fc.x, 0.32, fc.z);
      this.tagLandmark(fern, 'Wetland Reeds & Ferns', 'Flora', 'sample_stream_reeds');
      group.add(fern);
      this.swayMeshes.push(fern);
    });

    // 7. Riverbank Wildflowers
    const flowerCoords = [
      { x: -1.6, z: 1.8, color: '#F4C6D7' },
      { x: 1.0, z: 1.7, color: '#E7CA49' },
      { x: -2.8, z: -0.8, color: '#F4C6D7' },
      { x: 2.1, z: 1.4, color: '#E7CA49' }
    ];
    flowerCoords.forEach(fl => {
      const flower = this.createFlowerMesh(fl.color);
      flower.position.set(fl.x, 0.32, fl.z);
      group.add(flower);
      this.swayMeshes.push(flower);
    });

    // 8. Framing Riverbank Oak Tree
    const framingOak = this.createOakTree(1.15);
    framingOak.position.set(-2.6, 0.32, -1.8);
    group.add(framingOak);

    this.disposables.push(
      riverbedGeo, riverbedMat, streamGeo, waterMat,
      boulderMat, reedMat, cattailHeadMat, fernMat
    );
    return group;
  }

  /* -------------------------------------------------------------------------- */
  /* SPECIMEN 3: COMPACTED TRAIL                                                */
  /* -------------------------------------------------------------------------- */
  buildTrailDiorama() {
    const group = new THREE.Group();
    group.name = 'specimen_trailhead';

    // 1. Organic Base Mound
    const mound = this.createDioramaBase(4.2, '#425C47');
    group.add(mound);

    // 2. Beaten Earth Footpath (Winding Curved Strip across diorama)
    const trailMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8A6B47'), // Compacted brown earth
      roughness: 0.95,
      metalness: 0.02
    });

    const trailPoints = [
      new THREE.Vector3(-3.8, 0.34, -2.4),
      new THREE.Vector3(-2.0, 0.34, -1.2),
      new THREE.Vector3(-0.5, 0.35, 0.1),
      new THREE.Vector3(1.0, 0.34, 1.2),
      new THREE.Vector3(2.6, 0.34, 2.0),
      new THREE.Vector3(3.8, 0.34, 2.6)
    ];
    const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
    const trailGeo = new THREE.TubeGeometry(trailCurve, 40, 0.72, 8, false);
    trailGeo.scale(1, 0.15, 1); // Flatten into a path ribbon
    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    trailMesh.position.y = 0.28;
    trailMesh.receiveShadow = true;
    this.tagLandmark(trailMesh, 'Compacted Earth Footpath', 'Pedestrian Trail', 'sample_trail_path');
    group.add(trailMesh);

    // 3. Pine Needle Ground Cover Litter along path borders (#9E7B47)
    const pineLitterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#9E7B47'),
      roughness: 0.98
    });
    const needlePatches = [
      { x: -1.2, z: -0.6, sx: 1.1, sz: 0.6 },
      { x: 0.4, z: 0.7, sx: 0.9, sz: 0.8 },
      { x: 1.8, z: 1.5, sx: 1.2, sz: 0.5 },
      { x: -2.2, z: -1.6, sx: 1.0, sz: 0.7 }
    ];
    needlePatches.forEach(np => {
      const pGeo = new THREE.CylinderGeometry(np.sx, np.sx + 0.2, 0.04, 12);
      pGeo.scale(1, 1, np.sz / np.sx);
      const pMesh = new THREE.Mesh(pGeo, pineLitterMat);
      pMesh.position.set(np.x, 0.33, np.z);
      pMesh.receiveShadow = true;
      group.add(pMesh);
      this.disposables.push(pGeo);
    });

    // 4. Trail Shoulder Pebbles and Stones
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#788A7E'),
      roughness: 0.92
    });
    const pebbleCoords = [
      { x: -0.8, z: -0.2, r: 0.15 },
      { x: -0.2, z: 0.4, r: 0.18 },
      { x: 0.6, z: 0.9, r: 0.14 },
      { x: 1.4, z: 1.6, r: 0.22 },
      { x: -1.6, z: -0.9, r: 0.25 }
    ];
    pebbleCoords.forEach(pb => {
      const pbGeo = new THREE.DodecahedronGeometry(pb.r, 0);
      const pbMesh = new THREE.Mesh(pbGeo, pebbleMat);
      pbMesh.position.set(pb.x, 0.33 + pb.r * 0.4, pb.z);
      pbMesh.castShadow = true;
      pbMesh.receiveShadow = true;
      group.add(pbMesh);
      this.disposables.push(pbGeo);
    });

    // 5. Weathered Timber Trail Junction Post (#3D291D)
    const signpostGroup = new THREE.Group();
    signpostGroup.position.set(-0.2, 0.32, -0.8);

    // Sturdy Stone Cairn Foundation
    const cairnGeo = new THREE.CylinderGeometry(0.52, 0.78, 0.58, 7);
    const cairnMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#788A7E'),
      roughness: 0.95
    });
    const cairn = new THREE.Mesh(cairnGeo, cairnMat);
    cairn.position.y = 0.29;
    cairn.castShadow = true;
    cairn.receiveShadow = true;
    this.tagLandmark(cairn, 'Stone Cairn Foundation', 'Historic Masonry', 'sample_trail_cairn');
    signpostGroup.add(cairn);

    // Weathered Timber Post
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.6, 6);
    const postMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3D291D'),
      roughness: 0.92
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 1.3;
    post.castShadow = true;
    this.tagLandmark(post, 'Survey Milepost Marker', 'Trail Marker', 'sample_trail_sign');
    signpostGroup.add(post);

    // Carved Directional Sign Arms
    const armMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4A3222'),
      roughness: 0.88
    });
    const arm1Geo = new THREE.BoxGeometry(1.2, 0.24, 0.08);
    const arm1 = new THREE.Mesh(arm1Geo, armMat);
    arm1.position.set(0.44, 2.15, 0);
    arm1.rotation.y = 0.22;
    arm1.castShadow = true;
    signpostGroup.add(arm1);

    // Citrus Painted Direction Arrow (#E7CA49)
    const arrowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E7CA49'),
      roughness: 0.55
    });
    const arrowGeo = new THREE.ConeGeometry(0.16, 0.32, 4);
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(1.08, 2.15, 0.04);
    arrow.rotation.z = -Math.PI / 2;
    arrow.castShadow = true;
    signpostGroup.add(arrow);

    const arm2Geo = new THREE.BoxGeometry(1.1, 0.22, 0.08);
    const arm2 = new THREE.Mesh(arm2Geo, armMat);
    arm2.position.set(-0.42, 1.85, 0);
    arm2.rotation.y = -0.35;
    arm2.castShadow = true;
    signpostGroup.add(arm2);

    this.tagLandmark(signpostGroup, 'Survey Milepost Marker', 'Trail Marker', 'sample_trail_sign');
    group.add(signpostGroup);

    // 6. Mountain Evergreen Conifer Pines (#1D4A2E)
    const mainPine = this.createPineTree(1.45);
    mainPine.position.set(1.8, 0.32, -1.6);
    this.tagLandmark(mainPine, 'Mountain Evergreen Conifers', 'Canopy Flora', 'sample_trail_pine');
    group.add(mainPine);

    const secondaryPine = this.createPineTree(0.95);
    secondaryPine.position.set(2.8, 0.32, -0.6);
    group.add(secondaryPine);

    // 7. Wild Mountain Ferns Flanking Path
    const fernMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#538B57'),
      roughness: 0.8
    });
    const fernCoords = [
      { x: -1.6, z: 0.8, s: 1.1 },
      { x: -0.6, z: 1.2, s: 0.9 },
      { x: 0.8, z: -0.2, s: 0.95 },
      { x: 2.2, z: 0.4, s: 1.0 }
    ];
    fernCoords.forEach(fc => {
      const fern = this.createFernMesh(fc.s, fernMat);
      fern.position.set(fc.x, 0.32, fc.z);
      group.add(fern);
      this.swayMeshes.push(fern);
    });

    // 8. Alpine Wildflowers
    const flowerCoords = [
      { x: -1.2, z: 1.4, color: '#F4C6D7' },
      { x: 0.3, z: 1.5, color: '#E7CA49' },
      { x: -0.9, z: -1.4, color: '#F4C6D7' },
      { x: 2.5, z: 1.2, color: '#E7CA49' }
    ];
    flowerCoords.forEach(fl => {
      const flower = this.createFlowerMesh(fl.color);
      flower.position.set(fl.x, 0.32, fl.z);
      group.add(flower);
      this.swayMeshes.push(flower);
    });

    this.disposables.push(
      trailGeo, trailMat, pineLitterMat, pebbleMat,
      cairnGeo, cairnMat, postGeo, postMat, armMat,
      arm1Geo, arm2Geo, arrowGeo, arrowMat, fernMat
    );
    return group;
  }

  /* -------------------------------------------------------------------------- */
  /* PROCEDURAL BOTANICAL HELPERS                                               */
  /* -------------------------------------------------------------------------- */
  createFernMesh(scale = 1.0, material) {
    const group = new THREE.Group();
    const frondCount = 6;
    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2;
      const frondGeo = new THREE.CylinderGeometry(0.02 * scale, 0.08 * scale, 0.65 * scale, 4);
      const frond = new THREE.Mesh(frondGeo, material);
      frond.position.set(Math.cos(angle) * 0.15 * scale, 0.25 * scale, Math.sin(angle) * 0.15 * scale);
      frond.rotation.z = 0.55;
      frond.rotation.y = angle;
      frond.castShadow = true;
      group.add(frond);
      this.disposables.push(frondGeo);
    }
    return group;
  }

  createFlowerMesh(petalHex) {
    const group = new THREE.Group();

    // Stem: Forest green
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.38, 4);
    const stemMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3A754B'),
      roughness: 0.8
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.19;
    group.add(stem);

    // Blossom Petals: Blossom Pink (#F4C6D7) or Citrus (#E7CA49)
    const petalGeo = new THREE.DodecahedronGeometry(0.11, 0);
    const petalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(petalHex),
      roughness: 0.6
    });
    const blossom = new THREE.Mesh(petalGeo, petalMat);
    blossom.position.y = 0.38;
    group.add(blossom);

    // Core Center Dot
    const centerGeo = new THREE.SphereGeometry(0.045, 4, 4);
    const centerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFF8D1'),
      roughness: 0.4
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.y = 0.43;
    group.add(center);

    this.disposables.push(stemGeo, stemMat, petalGeo, petalMat, centerGeo, centerMat);
    return group;
  }

  createPineTree(scale = 1.0) {
    const group = new THREE.Group();

    // Trunk (#3D291D)
    const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 1.8 * scale, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3D291D'),
      roughness: 0.92
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.9 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    // Stratified Conical Foliage Tiers (#1D4A2E)
    const pineMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1D4A2E'),
      roughness: 0.82
    });
    const tierSpecs = [
      { y: 1.4 * scale, r: 1.25 * scale, h: 1.1 * scale },
      { y: 2.1 * scale, r: 0.95 * scale, h: 1.0 * scale },
      { y: 2.7 * scale, r: 0.65 * scale, h: 0.9 * scale }
    ];
    tierSpecs.forEach(ts => {
      const tierGeo = new THREE.ConeGeometry(ts.r, ts.h, 7);
      const tier = new THREE.Mesh(tierGeo, pineMat);
      tier.position.y = ts.y;
      tier.castShadow = true;
      group.add(tier);
      this.disposables.push(tierGeo);
    });

    this.disposables.push(trunkGeo, trunkMat, pineMat);
    return group;
  }

  createOakTree(scale = 1.0) {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.38 * scale, 1.9 * scale, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#423022'),
      roughness: 0.9
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.95 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    // Canopy spheres
    const canopyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2F683E'),
      roughness: 0.8
    });
    const canopyGeo1 = new THREE.DodecahedronGeometry(1.1 * scale, 1);
    const c1 = new THREE.Mesh(canopyGeo1, canopyMat);
    c1.position.set(0, 2.3 * scale, 0);
    c1.castShadow = true;
    group.add(c1);

    const canopyGeo2 = new THREE.DodecahedronGeometry(0.85 * scale, 1);
    const c2 = new THREE.Mesh(canopyGeo2, canopyMat);
    c2.position.set(0.6 * scale, 2.6 * scale, 0.3 * scale);
    c2.castShadow = true;
    group.add(c2);

    this.disposables.push(trunkGeo, trunkMat, canopyMat, canopyGeo1, canopyGeo2);
    return group;
  }

  /* -------------------------------------------------------------------------- */
  /* ATMOSPHERIC PARTICLES                                                      */
  /* -------------------------------------------------------------------------- */
  buildParticles() {
    const count = 36;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const c1 = new THREE.Color('#E7CA49'); // Citrus golden spores
    const c2 = new THREE.Color('#F4C6D7'); // Blossom pink petals

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8.0;
      pos[i * 3 + 1] = 0.6 + Math.random() * 4.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8.0;

      const col = Math.random() > 0.4 ? c1 : c2;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this.scene.add(this.particleSystem);
    this.disposables.push(geo, mat);
  }

  /* -------------------------------------------------------------------------- */
  /* LANDMARK RAYCASTING TAGS                                                   */
  /* -------------------------------------------------------------------------- */
  tagLandmark(meshOrGroup, name, category, findingKey) {
    meshOrGroup.userData = {
      isLandmark: true,
      name,
      category,
      findingKey
    };
    if (meshOrGroup.isMesh) {
      this.interactiveMeshes.push(meshOrGroup);
    } else {
      meshOrGroup.traverse(child => {
        if (child.isMesh) {
          child.userData = meshOrGroup.userData;
          this.interactiveMeshes.push(child);
        }
      });
    }
  }

  /* -------------------------------------------------------------------------- */
  /* SPECIMEN SWITCHING & CAMERA FOCUS                                          */
  /* -------------------------------------------------------------------------- */
  setSpecimen(specimenId, immediate = false) {
    if (!this.specimenPresets[specimenId]) return;
    this.activeSpecimenId = specimenId;

    const preset = this.specimenPresets[specimenId];

    this.targetAzimuth = preset.defaultAzimuth;
    this.targetElevation = preset.defaultElevation;
    this.targetDistance = preset.defaultDistance;
    this.targetLookTarget.copy(preset.lookTarget);

    if (immediate || this.isReducedMotion) {
      this.azimuth = this.targetAzimuth;
      this.elevation = this.targetElevation;
      this.distance = this.targetDistance;
      this.lookTarget.copy(this.targetLookTarget);
      this.applySpecimenVisibility(specimenId);
      this.updateCameraImmediate();
    } else {
      this.isTransitioning = true;
      this.transitionProgress = 0.0;
      this.applySpecimenVisibility(specimenId);
    }
  }

  applySpecimenVisibility(activeId) {
    Object.keys(this.specimenGroups).forEach(id => {
      const grp = this.specimenGroups[id];
      if (grp) {
        const isActive = id === activeId;
        grp.visible = isActive;
        if (isActive) {
          grp.scale.set(1, 1, 1);
        }
      }
    });
  }

  resetCamera() {
    const preset = this.specimenPresets[this.activeSpecimenId];
    if (!preset) return;

    this.targetAzimuth = preset.defaultAzimuth;
    this.targetElevation = preset.defaultElevation;
    this.targetDistance = preset.defaultDistance;
    this.targetLookTarget.copy(preset.lookTarget);

    if (this.isReducedMotion) {
      this.azimuth = this.targetAzimuth;
      this.elevation = this.targetElevation;
      this.distance = this.targetDistance;
      this.lookTarget.copy(this.targetLookTarget);
      this.updateCameraImmediate();
    }
  }

  zoomIn() {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance - 1.2, this.minDistance, this.maxDistance);
  }

  zoomOut() {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + 1.2, this.minDistance, this.maxDistance);
  }

  /* -------------------------------------------------------------------------- */
  /* EVENT LISTENERS                                                            */
  /* -------------------------------------------------------------------------- */
  setupEvents() {
    this.boundOnPointerDown = (e) => this.onPointerDown(e);
    this.boundOnPointerMove = (e) => this.onPointerMove(e);
    this.boundOnPointerUp = (e) => this.onPointerUp(e);
    this.boundOnWheel = (e) => this.onWheel(e);
    this.boundOnResize = () => this.resize();

    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);
    window.addEventListener('pointercancel', this.boundOnPointerUp);
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });
    window.addEventListener('resize', this.boundOnResize);
  }

  onPointerDown(e) {
    if (this.isPaused) return;
    this.isDragging = true;
    this.hasMovedSignificantly = false;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  onPointerMove(e) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      this.hasMovedSignificantly = true;
    }

    const sensitivity = 0.007;
    this.targetAzimuth -= dx * sensitivity;
    // Clamp elevation between -0.15 and 1.25 rad (~ -8 deg to 72 deg)
    this.targetElevation = THREE.MathUtils.clamp(this.targetElevation + dy * sensitivity, -0.15, 1.25);

    this.dragStart = { x: e.clientX, y: e.clientY };
  }

  onPointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';

    // If pointer didn't drag significantly, treat as landmark inspection click
    if (!this.hasMovedSignificantly) {
      this.checkLandmarkClick(e);
    }
  }

  onWheel(e) {
    if (this.isPaused) return;
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.006;
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + zoomDelta, this.minDistance, this.maxDistance);
  }

  checkLandmarkClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const visibleActiveMeshes = this.interactiveMeshes.filter(m => m.visible && m.parent?.visible);
    const intersects = this.raycaster.intersectObjects(visibleActiveMeshes, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = hit.userData;
      if (data && data.isLandmark) {
        this.pulseMeshHighlight(hit);
        this.onInspectLandmark(data);
      }
    }
  }

  pulseMeshHighlight(mesh) {
    this.highlightedMesh = mesh;
    this.highlightPulse = 1.0;
  }

  /* -------------------------------------------------------------------------- */
  /* ANIMATION & RENDER LOOP                                                    */
  /* -------------------------------------------------------------------------- */
  animate() {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(() => this.animate());

    if (this.isPaused) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // 1. Camera Orbit & Zoom Smooth Damping
    const lerpSpeed = this.isReducedMotion ? 1.0 : 0.09;
    this.azimuth += (this.targetAzimuth - this.azimuth) * lerpSpeed;
    this.elevation += (this.targetElevation - this.elevation) * lerpSpeed;
    this.distance += (this.targetDistance - this.distance) * lerpSpeed;
    this.lookTarget.lerp(this.targetLookTarget, lerpSpeed);

    this.updateCameraImmediate();

    // 2. Keystone & Specimen Jewel Ambient Pulse
    if (this.archKeystone) {
      const pulse = 0.45 + Math.sin(elapsed * 2.5) * 0.2;
      this.archKeystone.material.emissiveIntensity = pulse;
    }

    // 3. Gentle Botanical Swaying
    if (!this.isReducedMotion) {
      this.swayMeshes.forEach((mesh, idx) => {
        if (mesh.parent?.visible) {
          const sway = Math.sin(elapsed * 1.8 + idx * 0.45) * 0.025;
          mesh.rotation.z = (mesh.rotation.z || 0) * 0.98 + sway * 0.02;
        }
      });
    }

    // 4. Drifting Spore Particles
    if (this.particleSystem && !this.isReducedMotion) {
      const pos = this.particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += Math.sin(elapsed + i) * 0.003;
        pos[i] += Math.cos(elapsed * 0.8 + i) * 0.002;
      }
      this.particleSystem.geometry.attributes.position.needsUpdate = true;
      this.particleSystem.rotation.y = elapsed * 0.02;
    }

    // 5. Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateCameraImmediate() {
    if (!this.camera) return;

    // Spherical to Cartesian Coordinates centered on lookTarget
    const cosElev = Math.cos(this.elevation);
    const sinElev = Math.sin(this.elevation);
    const cosAzim = Math.cos(this.azimuth);
    const sinAzim = Math.sin(this.azimuth);

    this.camera.position.x = this.lookTarget.x + this.distance * cosElev * sinAzim;
    this.camera.position.y = this.lookTarget.y + this.distance * sinElev;
    this.camera.position.z = this.lookTarget.z + this.distance * cosElev * cosAzim;

    this.camera.lookAt(this.lookTarget);
  }

  /* -------------------------------------------------------------------------- */
  /* RESIZE, LIFECYCLE & DISPOSAL                                               */
  /* -------------------------------------------------------------------------- */
  resize() {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || this.canvas.parentElement?.clientWidth || 600;
    const height = rect.height || this.canvas.parentElement?.clientHeight || 500;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.resize();
  }

  handleWebGLError(err) {
    if (this.canvas && this.canvas.parentElement) {
      const fallback = document.createElement('div');
      fallback.className = 'w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#EBF5EE] text-[#064E2D] space-y-3';
      fallback.innerHTML = `
        <div class="text-4xl">🏛️</div>
        <h4 class="font-display font-bold text-lg">3D Specimen Viewport</h4>
        <p class="text-xs text-[#538B57] max-w-sm">
          WebGL acceleration is currently inactive. Field observations and specimen catalog records are accessible in the journal.
        </p>
      `;
      this.canvas.replaceWith(fallback);
    }
  }

  dispose() {
    this.isDisposed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
      this.canvas.removeEventListener('wheel', this.boundOnWheel);
    }
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
    window.removeEventListener('pointercancel', this.boundOnPointerUp);
    window.removeEventListener('resize', this.boundOnResize);

    this.disposables.forEach(d => {
      if (d && typeof d.dispose === 'function') {
        d.dispose();
      }
    });
    this.disposables = [];

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}
