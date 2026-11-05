// Procedural, thematic zone scenery for the floating honey island.
import * as THREE from 'three'
import { TAU, glowTexture, rand } from './world-visuals.js'

const G = {
  sphere: new THREE.SphereGeometry(1, 10, 8),
  ico: new THREE.IcosahedronGeometry(1, 0),
  cone: new THREE.ConeGeometry(1, 1, 7),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  hex: new THREE.CylinderGeometry(1, 1, 1, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  octa: new THREE.OctahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.14, 6, 18),
  circle: new THREE.CircleGeometry(1, 20),
}

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.82,
    metalness: opts.metalness ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: opts.flatShading ?? true,
    ...(opts.transparent === undefined ? {} : { transparent: opts.transparent }),
    opacity: opts.opacity ?? 1,
    ...(opts.side === undefined ? {} : { side: opts.side }),
  })
}

function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

const FLOWER_SPOTS = [
  [-4.0, 2.25, 1.0],
  [-2.9, 3.05, -0.55],
  [-1.15, 2.75, 0.3],
  [0.35, 3.1, 0.25],
  [2.55, 3.0, 0.85],
  [4.05, 1.65, 0.9],
  [4.15, -0.55, 0.95],
  [2.95, -2.65, 0.7],
  [0.65, -3.45, 0.6],
  [-1.6, -3.15, 0.7],
  [-4.15, -1.15, 0.8],
]

function makeFlower(kind, vis, scale = 1) {
  const group = new THREE.Group()
  const stemMat = std(vis.stem, { roughness: 0.9 })
  const leafMat = std(vis.leaf, { roughness: 0.9 })
  const petalMat = std(vis.petals[Math.floor(Math.random() * vis.petals.length)], {
    roughness: 0.65,
    emissive: kind === 'crystal' ? vis.petals[0] : 0x000000,
    emissiveIntensity: kind === 'crystal' ? 0.5 : 0,
  })
  const centerMat = std(vis.center, {
    roughness: 0.5,
    emissive: kind === 'crystal' ? vis.center : 0x000000,
    emissiveIntensity: kind === 'crystal' ? 0.65 : 0,
  })

  let topY = 0.8
  if (kind === 'cactus') {
    const stem = mesh(G.cyl, stemMat, 0, 0.25, 0, 0.09, 0.5, 0.09)
    group.add(stem)
    // Tiny arms.
    for (const side of [-1, 1]) {
      const arm = mesh(G.cyl, stemMat, side * 0.14, 0.3, 0, 0.05, 0.2, 0.05)
      group.add(arm)
    }
    topY = 0.48
  } else if (kind === 'crystal') {
    const stem = mesh(G.cyl, stemMat, 0, 0.3, 0, 0.05, 0.6, 0.05)
    group.add(stem)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU
      const shard = mesh(G.octa, petalMat, Math.cos(a) * 0.14, 0.66 + Math.sin(i) * 0.03, Math.sin(a) * 0.14, 0.09, 0.16, 0.09)
      shard.rotation.set(rand(-0.4, 0.4), a, rand(-0.4, 0.4))
      group.add(shard)
    }
    const core = mesh(G.octa, centerMat, 0, 0.78, 0, 0.1, 0.15, 0.1)
    group.add(core)
    topY = 0.82
  } else {
    const stem = mesh(G.cyl, stemMat, 0, 0.32, 0, 0.028, 0.64, 0.028)
    group.add(stem)
    const leaf = mesh(G.sphere, leafMat, 0.1, 0.3, 0.02, 0.14, 0.05, 0.08)
    leaf.rotation.z = 0.45
    group.add(leaf)
    const leaf2 = leaf.clone()
    leaf2.position.x = -0.1
    leaf2.rotation.z = -0.45
    group.add(leaf2)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3
      const petal = mesh(G.sphere, petalMat, Math.cos(a) * 0.12, 0.7 + Math.sin(i * 1.3) * 0.02, Math.sin(a) * 0.12, 0.1, 0.045, 0.1)
      petal.rotation.y = -a
      group.add(petal)
    }
    const center = mesh(G.sphere, centerMat, 0, 0.71, 0, 0.06, 0.05, 0.06)
    group.add(center)
    topY = 0.76
  }

  group.scale.setScalar(scale)
  group.rotation.y = rand(0, TAU)
  return { group, topY: topY * scale + 0.05 * scale }
}

