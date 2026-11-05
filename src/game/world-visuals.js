// Palette + procedural texture helpers shared by the 3D world.
import * as THREE from 'three'

export const TAU = Math.PI * 2
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const rand = (a, b) => a + Math.random() * (b - a)
export const lerp = (a, b, t) => a + (b - a) * t

export const ZONE_VISUALS = {
  meadow: {
    ground: 0x79bf51,
    groundEdge: 0x5b9b3d,
    rock: 0x9a7650,
    rockDark: 0x76563a,
    rim: 0x9c774d,
    hemi: 0xfff1cf,
    hemiGround: 0x648f4b,
    sun: 0xffe3a3,
    sunSprite: 0xffedb0,
    fog: 0xcfeaff,
    cloud: 0xffffff,
    petals: [0xff7d9c, 0xffe066, 0xffffff, 0xc48cff, 0xff9d5c],
    center: 0xffc53d,
    stem: 0x4d8a37,
    leaf: 0x5ba344,
    glass: 0xd9f4ff,
    honey: 0xf2a51b,
    honeyLight: 0xffcf5c,
    rimColor: 0xf0b43c,
    lid: 0x8a5a32,
    stars: false,
    ambientMotes: { color: 0xffe58a, count: 55, speed: 0.28, mode: 'up' },
    ambientLight: 1.25,
    envLight: 1.1,
  },
  desert: {
    ground: 0xd8a65d,
    groundEdge: 0xbd8745,
    rock: 0xa36a3c,
    rockDark: 0x7d4e2c,
    rim: 0xc18b4a,
    hemi: 0xffe0ad,
    hemiGround: 0xa9763f,
    sun: 0xffcf8a,
    sunSprite: 0xffe8b0,
    fog: 0xffdca8,
    cloud: 0xfff2dc,
    petals: [0xff7a59, 0xffb347, 0xffd166],
    center: 0xffc04d,
    stem: 0x7f9b45,
    leaf: 0x8fae4e,
    glass: 0xffe6bf,
    honey: 0xe98a13,
    honeyLight: 0xffbd4a,
    rimColor: 0xc47a32,
    lid: 0x9a5c2c,
    stars: false,
    ambientMotes: { color: 0xffd9a0, count: 65, speed: 0.22, mode: 'drift' },
    ambientLight: 1.4,
    envLight: 1.25,
  },
  crystal: {
    ground: 0x513879,
    groundEdge: 0x3c285d,
    rock: 0x36254f,
    rockDark: 0x241834,
    rim: 0x6f4a9e,
    hemi: 0xcab8ff,
    hemiGround: 0x402a61,
    sun: 0xcfb8ff,
    sunSprite: 0xd9c6ff,
    fog: 0x3d2a64,
    cloud: 0xc8b6f2,
    petals: [0x9ffcff, 0xd98bff, 0x7cc8ff, 0xff9ee8],
    center: 0xfff1a8,
    stem: 0x6e4b9c,
    leaf: 0x8c66c4,
    glass: 0xe3d4ff,
    honey: 0xd47ce8,
    honeyLight: 0xf3b3ff,
    rimColor: 0xc18aff,
    lid: 0x5c3c85,
    stars: true,
    ambientMotes: { color: 0x9ffcff, count: 90, speed: 0.3, mode: 'up' },
    ambientLight: 0.95,
    envLight: 0.85,
  },
  frost: {
    ground: 0xe9f7ff,
    groundEdge: 0xc7e4f2,
    rock: 0x94b4c7,
    rockDark: 0x6f93aa,
    rim: 0xb9d8e8,
    hemi: 0xe6f8ff,
    hemiGround: 0x8fb8cf,
    sun: 0xdff4ff,
    sunSprite: 0xf3ffff,
    fog: 0xd9f2ff,
    cloud: 0xffffff,
    petals: [0xd6f6ff, 0xffffff, 0xb7e9ff, 0xc9c6ff],
    center: 0xfff3b0,
    stem: 0x7ca6b8,
    leaf: 0x9cc9d8,
    glass: 0xe9fbff,
    honey: 0xf6c445,
    honeyLight: 0xffe89b,
    rimColor: 0xbce9f7,
    lid: 0x5d7f91,
    stars: true,
    ambientMotes: { color: 0xffffff, count: 230, speed: 0.75, mode: 'snow' },
    ambientLight: 1.15,
    envLight: 1.0,
  },
  gold: {
    ground: 0xcfa12f,
    groundEdge: 0xb18322,
    rock: 0x9a6b18,
    rockDark: 0x745010,
    rim: 0xd5a637,
    hemi: 0xfff0bb,
    hemiGround: 0x9d741c,
    sun: 0xffdf8a,
    sunSprite: 0xfff3bb,
    fog: 0xffe3a3,
    cloud: 0xfff2c4,
    petals: [0xffea8a, 0xffd25e, 0xfff7c8, 0xffb84d],
    center: 0xfff8d5,
    stem: 0xa57a1f,
    leaf: 0xc69b2d,
    glass: 0xfff0c4,
    honey: 0xffc21a,
    honeyLight: 0xffe875,
    rimColor: 0xffdf6e,
    lid: 0x9b6c1b,
    stars: false,
    ambientMotes: { color: 0xfff0a0, count: 100, speed: 0.35, mode: 'up' },
    ambientLight: 1.35,
    envLight: 1.2,
  },
}

