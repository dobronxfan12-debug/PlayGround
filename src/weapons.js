import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeFlash, canvasTexture, rng } from './textures.js';

function mat(color, rough, metal, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.45, ...extra });
}

const brushed = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#a7adaf';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 420; i++) {
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = rng(0.4, 1.1);
    const y = Math.random() * h;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + rng(-1, 1)); ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, rng(0.7, 2.4), 0, 7); ctx.fill();
  }
  for (let i = 0; i < 16; i++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 1;
    const x = Math.random() * w, y = Math.random() * h;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng(-22, 22), y + rng(-4, 4)); ctx.stroke();
  }
}, { repeat: [2, 2], aniso: 8 });

const polymer = canvasTexture(128, 128, (ctx, w, h) => {
  ctx.fillStyle = '#9a9a94';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) {
    const v = Math.random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)';
    ctx.fillStyle = v;
    ctx.fillRect(Math.random() * w, Math.random() * h, rng(0.6, 1.8), rng(0.6, 1.8));
  }
}, { repeat: [2, 2], aniso: 8 });

const gunMetal = mat(0x2c3336, 0.5, 0.6, { map: brushed, envMapIntensity: 0.7 });
const darkPoly = mat(0x14181a, 0.76, 0.16, { map: polymer, envMapIntensity: 0.3 });
const midPoly = mat(0x22282a, 0.72, 0.14, { map: polymer, envMapIntensity: 0.32 });
const steel = mat(0x4c5457, 0.4, 0.68, { map: brushed, envMapIntensity: 0.8 });
const accent = mat(0xff6a1a, 0.35, 0.55, { emissive: 0xff3b00, emissiveIntensity: 1.2 });
const lens = new THREE.MeshBasicMaterial({ color: 0xff2a24, toneMapped: false });
const glass = new THREE.MeshStandardMaterial({ color: 0x0b1a20, roughness: 0.05, metalness: 1, envMapIntensity: 1.8 });
const glove = mat(0x101312, 0.9, 0.03);
const glovePad = mat(0x1d2220, 0.84, 0.05);
const sleeve = mat(0x0d100f, 0.94, 0.02);

const geoCache = new Map();
function rounded(w, h, d, r = Math.min(w, h, d) * 0.16) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 2, r);
    geoCache.set(key, g);
  }
  return g;
}

function box(w, h, d, x, y, z, material, parent, rot = null, radius) {
  const mesh = new THREE.Mesh(rounded(w, h, d, radius), material);
  mesh.position.set(x, y, z);
  if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function cyl(r1, r2, h, x, y, z, material, parent, rot = null, seg = 14) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), material);
  mesh.position.set(x, y, z);
  if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  parent.add(mesh);
  return mesh;
}

// Extrude a 2D side profile (points are [z, y]) across the weapon's X axis.
function profile(pts, thickness, material, parent, x = 0, bevel = 0.004) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 2, steps: 1, curveSegments: 8
  });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.x = x;
  parent.add(mesh);
  return mesh;
}

function flashRig(group, x, y, z, scale) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeFlash(), color: 0xffc47a, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false
  }));
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);
  sprite.visible = false;
  sprite.renderOrder = 20;
  group.add(sprite);
  const light = new THREE.PointLight(0xffa050, 0, 6, 2);
  light.position.set(x, y, z + 0.1);
  group.add(light);
  return { sprite, light };
}