function makeGrass(vis, scale = 1) {
  const group = new THREE.Group()
  const mat = std(vis.leaf, { roughness: 0.92 })
  for (let i = 0; i < 4; i++) {
    const blade = mesh(G.cone, mat, rand(-0.07, 0.07), 0.14, rand(-0.07, 0.07), 0.035, 0.32, 0.035)
    blade.rotation.z = rand(-0.3, 0.3)
    group.add(blade)
  }
  group.scale.setScalar(scale)
  return group
}

function makeRock(color, scale = 1) {
  const rock = mesh(G.ico, std(color, { roughness: 0.95 }), 0, 0.18, 0, 0.42, 0.28, 0.38)
  rock.rotation.set(rand(0, 1), rand(0, TAU), rand(0, 1))
  rock.scale.multiplyScalar(scale)
  return rock
}

function makeRoundTree(vis, scale = 1) {
  const group = new THREE.Group()
  const trunkMat = std(0x8a5a32, { roughness: 0.9 })
  const leafMat = std(0x4f9b40, { roughness: 0.88 })
  const leafLight = std(0x6fbd4f, { roughness: 0.88 })
  const trunk = mesh(G.cyl, trunkMat, 0, 1.0, 0, 0.19, 2.0, 0.19)
  group.add(trunk)
  const blobs = [
    [0, 2.35, 0, 1.02],
    [0.55, 2.0, 0.2, 0.72],
    [-0.5, 2.05, -0.15, 0.68],
    [0.1, 2.8, -0.3, 0.58],
  ]
  blobs.forEach(([x, y, z, s], i) => {
    const leaf = mesh(G.ico, i % 2 ? leafLight : leafMat, x, y, z, s, s * 0.85, s)
    leaf.rotation.y = rand(0, TAU)
    group.add(leaf)
  })
  group.scale.setScalar(scale)
  return group
}

function makePine(vis, scale = 1) {
  const group = new THREE.Group()
  const trunk = mesh(G.cyl, std(0x6d4a2a), 0, 0.75, 0, 0.16, 1.5, 0.16)
  group.add(trunk)
  const green = std(0x2f6a55, { roughness: 0.85 })
  const snow = std(0xf4fdff, { roughness: 0.65 })
  const tiers = [
    [1.25, 2.4, 1.25, 1.15],
    [1.6, 1.8, 1.6, 0.95],
    [1.95, 1.15, 1.95, 0.72],
  ]
  for (const [y, h, r, s] of tiers) {
    const cone = mesh(G.cone, green, 0, y, 0, r, h, r)
    cone.position.y = y
    group.add(cone)
    const cap = mesh(G.cone, snow, 0, y + h * 0.28, 0, r * 0.72, h * 0.34, r * 0.72)
    group.add(cap)
  }
  const topSnow = mesh(G.sphere, snow, 0, 3.05, 0, 0.2, 0.16, 0.2)
  group.add(topSnow)
  group.scale.setScalar(scale)
  return group
}

function makeCactus(vis, scale = 1) {
  const group = new THREE.Group()
  const green = std(0x4f9c58, { roughness: 0.85 })
  const dark = std(0x3f7f49, { roughness: 0.9 })
  const body = mesh(G.cyl, green, 0, 0.9, 0, 0.3, 1.8, 0.3)
  group.add(body)
  const top = mesh(G.sphere, green, 0, 1.78, 0, 0.3, 0.18, 0.3)
  group.add(top)
  for (const side of [-1, 1]) {
    const arm = mesh(G.cyl, green, side * 0.42, 0.95, 0, 0.16, 0.65, 0.16)
    arm.rotation.z = side * 0.35
    group.add(arm)
    const elbow = mesh(G.sphere, green, side * 0.3, 1.25, 0, 0.17, 0.17, 0.17)
    group.add(elbow)
    const tip = mesh(G.cyl, green, side * 0.5, 1.48, 0, 0.14, 0.4, 0.14)
    group.add(tip)
    const tipTop = mesh(G.sphere, green, side * 0.5, 1.68, 0, 0.14, 0.1, 0.14)
    group.add(tipTop)
  }
  for (let i = 0; i < 4; i++) {
    const spine = mesh(G.cone, dark, rand(-0.26, 0.26), rand(0.5, 1.6), 0.28, 0.025, 0.1, 0.025)
    group.add(spine)
  }
  const bloom = makeFlower('cactus', vis, 0.8)
  bloom.group.position.set(0.04, 1.78, 0.05)
  group.add(bloom.group)
  group.scale.setScalar(scale)
  return group
}

