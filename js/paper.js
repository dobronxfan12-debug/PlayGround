// ---------------------------------------------------------------------------
// Paper craft — geometry, materials, props and characters.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function rng (seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shade (hex, amount) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  hsl.l = Math.max(0, Math.min(1, hsl.l + amount));
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return '#' + c.getHexString();
}

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------
export function makePaperTexture (theme) {
  const size = 384;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = rng(theme.paper.length * 991 + theme.name.length * 337);

  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, size, size);

  // large soft stains
  for (let i = 0; i < 9; i++) {
    const x = random() * size;
    const y = random() * size;
    const r = 18 + random() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(120,95,60,${0.012 + random() * 0.02})`);
    g.addColorStop(1, 'rgba(120,95,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // paper fibres
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 720; i++) {
    const x = random() * size;
    const y = random() * size;
    const len = 2 + random() * 10;
    const angle = random() * Math.PI;
    ctx.strokeStyle = random() > 0.45
      ? `rgba(255,255,255,${0.04 + random() * 0.11})`
      : `rgba(90,66,36,${0.02 + random() * 0.055})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  // tiny flecks
  for (let i = 0; i < 190; i++) {
    const x = random() * size;
    const y = random() * size;
    ctx.fillStyle = random() > 0.5
      ? `rgba(255,255,255,${0.05 + random() * 0.12})`
      : `rgba(80,58,32,${0.025 + random() * 0.07})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.35 + random() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // a whisper of woven grain
  ctx.globalAlpha = 0.055;
  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? '#fff' : '#5a452c';
    ctx.fillRect(0, y, size, 0.5);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeGradientTexture (top, mid, bottom) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(0.48, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 512);
  // soft paper-cloud bands
  const random = rng(71);
  for (let i = 0; i < 26; i++) {
    const y = 30 + random() * 430;
    const h = 8 + random() * 30;
    ctx.fillStyle = `rgba(255,255,255,${0.008 + random() * 0.025})`;
    ctx.beginPath();
    ctx.ellipse(random() * 64, y, 24 + random() * 35, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeGlowTexture (inner = 'rgba(255,236,180,1)', outer = 'rgba(255,190,80,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.22, 'rgba(255,220,140,.55)');
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Materials (cached per theme)
// ---------------------------------------------------------------------------
const paperCache = new Map();
const propCache = new Map();

export function paperMaterial (theme) {
  if (paperCache.has(theme.id)) return paperCache.get(theme.id);
  const map = makePaperTexture(theme);
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.93,
    metalness: 0.0,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  mat.userData.edge = new THREE.Color(theme.paperEdge);
  paperCache.set(theme.id, mat);
  return mat;
}

export function solidMaterial (theme) {
  if (propCache.has(theme.id)) return propCache.get(theme.id);
  const mat = new THREE.MeshStandardMaterial({
    map: makePaperTexture(theme),
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0,
    side: THREE.FrontSide,
  });
  propCache.set(theme.id, mat);
  return mat;
}

let sharedGlow = null;
export function glowTexture () {
  if (!sharedGlow) sharedGlow = makeGlowTexture();
  return sharedGlow;
}

const matCache = new Map();
function colorMat (hex, { roughness = 0.88, metalness = 0, emissive = null, emissiveIntensity = 1, transparent = false, opacity = 1, side = THREE.FrontSide } = {}) {
  const key = `${hex}|${roughness}|${metalness}|${emissive}|${emissiveIntensity}|${transparent}|${opacity}|${side}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness,
    metalness,
    emissive: emissive ? new THREE.Color(emissive) : 0x000000,
    emissiveIntensity,
    transparent,
    opacity,
    side,
    flatShading: true,
  });
  matCache.set(key, m);
  return m;
}

// ---------------------------------------------------------------------------
// Folded sheet geometry
// ---------------------------------------------------------------------------
/**
 * Build one merged mesh geometry from unit paper cells.
 * @param {Array<[number,number]>} cells [i,j] integer cell indices
 * @param {number} thickness
 */
