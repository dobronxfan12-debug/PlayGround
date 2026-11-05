import * as THREE from 'three';
import { clamp, rng, makeGlow } from './textures.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _q = new THREE.Quaternion();

function makeMat(color, roughness, metalness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.9, ...extra });
}

function meshBox(w, h, d, x, y, z, material, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export class Enemy {
  constructor({ scene, effects, audio, game, position, boss = false, wave = 1 }) {
    this.scene = scene;
    this.effects = effects;
    this.audio = audio;
    this.game = game;
    this.boss = boss;
    this.wave = wave;
    this.root = new THREE.Group();
    this.root.position.copy(position);
    this.visual = new THREE.Group();
    this.root.add(this.visual);
    scene.add(this.root);

    this.maxHealth = boss ? 900 : Math.round(95 + wave * 7);
    this.health = this.maxHealth;
    this.speed = boss ? 2.7 : rng(3.8, 5.2);
    this.preferredNear = boss ? 11 : rng(7, 13);
    this.preferredFar = boss ? 23 : rng(15, 24);
    this.dead = false;
    this.finished = false;
    this.deathT = 0;
    this.deathDir = Math.random() < 0.5 ? 1 : -1;
    this.spawnT = 0.9;
    this.flashTime = 0;
    this.fireCooldown = rng(1.4, 2.8);
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = rng(1, 2.5);
    this.losTimer = 0;
    this.canSee = true;
    this.animPhase = Math.random() * 10;
    this.moveAmount = 0;
    this.summoned66 = false;
    this.summoned33 = false;
    this.age = 0;
    this.hitMeshes = [];
    this.flashMats = [];

    this.buildModel();
    this.buildHealthBar();
    this.root.scale.setScalar(this.spawnT > 0 ? 0.01 : 1);
    this.visual.scale.setScalar(boss ? 1.5 : rng(0.94, 1.06));
    this.spawnT = 0.9;
    this.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  }

  buildModel() {
    const armorColor = this.boss ? 0x3a1a1e : 0x30373a;
    const plateColor = this.boss ? 0x642228 : 0x454e50;
    this.armor = makeMat(armorColor, 0.36, 0.85);
    this.plate = makeMat(plateColor, 0.42, 0.8);
    this.cloth = makeMat(0x111514, 0.94, 0.05);
    this.visor = makeMat(0x210304, 0.18, 0.4, { emissive: this.boss ? 0xff1020 : 0xff2b30, emissiveIntensity: 8 });
    this.accent = makeMat(this.boss ? 0x4f0c10 : 0x4a1c0a, 0.35, 0.6, { emissive: 0xff3a00, emissiveIntensity: this.boss ? 2 : 1.1 });
    this.flashMats = [this.armor, this.plate];

    const v = this.visual;
    // pelvis / belt
    meshBox(0.46, 0.24, 0.3, 0, 0.94, 0, this.cloth, v);
    meshBox(0.5, 0.09, 0.34, 0, 1.03, 0, this.plate, v);
    meshBox(0.08, 0.11, 0.1, 0.25, 0.92, 0.03, this.accent, v);

    // torso
    const torso = meshBox(0.62, 0.64, 0.36, 0, 1.32, 0, this.cloth, v);
    const chest = meshBox(0.66, 0.48, 0.42, 0, 1.42, 0.015, this.armor, v);
    meshBox(0.42, 0.18, 0.44, 0, 1.58, 0.02, this.plate, v);
    meshBox(0.3, 0.1, 0.035, 0, 1.4, 0.23, this.accent, v);
    meshBox(0.1, 0.22, 0.03, -0.19, 1.31, 0.23, this.plate, v);
    meshBox(0.1, 0.22, 0.03, 0.19, 1.31, 0.23, this.plate, v);
    // backpack
    meshBox(0.42, 0.46, 0.18, 0, 1.35, -0.26, this.armor, v);
    meshBox(0.3, 0.1, 0.1, 0, 1.52, -0.36, this.plate, v);
    // shoulders
    const shoulderL = meshBox(0.26, 0.24, 0.34, -0.43, 1.5, 0, this.plate, v);
    const shoulderR = meshBox(0.26, 0.24, 0.34, 0.43, 1.5, 0, this.plate, v);
    shoulderL.rotation.z = 0.12; shoulderR.rotation.z = -0.12;

    // head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.72, 0.02);
    v.add(headGroup);
    const head = meshBox(0.28, 0.3, 0.3, 0, 0.06, 0, this.armor, headGroup);
    meshBox(0.33, 0.14, 0.33, 0, 0.18, 0, this.plate, headGroup);
    meshBox(0.19, 0.065, 0.035, 0, 0.05, 0.16, this.visor, headGroup);
    meshBox(0.05, 0.14, 0.12, 0.17, 0.06, -0.02, this.plate, headGroup);
    meshBox(0.05, 0.14, 0.12, -0.17, 0.06, -0.02, this.plate, headGroup);

    // arms with pivots
    this.arms = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.4, 1.47, 0);
      v.add(pivot);
      const upper = meshBox(0.19, 0.34, 0.22, side * 0.03, -0.18, 0, this.armor, pivot);
      meshBox(0.21, 0.12, 0.24, side * 0.03, -0.34, 0, this.plate, pivot);
      const fore = meshBox(0.16, 0.34, 0.18, side * 0.06, -0.52, 0.01, this.cloth, pivot);
      meshBox(0.17, 0.1, 0.2, side * 0.06, -0.66, 0.02, this.plate, pivot);
      this.arms.push(pivot);
      this.hitMeshes.push(upper, fore);
    }

    // legs with pivots
    this.legs = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.18, 0.92, 0);
      v.add(pivot);
      const thigh = meshBox(0.22, 0.42, 0.26, 0, -0.2, 0, this.cloth, pivot);
      const shin = meshBox(0.18, 0.38, 0.21, 0, -0.57, 0.01, this.armor, pivot);
      meshBox(0.19, 0.12, 0.22, 0, -0.44, 0.06, this.plate, pivot);
      meshBox(0.22, 0.12, 0.34, 0, -0.78, 0.06, this.plate, pivot);
      this.legs.push(pivot);
      this.hitMeshes.push(thigh, shin);
    }

    // rifle
    const gun = new THREE.Group();
    gun.position.set(0.34, 1.2, 0.29);
    v.add(gun);
    meshBox(0.07, 0.1, 0.55, 0, 0, 0.1, this.armor, gun);
    meshBox(0.05, 0.06, 0.34, 0, 0.05, 0.24, this.plate, gun);
    meshBox(0.02, 0.02, 0.36, 0, 0.01, 0.5, this.armor, gun);
    meshBox(0.04, 0.07, 0.08, 0, -0.08, 0.06, this.cloth, gun);
    meshBox(0.03, 0.08, 0.1, 0, -0.06, 0.17, this.plate, gun);
    this.gun = gun;

    // muzzle marker
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0.34, 1.21, 0.88);
    v.add(this.muzzle);

    // boss extras
    if (this.boss) {
      for (const side of [-1, 1]) {
        meshBox(0.28, 0.32, 0.42, side * 0.46, 1.68, -0.02, this.plate, v);
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.34, 10), this.accent);
        pod.position.set(side * 0.56, 1.62, 0.16);
        pod.rotation.x = Math.PI / 2;
        v.add(pod);
      }
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), this.visor);
      core.position.set(0, 1.38, 0.23);
      v.add(core);
      meshBox(0.34, 0.08, 0.06, 0, 1.79, 0.17, this.accent, v);
      this.core = core;
    }

    // eye glow so hostiles read at range
    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlow(), color: this.boss ? 0xff2035 : 0xff3a32, transparent: true,
      opacity: this.boss ? 0.6 : 0.42, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    eyeGlow.position.set(0, 1.78, 0.23);
    eyeGlow.scale.set(this.boss ? 0.7 : 0.38, this.boss ? 0.7 : 0.38, 1);
    v.add(eyeGlow);

    // register hitboxes
    for (const m of this.hitMeshes) {
      m.userData.enemy = this;
      m.userData.part = 'body';
      this.game.enemyShootables.push(m);
    }
    head.userData.enemy = this;
    head.userData.part = 'head';
    this.game.enemyShootables.push(head);
    this.head = head;
    torso.userData.enemy = this;
    torso.userData.part = 'body';
    this.game.enemyShootables.push(torso);
  }

  buildHealthBar() {
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 256;
    this.hpCanvas.height = 24;
    this.hpTex = new THREE.CanvasTexture(this.hpCanvas);
    this.hpTex.colorSpace = THREE.SRGBColorSpace;
    this.hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.hpTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.hpSprite.position.y = this.boss ? 4.4 : 2.22;
    this.hpSprite.scale.set(this.boss ? 2.8 : 1.15, this.boss ? 0.22 : 0.09, 1);
    this.hpSprite.visible = this.boss;
    this.hpSprite.renderOrder = 10;
    this.root.add(this.hpSprite);
    this.drawHealthBar(1);
  }

  drawHealthBar(ratio) {
    const ctx = this.hpCanvas.getContext('2d');
    const w = this.hpCanvas.width, h = this.hpCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 4, w, h - 8);
    ctx.fillStyle = this.boss ? '#ff2538' : '#ff8b3d';
    ctx.fillRect(2, 6, (w - 4) * clamp(ratio, 0, 1), h - 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 5, w - 2, h - 10);
    this.hpTex.needsUpdate = true;
  }

  hit(damage, part, point) {
    if (this.dead || this.spawnT > 0) return { killed: false, headshot: false };
    const headshot = part === 'head';
    const mult = headshot ? 3 : part === 'leg' ? 0.72 : 1;
    this.health -= damage * mult;
    this.flashTime = 0.08;
    this.hpSprite.visible = true;
    this.drawHealthBar(this.health / this.maxHealth);
    this.effects.spark(point, this.boss ? 0xff3322 : 0xffb266, headshot ? 16 : 8, 5, 0.4, 10);
    if (this.health <= 0) {
      this.die(headshot);
      return { killed: true, headshot };
    }
    return { killed: false, headshot };
  }

  die(headshot) {
    if (this.dead) return;
    this.dead = true;
    this.deathT = 0;
    this.deathDir = Math.random() < 0.5 ? 1 : -1;
    this.hpSprite.visible = false;
    this.visor.emissiveIntensity = 0.15;
    this.root.updateMatrixWorld(true);
    _v1.set(this.root.position.x, this.root.position.y + 1.4, this.root.position.z);
    this.effects.spark(_v1, 0xffa040, this.boss ? 70 : 26, this.boss ? 12 : 6, 0.9, 12);
    if (this.boss) this.effects.explosion(_v1, 4);
    for (let i = this.game.enemyShootables.length - 1; i >= 0; i--) {
      if (this.game.enemyShootables[i].userData.enemy === this) this.game.enemyShootables.splice(i, 1);
    }
    this.game.onEnemyKilled(this, headshot);
  }

  update(dt, time) {
    this.age += dt;
    if (this.finished) return;

    if (this.dead) {
      this.deathT += dt;
      const t = clamp(this.deathT / 0.7, 0, 1);
      const ease = t * t * (3 - 2 * t);
      this.visual.rotation.z = ease * this.deathDir * 1.45;
      this.visual.rotation.x = ease * 0.18;
      this.visual.position.y = -ease * 0.45;
      if (this.boss) {
        this.visual.position.y = -ease * 0.2;
        this.visual.rotation.z = ease * this.deathDir * 0.6;
      }
      if (this.deathT > 2.4) {
        this.finished = true;
        this.scene.remove(this.root);
        this.dispose();
      }
      return;
    }

    if (this.spawnT > 0) {
      this.spawnT -= dt;
      const p = 1 - clamp(this.spawnT / 0.9, 0, 1);
      this.root.scale.setScalar(0.01 + (0.99 * p));
      return;
    }
    this.root.scale.setScalar(1);
    this.root.updateMatrixWorld(true);

    if (this.flashTime > 0) {
      this.flashTime -= dt;
      const on = this.flashTime > 0;
      for (const m of this.flashMats) m.emissive.setHex(on ? 0x7a1f0c : 0x000000);
      if (!on) this.visor.emissiveIntensity = 5.5;
    }

    const player = this.game.player;
    const px = player.pos.x, pz = player.pos.z;
    const dx = px - this.root.position.x;
    const dz = pz - this.root.position.z;
    const dist = Math.hypot(dx, dz);
    const nx = dx / (dist || 1), nz = dz / (dist || 1);

    // face player
    _v1.set(px, this.root.position.y, pz);
    this.root.lookAt(_v1);

    if (player.dead) return;

    // line of sight
    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = 0.28 + Math.random() * 0.18;
      _v1.set(this.root.position.x, 1.5, this.root.position.z);
      _v2.set(player.pos.x, player.eyeHeight + 0.1, player.pos.z);
      const targetDist = _v1.distanceTo(_v2);
      const dir = _v2.clone().sub(_v1).normalize();
      _ray.set(_v1, dir);
      _ray.far = targetDist;
      const hits = _ray.intersectObjects(this.game.worldShootables, false);
      this.canSee = hits.length === 0 || hits[0].distance >= targetDist - 0.4;
    }

    // strafing logic
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = rng(1.1, 2.8);
      this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    }

    let mx = 0, mz = 0;
    if (this.canSee) {
      if (dist > this.preferredFar) { mx += nx; mz += nz; }
      else if (dist < this.preferredNear) { mx -= nx; mz -= nz; }
      else {
        mx += -nz * this.strafeDir * 0.72 + nx * 0.1;
        mz += nx * this.strafeDir * 0.72 + nz * 0.1;
      }
    } else {
      mx += nx; mz += nz;
    }
    const ml = Math.hypot(mx, mz);
    if (ml > 0.01) {
      mx /= ml; mz /= ml;
      const step = this.speed * dt;
      let moved = false;
      if (!this.game.blockedAt(this.root.position.x + mx * step, this.root.position.z, 0.55)) {
        this.root.position.x += mx * step; moved = true;
      }
      if (!this.game.blockedAt(this.root.position.x, this.root.position.z + mz * step, 0.55)) {
        this.root.position.z += mz * step; moved = true;
      }
      if (!moved) this.strafeDir *= -1;
      this.moveAmount = THREE.MathUtils.lerp(this.moveAmount, 1, dt * 6);
    } else {
      this.moveAmount = THREE.MathUtils.lerp(this.moveAmount, 0, dt * 8);
    }
    this.animPhase += dt * (4.5 + this.speed * 0.6) * this.moveAmount;
    const swing = Math.sin(this.animPhase) * 0.55 * this.moveAmount;
    if (this.legs) {
      this.legs[0].rotation.x = swing;
      this.legs[1].rotation.x = -swing;
    }
    if (this.arms) {
      this.arms[0].rotation.x = -0.55 + Math.sin(this.animPhase + 0.4) * 0.08;
      this.arms[1].rotation.x = -0.7 - Math.sin(this.animPhase + 0.4) * 0.05;
    }
    if (this.core) this.core.rotation.y += dt * 2;

    // shooting
    if (this.canSee) {
      if (this.burstLeft > 0) {
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
          this.fireShot(dist);
          this.burstLeft--;
          this.burstTimer = this.boss ? 0.12 : 0.135;
        }
      } else {
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0) {
          this.burstLeft = this.boss ? 7 : Math.floor(rng(3, 6));
          this.burstTimer = 0;
          this.fireCooldown = this.boss ? rng(1.2, 1.8) : rng(1.7, 3.2);
        }
      }
    }

    if (this.boss) {
      const ratio = this.health / this.maxHealth;
      if (!this.summoned66 && ratio <= 0.66) { this.summoned66 = true; this.game.spawnMinions(2, this.root.position); }
      if (!this.summoned33 && ratio <= 0.33) { this.summoned33 = true; this.game.spawnMinions(3, this.root.position); }
    }
  }

  fireShot(dist) {
    const player = this.game.player;
    if (player.dead) return;
    this.muzzle.getWorldPosition(_v1);
    _v2.set(player.pos.x + rng(-0.35, 0.35), player.eyeHeight + rng(-0.3, 0.2), player.pos.z + rng(-0.35, 0.35));
    const dir = _v2.clone().sub(_v1).normalize();
    const moving = Math.hypot(player.vel.x, player.vel.z);
    let chance = (this.boss ? 0.66 : 0.54) - dist * 0.0075 - moving * 0.02;
    if (player.crouching) chance -= 0.08;
    chance = clamp(chance, 0.12, 0.78);
    const hit = Math.random() < chance;
    if (hit) {
      this.game.damagePlayer(this.boss ? rng(8, 13) : rng(4.5, 8.5), this.root.position, true);
    } else {
      _v2.x += rng(-2.5, 2.5);
      _v2.y += rng(-0.5, 1.5);
    }
    const visualEnd = _v2.clone().addScaledVector(dir, -3.2);
    visualEnd.x += rng(-0.5, 0.5);
    visualEnd.y += rng(-0.2, 0.5);
    this.effects.tracer(_v1.clone(), visualEnd, this.boss ? 0xff3045 : 0xffb060, this.boss ? 0.013 : 0.008, 0.075);
    this.effects.flash(_v1.clone(), this.boss ? 0xff3035 : 0xffb060, this.boss ? 0.6 : 0.36, 0.05);
    const pan = this.game.panFor(this.root.position);
    const vol = clamp(1.4 / (dist * 0.12 + 1), 0.1, 0.55);
    this.audio.enemyShot(vol, pan);
  }

  dispose() {
    this.root.traverse(o => {
      if (o.isMesh) {
        o.geometry?.dispose();
        if (o.material && !Array.isArray(o.material)) o.material.dispose();
      }
    });
  }
}