function makePalm(vis, scale = 1) {
  const group = new THREE.Group()
  const trunkMat = std(0x9a6b3d, { roughness: 0.9 })
  const leafMat = std(0x4d9b47, { roughness: 0.85 })
  for (let i = 0; i < 5; i++) {
    const seg = mesh(G.cyl, trunkMat, Math.sin(i * 0.22) * 0.34, 0.45 + i * 0.48, 0, 0.18 - i * 0.015, 0.52, 0.18 - i * 0.015)
    seg.rotation.z = -0.12
    group.add(seg)
  }
  const crownY = 2.7
  const crownX = 0.55
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU
    const leaf = mesh(G.cone, leafMat, crownX + Math.cos(a) * 0.85, crownY - 0.1, Math.sin(a) * 0.85, 0.25, 1.9, 0.12)
    leaf.rotation.z = Math.PI / 2 + 0.2
    leaf.rotation.y = -a
    leaf.position.y = crownY + Math.sin(i) * 0.12
    group.add(leaf)
  }
  const crown = mesh(G.sphere, std(0x6cb34e), crownX, crownY, 0, 0.25, 0.2, 0.25)
  group.add(crown)
  group.scale.setScalar(scale)
  return group
}

function makeCrystalCluster(vis, scale = 1) {
  const group = new THREE.Group()
  const colors = [vis.petals[0], vis.petals[1], vis.petals[2]]
  const count = 5
  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length]
    const mat = std(color, {
      roughness: 0.18,
      metalness: 0.25,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.94,
    })
    const h = rand(0.6, 1.8)
    const shard = mesh(G.octa, mat, rand(-0.55, 0.55), h * 0.42, rand(-0.4, 0.4), rand(0.15, 0.32), h * 0.62, rand(0.15, 0.32))
    shard.rotation.set(rand(-0.35, 0.35), rand(0, TAU), rand(-0.35, 0.35))
    group.add(shard)
  }
  const base = makeRock(vis.rockDark, 0.8)
  group.add(base)
  group.scale.setScalar(scale)
  return group
}

function makeGlowShroom(vis, scale = 1) {
  const group = new THREE.Group()
  const stem = mesh(G.cyl, std(0x8c76b8, { emissive: 0x5b3e85, emissiveIntensity: 0.25 }), 0, 0.28, 0, 0.06, 0.56, 0.06)
  group.add(stem)
  const capColor = vis.petals[Math.floor(rand(0, vis.petals.length))]
  const cap = mesh(G.sphere, std(capColor, { emissive: capColor, emissiveIntensity: 0.55, roughness: 0.3 }), 0, 0.6, 0, 0.22, 0.12, 0.22)
  group.add(cap)
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color: capColor, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
  )
  glow.position.set(0, 0.6, 0)
  glow.scale.setScalar(1.1)
  group.add(glow)
  group.scale.setScalar(scale)
  return group
}

function makeIceSpike(vis, scale = 1) {
  const group = new THREE.Group()
  const mat = std(0xd4f4ff, {
    roughness: 0.12,
    metalness: 0.15,
    emissive: 0x8fd9ff,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.9,
  })
  for (let i = 0; i < 4; i++) {
    const h = rand(0.7, 1.8)
    const spike = mesh(G.cone, mat, rand(-0.35, 0.35), h * 0.5, rand(-0.3, 0.3), rand(0.14, 0.26), h, rand(0.14, 0.26))
    spike.rotation.z = rand(-0.2, 0.2)
    group.add(spike)
  }
  group.scale.setScalar(scale)
  return group
}

