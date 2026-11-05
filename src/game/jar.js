// The giant honey jar: glass, rising honey, ripples, label, themed charms.
import * as THREE from 'three'
import { glowTexture, makeFullTexture, makeJarLabelTexture, roundRect, TAU, lerp } from './world-visuals.js'

export const JAR_POS = new THREE.Vector3(1.9, 0.3, 0.72)
export const JAR_BASE_Y = 0.1
export const JAR_MAX_HONEY = 1.34
export const JAR_MOUTH_LOCAL = 2.13

const JAR_SCALES = {
  meadow: [1, 1, 1],
  desert: [1.08, 0.97, 1.08],
  crystal: [0.95, 1.08, 0.95],
  frost: [1.06, 1.01, 1.06],
  gold: [1.12, 0.99, 1.12],
}

const G = {
  torus: new THREE.TorusGeometry(1, 0.028, 6, 40),
  surface: new THREE.CircleGeometry(1, 40),
  bubble: new THREE.SphereGeometry(0.045, 6, 5),
  cone: new THREE.ConeGeometry(1, 1, 6),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  octa: new THREE.OctahedronGeometry(1, 0),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
}

function lathePoints() {
  return [
    [0.9, 0],
    [1.01, 0.03],
    [1.07, 0.16],
    [1.07, 1.42],
    [1.0, 1.56],
    [0.8, 1.8],
    [0.65, 1.91],
    [0.65, 2.01],
    [0.73, 2.06],
    [0.75, 2.12],
    [0.7, 2.14],
  ].map(([x, y]) => new THREE.Vector2(x, y))
}

export class JarVisual {
  constructor() {
    this.group = new THREE.Group()
    this.group.position.copy(JAR_POS)
    this.fill = 0
    this.fullAmount = 0
    this.full = false
    this.targetFill = 0
    this.bounce = 0
    this.zone = null
    this.buildGlass()
    this.buildHoney()
    this.buildLabel()
    this.buildCharm()
    this.buildLid()
    this.buildFullSprite()
  }

