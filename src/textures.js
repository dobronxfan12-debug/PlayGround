import * as THREE from 'three';

export function rng(a = 0, b = 1) { return a + Math.random() * (b - a); }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = aniso;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return tex;
}

function noiseFill(ctx, w, h, amount, alpha = 0.16, dark = true) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
  if (dark) {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 42; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = rng(18, 110);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.34)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
}

export function makeConcrete(aniso = 8) {
  const map = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#565752';
    ctx.fillRect(0, 0, w, h);
    noiseFill(ctx, w, h, 46, 0.3);
    // aggregate specks
    for (let i = 0; i < 2600; i++) {
      const s = Math.random() < 0.85 ? rng(0.5, 2) : rng(2, 4);
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    // expansion joints and cracks
    ctx.strokeStyle = 'rgba(15,16,15,0.5)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 128) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      let x = Math.random() * w, y = Math.random() * h;
      ctx.strokeStyle = `rgba(12,13,12,${rng(0.2, 0.55)})`;
      ctx.lineWidth = rng(0.7, 2.1);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += rng(-18, 18); y += rng(4, 22); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // faded paint marks
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#d9c078';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(96, 400, 54, 0.2, 2.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(370, 40); ctx.lineTo(430, 120); ctx.stroke();
    ctx.globalAlpha = 1;
  }, { repeat: [24, 24], aniso });
  const rough = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b6b6b6';
    ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = 150 + Math.random() * 90;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: [24, 24], srgb: false, aniso });
  return { map, rough };
}

export function makeAsphalt(aniso = 8) {
  const map = canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#434640';
    ctx.fillRect(0, 0, w, h);
    noiseFill(ctx, w, h, 54, 0.4);
    for (let i = 0; i < 1800; i++) {
      const g = Math.random() < 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.2)';
      ctx.fillStyle = g;
      ctx.fillRect(Math.random() * w, Math.random() * h, rng(1, 3), rng(1, 3));
    }
    ctx.strokeStyle = 'rgba(9,10,10,0.75)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      let x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) { x += rng(-25, 25); y += rng(6, 26); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // worn lane paint
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#d6c179';
    for (let i = 0; i < 6; i++) ctx.fillRect(40, 60 + i * 74, 380, 9);
    ctx.globalAlpha = 1;
  }, { repeat: [16, 16], aniso });
  return map;
}

export function makeMetal(aniso = 8, tint = '#4a5052') {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    noiseFill(ctx, w, h, 28, 0.2);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.15)';
      ctx.lineWidth = rng(0.5, 2);
      const y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + rng(-5, 5)); ctx.stroke();
    }
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, rng(0.7, 2.2), 0, 7); ctx.fill();
    }
  }, { repeat: [5, 5], aniso });
}

export function makeWood(aniso = 8) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6d5135';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const y = (i / 7) * h;
      ctx.fillStyle = i % 2 ? '#755838' : '#664a2e';
      ctx.fillRect(0, y + 1, w, h / 7 - 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      for (let k = 0; k < 6; k++) {
        ctx.strokeStyle = 'rgba(35,20,8,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const yy = y + rng(4, h / 7 - 4);
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(w * 0.3, yy + rng(-3, 3), w * 0.65, yy + rng(-3, 3), w, yy + rng(-4, 4));
        ctx.stroke();
      }
    }
    noiseFill(ctx, w, h, 16, 0.1);
  }, { repeat: [1, 1], aniso });
}

export function makeHazard(aniso = 8) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#171716';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#d79a19';
    for (let i = -w * 2; i < w * 2; i += 70) ctx.fillRect(i, -h, 34, h * 2);
    ctx.restore();
    noiseFill(ctx, w, h, 22, 0.12);
  }, { repeat: [1, 1], aniso });
}

