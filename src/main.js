import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './world.js';
import { Effects } from './effects.js';
import { Enemy } from './enemies.js';
import { createRifle, createRifleGLB, createPistol } from './weapons.js';
import { SoundEngine } from './audio.js';
import { clamp, lerp, rng } from './textures.js';

const $ = (id) => document.getElementById(id);
const dom = {
  hud: $('hud'), startScreen: $('startScreen'), startButton: $('startButton'), briefButton: $('briefButton'),
  briefModal: $('briefModal'), briefClose: $('briefClose'), pauseScreen: $('pauseScreen'), pauseScore: $('pauseScore'),
  pauseKills: $('pauseKills'), pauseWave: $('pauseWave'), resumeButton: $('resumeButton'), quitButton: $('quitButton'),
  endScreen: $('endScreen'), endCard: document.querySelector('.end-card'), endKicker: $('endKicker'), endTitle: $('endTitle'),
  endSub: $('endSub'), endScore: $('endScore'), endKills: $('endKills'), endAccuracy: $('endAccuracy'), endTime: $('endTime'),
  restartButton: $('restartButton'), menuButton: $('menuButton'), touchControls: $('touchControls'),
  score: $('score'), kills: $('kills'), accuracy: $('accuracy'), clock: $('clock'), objectiveText: $('objectiveText'),
  waveLabel: $('waveLabel'), threatLabel: $('threatLabel'), waveProgress: $('waveProgress'), healthVal: $('healthVal'),
  armorVal: $('armorVal'), healthFill: $('healthFill'), armorFill: $('armorFill'), magVal: $('magVal'),
  reserveVal: $('reserveVal'), weaponName: $('weaponName'), fireMode: $('fireMode'), grenadeVal: $('grenadeVal'),
  reloadState: $('reloadState'), reticle: $('reticle'), hitmarker: $('hitmarker'), damageVignette: $('damageVignette'),
  lowHealth: $('lowHealth'), damageArrow: $('damageArrow'), waveBanner: $('waveBanner'), bannerTitle: $('bannerTitle'),
  bannerSub: $('bannerSub'), eventFeed: $('eventFeed'), xpLayer: $('xpLayer'), killFeed: $('killFeed'),
  compass: $('compass'), radar: $('radar'), toast: $('toast')
};

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.03, 400);
camera.rotation.order = 'YXZ';
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.52, 0.6, 0.78);
composer.addPass(bloom);