function hand(parent, side = 1) {
  // side 1 = right hand / -1 = left hand
  const g = new THREE.Group();
  g.scale.setScalar(0.84);
  g.position.set(side * 0.028, side > 0 ? -0.104 : -0.074, side > 0 ? 0.062 : -0.47);
  parent.add(g);
  // palm
  box(0.062, 0.092, 0.082, 0, 0, 0.006, glove, g, [0.08, 0, 0]);
  // knuckle pad
  box(0.066, 0.026, 0.078, 0, 0.03, -0.012, glovePad, g, [0.08, 0, 0]);
  // fingers curling around the front of the grip/handguard
  for (let i = 0; i < 4; i++) {
    box(0.052, 0.019, 0.042, 0, 0.033 - i * 0.022, -0.044, glovePad, g, [0.08, 0, 0]);
  }
  // thumb along the inside edge
  box(0.023, 0.068, 0.028, side * -0.035, 0.022, -0.01, glove, g, [0.15, 0, side * -0.5]);
  // forearm sleeve, angled down and back toward camera
  box(0.072, 0.078, 0.15, side * 0.004, -0.078, 0.085, sleeve, g, [0.55, 0, side * 0.03]);
  box(0.08, 0.026, 0.042, side * 0.004, -0.045, 0.026, glovePad, g, [0.3, 0, 0]);
  return g;
}

