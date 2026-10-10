// UNSEEN — Distinct 3D Botanical Sanctuary and The Wilds Environments
// Art Direction: Citrus Fields Living Botanical Sanctuary (Three.js)
// 1. SanctuaryScene: Calm, intimate, curated botanical garden with clear central home plot
// 2. WildernessScene: Expansive outdoor wilderness reserve with interactive landmarks

import * as THREE from 'three';

/* ========================================================================== */
/* SHARED 3D BOTANICAL & MASONRY GENERATORS                                   */
/* ========================================================================== */

export function createPineTree(scale = 1.0) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#382419', roughness: 1.0 });
  const pMat = new THREE.MeshStandardMaterial({ color: '#1B4332', roughness: 0.85, flatShading: true });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.16 * scale, 1.1 * scale, 6), trunkMat);
  trunk.position.y = 0.55 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const b1 = new THREE.Mesh(new THREE.ConeGeometry(0.95 * scale, 1.25 * scale, 7), pMat);
  b1.position.y = 1.45 * scale;
  b1.castShadow = true;
  group.add(b1);

  const b2 = new THREE.Mesh(new THREE.ConeGeometry(0.75 * scale, 1.05 * scale, 7), pMat);
  b2.position.y = 2.15 * scale;
  b2.castShadow = true;
  group.add(b2);

  const b3 = new THREE.Mesh(new THREE.ConeGeometry(0.5 * scale, 0.85 * scale, 7), pMat);
  b3.position.y = 2.75 * scale;
  b3.castShadow = true;
  group.add(b3);

  return group;
}

export function createOakTree(scale = 1.0) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4A3423', roughness: 0.92, flatShading: true });
  const cMat1 = new THREE.MeshStandardMaterial({ color: '#275E38', roughness: 0.78, flatShading: true });
  const cMat2 = new THREE.MeshStandardMaterial({ color: '#3B7E4E', roughness: 0.76, flatShading: true });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.34 * scale, 1.5 * scale, 7), trunkMat);
  trunk.position.y = 0.75 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05 * scale, 0), cMat1);
  c1.position.set(0, 1.95 * scale, 0);
  c1.castShadow = true;
  group.add(c1);

  const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78 * scale, 0), cMat2);
  c2.position.set(0.35 * scale, 2.45 * scale, -0.25 * scale);
  c2.castShadow = true;
  group.add(c2);

  return group;
}

export function createGardenBirch(scale = 1.0) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#D9D4C8', roughness: 0.9, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#5AA06C', roughness: 0.75, flatShading: true });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.14 * scale, 1.8 * scale, 6), trunkMat);
  trunk.position.y = 0.9 * scale;
  trunk.rotation.z = -0.06;
  trunk.castShadow = true;
  group.add(trunk);

  const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * scale, 0), leafMat);
  c1.position.set(-0.1 * scale, 2.1 * scale, 0.1 * scale);
  c1.castShadow = true;
  group.add(c1);

  const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 * scale, 0), leafMat);
  c2.position.set(0.25 * scale, 2.5 * scale, -0.2 * scale);
  c2.castShadow = true;
  group.add(c2);

  return group;
}

/* ========================================================================== */
/* 1. SANCTUARY SCENE: CALM CURATED BOTANICAL GARDEN & HOME PLOT               */
/* ========================================================================== */

export class SanctuaryScene {
  constructor(canvas, state, options = {}) {
    this.canvas = canvas;
    this.state = state;
    this.options = options;

    this.gridSize = state.gridSize || 10;
    this.tileSize = 1.6;
    this.worldOriginOffset = (this.gridSize * this.tileSize) / 2;

    this.currentMode = 'select'; // 'select' | 'place' | 'build' | 'drag'
    this.activeInventoryItemId = null;
    this.selectedPlacedId = null;
    this.buildRotation = 0; // 0, 90, 180, 270

    this.hoveredCell = null;
    this.placementLocked = false;

    // Architectural three-quarter perspective camera
    this.defaultAzimuth = Math.PI / 4;   // 45 degrees
    this.defaultElevation = 0.58;       // ~33 degrees
    this.defaultDistance = 22.5;
    this.defaultLookTarget = new THREE.Vector3(0, 0.2, 0);

    this.cameraAzimuth = this.defaultAzimuth;
    this.cameraElevation = this.defaultElevation;
    this.cameraDistance = this.defaultDistance;
    this.lookTarget = this.defaultLookTarget.clone();

    this.targetAzimuth = this.cameraAzimuth;
    this.targetElevation = this.cameraElevation;
    this.targetDistance = this.cameraDistance;
    this.targetLookTarget = this.defaultLookTarget.clone();

    this.minDistance = 10.0;
    this.maxDistance = 38.0;

    // Interaction State
    this.isOrbiting = false;
    this.isPanning = false;
    this.dragStart = { x: 0, y: 0 };
    this.hasMovedSignificantly = false;

    this.objectMeshes = new Map();
    this.ghostGroup = null;
    this.swayMeshes = [];
    this.streamMeshes = [];
    this.settleAnimations = [];
    this.placementRipples = [];
    this.disposables = [];

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isPaused = false;

    this.onSelectCallback = options.onSelect || (() => {});
    this.onPlaceCallback = options.onPlace || (() => {});
    this.onBuildCallback = options.onBuild || (() => {});

    this.init();
    this.setupEvents();
    this.renderWorldFromState();
    this.animate();
  }

  init() {
    // 1. Scene: Luminous calm daylight (#E5F0E8)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#E5F0E8');
    this.scene.fog = new THREE.FogExp2(new THREE.Color('#E5F0E8'), 0.0085);

    // 2. Camera: Architectural Three-Quarter Perspective
    const parent = this.canvas.parentElement;
    const width = (parent && parent.clientWidth > 10 ? parent.clientWidth : 0) || window.innerWidth;
    const height = (parent && parent.clientHeight > 10 ? parent.clientHeight : 0) || (window.innerHeight - 64);
    const aspect = width / (height || 1);

    this.camera = new THREE.PerspectiveCamera(36, aspect, 0.5, 200);
    this.updateCameraImmediate();

    // 3. Renderer with soft PCF shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    // 4. Soft Garden Lighting
    this.setupLighting();

    // 5. Curated Garden Sanctuary Environment
    this.createGardenSanctuaryTerrain();

    // 6. Raycaster & Pointer
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // 7. Subtle Golden Citrus Pollen (12 motes)
    this.createAmbientPollen();
  }