const gradeUniforms = {
  tDiffuse: { value: null },
  time: { value: 0 },
  hurt: { value: 0 }
};
const gradePass = new ShaderPass({
  uniforms: gradeUniforms,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float hurt; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float d = length(c);
      float ca = 0.0014 * d * d;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;
      float vig = 1.0 - smoothstep(0.42, 0.92, d) * 0.56;
      col *= vig;
      col = (col - 0.5) * 1.075 + 0.5;
      col += vec3(0.012, 0.004, -0.005);
      float n = hash(uv * vec2(1920.0, 1080.0) + time * 61.0);
      col += (n - 0.5) * 0.026;
      float scan = sin(uv.y * 900.0 + time * 2.0) * 0.0035;
      col += scan;
      col.r += hurt * 0.035 * smoothstep(0.35, 0.8, d);
      col.b -= hurt * 0.02 * smoothstep(0.35, 0.8, d);
      gl_FragColor = vec4(col, 1.0);
    }
  `
});
composer.addPass(gradePass);
composer.addPass(new OutputPass());

// ---------- game state ----------
const audio = new SoundEngine();
const world = createWorld(scene, renderer);
const effects = new Effects(scene);

const player = {
  pos: new THREE.Vector3(0, 0, 19),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  eyeHeight: 1.68,
  crouching: false,
  onGround: true,
  health: 100,
  maxHealth: 100,
  armor: 75,
  maxArmor: 100,
  dead: false,
  lastDamage: -99,
  radius: 0.42,
  bob: 0,
  shake: 0,
  shakeDecay: 0,
  sprinting: false
};

const state = {
  mode: 'menu',
  wave: 0,
  maxWaves: 6,
  waveActive: false,
  pendingSpawns: 0,
  spawnTimer: 0,
  waveKilled: 0,
  waveTotal: 0,
  nextWaveTimer: 0,
  score: 0,
  kills: 0,
  headshots: 0,
  shots: 0,
  hits: 0,
  startTime: 0,
  elapsed: 0,
  grenades: 3,
  paused: false,
  pointerLocked: false,
  dragging: false,
  lastFrame: performance.now(),
  time: 0,
  damageFlash: 0,
  arrowAngle: 0,
  lowHealth: false,
  menuTime: 0,
  toastTimer: 0
};

const enemies = [];
const enemyShootables = [];
const grenades = [];
let boss = null;

const WEAPONS = {
  rifle: {
    name: 'M4A1 // VANGUARD', short: 'M4A1', mode: 'AUTO', mag: 30, magSize: 30, reserve: 180,
    reserveMax: 270, damage: 26, rpm: 720, auto: true, reloadTime: 1.7, baseSpread: 0.006, adsSpread: 0.0012,
    recoil: 0.009, adsRecoil: 0.005
  },
  pistol: {
    name: 'P226 // SIDEARM', short: 'P226', mode: 'SEMI', mag: 12, magSize: 12, reserve: 96,
    reserveMax: 144, damage: 43, rpm: 430, auto: false, reloadTime: 1.25, baseSpread: 0.008, adsSpread: 0.002,
    recoil: 0.014, adsRecoil: 0.008
  }
};

const weaponState = {
  current: 'rifle',
  ads: false,
  adsT: 0,
  reloading: false,
  reloadT: 0,
  nextFire: 0,
  mouseDown: false,
  mouse2: false,
  recoilKick: 0,
  recoilYaw: 0,
  swayX: 0,
  swayY: 0,
  switchT: 0,
  flashT: 0,
  shakeT: 0
};

// ---------- weapons ----------
const weaponRig = new THREE.Group();
weaponRig.scale.setScalar(0.72);
camera.add(weaponRig);
const weaponFill = new THREE.PointLight(0xdae8ff, 2.2, 2.6, 2);
weaponFill.position.set(0.5, 0.38, 0.15);
camera.add(weaponFill);
const weaponFill2 = new THREE.PointLight(0x8fc4ff, 0.9, 2.8, 2);
weaponFill2.position.set(-0.5, 0.05, -0.12);
camera.add(weaponFill2);
const weaponRim = new THREE.PointLight(0xffc890, 1.4, 2.4, 2);
weaponRim.position.set(0.05, -0.28, -0.72);
camera.add(weaponRim);
let rifle;
try {
  rifle = await createRifleGLB('./assets/models/lvoa.glb');
} catch (err) {
  console.warn('GLB rifle unavailable, using procedural rifle', err);
  rifle = createRifle();
}
const pistol = createPistol();
weaponRig.add(rifle, pistol);
pistol.visible = false;
const weaponModels = { rifle, pistol };
const weaponBase = {
  rifle: new THREE.Vector3(0.315, -0.215, -0.92),
  pistol: new THREE.Vector3(0.31, -0.215, -0.83)
};
const weaponAds = {
  rifle: new THREE.Vector3(0.0, -0.115, -0.72),
  pistol: new THREE.Vector3(0.0, -0.105, -0.66)
};

const raycaster = new THREE.Raycaster();
raycaster.far = 160;
const center = new THREE.Vector2(0, 0);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// ---------- helpers ----------
function blockedAt(x, z, radius = player.radius) {
  for (const c of world.colliders) {
    if (x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius) return true;
  }
  return false;
}

function panFor(pos) {
  camera.getWorldDirection(_forward);
  _right.crossVectors(_forward, _up).normalize();
  _v.subVectors(pos, camera.position);
  const d = Math.max(0.001, _v.length());
  return clamp(_v.dot(_right) / d, -1, 1) * 0.8;
}

function makeEnemy(position, isBoss = false) {
  const e = new Enemy({
    scene, effects, audio, game: {
      player,
      worldShootables: world.worldShootables,
      enemyShootables,
      blockedAt,
      panFor,
      damagePlayer,
      spawnMinions,
      onEnemyKilled
    },
    position, boss: isBoss, wave: state.wave
  });
  enemies.push(e);
  return e;
}

function showToast(text, time = 2.2) {
  dom.toast.textContent = text;
  dom.toast.classList.add('show');
  state.toastTimer = time;
}

function addFeed(html, target = dom.killFeed) {
  const el = document.createElement('div');
  el.className = 'feed-item';
  el.innerHTML = html;
  target.appendChild(el);
  setTimeout(() => el.remove(), 4200);
  while (target.children.length > 6) target.firstChild.remove();
}

function addEvent(html) {
  addFeed(html, dom.eventFeed);
}

function showBanner(kicker, title, sub) {
  document.querySelector('.banner-kicker').textContent = kicker;
  dom.bannerTitle.textContent = title;
  dom.bannerSub.textContent = sub;
  dom.waveBanner.classList.remove('show');
  void dom.waveBanner.offsetWidth;
  dom.waveBanner.classList.add('show');
}

function spawnXp(text, worldPos, headshot = false) {
  _v.copy(worldPos).project(camera);
  const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
  if (_v.z > 1 || _v.z < -1) return;
  const el = document.createElement('div');
  el.className = 'xp-pop' + (headshot ? ' head' : '');
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.textContent = text;
  dom.xpLayer.appendChild(el);
  setTimeout(() => el.remove(), 1050);
}

// ---------- audio / pointer ----------
function initAudio() {
  audio.init();
}

function requestLock() {
  if (state.mode !== 'playing') return;
  const el = renderer.domElement;
  try {
    const p = el.requestPointerLock?.();
    if (p && p.catch) p.catch(() => {});
  } catch { /* drag-look fallback stays available */ }
}

function clearInputState() {
  keys.clear();
  weaponState.mouseDown = false;
  weaponState.mouse2 = false;
  player.vel.x = 0;
  player.vel.z = 0;
  player.sprinting = false;
  state.dragging = false;
  touchMove.x = 0;
  touchMove.y = 0;
  touchActive = false;
  $('moveStick')?.querySelector('span')?.style.removeProperty('transform');
  $('adsTouch')?.classList.remove('active');
}

function pauseGame() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  state.paused = true;
  clearInputState();
  dom.pauseScreen.classList.remove('hidden');
  dom.pauseScore.textContent = String(state.score);
  dom.pauseKills.textContent = String(state.kills);
  dom.pauseWave.textContent = String(Math.max(1, state.wave));
  if (document.pointerLockElement) document.exitPointerLock();
  audio.ui();
}

function resumeGame() {
  if (state.mode !== 'paused') return;
  clearInputState();
  state.mode = 'playing';
  state.paused = false;
  dom.pauseScreen.classList.add('hidden');
  initAudio();
  requestLock();
  audio.ui();
}

function startGame() {
  initAudio();
  state.mode = 'playing';
  state.paused = false;
  state.wave = 0;
  state.waveActive = false;
  state.pendingSpawns = 0;
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.waveKilled = 0;
  state.waveTotal = 0;
  state.nextWaveTimer = 0;
  state.score = 0;
  state.kills = 0;
  state.headshots = 0;
  state.shots = 0;
  state.hits = 0;
  state.grenades = 3;
  state.startTime = performance.now();
  state.elapsed = 0;
  state.toastTimer = 0;
  player.pos.set(0, 0, 19);
  player.vel.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = -0.015;
  player.health = 100;
  player.armor = 75;
  player.dead = false;
  player.lastDamage = -99;
  player.shake = 0;
  player.crouching = false;
  player.eyeHeight = 1.68;
  for (const e of enemies) {
    e.finished = true;
    scene.remove(e.root);
  }
  enemies.length = 0;
  enemyShootables.length = 0;
  boss = null;
  for (const g of grenades) scene.remove(g.mesh);
  grenades.length = 0;
  WEAPONS.rifle.mag = WEAPONS.rifle.magSize;
  WEAPONS.rifle.reserve = 180;
  WEAPONS.pistol.mag = WEAPONS.pistol.magSize;
  WEAPONS.pistol.reserve = 96;
  weaponState.current = 'rifle';
  weaponState.reloading = false;
  weaponState.reloadT = 0;
  weaponState.ads = false;
  weaponState.adsT = 0;
  weaponState.mouseDown = false;
  weaponState.mouse2 = false;
  weaponState.recoilKick = 0;
  weaponState.recoilYaw = 0;
  weaponState.nextFire = 0;
  weaponRig.visible = true;
  rifle.visible = true;
  pistol.visible = false;
  dom.startScreen.classList.add('hidden');
  dom.pauseScreen.classList.add('hidden');
  dom.endScreen.classList.add('hidden');
  dom.briefModal.classList.add('hidden');
  dom.hud.classList.remove('hidden');
  dom.toast.classList.remove('show');
  document.body.classList.remove('menu-mode');
  camera.fov = 74;
  camera.updateProjectionMatrix();
  updateHUD();
  refreshWeaponHUD();
  startWave(1);
  requestLock();
  audio.ui();
}

function showMenu() {
  window.location.reload();
}

function gameOver() {
  if (player.dead) return;
  player.dead = true;
  state.mode = 'ended';
  clearInputState();
  if (document.pointerLockElement) document.exitPointerLock();
  audio.hurt();
  setTimeout(() => showEnd(false), 900);
}

function startVictory() {
  if (state.mode !== 'playing') return;
  state.mode = 'ended';
  clearInputState();
  if (document.pointerLockElement) document.exitPointerLock();
  setTimeout(() => showEnd(true), 1600);
}

function showEnd(victory) {
  dom.endScreen.classList.remove('hidden');
  dom.endCard.classList.toggle('win', victory);
  dom.endKicker.textContent = victory ? 'MISSION COMPLETE' : 'MISSION FAILED';
  dom.endTitle.textContent = victory ? 'EXTRACTED' : 'KIA';
  dom.endSub.textContent = victory
    ? 'The Warden is down. Relay secured. Extraction is inbound.'
    : 'The relay has fallen. Sector 07 is dark.';
  dom.endScore.textContent = String(state.score).padStart(6, '0');
  dom.endKills.textContent = String(state.kills);
  const acc = state.shots ? Math.round((state.hits / state.shots) * 100) : 0;
  dom.endAccuracy.textContent = `${acc}%`;
  dom.endTime.textContent = formatTime(state.elapsed);
  dom.hud.classList.add('hidden');
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- input ----------
const keys = new Set();

window.addEventListener('keydown', (ev) => {
  if (ev.repeat) return;
  if (ev.code === 'Escape') {
    if (state.mode === 'playing') { pauseGame(); ev.preventDefault(); return; }
    if (state.mode === 'paused') { resumeGame(); ev.preventDefault(); return; }
  }
  if (state.mode !== 'playing') return;
  switch (ev.code) {
    case 'KeyW': case 'KeyA': case 'KeyS': case 'KeyD':
    case 'ShiftLeft': case 'ShiftRight': case 'Space':
      keys.add(ev.code); ev.preventDefault(); break;
    case 'KeyC':
      player.crouching = !player.crouching; audio.ui(); break;
    case 'KeyR':
      reloadWeapon(); break;
    case 'KeyG':
      throwGrenade(); break;
    case 'Digit1':
      switchWeapon('rifle'); break;
    case 'Digit2':
      switchWeapon('pistol'); break;
    case 'KeyM':
      audio.setMuted(!audio.muted);
      showToast(audio.muted ? 'AUDIO MUTED' : 'AUDIO ONLINE');
      break;
    case 'KeyP':
      pauseGame(); break;
  }
});

window.addEventListener('keyup', (ev) => {
  keys.delete(ev.code);
});

window.addEventListener('mousemove', (ev) => {
  if (state.mode !== 'playing') return;
  if (!state.pointerLocked && !state.dragging) return;
  const sens = 0.00205 * (weaponState.adsT > 0.5 ? 0.72 : 1);
  player.yaw -= ev.movementX * sens;
  player.pitch = clamp(player.pitch - ev.movementY * sens, -1.46, 1.46);
  weaponState.swayX = lerp(weaponState.swayX, clamp(-ev.movementX * 0.00032, -0.016, 0.016), 0.22);
  weaponState.swayY = lerp(weaponState.swayY, clamp(-ev.movementY * 0.00026, -0.012, 0.012), 0.22);
});

window.addEventListener('mousedown', (ev) => {
  if (state.mode !== 'playing') return;
  if (!state.pointerLocked) {
    if (ev.target === renderer.domElement) {
      requestLock();
      state.dragging = true;
    }
    return;
  }
  if (ev.button === 0) {
    weaponState.mouseDown = true;
    if (!WEAPONS[weaponState.current].auto) attemptFire();
  } else if (ev.button === 2) {
    weaponState.mouse2 = true;
  }
});

window.addEventListener('mouseup', (ev) => {
  state.dragging = false;
  if (ev.button === 0) weaponState.mouseDown = false;
  if (ev.button === 2) weaponState.mouse2 = false;
});

window.addEventListener('wheel', (ev) => {
  if (state.mode !== 'playing') return;
  switchWeapon(weaponState.current === 'rifle' ? 'pistol' : 'rifle');
});

window.addEventListener('contextmenu', (ev) => ev.preventDefault());

document.addEventListener('pointerlockchange', () => {
  state.pointerLocked = document.pointerLockElement === renderer.domElement;
  if (!state.pointerLocked && state.mode === 'playing') pauseGame();
});

document.addEventListener('pointerlockerror', () => {
  state.pointerLocked = false;
});

window.addEventListener('blur', clearInputState);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing') pauseGame();
  else if (document.hidden) clearInputState();
});

renderer.domElement.addEventListener('click', () => {
  if (state.mode === 'playing' && !state.pointerLocked) requestLock();
});

dom.startButton.addEventListener('click', startGame);
dom.restartButton.addEventListener('click', () => window.location.reload());
dom.menuButton.addEventListener('click', showMenu);
dom.resumeButton.addEventListener('click', resumeGame);
dom.quitButton.addEventListener('click', showMenu);
dom.briefButton.addEventListener('click', () => {
  dom.briefModal.classList.remove('hidden');
  audio.init(); audio.ui();
});
dom.briefClose.addEventListener('click', () => dom.briefModal.classList.add('hidden'));

// ---------- weapons ----------
function currentWeapon() { return WEAPONS[weaponState.current]; }
function currentModel() { return weaponModels[weaponState.current]; }

function refreshWeaponHUD() {
  const w = currentWeapon();
  dom.weaponName.textContent = w.name;
  dom.magVal.textContent = String(w.mag).padStart(2, '0');
  dom.magVal.classList.toggle('empty', w.mag === 0);
  dom.reserveVal.textContent = String(w.reserve);
  dom.fireMode.textContent = w.mode;
  dom.grenadeVal.textContent = `FRAG x${state.grenades}`;
  dom.reloadState.textContent = weaponState.reloading ? 'RELOADING' : (w.mag === 0 ? 'EMPTY' : 'READY');
  document.querySelectorAll('.loadout .slot').forEach(slot => {
    const slotName = slot.dataset.slot;
    slot.classList.toggle('active', (slotName === '1' && weaponState.current === 'rifle') || (slotName === '2' && weaponState.current === 'pistol'));
  });
}

function switchWeapon(name) {
  if (state.mode !== 'playing' || name === weaponState.current) return;
  if (weaponState.reloading) return;
  weaponState.current = name;
  weaponState.ads = false;
  weaponState.switchT = 0.3;
  weaponModels.rifle.visible = name === 'rifle';
  weaponModels.pistol.visible = name === 'pistol';
  refreshWeaponHUD();
  audio.ui();
}

function reloadWeapon() {
  if (state.mode !== 'playing' || weaponState.reloading) return;
  const w = currentWeapon();
  if (w.mag >= w.magSize || w.reserve <= 0) return;
  weaponState.reloading = true;
  weaponState.reloadT = w.reloadTime;
  weaponState.ads = false;
  dom.reloadState.textContent = 'RELOADING';
  audio.reload();
}

function finishReload() {
  const w = currentWeapon();
  const need = w.magSize - w.mag;
  const take = Math.min(need, w.reserve);
  w.mag += take;
  w.reserve -= take;
  weaponState.reloading = false;
  weaponState.reloadT = 0;
  refreshWeaponHUD();
}

function attemptFire() {
  if (state.mode !== 'playing' || player.dead || weaponState.reloading || weaponState.switchT > 0.12) return;
  const now = performance.now() / 1000;
  if (now < weaponState.nextFire) return;
  const w = currentWeapon();
  if (w.mag <= 0) {
    audio.dryFire();
    reloadWeapon();
    return;
  }
  weaponState.nextFire = now + 60 / w.rpm;
  w.mag--;
  state.shots++;

  camera.getWorldDirection(_forward);
  _right.crossVectors(_forward, _up).normalize();
  const up2 = _v3.crossVectors(_right, _forward).normalize();
  const moveSpeed = Math.hypot(player.vel.x, player.vel.z);
  let spread = lerp(w.baseSpread, w.adsSpread, weaponState.adsT) + Math.min(0.016, moveSpeed * 0.0012);
  if (player.sprinting) spread += 0.014;
  if (!player.onGround) spread += 0.012;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * spread;
  const dir = _v.copy(_forward).addScaledVector(_right, Math.cos(a) * r).addScaledVector(up2, Math.sin(a) * r).normalize();

  raycaster.set(camera.position, dir);
  const allTargets = enemyShootables.concat(world.worldShootables);
  const hits = raycaster.intersectObjects(allTargets, false);
  const hit = hits[0];
  const model = currentModel();
  const muzzle = model.userData.muzzle;
  muzzle.getWorldPosition(_v2);
  const end = hit ? hit.point : _v2.clone().addScaledVector(dir, 120);

  effects.tracer(_v2.clone(), end, 0xffc87a, 0.008, 0.065);
  effects.flash(_v2.clone(), 0xffc070, weaponState.adsT > 0.5 ? 0.34 : 0.46, 0.045);
  model.userData.muzzleFlash.visible = true;
  model.userData.muzzleFlash.scale.setScalar((weaponState.adsT > 0.5 ? 0.3 : 0.48) * rng(0.8, 1.2));
  model.userData.flashLight.intensity = 7;
  weaponState.flashT = 0.05;

  const eject = model.userData.eject;
  eject.getWorldPosition(_v);
  effects.casing(_v.clone(), dir);

  if (hit) {
    const obj = hit.object;
    if (obj.userData && obj.userData.enemy) {
      const enemy = obj.userData.enemy;
      const result = enemy.hit(w.damage, obj.userData.part, hit.point);
      state.hits++;
      showHitmarker(result.headshot);
      audio.hit();
      if (result.headshot) audio.headshot();
      if (!result.killed) {
        spawnXp(result.headshot ? `HEADSHOT +${Math.round(w.damage * 3)}` : `+${w.damage}`, hit.point, result.headshot);
      }
    } else {
      const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : _v3.set(0, 1, 0);
      effects.impact(hit.point, normal, obj.userData && obj.userData.explosive ? 0xff5533 : 0xffb060);
      audio.impact();
      if (obj.userData && obj.userData.explosive) damageBarrel(obj, w.damage);
    }
  }

  player.pitch = clamp(player.pitch + w.recoil * (1 - weaponState.adsT * 0.35), -1.46, 1.46);
  player.yaw += rng(-0.0025, 0.0025);
  weaponState.recoilKick += w.recoil * (1 - weaponState.adsT * 0.3);
  weaponState.recoilYaw += rng(-1, 1) * w.recoil * 0.9;
  player.shake = Math.max(player.shake, 0.018);
  audio.shot(0);
  refreshWeaponHUD();
}

function showHitmarker(headshot) {
  dom.hitmarker.classList.remove('show', 'head');
  void dom.hitmarker.offsetWidth;
  dom.hitmarker.classList.add('show');
  if (headshot) dom.hitmarker.classList.add('head');
}

function updateWeapon(dt) {
  const w = currentWeapon();
  if (state.mode !== 'playing') {
    weaponRig.visible = false;
    return;
  }
  weaponRig.visible = true;
  const model = currentModel();
  if (weaponState.switchT > 0) weaponState.switchT -= dt;
  if (weaponState.flashT > 0) {
    weaponState.flashT -= dt;
    if (weaponState.flashT <= 0) {
      model.userData.muzzleFlash.visible = false;
      model.userData.flashLight.intensity = 0;
    }
  }

  if (weaponState.reloading) {
    weaponState.reloadT -= dt;
    if (weaponState.reloadT <= 0) finishReload();
  }

  const wantAds = weaponState.mouse2 && !weaponState.reloading && !player.sprinting;
  weaponState.ads = wantAds;
  weaponState.adsT = lerp(weaponState.adsT, wantAds ? 1 : 0, Math.min(1, dt * 12));

  const moveSpeed = Math.hypot(player.vel.x, player.vel.z);
  const bobScale = player.onGround ? Math.min(1, moveSpeed / 6) : 0.2;
  const bob = state.time * (player.sprinting ? 13 : 9.5);
  const bobX = Math.sin(bob) * 0.008 * bobScale * (1 - weaponState.adsT * 0.7);
  const bobY = Math.abs(Math.cos(bob)) * 0.006 * bobScale * (1 - weaponState.adsT * 0.7);

  weaponState.recoilKick = Math.max(0, weaponState.recoilKick - dt * 2.2);
  weaponState.recoilYaw = lerp(weaponState.recoilYaw, 0, Math.min(1, dt * 12));
  weaponState.swayX = lerp(weaponState.swayX, 0, Math.min(1, dt * 7));
  weaponState.swayY = lerp(weaponState.swayY, 0, Math.min(1, dt * 7));

  const base = weaponBase[weaponState.current];
  const ads = weaponAds[weaponState.current];
  const target = _v.copy(base).lerp(ads, weaponState.adsT);
  const reloadDip = weaponState.reloading ? Math.sin(Math.min(1, 1 - weaponState.reloadT / w.reloadTime) * Math.PI) : 0;
  target.x += bobX + weaponState.swayX;
  target.y += bobY + weaponState.swayY - reloadDip * 0.16 - weaponState.recoilKick * 0.014;
  target.z += weaponState.recoilKick * 0.16;
  weaponRig.position.lerp(target, Math.min(1, dt * 16));
  weaponRig.rotation.x = lerp(weaponRig.rotation.x, 0.015 + weaponState.recoilKick * 0.8 + reloadDip * 0.55, Math.min(1, dt * 14));
  const baseYaw = lerp(0.34, 0.0, weaponState.adsT);
  weaponRig.rotation.y = lerp(weaponRig.rotation.y, baseYaw + weaponState.recoilYaw + weaponState.swayX * 1.2 - reloadDip * 0.12, Math.min(1, dt * 14));
  weaponRig.rotation.z = lerp(weaponRig.rotation.z, 0.012 + reloadDip * 0.5 + bobX * 0.9, Math.min(1, dt * 14));

  const fov = weaponState.adsT > 0.02 ? lerp(74, 54, weaponState.adsT) : (player.sprinting ? 80 : 74);
  camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 8));
  camera.updateProjectionMatrix();

  dom.reticle.classList.toggle('ads', weaponState.adsT > 0.45);
  dom.reticle.classList.toggle('wide', weaponState.reloading || player.sprinting);
  const spreadScale = 1 + (weaponState.adsT > 0.45 ? -0.25 : 0) + (player.sprinting ? 0.55 : 0) + weaponState.recoilKick * 4;
  dom.reticle.style.transform = `translate(-50%, -50%) scale(${spreadScale.toFixed(3)})`;

  if (weaponState.mouseDown && w.auto && !weaponState.reloading) attemptFire();
}

// ---------- grenades / explosives ----------
function throwGrenade() {
  if (state.grenades <= 0 || state.mode !== 'playing') return;
  const now = performance.now() / 1000;
  if (weaponState.nextGrenade && now < weaponState.nextGrenade) return;
  weaponState.nextGrenade = now + 0.8;
  state.grenades--;
  camera.getWorldDirection(_forward);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 0.55, metalness: 0.4 }));
  mesh.position.copy(camera.position).addScaledVector(_forward, 0.5);
  mesh.castShadow = true;
  scene.add(mesh);
  grenades.push({
    mesh, fuse: 2.25,
    vel: _forward.clone().multiplyScalar(15).add(new THREE.Vector3(0, 4.2, 0))
  });
  audio.tone({ freq: 420, end: 280, duration: 0.09, volume: 0.12, type: 'square' });
  refreshWeaponHUD();
  showToast('FRAG OUT');
}

function explosionDamage(pos, radius, maxDamage, selfFactor = 0.5) {
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0.2) continue;
    const d = e.root.position.distanceTo(pos);
    if (d < radius) {
      const dmg = maxDamage * (1 - d / radius) + 15;
      e.hit(dmg, 'body', e.root.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    }
  }
  for (const b of world.explosives) {
    if (b.exploded) continue;
    if (b.position.distanceTo(pos) < radius * 0.75) {
      setTimeout(() => { if (!b.exploded) explodeBarrel(b); }, 140 + Math.random() * 120);
    }
  }
  const pd = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z);
  if (pd < radius && !player.dead) damagePlayer(maxDamage * selfFactor * (1 - pd / radius), pos, false);
}

function explodeBarrel(b) {
  if (b.exploded) return;
  b.exploded = true;
  b.mesh.visible = false;
  const index = world.worldShootables.indexOf(b.mesh);
  if (index >= 0) world.worldShootables.splice(index, 1);
  for (let i = world.colliders.length - 1; i >= 0; i--) {
    if (world.colliders[i].mesh === b.mesh) world.colliders.splice(i, 1);
  }
  const pos = b.position.clone().add(new THREE.Vector3(0, 0.8, 0));
  effects.explosion(pos, 8);
  audio.explosion();
  player.shake = Math.max(player.shake, 0.6);
  explosionDamage(pos, 8.5, 150, 0.42);
}

function damageBarrel(mesh, damage) {
  const b = world.explosives.find(x => x.mesh === mesh && !x.exploded);
  if (!b) return;
  b.hp -= damage;
  effects.spark(b.position.clone().add(new THREE.Vector3(0, 0.7, 0)), 0xff6a3a, 8, 4, 0.35, 10);
  if (b.hp <= 0) {
    setTimeout(() => explodeBarrel(b), 80);
  }
}

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.fuse -= dt;
    g.vel.y -= 18 * dt;
    const nextX = g.mesh.position.x + g.vel.x * dt;
    const nextZ = g.mesh.position.z + g.vel.z * dt;
    if (blockedAt(nextX, g.mesh.position.z, 0.14)) g.vel.x *= -0.55;
    else g.mesh.position.x = nextX;
    if (blockedAt(g.mesh.position.x, nextZ, 0.14)) g.vel.z *= -0.55;
    else g.mesh.position.z = nextZ;
    g.mesh.position.y += g.vel.y * dt;
    if (g.mesh.position.y < 0.14) {
      g.mesh.position.y = 0.14;
      g.vel.y *= -0.55;
      g.vel.x *= 0.85; g.vel.z *= 0.85;
      if (Math.abs(g.vel.y) < 0.5) g.vel.y = 0;
    }
    g.mesh.rotation.x += dt * 8;
    g.mesh.rotation.z += dt * 5;
    if (g.fuse <= 0) {
      const pos = g.mesh.position.clone();
      scene.remove(g.mesh);
      g.mesh.geometry.dispose();
      g.mesh.material.dispose();
      grenades.splice(i, 1);
      effects.explosion(pos, 8);
      audio.explosion();
      player.shake = Math.max(player.shake, 0.7);
      explosionDamage(pos, 8.5, 150, 0.42);
    }
  }
}

// ---------- player damage ----------
function damagePlayer(amount, sourcePos = null, ranged = false) {
  if (state.mode !== 'playing' || player.dead) return;
  const absorbed = Math.min(player.armor, amount * 0.62);
  player.armor = Math.max(0, player.armor - absorbed);
  player.health = Math.max(0, player.health - (amount - absorbed));
  player.lastDamage = state.time;
  state.damageFlash = Math.min(1, state.damageFlash + 0.55 + amount * 0.02);
  player.shake = Math.min(0.7, player.shake + amount * 0.012 + 0.05);
  audio.hurt();
  if (sourcePos) {
    _v.set(sourcePos.x - player.pos.x, 0, sourcePos.z - player.pos.z).normalize();
    _right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    _forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    state.arrowAngle = Math.atan2(_v.dot(_right), _v.dot(_forward));
    dom.damageArrow.style.transform = `rotate(${state.arrowAngle}rad)`;
    dom.damageArrow.style.opacity = '1';
  }
  dom.damageVignette.style.opacity = String(Math.min(0.95, state.damageFlash));
  if (player.health <= 0) gameOver();
  updateHUD();
}

// ---------- HUD ----------
let hudTimer = 0;
let radarTimer = 0;

function updateHUD() {
  const health = Math.ceil(player.health);
  dom.healthVal.textContent = String(health);
  dom.healthVal.classList.toggle('low', health <= 30);
  dom.healthFill.style.width = `${clamp(player.health, 0, 100)}%`;
  dom.armorVal.textContent = String(Math.ceil(player.armor));
  dom.armorFill.style.width = `${clamp(player.armor, 0, 100)}%`;
  dom.score.textContent = String(state.score).padStart(6, '0');
  dom.kills.textContent = String(state.kills).padStart(2, '0');
  const acc = state.shots ? Math.round((state.hits / state.shots) * 100) : 0;
  dom.accuracy.textContent = `${acc}%`;
  dom.clock.textContent = formatTime(state.elapsed);
  dom.waveLabel.textContent = `WAVE ${String(Math.max(1, state.wave)).padStart(2, '0')} / 06`;
  const alive = enemies.filter(e => !e.dead).length + state.pendingSpawns;
  dom.threatLabel.textContent = `THREATS ${String(alive).padStart(2, '0')}`;
  const progress = state.waveTotal ? clamp(state.waveKilled / state.waveTotal, 0, 1) : 0;
  dom.waveProgress.style.width = `${progress * 100}%`;
  dom.lowHealth.style.opacity = health <= 30 && !player.dead ? '1' : '0';
  dom.magVal.textContent = String(currentWeapon().mag).padStart(2, '0');
  dom.magVal.classList.toggle('empty', currentWeapon().mag === 0);
  dom.reserveVal.textContent = String(currentWeapon().reserve);
  dom.grenadeVal.textContent = `FRAG x${state.grenades}`;
  dom.reloadState.textContent = weaponState.reloading ? 'RELOADING' : (currentWeapon().mag === 0 ? 'EMPTY' : 'READY');
  dom.lowHealth.style.opacity = health <= 30 ? '1' : '0';
}

function updateReticle() {
  const want = weaponState.adsT > 0.45;
  dom.reticle.classList.toggle('ads', want);
}

function drawCompass(t) {
  const ctx = dom.compass.getContext('2d');
  const w = dom.compass.width, h = dom.compass.height;
  ctx.clearRect(0, 0, w, h);
  const heading = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
  ctx.save();
  ctx.translate(w / 2, h - 12);
  ctx.font = '600 13px monospace';
  ctx.textAlign = 'center';
  const span = 70;
  for (let d = -span; d <= span; d += 5) {
    const deg = (heading + d + 360) % 360;
    const x = (d / span) * (w / 2 - 8);
    const major = deg % 45 === 0;
    const centerFade = 1 - Math.abs(d) / span;
    ctx.globalAlpha = 0.18 + centerFade * 0.72;
    ctx.strokeStyle = major ? '#ff8b3d' : 'rgba(230,242,245,0.55)';
    ctx.lineWidth = major ? 1.4 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, major ? -11 : -6);
    ctx.stroke();
    if (major) {
      const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
      ctx.fillStyle = deg === 0 ? '#ff8b3d' : 'rgba(232,244,247,0.8)';
      ctx.fillText(labels[deg] || String(deg), x, -18);
    }
  }
  ctx.restore();
  // center chevron
  ctx.fillStyle = '#ff6a1a';
  ctx.beginPath();
  ctx.moveTo(w / 2, 2);
  ctx.lineTo(w / 2 - 5, 10);
  ctx.lineTo(w / 2 + 5, 10);
  ctx.closePath();
  ctx.fill();
}

function drawRadar(t) {
  const ctx = dom.radar.getContext('2d');
  const w = dom.radar.width, h = dom.radar.height;
  const cx = w / 2, cy = h / 2;
  const r = w * 0.44;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, 'rgba(30,73,80,0.32)');
  grad.addColorStop(1, 'rgba(4,10,12,0.2)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(108,220,238,0.18)';
  ctx.lineWidth = 2;
  for (const rr of [r * 0.33, r * 0.66, r]) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
  // sweep
  const sweep = (t * 0.65) % (Math.PI * 2);
  ctx.strokeStyle = 'rgba(122,232,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * r, cy + Math.sin(sweep) * r); ctx.stroke();
  const scale = r / 48;
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0.4) continue;
    const dx = e.root.position.x - player.pos.x;
    const dz = e.root.position.z - player.pos.z;
    const x = cx + dx * scale;
    const y = cy + dz * scale;
    if (Math.hypot(x - cx, y - cy) > r - 4) continue;
    const dist = Math.hypot(dx, dz);
    ctx.fillStyle = e.boss ? '#ff2035' : dist < 15 ? '#ff6a1a' : 'rgba(255,160,90,0.85)';
    ctx.beginPath(); ctx.arc(x, y, e.boss ? 8 : 5, 0, Math.PI * 2); ctx.fill();
    if (e.boss) { ctx.strokeStyle = 'rgba(255,40,60,0.7)'; ctx.lineWidth = 3; ctx.stroke(); }
  }
  // player arrow
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.atan2(fx, -fz));
  ctx.fillStyle = '#d9fbff';
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-7, 8); ctx.lineTo(0, 4); ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  // rim
  ctx.strokeStyle = 'rgba(122,232,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

// ---------- waves ----------
const spawnBeams = [];
const spawnBeamGeo = new THREE.CylinderGeometry(0.2, 0.5, 2.8, 14, 1, true);
const spawnBeamMat = new THREE.MeshBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });

function spawnBeam(pos) {
  const mesh = new THREE.Mesh(spawnBeamGeo, spawnBeamMat.clone());
  mesh.position.set(pos.x, 1.7, pos.z);
  scene.add(mesh);
  spawnBeams.push({ mesh, life: 1, max: 1 });
  effects.spark(new THREE.Vector3(pos.x, 0.8, pos.z), 0xff3322, 26, 4.5, 0.7, 6);
  effects.flash(new THREE.Vector3(pos.x, 1.1, pos.z), 0xff3322, 1.2, 0.3);
}

function updateSpawnBeams(dt) {
  for (let i = spawnBeams.length - 1; i >= 0; i--) {
    const b = spawnBeams[i];
    b.life -= dt;
    if (b.life <= 0) {
      scene.remove(b.mesh);
      b.mesh.material.dispose();
      spawnBeams.splice(i, 1);
    } else {
      const f = b.life / b.max;
      b.mesh.material.opacity = 0.13 * f;
      b.mesh.rotation.y += dt * 3;
      b.mesh.scale.setScalar(1 + (1 - f) * 0.6);
    }
  }
}

function chooseSpawnPoint(avoid, minDist = 18) {
  let best = null, bestScore = -1;
  for (const p of world.spawnPoints) {
    if (blockedAt(p.x, p.z, 0.8)) continue;
    const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
    if (d < minDist) continue;
    const score = d + (avoid ? p.distanceTo(avoid) * 0.22 : 0) + Math.random() * 10;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best || world.spawnPoints[Math.floor(Math.random() * world.spawnPoints.length)];
}

function spawnEnemy(isBoss = false, near = null) {
  const p = near ? new THREE.Vector3(
    clamp(near.x + rng(-3.2, 3.2), -48, 48), 0,
    clamp(near.z + rng(-3.2, 3.2), -48, 48)
  ) : chooseSpawnPoint(null, 16);
  if (blockedAt(p.x, p.z, 0.8)) p.set(0, 0, 34);
  spawnBeam(p);
  const e = makeEnemy(p, isBoss);
  if (isBoss) {
    boss = e;
    showBanner('HEAVY CONTACT', 'WARDEN', 'ARMORED ASSAULT UNIT // PRIORITY TARGET');
    addEvent('<b>WARDEN</b> HAS ENTERED THE SECTOR');
    audio.wave();
  }
  return e;
}

function startWave(n) {
  state.wave = n;
  state.waveActive = true;
  state.waveKilled = 0;
  state.pendingSpawns = 0;
  state.spawnQueue = [];
  state.spawnTimer = 0.55;
  state.nextWaveTimer = 0;
  if (n >= 6) {
    state.waveTotal = 5;
    state.spawnQueue.push({ boss: true });
    for (let i = 0; i < 4; i++) state.spawnQueue.push({ boss: false });
    dom.objectiveText.textContent = 'ELIMINATE THE WARDEN';
    showBanner('FINAL ASSAULT', 'WAVE 06', 'WARDEN + HEAVY ESCORT // WEAPONS FREE');
  } else {
    state.waveTotal = 3 + n;
    for (let i = 0; i < state.waveTotal; i++) state.spawnQueue.push({ boss: false });
    dom.objectiveText.textContent = 'ELIMINATE ALL HOSTILES';
    showBanner('INCOMING', `WAVE ${String(n).padStart(2, '0')}`, `HOSTILE CONTACT // ${state.waveTotal} SIGNATURES`);
  }
  state.pendingSpawns = state.spawnQueue.length;
  addEvent(`<b>WAVE ${String(n).padStart(2, '0')}</b> — ${state.waveTotal} HOSTILES INBOUND`);
  audio.wave();
  updateHUD();
}