export function createRifle() {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);

  // receiver
  box(0.085, 0.105, 0.44, 0, 0, -0.11, gunMetal, model);
  box(0.074, 0.07, 0.36, 0, -0.02, -0.12, midPoly, model);
  box(0.09, 0.022, 0.3, 0, 0.056, -0.13, darkPoly, model);
  // rail
  box(0.05, 0.018, 0.44, 0, 0.079, -0.08, steel, model);
  for (let i = 0; i < 9; i++) box(0.054, 0.01, 0.013, 0, 0.092, -0.26 + i * 0.048, darkPoly, model);
  // handguard
  box(0.077, 0.082, 0.29, 0, 0.006, -0.45, midPoly, model);
  box(0.083, 0.018, 0.29, 0, 0.051, -0.45, darkPoly, model);
  for (let i = 0; i < 6; i++) box(0.087, 0.009, 0.02, 0, 0.01, -0.56 + i * 0.042, darkPoly, model);
  // barrel
  cyl(0.017, 0.017, 0.42, 0, 0.008, -0.64, gunMetal, model, [Math.PI / 2, 0, 0]);
  cyl(0.026, 0.03, 0.1, 0, 0.008, -0.86, steel, model, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) box(0.055, 0.018, 0.012, 0, 0.008, -0.89 + i * 0.022, darkPoly, model);
  // gas block + front sight
  box(0.05, 0.055, 0.06, 0, 0.05, -0.58, gunMetal, model);
  box(0.026, 0.06, 0.024, 0, 0.085, -0.58, darkPoly, model);
  // stock (single profiled body + buffer tube)
  profile([
    [0.04, 0.052], [0.19, 0.052], [0.235, 0.072], [0.295, 0.066],
    [0.322, 0.04], [0.322, -0.062], [0.285, -0.082], [0.215, -0.066],
    [0.16, -0.038], [0.04, -0.05]
  ], 0.056, darkPoly, model);
  cyl(0.026, 0.026, 0.13, 0, 0.016, 0.1, gunMetal, model, [Math.PI / 2, 0, 0]);
  // pistol grip (profiled, angled back)
  profile([
    [0.012, -0.012], [0.082, -0.012], [0.112, -0.142], [0.094, -0.196],
    [0.042, -0.196], [0.022, -0.142]
  ], 0.052, darkPoly, model);
  box(0.05, 0.024, 0.062, 0, -0.202, 0.068, midPoly, model, [0.2, 0, 0]);
  // trigger guard
  box(0.012, 0.055, 0.105, 0.04, -0.072, -0.035, gunMetal, model);
  box(0.064, 0.014, 0.1, 0, -0.102, -0.035, gunMetal, model);
  // magazine (curved STANAG profile)
  profile([
    [-0.148, -0.048], [-0.022, -0.048], [-0.032, -0.19], [-0.052, -0.242],
    [-0.142, -0.242], [-0.162, -0.19]
  ], 0.05, darkPoly, model);
  // optic
  box(0.052, 0.028, 0.11, 0, 0.105, -0.12, gunMetal, model);
  cyl(0.031, 0.031, 0.16, 0, 0.145, -0.12, gunMetal, model, [Math.PI / 2, 0, 0]);
  cyl(0.027, 0.027, 0.012, 0, 0.145, -0.202, lens, model, [Math.PI / 2, 0, 0]);
  cyl(0.024, 0.024, 0.01, 0, 0.145, -0.198, glass, model, [Math.PI / 2, 0, 0]);
  box(0.022, 0.02, 0.04, 0.035, 0.155, -0.09, steel, model);
  // flashlight
  cyl(0.022, 0.024, 0.1, -0.052, 0.015, -0.4, gunMetal, model, [Math.PI / 2, 0, 0]);
  cyl(0.019, 0.019, 0.006, -0.052, 0.015, -0.453, new THREE.MeshBasicMaterial({ color: 0xfff0c0, toneMapped: false }), model, [Math.PI / 2, 0, 0]);
  // side accent
  box(0.012, 0.018, 0.16, 0.044, 0.012, -0.12, accent, model);
  box(0.012, 0.018, 0.09, -0.044, 0.012, -0.44, accent, model);
  // charging handle
  box(0.04, 0.032, 0.05, 0.045, 0.042, 0.02, steel, model);
  // ejection port + controls
  box(0.006, 0.046, 0.095, 0.045, 0.026, -0.1, darkPoly, model);
  box(0.006, 0.018, 0.05, 0.046, -0.012, 0.0, steel, model);
  cyl(0.013, 0.013, 0.008, 0.047, -0.012, 0.045, steel, model, [0, 0, Math.PI / 2], 10);
  cyl(0.008, 0.008, 0.006, 0.047, 0.03, -0.2, steel, model, [0, 0, Math.PI / 2], 8);
  // magazine witness ribs and baseplate
  for (let i = 0; i < 3; i++) {
    const z = -0.085 - i * 0.008;
    box(0.004, 0.016, 0.062, 0.028, -0.1 - i * 0.04, z - 0.01, midPoly, model, [0.03, 0, 0]);
    box(0.004, 0.016, 0.062, -0.028, -0.1 - i * 0.04, z - 0.01, midPoly, model, [0.03, 0, 0]);
  }
  box(0.056, 0.026, 0.124, 0, -0.256, -0.1, darkPoly, model, [0.04, 0, 0]);
  // stock butt pad + cheek riser + sling loop
  box(0.058, 0.152, 0.02, 0, -0.006, 0.327, midPoly, model);
  box(0.05, 0.02, 0.12, 0, 0.072, 0.235, midPoly, model);
  cyl(0.014, 0.014, 0.008, 0.034, -0.052, 0.27, steel, model, [0, 0, Math.PI / 2], 8);
  box(0.018, 0.05, 0.02, -0.03, -0.04, 0.318, steel, model);
  // handguard side rails
  box(0.008, 0.026, 0.22, 0.043, 0.006, -0.45, darkPoly, model);
  box(0.008, 0.026, 0.22, -0.043, 0.006, -0.45, darkPoly, model);
  for (let i = 0; i < 5; i++) box(0.01, 0.032, 0.012, 0.043, 0.006, -0.53 + i * 0.04, gunMetal, model);
  // hands
  hand(model, 1);
  hand(model, -1);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.008, -0.925);
  root.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.06, 0.03, -0.04);
  root.add(eject);
  const { sprite, light } = flashRig(root, 0, 0.01, -0.94, 0.55);

  root.userData.muzzleFlash = sprite;
  root.userData.flashLight = light;
  root.userData.muzzle = muzzle;
  root.userData.eject = eject;
  return root;
}

