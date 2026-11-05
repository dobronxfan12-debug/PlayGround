// ---------------------------------------------------------------------------
// THE LAST FOLD — game engine
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { LEVELS, cellsOnSide, cellKey } from './levels.js';
import { THEMES, PALETTES, SKINS, skinById } from './themes.js';
import * as P from './paper.js';

const UP = new THREE.Vector3(0, 1, 0);
const SNAP_ANGLES = [0, 45, 90, 135, 180];
const TMP = new THREE.Vector3();
const TMP2 = new THREE.Vector3();
const TMP_Q = new THREE.Quaternion();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export class FoldGame {
  constructor (canvas, sound, options = {}) {
    this.canvas = canvas;
    this.sound = sound;
    this.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 760;
    this.reducedMotion = !!options.reducedMotion;
    this.skinId = options.skin || 'pip';
    this.skin = skinById(this.skinId);
    this.events = {};
    this.mode = 'menu';
    this.paused = false;
    this.completed = false;
    this.levelIndex = 0;
    this.level = null;
    this.theme = THEMES.forest;
    this.levelBounds = null;
    this.time = 0;
    this.elapsed = 0;
    this.clock = new THREE.Clock();
    this.resizeTimer = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isMobile,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.75 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 200;
    this.pointer = new THREE.Vector2();
    this.pointerState = null;

    this.keys = new Set();
    this.joy = { x: 0, y: 0, active: false };
    this.touchMove = { x: 0, y: 0 };

    this.groundMeshes = [];
    this.paperMeshes = [];
    this.panels = [];
    this.folds = [];
    this.stars = [];
    this.enemies = [];
    this.motes = [];
    this.clouds = [];
    this.cranes = [];
    this.paperBits = [];
    this.sparkBursts = [];
    this.hintGuide = null;
    this.previewGuide = null;
    this.pendingCrease = null;
    this.fold = null;
    this.freeze = 0;
    this.invuln = 0;
    this.completedTimer = 0;
    this.trappedTimer = 0;

    this._bindInput();
    this._buildMenuScene();
    this._onResize();
    window.addEventListener('resize', () => this._onResize());
    this.renderer.setAnimationLoop(() => this._tick());
  }

  on (event, fn) {
    (this.events[event] ||= []).push(fn);
    return this;
  }

  emit (event, data) {
    const list = this.events[event];
    if (list) for (const fn of list) fn(data);
  }

  // =========================================================================
  // Menu scene
  // =========================================================================
  _buildMenuScene () {
    if (this.menuScene) this._disposeScene(this.menuScene);
    const theme = THEMES.forest;
    const scene = new THREE.Scene();
    scene.background = P.createSky(theme);
    const lights = P.addEnvironmentLighting(scene, theme);
    lights.sun.shadow.mapSize.set(2048, 2048);
    scene.fog = new THREE.Fog(theme.fog, 22, 46);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
    this.menuScene = scene;
    this.menuCamera = camera;
    this.menuTarget = new THREE.Vector3(0, 1.45, 0);

    // foreground floating island
    const island = P.createIsland(theme, 3.25, 0.55);
    island.position.set(0, 0, 0);
    scene.add(island);

    // a tall folded-paper mountain to give the menu a silhouette
    const mountain = new THREE.Group();
    const paper = P.solidMaterial(theme);
    const peakA = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.3, 4), paper);
    peakA.position.set(-0.6, -0.1, -2.4);
    peakA.rotation.y = Math.PI / 4;
    peakA.scale.z = 0.6;
    peakA.castShadow = true;
    peakA.receiveShadow = true;
    const peakB = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.8, 4), paper);
    peakB.position.set(1.7, -0.15, -2.8);
    peakB.rotation.y = Math.PI / 4 + 0.3;
    peakB.scale.z = 0.55;
    peakB.castShadow = true;
    mountain.add(peakA, peakB);
    scene.add(mountain);
    this.menuMountain = mountain;

    // props at the rim, leaving the middle clear for Pip
    const props = [
      ['tree', -2.25, -0.7, 1.0, 0.2],
      ['tree', -1.8, 1.6, 0.85, 2.4],
      ['tree', 2.15, 1.1, 0.92, 3.8],
      ['mushroom', 1.9, -1.2, 0.8, 0],
      ['rock', -2.6, 0.9, 0.9, 1.2],
      ['grass', 1.2, 1.9, 0.9, 0.8],
      ['grass', -1.0, -1.75, 0.8, 2.1],
      ['mushroom', -2.0, -1.85, 0.65, 1.9],
      ['rock', 2.7, -0.1, 0.65, 0.3],
    ];
    this.menuProps = [];
    for (const [type, x, z, s, r] of props) {
      const prop = P.createProp(type, theme, s);
      prop.position.set(x, 0, z);
      prop.rotation.y = r;
      scene.add(prop);
      this.menuProps.push({ obj: prop, baseY: 0 });
    }

    // floating islands above and behind
    const floaters = [
      { x: -3.6, y: 1.85, z: -1.3, r: 0.85, prop: 'tree' },
      { x: 3.7, y: 2.55, z: -1.7, r: 0.68, prop: 'grass' },
      { x: 4.0, y: 0.95, z: 0.9, r: 0.48, prop: 'rock' },
      { x: -4.2, y: 0.55, z: 0.6, r: 0.4, prop: 'mushroom' },
    ];
    this.menuFloaters = [];
    for (const f of floaters) {
      const isl = P.createIsland(theme, f.r, 0.2);
      isl.position.set(f.x, f.y, f.z);
      const prop = P.createProp(f.prop, theme, 0.45);
      prop.position.set(f.x + 0.1, f.y, f.z);
      scene.add(isl, prop);
      this.menuFloaters.push({ isl, prop, baseY: f.y, phase: Math.random() * 6 });
    }

    // Pip, the paper fox
    const fox = P.createPlayer(this.skin);
    fox.position.set(0.7, 0.02, 1.1);
    fox.rotation.y = -2.2;
    fox.scale.setScalar(1.18);
    scene.add(fox);
    this.menuFox = fox;

    // golden star and glowing seal
    const star = P.createStar();
    star.position.set(-0.4, 1.85, 1.6);
    scene.add(star);
    this.menuStar = star;

    const seal = P.createExitSeal(theme);
    seal.position.set(-1.35, 0.02, 1.55);
    seal.rotation.y = 0.4;
    scene.add(seal);
    this.menuSeal = seal;

    // cranes
    this.menuCranes = [];
    for (let i = 0; i < 4; i++) {
      const crane = P.createCrane(theme);
      crane.position.set((i - 1.5) * 1.8, 1.8 + i * 0.35, -1 + i * 0.4);
      crane.scale.setScalar(0.8 + i * 0.14);
      scene.add(crane);
      this.menuCranes.push({ obj: crane, phase: Math.random() * 7, radius: 1.2 + Math.random() * 1.4, speed: 0.1 + Math.random() * 0.08 });
    }

    // clouds
    this.menuClouds = [];
    for (let i = 0; i < 5; i++) {
      const cloud = P.createCloud(0.8 + Math.random() * 0.8, 0.5);
      cloud.position.set((i - 2) * 3.2 + Math.random(), 0.1 + Math.random() * 2, -2.5 - Math.random() * 2);
      scene.add(cloud);
      this.menuClouds.push({ obj: cloud, baseX: cloud.position.x, speed: 0.05 + Math.random() * 0.05, phase: Math.random() * 6 });
    }

    // paper motes
    const motes = P.createParticles(this.isMobile ? 60 : 110, theme.motes, 0.055, [12, 6, 10], 0.5);
    motes.position.y = 0.4;
    scene.add(motes);
    this.menuMotes = motes;

    // a warm paper sun
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.glowTexture(), color: 0xffe9ba, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    sun.scale.setScalar(7.5);
    sun.position.set(-6.5, 6.5, -10);
    scene.add(sun);
    this.menuSun = sun;

    this._placeMenuCamera();
  }

  _placeMenuCamera () {
    if (!this.menuCamera) return;
    const aspect = this.width / this.height;
    this.menuCamera.aspect = aspect;
    const wide = this.width >= 900;
    // On wide screens the diorama sits to the right of the editorial hero;
    // on phones it stays centred behind the title.
    this.menuTarget.set(wide ? -2.25 : 0, 1.45, 0);
    // Keep the island readable on a phone while allowing a cropped, cosy composition.
    const dist = clamp(10.8 / Math.min(1, aspect * 1.15), 10.8, 20.5);
    const dir = new THREE.Vector3(0.72, 0.52, 1.0).normalize();
    const target = this.menuTarget;
    this.menuCamera.position.copy(target).addScaledVector(dir, dist);
    this.menuCamera.lookAt(target.x, target.y, target.z);
    this.menuCamera.updateProjectionMatrix();
  }

  // =========================================================================
  // Level lifecycle
  // =========================================================================
  startLevel (index, options = {}) {
    index = clamp(index, 0, LEVELS.length - 1);
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.theme = THEMES[this.level.theme];
    this.completed = false;
    this.completedTimer = 0;
    this.trappedTimer = 0;
    this.freeze = 0;
    this.invuln = 0;
    this.time = 0;
    this.foldsMade = 0;
    this.starCount = 0;
    this.totalStars = this.level.stars?.length || 0;
    this.pendingCrease = null;
    this.fold = null;
    this.pointerState = null;
    this.hintIndex = 0;
    this.mode = 'game';
    this.paused = false;
    this.sound.setMood(this.level.theme);

    this._disposeLevel();
    const scene = new THREE.Scene();
    scene.background = P.createSky(this.theme);
    scene.fog = new THREE.Fog(this.theme.fog, 30, 68);
    this.scene = scene;
    const lights = P.addEnvironmentLighting(scene, this.theme);
    lights.sun.shadow.mapSize.set(this.isMobile ? 1024 : 2048, this.isMobile ? 1024 : 2048);
    lights.sun.shadow.camera.left = -14;
    lights.sun.shadow.camera.right = 14;
    lights.sun.shadow.camera.top = 14;
    lights.sun.shadow.camera.bottom = -14;
    this.lights = lights;
    this.worldGroup = new THREE.Group();
    scene.add(this.worldGroup);

    this.groundMeshes = [];
    this.paperMeshes = [];
    this.panels = [];
    this.folds = [];
    this.stars = [];
    this.enemies = [];
    this.motes = [];
    this.clouds = [];
    this.cranes = [];
    this.paperBits = [];
    this.sparkBursts = [];
    this.hintGuide = null;
    this.previewGuide = null;

    const world = this.level;
    const theme = this.theme;

    // --- paper sheets ------------------------------------------------------
    this.sheetPanels = [];
    world.sheets.forEach((sheetData, i) => {
      const panel = {
        id: `sheet-${i}`,
        cells: sheetData.cells.slice(),
        bounds: { ...sheetData.bounds },
        y: sheetData.y,
        group: new THREE.Group(),
        mesh: null,
        foldable: sheetData.foldable !== false,
        folded: false,
        fold: null,
        sheetIndex: i,
        attachments: [],
        isSheet: true,
      };
      panel.group.position.y = sheetData.y;
      const mesh = P.createPanelMesh(panel, theme);
      panel.mesh = mesh;
      panel.group.add(mesh);
      this.worldGroup.add(panel.group);
      this.panels.push(panel);
      this.paperMeshes.push(mesh);
      this.groundMeshes.push(mesh);
      this.sheetPanels[i] = panel;
    });

    // --- static platforms --------------------------------------------------
    for (const plat of world.platforms || []) {
      const box = P.createPaperBox(plat.w, plat.thickness, plat.d, theme);
      box.position.set(plat.x, plat.top - plat.thickness / 2, plat.z);
      this.worldGroup.add(box);
      this.groundMeshes.push(box);
      const trim = new THREE.Mesh(
        new THREE.PlaneGeometry(plat.w + 0.04, plat.d + 0.04),
        new THREE.MeshBasicMaterial({ color: theme.paperEdge, transparent: true, opacity: 0.5 })
      );
      trim.rotation.x = -Math.PI / 2;
      trim.position.set(plat.x, plat.top + 0.002, plat.z);
      this.worldGroup.add(trim);
    }

    // --- paper columns and hanging supports --------------------------------
    for (const s of world.supports || []) {
      const length = Math.abs(s.top - s.bottom);
      const box = P.createPaperBox(s.w, length, s.w, theme);
      box.position.set(s.x, (s.top + s.bottom) / 2, s.z);
      box.rotation.y = s.rot || 0;
      this.worldGroup.add(box);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.w * 0.72, 0.035, 6, 14),
        new THREE.MeshStandardMaterial({ color: theme.accent2, metalness: 0.4, roughness: 0.5 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(s.x, s.top - 0.12, s.z);
      this.worldGroup.add(ring);
    }

    // --- exit --------------------------------------------------------------
    this.exit = null;
    if (world.exit) {
      const seal = P.createExitSeal(theme);
      this.worldGroup.add(seal);
      if (world.exit.sheet !== undefined) {
        const panel = this.sheetPanels[world.exit.sheet];
        const anchor = new THREE.Object3D();
        anchor.position.set(world.exit.x, 0.12, world.exit.z);
        panel.group.add(anchor);
        panel.attachments.push(anchor);
        seal.position.set(world.exit.x, panel.group.position.y + 0.12, world.exit.z);
        this.exit = { group: seal, anchor, baseY: 0, static: false };
      } else {
        seal.position.set(world.exit.x, world.exit.y + 0.01, world.exit.z);
        this.exit = { group: seal, anchor: null, baseY: world.exit.y + 0.01, static: true };
      }
    }

    // --- collectible stars -------------------------------------------------
    for (const s of world.stars || []) {
      const star = P.createStar(theme.star);
      this.worldGroup.add(star);
      let anchor = null;
      let baseY = s.y || 0;
      if (s.sheet !== undefined) {
        const panel = this.sheetPanels[s.sheet];
        anchor = new THREE.Object3D();
        anchor.position.set(s.x, s.bottom ? -0.24 : 0.55, s.z);
        panel.group.add(anchor);
        panel.attachments.push(anchor);
      } else {
        star.position.set(s.x, s.y, s.z);
      }
      this.stars.push({ group: star, anchor, baseY, collected: false, seed: Math.random() * 9, spin: Math.random() * 6 });
    }

    // --- enemies -----------------------------------------------------------
    for (const e of world.enemy || []) {
      const beetle = this._makeBeetle();
      beetle.position.set(e.x, e.y, e.z);
      this.worldGroup.add(beetle);
      this.enemies.push({ obj: beetle, ...e, phase: Math.random() * 6, base: e.x, dir: 1 });
    }

    // --- decorations -------------------------------------------------------
    this._buildDecor();
    this._buildAtmosphere();
    this._buildPlayer();
    this._computeBounds();
    this._frameLevel();

    this.mode = 'game';
    this.emit('levelstart', {
      index,
      level: this.level,
      totalStars: this.totalStars,
      tutorial: !!this.level.tutorial,
    });

    // immediately ground the player
    const g = this._groundAt(this.player.pos.x, this.player.pos.z, 4);
    if (g) {
      this.player.pos.y = g.y;
      this.player.groundY = g.y;
      this.player.grounded = true;
      if (g.mesh?.userData.panel) this.player.panel = g.mesh.userData.panel;
    }

    if (this.level.tutorial) {
      this.showHint(0, { auto: true });
      this.emit('tutorial', {
        title: 'The world is paper',
        text: 'Swipe along the glowing crease to begin.',
      });
      this.emit('toast', { text: 'Swipe along the dotted crease', duration: 3400 });
    } else {
      this.emit('tutorial', {
        title: this.level.name,
        text: 'Swipe a crease. Drag a side to fold the world.',
      });
    }
    this.emit('hud', { stars: 0, total: this.totalStars });
  }

  _disposeLevel () {
    this._stopFoldSound();
    if (this.scene) this._disposeScene(this.scene);
    this.scene = null;
    this.player = null;
    this.exit = null;
    this.hintGuide = null;
    this.previewGuide = null;
    this.creaseGuide = null;
    this.groundMeshes = [];
    this.paperMeshes = [];
    this.panels = [];
    this.folds = [];
    this.stars = [];
    this.enemies = [];
  }

  _disposeScene (scene) {
    if (!scene) return;
    scene.traverse(obj => {
      if (obj.geometry && !obj.geometry.userData?.shared) obj.geometry.dispose?.();
      if (obj.isSprite && obj.material?.map && !obj.material.map.userData?.shared) { /* shared glow texture */ }
    });
    if (scene.background && scene.background.isTexture) scene.background.dispose();
    scene.clear();
  }

  _buildDecor () {
    const world = this.level;
    const theme = this.theme;
    // edge decorations on each paper sheet, attached to the paper so they fold with it
    world.sheets.forEach((sheetData, si) => {
      const panel = this.sheetPanels[si];
      if (!panel) return;
      const hintLines = world.hints?.filter(h => h.sheet === si) || [];
      const random = mulberry(world.decorSeed * 17 + si * 101);
      const edge = new Set();
      for (const [i, j] of panel.cells) {
        const minI = sheetData.bounds.minX, maxI = sheetData.bounds.maxX - 1;
        const minJ = sheetData.bounds.minZ, maxJ = sheetData.bounds.maxZ - 1;
        if (i === minI || i === maxI || j === minJ || j === maxJ) edge.add(cellKey(i, j));
      }
      const candidates = [...edge].filter(key => {
        const [i, j] = key.split(',').map(Number);
        const cx = i + 0.5, cz = j + 0.5;
        if (Math.hypot(cx - world.player[0], cz - world.player[1]) < 1.35) return false;
        for (const h of hintLines) {
          const d = h.axis === 'x' ? Math.abs(cx - h.coord) : Math.abs(cz - h.coord);
          if (d < 1.0) return false;
        }
        for (const s of world.stars || []) {
          if (s.sheet === si && Math.hypot(cx - s.x, cz - s.z) < 0.8) return false;
        }
        if (world.exit?.sheet === si && Math.hypot(cx - world.exit.x, cz - world.exit.z) < 0.9) return false;
        return true;
      });
      // Bridge sheets are gameplay surfaces, not gardens.
      if (panel.cells.length <= 8) return;
      // keep a few open lanes in the middle of the paper
      const count = Math.min(candidates.length, this.isMobile ? 5 : 7);
      const tall = new Set(['tree', 'pine', 'column', 'cloudtree', 'lantern']);
      for (let n = 0; n < count && candidates.length; n++) {
        const idx = Math.floor(random() * candidates.length);
        const [i, j] = candidates.splice(idx, 1)[0].split(',').map(Number);
        const type = theme.decorate[Math.floor(random() * theme.decorate.length)];
        // Never plant a tall prop on a flap that will lift into a ramp.
        const onMovingFlap = hintLines.some(h => {
          if (h.side === undefined) return false;
          if (h.axis === 'x') return h.side > 0 ? i >= h.coord : i < h.coord;
          return h.side > 0 ? j >= h.coord : j < h.coord;
        });
        if (onMovingFlap && tall.has(type)) { n--; continue; }
        const prop = P.createProp(type, theme, 0.55 + random() * 0.5);
        prop.position.set(i + 0.5 + (random() - 0.5) * 0.3, 0.075, j + 0.5 + (random() - 0.5) * 0.3);
        prop.rotation.y = random() * Math.PI * 2;
        panel.group.add(prop);
        panel.attachments.push(prop);
      }
    });

    // decorations on static platforms
    for (const d of world.platformDecor || []) {
      const prop = P.createProp(d.type, theme, d.scale || 0.8);
      prop.position.set(d.x, d.top, d.z);
      prop.rotation.y = d.rot || 0;
      this.worldGroup.add(prop);
    }
  }

  _buildAtmosphere () {
    const theme = this.theme;
    const b = this._roughBounds();
    const center = b.getCenter(new THREE.Vector3());
    const size = b.getSize(new THREE.Vector3());
    const motes = P.createParticles(this.isMobile ? 70 : 130, theme.motes, 0.06, [Math.max(9, size.x), 6, Math.max(7, size.z)], 0.55);
    motes.position.set(center.x, 0.4, center.z);
    this.worldGroup.add(motes);
    this.motes.push({ obj: motes, base: motes.geometry.attributes.position.array.slice(), speed: 0.2 });

    // slow paper snow / petals / cosmic dust
    const flakeCount = this.level.theme === 'frost' ? (this.isMobile ? 60 : 110) : (this.isMobile ? 22 : 42);
    const flakeColor = this.level.theme === 'frost' ? 0xffffff : this.level.theme === 'cosmic' ? 0xffe7a8 : this.level.theme === 'forest' ? 0xf3d79b : 0xdcc9a4;
    const flakes = P.createParticles(flakeCount, flakeColor, this.level.theme === 'frost' ? 0.055 : 0.04, [Math.max(9, size.x), 8, Math.max(7, size.z)], 0.42);
    flakes.position.set(center.x, 2.5, center.z);
    this.worldGroup.add(flakes);
    this.motes.push({ obj: flakes, base: flakes.geometry.attributes.position.array.slice(), speed: 0.6, falling: true });

    // floating paper bits
    for (let i = 0; i < (this.isMobile ? 8 : 16); i++) {
      const geo = new THREE.PlaneGeometry(0.12 + Math.random() * 0.18, 0.08 + Math.random() * 0.12);
      const mat = new THREE.MeshStandardMaterial({
        color: theme.paper, roughness: 0.92, side: THREE.DoubleSide,
        transparent: true, opacity: 0.72,
      });
      const bit = new THREE.Mesh(geo, mat);
      bit.position.set(center.x + (Math.random() - 0.5) * size.x * 1.2, 0.6 + Math.random() * 4.2, center.z + (Math.random() - 0.5) * size.z * 1.2);
      bit.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.worldGroup.add(bit);
      this.paperBits.push({ obj: bit, phase: Math.random() * 8, spin: (Math.random() - 0.5) * 0.8, baseY: bit.position.y, amp: 0.15 + Math.random() * 0.25 });
    }

    // clouds around the island
    const cloudCount = this.level.theme === 'sky' ? 7 : this.level.theme === 'cosmic' ? 2 : 3;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = P.createCloud(0.5 + Math.random() * 0.8, 0.34);
      const angle = (i / cloudCount) * Math.PI * 2 + Math.random();
      const rad = Math.max(size.x, size.z) * 0.7 + 1.5;
      cloud.position.set(center.x + Math.cos(angle) * rad, -1.4 + Math.random() * 2.8, center.z + Math.sin(angle) * rad);
      this.worldGroup.add(cloud);
      this.clouds.push({ obj: cloud, baseX: cloud.position.x, speed: 0.04 + Math.random() * 0.04, phase: Math.random() * 6 });
    }

    // background small islands / folded debris
    const islets = this.level.theme === 'sky' || this.level.theme === 'cosmic' ? 5 : 3;
    for (let i = 0; i < islets; i++) {
      const angle = (i / islets) * Math.PI * 2 + 1.2;
      const radius = Math.max(size.x, size.z) * 0.75 + 2.2;
      const isl = P.createIsland(theme, 0.35 + Math.random() * 0.55, 0.18);
      isl.position.set(center.x + Math.cos(angle) * radius, -1.2 + Math.random() * 3.6, center.z + Math.sin(angle) * radius);
      isl.rotation.y = Math.random() * 6;
      this.worldGroup.add(isl);
      const type = theme.decorate[i % theme.decorate.length];
      const prop = P.createProp(type, theme, 0.3 + Math.random() * 0.25);
      prop.position.copy(isl.position);
      prop.position.y += 0.02;
      this.worldGroup.add(prop);
      this.clouds.push({ obj: isl, baseY: isl.position.y, phase: Math.random() * 9, islet: true, prop });
    }

    // cranes drifting through the scene
    for (let i = 0; i < 3; i++) {
      const crane = P.createCrane(theme);
      crane.scale.setScalar(0.8);
      crane.position.set(center.x, 2.2 + i * 0.8, center.z);
      this.worldGroup.add(crane);
      this.cranes.push({ obj: crane, phase: Math.random() * 8, radius: 3 + i * 0.6, height: 2.4 + i * 0.5, speed: 0.08 + i * 0.02 });
    }

    if (this.level.theme === 'cosmic') {
      const starGeo = new THREE.BufferGeometry();
      const arr = [];
      for (let i = 0; i < 180; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 8 + Math.random() * 16;
        arr.push(center.x + Math.cos(a) * r, 2 + Math.random() * 12, center.z + Math.sin(a) * r);
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      const starPoints = new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: 0xffe1a0, size: 0.12, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      }));
      this.worldGroup.add(starPoints);
      this.backStars = starPoints;
    }
  }

  _makeBeetle () {
    const theme = this.theme;
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.accent), roughness: 0.6, metalness: 0.15,
      emissive: new THREE.Color(theme.accent), emissiveIntensity: 0.08, flatShading: true,
    });
    const shellMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.accent2), roughness: 0.55, metalness: 0.1,
      emissive: new THREE.Color(theme.accent2), emissiveIntensity: 0.1, flatShading: true,
    });
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), bodyMat);
    body.scale.set(1, 0.55, 1.4);
    body.position.y = 0.2;
    body.castShadow = true;
    g.add(body);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
    shell.scale.set(1, 0.7, 1.35);
    shell.position.y = 0.23;
    shell.castShadow = true;
    g.add(shell);
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), bodyMat);
    head.position.set(0, 0.18, 0.27);
    g.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd77b });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), eyeMat);
      eye.position.set(side * 0.06, 0.2, 0.34);
      g.add(eye);
    }
    const legs = [];
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.04), bodyMat);
        leg.position.set(side * 0.24, 0.1, -0.16 + i * 0.16);
        leg.rotation.z = side * 0.75;
        g.add(leg);
        legs.push(leg);
      }
    }
    g.userData.legs = legs;
    return g;
  }

  _buildPlayer () {
    const model = P.createPlayer(this.skin);
    this.scene.add(model);
    const [px, pz] = this.level.player;
    this.player = {
      root: model,
      pos: new THREE.Vector3(px, 0.1, pz),
      vel: new THREE.Vector3(),
      facing: 0,
      targetFacing: 0,
      phase: 0,
      grounded: false,
      falling: false,
      groundY: 0.1,
      panel: null,
      stepTimer: 0,
      invuln: 0,
      squash: 0,
      riding: false,
      rideFold: null,
    };
    model.position.copy(this.player.pos);
  }

  _computeBounds () {
    const box = this._roughBounds();
    box.min.y = Math.min(box.min.y, -0.5);
    box.max.y = Math.max(box.max.y, 3.1);
    box.expandByScalar(0.35);
    this.levelBounds = box;
  }

  _roughBounds () {
    const box = new THREE.Box3();
    const addPoint = (x, y, z) => box.expandByPoint(new THREE.Vector3(x, y, z));
    for (const sheet of this.level.sheets) {
      const b = sheet.bounds;
      addPoint(b.minX, sheet.y - 0.4, b.minZ);
      addPoint(b.maxX, sheet.y + 0.4, b.maxZ);
      addPoint(b.minX, sheet.y + 1.6, b.minZ);
    }
    for (const p of this.level.platforms || []) {
      addPoint(p.x - p.w / 2, p.top - p.thickness, p.z - p.d / 2);
      addPoint(p.x + p.w / 2, p.top + 0.9, p.z + p.d / 2);
    }
    for (const s of this.level.stars || []) {
      if (s.sheet === undefined) addPoint(s.x, s.y, s.z);
    }
    if (this.level.exit && this.level.exit.sheet === undefined) addPoint(this.level.exit.x, this.level.exit.y + 0.5, this.level.exit.z);
    if (this.player) addPoint(this.player.pos.x, this.player.pos.y + 1, this.player.pos.z);
    return box;
  }

  _frameLevel () {
    const box = this.levelBounds || this._roughBounds();
    const center = box.getCenter(new THREE.Vector3());
    const portrait = this.height > this.width * 1.05;
    // A portrait screen needs the long axis of the level to run up the
    // screen, so phones look down the folded road instead of across it.
    const dir = portrait
      ? new THREE.Vector3(1.08, 1.18, 0.56).normalize()
      : new THREE.Vector3(0.86, 1.02, 1.15).normalize();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.copy(center).addScaledVector(dir, 30);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(camera.matrixWorldInverse);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const corners = [
      [box.min.x, box.min.y, box.min.z], [box.min.x, box.min.y, box.max.z],
      [box.min.x, box.max.y, box.min.z], [box.min.x, box.max.y, box.max.z],
      [box.max.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.max.z],
      [box.max.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.max.z],
    ];
    for (const c of corners) {
      TMP.set(c[0], c[1], c[2]).applyMatrix4(inv);
      minX = Math.min(minX, TMP.x); maxX = Math.max(maxX, TMP.x);
      minY = Math.min(minY, TMP.y); maxY = Math.max(maxY, TMP.y);
    }
    const aspect = this.width / this.height;
    let hw = (maxX - minX) / 2 + 0.4;
    let hh = (maxY - minY) / 2 + 0.4;
    if (hw / hh < aspect) hw = hh * aspect; else hh = hw / aspect;
    const zoom = portrait ? 1.06 : 1.24;
    camera.left = -hw / zoom;
    camera.right = hw / zoom;
    camera.top = hh / zoom;
    camera.bottom = -hh / zoom;
    camera.near = 0.1;
    camera.far = 100;
    camera.updateProjectionMatrix();
    this.camera = camera;
    this.cameraBase = { hw, hh, center: center.clone(), dir: dir.clone(), zoom };
    this.camera.zoom = 1;
  }

  // =========================================================================
  // Input
  // =========================================================================
  _bindInput () {
    this.canvas.addEventListener('pointerdown', e => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', e => this._onPointerMove(e));
    this.canvas.addEventListener('pointerup', e => this._onPointerUp(e));
    this.canvas.addEventListener('pointercancel', e => this._onPointerUp(e));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Escape') this.emit('keyescape');
      if (e.key.toLowerCase() === 'r' && this.mode === 'game' && !this.paused) this.restart();
      if (e.key.toLowerCase() === 'h' && this.mode === 'game' && !this.paused) this.nextHint();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.joy = { x: 0, y: 0, active: false }; });
  }

  setJoystick (x, y, active) {
    this.joy.x = x;
    this.joy.y = y;
    this.joy.active = active;
  }

  _ndc (e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
  }

  _hitPaper (e) {
    if (!this.camera) return null;
    const n = this._ndc(e);
    this.raycaster.setFromCamera(n, this.camera);
    const hits = this.raycaster.intersectObjects(this.paperMeshes, false);
    return hits.length ? hits[0] : null;
  }

  _pointerOnPlane (e, panel) {
    const n = this._ndc(e);
    this.raycaster.setFromCamera(n, this.camera);
    const plane = new THREE.Plane(UP, -(panel.group.position.y + 0.07));
    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, point)) return null;
    return point;
  }

  _onPointerDown (e) {
    if (this.mode !== 'game' || this.paused || this.completed || this.trappedTimer > 0) return;
    if (this.pointerState) return;
    if (e.button !== undefined && e.button !== 0) return;
    const hit = this._hitPaper(e);
    if (!hit) {
      if (this.pendingCrease) this.clearCrease();
      return;
    }
    const panel = hit.object.userData.panel;
    if (!panel) return;
    try { this.canvas.setPointerCapture?.(e.pointerId); } catch (err) {}
    const state = {
      id: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      current: { x: e.clientX, y: e.clientY },
      panel,
      mode: null,
      startAngle: 0,
      startPoint: null,
    };

    // adjusting a flap that is already folded
    if (panel.fold && !panel.fold.animating) {
      state.mode = 'fold';
      state.fold = panel.fold;
      state.startAngle = panel.fold.angle;
      state.startY = e.clientY;
      this.pointerState = state;
      this._beginRide(panel.fold);
      this.fold = panel.fold;
      this.sound.startFold();
      this.emit('folddrag', { angle: panel.fold.angle });
      return;
    }

    // a crease has been prepared: this drag folds one of the sides
    if (this.pendingCrease && this.pendingCrease.panel === panel) {
      const point = this._pointerOnPlane(e, panel);
      if (point) {
        const c = this.pendingCrease;
        const side = c.axis === 'x'
          ? (point.x >= c.coord ? 1 : -1)
          : (point.z >= c.coord ? 1 : -1);
        const fold = this._beginFold(c, side);
        if (fold) {
          state.mode = 'fold';
          state.fold = fold;
          state.startAngle = 0;
          state.startY = e.clientY;
          this.pointerState = state;
          this._beginRide(fold);
          this.fold = fold;
          this.sound.startFold();
        }
      }
      return;
    }

    // otherwise: begin a fresh swipe on foldable paper
    if (!panel.foldable || panel.folded) {
      this.emit('toast', { text: 'This paper is already folded — try another sheet.', duration: 1800 });
      return;
    }
    state.mode = 'swipe';
    state.startPoint = this._pointerOnPlane(e, panel);
    this.pointerState = state;
    if (this.pendingCrease && this.pendingCrease.panel !== panel) this.clearCrease();
  }

  _onPointerMove (e) {
    const st = this.pointerState;
    if (!st || st.id !== e.pointerId) return;
    st.current = { x: e.clientX, y: e.clientY };
    if (st.mode === 'swipe') {
      const dx = st.current.x - st.start.x;
      const dy = st.current.y - st.start.y;
      if (Math.hypot(dx, dy) < 7) return;
      const point = this._pointerOnPlane(e, st.panel);
      if (!point || !st.startPoint) return;
      const worldDx = point.x - st.startPoint.x;
      const worldDz = point.z - st.startPoint.z;
      const axis = Math.abs(worldDx) >= Math.abs(worldDz) ? 'z' : 'x';
      const mid = axis === 'x' ? (point.x + st.startPoint.x) / 2 : (point.z + st.startPoint.z) / 2;
      const bounds = st.panel.bounds;
      const coord = axis === 'x'
        ? clamp(Math.round(mid), bounds.minX, bounds.maxX)
        : clamp(Math.round(mid), bounds.minZ, bounds.maxZ);
      this._showPreview(st.panel, axis, coord);
      st.preview = { axis, coord };
    } else if (st.mode === 'fold') {
      const fold = st.fold;
      if (!fold) return;
      const delta = (st.startY - e.clientY) / this.height * 300;
      const angle = clamp(st.startAngle + delta, 0, 180);
      this._setFoldAngle(fold, angle);
      this.emit('foldchange', { angle });
    }
  }

  _onPointerUp (e) {
    const st = this.pointerState;
    if (!st || st.id !== e.pointerId) return;
    try { this.canvas.releasePointerCapture?.(e.pointerId); } catch (err) {}
    this.pointerState = null;
    if (st.mode === 'swipe') {
      if (st.preview) {
        this._commitCrease(st.panel, st.preview.axis, st.preview.coord);
      }
      this._removePreview();
    } else if (st.mode === 'fold') {
      const fold = st.fold;
      if (!fold) return;
      const snapped = this._snapAngle(fold.angle);
      fold.animFrom = fold.angle;
      fold.animTo = snapped;
      fold.animT = 0;
      fold.animating = true;
      this.fold = fold;
      this.sound.stopFold();
      this._stopFoldSound();
      this.sound.snap(snapped);
      this.emit('foldchange', { angle: snapped });
      this.player.riding = false;
    }
  }

  _showPreview (panel, axis, coord) {
    this._removePreview();
    const len = axis === 'x' ? panel.bounds.maxZ - panel.bounds.minZ : panel.bounds.maxX - panel.bounds.minX;
    const line = P.makeCreaseLine(len, axis, 0xf2c76a);
    if (axis === 'x') line.position.set(coord, panel.group.position.y + 0.1, (panel.bounds.minZ + panel.bounds.maxZ) / 2);
    else line.position.set((panel.bounds.minX + panel.bounds.maxX) / 2, panel.group.position.y + 0.1, coord);
    this.worldGroup.add(line);
    this.previewGuide = line;
    this.previewData = { panel, axis, coord };
  }

  _removePreview () {
    if (this.previewGuide) {
      this.worldGroup.remove(this.previewGuide);
      this.previewGuide = null;
    }
    this.previewData = null;
  }

  _commitCrease (panel, axis, coord) {
    this._removePreview();
    const cellsMoving = cellsOnSide(panel.cells, axis, coord, 1).length;
    const cellsStill = cellsOnSide(panel.cells, axis, coord, -1).length;
    if (cellsMoving === 0 && cellsStill === 0) {
      this.emit('toast', { text: 'The crease missed the paper.', duration: 1600 });
      return;
    }
    this.pendingCrease = { panel, axis, coord, cellsMoving, cellsStill };
    this._hideHint();
    const len = axis === 'x' ? panel.bounds.maxZ - panel.bounds.minZ : panel.bounds.maxX - panel.bounds.minX;
    const line = P.makeCreaseLine(len, axis, 0xd8a641);
    if (axis === 'x') line.position.set(coord, panel.group.position.y + 0.11, (panel.bounds.minZ + panel.bounds.maxZ) / 2);
    else line.position.set((panel.bounds.minX + panel.bounds.maxX) / 2, panel.group.position.y + 0.11, coord);
    this.worldGroup.add(line);
    this.creaseGuide = line;
    this.sound.crease();
    this.emit('crease', { angle: 0 });
    if (this.level.tutorial) {
      this.emit('tutorial', {
        title: 'Now fold',
        text: 'Drag the glowing paper upward. Release near 45°.',
      });
    }
    this.emit('toast', { text: 'Drag a side of the paper upward to fold', duration: 2400 });
  }

  clearCrease () {
    if (this.fold || !this.pendingCrease) {
      this.emit('creaseclear');
      return;
    }
    this.pendingCrease = null;
    if (this.creaseGuide) {
      this.worldGroup.remove(this.creaseGuide);
      this.creaseGuide = null;
    }
    this.emit('creaseclear');
  }

  _snapAngle (a) {
    let best = SNAP_ANGLES[0];
    let bestD = Infinity;
    for (const s of SNAP_ANGLES) {
      const d = Math.abs(s - a);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  // =========================================================================
  // Folding
  // =========================================================================
  _beginFold (pending, side) {
    const panel = pending.panel;
    let moving = cellsOnSide(panel.cells, pending.axis, pending.coord, side);
    const still = cellsOnSide(panel.cells, pending.axis, pending.coord, -side);
    if (!moving.length) {
      // auto-flip the side if the chosen one is empty
      moving = still;
      side = -side;
    }
    if (!moving.length) {
      this.emit('toast', { text: 'There is no paper on that side.', duration: 1600 });
      return null;
    }

    const fold = this._splitPanel(panel, pending.axis, pending.coord, side);
    if (!fold) return null;
    this.pendingCrease = null;
    if (this.creaseGuide) {
      this.worldGroup.remove(this.creaseGuide);
      this.creaseGuide = null;
    }
    this._hideHint();
    this.foldsMade++;
    this.fold = fold;
    this.emit('foldstart', { fold, angle: 0 });
    this.emit('creaseclear');
    return fold;
  }

  _splitPanel (panel, axis, coord, sign) {
    const movingCells = cellsOnSide(panel.cells, axis, coord, sign);
    const stillCells = cellsOnSide(panel.cells, axis, coord, -sign);
    if (!movingCells.length) return null;
    const origGroup = panel.group;
    const origWorldPos = new THREE.Vector3();
    origGroup.getWorldPosition(origWorldPos);
    const y = origGroup.position.y;

    const make = (cells, isMoving) => {
      const p = {
        id: `${panel.id}-${isMoving ? 'm' : 's'}-${Math.round(performance.now())}`,
        cells,
        bounds: { ...panel.bounds },
        y,
        group: new THREE.Group(),
        mesh: null,
        foldable: false,
        folded: true,
        fold: null,
        sheetIndex: panel.sheetIndex,
        attachments: [],
        isSheet: false,
        moving: isMoving,
      };
      p.group.position.copy(origGroup.position);
      p.group.quaternion.copy(origGroup.quaternion);
      p.group.scale.copy(origGroup.scale);
      const mesh = P.createPanelMesh(p, this.theme);
      p.mesh = mesh;
      p.group.add(mesh);
      this.worldGroup.add(p.group);
      this.panels.push(p);
      this.paperMeshes.push(mesh);
      this.groundMeshes.push(mesh);
      return p;
    };

    const stay = stillCells.length ? make(stillCells, false) : null;
    const move = make(movingCells, true);

    // move attachments to the correct new panel, preserving world transforms
    const all = [...panel.attachments];
    for (const att of all) {
      const v = axis === 'x' ? att.position.x : att.position.z;
      const goMove = sign > 0 ? v >= coord : v < coord;
      const target = goMove ? move : stay;
      if (target) {
        target.group.attach(att);
        target.attachments.push(att);
      }
    }

    // remove original
    this.worldGroup.remove(origGroup);
    panel.folded = true;
    panel.foldable = false;
    const pi = this.panels.indexOf(panel);
    if (pi >= 0) this.panels.splice(pi, 1);
    const gi = this.groundMeshes.indexOf(panel.mesh);
    if (gi >= 0) this.groundMeshes.splice(gi, 1);
    const mi = this.paperMeshes.indexOf(panel.mesh);
    if (mi >= 0) this.paperMeshes.splice(mi, 1);
    panel.mesh.geometry.dispose();

    // pivot at crease, in world space
    const pivotPos = axis === 'x'
      ? new THREE.Vector3(coord, y, 0)
      : new THREE.Vector3(0, y, coord);
    const pivot = new THREE.Group();
    pivot.position.copy(pivotPos);
    this.worldGroup.add(pivot);
    pivot.updateMatrixWorld(true);
    pivot.attach(move.group);

    const axisVec = axis === 'x' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const sideDir = axis === 'x' ? new THREE.Vector3(sign, 0, 0) : new THREE.Vector3(0, 0, sign);
    const rotationSign = Math.sign(new THREE.Vector3().crossVectors(axisVec, sideDir).y) || 1;

    const hinge = P.makeHinge(axis, axis === 'x' ? (panel.bounds.maxZ - panel.bounds.minZ) : (panel.bounds.maxX - panel.bounds.minX), 0);
    hinge.position.copy(pivotPos);
    this.worldGroup.add(hinge);

    const fold = {
      panel,
      move,
      stay,
      pivot,
      hinge,
      axis,
      coord,
      sign,
      axisVec,
      rotationSign,
      angle: 0,
      animating: false,
      animFrom: 0,
      animTo: 0,
      animT: 0,
      settled: false,
    };
    move.fold = fold;
    if (stay) stay.fold = fold;
    panel.fold = fold;
    this.folds.push(fold);
    this._setFoldAngleRaw(fold, 0);
    this._creasePuff(pivotPos, axis);
    return fold;
  }

  _setFoldAngle (fold, angle) {
    this._setFoldAngleRaw(fold, angle);
    this.emit('foldchange', { angle });
  }

  _setFoldAngleRaw (fold, angle) {
    angle = clamp(angle, 0, 180);
    const prev = fold.angle;
    fold.angle = angle;
    const rad = THREE.MathUtils.degToRad(angle) * fold.rotationSign;
    TMP_Q.setFromAxisAngle(fold.axisVec, rad);
    fold.pivot.quaternion.copy(TMP_Q);
    this.worldGroup.updateMatrixWorld(true);

    // carry the player if they were standing on the moving paper
    if (this.player && this.player.riding && fold === this.player.rideFold) {
      const deltaDeg = angle - prev;
      if (Math.abs(deltaDeg) > 0.001) {
        const deltaRad = THREE.MathUtils.degToRad(deltaDeg) * fold.rotationSign;
        TMP_Q.setFromAxisAngle(fold.axisVec, deltaRad);
        TMP.copy(this.player.pos).sub(fold.pivot.position).applyQuaternion(TMP_Q);
        this.player.pos.copy(fold.pivot.position).add(TMP);
        this._settlePlayerOnPaper(true);
      }
    }
    this.sound.updateFold(angle / 180);
  }

  _beginRide (fold) {
    if (!this.player) return;
    // are we standing on the moving panel?
    const g = this._groundAt(this.player.pos.x, this.player.pos.z, this.player.pos.y + 2.5);
    const onMove = g && g.mesh?.userData?.panel === fold.move;
    if (onMove) {
      this.player.riding = true;
      this.player.rideFold = fold;
    } else {
      this.player.riding = false;
      this.player.rideFold = null;
    }
  }

  _settlePlayerOnPaper (fromRide = false) {
    const g = this._groundAt(this.player.pos.x, this.player.pos.z, this.player.pos.y + 3.2);
    if (g && g.y <= this.player.pos.y + 0.65) {
      this.player.pos.y += (g.y - this.player.pos.y) * (fromRide ? 1 : 0.6);
      this.player.groundY = g.y;
      this.player.grounded = true;
      this.player.falling = false;
      this.player.panel = g.mesh?.userData?.panel || null;
    } else if (fromRide) {
      this.player.grounded = false;
      this.player.falling = true;
    }
  }

  _onFoldSettled (fold) {
    fold.settled = true;
    this.fold = fold;
    this.player.riding = false;
    this.player.rideFold = null;
    this._settlePlayerOnPaper(false);
    if (fold.angle > 0.1) {
      this.emit('foldend', { angle: fold.angle, folds: this.foldsMade });
      if (this.level.tutorial) {
        this.emit('tutorial', {
          title: 'Climb the fold',
          text: 'Use the joystick to walk up the paper to the portal.',
        });
      }
      this.emit('toast', { text: `Fold set at ${Math.round(fold.angle)}°`, duration: 1400 });
    }
    this.emit('foldchange', { angle: fold.angle });
    this._checkTrap();
  }

  _checkTrap () {
    if (!this.player || this.completed) return;
    const origin = this.player.pos.clone();
    origin.y += 0.22;
    this.raycaster.set(origin, UP);
    this.raycaster.far = 0.62;
    const hits = this.raycaster.intersectObjects(this.groundMeshes, false);
    this.raycaster.far = 200;
    if (hits.length) {
      this.trappedTimer = 1.6;
      this.freeze = 1.6;
      this.player.root.visible = false;
      this.sound.trapped();
      this.emit('trapped', { message: 'Trapped in the fold — restarting' });
    }
  }

  _creasePuff (pos, axis) {
    const count = this.isMobile ? 9 : 16;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = pos.x + (Math.random() - 0.5) * 0.8;
      arr[i * 3 + 1] = pos.y + 0.1 + Math.random() * 0.3;
      arr[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.8;
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xf4d59a, size: 0.09, map: P.glowTexture(), transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.worldGroup.add(points);
    this.sparkBursts.push({ obj: points, life: 0.8, max: 0.8, vel: null });
  }

  // =========================================================================
  // Ground / collision
  // =========================================================================
  _groundAt (x, z, fromY = 8) {
    this.raycaster.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
    this.raycaster.far = 60;
    const hits = this.raycaster.intersectObjects(this.groundMeshes, false);
    this.raycaster.far = 200;
    for (const hit of hits) {
      let n = hit.face?.normal;
      if (!n) continue;
      if (hit.object.matrixWorld) {
        n = n.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
      }
      if (Math.abs(n.y) > 0.5) {
        return { y: hit.point.y, mesh: hit.object, normal: n, point: hit.point };
      }
    }
    return null;
  }

  _rayWall (ox, oz, y, dx, dz, dist = 0.32) {
    const origin = new THREE.Vector3(ox, y + 0.35, oz);
    const dir = new THREE.Vector3(dx, 0, dz).normalize();
    this.raycaster.set(origin, dir);
    this.raycaster.far = dist;
    const hits = this.raycaster.intersectObjects(this.groundMeshes, false);
    this.raycaster.far = 200;
    for (const hit of hits) {
      let n = hit.face?.normal;
      if (!n) continue;
      n = n.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
      if (Math.abs(n.y) < 0.52) return hit;
    }
    return null;
  }

  _tryMove (dx, dz) {
    const p = this.player;
    if (!p) return;
    if (dx === 0 && dz === 0) return;
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(dist / 0.09));
    const sx = dx / steps;
    const sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      if (this._rayWall(p.pos.x, p.pos.z, p.pos.y, sx, sz, 0.28)) break;
      const nx = p.pos.x + sx;
      const nz = p.pos.z + sz;
      const g = this._groundAt(nx, nz, p.pos.y + 1.4);
      if (g && g.y > p.groundY + 0.27) {
        // step too high (wall / ledge)
        break;
      }
      if (g && g.y >= p.groundY - 0.55) {
        p.pos.x = nx;
        p.pos.z = nz;
        p.pos.y += (g.y - p.pos.y) * 0.7;
        p.groundY = g.y;
        p.grounded = true;
        p.falling = false;
        p.panel = g.mesh?.userData?.panel || null;
      } else {
        p.pos.x = nx;
        p.pos.z = nz;
        p.grounded = false;
        p.falling = true;
        break;
      }
    }
  }

  // =========================================================================
  // Player update
  // =========================================================================
  _updatePlayer (dt) {
    const p = this.player;
    if (!p) return;
    const active = this.mode === 'game' && !this.paused && !this.completed && this.trappedTimer <= 0 && this.freeze <= 0;

    let ix = 0, iy = 0;
    if (active && !this.pointerState) {
      ix = this.joy.x;
      iy = this.joy.y;
      if (this.keys.has('w') || this.keys.has('arrowup')) iy += 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) iy -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) ix += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft')) ix -= 1;
    }
    const mag = Math.hypot(ix, iy);
    if (mag > 1) { ix /= mag; iy /= mag; }

    if (p.root) {
      p.invuln = Math.max(0, p.invuln - dt);
      p.root.visible = p.invuln <= 0 || Math.floor(p.invuln * 14) % 2 === 0;
    }

    if (p.falling) {
      p.vel.y -= 16 * dt;
      p.pos.y += p.vel.y * dt;
      // air control
      if (mag > 0.05) {
        const mv = this._moveVector(ix, iy);
        p.pos.x += mv.x * 1.4 * dt;
        p.pos.z += mv.z * 1.4 * dt;
      }
      const g = this._groundAt(p.pos.x, p.pos.z, p.pos.y + 1.8);
      if (g && p.pos.y <= g.y + 0.02) {
        p.pos.y = g.y;
        p.groundY = g.y;
        p.vel.y = 0;
        p.falling = false;
        p.grounded = true;
        p.squash = 0.14;
        p.panel = g.mesh?.userData?.panel || null;
        this.sound.step();
        this._dustPuff(p.pos);
      }
      if (p.pos.y < -6) this._respawn(true);
    } else if (active && mag > 0.08) {
      const mv = this._moveVector(ix, iy);
      const speed = 3.1 * Math.min(1, mag);
      this._tryMove(mv.x * speed * dt, mv.z * speed * dt);
      p.targetFacing = Math.atan2(mv.x, mv.z);
      p.phase += dt * speed * 3.1;
      p.stepTimer -= dt;
      if (p.stepTimer <= 0) {
        p.stepTimer = 0.34;
        if (p.grounded) this.sound.step();
      }
      // if walked off an edge, fall
      const g = this._groundAt(p.pos.x, p.pos.z, p.pos.y + 1.0);
      if (!g || g.y < p.pos.y - 0.5) {
        p.falling = true;
        p.grounded = false;
        p.vel.y = 0;
      } else {
        p.pos.y += (g.y - p.pos.y) * 0.55;
        p.groundY = g.y;
        p.panel = g.mesh?.userData?.panel || null;
      }
    } else {
      p.phase += dt * 1.8;
    }

    // gentle facing interpolation
    if (p.root) {
      let d = p.targetFacing - p.facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.facing += d * Math.min(1, dt * 11);
      p.root.rotation.y = p.facing;
      p.root.position.copy(p.pos);
      p.squash = Math.max(0, p.squash - dt * 1.4);
      const walking = mag > 0.08 && p.grounded && !p.falling && !this.pointerState;
      const bob = walking ? Math.abs(Math.sin(p.phase * 2)) * 0.035 : Math.sin(p.phase) * 0.012;
      p.root.position.y += bob - p.squash * 0.14;
      const model = p.root.userData.model;
      if (model) {
        model.scale.y = 1 - p.squash * 0.5;
        model.scale.x = model.scale.z = 1 + p.squash * 0.25;
        const legs = p.root.userData.legs || [];
        legs.forEach((leg, i) => {
          const dir = i < 2 ? 1 : -1;
          leg.rotation.x = walking ? Math.sin(p.phase * 2 + (i % 2) * Math.PI) * 0.5 * dir : Math.sin(p.phase + i) * 0.035;
        });
        const tail = p.root.userData.tail;
        if (tail) tail.rotation.z = Math.sin(p.phase * 1.5) * 0.12;
        const head = p.root.userData.head;
        if (head) {
          head.rotation.x = walking ? Math.sin(p.phase * 2) * 0.025 : Math.sin(p.phase * 0.7) * 0.03;
          const ear = p.root.userData.ears?.[0];
          const ear2 = p.root.userData.ears?.[1];
          if (ear) ear.rotation.x = Math.sin(p.phase * 2.2) * 0.05;
          if (ear2) ear2.rotation.x = Math.sin(p.phase * 2.2 + 1) * 0.05;
        }
      }
    }

    // star collection
    for (const star of this.stars) {
      if (star.collected) continue;
      this._positionStar(star);
      const dx = star.group.position.x - p.pos.x;
      const dz = star.group.position.z - p.pos.z;
      const dy = star.group.position.y - (p.pos.y + 0.5);
      if (dx * dx + dz * dz < 0.46 && Math.abs(dy) < 0.9) this._collectStar(star);
    }

    // exit
    if (this.exit && !this.completed) {
      TMP.copy(this.exit.group.position);
      const dx = TMP.x - p.pos.x;
      const dz = TMP.z - p.pos.z;
      const dy = TMP.y - (p.pos.y + 0.4);
      if (dx * dx + dz * dz < 0.46 && Math.abs(dy) < 1.25) this._completeLevel();
    }

    // enemies
    for (const e of this.enemies) {
      const range = e.range;
      const span = range[1] - range[0];
      const t = this.elapsed * e.speed + e.phase;
      const along = range[0] + (span * (0.5 + 0.5 * Math.sin(t)));
      if (e.axis === 'x') e.obj.position.x = along; else e.obj.position.z = along;
      e.obj.rotation.y = (e.axis === 'x' ? (Math.cos(t) > 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.cos(t) > 0 ? 0 : Math.PI));
      const legs = e.obj.userData.legs || [];
      legs.forEach((leg, i) => { leg.rotation.x = Math.sin(this.elapsed * 9 + i) * 0.35; });
      if (p.invuln <= 0 && this.trappedTimer <= 0) {
        const ex = e.obj.position.x - p.pos.x;
        const ez = e.obj.position.z - p.pos.z;
        const ey = e.y - p.pos.y;
        if (Math.hypot(ex, ez) < 0.55 && Math.abs(ey) < 0.8) {
          this._hitByEnemy();
        }
      }
    }
  }

  _moveVector (ix, iy) {
    const cam = this.camera || this.menuCamera;
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
    const v = new THREE.Vector3().addScaledVector(forward, iy).addScaledVector(right, ix);
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  _positionStar (star) {
    if (star.collected) return;
    let base;
    if (star.anchor) {
      star.anchor.getWorldPosition(TMP);
      base = TMP;
    } else {
      base = TMP.set(star.group.position.x, star.baseY, star.group.position.z);
    }
    const bob = Math.sin(this.elapsed * 1.7 + star.seed) * 0.08;
    star.group.position.set(base.x, base.y + bob, base.z);
    if (star.group.userData.spin) {
      star.group.userData.spin.rotation.y = this.elapsed * 1.1 + star.spin;
      star.group.userData.spin.rotation.z = Math.sin(this.elapsed * 0.8 + star.spin) * 0.12;
    }
    if (star.group.userData.glow) {
      star.group.userData.glow.material.opacity = 0.45 + Math.sin(this.elapsed * 2.2 + star.seed) * 0.15;
    }
  }

  _collectStar (star) {
    star.collected = true;
    this.starCount++;
    this.sound.star();
    this._burst(star.group.position, 0xffd57a, 18);
    star.group.visible = false;
    this.emit('star', { count: this.starCount, total: this.totalStars });
    this.emit('hud', { stars: this.starCount, total: this.totalStars });
    this.emit('toast', { text: 'Golden origami star found', duration: 2200, star: true });
    if (this.level.tutorial) {
      this.emit('tutorial', { title: 'A hidden star', text: 'Stars unlock new paper souls. Find them all.' });
    }
    this.emit('haptic', 'star');
  }

  _burst (pos, color = 0xffd57a, count = 24) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i++) {
      arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI;
      const s = 0.7 + Math.random() * 1.7;
      vel.push(new THREE.Vector3(Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s));
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      color, size: 0.11, map: P.glowTexture(), transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.worldGroup.add(points);
    this.sparkBursts.push({ obj: points, life: 1.25, max: 1.25, vel, gravity: true });
  }

  _dustPuff (pos) {
    const count = this.isMobile ? 5 : 9;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = pos.x + (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 1] = pos.y + 0.04;
      arr[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.3;
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({ color: 0xd8c7a6, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false });
    const p = new THREE.Points(geo, mat);
    this.worldGroup.add(p);
    this.sparkBursts.push({ obj: p, life: 0.5, max: 0.5, vel: null, rise: true });
  }

  _hitByEnemy () {
    if (this.trappedTimer > 0) return;
    this.sound.error();
    this.emit('haptic', 'hit');
    this.emit('toast', { text: 'A paper beetle! Back to the start.', duration: 2000 });
    this.player.invuln = 0.6;
    this._respawn(false);
    this.emit('hit', {});
  }

  _respawn (fell) {
    if (!this.player || this.completed) return;
    const [px, pz] = this.level.player;
    const g = this._groundAt(px, pz, 6);
    if (!g) {
      this.restart();
      return;
    }
    this.player.pos.set(px, g.y, pz);
    this.player.groundY = g.y;
    this.player.vel.set(0, 0, 0);
    this.player.falling = false;
    this.player.grounded = true;
    this.player.panel = g.mesh?.userData?.panel || null;
    this.player.invuln = 1.0;
    this.player.root.visible = true;
    if (fell) {
      this.sound.fall();
      this.emit('toast', { text: 'The paper caught you. Back to the start.', duration: 1900 });
    }
    this.emit('respawn', {});
  }

  _completeLevel () {
    if (this.completed) return;
    this.completed = true;
    this.completedTimer = 0.9;
    this.player.riding = false;
    this.sound.portal();
    this.emit('haptic', 'complete');
    if (this.exit) {
      this.exit.anchor?.getWorldPosition(TMP);
      if (!this.exit.anchor) TMP.copy(this.exit.group.position);
      this._burst(new THREE.Vector3(TMP.x, TMP.y + 0.3, TMP.z), 0xffdc8c, 34);
    }
    const stats = {
      level: this.levelIndex,
      stars: this.starCount,
      total: this.totalStars,
      time: this.time,
      folds: this.foldsMade,
      index: this.levelIndex,
      name: this.level.name,
    };
    this.completeStats = stats;
    this.emit('levelcomplete-start', stats);
  }

  // =========================================================================
  // Hints
  // =========================================================================
  showHint (index = 0, opts = {}) {
    if (!this.level) return;
    const hints = this.level.hints || [];
    if (!hints.length) return;
    const hint = hints[index % hints.length];
    this.hintIndex = index;
    const panel = this.sheetPanels[hint.sheet];
    if (!panel || !panel.foldable || panel.folded || panel.fold) {
      // find next usable hint
      if (!opts.noCycle && hints.length > 1) {
        for (let i = 1; i < hints.length; i++) {
          const p2 = this.sheetPanels[hints[(index + i) % hints.length].sheet];
          if (p2 && p2.foldable && !p2.folded && !p2.fold) {
            this.showHint(index + i, { ...opts, noCycle: false });
            return;
          }
        }
      }
      this.emit('toast', { text: 'That fold is already made. Try another sheet.', duration: 1800 });
      return;
    }
    this._hideHint();
    const len = hint.axis === 'x' ? panel.bounds.maxZ - panel.bounds.minZ : panel.bounds.maxX - panel.bounds.minX;
    const guide = P.makeCreaseLine(len, hint.axis, opts.auto ? 0xf4c766 : 0xddaa4d);
    if (hint.axis === 'x') guide.position.set(hint.coord, panel.group.position.y + 0.13, (panel.bounds.minZ + panel.bounds.maxZ) / 2);
    else guide.position.set((panel.bounds.minX + panel.bounds.maxX) / 2, panel.group.position.y + 0.13, hint.coord);
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({
      map: P.glowTexture(), color: 0xffd986, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glint.scale.setScalar(0.8);
    guide.add(glint);
    guide.userData.glint = glint;
    guide.userData.len = len;
    guide.userData.axis = hint.axis;
    this.worldGroup.add(guide);
    this.hintGuide = guide;
    this.emit('hint', { text: hint.text, index, ...hint });
    this.emit('toast', { text: `Hint · ${hint.text}`, duration: 4200 });
  }

  nextHint () {
    if (!this.level) return;
    const hints = this.level.hints || [];
    if (!hints.length) {
      this.emit('toast', { text: 'No creases left. The paper is already folded.', duration: 1800 });
      return;
    }
    this.showHint((this.hintIndex + 1) % hints.length);
  }

  _hideHint () {
    if (this.hintGuide) {
      this.worldGroup?.remove(this.hintGuide);
      this.hintGuide = null;
    }
  }

  // =========================================================================
  // Update loops
  // =========================================================================
  _tick () {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;
    if (this.mode === 'menu') {
      this._updateMenu(dt);
    } else {
      this._updateGame(dt);
    }
    const cam = this.mode === 'menu' ? this.menuCamera : this.camera;
    if (cam) this.renderer.render(this.mode === 'menu' ? this.menuScene : this.scene, cam);
  }

  _updateMenu (dt) {
    if (!this.menuScene) return;
    const t = this.elapsed;
    if (this.menuFox) {
      const fox = this.menuFox;
      fox.userData.model.position.y = Math.sin(t * 1.4) * 0.012;
      fox.userData.head.rotation.y = Math.sin(t * 0.6) * 0.18;
      fox.userData.head.rotation.x = Math.sin(t * 0.9) * 0.04;
      fox.userData.tail.rotation.z = Math.sin(t * 1.6) * 0.15;
      fox.userData.ears.forEach((ear, i) => { ear.rotation.x = Math.sin(t * 1.8 + i) * 0.06; });
    }
    if (this.menuStar) {
      this.menuStar.position.y = 1.85 + Math.sin(t * 1.2) * 0.12;
      this.menuStar.userData.spin.rotation.y = t * 0.9;
      this.menuStar.userData.glow.material.opacity = 0.45 + Math.sin(t * 2) * 0.12;
    }
    if (this.menuSeal) {
      this.menuSeal.userData.diamond.rotation.y = t * 0.6;
      this.menuSeal.userData.diamond.position.y = 0.13 + Math.sin(t * 1.4) * 0.05;
    }
    for (const f of this.menuFloaters || []) {
      f.isl.position.y = f.baseY + Math.sin(t * 0.6 + f.phase) * 0.09;
      f.prop.position.y = f.isl.position.y;
    }
    for (const c of this.menuCranes || []) {
      const a = t * c.speed + c.phase;
      c.obj.position.x = Math.cos(a) * c.radius;
      c.obj.position.z = Math.sin(a) * c.radius - 0.6;
      c.obj.position.y = 2.0 + Math.sin(a * 1.4) * 0.2;
      c.obj.rotation.y = -a + Math.PI / 2;
      const wings = c.obj.userData.wings || [];
      wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 2.4 + i) * 0.12; });
    }
    for (const c of this.menuClouds || []) {
      c.obj.position.x = c.baseX + Math.sin(t * c.speed + c.phase) * 0.6;
    }
    if (this.menuMotes) {
      const pos = this.menuMotes.geometry.attributes.position;
      const base = this.menuMotes.userData.base;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.4 + i) * 0.4;
      }
      pos.needsUpdate = true;
    }
    if (this.menuMountain) this.menuMountain.rotation.y = Math.sin(t * 0.05) * 0.02;
    this._placeMenuCamera();
    const cam = this.menuCamera;
    cam.position.x += Math.sin(t * 0.15) * 0.25;
    cam.position.z += Math.cos(t * 0.13) * 0.18;
    cam.lookAt(this.menuTarget.x + Math.sin(t * 0.1) * 0.2, this.menuTarget.y, this.menuTarget.z);
  }

  _updateGame (dt) {
    if (!this.scene) return;
    if (this.paused) {
      this._updateAmbient(dt);
      return;
    }
    if (this.trappedTimer > 0) {
      this.trappedTimer -= dt;
      this.freeze = Math.max(0, this.freeze - dt);
      if (this.trappedTimer <= 0) {
        this.restart();
      }
      this._updateAmbient(dt);
      return;
    }
    if (this.completed) {
      this._updateAmbient(dt);
      this.completedTimer -= dt;
      if (this.completedTimer <= 0 && !this._completeSent) {
        this._completeSent = true;
        this.emit('levelcomplete', this.completeStats);
      }
      return;
    }
    this._completeSent = false;
    this.time += dt;
    if (this.freeze > 0) this.freeze -= dt;

    if (this.fold && this.fold.animating) {
      const f = this.fold;
      f.animT += dt / 0.2;
      const k = Math.min(1, f.animT);
      const a = f.animFrom + (f.animTo - f.animFrom) * easeInOut(k);
      this._setFoldAngleRaw(f, a);
      this.emit('foldchange', { angle: a });
      if (k >= 1) {
        f.animating = false;
        f.angle = f.animTo;
        this._setFoldAngleRaw(f, f.animTo);
        this._onFoldSettled(f);
      }
    }

    this._updatePlayer(dt);
    this._updateAmbient(dt);
    this._updateHint(dt);
    this._updateBursts(dt);

    // invulnerability flash resets
    if (this.player) {
      this.player.invuln = Math.max(0, this.player.invuln - dt);
    }
  }

  _updateAmbient (dt) {
    const t = this.elapsed;
    for (const m of this.motes) {
      const pos = m.obj.geometry.attributes.position;
      const base = m.base;
      const speed = m.speed || 0.2;
      for (let i = 0; i < pos.count; i++) {
        if (m.falling) {
          let y = pos.array[i * 3 + 1] - dt * speed * (0.8 + (i % 5) * 0.08);
          pos.array[i * 3] = base[i * 3] + Math.sin(t * 0.3 + i) * 0.4;
          pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.23 + i) * 0.3;
          if (y < -1.2) y = 6.5;
          pos.array[i * 3 + 1] = y;
        } else {
          pos.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.4 + i * 0.5) * 0.3;
        }
      }
      pos.needsUpdate = true;
    }
    for (const b of this.paperBits) {
      b.obj.position.y = b.baseY + Math.sin(t * 0.7 + b.phase) * b.amp;
      b.obj.rotation.x += dt * b.spin * 0.4;
      b.obj.rotation.z += dt * b.spin;
    }
    for (const c of this.clouds) {
      if (c.islet) {
        c.obj.position.y = c.baseY + Math.sin(t * 0.4 + c.phase) * 0.12;
        if (c.prop) c.prop.position.y = c.obj.position.y + 0.02;
      } else {
        c.obj.position.x = c.baseX + Math.sin(t * c.speed + c.phase) * 0.5;
      }
    }
    for (const c of this.cranes) {
      const a = t * c.speed + c.phase;
      c.obj.position.x = Math.sin(a) * c.radius * 2.6;
      c.obj.position.z = Math.cos(a) * c.radius * 1.6;
      c.obj.position.y = c.height + Math.sin(a * 1.3) * 0.2;
      c.obj.rotation.y = -a * 1.1 + Math.PI;
      const wings = c.obj.userData.wings || [];
      wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 2 + i) * 0.18; });
    }
    if (this.exit) {
      if (this.exit.anchor) {
        this.exit.anchor.getWorldPosition(TMP);
        // Keep the seal above whatever surface the folded paper presents —
        // even after a 180° fold where the paper's original "up" faces down.
        const surface = this._groundAt(TMP.x, TMP.z, TMP.y + 2.5);
        const y = surface ? surface.y : TMP.y;
        this.exit.group.position.set(TMP.x, y + 0.015 + Math.sin(t * 1.4) * 0.02, TMP.z);
      }
      const d = this.exit.group.userData.diamond;
      if (d) { d.rotation.y = t * 0.8; d.position.y = 0.13 + Math.sin(t * 1.3) * 0.04; }
      const gl = this.exit.group.userData.glow;
      if (gl) gl.material.opacity = 0.4 + Math.sin(t * 1.8) * 0.12;
    }
    for (const star of this.stars) if (!star.collected) this._positionStar(star);
    if (this.backStars) this.backStars.rotation.y = t * 0.004;
  }

  _updateHint (dt) {
    if (!this.hintGuide) return;
    const glint = this.hintGuide.userData.glint;
    if (glint && this.hintGuide.userData.axis) {
      const len = this.hintGuide.userData.len || 4;
      const t = (this.elapsed * 0.5) % 1;
      const p = -len / 2 + t * len;
      if (this.hintGuide.userData.axis === 'x') glint.position.set(0, 0.02, p);
      else glint.position.set(p, 0.02, 0);
    }
  }

  _updateBursts (dt) {
    for (let i = this.sparkBursts.length - 1; i >= 0; i--) {
      const b = this.sparkBursts[i];
      b.life -= dt;
      const k = b.life / b.max;
      if (b.obj.material) b.obj.material.opacity = Math.max(0, k);
      if (b.vel) {
        const pos = b.obj.geometry.attributes.position;
        for (let j = 0; j < pos.count; j++) {
          pos.array[j * 3] += b.vel[j].x * dt;
          pos.array[j * 3 + 1] += b.vel[j].y * dt;
          pos.array[j * 3 + 2] += b.vel[j].z * dt;
          if (b.gravity) b.vel[j].y -= 2.8 * dt;
        }
        pos.needsUpdate = true;
      } else if (b.rise) {
        b.obj.position.y += dt * 0.4;
      }
      if (b.life <= 0) {
        this.worldGroup?.remove(b.obj);
        b.obj.geometry.dispose();
        b.obj.material.dispose();
        this.sparkBursts.splice(i, 1);
      }
    }
  }

  _startNothing () {}

  _stopFoldSound () {
    this.sound?.stopFold();
  }

  // =========================================================================
  // Public controls
  // =========================================================================
  pause () {
    if (this.mode !== 'game' || this.completed) return;
    this.paused = true;
    this.sound.stopFold();
    this.emit('paused', {});
  }

  resume () {
    if (this.mode !== 'game') return;
    this.paused = false;
    this.emit('resumed', {});
  }

  restart () {
    if (!this.level) return;
    const index = this.levelIndex;
    this._completeSent = false;
    this.startLevel(index);
    this.emit('restarted', {});
  }

  setSkin (id) {
    const skin = skinById(id);
    this.skinId = id;
    this.skin = skin;
    if (this.mode === 'menu') {
      this._buildMenuScene();
    } else if (this.player) {
      const parent = this.player.root.parent;
      parent?.remove(this.player.root);
      const fresh = P.createPlayer(skin);
      fresh.position.copy(this.player.pos);
      this.scene.add(fresh);
      this.player.root = fresh;
    }
  }

  setMode (mode) {
    this.mode = mode;
    if (mode === 'menu') {
      this.paused = false;
      this._stopFoldSound();
      this.emit('mode', { mode });
    } else {
      this.emit('mode', { mode });
    }
  }

  returnToMenu () {
    this._stopFoldSound();
    this._disposeLevel();
    this.mode = 'menu';
    this.paused = false;
    this.completed = false;
    this.pendingCrease = null;
    this.fold = null;
    this.pointerState = null;
    this.emit('mode', { mode: 'menu' });
  }

  setReducedMotion (v) {
    this.reducedMotion = !!v;
  }

  getState () {
    return {
      mode: this.mode,
      level: this.levelIndex,
      paused: this.paused,
      completed: this.completed,
      stars: this.starCount,
      folds: this.foldsMade,
      pendingCrease: this.pendingCrease ? { ...this.pendingCrease, panel: undefined } : null,
      player: this.player ? { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z, grounded: this.player.grounded, falling: this.player.falling } : null,
      fold: this.fold ? { angle: this.fold.angle, axis: this.fold.axis, coord: this.fold.coord, sign: this.fold.sign, settled: this.fold.settled } : null,
      exit: this.exit ? { x: this.exit.group.position.x, y: this.exit.group.position.y, z: this.exit.group.position.z } : null,
    };
  }

  getHintData (index = this.hintIndex) {
    return this.level?.hints?.[index] || null;
  }

  // debug helpers used by automated checks
  debugFold (sheetIndex, axis, coord, sign, angle = 45) {
    if (this.mode !== 'game') return false;
    const panel = this.sheetPanels[sheetIndex];
    if (!panel || !panel.foldable || panel.fold) return false;
    const pending = { panel, axis, coord };
    const fold = this._beginFold(pending, sign);
    if (!fold) return false;
    fold.animating = false;
    fold.angle = angle;
    this._setFoldAngleRaw(fold, angle);
    this._onFoldSettled(fold);
    return true;
  }

  debugTeleport (x, z) {
    if (!this.player) return;
    const g = this._groundAt(x, z, 8);
    if (g) {
      this.player.pos.set(x, g.y, z);
      this.player.groundY = g.y;
      this.player.grounded = true;
      this.player.falling = false;
      this.player.vel.set(0, 0, 0);
      this.player.root.position.copy(this.player.pos);
    }
  }

  debugComplete () {
    if (this.level) this._completeLevel();
  }

  _onResize () {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    if (this.canvas) {
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }
    if (this.menuCamera) {
      this.menuCamera.aspect = w / h;
      this.menuCamera.updateProjectionMatrix();
      this._placeMenuCamera();
    }
    if (this.mode !== 'menu' && this.level) {
      this._frameLevel();
    }
  }
}

function mulberry (a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