function completeWave() {
  if (!state.waveActive) return;
  state.waveActive = false;
  if (state.wave >= 6) {
    startVictory();
    return;
  }
  state.nextWaveTimer = 5;
  state.grenades = Math.min(4, state.grenades + 1);
  WEAPONS.rifle.reserve = Math.min(WEAPONS.rifle.reserveMax, WEAPONS.rifle.reserve + 45);
  WEAPONS.pistol.reserve = Math.min(WEAPONS.pistol.reserveMax, WEAPONS.pistol.reserve + 18);
  player.armor = Math.min(player.maxArmor, player.armor + 25);
  addEvent(`<b>SECTOR CLEAR</b> — WAVE ${String(state.wave).padStart(2, '0')} ELIMINATED`);
  showBanner('SECTOR CLEAR', `WAVE ${String(state.wave).padStart(2, '0')} CLEARED`, 'REGROUP // RESUPPLY INBOUND');
  showToast('RESUPPLIED // NEXT ASSAULT IN 5s');
  audio.pickup();
  refreshWeaponHUD();
  updateHUD();
}

function spawnMinions(count, around) {
  if (state.mode !== 'playing') return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (state.mode !== 'playing') return;
      const e = spawnEnemy(false, around);
      addEvent('<b>WARDEN</b> DEPLOYED REINFORCEMENTS');
      effects.spark(e.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff3822, 18, 3.5, 0.6, 7);
    }, i * 380);
  }
}