export function buildPanelGeometry (cells, thickness = 0.14) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const colors = [];
  const t = thickness / 2;
  const uvScale = 0.24;

  const push = (p, n, uv, col) => {
    positions.push(p[0], p[1], p[2]);
    normals.push(n[0], n[1], n[2]);
    uvs.push(uv[0], uv[1]);
    colors.push(col[0], col[1], col[2]);
  };
  const quad = (a, b, c, d, n, col, uvFn) => {
    const uvA = uvFn(a), uvB = uvFn(b), uvC = uvFn(c), uvD = uvFn(d);
    push(a, n, uvA, col); push(b, n, uvB, col); push(c, n, uvC, col);
    push(a, n, uvA, col); push(c, n, uvC, col); push(d, n, uvD, col);
  };
  const white = [1, 1, 1];
  const sideCol = [0.86, 0.83, 0.78];
  const bottomCol = [0.82, 0.79, 0.73];

  for (const [i, j] of cells) {
    const x0 = i, x1 = i + 1, z0 = j, z1 = j + 1;
    const yb = -t, yt = t;
    // top (+Y)
    quad([x0, yt, z0], [x0, yt, z1], [x1, yt, z1], [x1, yt, z0], [0, 1, 0], white,
      p => [p[0] * uvScale, p[2] * uvScale]);
    // bottom (-Y)
    quad([x0, yb, z1], [x0, yb, z0], [x1, yb, z0], [x1, yb, z1], [0, -1, 0], bottomCol,
      p => [p[0] * uvScale, p[2] * uvScale]);
    // +X
    quad([x1, yb, z1], [x1, yb, z0], [x1, yt, z0], [x1, yt, z1], [1, 0, 0], sideCol,
      p => [p[2] * uvScale, p[1] * uvScale]);
    // -X
    quad([x0, yb, z0], [x0, yb, z1], [x0, yt, z1], [x0, yt, z0], [-1, 0, 0], sideCol,
      p => [p[2] * uvScale, p[1] * uvScale]);
    // +Z
    quad([x0, yb, z1], [x1, yb, z1], [x1, yt, z1], [x0, yt, z1], [0, 0, 1], sideCol,
      p => [p[0] * uvScale, p[1] * uvScale]);
    // -Z
    quad([x1, yb, z0], [x0, yb, z0], [x0, yt, z0], [x1, yt, z0], [0, 0, -1], sideCol,
      p => [p[0] * uvScale, p[1] * uvScale]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

export function createPanelMesh (panel, theme) {
  const geo = buildPanelGeometry(panel.cells, 0.14);
  const mesh = new THREE.Mesh(geo, paperMaterial(theme));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.userData.panel = panel;
  return mesh;
}

export function createPaperBox (w, h, d, theme) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = solidMaterial(theme).clone();
  mat.vertexColors = false;
  mat.map = mat.map.clone();
  mat.map.needsUpdate = true;
  mat.map.repeat.set(Math.max(1, w * 0.32), Math.max(1, d * 0.32));
  mat.side = THREE.FrontSide;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  // paper edge trim
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: theme.paperEdge, transparent: true, opacity: 0.65 })
  );
  edge.scale.setScalar(1.001);
  mesh.add(edge);
  return mesh;
}

// ---------------------------------------------------------------------------
// Crease guides
// ---------------------------------------------------------------------------
export function makeCreaseLine (length, axis, color = 0xb9852d) {
  // dashed glowing line built from tiny quads
  const group = new THREE.Group();
  const dashCount = Math.max(4, Math.floor(length / 0.42));
  // The dash is long on its local Y axis, narrow on X.  A rotation of
  // -90° about X lays it flat with its long axis along Z (crease axis "x");
  // for axis "z" we additionally turn it 90° about Y.
  const geo = new THREE.PlaneGeometry(0.085, 0.27);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
  const inst = new THREE.InstancedMesh(geo, mat, dashCount);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  if (axis === 'z') {
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    q.copy(qy).multiply(qx);
  } else {
    q.copy(qx);
  }
  const scale = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < dashCount; i++) {
    const p = -length / 2 + (i + 0.5) * (length / dashCount);
    m.compose(new THREE.Vector3(axis === 'x' ? 0 : p, 0, axis === 'x' ? p : 0), q, scale);
    inst.setMatrixAt(i, m);
  }
  group.add(inst);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(axis === 'x' ? 0.6 : length, axis === 'x' ? length : 0.6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  group.add(glow);
  group.userData.inst = inst;
  group.userData.glow = glow;
  return group;
}

