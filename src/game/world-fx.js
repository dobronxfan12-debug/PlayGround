// Honey stream, splashes, celebration particles, hive smoke and full-jar sparkles.
import * as THREE from 'three'
import { TAU, glowTexture, rand } from './world-visuals.js'

export class HoneyStream {
  constructor(scene, spout) {
    this.spout = spout.clone()
    const geo = new THREE.CylinderGeometry(0.055, 0.095, 1, 8, 14, true)
    geo.translate(0, -0.5, 0)
    this.basePositions = Float32Array.from(geo.getAttribute('position').array)
    this.material = new THREE.MeshStandardMaterial({
      color: 0xf2a51b,
      roughness: 0.08,
      metalness: 0.15,
      emissive: 0xf2a51b,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.position.copy(this.spout)
    this.mesh.renderOrder = 3
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    scene.add(this.mesh)
    this.normalsTick = 0

    // Droplets that fall alongside the main stream.
    this.dropMat = new THREE.MeshStandardMaterial({
      color: 0xffca4d,
      roughness: 0.05,
      metalness: 0.2,
      emissive: 0xffb300,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.95,
    })
    this.dropGeo = new THREE.SphereGeometry(1, 7, 6)
    this.drops = []
    for (let i = 0; i < 7; i++) {
      const drop = new THREE.Mesh(this.dropGeo, this.dropMat)
      drop.scale.setScalar(rand(0.035, 0.07))
      drop.visible = false
      scene.add(drop)
      this.drops.push(drop)
    }

    this.splashMat = new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.splash = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 30), this.splashMat)
    this.splash.rotation.x = Math.PI / 2
    this.splash.visible = false
    scene.add(this.splash)

    // A little bead of honey always forming at the nozzle.
    this.bead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), this.dropMat)
    this.bead.position.copy(this.spout)
    this.bead.position.y -= 0.04
    scene.add(this.bead)

    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xffc84d,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.glow.position.copy(this.spout)
    this.glow.position.y -= 0.2
    this.glow.scale.set(1.1, 2.2, 1)
    scene.add(this.glow)
  }

  setHoneyColor(colorHex) {
    this.material.color.setHex(colorHex)
    this.material.emissive.setHex(colorHex)
    this.dropMat.color.setHex(colorHex)
    this.dropMat.emissive.setHex(colorHex)
    this.splashMat.color.setHex(colorHex)
    this.glow.material.color.setHex(colorHex)
  }

  update(dt, time, active, surfaceY, full) {
    const length = this.spout.y - surfaceY
    const flowing = active && length > 0.15
    this.mesh.visible = flowing
    this.splash.visible = flowing
    this.glow.visible = flowing
    if (flowing) {
      const attr = this.mesh.geometry.getAttribute('position')
      const arr = attr.array
      const base = this.basePositions
      for (let i = 0; i < arr.length / 3; i++) {
        const bx = base[i * 3]
        const by = base[i * 3 + 1]
        const bz = base[i * 3 + 2]
        const t = Math.max(0, -by)
        const spread = 1 + t * 0.12
        arr[i * 3] = bx * spread + Math.sin(time * 7.5 - t * 10) * 0.035 * t
        arr[i * 3 + 1] = -t * length
        arr[i * 3 + 2] = bz * spread + Math.cos(time * 6.4 - t * 8) * 0.035 * t
      }
      attr.needsUpdate = true
      this.normalsTick += dt
      if (this.normalsTick > 0.08) {
        this.mesh.geometry.computeVertexNormals()
        this.normalsTick = 0
      }

      this.splash.position.set(this.spout.x, surfaceY + 0.02, this.spout.z)
      const pulse = 1 + Math.sin(time * 10) * 0.15
      this.splash.scale.setScalar(0.22 * pulse)
      this.splashMat.opacity = 0.32 + Math.sin(time * 8) * 0.16

      const n = this.drops.length
      for (let i = 0; i < n; i++) {
        const drop = this.drops[i]
        const p = (time * 0.46 + i / n) % 1
        drop.visible = true
        const x = this.spout.x + Math.sin(time * 6 - p * 12 + i) * 0.07 * p
        const z = this.spout.z + Math.cos(time * 5 - p * 10 + i) * 0.07 * p
        drop.position.set(x, this.spout.y - p * length, z)
        const s = 0.035 + (i % 3) * 0.011 + Math.sin(time * 8 + i) * 0.006
        drop.scale.set(s, s * 1.5, s)
      }
    } else {
      for (const drop of this.drops) drop.visible = false
    }

    // The bead swells and resets on a lazy loop.
    const beadPhase = (time * 0.55) % 1
    const growing = full ? beadPhase : 0.35
    this.bead.visible = true
    this.bead.scale.setScalar(0.75 + growing * 0.9)
    this.bead.position.y = this.spout.y - 0.03 - growing * 0.04
  }
}