function onEnemyKilled(enemy, headshot) {
  state.kills++;
  if (headshot) state.headshots++;
  state.score += 100 + (headshot ? 75 : 0) + (enemy.boss ? 1000 : 0);
  state.waveKilled = Math.min(state.waveTotal, state.waveKilled + 1);
  const label = enemy.boss ? 'WARDEN' : 'HOSTILE';
  const hs = headshot ? ' <span class="hs">HEADSHOT</span>' : '';
  addFeed(`SPECTRE-1 <b>▸</b> ${label}${hs}`);
  audio.kill();
  spawnXp(enemy.boss ? '+1100 WARDEN' : (headshot ? '+175 HEADSHOT' : '+100'), enemy.root.position.clone().add(new THREE.Vector3(0, 1.5, 0)), headshot);
  if (enemy.boss) {
    boss = null;
    state.score += 500;
    setTimeout(() => startVictory(), 800);
  }
  updateHUD();
  refreshWeaponHUD();
}

function updateWaves(dt) {
  if (state.mode !== 'playing') return;
  if (state.nextWaveTimer > 0) {
    state.nextWaveTimer -= dt;
    if (state.nextWaveTimer <= 0) startWave(Math.min(6, state.wave + 1));
    return;
  }
  if (!state.waveActive) return;
  if (state.pendingSpawns > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const alive = enemies.filter(e => !e.dead).length;
      if (alive < 7) {
        const entry = state.spawnQueue.shift();
        state.pendingSpawns = state.spawnQueue.length;
        if (entry) spawnEnemy(entry.boss, null);
        state.spawnTimer = entry && entry.boss ? 1.5 : rng(0.75, 1.35);
      } else {
        state.spawnTimer = 0.4;
      }
    }
  }
  if (state.pendingSpawns === 0 && state.waveActive) {
    const alive = enemies.filter(e => !e.dead).length;
    if (alive === 0) completeWave();
  }
}