function makeGoldPillar(vis, scale = 1) {
  const group = new THREE.Group()
  const gold = std(0xf3c548, { roughness: 0.28, metalness: 0.72, emissive: 0x8a5b00, emissiveIntensity: 0.18 })
  const dark = std(0xb7871d, { roughness: 0.4, metalness: 0.6 })
  const h = rand(1.4, 2.8)
  const pillar = mesh(G.hex, gold, 0, h / 2, 0, 0.36, h, 0.36)
  group.add(pillar)
  const cap = mesh(G.hex, dark, 0, h + 0.12, 0, 0.44, 0.16, 0.44)
  group.add(cap)
  // Comb cells.
  for (let i = 0; i < 4; i++) {
    const cell = mesh(G.hex, dark, rand(-0.22, 0.22), rand(0.35, h - 0.15), 0.32, 0.12, 0.03, 0.12)
    group.add(cell)
  }
  group.scale.setScalar(scale)
  return group
}

function makeCoin(scale = 1) {
  const coin = new THREE.Group()
  const mat = std(0xffd35e, { roughness: 0.25, metalness: 0.8, emissive: 0x8a5a00, emissiveIntensity: 0.2 })
  const disc = mesh(G.cyl, mat, 0, 0.06, 0, 0.3, 0.08, 0.3)
  disc.rotation.x = Math.PI / 2
  disc.rotation.z = rand(0, TAU)
  coin.add(disc)
  coin.scale.setScalar(scale)
  return coin
}

function makeButterfly(color) {
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  const wingGeo = new THREE.CircleGeometry(0.12, 6)
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, mat)
    wing.position.x = side * 0.11
    wing.scale.set(1, 1.5, 1)
    group.add(wing)
  }
  return group
}

function makeFence(vis) {
  const group = new THREE.Group()
  const wood = std(0x9a6a38, { roughness: 0.9 })
  for (let i = 0; i < 5; i++) {
    const x = -4.2 + i * 0.62
    const z = -2.05 - i * 0.36
    const post = mesh(G.box, wood, x, 0.5, z, 0.13, 1.0, 0.13)
    group.add(post)
    const tip = mesh(G.cone, wood, x, 1.04, z, 0.1, 0.16, 0.1)
    group.add(tip)
  }
  for (let r = 0; r < 2; r++) {
    const rail = mesh(G.box, wood, -3.0, 0.38 + r * 0.31, -2.73, 2.75, 0.07, 0.08)
    rail.rotation.y = -0.53
    group.add(rail)
  }
  return group
}

function makePond(vis) {
  const group = new THREE.Group()
  const ice = mesh(G.circle, std(0xbfefff, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.82 }), 0, 0.025, 0, 1.45, 1.45, 1.45)
  ice.rotation.x = -Math.PI / 2
  group.add(ice)
  const rimMat = std(0xe4fbff, { roughness: 0.4 })
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU
    const snow = mesh(G.ico, rimMat, Math.cos(a) * 1.42, 0.09, Math.sin(a) * 1.1, 0.22, 0.13, 0.2)
    group.add(snow)
  }
  group.position.set(-0.45, 0, -3.1)
  return group
}