  setupLighting() {
    // Soft sky hemisphere fill light
    const hemiLight = new THREE.HemisphereLight('#F0F9F4', '#BAD9C4', 1.25);
    hemiLight.position.set(0, 40, 0);
    this.scene.add(hemiLight);

    // Gentle ambient light
    const ambient = new THREE.AmbientLight('#FCFAF5', 0.65);
    this.scene.add(ambient);

    // Warm Sun Directional Light with soft shadows
    this.sun = new THREE.DirectionalLight('#FFF9E6', 2.3);
    this.sun.position.set(24, 34, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 1024;
    this.sun.shadow.mapSize.height = 1024;
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 80;
    const shadowD = 14;
    this.sun.shadow.camera.left = -shadowD;
    this.sun.shadow.camera.right = shadowD;
    this.sun.shadow.camera.top = shadowD;
    this.sun.shadow.camera.bottom = -shadowD;
    this.sun.shadow.bias = -0.0003;
    this.scene.add(this.sun);

    // Soft Warm Rim Light from opposite angle
    const rimLight = new THREE.DirectionalLight('#FFEAA8', 0.55);
    rimLight.position.set(-20, 18, -20);
    this.scene.add(rimLight);
  }

  /* -------------------------------------------------------------------------- */
  /* CURATED BOTANICAL GARDEN TERRAIN (CLEAN, INTIMATE, UNOBSTRUCTED)           */
  /* -------------------------------------------------------------------------- */
  createGardenSanctuaryTerrain() {
    const totalWidth = this.gridSize * this.tileSize;
    const totalDepth = this.gridSize * this.tileSize;

    // 1. MANICURED LAWN PLATE (Open, spacious, level)
    const lawnGeo = new THREE.BoxGeometry(totalWidth, 0.4, totalDepth);
    const lawnMat = new THREE.MeshStandardMaterial({
      color: '#327749',
      roughness: 0.84,
      metalness: 0.02,
      flatShading: true
    });
    const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
    lawnMesh.position.y = -0.2;
    lawnMesh.receiveShadow = true;
    this.scene.add(lawnMesh);

    // 2. BEVELED LIMESTONE GARDEN CURB (Clean architectural framing)
    const curbGeo = new THREE.BoxGeometry(totalWidth + 0.32, 0.12, totalDepth + 0.32);
    const curbMat = new THREE.MeshStandardMaterial({ color: '#D5CFC4', roughness: 0.9, flatShading: true });
    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.position.y = -0.42;
    curbMesh.receiveShadow = true;
    this.scene.add(curbMesh);

    // Low Earth Foundation Plinth
    const earthBaseGeo = new THREE.BoxGeometry(totalWidth + 0.1, 1.2, totalDepth + 0.1);
    const earthBaseMat = new THREE.MeshStandardMaterial({ color: '#4B3B2D', roughness: 0.96, flatShading: true });
    const earthBase = new THREE.Mesh(earthBaseGeo, earthBaseMat);
    earthBase.position.y = -1.05;
    this.scene.add(earthBase);

    // Ground Plane for Raycasting
    const groundPlaneGeo = new THREE.PlaneGeometry(totalWidth, totalDepth);
    groundPlaneGeo.rotateX(-Math.PI / 2);
    const groundPlaneMat = new THREE.MeshBasicMaterial({ visible: false });
    this.groundPlane = new THREE.Mesh(groundPlaneGeo, groundPlaneMat);
    this.scene.add(this.groundPlane);

    // Subtle Placement Grid Lines
    this.gridGroup = new THREE.Group();
    this.gridLineMat = new THREE.LineBasicMaterial({
      color: '#529062',
      transparent: true,
      opacity: 0.14
    });

    for (let i = 0; i <= this.gridSize; i++) {
      const coord = -this.worldOriginOffset + i * this.tileSize;
      const xPoints = [
        new THREE.Vector3(-this.worldOriginOffset, 0.015, coord),
        new THREE.Vector3(this.worldOriginOffset, 0.015, coord)
      ];
      this.gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(xPoints), this.gridLineMat));

      const zPoints = [
        new THREE.Vector3(coord, 0.015, -this.worldOriginOffset),
        new THREE.Vector3(coord, 0.015, this.worldOriginOffset)
      ];
      this.gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(zPoints), this.gridLineMat));
    }
    this.scene.add(this.gridGroup);

    // =========================================================================
    // 3. CENTRAL HOME PLOT (Unobstructed, elegant, ready to build on)
    // =========================================================================
    // Centered at grid (4, 4) - world position (0, 0)
    this.homePlotGroup = new THREE.Group();
    const homeKnollPos = this.gridToWorld(4, 4);
    this.homePlotGroup.position.set(homeKnollPos.x, 0.01, homeKnollPos.z);

    // Subtle sunken flagstone terrace ring defining the home sanctuary
    const patioMat = new THREE.MeshStandardMaterial({
      color: '#E0DAD0',
      roughness: 0.88,
      flatShading: true
    });
    const patioBorderGeo = new THREE.RingGeometry(1.2, 1.45, 8);
    patioBorderGeo.rotateX(-Math.PI / 2);
    const patioBorder = new THREE.Mesh(patioBorderGeo, patioMat);
    patioBorder.receiveShadow = true;
    this.homePlotGroup.add(patioBorder);

    // Dressed granite corner surveyor pegs
    const pegGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
    const pegMat = new THREE.MeshStandardMaterial({ color: '#E7CA49', roughness: 0.5 });
    const pegOffsets = [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]];
    pegOffsets.forEach(([px, pz]) => {
      const peg = new THREE.Mesh(pegGeo, pegMat);
      peg.position.set(px, 0.08, pz);
      this.homePlotGroup.add(peg);
    });
    this.scene.add(this.homePlotGroup);

    // =========================================================================
    // 4. GARDEN BORDER PATH (Follows outer perimeter edge, never the center)
    // =========================================================================
    const gardenPathPoints = [
      new THREE.Vector3(-this.worldOriginOffset + 1.2, 0.02, this.worldOriginOffset - 1.2),
      new THREE.Vector3(-2.5, 0.02, this.worldOriginOffset - 1.4),
      new THREE.Vector3(2.5, 0.02, this.worldOriginOffset - 1.5),
      new THREE.Vector3(this.worldOriginOffset - 1.4, 0.02, this.worldOriginOffset - 2.8)
    ];
    const pathCurve = new THREE.CatmullRomCurve3(gardenPathPoints);
    const pathGeo = new THREE.TubeGeometry(pathCurve, 24, 0.45, 6, false);
    pathGeo.scale(1, 0.08, 1);
    const pathMat = new THREE.MeshStandardMaterial({ color: '#C8BBA4', roughness: 0.95, flatShading: true });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.receiveShadow = true;
    this.scene.add(pathMesh);

    // =========================================================================
    // 5. CORNER REFLECTING LILY POND (Modest, natural limestone basin in SE)
    // =========================================================================
    const pondCenter = new THREE.Vector3(this.worldOriginOffset - 2.2, 0.02, this.worldOriginOffset - 2.2);
    const pondGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.12, 16);
    const pondWaterMat = new THREE.MeshStandardMaterial({
      color: '#76B7D9',
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88,
      flatShading: true
    });
    const pondMesh = new THREE.Mesh(pondGeo, pondWaterMat);
    pondMesh.position.set(pondCenter.x, -0.04, pondCenter.z);
    this.scene.add(pondMesh);

    // Limestone coping rim
    const pondRimGeo = new THREE.TorusGeometry(1.85, 0.12, 6, 16);
    pondRimGeo.rotateX(Math.PI / 2);
    const pondRimMat = new THREE.MeshStandardMaterial({ color: '#C0B9AC', roughness: 0.9, flatShading: true });
    const pondRim = new THREE.Mesh(pondRimGeo, pondRimMat);
    pondRim.position.set(pondCenter.x, 0.03, pondCenter.z);
    pondRim.receiveShadow = true;
    this.scene.add(pondRim);

    // Floating Lily Pads
    const padMat = new THREE.MeshStandardMaterial({ color: '#4E985D', roughness: 0.8 });
    const pad1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 6), padMat);
    pad1.position.set(pondCenter.x - 0.4, 0.025, pondCenter.z + 0.3);
    this.scene.add(pad1);

    const pad2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 6), padMat);
    pad2.position.set(pondCenter.x + 0.5, 0.025, pondCenter.z - 0.3);
    this.scene.add(pad2);

    // Tiny pink lotus blossom
    const lotusMat = new THREE.MeshStandardMaterial({ color: '#F4C6D7', roughness: 0.6, flatShading: true });
    const lotus = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), lotusMat);
    lotus.position.set(pondCenter.x - 0.4, 0.07, pondCenter.z + 0.3);
    this.scene.add(lotus);

    // =========================================================================
    // 6. TASTEFUL PERIMETER CORNER STARTER FLORA (Central lawn is open!)
    // =========================================================================
    // Northwest Corner Tree
    const cornerBirch = createGardenBirch(1.15);
    cornerBirch.position.set(-this.worldOriginOffset + 1.6, 0, -this.worldOriginOffset + 1.6);
    this.scene.add(cornerBirch);
    this.swayMeshes.push(cornerBirch);

    // Northeast Corner Pine
    const cornerPine = createPineTree(0.95);
    cornerPine.position.set(this.worldOriginOffset - 1.8, 0, -this.worldOriginOffset + 1.8);
    this.scene.add(cornerPine);
    this.swayMeshes.push(cornerPine);

    // Southwest Corner Bench & Fern Clump
    const benchMat = new THREE.MeshStandardMaterial({ color: '#D8D2C6', roughness: 0.88, flatShading: true });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.38), benchMat);
    bench.position.set(-this.worldOriginOffset + 1.8, 0.12, this.worldOriginOffset - 2.0);
    bench.rotation.y = 0.4;
    bench.castShadow = true;
    bench.receiveShadow = true;
    this.scene.add(bench);

    // =========================================================================
    // 7. CELL HOVER & PLACEMENT INDICATOR TILE
    // =========================================================================
    const hoverGeo = new THREE.PlaneGeometry(this.tileSize * 0.94, this.tileSize * 0.94);
    hoverGeo.rotateX(-Math.PI / 2);
    this.hoverMat = new THREE.MeshBasicMaterial({
      color: '#52B788',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    this.hoverTile = new THREE.Mesh(hoverGeo, this.hoverMat);
    this.hoverTile.position.y = 0.025;
    this.hoverTile.visible = false;
    this.scene.add(this.hoverTile);

    // Selected Placed Object Indicator
    const selectEdgesGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(this.tileSize * 0.96, 0.22, this.tileSize * 0.96)
    );
    const selectEdgesMat = new THREE.LineBasicMaterial({ color: '#E96D2C', linewidth: 2 });
    this.selectionBox = new THREE.LineSegments(selectEdgesGeo, selectEdgesMat);
    this.selectionBox.position.y = 0.11;
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    this.disposables.push(
      lawnGeo, lawnMat, curbGeo, curbMat, earthBaseGeo, earthBaseMat,
      groundPlaneGeo, groundPlaneMat, this.gridLineMat,
      patioBorderGeo, patioMat, pegGeo, pegMat,
      pathGeo, pathMat, pondGeo, pondWaterMat, pondRimGeo, pondRimMat,
      hoverGeo, this.hoverMat, selectEdgesGeo, selectEdgesMat, benchMat
    );
  }

  createAmbientPollen() {
    // 12 subtle golden citrus motes
    const sporeCount = 12;
    const sporePositions = new Float32Array(sporeCount * 3);
    for (let i = 0; i < sporeCount; i++) {
      sporePositions[i * 3] = (Math.random() - 0.5) * 16;
      sporePositions[i * 3 + 1] = Math.random() * 3.5 + 0.4;
      sporePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const sporeGeo = new THREE.BufferGeometry();
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePositions, 3));
    const sporeMat = new THREE.PointsMaterial({
      color: '#E7CA49',
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.spores = new THREE.Points(sporeGeo, sporeMat);
    this.scene.add(this.spores);
    this.disposables.push(sporeGeo, sporeMat);
  }

  /* -------------------------------------------------------------------------- */
  /* ITEM MESH FACTORY FOR PLACED OBJECTS                                       */
  /* -------------------------------------------------------------------------- */
  createItemMesh(itemId, tier = 1) {
    const group = new THREE.Group();

    switch (itemId) {
      case 'house_foundation': {
        // Dressed granite plinth
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#7E8A80', roughness: 0.88, flatShading: true });
        const timberMat = new THREE.MeshStandardMaterial({ color: '#5C3E26', roughness: 0.92, flatShading: true });

        const plinthGeo = new THREE.BoxGeometry(this.tileSize * 0.94, 0.22, this.tileSize * 0.94);
        const plinth = new THREE.Mesh(plinthGeo, stoneMat);
        plinth.position.y = 0.11;
        plinth.castShadow = true;
        plinth.receiveShadow = true;
        group.add(plinth);

        // Heavy timber perimeter sills
        const sillGeo = new THREE.BoxGeometry(this.tileSize * 0.96, 0.12, 0.14);
        const sills = [
          { z: -this.tileSize * 0.41, rot: 0 },
          { z: this.tileSize * 0.41, rot: 0 },
          { z: 0, rot: Math.PI / 2, x: -this.tileSize * 0.41 },
          { z: 0, rot: Math.PI / 2, x: this.tileSize * 0.41 }
        ];
        sills.forEach(s => {
          const sill = new THREE.Mesh(sillGeo, timberMat);
          sill.position.set(s.x || 0, 0.26, s.z);
          sill.rotation.y = s.rot;
          sill.castShadow = true;
          group.add(sill);
        });

        // Flagstone paver floor
        const flagMat = new THREE.MeshStandardMaterial({ color: '#B4AEA3', roughness: 0.85, flatShading: true });
        const floorGeo = new THREE.BoxGeometry(this.tileSize * 0.72, 0.04, this.tileSize * 0.72);
        const floor = new THREE.Mesh(floorGeo, flagMat);
        floor.position.y = 0.24;
        floor.receiveShadow = true;
        group.add(floor);

        // Stone chimney hearth
        const hearthGeo = new THREE.BoxGeometry(0.38, 0.65, 0.38);
        const hearth = new THREE.Mesh(hearthGeo, stoneMat);
        hearth.position.set(0.32, 0.45, -0.32);
        hearth.castShadow = true;
        group.add(hearth);

        // Glowing ember center
        const emberMat = new THREE.MeshBasicMaterial({ color: '#E96D2C' });
        const ember = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), emberMat);
        ember.position.set(0.32, 0.65, -0.32);
        group.add(ember);

        if (tier >= 2) {
          // Framed Pavilion Rafters
          const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.4, 6);
          const postOffsets = [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]];
          postOffsets.forEach(([px, pz]) => {
            const p = new THREE.Mesh(postGeo, timberMat);
            p.position.set(px, 0.95, pz);
            p.castShadow = true;
            group.add(p);
          });

          const beamGeo = new THREE.BoxGeometry(1.25, 0.08, 1.25);
          const beam = new THREE.Mesh(beamGeo, timberMat);
          beam.position.set(0, 1.65, 0);
          beam.castShadow = true;
          group.add(beam);
        }
        break;
      }

      case 'ancient_oak': {
        const oak = createOakTree(1.0 + tier * 0.2);
        group.add(oak);
        this.swayMeshes.push(oak);
        break;
      }

      case 'pine_cluster': {
        const pine = createPineTree(0.9 + tier * 0.2);
        group.add(pine);
        this.swayMeshes.push(pine);
        break;
      }

      case 'mossy_boulder': {
        const rockMat = new THREE.MeshStandardMaterial({ color: '#6A7D72', roughness: 0.92, flatShading: true });
        const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + tier * 0.12, 0), rockMat);
        mainRock.position.set(0, 0.4, 0);
        mainRock.castShadow = true;
        group.add(mainRock);

        const mossMat = new THREE.MeshStandardMaterial({ color: '#4E8C58', roughness: 0.82, flatShading: true });
        const mossCap = new THREE.Mesh(new THREE.SphereGeometry(0.36, 7, 5), mossMat);
        mossCap.position.set(0, 0.65, 0);
        mossCap.scale.set(1.1, 0.35, 1.1);
        group.add(mossCap);
        break;
      }

      case 'wild_ferns': {
        const frondMat = new THREE.MeshStandardMaterial({
          color: '#68AC5C',
          roughness: 0.82,
          side: THREE.DoubleSide
        });
        const count = 6;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const frond = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.65, 4), frondMat);
          frond.position.set(Math.cos(angle) * 0.16, 0.28, Math.sin(angle) * 0.16);
          frond.rotation.set(0.5 * Math.sin(angle), 0, -0.5 * Math.cos(angle));
          frond.castShadow = true;
          group.add(frond);
        }
        break;
      }

      case 'stone_cairn': {
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#66756B', roughness: 0.88, flatShading: true });
        const sizes = [0.42, 0.32, 0.22];
        let y = 0.1;
        for (let i = 0; i < sizes.length; i++) {
          const s = sizes[i];
          const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stoneMat);
          m.position.set((i === 1 ? 0.03 : -0.02), y + s * 0.5, 0);
          m.castShadow = true;
          group.add(m);
          y += s * 0.82;
        }
        break;
      }

      case 'earth_trail': {
        const trailMat = new THREE.MeshStandardMaterial({ color: '#9C8B73', roughness: 0.96, flatShading: true });
        const paver = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.02, 0.88), trailMat);
        paver.position.y = 0.01;
        paver.receiveShadow = true;
        group.add(paver);
        break;
      }

      case 'flagstone_paver': {
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#CBC4B7', roughness: 0.88, flatShading: true });
        const paver = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.025, 0.86), stoneMat);
        paver.position.y = 0.015;
        paver.receiveShadow = true;
        group.add(paver);
        break;
      }

      case 'wooden_boardwalk': {
        const timberMat = new THREE.MeshStandardMaterial({ color: '#7A5B3E', roughness: 0.9, flatShading: true });
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), timberMat);
        board.position.y = 0.03;
        board.castShadow = true;
        board.receiveShadow = true;
        group.add(board);
        break;
      }

      case 'stream_tile': {
        const waterMat = new THREE.MeshStandardMaterial({
          color: '#76B7D9',
          roughness: 0.08,
          metalness: 0.2,
          transparent: true,
          opacity: 0.85,
          flatShading: true
        });
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.03, 0.92), waterMat);
        tile.position.y = 0.015;
        group.add(tile);
        break;
      }

      case 'field_shelter': {
        const canvasMat = new THREE.MeshStandardMaterial({ color: '#EDEAE4', roughness: 0.85, flatShading: true });
        const tent = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 4), canvasMat);
        tent.position.y = 0.35;
        tent.rotation.y = Math.PI / 4;
        tent.castShadow = true;
        group.add(tent);
        break;
      }

      case 'watchtower': {
        const timberMat = new THREE.MeshStandardMaterial({ color: '#5C3E26', roughness: 0.92, flatShading: true });
        const platform = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), timberMat);
        platform.position.y = 1.1;
        platform.castShadow = true;
        group.add(platform);

        const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 4);
        const offsets = [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]];
        offsets.forEach(([ox, oz]) => {
          const leg = new THREE.Mesh(legGeo, timberMat);
          leg.position.set(ox, 0.55, oz);
          leg.castShadow = true;
          group.add(leg);
        });
        break;
      }

      case 'field_canoe': {
        const woodMat = new THREE.MeshStandardMaterial({ color: '#8A5833', roughness: 0.86, flatShading: true });
        const canoe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.88), woodMat);
        canoe.position.y = 0.08;
        canoe.castShadow = true;
        group.add(canoe);
        break;
      }

      default: {
        const defMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.02, 0.48),
          new THREE.MeshStandardMaterial({ color: '#C0B8AC', roughness: 0.9 })
        );
        defMesh.position.y = 0.01;
        defMesh.receiveShadow = true;
        group.add(defMesh);
        break;
      }
    }

    return group;
  }

  /* -------------------------------------------------------------------------- */
  /* RENDER PLACED OBJECTS FROM STATE                                           */
  /* -------------------------------------------------------------------------- */
  renderWorldFromState() {
    for (const [, mesh] of this.objectMeshes) {
      this.scene.remove(mesh);
    }
    this.objectMeshes.clear();

    const placedList = this.state.placedObjects || [];
    placedList.forEach(placed => {
      const mesh = this.createItemMesh(placed.itemId, placed.tier || 1);
      const wPos = this.gridToWorld(placed.x, placed.y);
      mesh.position.set(wPos.x, 0, wPos.z);
      mesh.rotation.y = (placed.rotation || 0) * (Math.PI / 180);
      mesh.userData = { placedId: placed.id, gridX: placed.x, gridY: placed.y };

      this.scene.add(mesh);
      this.objectMeshes.set(placed.id, mesh);
    });

    this.updateSelectionIndicator();
  }

  /* -------------------------------------------------------------------------- */
  /* GRID COORDINATE UTILITIES                                                  */
  /* -------------------------------------------------------------------------- */
  gridToWorld(x, y) {
    const halfTile = this.tileSize / 2;
    const wx = -this.worldOriginOffset + x * this.tileSize + halfTile;
    const wz = -this.worldOriginOffset + y * this.tileSize + halfTile;
    return { x: wx, z: wz };
  }

  worldToGrid(wx, wz) {
    const x = Math.floor((wx + this.worldOriginOffset) / this.tileSize);
    const y = Math.floor((wz + this.worldOriginOffset) / this.tileSize);
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return null;
    return { x, y };
  }

  /* -------------------------------------------------------------------------- */
  /* PLACEMENT & BUILDING MODES                                                 */
  /* -------------------------------------------------------------------------- */
  setPlaceMode(inventoryItemId) {
    this.currentMode = 'place';
    this.activeInventoryItemId = inventoryItemId;
    this.selectedPlacedId = null;
    this.updateSelectionIndicator();
    this.createGhostMesh();

    if (this.gridLineMat) {
      this.gridLineMat.opacity = 0.38;
      this.gridLineMat.color.set('#3A7A4D');
    }
  }

  setBuildMode(buildingType = 'house_foundation') {
    this.currentMode = 'build';
    this.activeInventoryItemId = buildingType;
    this.selectedPlacedId = null;
    this.buildRotation = 0;
    this.updateSelectionIndicator();
    this.createGhostMesh();

    if (this.gridLineMat) {
      this.gridLineMat.opacity = 0.45;
      this.gridLineMat.color.set('#E7CA49');
    }
  }

  rotateBuildGhost() {
    this.buildRotation = (this.buildRotation + 90) % 360;
    if (this.ghostGroup) {
      this.ghostGroup.rotation.y = this.buildRotation * (Math.PI / 180);
    }
    return this.buildRotation;
  }

  setSelectMode() {
    this.currentMode = 'select';
    this.activeInventoryItemId = null;
    this.removeGhostMesh();
    this.updateSelectionIndicator();

    if (this.gridLineMat) {
      this.gridLineMat.opacity = 0.14;
      this.gridLineMat.color.set('#529062');
    }
  }

  createGhostMesh() {
    this.removeGhostMesh();
    if (!this.activeInventoryItemId) return;

    this.ghostGroup = this.createItemMesh(this.activeInventoryItemId, 1);
    if (this.ghostGroup) {
      if (this.currentMode === 'build') {
        this.ghostGroup.rotation.y = this.buildRotation * (Math.PI / 180);
      }
      this.ghostGroup.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.65;
        }
      });
      this.ghostGroup.visible = false;
      this.scene.add(this.ghostGroup);
    }
  }

  removeGhostMesh() {
    if (this.ghostGroup) {
      this.scene.remove(this.ghostGroup);
      this.ghostGroup = null;
    }
  }

  selectPlacedObject(placedId) {
    this.selectedPlacedId = placedId;
    this.updateSelectionIndicator();
    const placed = this.state.placedObjects.find(p => p.id === placedId);
    if (placed) {
      this.onSelectCallback(placed);
    }
  }

  updateSelectionIndicator() {
    if (this.selectedPlacedId) {
      const placed = this.state.placedObjects.find(p => p.id === this.selectedPlacedId);
      if (placed) {
        const wPos = this.gridToWorld(placed.x, placed.y);
        this.selectionBox.position.set(wPos.x, 0.11, wPos.z);
        this.selectionBox.visible = true;
        return;
      }
    }
    this.selectionBox.visible = false;
  }

  /* -------------------------------------------------------------------------- */
  /* EVENT HANDLING & CAMERA CONTROLS                                           */
  /* -------------------------------------------------------------------------- */
  setupEvents() {
    this.boundOnResize = () => this.onResize();
    this.boundOnPointerMove = (e) => this.onPointerMove(e);
    this.boundOnPointerDown = (e) => this.onPointerDown(e);
    this.boundOnPointerUp = (e) => this.onPointerUp(e);
    this.boundOnWheel = (e) => this.onWheel(e);
    this.boundOnContextMenu = (e) => e.preventDefault();
    this.boundOnVisibilityChange = () => this.onVisibilityChange();

    window.addEventListener('resize', this.boundOnResize);
    document.addEventListener('visibilitychange', this.boundOnVisibilityChange);
    this.canvas.addEventListener('pointermove', this.boundOnPointerMove);
    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    this.canvas.addEventListener('pointerup', this.boundOnPointerUp);
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.boundOnContextMenu);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (this.currentMode === 'build') this.rotateBuildGhost();
      } else if (e.key === 'Escape') {
        if (this.currentMode === 'place' || this.currentMode === 'build') this.setSelectMode();
      }
    });
  }

  onVisibilityChange() {
    if (document.hidden) this.pause();
    else this.resume();
  }

  onResize() {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const parent = this.canvas.parentElement;
    const width = (parent && parent.clientWidth > 10 ? parent.clientWidth : 0) || window.innerWidth;
    const height = (parent && parent.clientHeight > 10 ? parent.clientHeight : 0) || (window.innerHeight - 64);
    if (!width || !height || width <= 10 || height <= 10) return;

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  updatePointerRaycast(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);

    if (intersects.length > 0) {
      const hit = intersects[0].point;
      const gridCell = this.worldToGrid(hit.x, hit.z);

      if (gridCell) {
        this.hoveredCell = gridCell;
        const wPos = this.gridToWorld(gridCell.x, gridCell.y);

        this.hoverTile.position.set(wPos.x, 0.025, wPos.z);
        this.hoverTile.visible = true;

        const isOccupied = !!this.state.getObjectAt(gridCell.x, gridCell.y);

        if (this.currentMode === 'place' || this.currentMode === 'build') {
          this.hoverMat.color.set(isOccupied ? '#E96D2C' : '#52B788');
          this.hoverMat.opacity = isOccupied ? 0.65 : 0.55;

          if (this.ghostGroup) {
            this.ghostGroup.position.set(wPos.x, 0, wPos.z);
            this.ghostGroup.visible = true;
          }
        } else {
          this.hoverMat.color.set('#E7CA49');
          this.hoverMat.opacity = 0.32;
        }
        return gridCell;
      }
    }

    this.clearHover();
    return null;
  }

  clearHover() {
    this.hoveredCell = null;
    this.hoverTile.visible = false;
    if (this.ghostGroup) this.ghostGroup.visible = false;
  }

  onPointerDown(e) {
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.hasMovedSignificantly = false;
    this.updatePointerRaycast(e.clientX, e.clientY);

    if (e.button === 2) {
      this.isPanning = true;
      this.canvas.style.cursor = 'move';
    } else if (e.button === 0) {
      this.isOrbiting = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onPointerMove(e) {
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      this.hasMovedSignificantly = true;
    }

    if (this.isPanning) {
      const panSpeed = 0.022 * (this.cameraDistance / 22);
      const right = new THREE.Vector3(Math.cos(this.cameraAzimuth), 0, -Math.sin(this.cameraAzimuth));
      const forward = new THREE.Vector3(-Math.sin(this.cameraAzimuth), 0, -Math.cos(this.cameraAzimuth));

      this.targetLookTarget.addScaledVector(right, -dx * panSpeed);
      this.targetLookTarget.addScaledVector(forward, dy * panSpeed);

      // Clamp tightly so player stays on the garden
      this.targetLookTarget.x = THREE.MathUtils.clamp(this.targetLookTarget.x, -7.5, 7.5);
      this.targetLookTarget.z = THREE.MathUtils.clamp(this.targetLookTarget.z, -7.5, 7.5);

      this.dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (this.isOrbiting) {
      const sensitivity = 0.0055;
      this.targetAzimuth -= dx * sensitivity;
      this.targetElevation = THREE.MathUtils.clamp(this.targetElevation + dy * sensitivity, 0.22, 1.1);

      this.dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    this.updatePointerRaycast(e.clientX, e.clientY);
  }

  onPointerUp(e) {
    const wasPanning = this.isPanning;
    const moved = this.hasMovedSignificantly;

    this.isOrbiting = false;
    this.isPanning = false;
    this.canvas.style.cursor = 'grab';

    if (moved || (wasPanning && e.button === 2)) return;

    const activeCell = this.updatePointerRaycast(e.clientX, e.clientY) || this.hoveredCell;

    if (e.button === 0 && activeCell) {
      const { x, y } = activeCell;

      if (this.currentMode === 'place' && this.activeInventoryItemId) {
        this.executePlacement(this.activeInventoryItemId, x, y);
      } else if (this.currentMode === 'build') {
        this.executeBuild(x, y);
      } else if (this.currentMode === 'select') {
        const clickedObj = this.state.getObjectAt(x, y);
        if (clickedObj) {
          this.selectPlacedObject(clickedObj.id);
        } else {
          this.selectedPlacedId = null;
          this.updateSelectionIndicator();
          this.onSelectCallback(null);
        }
      }
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.018;
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + zoomDelta, this.minDistance, this.maxDistance);
  }

  zoomIn() {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance - 3.2, this.minDistance, this.maxDistance);
  }

  zoomOut() {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + 3.2, this.minDistance, this.maxDistance);
  }

  resetCamera() {
    this.targetAzimuth = this.defaultAzimuth;
    this.targetElevation = this.defaultElevation;
    this.targetDistance = this.defaultDistance;
    this.targetLookTarget.copy(this.defaultLookTarget);

    if (this.isReducedMotion) {
      this.cameraAzimuth = this.targetAzimuth;
      this.cameraElevation = this.targetElevation;
      this.cameraDistance = this.targetDistance;
      this.lookTarget.copy(this.targetLookTarget);
      this.updateCameraImmediate();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* PLACEMENT & BUILDING EXECUTION                                             */
  /* -------------------------------------------------------------------------- */
  executePlacement(itemId, x, y) {
    if (this.placementLocked) return { success: false, message: 'Placement in progress.' };
    this.placementLocked = true;

    try {
      const result = this.state.placeFromInventory(itemId, x, y);
      this.onPlaceCallback(result);

      if (result.success) {
        this.renderWorldFromState();
        const placedMesh = this.objectMeshes.get(result.object.id);
        const wPos = this.gridToWorld(x, y);

        if (placedMesh) {
          placedMesh.position.y = 0.8;
          this.settleAnimations.push({
            mesh: placedMesh,
            startTime: performance.now(),
            duration: 400
          });
        }

        this.spawnPlacementRipple(wPos.x, wPos.z);
        this.selectPlacedObject(result.object.id);
      }
      return result;
    } finally {
      setTimeout(() => {
        this.placementLocked = false;
      }, 150);
    }
  }

  executeBuild(x, y) {
    if (this.placementLocked) return { success: false, message: 'Build in progress.' };
    this.placementLocked = true;

    try {
      const result = this.state.placeFoundation(x, y, this.buildRotation);
      this.onBuildCallback(result);

      if (result.success) {
        this.renderWorldFromState();
        const placedMesh = this.objectMeshes.get(result.object.id);
        const wPos = this.gridToWorld(x, y);

        if (placedMesh) {
          placedMesh.position.y = 0.9;
          this.settleAnimations.push({
            mesh: placedMesh,
            startTime: performance.now(),
            duration: 450
          });
        }

        this.spawnPlacementRipple(wPos.x, wPos.z);
        this.selectPlacedObject(result.object.id);
      }
      return result;
    } finally {
      setTimeout(() => {
        this.placementLocked = false;
      }, 150);
    }
  }

  spawnPlacementRipple(wx, wz) {
    const ringGeo = new THREE.RingGeometry(0.2, 0.35, 20);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#E7CA49',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ripple = new THREE.Mesh(ringGeo, ringMat);
    ripple.position.set(wx, 0.03, wz);
    this.scene.add(ripple);

    this.placementRipples.push({
      mesh: ripple,
      startTime: performance.now(),
      duration: 750
    });
  }

  /* -------------------------------------------------------------------------- */
  /* ANIMATION & RENDER LOOP                                                    */
  /* -------------------------------------------------------------------------- */
  updateCameraImmediate() {
    const x = this.lookTarget.x + this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);
    const y = this.lookTarget.y + this.cameraDistance * Math.sin(this.cameraElevation);
    const z = this.lookTarget.z + this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.lookTarget);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.isPaused) return;

    const now = performance.now();
    const time = now * 0.001;

    // Smooth camera damping
    const lerpFactor = this.isReducedMotion ? 1.0 : 0.085;
    this.cameraAzimuth = THREE.MathUtils.lerp(this.cameraAzimuth, this.targetAzimuth, lerpFactor);
    this.cameraElevation = THREE.MathUtils.lerp(this.cameraElevation, this.targetElevation, lerpFactor);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetDistance, lerpFactor);
    this.lookTarget.lerp(this.targetLookTarget, lerpFactor);
    this.updateCameraImmediate();

    // Subtle sway animation
    if (!this.isReducedMotion) {
      this.swayMeshes.forEach(mesh => {
        const offset = mesh.userData?.swayOffset || 0;
        mesh.rotation.z = Math.sin(time * 1.4 + offset) * 0.022;
      });
    }

    // Settle bounce animations
    for (let i = this.settleAnimations.length - 1; i >= 0; i--) {
      const anim = this.settleAnimations[i];
      const progress = (now - anim.startTime) / anim.duration;
      if (progress >= 1.0) {
        anim.mesh.position.y = 0;
        this.settleAnimations.splice(i, 1);
      } else {
        const bounce = Math.sin(progress * Math.PI) * (1 - progress);
        anim.mesh.position.y = bounce * 0.8;
      }
    }

    // Placement golden ripples
    for (let i = this.placementRipples.length - 1; i >= 0; i--) {
      const rip = this.placementRipples[i];
      const progress = (now - rip.startTime) / rip.duration;
      if (progress >= 1.0) {
        this.scene.remove(rip.mesh);
        rip.mesh.geometry.dispose();
        rip.mesh.material.dispose();
        this.placementRipples.splice(i, 1);
      } else {
        const scale = 1.0 + progress * 3.8;
        rip.mesh.scale.set(scale, scale, scale);
        rip.mesh.material.opacity = (1.0 - progress) * 0.85;
      }
    }

    // Golden pollen drift
    if (this.spores && !this.isReducedMotion) {
      const positions = this.spores.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] -= 0.003;
        positions[i * 3] += Math.sin(time * 0.8 + i) * 0.002;
        if (positions[i * 3 + 1] < 0.2) {
          positions[i * 3 + 1] = 4.0;
        }
      }
      this.spores.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.onResize();
  }

  dispose() {
    this.pause();
    window.removeEventListener('resize', this.boundOnResize);
    document.removeEventListener('visibilitychange', this.boundOnVisibilityChange);
    this.canvas.removeEventListener('pointermove', this.boundOnPointerMove);
    this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
    this.canvas.removeEventListener('pointerup', this.boundOnPointerUp);
    this.canvas.removeEventListener('wheel', this.boundOnWheel);
    this.canvas.removeEventListener('contextmenu', this.boundOnContextMenu);

    this.disposables.forEach(d => {
      if (d && d.dispose) d.dispose();
    });
  }
}