// ---------- player movement ----------
let footstepTimer = 0;
let touchMove = { x: 0, y: 0 };
let touchActive = false;

function updatePlayer(dt) {
  if (state.mode !== 'playing') return;
  if (player.dead) return;

  const wantedCrouch = player.crouching;
  const targetEye = wantedCrouch ? 1.12 : 1.68;
  player.eyeHeight = lerp(player.eyeHeight, targetEye, Math.min(1, dt * 9));

  let f = 0, r = 0;
  if (keys.has('KeyW')) f += 1;
  if (keys.has('KeyS')) f -= 1;
  if (keys.has('KeyD')) r += 1;
  if (keys.has('KeyA')) r -= 1;
  if (touchActive) {
    f += -touchMove.y;
    r += touchMove.x;
  }
  const inputLen = Math.hypot(f, r);
  if (inputLen > 1) { f /= inputLen; r /= inputLen; }
  const moving = inputLen > 0.05 && !player.dead;
  player.sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && f > 0.3 && !player.crouching && !weaponState.mouse2;
  let speed = player.crouching ? 3.4 : player.sprinting ? 9.8 : 6.1;
  if (weaponState.adsT > 0.35) speed *= 0.55;

  const fwdX = -Math.sin(player.yaw), fwdZ = -Math.cos(player.yaw);
  const rightX = Math.cos(player.yaw), rightZ = -Math.sin(player.yaw);
  const wishX = (fwdX * f + rightX * r);
  const wishZ = (fwdZ * f + rightZ * r);
  const accel = player.onGround ? 14 : 4.5;
  player.vel.x = lerp(player.vel.x, wishX * speed, Math.min(1, dt * accel));
  player.vel.z = lerp(player.vel.z, wishZ * speed, Math.min(1, dt * accel));

  if (keys.has('Space') && player.onGround && !player.crouching) {
    player.vel.y = 6.2;
    player.onGround = false;
    audio.footstep(0.1);
  }
  player.vel.y -= 20 * dt;
  player.pos.y += player.vel.y * dt;
  if (player.pos.y <= 0) {
    if (!player.onGround && player.vel.y < -3) audio.footstep(0.16);
    player.pos.y = 0;
    player.vel.y = 0;
    player.onGround = true;
  }

  const nx = player.pos.x + player.vel.x * dt;
  if (!blockedAt(nx, player.pos.z)) player.pos.x = nx;
  else player.vel.x = 0;
  const nz = player.pos.z + player.vel.z * dt;
  if (!blockedAt(player.pos.x, nz)) player.pos.z = nz;
  else player.vel.z = 0;
  player.pos.x = clamp(player.pos.x, -53, 53);
  player.pos.z = clamp(player.pos.z, -53, 53);

  const horizontal = Math.hypot(player.vel.x, player.vel.z);
  const bobScale = player.onGround ? Math.min(1, horizontal / 6) : 0;
  player.bob += dt * (4.5 + horizontal * 1.15) * (bobScale > 0.05 ? 1 : 0);
  const bobY = Math.sin(player.bob * 2) * 0.019 * bobScale;
  const bobX = Math.cos(player.bob) * 0.012 * bobScale;

  player.shake = Math.max(0, player.shake - dt * 2.8);
  const sh = player.shake * player.shake;
  const shX = (Math.random() * 2 - 1) * sh * 0.42;
  const shY = (Math.random() * 2 - 1) * sh * 0.42;
  camera.rotation.set(player.pitch + shX, player.yaw + shY, (Math.random() * 2 - 1) * sh * 0.08);
  camera.position.set(
    player.pos.x + rightX * bobX,
    player.pos.y + player.eyeHeight + bobY,
    player.pos.z + rightZ * bobX
  );

  if (moving && player.onGround && horizontal > 1.2) {
    footstepTimer -= dt * (player.sprinting ? 1.8 : 1.15);
    if (footstepTimer <= 0) {
      footstepTimer = 0.46;
      audio.footstep(player.sprinting ? 0.16 : 0.1);
    }
  }

  if (state.time - player.lastDamage > 5 && player.health < player.maxHealth) {
    player.health = Math.min(player.maxHealth, player.health + 11 * dt);
  }

  if (state.damageFlash > 0) {
    state.damageFlash = Math.max(0, state.damageFlash - dt * 2.4);
    dom.damageVignette.style.opacity = String(Math.min(0.95, state.damageFlash));
    dom.damageArrow.style.opacity = String(Math.max(0, state.damageFlash - 0.08));
  }
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) dom.toast.classList.remove('show');
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update(dt, state.time);
    if (e.finished) enemies.splice(i, 1);
  }
}

