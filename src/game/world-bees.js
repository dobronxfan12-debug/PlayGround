// Low-poly bees with flapping wings and gentle flight paths.
import * as THREE from 'three'
import { BEE_TYPES } from './data.js'
import { TAU, clamp, lerp, rand } from './world-visuals.js'

const GEO = {
  body: new THREE.SphereGeometry(0.22, 12, 9),
  stripe: new THREE.TorusGeometry(0.2, 0.032, 6, 14),
  head: new THREE.SphereGeometry(0.15, 10, 8),
  eye: new THREE.SphereGeometry(0.035, 6, 5),
  wing: new THREE.SphereGeometry(0.18, 8, 6),
  stinger: new THREE.ConeGeometry(0.045, 0.16, 6),
  antenna: new THREE.CylinderGeometry(0.008, 0.008, 0.17, 4),
  pollen: new THREE.SphereGeometry(0.045, 6, 5),
}

const materialCache = new Map()

function cachedMaterial(key, make) {
  let mat = materialCache.get(key)
  if (!mat) {
    mat = make()
    materialCache.set(key, mat)
  }
  return mat
}

function bodyMaterial(color, emissive = 0, emissiveIntensity = 0) {
  return cachedMaterial(`body-${color}-${emissive}-${emissiveIntensity}`, () => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.08,
      flatShading: true,
    })
    if (emissive) {
      m.emissive = new THREE.Color(emissive)
      m.emissiveIntensity = emissiveIntensity
    }
    return m
  })
}

const darkMat = cachedMaterial('dark', () => new THREE.MeshStandardMaterial({ color: 0x241710, roughness: 0.65 }))
const wingMat = cachedMaterial(
  'wing',
  () =>
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
)
const eyeMat = cachedMaterial('eye', () => new THREE.MeshBasicMaterial({ color: 0x1a120c }))

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % TAU) - Math.PI
  if (d < -Math.PI) d += TAU
  return a + d * t
}

export class Bee {
  constructor(world, type, native = false, index = 0) {
    this.world = world
    this.type = type
    this.native = native
    this.phase = Math.random() * TAU
    this.speed = rand(1.25, 2.1) * (native ? 0.92 : 1)
    this.group = new THREE.Group()
    this.group.scale.setScalar(0.001)
    this.spawnT = 0
    this.targetTimer = rand(0.2, 2)
    this.hovering = 0
    this.yaw = rand(0, TAU)
    this.pitch = 0
    this.bank = 0
    this.pos = new THREE.Vector3(rand(-2.8, -1.8), rand(1.4, 2.4), rand(0.8, 1.8))
    this.vel = new THREE.Vector3(rand(-0.3, 0.3), rand(0, 0.2), rand(0.2, 0.5))
    this.index = index
    this.target = this.pos.clone().add(new THREE.Vector3(rand(-2, 2), rand(0, 1), rand(-2, 2)))
    this.buildModel()
    this.group.position.copy(this.pos)
  }