  buildGlass() {
    const geo = new THREE.LatheGeometry(lathePoints(), 44)
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd9f4ff,
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      opacity: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.4,
    })
    this.glass = new THREE.Mesh(geo, this.glassMat)
    this.glass.renderOrder = 2
    this.group.add(this.glass)

    // Inner glass rim highlight.
    this.rimMat = new THREE.MeshStandardMaterial({ color: 0xf0b43c, roughness: 0.28, metalness: 0.75 })
    this.rim = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.06, 8, 40), this.rimMat)
    this.rim.position.y = 2.13
    this.rim.rotation.x = Math.PI / 2
    this.rim.castShadow = true
    this.group.add(this.rim)

    // A subtle vertical glint on the glass.
    const glintMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.glint = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.2), glintMat)
    this.glint.position.set(-0.62, 0.92, 0.82)
    this.glint.rotation.y = 0.55
    this.group.add(this.glint)
  }

  buildHoney() {
    this.honeyMat = new THREE.MeshStandardMaterial({
      color: 0xf2a51b,
      roughness: 0.18,
      metalness: 0.12,
      emissive: 0xf2a51b,
      emissiveIntensity: 0.16,
      transparent: true,
      opacity: 0.96,
    })
    this.honey = new THREE.Mesh(new THREE.CylinderGeometry(0.955, 0.955, 1, 32, 1), this.honeyMat)
    this.honey.castShadow = false
    this.group.add(this.honey)

    this.surfaceMat = new THREE.MeshStandardMaterial({
      color: 0xffc94a,
      roughness: 0.08,
      metalness: 0.2,
      emissive: 0xffb300,
      emissiveIntensity: 0.5,
    })
    this.surface = new THREE.Mesh(G.surface, this.surfaceMat)
    this.surface.rotation.x = -Math.PI / 2
    this.surface.scale.setScalar(0.95)
    this.group.add(this.surface)

    this.rippleMat = new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.ripples = []
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(G.torus, this.rippleMat.clone())
      ring.rotation.x = Math.PI / 2
      ring.scale.setScalar(0.35 + i * 0.18)
      this.group.add(ring)
      this.ripples.push({ mesh: ring, phase: i * 0.33 })
    }

    this.bubbles = []
    this.bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xffd970,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7,
      emissive: 0xffc21a,
      emissiveIntensity: 0.25,
    })
    for (let i = 0; i < 7; i++) {
      const bubble = new THREE.Mesh(G.bubble, this.bubbleMat)
      bubble.userData = {
        x: (Math.random() - 0.5) * 1.5,
        z: (Math.random() - 0.5) * 1.5,
        speed: 0.3 + Math.random() * 0.4,
        phase: Math.random(),
        scale: 0.5 + Math.random() * 1.1,
      }
      this.group.add(bubble)
      this.bubbles.push(bubble)
    }

    // Golden glow inside the jar.
    this.innerGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xffc433,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.innerGlow.position.y = 0.9
    this.innerGlow.scale.set(3.4, 3.4, 1)
    this.group.add(this.innerGlow)
  }

  buildLabel() {
    this.labelMat = new THREE.MeshStandardMaterial({
      map: null,
      roughness: 0.62,
      metalness: 0,
      transparent: true,
      side: THREE.DoubleSide,
    })
    this.label = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.78), this.labelMat)
    this.label.position.set(0, 0.94, 1.045)
    this.label.rotation.x = -0.015
    this.group.add(this.label)
  }

  buildCharm() {
    this.charmGroup = new THREE.Group()
    this.group.add(this.charmGroup)
    this.charmBob = 0
  }

  buildLid() {
    this.lidGroup = new THREE.Group()
    this.lidMat = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.72 })
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.8, 0.13, 28), this.lidMat)
    lid.position.set(0, 0.07, 0)
    lid.castShadow = true
    this.lidGroup.add(lid)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.035, 6, 28), this.rimMat)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.13
    this.lidGroup.add(rim)
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), this.lidMat)
    knob.position.y = 0.18
    this.lidGroup.add(knob)
    this.lidGroup.position.set(1.72, 0.02, 0.55)
    this.lidGroup.rotation.y = 0.4
    this.group.add(this.lidGroup)
  }

  buildFullSprite() {
    this.fullMat = new THREE.SpriteMaterial({
      map: makeFullTexture(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
    })
    this.fullSprite = new THREE.Sprite(this.fullMat)
    this.fullSprite.position.set(0, 2.95, 0.2)
    this.fullSprite.scale.set(2.6, 0.91, 1)
    this.fullSprite.renderOrder = 20
    this.fullSprite.visible = false
    this.group.add(this.fullSprite)
  }

  setZone(zone, visual) {
    this.zone = zone
    const oldMap = this.labelMat.map
    if (oldMap) oldMap.dispose()
    this.labelMat.map = makeJarLabelTexture(zone)
    this.labelMat.needsUpdate = true

    this.glassMat.color.setHex(visual.glass)
    this.honeyMat.color.setHex(visual.honey)
    this.honeyMat.emissive.setHex(visual.honey)
    this.surfaceMat.color.setHex(visual.honeyLight)
    this.surfaceMat.emissive.setHex(visual.honey)
    this.rippleMat.color.setHex(visual.honeyLight)
    this.rimMat.color.setHex(visual.rimColor)
    this.lidMat.color.setHex(visual.lid)
    this.innerGlow.material.color.setHex(visual.honeyLight)
    this.bubbleMat.color.setHex(visual.honeyLight)
    this.bubbleMat.emissive.setHex(visual.honey)

    const s = JAR_SCALES[zone.id] || JAR_SCALES.meadow
    this.group.scale.set(s[0], s[1], s[2])
    this.buildCharmFor(zone, visual)
    // Label colour tint stays cream; update the name only.
    this.lidGroup.visible = true
  }

  buildCharmFor(zone, visual) {
    // Clear old charm.
    while (this.charmGroup.children.length) {
      const c = this.charmGroup.children.pop()
      c.traverse?.((o) => {
        if (o.isMesh) {
          o.geometry?.dispose?.()
          o.material?.dispose?.()
        }
      })
    }
    const g = this.charmGroup
    if (zone.id === 'meadow') {
      const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xffc53d, roughness: 0.5, emissive: 0xffb300, emissiveIntensity: 0.2 }),
      )
      center.position.set(0.42, 2.2, 0.6)
      g.add(center)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
        )
        petal.position.set(0.42 + Math.cos(a) * 0.14, 2.2, 0.6 + Math.sin(a) * 0.14)
        petal.scale.set(1, 0.4, 1)
        g.add(petal)
      }
    } else if (zone.id === 'desert') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x5fa851, roughness: 0.7 })
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 7), mat)
      body.position.set(0.42, 2.17, 0.58)
      g.add(body)
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.17, 6), mat)
      arm.position.set(0.5, 2.24, 0.58)
      arm.rotation.z = -0.7
      g.add(arm)
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xff8b5e, emissive: 0xff6a2e, emissiveIntensity: 0.35, roughness: 0.5 }),
      )
      bloom.position.set(0.42, 2.36, 0.58)
      g.add(bloom)
    } else if (zone.id === 'crystal') {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        new THREE.MeshStandardMaterial({
          color: 0xb98cff,
          roughness: 0.12,
          metalness: 0.35,
          emissive: 0xb98cff,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.92,
        }),
      )
      gem.position.set(0.42, 2.48, 0.48)
      g.add(gem)
      this.charmBob = 2.48
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture(),
          color: 0xd8b3ff,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      glow.position.copy(gem.position)
      glow.scale.setScalar(1.1)
      g.add(glow)
      this.charmGlow = glow
    } else if (zone.id === 'frost') {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd4f7ff,
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: 0.85,
        emissive: 0x8fd9ff,
        emissiveIntensity: 0.25,
      })
      for (let i = 0; i < 3; i++) {
        const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.3 + i * 0.06, 6), mat)
        icicle.position.set(0.3 + i * 0.14, 2.0 - i * 0.03, 0.58)
        icicle.rotation.x = Math.PI
        g.add(icicle)
      }
    } else if (zone.id === 'gold') {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffdf6e,
        roughness: 0.2,
        metalness: 0.85,
        emissive: 0xb87a00,
        emissiveIntensity: 0.25,
      })
      const crown = new THREE.Group()
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 12, 1, true), mat)
      band.position.y = 0.04
      crown.add(band)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), mat)
        spike.position.set(Math.cos(a) * 0.19, 0.16, Math.sin(a) * 0.19)
        crown.add(spike)
      }
      crown.position.set(0.36, 2.2, 0.5)
      g.add(crown)
    }
  }

  mouthWorldY() {
    return this.group.position.y + JAR_MOUTH_LOCAL * this.group.scale.y
  }

  surfaceWorldY() {
    return this.group.position.y + (JAR_BASE_Y + this.fill * JAR_MAX_HONEY) * this.group.scale.y
  }

  surfaceRadius() {
    return 0.95 * Math.max(this.group.scale.x, this.group.scale.z)
  }

  collectBounce() {
    this.bounce = 1
  }

  update(dt, time, targetFill, rate) {
    this.targetFill = clamp01(targetFill)
    const speed = this.targetFill < this.fill ? 3.4 : 1.15
    this.fill = lerp(this.fill, this.targetFill, Math.min(1, dt * speed))
    if (Math.abs(this.fill - this.targetFill) < 0.0003) this.fill = this.targetFill
    this.full = this.fill >= 0.995

    const h = this.fill * JAR_MAX_HONEY
    const nowFull = this.fill > 0.005
    this.honey.visible = nowFull
    this.surface.visible = nowFull
    this.honey.scale.y = Math.max(0.001, h)
    this.honey.position.y = JAR_BASE_Y + h / 2
    this.surface.position.y = JAR_BASE_Y + h + 0.002
    this.surface.scale.setScalar(0.95 * (1 + Math.sin(time * 3.2) * 0.012))

    const filling = rate > 0 && !this.full
    for (const r of this.ripples) {
      const p = (time * (filling ? 0.55 : 0.2) + r.phase) % 1
      r.mesh.visible = nowFull
      r.mesh.position.y = JAR_BASE_Y + h + 0.01
      r.mesh.scale.setScalar(0.15 + p * 0.72)
      r.mesh.material.opacity = (1 - p) * (filling ? 0.55 : 0.16)
    }

    // Bubbles drift lazily upward in the honey.
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i]
      const u = b.userData
      b.visible = this.fill > 0.1
      if (!b.visible) continue
      const p = (time * u.speed * 0.22 + u.phase) % 1
      b.position.set(u.x, JAR_BASE_Y + p * Math.max(0.05, h - 0.08), u.z)
      const s = u.scale * (0.7 + Math.sin(time * 3 + i) * 0.18)
      b.scale.setScalar(s)
    }

    this.innerGlow.material.opacity = 0.12 + this.fill * 0.18 + (this.full ? 0.08 + Math.sin(time * 5) * 0.04 : 0)
    this.innerGlow.position.y = 0.4 + this.fill * 0.9

    if (this.bounce > 0) {
      this.bounce = Math.max(0, this.bounce - dt * 3)
      const b = Math.sin(this.bounce * 12) * this.bounce * 0.035
      this.group.scale.y = (JAR_SCALES[this.zone?.id]?.[1] || 1) * (1 - b)
      this.group.scale.x = (JAR_SCALES[this.zone?.id]?.[0] || 1) * (1 + b * 0.5)
      this.group.scale.z = (JAR_SCALES[this.zone?.id]?.[2] || 1) * (1 + b * 0.5)
    } else if (this.zone) {
      const s = JAR_SCALES[this.zone.id] || JAR_SCALES.meadow
      this.group.scale.set(s[0], s[1], s[2])
    }

    this.fullSprite.visible = this.full
    this.fullSprite.material.opacity = lerp(this.fullSprite.material.opacity, this.full ? 1 : 0, Math.min(1, dt * 8))
    if (this.full) {
      this.fullSprite.position.y = 2.95 + Math.sin(time * 2.5) * 0.06
      const pulse = 1 + Math.sin(time * 4) * 0.02
      this.fullSprite.scale.set(2.6 * pulse, 0.91 * pulse, 1)
    }

    if (this.zone?.id === 'crystal') {
      for (const child of this.charmGroup.children) {
        if (child.isMesh) child.position.y = 2.48 + Math.sin(time * 1.8) * 0.06
        if (child.isSprite) child.position.y = 2.48 + Math.sin(time * 1.8) * 0.06
      }
    }
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}