// ---------- menu camera ----------
function updateMenuCamera(dt) {
  state.menuTime += dt;
  const t = state.menuTime;
  const a = t * 0.045 + 0.7;
  camera.fov = 68;
  camera.updateProjectionMatrix();
  camera.position.set(Math.cos(a) * 34, 8.4 + Math.sin(t * 0.18) * 1.2, Math.sin(a) * 34);
  camera.lookAt(0, 2.6, -7);
  weaponRig.visible = false;
}

// ---------- loupe / hud pulse ----------
function frameHud(dt) {
  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.1;
    updateHUD();
  }
  radarTimer -= dt;
  if (radarTimer <= 0) {
    radarTimer = 0.055;
    drawCompass(state.time);
    drawRadar(state.time);
  }
  updateReticle();
}

// ---------- touch ----------
function setupTouch() {
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!isTouch) return;
  dom.touchControls.classList.remove('hidden');
  const stick = $('moveStick');
  const knob = stick.querySelector('span');
  let stickId = null;
  const rect = () => stick.getBoundingClientRect();
  stick.addEventListener('pointerdown', (ev) => {
    stickId = ev.pointerId;
    stick.setPointerCapture(ev.pointerId);
    ev.stopPropagation();
  });
  stick.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== stickId) return;
    const rc = rect();
    const dx = (ev.clientX - (rc.left + rc.width / 2)) / (rc.width / 2);
    const dy = (ev.clientY - (rc.top + rc.height / 2)) / (rc.height / 2);
    touchMove.x = clamp(dx, -1, 1);
    touchMove.y = clamp(dy, -1, 1);
    touchActive = true;
    knob.style.transform = `translate(${touchMove.x * 30}px, ${touchMove.y * 30}px)`;
    ev.stopPropagation();
  });
  const endStick = (ev) => {
    if (ev.pointerId !== stickId) return;
    stickId = null;
    touchMove.x = touchMove.y = 0;
    touchActive = false;
    knob.style.transform = '';
  };
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  const look = $('lookZone');
  let lookId = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (ev) => {
    lookId = ev.pointerId; lx = ev.clientX; ly = ev.clientY;
    look.setPointerCapture(ev.pointerId);
    ev.stopPropagation();
  });
  look.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== lookId) return;
    player.yaw -= (ev.clientX - lx) * 0.004;
    player.pitch = clamp(player.pitch - (ev.clientY - ly) * 0.004, -1.4, 1.4);
    lx = ev.clientX; ly = ev.clientY;
    ev.stopPropagation();
  });
  const endLook = (ev) => { if (ev.pointerId === lookId) lookId = null; };
  look.addEventListener('pointerup', endLook);
  look.addEventListener('pointercancel', endLook);

  const fire = $('fireButton');
  fire.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); weaponState.mouseDown = true; attemptFire(); });
  fire.addEventListener('pointerup', (ev) => { ev.stopPropagation(); weaponState.mouseDown = false; });
  fire.addEventListener('pointercancel', () => { weaponState.mouseDown = false; });
  $('reloadButton').addEventListener('pointerdown', (ev) => { ev.stopPropagation(); reloadWeapon(); });
  const ads = $('adsTouch');
  ads.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); weaponState.mouse2 = !weaponState.mouse2; ads.classList.toggle('active', weaponState.mouse2); });
}