  buildModel() {
    const t = this.type
    const scale = t.scale || 1
    const emissive =
      t.id === 'gem' ? t.body : t.id === 'gilded' ? t.body : t.native ? 0xffffff : 0
    const emissiveIntensity = t.id === 'gem' ? 0.45 : t.id === 'gilded' ? 0.22 : t.native ? 0.3 : 0
    const bodyMat = bodyMaterial(t.body, emissive, emissiveIntensity)
    const stripeMat = cachedMaterial(`stripe-${t.stripe}`, () =>
      new THREE.MeshStandardMaterial({ color: t.stripe, roughness: 0.5, flatShading: true }),
    )
    const accentMat = cachedMaterial(`accent-${t.accent}`, () =>
      new THREE.MeshStandardMaterial({
        color: t.accent,
        roughness: 0.4,
        emissive: new THREE.Color(t.accent),
        emissiveIntensity: 0.1,
      }),
    )

    const body = new THREE.Mesh(GEO.body, bodyMat)
    body.scale.set(1, 0.88, 1.48)
    this.group.add(body)

    for (const z of [0.1, -0.12]) {
      const stripe = new THREE.Mesh(GEO.stripe, stripeMat)
      stripe.position.z = z
      stripe.scale.set(1, 0.9, 1)
      this.group.add(stripe)
    }

    const head = new THREE.Mesh(GEO.head, darkMat)
    head.position.set(0, 0.01, 0.34)
    head.scale.set(1, 1, 0.9)
    this.group.add(head)

    for (const x of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(GEO.eye, eyeMat)
      eye.position.set(x, 0.045, 0.465)
      this.group.add(eye)
    }

    const stinger = new THREE.Mesh(GEO.stinger, darkMat)
    stinger.position.set(0, 0, -0.36)
    stinger.rotation.x = -Math.PI / 2
    this.group.add(stinger)

    for (const x of [-0.05, 0.05]) {
      const antenna = new THREE.Mesh(GEO.antenna, darkMat)
      antenna.position.set(x, 0.15, 0.42)
      antenna.rotation.set(-0.5, 0, x > 0 ? -0.3 : 0.3)
      this.group.add(antenna)
    }

    // Tiny pollen baskets.
    for (const x of [-0.15, 0.15]) {
      const pollen = new THREE.Mesh(GEO.pollen, accentMat)
      pollen.position.set(x, -0.12, -0.02)
      this.group.add(pollen)
    }

    this.wings = []
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.06, 0.15, 0.05)
      const wing = new THREE.Mesh(GEO.wing, wingMat)
      wing.scale.set(1.45, 0.05, 0.68)
      wing.position.set(side * 0.19, 0, -0.02)
      wing.rotation.z = side * 0.12
      pivot.add(wing)
      this.group.add(pivot)
      this.wings.push({ pivot, side })
    }

    this.group.scale.setScalar(scale)
    this.baseScale = scale
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false
        obj.receiveShadow = false
      }
    })
  }

  pickTarget() {
    const world = this.world
    const roll = Math.random()
    let target
    if (roll < 0.64 && world.flowerPoints.length) {
      target = world.flowerPoints[Math.floor(Math.random() * world.flowerPoints.length)].clone()
      target.x += rand(-0.25, 0.25)
      target.z += rand(-0.25, 0.25)
      target.y += rand(0.15, 0.7)
    } else if (roll < 0.84) {
      target = world.hiveEntry.clone().add(new THREE.Vector3(rand(-0.9, 0.9), rand(0.2, 1.3), rand(0.4, 1.8)))
    } else if (roll < 0.94) {
      target = world.jarTop.clone().add(new THREE.Vector3(rand(-1.2, 1.2), rand(0.4, 1.6), rand(-0.8, 1.2)))
    } else {
      target = new THREE.Vector3(rand(-3.4, 3.4), rand(2.2, 4.2), rand(-3.2, 2.6))
    }
    target.y = clamp(target.y, 0.7, 5.2)
    this.target = target
    this.targetTimer = rand(3.6, 8.5)
    this.hovering = 0
  }

  update(dt, time, bees) {
    this.spawnT = Math.min(1, this.spawnT + dt * 2.4)
    const ease = 1 - Math.pow(1 - this.spawnT, 3)
    this.group.scale.setScalar(Math.max(0.001, this.baseScale * ease))

    this.targetTimer -= dt
    const toTarget = this.target.clone().sub(this.pos)
    const dist = toTarget.length()
    if (this.targetTimer <= 0 || dist < 0.35) {
      this.hovering += dt
      if (this.hovering > 0.6) this.pickTarget()
    }

    // Smooth steering toward a wandering target.
    const desired = toTarget.lengthSq() > 0.0001 ? toTarget.normalize().multiplyScalar(this.speed) : new THREE.Vector3()
    const wobble = new THREE.Vector3(
      Math.sin(time * 1.7 + this.phase) * 0.35,
      Math.sin(time * 2.3 + this.phase * 1.7) * 0.22,
      Math.cos(time * 1.4 + this.phase) * 0.35,
    )
    desired.add(wobble)

    // Keep a polite distance from neighbours.
    for (const other of bees) {
      if (other === this) continue
      const dx = this.pos.x - other.pos.x
      const dy = this.pos.y - other.pos.y
      const dz = this.pos.z - other.pos.z
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 > 0.0001 && d2 < 0.55) {
        const inv = (0.55 - d2) * 7
        desired.x += (dx / Math.sqrt(d2)) * inv
        desired.y += (dy / Math.sqrt(d2)) * inv
        desired.z += (dz / Math.sqrt(d2)) * inv
      }
    }

    const k = 1 - Math.exp(-dt * 1.9)
    this.vel.lerp(desired, k)
    this.pos.addScaledVector(this.vel, dt)

    // Stay above the island and inside a generous boundary.
    const r = Math.hypot(this.pos.x, this.pos.z)
    if (r > 5.0) {
      this.pos.x *= 5.0 / r
      this.pos.z *= 5.0 / r
    }
    if (this.pos.y < 0.65) {
      this.pos.y = 0.65
      this.vel.y = Math.abs(this.vel.y) * 0.4
    }
    if (this.pos.y > 5.4) {
      this.pos.y = 5.4
      this.vel.y = -Math.abs(this.vel.y) * 0.3
    }

    const bob = Math.sin(time * 3.2 + this.phase) * 0.045
    this.group.position.set(this.pos.x, this.pos.y + bob, this.pos.z)

    const horiz = Math.hypot(this.vel.x, this.vel.z)
    if (horiz > 0.05) {
      this.yaw = lerpAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), Math.min(1, dt * 6))
      this.pitch = lerp(this.pitch, clamp(-Math.atan2(this.vel.y, horiz) * 0.5, -0.4, 0.4), Math.min(1, dt * 4))
      this.bank = lerp(this.bank, clamp((this.vel.x * 0.1 + Math.sin(time + this.phase) * 0.12), -0.3, 0.3), Math.min(1, dt * 4))
    }
    this.group.rotation.order = 'YXZ'
    this.group.rotation.y = this.yaw
    this.group.rotation.x = this.pitch
    this.group.rotation.z = this.bank

    const flap = Math.sin(time * 47 + this.phase) * 0.72
    for (const w of this.wings) {
      w.pivot.rotation.z = w.side * (0.1 + flap)
    }
  }

  dispose() {
    this.group.removeFromParent()
  }
}