function makeAmbientParticles(vis) {
  const cfg = vis.ambientMotes
  const count = cfg.count
  const positions = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU)
    const r = Math.sqrt(Math.random()) * 6.2
    positions[i * 3] = Math.cos(a) * r
    positions[i * 3 + 1] = rand(0.5, cfg.mode === 'snow' ? 7 : 5.5)
    positions[i * 3 + 2] = Math.sin(a) * r
    speeds[i] = rand(0.55, 1.45)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const isSnow = cfg.mode === 'snow'
  const mat = new THREE.PointsMaterial({
    color: cfg.color,
    size: isSnow ? 0.1 : 0.075,
    transparent: true,
    opacity: isSnow ? 0.9 : 0.75,
    depthWrite: false,
    blending: isSnow ? THREE.NormalBlending : THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.userData = { cfg, speeds }
  return points
}

export function createZoneEnvironment(zone, vis) {
  const group = new THREE.Group()
  const flowerPoints = []
  const bobbers = []

  const addFlower = (x, z, kind, scale = rand(0.9, 1.25)) => {
    const flower = makeFlower(kind, vis, scale)
    flower.group.position.set(x, 0, z)
    group.add(flower.group)
    flowerPoints.push(new THREE.Vector3(x, flower.topY + 0.2, z))
  }

  const addGrass = (count, color) => {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU)
      const r = rand(2.0, 5.0)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.hypot(x - 1.9, z - 0.7) < 1.7) continue
      if (Math.hypot(x + 2.5, z) < 1.4) continue
      const g = makeGrass(vis, rand(0.7, 1.3))
      g.position.set(x, 0, z)
      group.add(g)
    }
  }

  const addRock = (x, z, scale = 1, matColor = vis.rock) => {
    const rock = makeRock(matColor, scale)
    rock.position.x = x
    rock.position.z = z
    group.add(rock)
  }

  if (zone.id === 'meadow') {
    addFlower(FLOWER_SPOTS[0][0], FLOWER_SPOTS[0][1], 'flower')
    addFlower(FLOWER_SPOTS[1][0], FLOWER_SPOTS[1][1], 'flower')
    addFlower(FLOWER_SPOTS[2][0], FLOWER_SPOTS[2][1], 'flower')
    addFlower(FLOWER_SPOTS[3][0], FLOWER_SPOTS[3][1], 'flower')
    addFlower(FLOWER_SPOTS[4][0], FLOWER_SPOTS[4][1], 'flower')
    addFlower(FLOWER_SPOTS[5][0], FLOWER_SPOTS[5][1], 'flower')
    addFlower(FLOWER_SPOTS[6][0], FLOWER_SPOTS[6][1], 'flower')
    addFlower(FLOWER_SPOTS[7][0], FLOWER_SPOTS[7][1], 'flower')
    addFlower(FLOWER_SPOTS[8][0], FLOWER_SPOTS[8][1], 'flower')
    addFlower(FLOWER_SPOTS[9][0], FLOWER_SPOTS[9][1], 'flower')
    addFlower(FLOWER_SPOTS[10][0], FLOWER_SPOTS[10][1], 'flower')

    const tree1 = makeRoundTree(vis, 1.15)
    tree1.position.set(-4.25, 0, -1.9)
    group.add(tree1)
    const tree2 = makeRoundTree(vis, 1.0)
    tree2.position.set(4.35, 0, -2.35)
    group.add(tree2)
    const tree3 = makeRoundTree(vis, 0.72)
    tree3.position.set(-3.2, 0, -3.4)
    group.add(tree3)

    const bushMat = std(0x5aa846, { roughness: 0.9 })
    for (const [x, z, s] of [
      [3.85, 1.7, 0.6],
      [-3.6, 1.2, 0.45],
      [-0.5, -3.9, 0.5],
    ]) {
      const bush = mesh(G.ico, bushMat, x, s * 0.35, z, s, s * 0.7, s)
      group.add(bush)
    }
    const fence = makeFence(vis)
    group.add(fence)
    for (const [x, z, s] of [
      [-4.7, 0.5, 0.9],
      [3.9, -0.7, 0.6],
      [-2.2, 3.8, 0.55],
      [4.8, 2.3, 0.7],
    ])
      addRock(x, z, s)
    addGrass(18)
    for (const [x, z, c] of [
      [-4.1, 2.15, 0xffd35e],
      [0.5, 2.95, 0xff8fa7],
      [3.95, 1.55, 0xb98cff],
    ]) {
      const butterfly = makeButterfly(c)
      butterfly.position.set(x, 1.1, z)
      group.add(butterfly)
      bobbers.push({ mesh: butterfly, baseY: 1.1, amp: 0.2, speed: 1.4, phase: rand(0, TAU), spin: 0.8 })
    }
    // Mushrooms.
    for (const [x, z] of [
      [-3.3, 1.9],
      [2.2, -3.3],
      [-0.2, -2.3],
    ]) {
      const shroom = makeGlowShroom({ ...vis, petals: [0xffbc5c, 0xffe08a, 0xff9e6b] }, rand(0.8, 1.2))
      shroom.position.set(x, 0, z)
      group.add(shroom)
    }
  }

  if (zone.id === 'desert') {
    for (let i = 0; i < 9; i++) {
      const s = FLOWER_SPOTS[i]
      addFlower(s[0], s[1], 'cactus', rand(0.8, 1.05))
    }
    const palm = makePalm(vis, 1.25)
    palm.position.set(4.35, 0, -1.4)
    group.add(palm)
    const palm2 = makePalm(vis, 0.8)
    palm2.position.set(-4.35, 0, -2.6)
    group.add(palm2)
    for (const [x, z, s] of [
      [-4.0, 0.45, 1.15],
      [-3.5, 2.75, 0.85],
      [3.1, -3.25, 0.9],
      [1.2, -3.9, 0.65],
    ]) {
      const cactus = makeCactus(vis, s)
      cactus.position.set(x, 0, z)
      group.add(cactus)
    }
    for (const [x, z, s] of [
      [-4.8, 0.8, 0.9],
      [2.9, 2.5, 0.7],
      [4.4, 1.9, 0.6],
      [-1.5, -4.0, 0.8],
      [0.4, -2.8, 0.5],
    ])
      addRock(x, z, s, vis.rock)
    // Dry shrubs.
    const dry = std(0xb28a54, { roughness: 0.95 })
    for (const [x, z] of [
      [-2.5, 2.7],
      [2.1, 2.3],
      [-1.2, -2.6],
    ]) {
      for (let i = 0; i < 5; i++) {
        const blade = mesh(G.cone, dry, x + rand(-0.2, 0.2), 0.22, z + rand(-0.2, 0.2), 0.035, 0.5, 0.035)
        blade.rotation.z = rand(-0.6, 0.6)
        group.add(blade)
      }
    }
    addGrass(8)
    // Bleached bones.
    for (const [x, z] of [
      [0.8, -2.2],
      [-2.8, 1.2],
    ]) {
      const boneMat = std(0xf2e3c4, { roughness: 0.9 })
      const bone = mesh(G.cyl, boneMat, x, 0.07, z, 0.04, 0.5, 0.04)
      bone.rotation.z = Math.PI / 2
      bone.rotation.y = rand(0, TAU)
      group.add(bone)
    }
    // Heat shimmer glints.
    for (let i = 0; i < 2; i++) {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe4ad, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }),
      )
      glow.position.set(rand(-4, 4), rand(2, 3.5), rand(-3, 3))
      glow.scale.setScalar(1.5)
      group.add(glow)
      bobbers.push({ mesh: glow, baseY: glow.position.y, amp: 0.3, speed: 0.6, phase: rand(0, TAU), spin: 0 })
    }
  }

  if (zone.id === 'crystal') {
    for (let i = 0; i < 9; i++) {
      const s = FLOWER_SPOTS[i]
      addFlower(s[0], s[1], 'crystal', rand(0.8, 1.15))
    }
    for (const [x, z, s] of [
      [-4.05, -2.2, 1.35],
      [4.1, -1.9, 1.15],
      [3.9, 2.35, 0.85],
      [-3.9, 2.0, 0.75],
      [0.3, -4.1, 0.9],
      [-1.0, -3.7, 0.6],
    ]) {
      const cluster = makeCrystalCluster(vis, s)
      cluster.position.set(x, 0, z)
      group.add(cluster)
    }
    for (const [x, z] of [
      [-3.3, 1.6],
      [2.1, 2.7],
      [-0.4, -2.8],
      [2.9, -0.2],
    ]) {
      const shroom = makeGlowShroom(vis, rand(0.9, 1.4))
      shroom.position.set(x, 0, z)
      group.add(shroom)
    }
    for (const [x, y, z, s] of [
      [-4.0, 3.5, -2.0, 0.5],
      [3.8, 4.1, -2.6, 0.6],
      [0.6, 3.1, -3.8, 0.4],
      [-2.2, 2.8, 2.8, 0.38],
    ]) {
      const shard = new THREE.Mesh(G.octa, std(vis.petals[Math.floor(rand(0, 4))], { roughness: 0.2, metalness: 0.3, emissive: vis.petals[0], emissiveIntensity: 0.55 }))
      shard.position.set(x, y, z)
      shard.scale.set(s, s * 1.8, s)
      shard.rotation.set(rand(0, 1), rand(0, TAU), rand(0, 1))
      group.add(shard)
      bobbers.push({ mesh: shard, baseY: y, amp: 0.35, speed: 0.8, phase: rand(0, TAU), spin: 0.35 })
    }
    addRock(-4.8, 0.5, 0.9, vis.rockDark)
    addRock(4.7, 1.2, 0.7, vis.rock)
    addRock(0.1, 2.9, 0.55, vis.rockDark)
    // Sparkling floor veins.
    const veinMat = new THREE.MeshBasicMaterial({ color: 0x9b6bff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    for (let i = 0; i < 7; i++) {
      const vein = new THREE.Mesh(G.box, veinMat)
      vein.position.set(rand(-4.5, 4.5), 0.02, rand(-4, 3.5))
      vein.scale.set(rand(0.04, 0.08), 0.01, rand(0.4, 1.3))
      vein.rotation.y = rand(0, TAU)
      group.add(vein)
    }
  }

  if (zone.id === 'frost') {
    for (let i = 0; i < 9; i++) {
      const s = FLOWER_SPOTS[i]
      addFlower(s[0], s[1], 'flower', rand(0.85, 1.15))
    }
    for (const [x, z, s] of [
      [-4.2, -2.3, 1.15],
      [4.25, -2.6, 1.0],
      [3.6, 2.75, 0.8],
      [-3.5, 2.6, 0.7],
    ]) {
      const pine = makePine(vis, s)
      pine.position.set(x, 0, z)
      group.add(pine)
    }
    for (const [x, z, s] of [
      [-3.9, -0.5, 1.1],
      [4.15, 0.5, 0.8],
      [-1.2, -3.8, 0.7],
      [2.6, -3.6, 0.55],
    ]) {
      const spike = makeIceSpike(vis, s)
      spike.position.set(x, 0, z)
      group.add(spike)
    }
    group.add(makePond(vis))
    for (const [x, z, s] of [
      [-4.65, 1.4, 0.6],
      [2.9, 2.2, 0.5],
      [1.3, -2.6, 0.4],
    ])
      addRock(x, z, s, vis.rock)
    // Snow mounds.
    const snowMat = std(0xffffff, { roughness: 0.75 })
    for (let i = 0; i < 9; i++) {
      const a = rand(0, TAU)
      const r = rand(1.5, 4.7)
      const mound = mesh(G.sphere, snowMat, Math.cos(a) * r, 0.02, Math.sin(a) * r, rand(0.3, 0.6), rand(0.08, 0.16), rand(0.3, 0.6))
      group.add(mound)
    }
    // Aurora ribbons.
    const auroraGeo = new THREE.PlaneGeometry(18, 3.2, 24, 1)
    const auroraMat = new THREE.MeshBasicMaterial({
      color: 0x9cffe1,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    for (let i = 0; i < 2; i++) {
      const ribbon = new THREE.Mesh(auroraGeo, auroraMat.clone())
      ribbon.material.color.setHex(i ? 0xb59cff : 0x9cffe1)
      ribbon.position.set(rand(-4, 4), 8.5 + i * 1.6, -19 - i * 3)
      ribbon.rotation.x = -0.2
      ribbon.rotation.z = rand(-0.15, 0.15)
      group.add(ribbon)
      bobbers.push({ mesh: ribbon, baseY: ribbon.position.y, amp: 0.35, speed: 0.4, phase: rand(0, TAU), spin: 0 })
    }
  }

  if (zone.id === 'gold') {
    for (let i = 0; i < 9; i++) {
      const s = FLOWER_SPOTS[i]
      addFlower(s[0], s[1], 'flower', rand(0.9, 1.2))
    }
    for (const [x, z, s] of [
      [-4.25, -2.2, 1.1],
      [4.4, -2.45, 1.25],
      [3.9, 2.25, 0.85],
      [-3.85, 2.4, 0.9],
      [1.4, -4.0, 0.7],
    ]) {
      const pillar = makeGoldPillar(vis, s)
      pillar.position.set(x, 0, z)
      group.add(pillar)
    }
    for (const [x, z, s] of [
      [-3.2, 1.55, 1.2],
      [2.4, 2.65, 1.0],
      [3.1, -0.5, 0.8],
      [-1.1, -2.6, 0.9],
      [0.4, -3.4, 0.7],
    ]) {
      const coin = makeCoin(s)
      coin.position.set(x, 0, z)
      group.add(coin)
    }
    // Golden orbs.
    for (const [x, y, z, s] of [
      [-3.7, 3.1, -1.7, 0.3],
      [3.5, 4.0, -2.1, 0.35],
      [0.3, 2.6, -3.6, 0.24],
      [-1.8, 2.5, 2.9, 0.2],
    ]) {
      const orb = new THREE.Mesh(G.sphere, std(0xffd75e, { emissive: 0xffb300, emissiveIntensity: 0.45, roughness: 0.15, metalness: 0.6 }))
      orb.position.set(x, y, z)
      orb.scale.setScalar(s)
      group.add(orb)
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe28a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
      )
      glow.position.copy(orb.position)
      glow.scale.setScalar(s * 4)
      group.add(glow)
      bobbers.push({ mesh: orb, baseY: y, amp: 0.4, speed: 0.75, phase: rand(0, TAU), spin: 0.3 })
      bobbers.push({ mesh: glow, baseY: y, amp: 0.4, speed: 0.75, phase: rand(0, TAU), spin: 0 })
    }
    // Honeycomb wall in the back.
    const combMat = std(0xd79d22, { roughness: 0.35, metalness: 0.55, emissive: 0x7a4e00, emissiveIntensity: 0.18 })
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 6; i++) {
        const cell = new THREE.Mesh(G.hex, combMat)
        cell.position.set(-1.8 + i * 0.72 + (r % 2) * 0.36, 1.5 + r * 0.62, -4.65)
        cell.rotation.x = Math.PI / 2
        cell.scale.set(0.34, 0.09, 0.34)
        group.add(cell)
      }
    }
    addRock(-4.7, 1.1, 0.6, vis.rock)
    addRock(3.2, 1.3, 0.45, vis.rockDark)
  }

  const particles = makeAmbientParticles(vis)
  group.add(particles)

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = obj.castShadow && !obj.material.transparent
      obj.receiveShadow = true
    }
  })

  return {
    group,
    flowerPoints,
    bobbers,
    particles,
    updateParticles: (dt, time) => updateAmbientParticles(particles, dt, time),
    updateBobbers: (dt, time) => updateBobberList(bobbers, time),
  }
}

