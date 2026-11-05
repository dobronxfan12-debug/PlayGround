import * as THREE from 'three';
import {
  makeConcrete, makeAsphalt, makeMetal, makeWood, makeHazard, makeContainer, makeSign,
  makeHazardSign, makeHelipad, makeGlow, makeSkyEnvironment, rng, clamp
} from './textures.js';

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      topColor: { value: new THREE.Color('#0a1628') },
      midColor: { value: new THREE.Color('#35476b') },
      horizonColor: { value: new THREE.Color('#d47a45') },
      bottomColor: { value: new THREE.Color('#191a1b') },
      sunDir: { value: new THREE.Vector3(-0.55, 0.13, -0.83).normalize() },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor; uniform vec3 midColor; uniform vec3 horizonColor; uniform vec3 bottomColor;
      uniform vec3 sunDir; uniform float time; varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float h = vDir.y;
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.28, h));
        col = mix(col, topColor, smoothstep(0.22, 0.82, h));
        col = mix(bottomColor, col, smoothstep(-0.14, 0.02, h));
        float sun = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.42, 0.14) * pow(sun, 120.0) * 1.8;
        col += vec3(1.0, 0.34, 0.12) * pow(sun, 8.0) * 0.18;
        float band = smoothstep(0.03, 0.0, abs(h - 0.01));
        col += vec3(0.24, 0.09, 0.03) * band * 0.4;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

