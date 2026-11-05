/* THE LAST FOLD — procedural paper diorama rendered with Three.js */
import * as THREE from './three.module.js';

export const CELL = 1.22;

const ELEVATION = THREE.MathUtils.degToRad(58);
const CAMERA_DISTANCE = 24;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + rr, y);
  shape.lineTo(x + w - rr, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + rr);
  shape.lineTo(x + w, y + h - rr);
  shape.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  shape.lineTo(x + rr, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - rr);
  shape.lineTo(x, y + rr);
  shape.quadraticCurveTo(x, y, x + rr, y);
  return shape;
}

function starShape(outer = 0.23, inner = 0.095) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function paperTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7f3e9';
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random() * 18 - 9;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 0.92));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n * 0.8));
  }
  ctx.putImageData(img, 0, 0);

  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 240; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 4 + Math.random() * 22;
    const light = Math.random() > 0.55;
    ctx.strokeStyle = light ? '#fffdf6' : '#cfc4b0';
    ctx.lineWidth = Math.random() * 0.8 + 0.25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 2.4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function radialTexture(inner = 'rgba(255,255,255,0.95)', outer = 'rgba(255,255,255,0)') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function paperBumpTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.random() * 80;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class PaperWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xeee6d4, 18, 42);

    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
    this.camera.position.set(0, CAMERA_DISTANCE * Math.sin(ELEVATION), CAMERA_DISTANCE * Math.cos(ELEVATION));
    this.camera.lookAt(0, 0.6, 0);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.levelRoot = new THREE.Group();
    this.menuRoot = new THREE.Group();
    this.fxRoot = new THREE.Group();
    this.root.add(this.levelRoot, this.menuRoot, this.fxRoot);

    this.paperTex = paperTexture();
    this.bumpTex = paperBumpTexture();
    this.glowTex = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    this.blobTex = radialTexture('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)');

    this.createMaterials();
    this.createSharedGeometry();

    this.hemi = new THREE.HemisphereLight(0xfff6e4, 0x5d6a54, 1.55);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff0d4, 2.35);
    this.sun.position.set(-7, 12, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -9;
    this.sun.shadow.camera.right = 9;
    this.sun.shadow.camera.top = 9;
    this.sun.shadow.camera.bottom = -9;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 32;
    this.sun.shadow.bias = -0.0007;
    this.sun.shadow.normalBias = 0.025;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight(0xbcd4e8, 0.5);
    this.fill.position.set(8, 6, -8);
    this.scene.add(this.fill);

    this.goalLight = new THREE.PointLight(0xffd479, 0.8, 4.5, 2);
    this.scene.add(this.goalLight);

    this.ambientDust = null;
    this.particles = [];
    this.stars = new Map();
    this.enemies = [];
    this.cells = new Map();
    this.W = 7;
    this.H = 7;
    this.def = null;
    this.state = null;
    this.mode = 'menu';
    this.quality = 'high';
    this.reducedMotion = false;
    this.time = 0;
    this.pivot = null;
    this.creaseMesh = null;
    this.player = null;
    this.playerParts = null;
    this.goalGroup = null;
    this.starGroups = new Map();
    this.enemyGroups = [];
    this.baseY = 0;
    this.menuFocus = new THREE.Vector3(0, 0.6, 0);
    this.menuParallax = { x: 0, y: 0 };

    this.setQuality('high');
  }

  createMaterials() {
    const standard = (color, opts = {}) => new THREE.MeshStandardMaterial({
      color,
      map: this.paperTex,
      bumpMap: this.bumpTex,
      bumpScale: 0.012,
      roughness: 0.92,
      metalness: 0,
      flatShading: false,
      ...opts,
    });

    this.materials = {
      floor: [standard(0xc9d6a8), standard(0xc3d1a1), standard(0xbdcc9b)],
      wall: standard(0x8d9d70, { flatShading: true }),
      base: standard(0x5c6b4b, { roughness: 1 }),
      baseDark: standard(0x44523a, { roughness: 1 }),
      hole: standard(0x3e4a35, { roughness: 1 }),
      paper: standard(0xf6eedb),
      paperDeep: standard(0xddcfb2),
      accent: standard(0x5f7d4f, { flatShading: true }),
      accentSoft: standard(0xa9bd8f, { flatShading: true }),
      gold: standard(0xf2c35b, { flatShading: true, metalness: 0.18, roughness: 0.38, emissive: 0x6b4a0b, emissiveIntensity: 0.25 }),
      ink: standard(0x2d3428, { flatShading: true, roughness: 0.78 }),
      flap: standard(0xddcfb2, { roughness: 0.98 }),
      eye: new THREE.MeshBasicMaterial({ color: 0x241c17 }),
      white: standard(0xfbf7ed, { flatShading: true }),
    };
    this.materials.floor.forEach((m) => { m.receiveShadow = true; });
    this.materials.base.receiveShadow = true;
    this.materials.baseDark.receiveShadow = true;
    this.materials.wall.castShadow = true;
    this.materials.wall.receiveShadow = true;
    this.materials.accent.castShadow = true;
    this.materials.accentSoft.castShadow = true;
    this.materials.gold.castShadow = true;
    this.materials.paper.castShadow = true;
  }

  createSharedGeometry() {
    const tileShape = roundedRectShape(CELL * 0.93, CELL * 0.93, 0.11);
    this.tileGeo = new THREE.ExtrudeGeometry(tileShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.02,
      curveSegments: 3,
    });
    this.tileGeo.rotateX(-Math.PI / 2);
    this.tileGeo.translate(0, -0.12, 0);
    this.tileGeo.computeVertexNormals();

    const holeShape = roundedRectShape(CELL * 0.84, CELL * 0.84, 0.1);
    this.holeGeo = new THREE.ExtrudeGeometry(holeShape, { depth: 0.01, bevelEnabled: false });
    this.holeGeo.rotateX(-Math.PI / 2);
    this.holeGeo.translate(0, -0.01, 0);

    this.starGeo = new THREE.ExtrudeGeometry(starShape(), {
      depth: 0.045,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.008,
      bevelThickness: 0.008,
      curveSegments: 2,
    });
    this.starGeo.center();

    this.cornerGeo = new THREE.BufferGeometry();
    this.cornerGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0,
      CELL * 0.29, 0, 0,
      0, 0, CELL * 0.29,
    ], 3));
    this.cornerGeo.computeVertexNormals();

    this.icoGeo = new THREE.IcosahedronGeometry(1, 0);
    this.octaGeo = new THREE.OctahedronGeometry(1, 0);
    this.sphereGeo = new THREE.SphereGeometry(1, 8, 6);
    this.cone4Geo = new THREE.ConeGeometry(1, 1, 4);
    this.cone5Geo = new THREE.ConeGeometry(1, 1, 5);
    this.cone6Geo = new THREE.ConeGeometry(1, 1, 6);
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.cylGeo = new THREE.CylinderGeometry(1, 1, 1, 7);
    this.planeGeo = new THREE.PlaneGeometry(1, 1);
    this.ringGeo = new THREE.TorusGeometry(0.34, 0.06, 6, 26);
    this.glowDiscGeo = new THREE.CircleGeometry(0.3, 24);
    this.baseGeoCache = new Map();
    this.flapGeoCache = new Map();
  }

  setQuality(quality) {
    this.quality = quality;
    const lite = quality === 'lite';
    this.renderer.shadowMap.enabled = !lite;
    this.sun.castShadow = !lite;
    this.sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
    const ratio = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(lite ? Math.min(ratio, 1) : Math.min(ratio, 2));
    this.materials.floor.forEach((m) => { m.needsUpdate = true; });
    this.resize();
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
  }

  setTheme(theme) {
    this.theme = theme;
    const p = theme.palette;
    this.scene.fog.color.set(p.haze);
    this.materials.floor[0].color.set(p.tile);
    this.materials.floor[1].color.set(p.tileAlt);
    this.materials.floor[2].color.set(p.tile).offsetHSL(0, 0.01, -0.018);
    this.materials.wall.color.set(p.wall);
    this.materials.base.color.set(p.base);
    this.materials.baseDark.color.set(p.baseEdge);
    this.materials.hole.color.set(p.baseEdge).offsetHSL(0, 0, -0.06);
    this.materials.paper.color.set(p.paper);
    this.materials.paperDeep.color.set(p.paperDeep);
    this.materials.flap.color.set(p.paperDeep);
    this.materials.accent.color.set(p.accent);
    this.materials.accentSoft.color.set(p.accentSoft);
    this.materials.gold.color.set(p.star);
    this.materials.gold.emissive.set(p.star);
    this.materials.gold.emissiveIntensity = 0.18;
    this.materials.ink.color.set(p.ink);
    this.materials.white.color.set(p.paper);
    this.materials.base.needsUpdate = true;

    this.hemi.color.set(theme.dark ? 0xb5a4dd : 0xfff6e4);
    this.hemi.groundColor.set(theme.dark ? 0x1b1629 : 0x5d6a54);
    this.hemi.intensity = theme.dark ? 1.05 : 1.55;
    this.sun.color.set(theme.dark ? 0xd8c7ff : 0xfff0d4);
    this.sun.intensity = theme.dark ? 1.8 : 2.35;
    this.fill.color.set(theme.dark ? 0x7a6abc : 0xbcd4e8);
    this.fill.intensity = theme.dark ? 0.75 : 0.5;
    this.goalLight.color.set(p.glow);
    this.scene.fog.near = theme.dark ? 15 : 18;
    this.scene.fog.far = theme.dark ? 38 : 42;
  }

  worldX(x) {
    return (x - (this.W - 1) / 2) * CELL;
  }

  worldZ(z) {
    return (z - (this.H - 1) / 2) * CELL;
  }

  cellFromWorld(point) {
    return {
      x: Math.floor(point.x / CELL + this.W / 2 + 0.00001),
      z: Math.floor(point.z / CELL + this.H / 2 + 0.00001),
    };
  }

  creaseWorldX(k) {
    return (k - this.W / 2) * CELL;
  }

  creaseWorldZ(k) {
    return (k - this.H / 2) * CELL;
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    const aspect = width / Math.max(1, height);
    const boardW = (this.W + 1) * CELL;
    const boardD = (this.H + 1) * CELL;
    const projectedDepth = boardD * Math.sin(ELEVATION);
    const neededWidth = boardW + 1.35;
    const neededHeight = projectedDepth + 3.6;
    let viewHeight = Math.max(11.4, neededWidth / aspect, neededHeight);
    if (aspect > 1.35) viewHeight = Math.max(11.2, neededHeight * 0.96, (boardW + 2.2) / aspect);
    this.camera.left = (-viewHeight * aspect) / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();

    if (this.mode === 'menu') {
      this.root.position.x = aspect > 1.08 ? 1.9 : 0;
      this.root.position.y = aspect > 1.08 ? -0.2 : 0.15;
    } else {
      this.root.position.set(0, 0, 0);
    }
  }

  clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();
      group.remove(child);
    }
  }

  disposePivot(restore = false) {
    if (this.pivot) {
      if (restore && this.pivotAttached) {
        this.pivot.updateMatrixWorld(true);
        for (const group of this.pivotAttached) this.levelRoot.attach(group);
      }
      this.pivot.parent?.remove(this.pivot);
      this.pivot = null;
    }
    if (this.creaseMesh) {
      this.creaseMesh.parent?.remove(this.creaseMesh);
      this.creaseMesh = null;
    }
    this.pivotCells = null;
    this.pivotAttached = null;
    this.pivotFlattenables = null;
    this.pivotAxis = null;
    this.pivotSide = null;
  }

  clearLevel() {
    this.disposePivot();
    this.disposePlayer();
    this.clearGroup(this.levelRoot);
    this.clearGroup(this.menuRoot);
    this.clearGroup(this.fxRoot);
    this.cells.clear();
    this.starGroups.clear();
    this.enemyGroups = [];
    this.player = null;
    this.playerParts = null;
    this.goalGroup = null;
    this.ambientDust = null;
    this.particles = [];
    this.stars.clear();
  }

  makeBase(width, depth, { floating = false } = {}) {
    const key = `${width.toFixed(2)}x${depth.toFixed(2)}`;
    let geo = this.baseGeoCache.get(key);
    if (!geo) {
      const shape = roundedRectShape(width, depth, 0.55);
      geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.26,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.16,
        bevelThickness: 0.08,
        curveSegments: 6,
      });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, -0.26, 0);
      this.baseGeoCache.set(key, geo);
    }
    const base = new THREE.Mesh(geo, this.materials.base);
    base.receiveShadow = true;
    base.position.y = -0.2;
    const group = new THREE.Group();
    group.add(base);

    const under = new THREE.Mesh(geo, this.materials.baseDark);
    under.scale.setScalar(0.975);
    under.position.set(0.07, -0.34, 0.12);
    under.receiveShadow = true;
    group.add(under);

    if (floating) {
      const rand = seeded(width * 100 + depth);
      for (let i = 0; i < 7; i += 1) {
        const puff = new THREE.Mesh(this.icoGeo, this.materials.paper);
        const s = 0.5 + rand() * 0.9;
        puff.scale.set(s * 1.5, s * 0.55, s);
        puff.position.set((rand() - 0.5) * width * 0.9, -0.55 - rand() * 0.5, (rand() - 0.5) * depth * 0.9);
        puff.rotation.y = rand() * Math.PI;
        group.add(puff);
      }
    }
    return group;
  }

  buildLevel(state, def, skin, theme, { animateEntry = false } = {}) {
    this.mode = 'level';
    this.setTheme(theme);
    this.clearLevel();
    this.W = state.W;
    this.H = state.H;
    this.state = state;
    this.def = def;
    this.resize();
    this.root.position.set(0, 0, 0);

    const boardW = this.W * CELL;
    const boardD = this.H * CELL;
    const floating = theme.id === 'floating' || theme.id === 'cosmic';
    this.levelRoot.add(this.makeBase(boardW + 1.1, boardD + 1.1, { floating }));

    for (let z = 0; z < this.H; z += 1) {
      for (let x = 0; x < this.W; x += 1) {
        const terrain = state.terrain[z][x];
        if (terrain === 0) {
          const hole = new THREE.Mesh(this.holeGeo, this.materials.hole);
          hole.position.set(this.worldX(x), -0.165, this.worldZ(z));
          hole.receiveShadow = true;
          this.levelRoot.add(hole);
        }
      }
    }

    for (let z = 0; z < this.H; z += 1) {
      for (let x = 0; x < this.W; x += 1) {
        const terrain = state.terrain[z][x];
        if (terrain === 0) continue;
        const group = this.buildCell(x, z, terrain, theme);
        this.cells.set(`${x},${z}`, group);
        this.levelRoot.add(group);
      }
    }

    this.addLevelProps(theme, def.id);

    // stars
    for (const starKey of state.stars) {
      const [x, z] = starKey.split(',').map(Number);
      const group = this.buildStar(theme);
      group.position.set(this.worldX(x), 0.43, this.worldZ(z));
      group.userData.baseY = 0.43;
      group.userData.phase = (x * 1.7 + z * 2.3) % (Math.PI * 2);
      this.levelRoot.add(group);
      this.starGroups.set(starKey, group);
    }

    // goal
    this.goalGroup = this.buildGoal(theme);
    this.goalGroup.position.set(this.worldX(state.goal.x), 0.07, this.worldZ(state.goal.z));
    this.levelRoot.add(this.goalGroup);
    this.goalLight.position.set(this.worldX(state.goal.x), 1.1, this.worldZ(state.goal.z));

    // enemies
    this.enemyGroups = [];
    state.enemies.forEach((enemy, index) => {
      const group = this.buildEnemy(theme);
      const cell = enemy.route[enemy.idx];
      group.position.set(this.worldX(cell.x), 0.32, this.worldZ(cell.z));
      group.userData.baseY = 0.32;
      group.userData.target = new THREE.Vector3(this.worldX(cell.x), 0.32, this.worldZ(cell.z));
      group.userData.index = index;
      this.levelRoot.add(group);
      this.enemyGroups.push(group);
    });

    // player
    this.player = this.buildPlayer(skin, theme);
    this.player.position.set(this.worldX(state.player.x), 0.07, this.worldZ(state.player.z));
    this.player.userData.baseY = 0.07;
    this.levelRoot.add(this.player);
    this.playerParts = this.player.userData.parts;

    this.buildDust(theme);
    this.buildMenuSun(theme, true);
    this.setCameraForLevel();

    if (animateEntry && !this.reducedMotion) {
      this.levelRoot.position.y = -0.65;
      this.levelRoot.scale.setScalar(0.96);
      const start = performance.now();
      const tick = () => {
        const t = Math.min(1, (performance.now() - start) / 480);
        const e = easeOutCubic(t);
        this.levelRoot.position.y = -0.65 * (1 - e);
        this.levelRoot.scale.setScalar(0.96 + 0.04 * e);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  setCameraForLevel() {
    const aspect = (this.canvas.clientWidth || window.innerWidth) / Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const boardW = ((this.W + 1) * CELL) + 1.35;
    const projectedDepth = (this.H + 1) * CELL * Math.sin(ELEVATION) + 3.4;
    let viewHeight = Math.max(11.2, boardW / aspect, projectedDepth);
    if (aspect > 1.35) viewHeight = Math.max(11.1, projectedDepth * 0.98, (boardW + 1.1) / aspect);
    this.camera.left = (-viewHeight * aspect) / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.position.set(0, CAMERA_DISTANCE * Math.sin(ELEVATION), CAMERA_DISTANCE * Math.cos(ELEVATION));
    this.camera.lookAt(0, 0.55, 0);
    this.camera.updateProjectionMatrix();
  }

  buildCell(x, z, terrain, theme) {
    const group = new THREE.Group();
    group.position.set(this.worldX(x), 0.07, this.worldZ(z));
    group.userData.cell = { x, z };

    const matIndex = Math.abs((x * 3 + z * 5) % this.materials.floor.length);
    const tile = new THREE.Mesh(this.tileGeo, this.materials.floor[matIndex]);
    tile.receiveShadow = true;
    tile.castShadow = true;
    group.add(tile);

    if ((x * 7 + z * 11) % 4 === 0) {
      const corner = new THREE.Mesh(this.cornerGeo, this.materials.paperDeep);
      corner.position.set(-CELL * 0.28, 0.004, -CELL * 0.28);
      corner.rotation.y = ((x + z) % 4) * (Math.PI / 2);
      group.add(corner);
    }

    if (terrain === 2) {
      const wall = this.buildWall(theme, x, z);
      group.add(wall);
    }
    return group;
  }

  buildWall(theme) {
    const group = new THREE.Group();
    const mat = this.materials.wall;
    const bottom = new THREE.Mesh(this.boxGeo, mat);
    bottom.scale.set(CELL * 0.76, 0.18, CELL * 0.76);
    bottom.position.y = 0.09;
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    group.add(bottom);

    const middle = new THREE.Mesh(this.boxGeo, mat);
    middle.scale.set(CELL * 0.58, 0.2, CELL * 0.58);
    middle.position.set(0.02, 0.28, 0.01);
    middle.rotation.y = 0.18;
    middle.castShadow = true;
    middle.receiveShadow = true;
    group.add(middle);

    const top = new THREE.Mesh(this.octaGeo, this.materials.paper);
    top.scale.set(CELL * 0.22, 0.17, CELL * 0.22);
    top.position.set(-0.01, 0.44, 0.02);
    top.rotation.set(0.1, 0.4, 0.2);
    top.castShadow = true;
    group.add(top);

    // a little crease on top of the wall
    const crease = new THREE.Mesh(this.boxGeo, this.materials.paperDeep);
    crease.scale.set(CELL * 0.6, 0.024, 0.035);
    crease.position.set(0, 0.405, 0.03);
    crease.rotation.y = 0.55;
    group.add(crease);
    return group;
  }

  buildStar(theme) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(this.starGeo, this.materials.gold);
    mesh.scale.setScalar(0.78);
    mesh.castShadow = true;
    group.add(mesh);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: theme.palette.glow,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.scale.setScalar(0.62);
    group.add(glow);
    group.userData.mesh = mesh;
    group.userData.glow = glow;
    return group;
  }

  buildGoal(theme) {
    const group = new THREE.Group();
    const ringMat = this.materials.gold.clone();
    ringMat.emissive.set(theme.palette.glow);
    ringMat.emissiveIntensity = 0.75;
    const ring = new THREE.Mesh(this.ringGeo, ringMat);
    ring.position.y = 0.5;
    ring.castShadow = true;
    group.add(ring);

    const inner = new THREE.Mesh(
      this.glowDiscGeo,
      new THREE.MeshBasicMaterial({
        color: theme.palette.glow,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    inner.position.y = 0.5;
    group.add(inner);

    const pedestal = new THREE.Mesh(this.cylGeo, this.materials.paperDeep);
    pedestal.scale.set(0.31, 0.12, 0.31);
    pedestal.position.y = 0.09;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    const topStar = new THREE.Mesh(this.starGeo, this.materials.gold);
    topStar.scale.setScalar(0.32);
    topStar.position.y = 0.5;
    group.add(topStar);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: theme.palette.glow,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    glow.scale.setScalar(0.78);
    glow.position.y = 0.5;
    group.add(glow);

    group.userData.ring = ring;
    group.userData.topStar = topStar;
    group.userData.inner = inner;
    group.userData.glow = glow;
    group.userData.phase = 0.4;
    return group;
  }

  buildEnemy(theme) {
    const group = new THREE.Group();
    const blob = new THREE.Mesh(this.icoGeo, this.materials.ink);
    blob.scale.set(0.25, 0.3, 0.25);
    blob.rotation.set(0.2, 0.4, 0.1);
    blob.castShadow = true;
    group.add(blob);

    const eyeMat = new THREE.MeshBasicMaterial({ color: theme.dark ? 0xf2c35b : 0xd85c3a });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(this.sphereGeo, eyeMat);
      eye.scale.setScalar(0.032);
      eye.position.set(side * 0.075, 0.07, 0.21);
      group.add(eye);
    }
    for (let i = 0; i < 3; i += 1) {
      const spike = new THREE.Mesh(this.cone4Geo, this.materials.ink);
      spike.scale.set(0.06, 0.22, 0.06);
      spike.position.set((i - 1) * 0.13, 0.25, -0.08);
      spike.rotation.set(0.4, 0, (i - 1) * 0.55);
      group.add(spike);
    }
    const shadow = new THREE.Mesh(this.planeGeo, new THREE.MeshBasicMaterial({
      map: this.blobTex, transparent: true, opacity: 0.3, depthWrite: false,
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.27;
    shadow.scale.setScalar(0.95);
    group.add(shadow);
    group.userData.blob = blob;
    return group;
  }

  buildPlayer(skin, theme) {
    const group = new THREE.Group();
    const parts = {};
    const bodyMat = new THREE.MeshStandardMaterial({
      color: skin.body,
      map: this.paperTex,
      bumpMap: this.bumpTex,
      bumpScale: 0.01,
      roughness: 0.88,
      flatShading: true,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: skin.accent,
      map: this.paperTex,
      roughness: 0.9,
      flatShading: true,
    });
    const accent2Mat = new THREE.MeshStandardMaterial({
      color: skin.accent2,
      roughness: 0.88,
      flatShading: true,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: skin.eyes });

    const add = (geo, mat, scale, pos, rot = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };

    if (skin.kind === 'hare') {
      parts.body = add(this.octaGeo, bodyMat, [0.26, 0.31, 0.29], [0, 0.38, 0]);
      parts.head = add(this.octaGeo, bodyMat, [0.2, 0.2, 0.19], [0, 0.68, 0.05]);
      parts.earL = add(this.cone4Geo, accentMat, [0.075, 0.42, 0.075], [-0.1, 0.93, 0.02], [0.08, 0, -0.18]);
      parts.earR = add(this.cone4Geo, accentMat, [0.075, 0.42, 0.075], [0.1, 0.93, 0.02], [0.08, 0, 0.18]);
      add(this.icoGeo, accent2Mat, [0.1, 0.1, 0.1], [0, 0.37, -0.25]);
    } else if (skin.kind === 'crane') {
      parts.body = add(this.octaGeo, bodyMat, [0.27, 0.24, 0.34], [0, 0.4, 0]);
      parts.head = add(this.octaGeo, bodyMat, [0.14, 0.14, 0.14], [0, 0.7, 0.12]);
      parts.neck = add(this.cylGeo, bodyMat, [0.035, 0.2, 0.035], [0, 0.59, 0.08], [0.15, 0, 0]);
      parts.beak = add(this.cone4Geo, accentMat, [0.035, 0.22, 0.035], [0, 0.7, 0.26], [Math.PI / 2, 0, 0]);
      parts.wingL = add(this.octaGeo, accent2Mat, [0.035, 0.12, 0.3], [-0.24, 0.47, -0.02], [0, 0.15, -0.4]);
      parts.wingR = add(this.octaGeo, accent2Mat, [0.035, 0.12, 0.3], [0.24, 0.47, -0.02], [0, -0.15, 0.4]);
      add(this.cone4Geo, accentMat, [0.045, 0.26, 0.045], [0, 0.31, -0.31], [1.2, 0, 0]);
      add(this.cylGeo, accentMat, [0.02, 0.3, 0.02], [-0.06, 0.14, 0], [0, 0, 0]);
      add(this.cylGeo, accentMat, [0.02, 0.3, 0.02], [0.06, 0.14, 0], [0, 0, 0]);
    } else if (skin.kind === 'koi') {
      parts.body = add(this.octaGeo, bodyMat, [0.24, 0.3, 0.4], [0, 0.4, 0]);
      parts.head = add(this.octaGeo, bodyMat, [0.19, 0.17, 0.17], [0, 0.6, 0.2]);
      parts.tail = add(this.cone4Geo, accentMat, [0.2, 0.35, 0.035], [0, 0.37, -0.4], [Math.PI / 2, 0, 0]);
      add(this.cone4Geo, accent2Mat, [0.11, 0.22, 0.03], [-0.28, 0.4, -0.08], [0, 0, 0.9]);
      add(this.cone4Geo, accent2Mat, [0.11, 0.22, 0.03], [0.28, 0.4, -0.08], [0, 0, -0.9]);
      add(this.icoGeo, accentMat, [0.09, 0.06, 0.12], [0, 0.68, 0.25]);
    } else {
      parts.body = add(this.octaGeo, bodyMat, [0.25, 0.28, 0.29], [0, 0.37, 0]);
      parts.head = add(this.octaGeo, bodyMat, [0.19, 0.18, 0.18], [0, 0.64, 0.06]);
      parts.earL = add(this.cone4Geo, accentMat, [0.075, 0.22, 0.075], [-0.11, 0.84, 0.02], [0.05, 0, -0.2]);
      parts.earR = add(this.cone4Geo, accentMat, [0.075, 0.22, 0.075], [0.11, 0.84, 0.02], [0.05, 0, 0.2]);
      parts.tail = add(this.cone4Geo, accentMat, [0.1, 0.4, 0.1], [0, 0.36, -0.28], [-0.95, 0, 0]);
      add(this.cone4Geo, bodyMat, [0.085, 0.13, 0.085], [0, 0.6, 0.19], [Math.PI / 2, 0, 0]);
      add(this.icoGeo, accent2Mat, [0.09, 0.05, 0.06], [0, 0.36, 0.2]);
    }

    for (const side of [-1, 1]) {
      add(this.sphereGeo, eyeMat, [0.019, 0.021, 0.012], [side * 0.065, 0.67, 0.21]);
    }
    for (const side of [-1, 1]) {
      add(this.boxGeo, accentMat, [0.07, 0.09, 0.12], [side * 0.11, 0.09, 0.08]);
    }

    // a tiny paper shadow
    const shadow = new THREE.Mesh(this.planeGeo, new THREE.MeshBasicMaterial({
      map: this.blobTex, transparent: true, opacity: 0.38, depthWrite: false,
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    shadow.scale.setScalar(1.0);
    group.add(shadow);

    group.scale.setScalar(1.14);

    group.userData.baseRot = 0;
    group.userData.parts = parts;
    group.userData.mats = { bodyMat, accentMat, accent2Mat, eyeMat };
    group.userData.kind = skin.kind;
    group.userData.skin = skin;
    return group;
  }

  disposePlayer() {
    if (!this.player) return;
    const mats = this.player.userData.mats;
    if (mats) Object.values(mats).forEach((m) => m.dispose());
  }

  buildDust(theme) {
    if (this.reducedMotion) return;
    const rand = seeded(this.W * 19 + this.H * 31);
    const count = this.quality === 'lite' ? 22 : 48;
    const positions = new Float32Array(count * 3);
    const speeds = [];
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (rand() - 0.5) * (this.W + 1.8) * CELL;
      positions[i * 3 + 1] = 0.2 + rand() * 4.2;
      positions[i * 3 + 2] = (rand() - 0.5) * (this.H + 1.8) * CELL;
      speeds.push({ y: 0.04 + rand() * 0.08, phase: rand() * 10 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: theme.palette.glow,
      size: 0.045,
      map: this.glowTex,
      transparent: true,
      opacity: theme.dark ? 0.55 : 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const dust = new THREE.Points(geo, mat);
    dust.userData.speeds = speeds;
    dust.userData.base = positions.slice();
    this.levelRoot.add(dust);
    this.ambientDust = dust;
  }

  buildMenuSun(theme, quiet = false) {
    if (!quiet) return;
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex,
      color: theme.palette.glow,
      transparent: true,
      opacity: theme.dark ? 0.45 : 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sun.scale.setScalar(theme.dark ? 7 : 5.5);
    sun.position.set(-5.5, 4.5, -6);
    this.levelRoot.add(sun);
  }

  addLevelProps(theme, levelId) {
    const rand = seeded((levelId || 1) * 913);
    const worldId = theme.id;
    const halfW = (this.W * CELL) / 2;
    const halfD = (this.H * CELL) / 2;
    const spots = [];
    const count = this.quality === 'lite' ? 7 : 12;
    for (let i = 0; i < count; i += 1) {
      const side = i % 4;
      let x = 0;
      let z = 0;
      if (side === 0) { x = -halfW - 0.55 - rand() * 0.8; z = (rand() - 0.5) * this.H * CELL; }
      if (side === 1) { x = halfW + 0.55 + rand() * 0.8; z = (rand() - 0.5) * this.H * CELL; }
      if (side === 2) { x = (rand() - 0.5) * this.W * CELL; z = -halfD - 0.55 - rand() * 0.8; }
      if (side === 3) { x = (rand() - 0.5) * this.W * CELL; z = halfD + 0.55 + rand() * 0.8; }
      spots.push({ x, z, rand: rand() });
    }

    for (const spot of spots) {
      const scale = 0.7 + spot.rand * 0.6;
      let prop = null;
      if (worldId === 'forest') prop = this.propPine(theme, scale);
      else if (worldId === 'frozen') prop = this.propCrystal(theme, scale);
      else if (worldId === 'city') prop = this.propBuilding(theme, scale);
      else if (worldId === 'floating') prop = this.propCloud(theme, scale);
      else prop = this.propShard(theme, scale);
      if (!prop) continue;
      prop.position.set(spot.x, -0.18, spot.z);
      prop.rotation.y = spot.rand * Math.PI * 2;
      this.levelRoot.add(prop);
    }

    if (worldId === 'cosmic') {
      const rand2 = seeded((levelId || 1) * 77);
      for (let i = 0; i < 12; i += 1) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.glowTex,
          color: i % 3 === 0 ? theme.palette.glow : theme.palette.accentSoft,
          transparent: true,
          opacity: 0.4 + rand2() * 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }));
        s.scale.setScalar(0.16 + rand2() * 0.4);
        s.position.set((rand2() - 0.5) * 13, 2.5 + rand2() * 5, (rand2() - 0.5) * 12 - 2);
        this.levelRoot.add(s);
      }
    }
  }

  propPine(theme, scale) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(this.cylGeo, this.materials.wall);
    trunk.scale.set(0.045, 0.34, 0.045);
    trunk.position.y = 0.17;
    trunk.castShadow = true;
    group.add(trunk);
    const mats = [this.materials.accent, this.materials.accentSoft, this.materials.accent];
    const sizes = [[0.3, 0.4], [0.23, 0.36], [0.16, 0.3]];
    let y = 0.28;
    sizes.forEach(([radius, height], i) => {
      const cone = new THREE.Mesh(this.cone5Geo, mats[i]);
      cone.scale.set(radius * scale, height * scale, radius * scale);
      cone.position.y = y + (height * scale) / 2;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
      y += height * scale * 0.5;
    });
    group.scale.setScalar(0.95);
    return group;
  }

  propCrystal(theme, scale) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: theme.palette.accentSoft,
      map: this.paperTex,
      roughness: 0.35,
      metalness: 0.1,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
    });
    const shards = [
      [0, 0.36, 0, 0.12, 0.75, 0.12, 0.06],
      [0.18, 0.22, 0.06, 0.08, 0.46, 0.08, -0.3],
      [-0.15, 0.19, -0.05, 0.07, 0.4, 0.07, 0.35],
    ];
    shards.forEach(([x, y, z, sx, sy, sz, tilt], i) => {
      const shard = new THREE.Mesh(this.cone5Geo, i === 1 ? this.materials.white : mat);
      shard.scale.set(sx * scale, sy * scale, sz * scale);
      shard.position.set(x, y, z);
      shard.rotation.z = tilt;
      shard.castShadow = true;
      group.add(shard);
    });
    return group;
  }

  propBuilding(theme, scale) {
    const group = new THREE.Group();
    const h = (0.7 + scale * 0.45);
    const bodyMat = scale > 0.9 ? this.materials.paperDeep : this.materials.wall;
    const body = new THREE.Mesh(this.boxGeo, bodyMat);
    body.scale.set(0.36, h, 0.34);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(this.cone4Geo, this.materials.accent);
    roof.scale.set(0.31, 0.24, 0.3);
    roof.position.y = h + 0.1;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const windowMat = new THREE.MeshBasicMaterial({ color: theme.palette.glow });
    for (let i = 0; i < 2; i += 1) {
      const win = new THREE.Mesh(this.planeGeo, windowMat);
      win.scale.set(0.07, 0.1, 1);
      win.position.set(-0.06 + i * 0.12, h * 0.55, 0.176);
      group.add(win);
    }
    return group;
  }

  propCloud(theme, scale) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: theme.palette.cloud,
      roughness: 1,
      flatShading: false,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = 0; i < 4; i += 1) {
      const puff = new THREE.Mesh(this.icoGeo, mat);
      const s = (0.18 + (i % 3) * 0.08) * scale;
      puff.scale.set(s * 1.4, s * 0.7, s);
      puff.position.set((i - 1.5) * 0.2 * scale, 0.1 + (i % 2) * 0.06, (i % 2 - 0.5) * 0.12);
      group.add(puff);
    }
    return group;
  }

  propShard(theme, scale) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: theme.palette.accent,
      map: this.paperTex,
      roughness: 0.7,
      flatShading: true,
      emissive: theme.palette.accentDeep,
      emissiveIntensity: 0.3,
    });
    const shard = new THREE.Mesh(this.octaGeo, mat);
    shard.scale.set(0.22 * scale, 0.55 * scale, 0.16 * scale);
    shard.position.y = 0.4 * scale;
    shard.rotation.z = 0.18;
    shard.castShadow = true;
    group.add(shard);
    const cap = new THREE.Mesh(this.cone4Geo, this.materials.gold);
    cap.scale.set(0.08, 0.18, 0.08);
    cap.position.y = 0.78 * scale;
    group.add(cap);
    return group;
  }

  buildMenu(theme, skin, save, progress) {
    this.mode = 'menu';
    this.setTheme(theme);
    this.clearLevel();
    this.W = 7;
    this.H = 6;
    this.resize();
    this.root.position.x = (this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight)) > 1.08 ? 1.9 : 0;
    this.root.position.y = (this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight)) > 1.08 ? -0.2 : 0.15;

    const cells = [
      [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
      [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
      [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
      [2, 3], [4, 3],
      [2, 4], [3, 4], [4, 4],
    ];
    const unique = [...new Set(cells.map((c) => c.join(',')))].map((c) => c.split(',').map(Number));
    const boardW = 7 * CELL;
    const boardD = 6 * CELL;
    this.menuRoot.add(this.makeBase(boardW + 1.4, boardD + 1.5, { floating: true }));

    for (const [x, z] of unique) {
      const group = this.buildCell(x - 3.5 + 3.5, z - 2.5 + 2.5, 1, theme);
      // reposition using the menu's own 7x6 coordinate frame
      group.position.set((x - 3) * CELL, 0.07, (z - 2.5) * CELL);
      this.menuRoot.add(group);
    }

    // a few raised paper steps for silhouette
    const step = new THREE.Group();
    const stepTile = new THREE.Mesh(this.tileGeo, this.materials.floor[1]);
    stepTile.receiveShadow = true;
    stepTile.castShadow = true;
    step.add(stepTile);
    step.position.set(0.1, 0.38, -1.95);
    this.menuRoot.add(step);

    const props = [
      this.propPine(theme, 1.1), this.propPine(theme, 0.8),
      this.propPine(theme, 1.25), this.propPine(theme, 0.7),
    ];
    if (theme.id === 'frozen') props.splice(0, 4, this.propCrystal(theme, 1.2), this.propCrystal(theme, 0.8), this.propCrystal(theme, 1), this.propCrystal(theme, 0.7));
    if (theme.id === 'city') props.splice(0, 4, this.propBuilding(theme, 1.2), this.propBuilding(theme, 0.8), this.propBuilding(theme, 1), this.propBuilding(theme, 0.7));
    if (theme.id === 'floating') props.splice(0, 4, this.propCloud(theme, 1.3), this.propCloud(theme, 0.9), this.propCloud(theme, 1.1), this.propCloud(theme, 0.8));
    if (theme.id === 'cosmic') props.splice(0, 4, this.propShard(theme, 1.3), this.propShard(theme, 0.9), this.propShard(theme, 1.1), this.propShard(theme, 0.8));
    const positions = [[-3.3, -0.2, -2.6], [2.9, -0.15, -2.3], [-3.6, -0.1, 1.8], [3.5, -0.15, 1.7]];
    props.forEach((prop, i) => {
      prop.position.set(...positions[i]);
      prop.rotation.y = i * 1.4;
      this.menuRoot.add(prop);
    });

    // a decorative arch at the back
    const goal = this.buildGoal(theme);
    goal.position.set(0.1, 0.44, -1.95);
    this.menuRoot.add(goal);
    this.goalGroup = goal;
    this.goalLight.position.set(0.1, 1.4, -1.95);

    // player
    this.player = this.buildPlayer(skin, theme);
    this.player.position.set(0.65, 0.07, 1.0);
    this.player.rotation.y = 0;
    this.menuRoot.add(this.player);
    this.playerParts = this.player.userData.parts;

    // floating stars
    for (let i = 0; i < 3; i += 1) {
      const star = this.buildStar(theme);
      star.position.set(-1.9 + i * 1.5, 1.1 + i * 0.25, 1.6 - i * 0.4);
      star.userData.baseY = star.position.y;
      star.userData.phase = i * 2.2;
      this.menuRoot.add(star);
      this.starGroups.set(`menu${i}`, star);
    }

    // dust + little paper leaves
    this.buildDust(theme);
    this.addMenuLeaves(theme);
    this.buildMenuSun(theme, true);

    this.menuFocus.set(0, 0.5, 0);
    this.setCameraForMenu();
    this.root.position.x = (this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight)) > 1.08 ? 1.9 : 0;
  }

  addMenuLeaves(theme) {
    const rand = seeded(99);
    const count = this.quality === 'lite' ? 10 : 22;
    for (let i = 0; i < count; i += 1) {
      const leaf = new THREE.Mesh(this.cornerGeo, i % 2 ? this.materials.accentSoft : this.materials.gold);
      leaf.scale.setScalar(0.35 + rand() * 0.4);
      leaf.position.set((rand() - 0.5) * 12, 1.2 + rand() * 4.2, (rand() - 0.5) * 9 - 1);
      leaf.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      leaf.userData.drift = 0.2 + rand() * 0.4;
      leaf.userData.phase = rand() * 6;
      leaf.userData.base = leaf.position.clone();
      this.menuRoot.add(leaf);
    }
  }

  setCameraForMenu() {
    const aspect = (this.canvas.clientWidth || window.innerWidth) / Math.max(1, this.canvas.clientHeight || window.innerHeight);
    let viewHeight = Math.max(10.2, (7.5 + 1.8) / aspect, 11.0);
    if (aspect > 1.2) viewHeight = Math.max(10.8, 10.5 / aspect + 2.0, 10.4);
    this.camera.left = (-viewHeight * aspect) / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.position.set(0, CAMERA_DISTANCE * Math.sin(ELEVATION), CAMERA_DISTANCE * Math.cos(ELEVATION));
    this.camera.lookAt(0, 0.9, 0);
    this.camera.updateProjectionMatrix();
  }

  screenToGround(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.07);
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, point)) return null;
    return { point, cell: this.cellFromWorld(point) };
  }

  beginFold(plan, state, axis, k, side) {
    this.disposePivot();
    const pivot = new THREE.Group();
    if (axis === 'x') pivot.position.set(this.creaseWorldX(k), 0, 0);
    else pivot.position.set(0, 0, this.creaseWorldZ(k));
    this.levelRoot.add(pivot);

    const attached = [];
    for (const cell of plan.sources) {
      const group = this.cells.get(`${cell.x},${cell.z}`);
      if (group) {
        pivot.attach(group);
        attached.push(group);
      }
    }

    const playerOnFlap = axis === 'x'
      ? (side < 0 ? state.player.x < k : state.player.x >= k)
      : (side < 0 ? state.player.z < k : state.player.z >= k);
    if (this.player && playerOnFlap) {
      pivot.attach(this.player);
      attached.push(this.player);
    }

    // stars ride the folded page as well
    for (const [starKey, starGroup] of this.starGroups) {
      const [sx, sz] = starKey.split(',').map(Number);
      const onFlap = axis === 'x'
        ? (side < 0 ? sx < k : sx >= k)
        : (side < 0 ? sz < k : sz >= k);
      if (onFlap) {
        pivot.attach(starGroup);
        attached.push(starGroup);
      }
    }

    if (this.goalGroup) {
      const gx = state.goal.x;
      const gz = state.goal.z;
      const onFlap = axis === 'x'
        ? (side < 0 ? gx < k : gx >= k)
        : (side < 0 ? gz < k : gz >= k);
      if (onFlap) {
        pivot.attach(this.goalGroup);
        attached.push(this.goalGroup);
      }
    }

    for (const enemyGroup of this.enemyGroups) {
      const enemy = state.enemies[enemyGroup.userData.index];
      if (!enemy) continue;
      const cell = enemy.route[enemy.idx];
      if (!cell) continue;
      const onFlap = axis === 'x'
        ? (side < 0 ? cell.x < k : cell.x >= k)
        : (side < 0 ? cell.z < k : cell.z >= k);
      if (onFlap) {
        pivot.attach(enemyGroup);
        attached.push(enemyGroup);
      }
    }

    // crease line
    const length = axis === 'x' ? (this.H + 1) * CELL : (this.W + 1) * CELL;
    const mat = new THREE.MeshBasicMaterial({
      color: this.theme.palette.glow,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const creaseGeo = axis === 'x'
      ? new THREE.BoxGeometry(0.055, 0.025, length)
      : new THREE.BoxGeometry(length, 0.025, 0.055);
    const crease = new THREE.Mesh(creaseGeo, mat);
    if (axis === 'x') crease.position.set(this.creaseWorldX(k), 0.14, 0);
    else crease.position.set(0, 0.14, this.creaseWorldZ(k));
    this.levelRoot.add(crease);

    // a single backing sheet makes the whole folded half read as one page
    const flapW = axis === 'x' ? plan.foldedLen * CELL : this.W * CELL;
    const flapD = axis === 'x' ? this.H * CELL : plan.foldedLen * CELL;
    const geoKey = `${flapW.toFixed(2)}x${flapD.toFixed(2)}`;
    let flapGeo = this.flapGeoCache.get(geoKey);
    if (!flapGeo) {
      flapGeo = new THREE.BoxGeometry(flapW * 0.985, 0.045, flapD * 0.985);
      this.flapGeoCache.set(geoKey, flapGeo);
    }
    const sheet = new THREE.Mesh(flapGeo, this.materials.flap);
    const offset = (plan.foldedLen * CELL) / 2;
    if (axis === 'x') sheet.position.set(side < 0 ? -offset : offset, -0.08, 0);
    else sheet.position.set(0, -0.08, side < 0 ? -offset : offset);
    sheet.receiveShadow = true;
    pivot.add(sheet);

    this.pivot = pivot;
    this.creaseMesh = crease;
    this.pivotAxis = axis;
    this.pivotSide = side;
    this.pivotAttached = attached;
    this.pivotFlattenables = attached.concat(sheet);
    return pivot;
  }

  setFoldProgress(progress, axis, side) {
    if (!this.pivot) return;
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const angle = -side * p * Math.PI;
    if (axis === 'x') this.pivot.rotation.z = side * p * Math.PI;
    else this.pivot.rotation.x = angle;
    const flatten = 1 - 0.94 * Math.min(1, p * 1.08);
    for (const group of this.pivotFlattenables) group.scale.y = Math.max(0.05, flatten);
    if (this.creaseMesh) {
      this.creaseMesh.material.opacity = 0.45 + Math.sin(p * Math.PI) * 0.55;
      this.creaseMesh.material.color.set(p > 0.82 ? '#fff3bf' : this.theme.palette.glow);
    }
  }

  cancelFoldProgress() {
    if (!this.pivot) return;
    this.pivot.rotation.set(0, 0, 0);
    for (const group of this.pivotFlattenables) group.scale.y = 1;
  }

  endFold(restore = false) {
    this.disposePivot(restore);
  }

  updateStarCollection(starKey, onDone) {
    const group = this.starGroups.get(starKey);
    if (!group) {
      onDone?.();
      return;
    }
    this.starGroups.delete(starKey);
    const start = performance.now();
    const base = group.position.clone();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / 300);
      const e = easeOutCubic(t);
      group.scale.setScalar(1 - e);
      group.position.y = base.y + e * 0.6;
      group.rotation.y += 0.3;
      if (t < 1) requestAnimationFrame(tick);
      else {
        group.parent?.remove(group);
        onDone?.();
      }
    };
    requestAnimationFrame(tick);
  }

  burst(x, z, color, count = 18, y = 0.35) {
    if (this.reducedMotion) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const rand = Math.random;
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(this.cornerGeo, mat.clone());
      mesh.scale.setScalar(0.12 + rand() * 0.2);
      mesh.position.set(this.worldX(x) + (rand() - 0.5) * 0.3, y, this.worldZ(z) + (rand() - 0.5) * 0.3);
      mesh.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      const angle = rand() * Math.PI * 2;
      const speed = 0.8 + rand() * 2.3;
      mesh.userData.v = new THREE.Vector3(Math.cos(angle) * speed, 1.4 + rand() * 2.3, Math.sin(angle) * speed);
      mesh.userData.spin = new THREE.Vector3((rand() - 0.5) * 8, (rand() - 0.5) * 8, (rand() - 0.5) * 8);
      mesh.userData.life = 0.8 + rand() * 0.5;
      mesh.userData.age = 0;
      this.fxRoot.add(mesh);
      this.particles.push(mesh);
    }
  }

  winBurst(x, z, theme) {
    this.burst(x, z, theme.palette.glow, 34, 0.5);
    this.burst(x, z, theme.palette.accentSoft, 20, 0.4);
  }

  updateEnemyTargets(state) {
    this.enemyGroups.forEach((group) => {
      const enemy = state.enemies[group.userData.index];
      if (!enemy) {
        group.visible = false;
        return;
      }
      group.visible = true;
      const cell = enemy.route[enemy.idx];
      if (cell) group.userData.target.set(this.worldX(cell.x), 0.32, this.worldZ(cell.z));
    });
  }

  update(dt, time) {
    this.time = time;
    const reduced = this.reducedMotion;

    if (this.ambientDust && this.ambientDust.userData.base) {
      const pos = this.ambientDust.geometry.attributes.position;
      const base = this.ambientDust.userData.base;
      const speeds = this.ambientDust.userData.speeds;
      for (let i = 0; i < speeds.length; i += 1) {
        pos.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(time * speeds[i].y * 8 + speeds[i].phase) * 0.1 + ((time * speeds[i].y * 0.3) % 0.4);
        pos.array[i * 3] = base[i * 3] + Math.sin(time * 0.15 + speeds[i].phase) * 0.08;
      }
      pos.needsUpdate = true;
    }

    if (!reduced && !this.pivot) {
      for (const [k, group] of this.starGroups) {
        const phase = group.userData.phase || 0;
        group.position.y = group.userData.baseY + Math.sin(time * 2.1 + phase) * 0.055;
        group.rotation.y = Math.sin(time * 0.75 + phase) * 0.38;
        const mesh = group.userData.mesh;
        if (mesh) mesh.rotation.z = Math.sin(time * 0.9 + phase) * 0.12;
      }
    }

    if (this.goalGroup && this.mode === 'level' && !this.pivot) {
      const ring = this.goalGroup.userData.ring;
      const star = this.goalGroup.userData.topStar;
      const glow = this.goalGroup.userData.glow;
      if (ring) ring.rotation.z = time * 0.35;
      if (star) {
        star.rotation.y = Math.sin(time * 0.6) * 0.45;
        star.rotation.z = Math.sin(time * 1.3) * 0.08;
      }
      if (glow) glow.material.opacity = 0.45 + Math.sin(time * 2.3) * 0.15;
      if (this.goalLight) this.goalLight.intensity = 0.7 + Math.sin(time * 2.3) * 0.18;
    }

    if (this.player && this.playerParts && !reduced) {
      const parts = this.playerParts;
      const bob = Math.sin(time * 2.4) * 0.015;
      const body = parts.body;
      if (body) body.position.y += (0 + bob) * 0;
      if (parts.tail) parts.tail.rotation.z = Math.sin(time * 2.2) * 0.12;
      if (parts.earL) parts.earL.rotation.z = -0.2 + Math.sin(time * 1.7) * 0.04;
      if (parts.earR) parts.earR.rotation.z = 0.2 - Math.sin(time * 1.7) * 0.04;
      if (parts.head) parts.head.rotation.y = Math.sin(time * 0.8) * 0.08;
    }

    for (const group of this.enemyGroups) {
      if (!group.visible) continue;
      group.position.lerp(group.userData.target, Math.min(1, dt * 6));
      group.position.y = group.userData.baseY + Math.sin(time * 3.2 + group.userData.index) * 0.04;
      if (group.userData.blob) {
        group.userData.blob.rotation.y += dt * 0.8;
        group.userData.blob.scale.y = 0.3 + Math.sin(time * 3.2 + group.userData.index) * 0.02;
      }
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.userData.age += dt;
      const life = p.userData.life;
      if (p.userData.age >= life) {
        p.parent?.remove(p);
        p.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.userData.v.y -= 5.2 * dt;
      p.position.addScaledVector(p.userData.v, dt);
      p.rotation.x += p.userData.spin.x * dt;
      p.rotation.y += p.userData.spin.y * dt;
      p.rotation.z += p.userData.spin.z * dt;
      p.material.opacity = Math.max(0, 1 - p.userData.age / life);
    }

    if (this.mode === 'menu') {
      const aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
      const sway = reduced ? 0 : 1;
      const camX = Math.sin(time * 0.13) * 0.45 * sway;
      const camY = Math.sin(time * 0.09 + 1.7) * 0.18 * sway;
      this.camera.position.set(camX, CAMERA_DISTANCE * Math.sin(ELEVATION) + camY, CAMERA_DISTANCE * Math.cos(ELEVATION));
      this.camera.lookAt(this.menuFocus.x + camX * 0.1, this.menuFocus.y, this.menuFocus.z);
      this.camera.updateMatrixWorld();
      this.root.position.x = aspect > 1.08 ? 1.9 : 0;
      this.root.position.y = aspect > 1.08 ? -0.2 : 0.15;
      for (const leaf of this.menuRoot.children) {
        if (!leaf.userData.drift) continue;
        leaf.position.y = leaf.userData.base.y + Math.sin(time * 0.5 + leaf.userData.phase) * 0.3;
        leaf.rotation.x += dt * 0.18;
        leaf.rotation.z += dt * 0.1;
      }
      if (this.player && this.playerParts) {
        this.player.rotation.y = Math.sin(time * 0.35) * 0.15;
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getRendererInfo() {
    try {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    } catch {
      return '';
    }
  }
}