export function zoneVisual(zoneId) {
  return ZONE_VISUALS[zoneId] || ZONE_VISUALS.meadow
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function canvasTexture(width, height, draw, anisotropy = 4) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  draw(ctx, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = anisotropy
  return texture
}

let _glowTexture = null
export function glowTexture() {
  if (_glowTexture) return _glowTexture
  _glowTexture = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.32, 'rgba(255,255,255,0.65)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
  return _glowTexture
}

export function honeycombPath(ctx, x, y, size) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6
    const px = x + Math.cos(a) * size
    const py = y + Math.sin(a) * size
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

export function makeJarLabelTexture(zone) {
  return canvasTexture(640, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    // Cream label with a warm edge.
    const grd = ctx.createLinearGradient(0, 0, w, h)
    grd.addColorStop(0, '#fff8e3')
    grd.addColorStop(1, '#ffe9b4')
    ctx.fillStyle = grd
    roundRect(ctx, 18, 18, w - 36, h - 36, 34)
    ctx.fill()
    ctx.strokeStyle = '#d9972a'
    ctx.lineWidth = 7
    ctx.stroke()
    ctx.setLineDash([3, 13])
    ctx.strokeStyle = 'rgba(160,102,16,0.5)'
    ctx.lineWidth = 3
    roundRect(ctx, 35, 35, w - 70, h - 70, 24)
    ctx.stroke()
    ctx.setLineDash([])

    // Honeycomb corners.
    ctx.strokeStyle = 'rgba(218,155,31,0.55)'
    ctx.lineWidth = 3
    for (const [cx, cy] of [
      [70, 66],
      [w - 70, 66],
      [70, h - 66],
      [w - 70, h - 66],
    ]) {
      honeycombPath(ctx, cx, cy, 17)
      ctx.stroke()
    }

    // Top ribbon.
    ctx.fillStyle = '#8b5a1c'
    ctx.font = '600 26px Fredoka, Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '8px'
    ctx.fillText('RAW  HONEY  CO.', w / 2, 78)

    // Main name (wrap into two lines if needed).
    const words = zone.jarName.toUpperCase().split(' ')
    ctx.fillStyle = '#4a2d0c'
    ctx.font = '700 66px Fredoka, Trebuchet MS, sans-serif'
    ctx.letterSpacing = '1px'
    if (words.length > 1 && zone.jarName.length > 13) {
      ctx.font = '700 54px Fredoka, Trebuchet MS, sans-serif'
      ctx.fillText(words.slice(0, 2).join(' '), w / 2, 158)
      ctx.fillText(words.slice(2).join(' '), w / 2, 214)
    } else {
      ctx.fillText(zone.jarName.toUpperCase(), w / 2, 188)
    }

    // Small bee + swirl rule.
    ctx.strokeStyle = '#d9972a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(190, 252)
    ctx.lineTo(450, 252)
    ctx.stroke()
    ctx.fillStyle = '#d9972a'
    ctx.beginPath()
    ctx.arc(w / 2, 252, 9, 0, TAU)
    ctx.fill()

    ctx.fillStyle = '#8b5a1c'
    ctx.font = '600 22px Nunito, Trebuchet MS, sans-serif'
    ctx.letterSpacing = '6px'
    ctx.fillText('SMALL BATCH • HIVE NO. 1', w / 2, 283)
    ctx.restore()
  })
}