export function createWorld(scene, renderer) {
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const world = new THREE.Group();
  world.name = 'Blacksite';
  scene.add(world);

  scene.fog = new THREE.FogExp2(0x343a43, 0.0085);
  scene.environment = makeSkyEnvironment(renderer);
  scene.environmentIntensity = 1.05;

  const colliders = [];
  const worldShootables = [];
  const explosives = [];
  const animated = [];
  const hazardMat = new THREE.MeshStandardMaterial({ map: makeHazard(aniso), roughness: 0.72, metalness: 0.15 });
  const bulletHoleMat = null;

  // ---------- sky ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 40, 24), skyMaterial());
  sky.renderOrder = -100;
  scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 520; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = rng(0.1, 1.35);
    const r = 250;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fc3e8, size: 0.9, transparent: true, opacity: 0.65, depthWrite: false, fog: false }));
  scene.add(stars);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffe6bd, fog: false }));
  moon.position.set(-105, 82, -190);
  scene.add(moon);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlow(), color: 0xffc98d, transparent: true, opacity: 0.33, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  moonGlow.position.copy(moon.position);
  moonGlow.scale.set(58, 58, 1);
  scene.add(moonGlow);

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0x93aee0, 0x3a2a20, 1.12);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb37d, 3.05);
  sun.position.set(-46, 34, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x7c9fce, 0.8);
  fill.position.set(40, 22, -30);
  scene.add(fill);

  // ---------- materials ----------
  const concrete = makeConcrete(aniso);
  const asphalt = makeAsphalt(aniso);
  const matConcrete = new THREE.MeshStandardMaterial({ map: concrete.map, color: 0xc8c9c3, roughnessMap: concrete.rough, roughness: 0.92, metalness: 0.04 });
  const matConcreteDark = new THREE.MeshStandardMaterial({ map: concrete.map, color: 0x8f9391, roughnessMap: concrete.rough, roughness: 0.95, metalness: 0.03 });
  const matAsphalt = new THREE.MeshStandardMaterial({ map: asphalt, color: 0xd8d5cc, roughness: 0.88, metalness: 0.05 });
  const matMetal = new THREE.MeshStandardMaterial({ map: makeMetal(aniso, '#424a4d'), roughness: 0.45, metalness: 0.75 });
  const matDarkMetal = new THREE.MeshStandardMaterial({ map: makeMetal(aniso, '#282e30'), roughness: 0.34, metalness: 0.9 });
  const matRust = new THREE.MeshStandardMaterial({ map: makeMetal(aniso, '#67402e'), roughness: 0.82, metalness: 0.35 });
  const matWood = new THREE.MeshStandardMaterial({ map: makeWood(aniso), roughness: 0.86, metalness: 0.02 });
  const matSand = new THREE.MeshStandardMaterial({ color: 0x9b845d, roughness: 0.95, metalness: 0.01 });
  const matSandbag = new THREE.MeshStandardMaterial({ color: 0x8b7a58, roughness: 0.98, metalness: 0 });
  const matOrange = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff4300, emissiveIntensity: 2.4, roughness: 0.4 });
  const matRed = new THREE.MeshStandardMaterial({ color: 0x8c1119, emissive: 0xff182c, emissiveIntensity: 3.6, roughness: 0.3 });
  const matCyan = new THREE.MeshStandardMaterial({ color: 0x06252a, emissive: 0x35d9ef, emissiveIntensity: 3.5, roughness: 0.25, metalness: 0.2 });
  const matWindow = new THREE.MeshStandardMaterial({ color: 0x20140c, emissive: 0xff8a36, emissiveIntensity: 2.2, roughness: 0.2, metalness: 0.15 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x10191c, roughness: 0.12, metalness: 0.85 });
  const hazardSignMat = new THREE.MeshBasicMaterial({ map: makeHazardSign(), color: 0xffffff, toneMapped: false });

  // ---------- helpers ----------
  function addBox(w, h, d, x, y, z, mat, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    world.add(mesh);
    if (opts.shoot !== false) worldShootables.push(mesh);
    if (opts.collide) {
      const rot = opts.rotY || 0;
      const hw = (Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * d) / 2;
      const hd = (Math.abs(Math.sin(rot)) * w + Math.abs(Math.cos(rot)) * d) / 2;
      colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, height: y + h / 2, mesh });
    }
    return mesh;
  }

  function addCylinder(rt, rb, h, seg, x, y, z, mat, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    mesh.position.set(x, y, z);
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = true;
    world.add(mesh);
    if (opts.shoot !== false) worldShootables.push(mesh);
    return mesh;
  }

  function addPlane(w, h, x, y, z, mat, rotX = -Math.PI / 2, rotY = 0, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, 0);
    mesh.receiveShadow = opts.receive ?? true;
    mesh.castShadow = false;
    world.add(mesh);
    if (opts.shoot) worldShootables.push(mesh);
    return mesh;
  }

  function addLamp(x, y, z, color, intensity = 1.4, distance = 16) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.set(x, y, z);
    world.add(light);
    return light;
  }

  // ---------- ground ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), matConcrete);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);
  worldShootables.push(ground);

  addPlane(72, 62, 0, 0.012, -3, matAsphalt, -Math.PI / 2, 0, { shoot: false });
  addPlane(58, 7, 0, 0.02, 17, new THREE.MeshStandardMaterial({ color: 0x3f413b, roughness: 0.88 }), -Math.PI / 2, 0);
  // helipad
  const helipad = addPlane(17, 17, 17, 0.025, 12, new THREE.MeshBasicMaterial({ map: makeHelipad(), transparent: true, depthWrite: false, opacity: 0.55 }), -Math.PI / 2);
  helipad.renderOrder = 2;
  // hazard walkway
  for (let i = 0; i < 7; i++) {
    addPlane(1.1, 4.2, -11 + i * 3.6, 0.022, 3, hazardMat, -Math.PI / 2, 0);
  }
  // puddles with dark reflective surfaces
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x0e1720, roughness: 0.08, metalness: 0.86 });
  for (const [px, pz, s] of [[-8, 9, 4.6], [11, -11, 3.7], [24, 16, 3.2], [-25, 7, 4]]) {
    const p = addPlane(s * rng(1.3, 1.9), s * rng(0.5, 0.8), px, 0.018, pz, puddleMat, -Math.PI / 2, rng(0, 6.28));
    p.material = puddleMat;
  }

  // ---------- perimeter ----------
  const wallMat = new THREE.MeshStandardMaterial({ map: concrete.map, color: 0x9a9c94, roughnessMap: concrete.rough, roughness: 0.94, metalness: 0.04 });
  const wallH = 5.4;
  addBox(114, wallH, 1.2, 0, wallH / 2, -55, wallMat, { collide: true });
  addBox(114, wallH, 1.2, 0, wallH / 2, 55, wallMat, { collide: true });
  addBox(1.2, wallH, 114, -55, wallH / 2, 0, wallMat, { collide: true });
  addBox(1.2, wallH, 114, 55, wallH / 2, 0, wallMat, { collide: true });
  for (let i = -5; i <= 5; i++) {
    for (const side of [-55, 55]) {
      addBox(1.7, wallH + 0.9, 1.5, i * 10, (wallH + 0.9) / 2, side, matConcreteDark, { shoot: true });
      addBox(1.5, wallH + 0.6, 1.7, side, (wallH + 0.6) / 2, i * 10, matConcreteDark, { shoot: true });
    }
    // razor wire suggestion
    for (const side of [-55, 55]) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 5, 10), matMetal);
      coil.rotation.y = Math.PI / 2;
      coil.position.set(i * 10, wallH + 0.85, side);
      coil.castShadow = false;
      world.add(coil);
    }
  }
  // gate frame at south
  addBox(0.6, 7, 0.8, -5, 3.5, 54.2, matDarkMetal);
  addBox(0.6, 7, 0.8, 5, 3.5, 54.2, matDarkMetal);
  addBox(10.5, 0.5, 0.8, 0, 6.8, 54.2, matDarkMetal);
  const gateSign = addBox(7, 1.6, 0.15, 0, 5.5, 53.7, new THREE.MeshBasicMaterial({ map: makeSign('SECTOR 07', 'BLACKSITE ECHO // RESTRICTED', '#ff6a1a'), toneMapped: false }), { shoot: false });
  gateSign.castShadow = false;

  // ---------- warehouse ----------
  const bx = -25, bz = -27, bw = 24, bh = 8.2, bd = 18;
  addBox(bw, bh, bd, bx, bh / 2, bz, matConcreteDark, { collide: true });
  addBox(bw + 1.1, 0.7, bd + 1.1, bx, bh + 0.1, bz, matMetal, { shoot: true });
  // facade ribs
  for (let i = -2; i <= 2; i++) addBox(0.5, bh - 0.7, 0.35, bx + i * 5, bh / 2, bz + bd / 2 + 0.17, matMetal, { shoot: false });
  // door
  addBox(3.2, 4.4, 0.24, bx, 2.2, bz + bd / 2 + 0.22, matDarkMetal, { shoot: false });
  addBox(3.6, 0.35, 0.4, bx, 4.55, bz + bd / 2 + 0.25, matOrange, { shoot: false });
  addBox(0.18, 3.3, 0.3, bx + 1.1, 1.8, bz + bd / 2 + 0.3, matMetal, { shoot: false });
  // lit windows
  for (let i = 0; i < 4; i++) {
    const wx = bx - 8.4 + i * 5.4;
    addBox(2.7, 1.2, 0.12, wx, 5.9, bz + bd / 2 + 0.2, matWindow, { shoot: false, cast: false });
    addBox(3.0, 0.15, 0.22, wx, 5.2, bz + bd / 2 + 0.23, matMetal, { shoot: false, cast: false });
  }
  addLamp(bx - 6, 5.9, bz + 9.6, 0xff8738, 2.6, 21);
  addLamp(bx + 7, 5.9, bz + 9.6, 0xff8738, 2.0, 18);
  // roof units
  addBox(4.4, 1.2, 2.8, bx - 5, 8.9, bz - 3, matMetal);
  addBox(3.1, 0.8, 2.1, bx + 5, 8.8, bz - 5, matRust);
  addCylinder(0.7, 0.7, 2.4, 12, bx + 8, 9.4, bz + 2, matMetal);
  // pipes down facade
  addCylinder(0.24, 0.24, 6.4, 8, bx + 10.8, 3.2, bz + 9.2, matRust);
  addCylinder(0.24, 0.24, 6.4, 8, bx + 10.1, 3.2, bz + 9.2, matMetal);
  // sign
  const sign = addBox(8.4, 2.1, 0.16, bx, 7.1, bz + bd / 2 + 0.25, new THREE.MeshBasicMaterial({ map: makeSign('SECTOR 07', 'STORAGE // AUTHORIZED ONLY', '#ff6a1a'), toneMapped: false }), { shoot: false });
  sign.castShadow = false;

  // ---------- containers ----------
  const containerData = [
    [18, -24, 8.6, 2.9, 3.1, 0, '#2b5860'],
    [16.8, -19.8, 8.6, 2.9, 3.1, 0, '#66392e'],
    [27.5, -23, 2.9, 2.9, 8.5, 0.0, '#3b4a56'],
    [26.8, -23.2, 2.9, 2.9, 8.5, 0.0, '#4d5b3e'],
    [32, -13, 8.5, 2.9, 3.0, 0.0, '#5b4a2c'],
    [34, 27, 9, 2.9, 3.1, 0.0, '#2b5860'],
  ];
  for (const [cx, cz, cw, ch, cd, ry, color] of containerData) {
    const mat = new THREE.MeshStandardMaterial({ map: makeContainer(aniso, color), roughness: 0.72, metalness: 0.3 });
    addBox(cw, ch, cd, cx, ch / 2 + (cz === -23.2 ? 2.9 : 0), cz, mat, { collide: true, rotY: ry });
    addBox(cw + 0.12, 0.16, cd + 0.12, cx, ch + (cz === -23.2 ? 2.9 : 0), cz, matDarkMetal, { shoot: false });
    for (const sx of [-1, 1]) {
      addBox(0.13, ch, cd + 0.08, cx + sx * (cw / 2 - 0.08), ch / 2 + (cz === -23.2 ? 2.9 : 0), cz, matMetal, { shoot: false });
    }
    // door rods on one end
    for (let i = 0; i < 4; i++) addBox(0.08, ch * 0.78, 0.08, cx - cw / 2 + 0.12 + i * 0.22, ch / 2 + 0.8, cz + cd / 2 + 0.02, matMetal, { shoot: false });
  }

  // ---------- watchtower ----------
  const twx = 40, twz = -45;
  for (const sx of [-2.4, 2.4]) for (const sz of [-2.4, 2.4]) {
    addBox(0.45, 7.2, 0.45, twx + sx, 3.6, twz + sz, matDarkMetal, { shoot: true });
    colliders.push({ minX: twx + sx - 0.4, maxX: twx + sx + 0.4, minZ: twz + sz - 0.4, maxZ: twz + sz + 0.4 });
  }
  addBox(6.4, 0.4, 6.4, twx, 7.2, twz, matMetal);
  addBox(4.6, 2.8, 4.6, twx, 8.7, twz, matConcreteDark);
  addBox(5.3, 0.35, 5.3, twx, 10.2, twz, matDarkMetal, { shoot: false });
  addBox(3.9, 0.9, 0.14, twx, 9.2, twz + 2.36, matWindow, { shoot: false, cast: false });
  addBox(0.14, 0.9, 3.9, twx - 2.36, 9.2, twz, matWindow, { shoot: false, cast: false });
  addBox(0.3, 2.8, 0.3, twx + 2.2, 11.4, twz - 1.8, matMetal);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), matRed);
  beacon.position.set(twx + 2.2, 12.9, twz - 1.8);
  world.add(beacon);
  addLamp(twx + 2.2, 12.5, twz - 1.8, 0xff2030, 2.0, 16);
  const towerLight = new THREE.SpotLight(0xffe3b0, 120, 58, Math.PI / 7, 0.55, 1.8);
  towerLight.position.set(twx, 10.3, twz);
  towerLight.target.position.set(3, 0, -5);
  scene.add(towerLight);
  scene.add(towerLight.target);
  // visible light cone
  const cone = new THREE.Mesh(new THREE.ConeGeometry(6.5, 26, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffdfb0, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.set(twx - 6, 5.5, twz + 10);
  cone.rotation.x = -0.55;
  cone.rotation.z = 0.05;
  world.add(cone);
  animated.push((t) => { beacon.material.emissiveIntensity = 2.2 + Math.sin(t * 4.2) * 1.6; cone.material.opacity = 0.028 + Math.sin(t * 0.7) * 0.008; });

  // ---------- central relay ----------
  const relayBase = addCylinder(1.7, 2.1, 0.5, 20, 0, 0.25, 0, matDarkMetal, { shoot: true });
  addCylinder(0.22, 0.35, 2.2, 12, 0, 1.6, 0, matMetal);
  const relayRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.055, 8, 44), matCyan);
  relayRing.position.set(0, 2.3, 0);
  relayRing.rotation.x = Math.PI / 2;
  world.add(relayRing);
  const relayCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), matCyan);
  relayCore.position.set(0, 2.35, 0);
  world.add(relayCore);
  addLamp(0, 2.4, 0, 0x40dff1, 3.6, 13);
  animated.push((t) => { relayRing.rotation.z = t * 0.8; relayRing.rotation.y = Math.sin(t * 0.7) * 0.3; relayCore.rotation.y = t * 1.4; relayCore.position.y = 2.35 + Math.sin(t * 2) * 0.06; });
  // holographic vertical beam
  const holo = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 8, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x42d9ef, transparent: true, opacity: 0.028, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  holo.position.set(0, 4.2, 0);
  world.add(holo);
  animated.push((t) => { holo.rotation.y = -t * 0.35; holo.material.opacity = 0.022 + Math.sin(t * 1.8) * 0.01; });
  colliders.push({ minX: -1.7, maxX: 1.7, minZ: -1.7, maxZ: 1.7 });

  // ---------- obstacles: crates, barrels, barriers, sandbags ----------
  function crate(x, z, s = 1.25, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, s / 2, z);
    g.rotation.y = rotY;
    world.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), matWood);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    worldShootables.push(body);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3c2c1e, roughness: 0.82, metalness: 0.1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, s + 0.06, 0.1), frameMat);
      post.position.set(sx * s * 0.47, 0, sz * s * 0.47);
      post.castShadow = true;
      g.add(post);
    }
    colliders.push({ minX: x - s * 0.65, maxX: x + s * 0.65, minZ: z - s * 0.65, maxZ: z + s * 0.65 });
    return g;
  }
  const cratePositions = [
    [9, 7, 1.4], [-9, 8, 1.2], [12, -7, 1.5], [-13, -8, 1.2], [21, 4, 1.1],
    [-30, 13, 1.3], [30, 8, 1.25], [-7, 16, 1.0], [7, 20, 1.15], [22, 33, 1.35],
    [-35, -10, 1.4], [-6, -14, 1.15], [37, -4, 1.2]
  ];
  for (const [x, z, s] of cratePositions) crate(x, z, s, rng(-0.2, 0.2));
  // stacked crates
  crate(10.6, 7.4, 1.0, 0); crate(10.6, 7.4, 0.85, 0.3).position.y = 1.9;

  function barrel(x, z, explosive = false) {
    const mat = explosive ? new THREE.MeshStandardMaterial({ color: 0xa31a15, roughness: 0.55, metalness: 0.45, emissive: 0x3f0502, emissiveIntensity: 0.5 }) : new THREE.MeshStandardMaterial({ map: makeMetal(aniso, '#4e5d3e'), roughness: 0.5, metalness: 0.65 });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.05, 16), mat);
    b.position.set(x, 0.53, z);
    b.castShadow = b.receiveShadow = true;
    world.add(b);
    worldShootables.push(b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.035, 6, 18), matDarkMetal);
    ring.position.set(x, 0.82, z); ring.rotation.x = Math.PI / 2; world.add(ring);
    if (explosive) {
      b.userData.explosive = true;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), hazardSignMat);
      sign.position.set(x, 0.62, z + 0.385);
      world.add(sign);
      explosives.push({ mesh: b, hp: 24, position: b.position.clone(), exploded: false });
    }
    colliders.push({ minX: x - 0.42, maxX: x + 0.42, minZ: z - 0.42, maxZ: z + 0.42 });
    return b;
  }
  barrel(-16, 3); barrel(-15, 3.8); barrel(16, -13, true); barrel(17.1, -13.1, true);
  barrel(-27, 18, true); barrel(-28, 18.1, true); barrel(29, 20); barrel(28, 20.8);
  barrel(4, -5, true); barrel(4, 4, false);

  function jersey(x, z, rotY = 0, len = 3.4) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    world.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.42, 0.78), matConcrete);
    base.position.y = 0.21; base.castShadow = base.receiveShadow = true; g.add(base); worldShootables.push(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.24, 0.46), matConcrete);
    top.position.y = 0.52; top.castShadow = true; g.add(top); worldShootables.push(top);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.72, 0.18), hazardMat);
    stripe.position.set(0, 0.43, 0.392); g.add(stripe);
    colliders.push({ minX: x - len / 2, maxX: x + len / 2, minZ: z - 0.45, maxZ: z + 0.45 });
  }
  jersey(-5, 11, 0.16); jersey(5, 11, -0.12); jersey(-10, -2, Math.PI / 2, 2.8); jersey(10, -2, Math.PI / 2, 2.8);
  jersey(23, 16, 0.9, 2.8); jersey(-23, 22, -0.5, 2.8); jersey(36, -2, Math.PI / 2, 2.6);

  // sandbag emplacements
  const bagGeo = new THREE.SphereGeometry(1, 7, 5);
  for (const [sx, sz, rows, cols, rot] of [[-4, 22, 3, 4, 0.1], [5, 24, 2, 5, -0.15], [-33, 2, 3, 5, 1.2], [30, -35, 3, 4, 0.2]]) {
    const g = new THREE.Group(); g.position.set(sx, 0, sz); g.rotation.y = rot; world.add(g);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bag = new THREE.Mesh(bagGeo, matSandbag);
        bag.scale.set(0.38, 0.17, 0.27);
        bag.position.set((c - (cols - 1) / 2) * 0.72 + (r % 2) * 0.34, 0.18 + r * 0.29, (Math.random() - 0.5) * 0.06);
        bag.rotation.y = rng(-0.15, 0.15);
        bag.castShadow = bag.receiveShadow = true;
        g.add(bag); worldShootables.push(bag);
      }
    }
    colliders.push({ minX: sx - cols * 0.4, maxX: sx + cols * 0.4, minZ: sz - 0.55, maxZ: sz + 0.55 });
  }

  // ---------- humvee wreck ----------
  const hx = 19, hz = 24;
  addBox(3.0, 0.65, 5.6, hx, 0.8, hz, matDarkMetal, { collide: true, rotY: 0.35 });
  addBox(2.7, 0.8, 2.7, hx, 1.5, hz - 0.55, new THREE.MeshStandardMaterial({ color: 0x3b442f, roughness: 0.75, metalness: 0.5 }), { rotY: 0.35 });
  addBox(2.55, 0.75, 0.1, hx, 1.7, hz + 0.93, matGlass, { rotY: 0.35 });
  for (const [wx, wz] of [[-1.25, -1.8], [1.25, -1.8], [-1.25, 1.8], [1.25, 1.8]]) {
    addCylinder(0.46, 0.46, 0.4, 12, hx + wx, 0.48, hz + wz, matDarkMetal, { rotZ: Math.PI / 2, shoot: true });
  }
  addBox(0.18, 0.18, 1.5, hx + 0.3, 2.4, hz - 0.2, matMetal, { rotX: -0.4 });
  addLamp(hx - 2.4, 0.8, hz + 2.5, 0xffa040, 0.8, 7);

  // ---------- courtyard lamp posts ----------
  for (const [lx, lz] of [[-13, 16], [13, 15], [0, 31], [-29, 28], [29, 29]]) {
    addCylinder(0.09, 0.14, 5.2, 8, lx, 2.6, lz, matDarkMetal);
    addBox(1.25, 0.28, 0.42, lx, 5.15, lz, matMetal, { rotY: Math.atan2(-lx, -lz) });
    const glow = addBox(0.95, 0.11, 0.26, lx, 4.98, lz, new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffb35c, emissiveIntensity: 3.6, roughness: 0.2 }), { shoot: false, cast: false });
    addLamp(lx, 4.8, lz, 0xffbd7a, 1.35, 14);
    colliders.push({ minX: lx - 0.18, maxX: lx + 0.18, minZ: lz - 0.18, maxZ: lz + 0.18 });
  }

  // ---------- floodlight poles ----------
  for (const [fx, fz] of [[-48, 40], [46, 44], [-46, -45], [44, -42]]) {
    addCylinder(0.18, 0.3, 11, 8, fx, 5.5, fz, matDarkMetal);
    addBox(1.5, 0.42, 0.55, fx, 11.1, fz, matMetal, { rotY: Math.atan2(-fx, -fz) });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffc070, emissiveIntensity: 3.2, roughness: 0.2 });
    addBox(1.1, 0.16, 0.3, fx, 10.86, fz + 0.05, lampMat, { shoot: false, cast: false });
    addLamp(fx, 10.7, fz, 0xffc98a, 1.1, 17);
  }

  // ---------- details: cables, antennas, pipes ----------
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.035, 5, 16, Math.PI), matMetal);
    p.position.set(-38 + i * 10, 5.2, -54.3);
    p.rotation.set(0, 0, 0);
    world.add(p);
  }
  for (let i = 0; i < 3; i++) {
    const mast = addCylinder(0.09, 0.14, 8, 6, -40 + i * 6, 4, -52, matMetal);
    addBox(1.2, 0.06, 0.06, -40 + i * 6, 7.4, -52, matMetal);
  }
  // warning signs at walls
  for (const [sx, sy, sz, ry] of [[-18, 2.1, 54.1, 0], [8, 2.1, 54.1, 0], [-54.1, 2.1, 8, Math.PI / 2], [54.1, 2.1, -12, -Math.PI / 2]]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: makeSign('RESTRICTED', 'USE OF FORCE AUTHORIZED', '#d94a3a'), toneMapped: false }));
    pl.position.set(sx, sy, sz); pl.rotation.y = ry; world.add(pl);
  }

  // ---------- distant mountain ridges ----------
  function ridgeRing(radius, base, amplitude, color, seed) {
    const seg = 180;
    const pos = [];
    const tops = [];
    const bottoms = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const r = radius + Math.sin(a * 3 + seed) * 9 + Math.sin(a * 7 + seed * 1.7) * 5;
      const h = base + amplitude * (
        0.32 + 0.26 * Math.sin(a * 5 + seed) + 0.18 * Math.sin(a * 11 + seed * 2.3) +
        0.14 * Math.sin(a * 17 + seed * 0.7) + 0.1 * Math.sin(a * 29 + seed * 3.1)
      );
      tops.push([Math.cos(a) * r, Math.max(1, h), Math.sin(a) * r]);
      bottoms.push([Math.cos(a) * (r + 12), -12, Math.sin(a) * (r + 12)]);
    }
    for (let i = 0; i < seg; i++) {
      const t0 = tops[i], t1 = tops[i + 1], b0 = bottoms[i], b1 = bottoms[i + 1];
      pos.push(...t0, ...b0, ...t1, ...t1, ...b0, ...b1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, fog: true, side: THREE.DoubleSide }));
    scene.add(mesh);
  }
  ridgeRing(205, 2, 46, 0x1c2636, 1.7);
  ridgeRing(158, 1, 28, 0x151d2a, 4.2);

  // distant relay towers break up the horizon
  const towerMat = new THREE.MeshBasicMaterial({ color: 0x121923, fog: true });
  const cityLightMat = new THREE.MeshBasicMaterial({ color: 0xffa04a, fog: true });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r = rng(112, 148);
    const h = rng(14, 30);
    const tw = new THREE.Mesh(new THREE.BoxGeometry(rng(4, 8), h, rng(4, 8)), towerMat);
    tw.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    tw.rotation.y = Math.random() * Math.PI;
    scene.add(tw);
    if (i % 2 === 0) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.4), cityLightMat);
      light.position.set(tw.position.x, h - 6, tw.position.z);
      light.position.x += Math.cos(a) * 2.6;
      light.position.z += Math.sin(a) * 2.6;
      light.lookAt(0, h - 6, 0);
      scene.add(light);
    }
  }

  // ---------- dust motes ----------
  const dustCount = 900;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustSpeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = rng(-54, 54);
    dustPos[i * 3 + 1] = rng(0.3, 17);
    dustPos[i * 3 + 2] = rng(-54, 54);
    dustSpeed[i] = rng(0.18, 0.7);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ size: 0.075, color: 0xffc98f, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, map: makeGlow(), sizeAttenuation: true });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ---------- smoke stacks ----------
  const smokeSprites = [];
  const smokeMatBase = new THREE.SpriteMaterial({ map: makeGlow(), color: 0x22252a, transparent: true, opacity: 0.1, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(smokeMatBase.clone());
    s.position.set(-25 + rng(-2, 2), 8.5 + i * 0.5, -20 + rng(-2, 2));
    s.scale.set(4 + i * 0.6, 4 + i * 0.6, 1);
    s.material.opacity = 0.12 * (1 - i / 18);
    scene.add(s);
    smokeSprites.push(s);
  }

  const spawnPoints = [
    new THREE.Vector3(-42, 0, -38), new THREE.Vector3(40, 0, -36), new THREE.Vector3(-46, 0, 16),
    new THREE.Vector3(46, 0, 12), new THREE.Vector3(-34, 0, 46), new THREE.Vector3(36, 0, 46),
    new THREE.Vector3(-8, 0, -48), new THREE.Vector3(40, 0, 30), new THREE.Vector3(-42, 0, 31),
    new THREE.Vector3(6, 0, -48)
  ];

  function update(t, dt) {
    for (const fn of animated) fn(t, dt);
    const pos = dustGeo.attributes.position.array;
    for (let i = 0; i < dustCount; i++) {
      pos[i * 3] += dustSpeed[i] * dt;
      pos[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.004;
      if (pos[i * 3] > 54) pos[i * 3] = -54;
    }
    dustGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < smokeSprites.length; i++) {
      smokeSprites[i].position.y += dt * (0.22 + i * 0.006);
      if (smokeSprites[i].position.y > 16) smokeSprites[i].position.y = 8.2;
    }
    stars.rotation.y += dt * 0.002;
  }

  return { group: world, colliders, worldShootables, explosives, spawnPoints, update, sun, beacon };
}