export function buildBeeSpecs(state, zone) {
  const owned = BEE_TYPES.filter((t) => (state.bees[t.id] || 0) > 0)
  const totalOwned = owned.reduce((sum, t) => sum + (state.bees[t.id] || 0), 0)
  const visibleOwned = Math.min(12, Math.max(1, totalOwned))
  const specs = []

  // Every owned species appears at least once, then the swarm grows up to 12 models.
  for (const type of owned) {
    if (specs.length >= visibleOwned) break
    specs.push({ type })
  }
  const pool = []
  for (const type of owned) {
    const copies = Math.min(12, Math.max(1, state.bees[type.id] || 0))
    for (let i = 0; i < copies; i++) pool.push(type)
  }
  let guard = 0
  while (specs.length < visibleOwned && pool.length && guard < 48) {
    specs.push({ type: pool[(guard * 5 + 2) % pool.length] })
    guard++
  }

  const accent = new THREE.Color(zone.accent)
  const nativeType = {
    id: `native-${zone.id}`,
    name: zone.nativeBee,
    body: accent.getHex(),
    stripe: accent.clone().multiplyScalar(0.28).getHex(),
    accent: 0xfff3c4,
    scale: 0.82,
  }
  specs.push({ type: nativeType, native: true })
  specs.push({ type: nativeType, native: true })
  if (specs.length < 21) specs.push({ type: nativeType, native: true })
  return specs
}