export function makeSignTexture(zone) {
  return canvasTexture(640, 300, (ctx, w, h) => {
    // Wooden board.
    const grd = ctx.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#b98245')
    grd.addColorStop(0.5, '#a06a33')
    grd.addColorStop(1, '#855426')
    ctx.fillStyle = grd
    roundRect(ctx, 12, 12, w - 24, h - 24, 26)
    ctx.fill()
    ctx.strokeStyle = '#6f441d'
    ctx.lineWidth = 10
    ctx.stroke()

    // Grain.
    ctx.strokeStyle = 'rgba(86,50,18,0.24)'
    ctx.lineWidth = 3
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(40, 65 + i * 32)
      ctx.bezierCurveTo(190, 50 + i * 32, 420, 82 + i * 30, w - 40, 62 + i * 32)
      ctx.stroke()
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff3d1'
    ctx.font = '700 58px Fredoka, Trebuchet MS, sans-serif'
    ctx.fillText(zone.name.toUpperCase(), w / 2, 132)
    ctx.fillStyle = '#ffdc8a'
    ctx.font = '600 27px Nunito, Trebuchet MS, sans-serif'
    ctx.letterSpacing = '6px'
    ctx.fillText(zone.tagline.toUpperCase(), w / 2, 184)

    // Little painted flower.
    ctx.fillStyle = '#ffd45e'
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i
      ctx.beginPath()
      ctx.arc(w / 2 + Math.cos(a) * 25, 238 + Math.sin(a) * 18, 12, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = '#8a541c'
    ctx.beginPath()
    ctx.arc(w / 2, 238, 9, 0, TAU)
    ctx.fill()
  })
}

export function makeFullTexture() {
  return canvasTexture(512, 180, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const grd = ctx.createLinearGradient(0, 0, 0, h)
    grd.addColorStop(0, '#ffe27a')
    grd.addColorStop(0.55, '#ffbe2e')
    grd.addColorStop(1, '#f39a0b')
    ctx.fillStyle = grd
    roundRect(ctx, 10, 24, w - 20, h - 48, 52)
    ctx.fill()
    ctx.strokeStyle = '#9b5c06'
    ctx.lineWidth = 9
    ctx.stroke()
    ctx.fillStyle = '#5a3504'
    ctx.textAlign = 'center'
    ctx.font = '700 58px Fredoka, Trebuchet MS, sans-serif'
    ctx.fillText('JAR FULL!', w / 2, 89)
    ctx.font = '700 27px Nunito, Trebuchet MS, sans-serif'
    ctx.letterSpacing = '4px'
    ctx.fillText('TAP TO STORE  +25%', w / 2, 130)
  })
}

export function makeHiveSignTexture() {
  return canvasTexture(512, 200, (ctx, w, h) => {
    ctx.fillStyle = '#8a5a26'
    roundRect(ctx, 8, 8, w - 16, h - 16, 22)
    ctx.fill()
    ctx.strokeStyle = '#5f3a14'
    ctx.lineWidth = 8
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffedbd'
    ctx.font = '700 45px Fredoka, Trebuchet MS, sans-serif'
    ctx.fillText('HONEYMOON', w / 2, 82)
    ctx.fillStyle = '#ffd064'
    ctx.font = '700 49px Fredoka, Trebuchet MS, sans-serif'
    ctx.fillText('HIVE', w / 2, 138)
    ctx.fillStyle = '#ffe8ae'
    ctx.font = '600 18px Nunito, Trebuchet MS, sans-serif'
    ctx.letterSpacing = '7px'
    ctx.fillText('EST. TODAY', w / 2, 169)
  })
}