export async function createRifleGLB(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = new THREE.Group();
  const model = gltf.scene;

  model.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(model);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const rawCenter = rawBox.getCenter(new THREE.Vector3());
  model.position.sub(rawCenter);

  const holder = new THREE.Group();
  holder.add(model);
  holder.rotation.y = -Math.PI / 2; // authored long axis +X, barrel -X -> forward -Z
  holder.scale.setScalar(1.3 / Math.max(rawSize.x, rawSize.y, rawSize.z));
  holder.position.set(0, 0.008, -0.3);
  root.add(holder);

  const tan = new THREE.Color(0x7f6c50);
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false;
    o.receiveShadow = false;
    o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || !m.color) continue;
      if (m.color.r > 0.15 && m.color.r > m.color.g * 1.03) {
        m.color.copy(tan);
        m.roughness = 0.58;
        m.metalness = 0.2;
      } else {
        m.color.multiplyScalar(2.7);
        m.roughness = Math.min(0.9, (m.roughness ?? 0.7) * 0.85 + 0.12);
        m.metalness = Math.min(0.82, (m.metalness ?? 0.1) + 0.28);
      }
      m.envMapIntensity = 0.65;
      m.needsUpdate = true;
    }
  });

  // gloved hands wrapped around the grip and handguard
  const rh = hand(root, 1);
  rh.position.set(0.0, -0.098, 0.045);
  rh.rotation.z = -0.04;
  const lh = hand(root, -1);
  lh.position.set(-0.004, -0.045, -0.5);
  lh.rotation.x = -0.12;

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.022, box.min.z + 0.01);
  root.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.055, 0.035, box.min.z + 0.54);
  root.add(eject);
  const { sprite, light } = flashRig(root, 0, 0.022, box.min.z - 0.015, 0.5);

  root.userData.muzzleFlash = sprite;
  root.userData.flashLight = light;
  root.userData.muzzle = muzzle;
  root.userData.eject = eject;
  root.userData.attribution = 'Low poly M4 Carbine Lvoa-C by Anysius (Sketchfab, CC Attribution)';
  return root;
}

export function createPistol() {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);

  box(0.062, 0.075, 0.3, 0, 0.015, -0.08, gunMetal, model);
  box(0.058, 0.05, 0.24, 0, -0.02, -0.06, darkPoly, model);
  box(0.064, 0.018, 0.25, 0, 0.055, -0.075, steel, model);
  for (let i = 0; i < 5; i++) box(0.058, 0.012, 0.014, 0, 0.067, -0.17 + i * 0.045, darkPoly, model);
  // barrel
  cyl(0.018, 0.018, 0.21, 0, 0.018, -0.28, gunMetal, model, [Math.PI / 2, 0, 0]);
  cyl(0.022, 0.022, 0.028, 0, 0.018, -0.39, steel, model, [Math.PI / 2, 0, 0]);
  // grip
  box(0.058, 0.17, 0.085, 0, -0.115, 0.04, darkPoly, model, [0.18, 0, 0]);
  for (let i = 0; i < 4; i++) box(0.061, 0.018, 0.05, 0, -0.08 - i * 0.032, 0.055 + i * 0.008, midPoly, model, [0.18, 0, 0]);
  box(0.05, 0.028, 0.08, 0, -0.205, 0.07, gunMetal, model, [0.18, 0, 0]);
  // trigger guard
  box(0.01, 0.05, 0.08, 0.032, -0.06, -0.01, gunMetal, model);
  box(0.052, 0.012, 0.08, 0, -0.087, -0.01, gunMetal, model);
  // sights
  box(0.032, 0.018, 0.018, 0, 0.075, 0.045, darkPoly, model);
  box(0.03, 0.02, 0.016, 0, 0.078, -0.21, darkPoly, model);
  // accent plate
  box(0.01, 0.018, 0.1, 0.034, -0.01, -0.07, accent, model);
  // hands
  hand(model, 1);
  const off = hand(model, -1);
  off.position.set(-0.055, -0.135, -0.02);
  off.rotation.z = -0.35;

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.018, -0.4);
  root.add(muzzle);
  const eject = new THREE.Object3D();
  eject.position.set(0.045, 0.04, -0.04);
  root.add(eject);
  const { sprite, light } = flashRig(root, 0, 0.018, -0.415, 0.34);
  root.userData.muzzleFlash = sprite;
  root.userData.flashLight = light;
  root.userData.muzzle = muzzle;
  root.userData.eject = eject;
  return root;
}