/* ========================================================================== */
/* 2. WILDERNESS SCENE: THE WILDS (EXPANSIVE EXPLORATION & LANDMARKS)         */
/* ========================================================================== */

export class WildernessScene {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;

    this.onSelectLandmarkCallback = options.onSelectLandmark || (() => {});

    // Broad panoramic exploration camera
    this.defaultAzimuth = Math.PI / 3.8;  // ~47 degrees
    this.defaultElevation = 0.44;         // ~25 degrees
    this.defaultDistance = 44.0;
    this.defaultLookTarget = new THREE.Vector3(0, 0, 0);

    this.cameraAzimuth = this.defaultAzimuth;
    this.cameraElevation = this.defaultElevation;
    this.cameraDistance = this.defaultDistance;
    this.lookTarget = this.defaultLookTarget.clone();

    this.targetAzimuth = this.cameraAzimuth;
    this.targetElevation = this.cameraElevation;
    this.targetDistance = this.cameraDistance;
    this.targetLookTarget = this.defaultLookTarget.clone();

    this.minDistance = 16.0;
    this.maxDistance = 75.0;

    this.isOrbiting = false;
    this.isPanning = false;
    this.dragStart = { x: 0, y: 0 };
    this.hasMovedSignificantly = false;

    this.landmarks = [];
    this.selectedLandmarkId = null;
    this.beaconMeshes = [];
    this.swayMeshes = [];
    this.disposables = [];