export function makeContainer(aniso = 8, base = '#2e5a63') {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 20) {
      ctx.fillStyle = x % 40 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.14)';
      ctx.fillRect(x, 0, 9, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 9, 0, 1, h);
    }
    // rust streaks
    for (let i = 0; i < 44; i++) {
      const x = Math.random() * w, y = rng(0, h), len = rng(8, 70);
      ctx.fillStyle = `rgba(${rng(70, 115) | 0},${rng(38, 62) | 0},20,${rng(0.08, 0.35)})`;
      ctx.fillRect(x, y, rng(1, 5), len);
    }
    noiseFill(ctx, w, h, 18, 0.1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, w, 8);
    ctx.fillRect(0, h - 8, w, 8);
  }, { repeat: [1, 1], aniso });
}

export function makeSign(text, sub = '', color = '#ff6a1a') {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0b1113';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = color;
    ctx.fillRect(12, 12, w - 24, 8);
    ctx.font = '800 66px Arial Narrow, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e9f2f4';
    ctx.fillText(text, w / 2, h / 2 + 8);
    if (sub) {
      ctx.font = '500 22px monospace';
      ctx.fillStyle = 'rgba(233,242,244,0.6)';
      ctx.fillText(sub, w / 2, h / 2 + 50);
    }
  }, { repeat: [1, 1] });
}

export function makeHazardSign() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d29a1b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.moveTo(w / 2, 34); ctx.lineTo(w - 30, h - 42); ctx.lineTo(30, h - 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d29a1b';
    ctx.font = '800 90px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('!', w / 2, h - 64);
    ctx.fillStyle = '#141414';
    ctx.font = '700 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXPLOSIVE', w / 2, h - 16);
  }, { repeat: [1, 1] });
}

export function makeHelipad() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(209,187,114,0.55)';
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 228, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 205, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '800 170px Arial Narrow, Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(209,187,114,0.6)';
    ctx.fillText('H', w / 2, h / 2 + 8);
  }, { repeat: [1, 1] });
}

export function makeBulletHole() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 30);
    g.addColorStop(0, 'rgba(5,5,5,0.95)');
    g.addColorStop(0.32, 'rgba(12,11,10,0.8)');
    g.addColorStop(0.7, 'rgba(18,16,14,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      const a = Math.random() * 6.28;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * 6, h / 2 + Math.sin(a) * 6);
      ctx.lineTo(w / 2 + Math.cos(a) * rng(12, 28), h / 2 + Math.sin(a) * rng(12, 28));
      ctx.stroke();
    }
  }, { repeat: [1, 1] });
}

export function makeGlow() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,225,180,0.8)');
    g.addColorStop(0.5, 'rgba(255,150,60,0.22)');
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { repeat: [1, 1] });
}

export function makeFlash() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
    g.addColorStop(0, 'rgba(255,255,235,1)');
    g.addColorStop(0.2, 'rgba(255,220,150,0.95)');
    g.addColorStop(0.5, 'rgba(255,130,40,0.4)');
    g.addColorStop(1, 'rgba(255,80,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 100, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2;
      ctx.strokeStyle = 'rgba(255,230,170,0.85)';
      ctx.lineWidth = rng(2, 6);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
      ctx.lineTo(cx + Math.cos(a) * rng(62, 118), cy + Math.sin(a) * rng(62, 118));
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, { repeat: [1, 1] });
}

export function makeParticle() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, { repeat: [1, 1] });
}

export function makeSkyEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#172740');
  g.addColorStop(0.42, '#3a4a63');
  g.addColorStop(0.58, '#b9764f');
  g.addColorStop(0.66, '#6a443d');
  g.addColorStop(1, '#14171a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
  const sun = ctx.createRadialGradient(380, 152, 0, 380, 152, 85);
  sun.addColorStop(0, 'rgba(255,230,190,0.9)');
  sun.addColorStop(0.3, 'rgba(255,150,80,0.4)');
  sun.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rng(0.1, 0.5)})`;
    ctx.fillRect(Math.random() * 512, rng(0, 90), rng(0.5, 1.5), rng(0.5, 1.5));
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}