// ---------- animation loop ----------
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  state.time += dt;
  state.menuTime += state.mode === 'menu' ? dt : 0;

  world.update(state.time, dt);
  effects.update(dt);
  updateSpawnBeams(dt);

  if (state.mode === 'menu') {
    updateMenuCamera(dt);
  } else if (state.mode === 'playing') {
    state.elapsed += dt;
    updatePlayer(dt);
    updateWeapon(dt);
    updateEnemies(dt);
    updateWaves(dt);
    updateGrenades(dt);
    frameHud(dt);
  } else if (state.mode === 'paused' || state.mode === 'ended') {
    updateWeapon(dt);
    if (state.mode === 'paused') drawRadar(state.time);
  }

  gradeUniforms.time.value = state.time;
  gradeUniforms.hurt.value = state.damageFlash;
  composer.render();
}

// ---------- resize ----------
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
}
window.addEventListener('resize', onResize);

// ---------- boot ----------
setupTouch();
updateHUD();
refreshWeaponHUD();
camera.position.set(30, 9, 16);
camera.lookAt(0, 2.6, -7);
requestAnimationFrame(animate);

// lightweight runtime handle used by the automated visual checks
window.__blacksite = {
  state, player, camera, camera3: camera, scene, renderer, composer, world, effects, enemies,
  weaponRig, weaponState, WEAPONS, rifle, pistol, startWave, spawnEnemy, startGame, attemptFire,
  reloadWeapon, switchWeapon, throwGrenade, damagePlayer, explodeBarrel, boss: () => boss
};


