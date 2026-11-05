import * as THREE from 'three';
import { rng, makeBulletHole, makeFlash, makeGlow, makeParticle } from './textures.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.maxParticles = 900;
    this.particles = [];
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.maxParticles * 3);
    const col = new Float32Array(this.maxParticles * 3);
    for (let i = 0; i < this.maxParticles; i++) {
      pos[i * 3 + 1] = -999;
      this.particles.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, gravity: 9, r: 1, g: 1, b: 1 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.particleGeo = geo;
    this.particlePoints = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.075, map: makeParticle(), vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: 0.02, toneMapped: false
    }));
    this.particlePoints.frustumCulled = false;
    scene.add(this.particlePoints);

    this.tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    this.tracers = [];
    this.sprites = [];
    this.decals = [];
    this.casings = [];
    this.explosionFx = [];
    this.flashTex = makeFlash();
    this.glowTex = makeGlow();
    this.holeTex = makeBulletHole();
    this.casingMat = new THREE.MeshStandardMaterial({ color: 0xd7a64a, roughness: 0.28, metalness: 1.0 });
    this.casingGeo = new THREE.BoxGeometry(0.018, 0.018, 0.045);
    this.decalMat = new THREE.MeshBasicMaterial({ map: this.holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false });
    this._color = new THREE.Color();
    this._q = new THREE.Quaternion();
    this._y = new THREE.Vector3(0, 1, 0);
    this._dir = new THREE.Vector3();
  }

  spark(pos, color = 0xffb15a, count = 10, speed = 5, life = 0.55, gravity = 12) {
    this._color.setHex(color);
    for (let i = 0; i < count; i++) {
      const p = this.particles.find(p => !p.active);
      if (!p) return;
      p.active = true;
      p.x = pos.x; p.y = pos.y; p.z = pos.z;
      const a = Math.random() * Math.PI * 2;
      const e = rng(-0.4, 1);
      const sp = speed * rng(0.35, 1);
      p.vx = Math.cos(a) * sp * Math.cos(e);
      p.vz = Math.sin(a) * sp * Math.cos(e);
      p.vy = Math.sin(e) * sp + rng(0, 2);
      p.life = p.max = life * rng(0.5, 1.2);
      p.gravity = gravity;
      p.r = this._color.r; p.g = this._color.g; p.b = this._color.b;
    }
  }

  tracer(from, to, color = 0xffc27a, thickness = 0.009, life = 0.075) {
    const dir = this._dir.subVectors(to, from);
    const len = dir.length();
    if (len < 0.1) return;
    dir.normalize();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(this.tracerGeo, mat);
    mesh.position.copy(from).addScaledVector(dir, len / 2);
    this._q.setFromUnitVectors(this._y, dir);
    mesh.quaternion.copy(this._q);
    mesh.scale.set(thickness, len, thickness);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.tracers.push({ mesh, life, max: life });
  }

  flash(pos, color = 0xffc070, scale = 0.5, life = 0.055) {
    const mat = new THREE.SpriteMaterial({ map: this.flashTex, color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.set(scale, scale, 1);
    this.scene.add(sprite);
    this.sprites.push({ sprite, life, max: life, startScale: scale });
  }

  impact(pos, normal, color = 0xffa25a, kind = 'metal') {
    this.spark(pos, color, kind === 'metal' ? 13 : 9, 6.5, 0.55, 13);
    this.flash(pos, color, 0.3, 0.045);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), this.decalMat.clone());
    mesh.position.copy(pos).addScaledVector(normal, 0.012);
    mesh.lookAt(pos.clone().add(normal));
    mesh.renderOrder = 3;
    this.scene.add(mesh);
    this.decals.push({ mesh, life: 12, max: 12 });
    if (this.decals.length > 46) {
      const old = this.decals.shift();
      this.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      old.mesh.material.dispose();
    }
  }

  casing(pos, direction) {
    const mesh = new THREE.Mesh(this.casingGeo, this.casingMat);
    mesh.position.copy(pos);
    mesh.rotation.set(rng(0, 3), rng(0, 3), rng(0, 3));
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.casings.push({
      mesh, life: 2.2,
      vx: direction.x * rng(1.5, 3) + rng(-1, 1),
      vy: rng(2, 4), vz: direction.z * rng(1.5, 3) + rng(-1, 1),
      spin: rng(-12, 12)
    });
  }

  explosion(pos, radius = 6.5) {
    const sphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 2),
      new THREE.MeshBasicMaterial({ color: 0xffb05a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    sphere.position.copy(pos);
    sphere.scale.setScalar(0.4);
    this.scene.add(sphere);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.1, 40),
      new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    );
    ring.position.copy(pos);
    ring.position.y = 0.08;
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    const light = new THREE.PointLight(0xff8a3a, 90, radius * 4, 1.6);
    light.position.copy(pos).add(new THREE.Vector3(0, 1, 0));
    this.scene.add(light);
    this.spark(pos, 0xffb35a, 80, 15, 1.15, 13);
    this.spark(pos, 0xffe8b0, 28, 9, 0.75, 8);
    this.flash(pos, 0xffa040, 5.5, 0.22);
    this.explosionFx.push({ sphere, ring, light, life: 0.85, max: 0.85, radius });
  }

  update(dt) {
    const pos = this.particleGeo.attributes.position.array;
    const col = this.particleGeo.attributes.color.array;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        pos[i * 3 + 1] = -999;
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.03) { p.y = 0.03; p.vy *= -0.25; p.vx *= 0.65; p.vz *= 0.65; }
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      const f = Math.max(0, p.life / p.max);
      col[i * 3] = p.r * f; col[i * 3 + 1] = p.g * f; col[i * 3 + 2] = p.b * f;
    }
    this.particleGeo.attributes.position.needsUpdate = true;
    this.particleGeo.attributes.color.needsUpdate = true;

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      } else {
        t.mesh.material.opacity = 0.95 * (t.life / t.max);
      }
    }

    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.sprite);
        s.sprite.material.dispose();
        this.sprites.splice(i, 1);
      } else {
        const f = s.life / s.max;
        s.sprite.material.opacity = f;
        const sc = s.startScale * (1 + (1 - f) * 0.6);
        s.sprite.scale.set(sc, sc, 1);
      }
    }

    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        this.decals.splice(i, 1);
      } else if (d.life < 2) {
        d.mesh.material.opacity = d.life / 2;
      }
    }

    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.life -= dt;
      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        this.casings.splice(i, 1);
        continue;
      }
      c.vy -= 15 * dt;
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += c.spin * dt;
      c.mesh.rotation.z += c.spin * 0.6 * dt;
      if (c.mesh.position.y < 0.02) {
        c.mesh.position.y = 0.02;
        c.vy *= -0.45;
        c.vx *= 0.7; c.vz *= 0.7;
        if (Math.abs(c.vy) < 0.25) c.vy = 0;
      }
    }

    for (let i = this.explosionFx.length - 1; i >= 0; i--) {
      const e = this.explosionFx[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.remove(e.sphere); this.scene.remove(e.ring); this.scene.remove(e.light);
        e.sphere.geometry.dispose(); e.sphere.material.dispose();
        e.ring.geometry.dispose(); e.ring.material.dispose();
        this.explosionFx.splice(i, 1);
        continue;
      }
      const f = e.life / e.max;
      const grow = 1 - f;
      e.sphere.scale.setScalar(0.4 + grow * e.radius);
      e.sphere.material.opacity = f * 0.8;
      e.ring.scale.setScalar(0.5 + grow * e.radius * 1.4);
      e.ring.material.opacity = f * 0.75;
      e.light.intensity = 90 * f * f;
    }
  }
}