export class BurstSystem {
  constructor(scene) {
    this.scene = scene
    this.parts = []
    this.rings = []
    this.geo = new THREE.IcosahedronGeometry(0.075, 0)
    this.ringGeo = new THREE.TorusGeometry(1, 0.035, 6, 32)
    this.coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.025, 12)
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd35e,
      roughness: 0.22,
      metalness: 0.8,
      emissive: 0xb87a00,
      emissiveIntensity: 0.3,
    })
  }

  spawn(position, color = 0xffc21a, count = 22, opts = {}) {
    const power = opts.power ?? 1
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      const mesh = new THREE.Mesh(this.geo, mat)
      mesh.position.copy(position)
      mesh.position.x += rand(-0.35, 0.35)
      mesh.position.y += rand(-0.1, 0.55)
      mesh.position.z += rand(-0.3, 0.3)
      const s = rand(0.4, 1.35)
      mesh.scale.setScalar(s)
      this.scene.add(mesh)
      const angle = rand(0, TAU)
      const speed = rand(1.1, 3.4) * power
      this.parts.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed * rand(0.3, 1),
          rand(1.6, 4.2) * power,
          Math.sin(angle) * speed * rand(0.3, 1),
        ),
        spin: new THREE.Vector3(rand(-5, 5), rand(-5, 5), rand(-5, 5)),
        life: rand(0.7, 1.4),
        maxLife: 1.4,
        baseScale: s,
      })
    }
    if (opts.coins) {
      for (let i = 0; i < opts.coins; i++) {
        const mesh = new THREE.Mesh(this.coinGeo, this.coinMat)
        mesh.position.copy(position)
        mesh.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3))
        this.scene.add(mesh)
        const angle = rand(0, TAU)
        this.parts.push({
          mesh,
          vel: new THREE.Vector3(Math.cos(angle) * rand(0.6, 1.8), rand(2.2, 3.6), Math.sin(angle) * rand(0.6, 1.8)),
          spin: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)),
          life: rand(1.0, 1.6),
          maxLife: 1.6,
          baseScale: 1,
          coin: true,
        })
      }
    }
    this.ring(position, color)
  }

  ring(position, color) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(this.ringGeo, mat)
    mesh.position.copy(position)
    mesh.rotation.x = Math.PI / 2
    mesh.scale.setScalar(0.25)
    this.scene.add(mesh)
    this.rings.push({ mesh, life: 0, maxLife: 0.7 })
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]
      p.life -= dt
      p.vel.y -= 7.2 * dt
      p.mesh.position.addScaledVector(p.vel, dt)
      p.mesh.rotation.x += p.spin.x * dt
      p.mesh.rotation.y += p.spin.y * dt
      p.mesh.rotation.z += p.spin.z * dt
      if (p.life <= 0) {
        p.mesh.removeFromParent()
        p.mesh.material?.dispose?.()
        this.parts.splice(i, 1)
        continue
      }
      if (!p.coin) {
        const k = Math.max(0, p.life / Math.max(0.2, p.maxLife))
        p.mesh.material.opacity = k
        p.mesh.scale.setScalar(p.baseScale * (0.5 + k * 0.7))
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]
      r.life += dt
      const k = r.life / r.maxLife
      r.mesh.scale.setScalar(0.25 + k * 2.6)
      r.mesh.material.opacity = (1 - k) * 0.7
      if (k >= 1) {
        r.mesh.removeFromParent()
        r.mesh.material.dispose()
        this.rings.splice(i, 1)
      }
    }
  }
}

export class SmokePuffs {
  constructor(scene, origin, count = 5) {
    this.origin = origin
    this.puffs = []
    const geo = new THREE.SphereGeometry(1, 8, 6)
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfff4df,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geo, mat)
      scene.add(mesh)
      this.puffs.push({ mesh, phase: Math.random(), speed: 0.06 + Math.random() * 0.05 })
    }
  }

  update(dt, time) {
    for (const p of this.puffs) {
      p.phase += p.speed * dt
      if (p.phase > 1) p.phase -= 1
      const t = p.phase
      p.mesh.position.set(
        this.origin.x + Math.sin(time * 0.8 + p.phase * 9) * 0.18 + t * 0.35,
        this.origin.y + t * 1.5,
        this.origin.z + Math.cos(time * 0.7 + p.phase * 7) * 0.12,
      )
      const s = 0.25 + t * 0.55
      p.mesh.scale.setScalar(s)
      p.mesh.material.opacity = Math.sin(Math.min(1, t * 1.2) * Math.PI) * 0.12
    }
  }
}

export class FullSparkles {
  constructor(parent) {
    const count = 44
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU)
      const r = rand(0.4, 1.5)
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = rand(0.2, 2.4)
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: 0xffe58a,
      size: 0.075,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geo, mat)
    this.points.visible = false
    this.points.frustumCulled = false
    parent.add(this.points)
  }

  update(dt, time, full) {
    this.points.visible = full
    if (!full) return
    this.points.rotation.y += dt * 0.35
    this.points.material.opacity = 0.55 + Math.sin(time * 3.3) * 0.25
  }
}