export function makeHinge (axis, length, y) {
  const g = new THREE.Group();
  const gold = colorMat('#c99a44', { metalness: 0.45, roughness: 0.38 });
  const cyl = new THREE.CylinderGeometry(0.055, 0.055, 0.28, 8);
  const ring = new THREE.TorusGeometry(0.105, 0.025, 6, 14);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(cyl, gold);
    const r = new THREE.Mesh(ring, gold);
    const t = -length / 2 + 0.35 + i * (length - 0.7) / 2;
    if (axis === 'x') {
      c.rotation.x = Math.PI / 2;
      c.position.set(0, 0, t);
      r.rotation.y = Math.PI / 2;
      r.position.set(0, 0.07, t);
    } else {
      c.rotation.z = Math.PI / 2;
      c.position.set(t, 0, 0);
      r.rotation.x = Math.PI / 2;
      r.position.set(t, 0.07, 0);
    }
    c.castShadow = true;
    g.add(c, r);
  }
  g.position.y = y;
  return g;
}

// ---------------------------------------------------------------------------
// Stars, exit and portals
// ---------------------------------------------------------------------------
function starShape (outer = 0.34, inner = 0.15) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function createStar (color = 0xe3b14f) {
  const group = new THREE.Group();
  const gold = colorMat('#e2b252', { metalness: 0.55, roughness: 0.35, emissive: '#7a4d0d', emissiveIntensity: 0.35 });
  const pale = colorMat('#f6dfa2', { metalness: 0.3, roughness: 0.5, emissive: '#a97920', emissiveIntensity: 0.3 });

  const geo = new THREE.ExtrudeGeometry(starShape(0.31, 0.135), {
    depth: 0.09, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.025, bevelSegments: 1,
  });
  geo.center();
  const star = new THREE.Mesh(geo, gold);
  star.castShadow = true;
  group.add(star);

  const small = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), pale);
  small.position.z = 0.005;
  group.add(small);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xffcf79, transparent: true, opacity: 0.65,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(1.5);
  group.add(glow);

  group.userData.spin = star;
  group.userData.glow = glow;
  return group;
}

export function createExitSeal (theme) {
  const group = new THREE.Group();
  const gold = colorMat('#dfb05a', { metalness: 0.4, roughness: 0.4, emissive: '#7d5410', emissiveIntensity: 0.45 });
  const pale = new THREE.MeshBasicMaterial({ color: 0xffe8af, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: theme.exit, transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

  const outer = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.76, 6), gold);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.005;
  group.add(outer);

  const inner = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.34, 6), gold);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.008;
  group.add(inner);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.58, 24), glowMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.003;
  group.add(disc);

  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), pale);
  diamond.scale.y = 1.65;
  diamond.position.y = 0.13;
  group.add(diamond);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.44, 2.6, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: theme.exit, transparent: true, opacity: 0.075, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  beam.position.y = 1.3;
  group.add(beam);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: theme.exit, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.setScalar(2.4);
  glow.position.y = 0.25;
  group.add(glow);

  group.userData.diamond = diamond;
  group.userData.glow = glow;
  return group;
}

