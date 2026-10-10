/**
 * UNSEEN — Interactive 3D Living Forest Scene & Continuous Story Journey (Three.js)
 * Award-winning continuous 3D scroll-driven camera trajectory through low-poly forest,
 * CatmullRom spline path interpolation, golden relic discovery marker,
 * bioluminescent spore particles, dynamic keystone emission lighting,
 * and 3-beat story overlay transitions (NOTICE, WANDER, RETURN).
 */

import * as THREE from 'three';

export class ForestScene {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.container = canvasElement.parentElement;
    
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Scene objects tracking for cleanup
    this.disposables = [];
    this.animationFrameId = null;
    this.resizeObserver = null;
    
    // Mouse / Pointer tracking
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    
    // Interactive Landmark & Relic references
    this.landmarkGroup = null;
    this.landmarkKeystoneMat = null;
    this.isLandmarkHovered = false;
    this.relicMat = null;
    
    // Scroll progress track (0.0 to 1.0) across the 300vh story container
    this.scrollProgress = 0;
    
    this.init();
  }

  init() {
    try {
      this.setupRenderer();
      this.setupScene();
      this.setupCamera();
      this.setupLighting();
      this.createTerrain();
      this.createStream();
      this.createPath();
      this.createTrees();
      this.createRocksAndFoliage();
      this.createLandmark();
      this.createFireflies();
      this.setupEvents();
      this.animate();
    } catch (err) {
      console.warn('Three.js WebGL initialization failed:', err);
    }
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    const width = this.container.offsetWidth || window.innerWidth;
    const height = this.container.offsetHeight || window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    const fogColor = new THREE.Color('#1B2C20');
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(fogColor, 0.014);
  }

  setupCamera() {
    const width = this.container.offsetWidth || window.innerWidth;
    const height = this.container.offsetHeight || window.innerHeight;
    const aspect = width / height;
    
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 120);
    
    // Continuous 3D camera trajectory curve through the forest valley
    this.cameraPathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 5.4, 12.5),    // Scene 1 (0%): Elevated overview (UNSEEN wordmark)
      new THREE.Vector3(-1.2, 4.2, 6.0),    // Mid-trail swoop
      new THREE.Vector3(0.6, 3.4, -1.5),    // Scene 2 (~50%): Forest clearing ("There’s more out there")
      new THREE.Vector3(-0.4, 2.9, -6.5),   // Approaching ancient clearing
      new THREE.Vector3(0.0, 2.7, -10.5)    // Scene 3 (100%): In front of glowing archway ("Bring back what you found")
    ]);

    // Camera lookAt target trajectory curve
    this.cameraTargetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 1.4, -5.5),    // Scene 1 lookAt
      new THREE.Vector3(0.1, 1.5, -5.0),    // Mid-trail lookAt
      new THREE.Vector3(-0.2, 1.7, -8.0),   // Scene 2 lookAt
      new THREE.Vector3(0.0, 2.2, -12.5),   // Gateway approach lookAt
      new THREE.Vector3(0.0, 2.8, -16.0)    // Scene 3 lookAt (Keystone portal)
    ]);

    this.currentCameraTarget = new THREE.Vector3(0.0, 1.4, -5.5);
    this.camera.position.set(0.0, 5.4, 12.5);
    this.camera.lookAt(this.currentCameraTarget);
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight('#485E4D', 1.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight('#FFF3D4', 2.8);
    sun.position.set(-14, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight('#CDE0B1', '#1B2C20', 0.95);
    this.scene.add(hemi);

    this.landmarkLight = new THREE.PointLight('#E5A962', 4.2, 16);
    this.landmarkLight.position.set(0, 3.0, -16);
    this.scene.add(this.landmarkLight);
  }

  createTerrain() {
    const width = 55;
    const depth = 65;
    const segments = 64;
    const geo = new THREE.PlaneGeometry(width, depth, segments, segments);
    geo.rotateX(-Math.PI / 2);
    
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      
      const valleyCenter = Math.sin(z * 0.12) * 3.2;
      const distFromValley = Math.abs(x - valleyCenter);
      
      const ridgeLeft = Math.sin(x * 0.18 + 1.2) * 3.5 + Math.cos(z * 0.1) * 2.2;
      const ridgeRight = Math.cos(x * 0.15 - 0.8) * 3.8 + Math.sin(z * 0.12) * 2.5;
      const ridgeBlend = THREE.MathUtils.smoothstep(distFromValley, 2.0, 16.0);
      
      const streamDist = Math.abs(x - (valleyCenter + 3.2));
      const streamCarving = THREE.MathUtils.smoothstep(streamDist, 0, 2.2) * -0.6;
      
      const height = (ridgeLeft + ridgeRight) * 0.5 * ridgeBlend + streamCarving;
      pos.setY(i, height);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: '#263B2D',
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true
    });

    const terrain = new THREE.Mesh(geo, mat);
    terrain.position.set(0, -0.4, -5);
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    this.disposables.push(geo, mat);
  }

  createStream() {
    const streamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(5.2, -0.25, 12),
      new THREE.Vector3(3.2, -0.32, 4),
      new THREE.Vector3(4.0, -0.35, -3),
      new THREE.Vector3(2.1, -0.38, -11),
      new THREE.Vector3(3.5, -0.4, -18)
    ]);

    const streamGeo = new THREE.TubeGeometry(streamCurve, 64, 1.6, 8, false);
    const streamMat = new THREE.MeshStandardMaterial({
      color: '#2A585F',
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.82,
      flatShading: true
    });

    const streamMesh = new THREE.Mesh(streamGeo, streamMat);
    streamMesh.position.y = 0.05;
    this.scene.add(streamMesh);

    this.disposables.push(streamGeo, streamMat);
  }

  createPath() {
    const pathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.8, 0.08, 14),
      new THREE.Vector3(-0.6, 0.08, 7),
      new THREE.Vector3(0.8, 0.08, 0),
      new THREE.Vector3(-0.8, 0.08, -8),
      new THREE.Vector3(0.0, 0.08, -16)
    ]);

    const pathGeo = new THREE.TubeGeometry(pathCurve, 80, 1.3, 8, false);
    const pathMat = new THREE.MeshStandardMaterial({
      color: '#A8946E',
      roughness: 0.98,
      metalness: 0.0,
      flatShading: true
    });

    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.receiveShadow = true;
    this.scene.add(pathMesh);

    const linePoints = pathCurve.getPoints(100);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    
    this.lineMat = new THREE.LineDashedMaterial({
      color: '#E5A962',
      dashSize: 0.5,
      gapSize: 0.25,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });

    const lineMesh = new THREE.Line(lineGeo, this.lineMat);
    lineMesh.computeLineDistances();
    lineMesh.position.y = 0.12;
    this.scene.add(lineMesh);

    this.disposables.push(pathGeo, pathMat, lineGeo, this.lineMat);
  }

  createTrees() {
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 3.4, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#2B201A', roughness: 0.95 });
    
    const pineGeos = [
      new THREE.ConeGeometry(1.5, 3.6, 7),
      new THREE.ConeGeometry(1.2, 2.8, 7),
      new THREE.ConeGeometry(0.9, 2.2, 7)
    ];

    const broadleafGeo = new THREE.DodecahedronGeometry(1.4, 1);

    const foliageColors = ['#1B3322', '#243D29', '#325237', '#446645', '#57784F', '#D9A05B'];
    const foliageMats = foliageColors.map(c => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.88,
      flatShading: true
    }));

    const treeGroupAll = new THREE.Group();
    const treeCount = 110;

    for (let i = 0; i < treeCount; i++) {
      const side = (i % 2 === 0 ? 1 : -1);
      const x = side * (3.0 + Math.random() * 18.0);
      const z = 12 - Math.random() * 38;
      const scale = 0.65 + Math.random() * 0.75;
      const isBroadleaf = (i % 4 === 0);
      const isGoldenAspen = (i % 9 === 0);

      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      tree.scale.set(scale, scale, scale);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.7;
      trunk.castShadow = true;
      tree.add(trunk);

      if (isBroadleaf) {
        const mat = isGoldenAspen ? foliageMats[5] : foliageMats[i % 4];
        const canopy = new THREE.Mesh(broadleafGeo, mat);
        canopy.position.y = 3.6;
        canopy.scale.set(1.1, 0.95, 1.1);
        canopy.rotation.y = Math.random() * Math.PI;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        tree.add(canopy);
      } else {
        const tierCount = 2 + Math.floor(Math.random() * 2);
        for (let j = 0; j < tierCount; j++) {
          const geo = pineGeos[j % pineGeos.length];
          const mat = foliageMats[(i + j) % (foliageMats.length - 1)];
          const canopy = new THREE.Mesh(geo, mat);
          canopy.position.y = 3.0 + j * 1.4;
          canopy.rotation.y = Math.random() * Math.PI;
          canopy.castShadow = true;
          canopy.receiveShadow = true;
          tree.add(canopy);
        }
      }

      treeGroupAll.add(tree);
    }

    this.scene.add(treeGroupAll);
    this.disposables.push(trunkGeo, trunkMat, ...pineGeos, broadleafGeo, ...foliageMats);
  }

  createRocksAndFoliage() {
    const rockGeo = new THREE.DodecahedronGeometry(0.7, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#4C5C50',
      roughness: 0.94,
      flatShading: true
    });

    const rockPositions = [
      [-2.6, 0.35, 6], [2.8, 0.4, 3], [-3.8, 0.6, 2],
      [3.6, 0.35, -4], [-3.2, 0.5, -10], [2.6, 0.4, -14],
      [-1.8, 0.3, -15], [4.2, 0.5, 8], [-4.5, 0.7, -6]
    ];

    rockPositions.forEach(([x, y, z]) => {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, y, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      const s = 0.55 + Math.random() * 0.75;
      rock.scale.set(s, s, s);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    });

    // Fallen Mossy Log at (-3.8, 0.3, 2.0)
    const logGeo = new THREE.CylinderGeometry(0.35, 0.42, 3.8, 7);
    const logMat = new THREE.MeshStandardMaterial({ color: '#3B2A1E', roughness: 0.9, flatShading: true });
    const fallenLog = new THREE.Mesh(logGeo, logMat);
    fallenLog.position.set(-3.8, 0.3, 2.0);
    fallenLog.rotation.set(0.3, 0.8, 1.4);
    fallenLog.castShadow = true;
    this.scene.add(fallenLog);

    // Unusual Golden Relic / Ancient Survey Marker for Beat 1 (NOTICE) at (-1.4, 0.45, 3.8)
    const markerGeo = new THREE.CylinderGeometry(0.35, 0.48, 1.3, 7);
    const markerMat = new THREE.MeshStandardMaterial({ color: '#354638', roughness: 0.85, flatShading: true });
    const relicMarker = new THREE.Mesh(markerGeo, markerMat);
    relicMarker.position.set(-1.4, 0.55, 3.8);
    relicMarker.castShadow = true;
    relicMarker.receiveShadow = true;

    this.relicMat = new THREE.MeshStandardMaterial({
      color: '#D9A05B',
      emissive: '#B87838',
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.4
    });
    const diskGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 14);
    const relicDisk = new THREE.Mesh(diskGeo, this.relicMat);
    relicDisk.position.set(0, 0.68, 0);
    relicMarker.add(relicDisk);

    this.scene.add(relicMarker);

    this.disposables.push(rockGeo, rockMat, logGeo, logMat, markerGeo, markerMat, diskGeo, this.relicMat);
  }

  createLandmark() {
    this.landmarkGroup = new THREE.Group();
    this.landmarkGroup.position.set(0, 0, -16);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: '#344638',
      roughness: 0.85,
      flatShading: true
    });

    this.landmarkKeystoneMat = new THREE.MeshStandardMaterial({
      color: '#E5A962',
      emissive: '#B86535',
      emissiveIntensity: 0.85,
      roughness: 0.35
    });

    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.8, 0.9), stoneMat);
    pillarLeft.position.set(-1.6, 2.4, 0);
    pillarLeft.castShadow = true;
    this.landmarkGroup.add(pillarLeft);

    const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.8, 0.9), stoneMat);
    pillarRight.position.set(1.6, 2.4, 0);
    pillarRight.castShadow = true;
    this.landmarkGroup.add(pillarRight);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 1.0), stoneMat);
    lintel.position.set(0, 4.8, 0);
    lintel.castShadow = true;
    this.landmarkGroup.add(lintel);

    const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), this.landmarkKeystoneMat);
    keystone.position.set(0, 2.8, 0);
    keystone.name = 'landmark-keystone';
    this.landmarkGroup.add(keystone);

    this.scene.add(this.landmarkGroup);
    this.disposables.push(stoneMat, this.landmarkKeystoneMat);
  }

  createFireflies() {
    const count = 110;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = Math.random() * 6 + 0.6;
      positions[i * 3 + 2] = 12 - Math.random() * 34;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: '#F0E294',
      size: 0.14,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });

    this.fireflies = new THREE.Points(geo, mat);
    this.scene.add(this.fireflies);

    this.disposables.push(geo, mat);
  }

  setupEvents() {
    this.onResize = this.onResize.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onClick = this.onClick.bind(this);

    if (window.ResizeObserver && this.container) {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }
    
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    
    if (!this.prefersReducedMotion) {
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      window.addEventListener('click', this.onClick);
    }

    // Trigger initial scroll calculation
    this.onScroll();
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.offsetWidth || window.innerWidth;
    const h = this.container.offsetHeight || window.innerHeight;
    if (w === 0 || h === 0) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  onPointerMove(e) {
    this.targetMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    this.targetMouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  onScroll() {
    const container = document.getElementById('hero-story-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const totalScrollable = container.offsetHeight - window.innerHeight;
    if (totalScrollable <= 0) return;

    // Calculate 0.0 to 1.0 progress within 300vh story container
    const progress = Math.max(0, Math.min(1, -rect.top / totalScrollable));
    this.scrollProgress = progress;

    this.updateStoryBeatOverlays(progress);
  }

  updateStoryBeatOverlays(p) {
    const wordmarkBeat = document.getElementById('story-beat-wordmark');
    const invitationBeat = document.getElementById('story-beat-invitation');
    const returnBeat = document.getElementById('story-beat-return');

    const calcOpacity = (val, startIn, fullIn, fullOut, endOut) => {
      if (val < startIn || val > endOut) return 0;
      if (val >= fullIn && val <= fullOut) return 1;
      if (val < fullIn) return (val - startIn) / (fullIn - startIn);
      return 1 - (val - fullOut) / (endOut - fullOut);
    };

    // Scene 1: Opening UNSEEN wordmark (fades out as scroll begins)
    if (wordmarkBeat) {
      const op = p < 0.22 ? Math.max(0, 1 - p / 0.18) : 0;
      wordmarkBeat.style.opacity = op.toFixed(2);
      wordmarkBeat.style.pointerEvents = 'none';
    }

    // Scene 2: The Invitation ("There’s more out there than you notice.")
    if (invitationBeat) {
      const op = calcOpacity(p, 0.18, 0.32, 0.62, 0.74);
      invitationBeat.style.opacity = op.toFixed(2);
    }

    // Scene 3: The Return ("Bring back what you found." + ENTER THE FOREST CTA)
    if (returnBeat) {
      const op = p > 0.72 ? Math.min(1, (p - 0.72) / 0.16) : 0;
      returnBeat.style.opacity = op.toFixed(2);
      returnBeat.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
    }
  }

  onClick() {
    if (!this.camera || !this.landmarkGroup) return;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.landmarkGroup.children);

    if (intersects.length > 0) {
      const modal = document.getElementById('expedition-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    }
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (document.hidden) return;

    if (!this.prefersReducedMotion) {
      // Interpolate smooth 3D camera trajectory points from CatmullRom curves based on scrollProgress
      const targetCamPos = this.cameraPathCurve.getPoint(this.scrollProgress);
      const targetLook = this.cameraTargetCurve.getPoint(this.scrollProgress);

      targetCamPos.x += this.targetMouse.x * 0.65;
      targetCamPos.y += this.targetMouse.y * 0.35;

      this.camera.position.lerp(targetCamPos, 0.08);
      this.currentCameraTarget.lerp(targetLook, 0.08);
      this.camera.lookAt(this.currentCameraTarget);

      // Rotate bioluminescent spores
      if (this.fireflies) {
        this.fireflies.rotation.y += 0.0006 + this.scrollProgress * 0.0008;
      }

      // Dynamic Relic & Keystone emission response with scroll progression
      if (this.relicMat) {
        const time = Date.now() * 0.002;
        const pulse = 0.75 + Math.sin(time) * 0.25;
        this.relicMat.emissiveIntensity = pulse;
      }

      if (this.landmarkKeystoneMat) {
        const time = Date.now() * 0.0025;
        const pulse = 0.65 + Math.sin(time) * 0.35;
        const scrollGlow = 0.85 + Math.pow(this.scrollProgress, 2) * 1.8;
        this.landmarkKeystoneMat.emissiveIntensity = this.isLandmarkHovered ? 2.5 : pulse * scrollGlow;
      }

      if (this.landmarkGroup) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.landmarkGroup.children);
        this.isLandmarkHovered = intersects.length > 0;
        this.canvas.style.cursor = this.isLandmarkHovered ? 'pointer' : 'default';
      }
    } else {
      // Respect reduced-motion: direct positioning based on scroll without continuous sway
      const targetCamPos = this.cameraPathCurve.getPoint(this.scrollProgress);
      const targetLook = this.cameraTargetCurve.getPoint(this.scrollProgress);
      this.camera.position.copy(targetCamPos);
      this.camera.lookAt(targetLook);
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('click', this.onClick);

    this.disposables.forEach(item => {
      if (item.dispose) item.dispose();
    });

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}