    // Player character and movement state
    this.playerGroup = null;
    this.playerVisual = null;
    this.leftLeg = null;
    this.rightLeg = null;
    this.keys = {};
    this.touchMove = { x: 0, y: 0 };
    this.lastTime = performance.now() * 0.001;
    this.shouldFollowPlayer = true;
    this.currentRotationY = 0;
    this.walkAnimTime = 0;
    this.idleAnimTime = 0;
    this.isMoving = false;

    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isPaused = false;

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    // 1. Scene: Vast wilderness atmosphere with alpine haze
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#D3E3DA');
    this.scene.fog = new THREE.FogExp2(new THREE.Color('#D3E3DA'), 0.007);

    const parent = this.canvas.parentElement;
    const width = (parent && parent.clientWidth > 10 ? parent.clientWidth : 0) || window.innerWidth;
    const height = (parent && parent.clientHeight > 10 ? parent.clientHeight : 0) || (window.innerHeight - 64);
    const aspect = width / (height || 1);

    // 2. Camera: Wide panoramic exploration perspective
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 300);
    this.updateCameraImmediate();

    // 3. Renderer with soft shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 4. Dramatic Outdoor Lighting
    this.setupLighting();

    // 5. Expansive Wilderness Terrain & Ridge System
    this.createWildernessTerrain();

    // 6. Interactive Field Discovery Landmarks
    this.createFieldLandmarks();

    // 7. Player Character in The Wilds
    this.createPlayerCharacter();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  }

  setupLighting() {
    const hemiLight = new THREE.HemisphereLight('#E2F4FA', '#82B594', 1.35);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const ambient = new THREE.AmbientLight('#FAF8F0', 0.65);
    this.scene.add(ambient);

    // Dramatic morning sun through mountain passes
    this.sun = new THREE.DirectionalLight('#FFF3DB', 2.8);
    this.sun.position.set(38, 45, 32);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 1024;
    this.sun.shadow.mapSize.height = 1024;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 130;
    const shadowD = 28;
    this.sun.shadow.camera.left = -shadowD;
    this.sun.shadow.camera.right = shadowD;
    this.sun.shadow.camera.top = shadowD;
    this.sun.shadow.camera.bottom = -shadowD;
    this.sun.shadow.bias = -0.0003;
    this.scene.add(this.sun);
  }

  createWildernessTerrain() {
    this.terrainGroup = new THREE.Group();

    // Base expansive rolling topography
    const hillMat1 = new THREE.MeshStandardMaterial({ color: '#1B4D2B', roughness: 0.9, flatShading: true });
    const hillMat2 = new THREE.MeshStandardMaterial({ color: '#276239', roughness: 0.88, flatShading: true });
    const hillMat3 = new THREE.MeshStandardMaterial({ color: '#38784B', roughness: 0.85, flatShading: true });

    // Major natural ridges and valley mounds
    const ridges = [
      { x: -22, z: -26, r: 24, h: 6.5, mat: hillMat1 },
      { x: 16, z: -30, r: 26, h: 7.2, mat: hillMat2 },
      { x: 30, z: -10, r: 22, h: 5.8, mat: hillMat1 },
      { x: 34, z: 18, r: 25, h: 6.4, mat: hillMat3 },
      { x: 8, z: 32, r: 26, h: 5.2, mat: hillMat2 },
      { x: -20, z: 28, r: 24, h: 5.8, mat: hillMat1 },
      { x: -32, z: 6, r: 26, h: 6.6, mat: hillMat2 }
    ];
    this.ridges = ridges;

    ridges.forEach(spec => {
      const coneGeo = new THREE.ConeGeometry(spec.r, spec.h, 10);
      const mesh = new THREE.Mesh(coneGeo, spec.mat);
      mesh.position.set(spec.x, spec.h / 2 - 3.2, spec.z);
      mesh.receiveShadow = true;
      this.terrainGroup.add(mesh);
      this.disposables.push(coneGeo);
    });

    // Central exploration basin meadow
    const basinGeo = new THREE.CylinderGeometry(28, 32, 1.2, 24);
    const basinMat = new THREE.MeshStandardMaterial({ color: '#2A663C', roughness: 0.88, flatShading: true });
    const basinMesh = new THREE.Mesh(basinGeo, basinMat);
    basinMesh.position.y = -0.6;
    basinMesh.receiveShadow = true;
    this.terrainGroup.add(basinMesh);

    // Deep Horizon Valley Skirt
    const skirtGeo = new THREE.CylinderGeometry(85, 95, 4.0, 32);
    const skirtMat = new THREE.MeshStandardMaterial({ color: '#13351C', roughness: 0.98, flatShading: true });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = -4.5;
    this.terrainGroup.add(skirt);

    // River Canyon & Flowing Stream
    const streamPoints = [
      new THREE.Vector3(26, -0.6, -24),
      new THREE.Vector3(18, -0.4, -14),
      new THREE.Vector3(12, -0.3, -4),
      new THREE.Vector3(8, -0.3, 8),
      new THREE.Vector3(14, -0.5, 18),
      new THREE.Vector3(24, -0.7, 26)
    ];
    const streamCurve = new THREE.CatmullRomCurve3(streamPoints);
    const streamGeo = new THREE.TubeGeometry(streamCurve, 32, 1.4, 8, false);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#7EC1E3',
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
      flatShading: true
    });
    const riverMesh = new THREE.Mesh(streamGeo, waterMat);
    riverMesh.receiveShadow = true;
    this.terrainGroup.add(riverMesh);

    // Winding Mountain Trail
    const trailPoints = [
      new THREE.Vector3(-24, -0.2, -22),
      new THREE.Vector3(-12, 0.05, -10),
      new THREE.Vector3(-2, 0.05, 0),
      new THREE.Vector3(6, 0.05, 12),
      new THREE.Vector3(2, 0.05, 26)
    ];
    const trailCurve = new THREE.CatmullRomCurve3(trailPoints);
    const trailGeo = new THREE.TubeGeometry(trailCurve, 28, 0.65, 6, false);
    trailGeo.scale(1, 0.1, 1);
    const trailMat = new THREE.MeshStandardMaterial({ color: '#886E4B', roughness: 0.95, flatShading: true });
    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    trailMesh.position.y = 0.03;
    trailMesh.receiveShadow = true;
    this.terrainGroup.add(trailMesh);

    // Distant horizon forest conifer clusters
    const forestTreeCoords = [
      [-18, -32, 1.6], [-12, -34, 1.8], [6, -36, 1.7], [16, -34, 1.5],
      [-32, -14, 1.6], [-30, 4, 1.8], [-34, 18, 1.5],
      [32, -8, 1.6], [34, 14, 1.7], [28, 28, 1.5]
    ];
    forestTreeCoords.forEach(([tx, tz, ts]) => {
      const p = createPineTree(ts);
      p.position.set(tx, 0, tz);
      this.terrainGroup.add(p);
      this.swayMeshes.push(p);
    });

    this.scene.add(this.terrainGroup);
  }

  getTerrainHeight(x, z) {
    let height = 0.0;
    if (this.ridges) {
      for (const spec of this.ridges) {
        const dist = Math.hypot(x - spec.x, z - spec.z);
        if (dist < spec.r) {
          const coneH = (1 - dist / spec.r) * spec.h - 3.2;
          if (coneH > height) {
            height = coneH;
          }
        }
      }
    }
    return height;
  }

  /* -------------------------------------------------------------------------- */
  /* 5 INTERACTIVE FIELD DISCOVERY LANDMARKS                                    */
  /* -------------------------------------------------------------------------- */
  createFieldLandmarks() {
    const landmarkDefs = [
      {
        id: 'granite_arch',
        title: 'The Weathered Granite Arch',
        biome: 'Alpine Mountain Ridge',
        desc: 'Ancient hand-hewn granite masonry spanning a windswept mountain pass, tangled with creeping ivy and alpine ferns.',
        icon: '🏛️',
        pos: new THREE.Vector3(-16, 0.1, -18),
        sampleId: 'sample_archway'
      },
      {
        id: 'elder_grove',
        title: 'Elder Canopy Grove',
        biome: 'Old-Growth Basin',
        desc: 'A magnificent centenarian oak standing over ancient moss-covered bedrock. Its sheltering branches anchor the wild forest.',
        icon: '🌲',
        pos: new THREE.Vector3(-22, 0.1, 12),
        sampleId: 'sample_trailhead'
      },
      {
        id: 'river_canyon',
        title: 'Whispering Runoff Stream',
        biome: 'River Runoff Valley',
        desc: 'Clear glacial runoff carving through granite boulders into a wetland basin of river reeds and smooth stones.',
        icon: '💧',
        pos: new THREE.Vector3(14, 0.1, -6),
        sampleId: 'sample_stream'
      },
      {
        id: 'lookout_bluff',
        title: 'High Lookout Bluff',
        biome: 'Eastern Summit Overlook',
        desc: 'A high timber observation platform overlooking the wilderness valleys with a brass surveying telescope.',
        icon: '🗼',
        pos: new THREE.Vector3(26, 0.1, 18),
        sampleId: 'sample_archway'
      },
      {
        id: 'trail_cairn',
        title: 'Surveyor\'s Alpine Cairn',
        biome: 'Southern Mountain Pass',
        desc: 'Carefully balanced granite waymarker stones marking the trail junction where explorers plot their return route.',
        icon: '🪨',
        pos: new THREE.Vector3(2, 0.1, 26),
        sampleId: 'sample_trailhead'
      }
    ];

    landmarkDefs.forEach(def => {
      const group = new THREE.Group();
      group.position.copy(def.pos);

      // Build distinctive 3D geometry for each landmark
      if (def.id === 'granite_arch') {
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#7E8A80', roughness: 0.9, flatShading: true });
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.8, 0.65), stoneMat);
        p1.position.set(-1.1, 1.4, 0);
        p1.castShadow = true;
        group.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.8, 0.65), stoneMat);
        p2.position.set(1.1, 1.4, 0);
        p2.castShadow = true;
        group.add(p2);

        const arch = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.65, 0.75), stoneMat);
        arch.position.set(0, 2.9, 0);
        arch.castShadow = true;
        group.add(arch);
      } else if (def.id === 'elder_grove') {
        const oak = createOakTree(1.8);
        group.add(oak);
        this.swayMeshes.push(oak);
      } else if (def.id === 'river_canyon') {
        const rockMat = new THREE.MeshStandardMaterial({ color: '#6A7870', roughness: 0.92, flatShading: true });
        const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), rockMat);
        r1.position.set(-0.6, 0.7, 0);
        r1.castShadow = true;
        group.add(r1);

        const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), rockMat);
        r2.position.set(0.7, 0.55, 0.3);
        r2.castShadow = true;
        group.add(r2);
      } else if (def.id === 'lookout_bluff') {
        const timberMat = new THREE.MeshStandardMaterial({ color: '#5A3E26', roughness: 0.92, flatShading: true });
        const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 3.2, 6);
        const offsets = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]];
        offsets.forEach(([px, pz]) => {
          const post = new THREE.Mesh(postGeo, timberMat);
          post.position.set(px, 1.6, pz);
          post.castShadow = true;
          group.add(post);
        });
        const platform = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.6), timberMat);
        platform.position.set(0, 3.2, 0);
        platform.castShadow = true;
        group.add(platform);
      } else if (def.id === 'trail_cairn') {
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#68776C', roughness: 0.88, flatShading: true });
        const sizes = [0.85, 0.65, 0.45, 0.3];
        let cy = 0.2;
        sizes.forEach(s => {
          const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stoneMat);
          m.position.set(0, cy + s * 0.5, 0);
          m.castShadow = true;
          group.add(m);
          cy += s * 0.85;
        });
      }

      // Golden discovery beacon ring hovering above landmark
      const beaconGeo = new THREE.RingGeometry(0.55, 0.75, 24);
      beaconGeo.rotateX(-Math.PI / 2);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: '#E7CA49',
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 3.8;
      group.add(beacon);
      this.beaconMeshes.push(beacon);

      // Interactive hit bounding cylinder
      const hitGeo = new THREE.CylinderGeometry(2.4, 2.4, 5.0, 10);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = 2.5;
      hitMesh.userData = { landmarkId: def.id };
      group.add(hitMesh);

      this.scene.add(group);
      this.landmarks.push({ ...def, group, hitMesh, beacon });
    });
  }

  focusLandmark(landmarkId) {
    const lm = this.landmarks.find(l => l.id === landmarkId);
    if (!lm) return;

    this.selectedLandmarkId = landmarkId;
    this.shouldFollowPlayer = false;
    this.targetLookTarget.copy(lm.pos).setY(1.0);
    this.targetDistance = 24.0;
    this.onSelectLandmarkCallback(lm);
  }

  /* -------------------------------------------------------------------------- */
  /* 6. PLAYER CHARACTER (RESTORED EXPLORER WITH FAITHFUL SILHOUETTE)           */
  /* -------------------------------------------------------------------------- */
  createPlayerCharacter() {
    this.playerGroup = new THREE.Group();
    this.playerGroup.name = 'player';

    // Start on the mountain trail in the central basin meadow
    const startX = -2.0;
    const startZ = 0.0;
    const startY = this.getTerrainHeight(startX, startZ);
    this.playerGroup.position.set(startX, startY, startZ);

    this.playerVisual = new THREE.Group();
    this.playerGroup.add(this.playerVisual);

    // 1. Subtle ground shadow disc
    const shadowGeo = new THREE.CircleGeometry(0.32, 20);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#0d2816',
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.playerGroup.add(shadowMesh);
    this.disposables.push(shadowGeo, shadowMat);

    // 2. Tangerine Poncho / Coat Body (restored from UNSEEN's original cone silhouette)
    const bodyGeo = new THREE.ConeGeometry(0.22, 0.52, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#E96D2C', // UNSEEN signature Tangerine
      roughness: 0.8,
      flatShading: true
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.44;
    bodyMesh.castShadow = true;
    this.playerVisual.add(bodyMesh);
    this.disposables.push(bodyGeo, bodyMat);

    // 3. Explorer Head (warm linen sphere)
    const headGeo = new THREE.SphereGeometry(0.14, 10, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: '#EDEAE4', // UNSEEN Warm Linen
      roughness: 0.7,
      flatShading: true
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 0.78;
    headMesh.castShadow = true;
    this.playerVisual.add(headMesh);
    this.disposables.push(headGeo, headMat);

    // 4. Explorer Hat (brim and crown in weathered khaki linen)
    const hatMat = new THREE.MeshStandardMaterial({
      color: '#D8CAB4',
      roughness: 0.85,
      flatShading: true
    });
    const hatBrimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.025, 10);
    const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 0.87;
    hatBrim.castShadow = true;
    this.playerVisual.add(hatBrim);

    const hatCrownGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.09, 8);
    const hatCrown = new THREE.Mesh(hatCrownGeo, hatMat);
    hatCrown.position.y = 0.92;
    hatCrown.castShadow = true;
    this.playerVisual.add(hatCrown);
    this.disposables.push(hatBrimGeo, hatCrownGeo, hatMat);

    // 5. Explorer Field Pack on back
    const packGeo = new THREE.BoxGeometry(0.18, 0.22, 0.14);
    const packMat = new THREE.MeshStandardMaterial({
      color: '#7A5C38',
      roughness: 0.9,
      flatShading: true
    });
    const packMesh = new THREE.Mesh(packGeo, packMat);
    packMesh.position.set(0, 0.48, -0.15);
    packMesh.castShadow = true;
    this.playerVisual.add(packMesh);
    this.disposables.push(packGeo, packMat);

    // 6. Left & Right Legs for walk stride
    const legGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.22, 6);
    const legMat = new THREE.MeshStandardMaterial({
      color: '#344E41',
      roughness: 0.85,
      flatShading: true
    });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.085, 0.11, 0);
    this.leftLeg.castShadow = true;
    this.playerVisual.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.085, 0.11, 0);
    this.rightLeg.castShadow = true;
    this.playerVisual.add(this.rightLeg);
    this.disposables.push(legGeo, legMat);

    this.scene.add(this.playerGroup);

    // Initial camera look target tracks player
    this.defaultLookTarget.set(startX, startY + 0.6, startZ);
    this.targetLookTarget.copy(this.defaultLookTarget);
    this.lookTarget.copy(this.defaultLookTarget);
  }

  setupPlayerInput() {
    this.boundOnKeyDown = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        this.keys[k] = true;
        this.shouldFollowPlayer = true;
        if (k.startsWith('arrow')) {
          e.preventDefault();
        }
      }
    };

    this.boundOnKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (this.keys[k]) {
        this.keys[k] = false;
      }
    };

    this.boundOnBlur = () => {
      this.keys = {};
      this.touchMove = { x: 0, y: 0 };
    };

    this.boundOnVisibilityChange = () => {
      if (document.hidden) {
        this.keys = {};
        this.touchMove = { x: 0, y: 0 };
      }
    };

    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
    window.addEventListener('blur', this.boundOnBlur);
    document.addEventListener('visibilitychange', this.boundOnVisibilityChange);
  }

  setTouchMovement(x, y) {
    this.touchMove.x = THREE.MathUtils.clamp(x, -1, 1);
    this.touchMove.y = THREE.MathUtils.clamp(y, -1, 1);
    if (Math.abs(x) > 0.05 || Math.abs(y) > 0.05) {
      this.shouldFollowPlayer = true;
    }
  }

  updatePlayer(delta) {
    if (!this.playerGroup) return;

    let inputForward = 0;
    let inputRight = 0;

    if (this.keys['w'] || this.keys['arrowup']) inputForward += 1;
    if (this.keys['s'] || this.keys['arrowdown']) inputForward -= 1;
    if (this.keys['d'] || this.keys['arrowright']) inputRight += 1;
    if (this.keys['a'] || this.keys['arrowleft']) inputRight -= 1;

    if (this.touchMove) {
      inputForward += this.touchMove.y;
      inputRight += this.touchMove.x;
    }

    const inputMag = Math.hypot(inputRight, inputForward);
    let moveX = 0;
    let moveZ = 0;

    if (inputMag > 0.05) {
      const normX = inputRight / (inputMag > 1 ? inputMag : 1);
      const normY = inputForward / (inputMag > 1 ? inputMag : 1);

      const sinAz = Math.sin(this.cameraAzimuth);
      const cosAz = Math.cos(this.cameraAzimuth);

      moveX = normX * cosAz - normY * sinAz;
      moveZ = -normX * sinAz - normY * cosAz;
    }

    if (inputMag > 0.05) {
      this.isMoving = true;
      const speed = (this.keys['shift'] ? 7.0 : 4.5) * Math.min(inputMag, 1.0);

      let nextX = this.playerGroup.position.x + moveX * speed * delta;
      let nextZ = this.playerGroup.position.z + moveZ * speed * delta;

      // Playable boundary clamp within valley basin (radius 26.0)
      const maxRadius = 26.0;
      const distFromCenter = Math.hypot(nextX, nextZ);
      if (distFromCenter > maxRadius) {
        nextX = (nextX / distFromCenter) * maxRadius;
        nextZ = (nextZ / distFromCenter) * maxRadius;
      }

      const nextY = this.getTerrainHeight(nextX, nextZ);
      this.playerGroup.position.set(nextX, nextY, nextZ);

      // Smooth turning to face movement direction
      const targetAngle = Math.atan2(moveX, moveZ);
      let angleDiff = targetAngle - this.currentRotationY;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.currentRotationY += angleDiff * Math.min(1.0, delta * 12.0);
      this.playerGroup.rotation.y = this.currentRotationY;

      // Walking stride animation
      this.walkAnimTime += delta * (this.keys['shift'] ? 14 : 9.5);
      const stride = Math.sin(this.walkAnimTime) * 0.55;
      if (this.leftLeg) this.leftLeg.rotation.x = stride;
      if (this.rightLeg) this.rightLeg.rotation.x = -stride;
      if (this.playerVisual) {
        this.playerVisual.position.y = Math.abs(Math.sin(this.walkAnimTime)) * 0.05;
        this.playerVisual.rotation.z = Math.sin(this.walkAnimTime * 0.5) * 0.03;
      }
    } else {
      this.isMoving = false;
      this.idleAnimTime += delta * 2.5;

      // Rest legs
      if (this.leftLeg) this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, delta * 8.0);
      if (this.rightLeg) this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, delta * 8.0);

      // Gentle idle breath
      if (this.playerVisual) {
        this.playerVisual.position.y = THREE.MathUtils.lerp(this.playerVisual.position.y, Math.sin(this.idleAnimTime) * 0.02, delta * 4.0);
        this.playerVisual.rotation.z = THREE.MathUtils.lerp(this.playerVisual.rotation.z, 0, delta * 6.0);
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* EVENTS & CAMERA CONTROLS                                                   */
  /* -------------------------------------------------------------------------- */
  setupEvents() {
    this.boundOnResize = () => this.onResize();
    this.boundOnPointerMove = (e) => this.onPointerMove(e);
    this.boundOnPointerDown = (e) => this.onPointerDown(e);
    this.boundOnPointerUp = (e) => this.onPointerUp(e);
    this.boundOnWheel = (e) => this.onWheel(e);
    this.boundOnContextMenu = (e) => e.preventDefault();

    window.addEventListener('resize', this.boundOnResize);
    this.canvas.addEventListener('pointermove', this.boundOnPointerMove);
    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    this.canvas.addEventListener('pointerup', this.boundOnPointerUp);
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.boundOnContextMenu);

    this.setupPlayerInput();
  }

  onResize() {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const parent = this.canvas.parentElement;
    const width = (parent && parent.clientWidth > 10 ? parent.clientWidth : 0) || window.innerWidth;
    const height = (parent && parent.clientHeight > 10 ? parent.clientHeight : 0) || (window.innerHeight - 64);
    if (!width || !height || width <= 10 || height <= 10) return;

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  onPointerDown(e) {
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.hasMovedSignificantly = false;

    if (e.button === 2) {
      this.isPanning = true;
      this.shouldFollowPlayer = false; // Temporarily suspend follow while manually panning
      this.canvas.style.cursor = 'move';
    } else if (e.button === 0) {
      this.isOrbiting = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onPointerMove(e) {
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      this.hasMovedSignificantly = true;
    }

    if (this.isPanning) {
      const panSpeed = 0.028 * (this.cameraDistance / 40);
      const right = new THREE.Vector3(Math.cos(this.cameraAzimuth), 0, -Math.sin(this.cameraAzimuth));
      const forward = new THREE.Vector3(-Math.sin(this.cameraAzimuth), 0, -Math.cos(this.cameraAzimuth));

      this.targetLookTarget.addScaledVector(right, -dx * panSpeed);
      this.targetLookTarget.addScaledVector(forward, dy * panSpeed);

      this.targetLookTarget.x = THREE.MathUtils.clamp(this.targetLookTarget.x, -28, 28);
      this.targetLookTarget.z = THREE.MathUtils.clamp(this.targetLookTarget.z, -28, 28);

      this.dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (this.isOrbiting) {
      const sensitivity = 0.0055;
      this.targetAzimuth -= dx * sensitivity;
      this.targetElevation = THREE.MathUtils.clamp(this.targetElevation + dy * sensitivity, 0.16, 1.05);

      this.dragStart = { x: e.clientX, y: e.clientY };
    }
  }

  onPointerUp(e) {
    const wasPanning = this.isPanning;
    const moved = this.hasMovedSignificantly;

    this.isOrbiting = false;
    this.isPanning = false;
    this.canvas.style.cursor = 'grab';

    if (moved || (wasPanning && e.button === 2)) return;

    // Raycast on landmarks
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hitMeshes = this.landmarks.map(l => l.hitMesh);
    const intersects = this.raycaster.intersectObjects(hitMeshes);

    if (intersects.length > 0) {
      const hitLId = intersects[0].object.userData.landmarkId;
      if (hitLId) {
        this.focusLandmark(hitLId);
      }
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.024;
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + zoomDelta, this.minDistance, this.maxDistance);
  }

  zoomIn() {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance - 4.5, this.minDistance, this.maxDistance);
  }

  zoomOut() {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + 4.5, this.minDistance, this.maxDistance);
  }

  resetCamera() {
    this.targetAzimuth = this.defaultAzimuth;
    this.targetElevation = this.defaultElevation;
    this.targetDistance = this.defaultDistance;

    if (this.playerGroup) {
      this.targetLookTarget.set(
        this.playerGroup.position.x,
        this.playerGroup.position.y + 0.6,
        this.playerGroup.position.z
      );
      this.shouldFollowPlayer = true;
    } else {
      this.targetLookTarget.copy(this.defaultLookTarget);
    }

    if (this.isReducedMotion) {
      this.cameraAzimuth = this.targetAzimuth;
      this.cameraElevation = this.targetElevation;
      this.cameraDistance = this.targetDistance;
      this.lookTarget.copy(this.targetLookTarget);
      this.updateCameraImmediate();
    }
  }

  updateCameraImmediate() {
    const x = this.lookTarget.x + this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);
    const y = this.lookTarget.y + this.cameraDistance * Math.sin(this.cameraElevation);
    const z = this.lookTarget.z + this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.lookTarget);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.isPaused) return;

    const time = performance.now() * 0.001;
    const delta = Math.min(time - (this.lastTime || time), 0.1);
    this.lastTime = time;

    // Delta-time player movement and animation
    this.updatePlayer(delta);

    // Smooth follow camera: gently tracks explorer while preserving 3/4 perspective
    if (this.shouldFollowPlayer && !this.isOrbiting && !this.isPanning && this.playerGroup) {
      const targetCamFocus = new THREE.Vector3(
        this.playerGroup.position.x,
        this.playerGroup.position.y + 0.6,
        this.playerGroup.position.z
      );
      this.targetLookTarget.lerp(targetCamFocus, 0.05);
    }

    // Smooth camera damping
    const lerpFactor = this.isReducedMotion ? 1.0 : 0.085;
    this.cameraAzimuth = THREE.MathUtils.lerp(this.cameraAzimuth, this.targetAzimuth, lerpFactor);
    this.cameraElevation = THREE.MathUtils.lerp(this.cameraElevation, this.targetElevation, lerpFactor);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetDistance, lerpFactor);
    this.lookTarget.lerp(this.targetLookTarget, lerpFactor);
    this.updateCameraImmediate();

    // Pulse landmark beacons
    if (!this.isReducedMotion) {
      this.beaconMeshes.forEach((beacon, idx) => {
        const pulse = 1.0 + Math.sin(time * 2.2 + idx * 0.8) * 0.18;
        beacon.scale.set(pulse, pulse, pulse);
        beacon.material.opacity = 0.55 + Math.sin(time * 2.2 + idx * 0.8) * 0.3;
      });

      this.swayMeshes.forEach(mesh => {
        mesh.rotation.z = Math.sin(time * 1.2) * 0.02;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.onResize();
  }

  dispose() {
    this.pause();
    window.removeEventListener('resize', this.boundOnResize);
    if (this.canvas) {
      this.canvas.removeEventListener('pointermove', this.boundOnPointerMove);
      this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
      this.canvas.removeEventListener('pointerup', this.boundOnPointerUp);
      this.canvas.removeEventListener('wheel', this.boundOnWheel);
      this.canvas.removeEventListener('contextmenu', this.boundOnContextMenu);
    }

    if (this.boundOnKeyDown) window.removeEventListener('keydown', this.boundOnKeyDown);
    if (this.boundOnKeyUp) window.removeEventListener('keyup', this.boundOnKeyUp);
    if (this.boundOnBlur) window.removeEventListener('blur', this.boundOnBlur);
    if (this.boundOnVisibilityChange) document.removeEventListener('visibilitychange', this.boundOnVisibilityChange);

    this.disposables.forEach(d => {
      if (d && d.dispose) d.dispose();
    });
  }
}

// Backwards-compatible alias for WorldScene
export { SanctuaryScene as WorldScene };