// ---------------------------------------------------------------------------
// Origami character
// ---------------------------------------------------------------------------
export function createPlayer (skin) {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);

  const fur = colorMat(skin.fur, { roughness: 0.9 });
  const fur2 = colorMat(skin.fur2, { roughness: 0.88 });
  const belly = colorMat(skin.belly, { roughness: 0.94 });
  const dark = colorMat(skin.eye, { roughness: 0.7 });
  const scarf = colorMat(skin.scarf, { roughness: 0.85 });
  const accent = colorMat(skin.accent, { roughness: 0.8 });

  // body — a folded paper wedge
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 4, 1), fur);
  body.rotation.y = Math.PI / 4;
  body.position.y = 0.45;
  body.scale.z = 0.82;
  body.castShadow = true;
  model.add(body);

  const chest = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 3), belly);
  chest.rotation.y = Math.PI;
  chest.position.set(0, 0.4, 0.16);
  chest.scale.set(0.9, 1, 0.35);
  model.add(chest);

  // head
  const head = new THREE.Group();
  head.position.set(0, 0.83, 0.05);
  model.add(head);
  const skull = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), fur);
  skull.scale.set(1, 0.88, 0.84);
  skull.castShadow = true;
  head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), belly);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, -0.04, 0.2);
  muzzle.scale.z = 0.75;
  head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), dark);
  nose.position.set(0, -0.035, 0.34);
  head.add(nose);

  const eyeGeo = new THREE.SphereGeometry(0.028, 6, 4);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, dark);
    eye.position.set(side * 0.095, 0.04, 0.195);
    eye.scale.z = 0.55;
    head.add(eye);
  }

  // ears
  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.145, 0.16, 0.01);
    ear.rotation.z = side * 0.22;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.3, 3), fur2);
    outer.position.y = 0.12;
    outer.castShadow = true;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.17, 3), accent);
    inner.position.set(0, 0.1, 0.035);
    ear.add(outer, inner);
    head.add(ear);
    ears.push(ear);
  }

  // legs
  const legs = [];
  for (const [x, z] of [[-0.13, 0.15], [0.13, 0.15], [-0.13, -0.15], [0.13, -0.15]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 0.24, z);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.09), fur2);
    leg.position.y = -0.11;
    leg.castShadow = true;
    hip.add(leg);
    model.add(hip);
    legs.push(hip);
  }

  // tail — folded kite
  const tail = new THREE.Group();
  tail.position.set(0, 0.42, -0.24);
  tail.rotation.x = -0.7;
  const tail1 = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 4), fur2);
  tail1.rotation.x = -Math.PI / 2.3;
  tail1.position.z = -0.2;
  tail1.castShadow = true;
  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), belly);
  tailTip.rotation.x = -Math.PI / 2.3;
  tailTip.position.z = -0.39;
  tail.add(tail1, tailTip);
  model.add(tail);

  // scarf
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 5, 10), scarf);
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.position.y = 0.69;
  scarfRing.scale.z = 0.8;
  model.add(scarfRing);
  const scarfEnd = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.28), scarf);
  scarfEnd.position.set(0.14, 0.56, -0.11);
  scarfEnd.rotation.z = -0.28;
  scarfEnd.rotation.y = 0.3;
  model.add(scarfEnd);

  root.userData = { model, head, legs, tail, ears, skin };
  root.scale.setScalar(1.12);
  return root;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
function tree (theme, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.55, 5), colorMat(theme.trunk, { roughness: 0.95 }));
  trunk.position.y = 0.27;
  trunk.castShadow = true;
  g.add(trunk);
  const leafColors = theme.leaf;
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.48 - i * 0.1, 0.52, 5),
      colorMat(leafColors[i % leafColors.length], { roughness: 0.9 })
    );
    cone.position.y = 0.58 + i * 0.27;
    cone.rotation.y = i * 0.5;
    cone.castShadow = true;
    g.add(cone);
  }
  g.scale.setScalar(scale);
  return g;
}

function pine (theme, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.4, 5), colorMat(theme.trunk, { roughness: 0.95 }));
  trunk.position.y = 0.2;
  g.add(trunk);
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.4 - i * 0.075, 0.4, 5),
      colorMat(theme.leaf[i % theme.leaf.length], { roughness: 0.9 })
    );
    cone.position.y = 0.36 + i * 0.25;
    cone.rotation.y = i * 0.8;
    cone.castShadow = true;
    g.add(cone);
  }
  g.scale.setScalar(scale);
  return g;
}