export function updateAmbientParticles(particles, dt, time) {
  const pos = particles.geometry.getAttribute('position')
  const arr = pos.array
  const { cfg, speeds } = particles.userData
  const mode = cfg.mode
  for (let i = 0; i < arr.length / 3; i++) {
    const speed = speeds[i] * cfg.speed
    if (mode === 'snow') {
      arr[i * 3 + 1] -= speed * dt
      arr[i * 3] += Math.sin(time * 1.2 + i) * dt * 0.18
      if (arr[i * 3 + 1] < 0.2) {
        arr[i * 3 + 1] = rand(5.5, 7.5)
        arr[i * 3] = rand(-6, 6)
        arr[i * 3 + 2] = rand(-6, 6)
      }
    } else if (mode === 'drift') {
      arr[i * 3] += speed * dt * 0.5
      arr[i * 3 + 1] += Math.sin(time * 0.8 + i) * dt * 0.06
      if (arr[i * 3] > 6.2) arr[i * 3] = -6.2
    } else {
      arr[i * 3 + 1] += speed * dt
      arr[i * 3] += Math.sin(time * 1.1 + i * 0.7) * dt * 0.12
      if (arr[i * 3 + 1] > 6.4) {
        arr[i * 3 + 1] = 0.4
        arr[i * 3] = rand(-6, 6)
        arr[i * 3 + 2] = rand(-6, 6)
      }
    }
  }
  pos.needsUpdate = true
  if (mode !== 'snow') {
    particles.material.opacity = 0.62 + Math.sin(time * 1.7) * 0.12
  }
}

export function updateBobberList(bobbers, time) {
  for (const b of bobbers) {
    b.mesh.position.y = b.baseY + Math.sin(time * b.speed + b.phase) * b.amp
    if (b.spin) b.mesh.rotation.y += b.spin * 0.008
  }
}