function mushroom (theme, scale = 1) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.25, 5), colorMat('#eadcc2', { roughness: 0.9 }));
  stem.position.y = 0.12;
  g.add(stem);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.16, 6), colorMat(theme.accent2, { roughness: 0.8 }));
  cap.position.y = 0.27;
  cap.castShadow = true;
  g.add(cap);
  g.scale.setScalar(scale);
  return g;
}

function rock (theme, scale = 1) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), colorMat(theme.rock, { roughness: 1 }));
  m.position.y = 0.13;
  m.scale.set(1.2, 0.8, 1);
  m.rotation.y = Math.random() * Math.PI;
  m.castShadow = true;
  g.add(m);
  const m2 = new THREE.Mesh(new THREE.TetrahedronGeometry(0.11, 0), colorMat(theme.rock, { roughness: 1 }));
  m2.position.set(0.18, 0.06, 0.05);
  m2.castShadow = true;
  g.add(m2);
  g.scale.setScalar(scale);
  return g;
}

function grass (theme, scale = 1) {
  const g = new THREE.Group();
  const mat = colorMat(theme.leaf[0], { roughness: 0.95, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.3), mat);
    blade.position.set((i - 1) * 0.07, 0.15, 0);
    blade.rotation.z = (i - 1) * 0.35;
    blade.rotation.y = i * 0.7;
    g.add(blade);
  }
  g.scale.setScalar(scale);
  return g;
}

function ice (theme, scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: theme.leaf[2], roughness: 0.22, metalness: 0.05,
    transparent: true, opacity: 0.88, flatShading: true,
  });
  for (let i = 0; i < 3; i++) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.07 + i * 0.02, 0.45 - i * 0.08, 4), mat);
    shard.position.set((i - 1) * 0.11, 0.2, (i % 2) * 0.08);
    shard.rotation.z = (i - 1) * 0.18;
    shard.castShadow = true;
    g.add(shard);
  }
  g.scale.setScalar(scale);
  return g;
}

function column (theme, scale = 1) {
  const g = new THREE.Group();
  const mat = colorMat(theme.paperEdge, { roughness: 0.95 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.34), mat);
  base.position.y = 0.04;
  g.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.75, 7), mat);
  shaft.position.y = 0.45;
  shaft.castShadow = true;
  g.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.36), mat);
  cap.position.y = 0.86;
  cap.rotation.z = 0.08;
  cap.castShadow = true;
  g.add(cap);
  g.scale.setScalar(scale);
  return g;
}

function lantern (theme, scale = 1) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 5), colorMat(theme.trunk, { roughness: 0.9 }));
  post.position.y = 0.4;
  g.add(post);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.2), colorMat('#f6d38c', { emissive: '#d99a3d', emissiveIntensity: 0.9, roughness: 0.5 }));
  box.position.y = 0.82;
  g.add(box);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc879, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(0.75);
  glow.position.y = 0.84;
  g.add(glow);
  g.scale.setScalar(scale);
  return g;
}

function crystal (theme, scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: theme.accent2, roughness: 0.25, metalness: 0.1,
    emissive: theme.accent2, emissiveIntensity: 0.25, flatShading: true,
  });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + i * 0.04, 0), mat);
    c.position.set((i - 1) * 0.15, 0.22 + i * 0.06, (i % 2) * 0.1);
    c.scale.y = 2.1;
    c.rotation.z = (i - 1) * 0.2;
    c.castShadow = true;
    g.add(c);
  }
  g.scale.setScalar(scale);
  return g;
}

function starplant (theme, scale = 1) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4), colorMat(theme.leaf[1], { roughness: 0.9 }));
  stem.position.y = 0.25;
  g.add(stem);
  const star = createStar();
  star.scale.setScalar(0.42);
  star.position.y = 0.55;
  g.add(star);
  g.scale.setScalar(scale);
  g.userData.spinItem = star;
  return g;
}

function cloudtree (theme, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 5), colorMat(theme.trunk, { roughness: 0.9 }));
  trunk.position.y = 0.22;
  g.add(trunk);
  const mat = new THREE.MeshStandardMaterial({ color: '#f5f0e2', roughness: 1, transparent: true, opacity: 0.92, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + i * 0.04, 0), mat);
    puff.position.set((i - 1) * 0.17, 0.58 + (i % 2) * 0.1, 0);
    puff.castShadow = true;
    g.add(puff);
  }
  g.scale.setScalar(scale);
  return g;
}

export function createProp (type, theme, scale = 1) {
  switch (type) {
    case 'tree': return tree(theme, scale);
    case 'pine': return pine(theme, scale);
    case 'mushroom': return mushroom(theme, scale);
    case 'rock': return rock(theme, scale);
    case 'grass': return grass(theme, scale);
    case 'ice': return ice(theme, scale);
    case 'column': return column(theme, scale);
    case 'lantern': return lantern(theme, scale);
    case 'crystal': return crystal(theme, scale);
    case 'starplant': return starplant(theme, scale);
    case 'cloudtree': return cloudtree(theme, scale);
    default: return rock(theme, scale);
  }
}

export function createCloud (scale = 1, opacity = 0.7) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#fbf7ec', roughness: 1, transparent: true, opacity, flatShading: true, depthWrite: false });
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.3, 1), mat);
    puff.position.set((i - 2) * 0.55, Math.random() * 0.2, (Math.random() - 0.5) * 0.5);
    puff.scale.y = 0.55;
    g.add(puff);
  }
  g.scale.setScalar(scale);
  return g;
}

export function createCrane (theme) {
  const g = new THREE.Group();
  const paper = colorMat('#f7f0e1', { roughness: 0.9, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 3), paper);
  body.rotation.z = Math.PI / 2;
  const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), paper);
  wingL.position.set(0, 0.05, 0.13);
  wingL.rotation.x = -0.5;
  const wingR = wingL.clone();
  wingR.position.z = -0.13;
  wingR.rotation.x = 0.5;
  g.add(body, wingL, wingR);
  g.userData.wings = [wingL, wingR];
  return g;
}

export function createParticles (count, color, size, area = [20, 8, 20], opacity = 0.5) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * area[0];
    pos[i * 3 + 1] = Math.random() * area[1];
    pos[i * 3 + 2] = (Math.random() - 0.5) * area[2];
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, map: glowTexture(), transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.base = pos.slice();
  points.userData.area = area;
  return points;
}

export function createSky (theme) {
  const tex = makeGradientTexture(theme.skyTop, theme.skyMid, theme.skyBottom);
  return tex;
}

export function createIsland (theme, radius = 3, thickness = 0.5) {
  const g = new THREE.Group();
  const mat = solidMaterial(theme);
  mat.side = THREE.FrontSide;
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.82, thickness, 10, 1),
    mat
  );
  top.rotation.y = Math.PI / 10;
  top.position.y = -thickness / 2;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);
  // under-layers of folded paper
  for (let i = 1; i <= 2; i++) {
    const layer = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * (0.72 - i * 0.12), radius * (0.48 - i * 0.12), thickness * 0.55, 9),
      solidMaterial(theme)
    );
    layer.rotation.y = Math.PI / 9 + i * 0.3;
    layer.position.y = -thickness - i * thickness * 0.42;
    layer.castShadow = true;
    g.add(layer);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Environment lighting factory
// ---------------------------------------------------------------------------
export function addEnvironmentLighting (scene, theme) {
  const hemi = new THREE.HemisphereLight(theme.skyTop, theme.ground, 0.82);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(theme.sun, 2.85);
  sun.position.set(...theme.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  const s = 12;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(theme.accent2, 0.24);
  fill.position.set(-6, 5, -7);
  scene.add(fill);
  return { hemi, sun, fill };
}

export { UP, shade };
