// ---------------------------------------------------------------------------
// HONEYMOON HIVE — game data, economy and save/load
// ---------------------------------------------------------------------------

export const SAVE_KEY = 'honeymoon-hive-save-v1'
export const SAVE_VERSION = 1
export const REBIRTH_REQUIREMENT = 25000
export const REBIRTH_BONUS = 0.2

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

export function fmt(value, forceDecimals = 0) {
  if (!Number.isFinite(value)) return '0'
  if (value < 0) return '0'
  if (value < 1000) {
    if (forceDecimals > 0 || (value < 10 && value % 1 !== 0)) {
      return value.toFixed(value < 10 ? Math.max(forceDecimals, 1) : forceDecimals)
    }
    return Math.round(value).toString()
  }
  let tier = 0
  let n = value
  while (n >= 1000 && tier < SUFFIXES.length - 1) {
    n /= 1000
    tier++
  }
  const decimals = n < 10 ? 2 : n < 100 ? 1 : 0
  return `${n.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1')}${SUFFIXES[tier]}`
}

export function fmtRate(value) {
  if (value < 10) return value.toFixed(1).replace(/\.0$/, '')
  return fmt(value)
}

export function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export const ZONES = [
  {
    id: 'meadow',
    name: 'Clover Meadow',
    short: 'Meadow',
    tagline: 'Where every hive begins',
    lore: 'Rolling clover, lazy sunlight and the sweetest first harvest.',
    prod: 1,
    value: 1,
    cap: 1,
    cost: 0,
    jarName: 'Clover Honey',
    nativeBee: 'Meadow Drone',
    accent: '#f7b733',
    sky: ['#8fd7ff', '#dff4ff'],
    icon: 'flower',
  },
  {
    id: 'desert',
    name: 'Sunscorch Isle',
    short: 'Desert',
    tagline: 'Cactus blossoms & hot sand',
    lore: 'Dune bees sip cactus nectar that turns into thick, amber gold.',
    prod: 2.5,
    value: 1.3,
    cap: 1.15,
    cost: 2000,
    jarName: 'Cactus Blossom',
    nativeBee: 'Dune Bee',
    accent: '#ff9a3c',
    sky: ['#ffb35c', '#ffe6b0'],
    icon: 'cactus',
  },
  {
    id: 'crystal',
    name: 'Prism Hollow',
    short: 'Crystal',
    tagline: 'Glowing nectar under the earth',
    lore: 'Gem bees distil nectar through luminous geodes. Every drop sparkles.',
    prod: 6,
    value: 1.55,
    cap: 1.25,
    cost: 45000,
    jarName: 'Geode Nectar',
    nativeBee: 'Gem Bee',
    accent: '#b370ff',
    sky: ['#251b52', '#6c4bb3'],
    icon: 'crystal',
  },
  {
    id: 'frost',
    name: 'Frostpetal Peaks',
    short: 'Frost',
    tagline: 'Snowdrop honey at high altitude',
    lore: 'Frost bees work through the blizzard, collecting nectar from frozen blooms.',
    prod: 14,
    value: 1.9,
    cap: 1.35,
    cost: 900000,
    jarName: 'Snowdrop Honey',
    nativeBee: 'Frost Bee',
    accent: '#8fe6ff',
    sky: ['#8fc9ee', '#e9fbff'],
    icon: 'snow',
  },
  {
    id: 'gold',
    name: 'Gilded Sanctum',
    short: 'Golden',
    tagline: 'The legendary royal harvest',
    lore: 'A hive of living gold. Only the most devoted beekeepers find it.',
    prod: 35,
    value: 2.4,
    cap: 1.5,
    cost: 22000000,
    jarName: 'Royal Golden Honey',
    nativeBee: 'Gilded Queen',
    accent: '#ffd75e',
    sky: ['#f9c449', '#fff4c4'],
    icon: 'crown',
  },
]

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]))

// ---------------------------------------------------------------------------
// Bees
// ---------------------------------------------------------------------------

export const BEE_TYPES = [
  {
    id: 'worker',
    name: 'Worker Bee',
    tier: 1,
    rate: 2,
    cost: 20,
    growth: 1.17,
    zone: 'meadow',
    body: '#f6b733',
    stripe: '#3a2516',
    accent: '#ffe38a',
    scale: 0.9,
    blurb: 'Small, sunny and endlessly busy.',
  },
  {
    id: 'bumble',
    name: 'Bumble Bee',
    tier: 2,
    rate: 15,
    cost: 260,
    growth: 1.19,
    zone: 'meadow',
    body: '#f38b2f',
    stripe: '#2b1b12',
    accent: '#ffd08a',
    scale: 1.12,
    blurb: 'Rounder, fuzzier, and twice as determined.',
  },
  {
    id: 'dune',
    name: 'Dune Bee',
    tier: 3,
    rate: 120,
    cost: 3000,
    growth: 1.22,
    zone: 'desert',
    body: '#f5a742',
    stripe: '#5a3521',
    accent: '#ff7a3c',
    scale: 1.0,
    blurb: 'Rides the hot wind and never misses a cactus bloom.',
  },
  {
    id: 'gem',
    name: 'Gem Bee',
    tier: 4,
    rate: 950,
    cost: 55000,
    growth: 1.24,
    zone: 'crystal',
    body: '#b27cff',
    stripe: '#2c1c50',
    accent: '#7ef6ff',
    scale: 1.0,
    blurb: 'Wings refract the geode light like stained glass.',
  },
  {
    id: 'frost',
    name: 'Frost Bee',
    tier: 5,
    rate: 8000,
    cost: 1500000,
    growth: 1.26,
    zone: 'frost',
    body: '#bdefff',
    stripe: '#2b5580',
    accent: '#8fe6ff',
    scale: 1.04,
    blurb: 'A tiny blizzard with a very big appetite for nectar.',
  },
  {
    id: 'gilded',
    name: 'Gilded Queen',
    tier: 6,
    rate: 70000,
    cost: 30000000,
    growth: 1.28,
    zone: 'gold',
    body: '#ffd75e',
    stripe: '#7a4a08',
    accent: '#fff7c2',
    scale: 1.22,
    blurb: 'Royalty. She does not collect nectar so much as command it.',
  },
]

export const BEE_BY_ID = Object.fromEntries(BEE_TYPES.map((b) => [b.id, b]))

// ---------------------------------------------------------------------------
// Upgrade tree
// ---------------------------------------------------------------------------

export const UPGRADES = [
  {
    id: 'root',
    name: 'Sweet Start',
    icon: 'drop',
    x: 470,
    y: 12,
    cost: 10,
    growth: 2,
    max: 1,
    req: [],
    prod: 0.5,
    desc: '+50% honey flow',
    flavor: 'A little sugar goes a long way.',
  },
  {
    id: 'jar1',
    name: 'Bigger Jar',
    icon: 'jar',
    x: 310,
    y: 122,
    cost: 15,
    growth: 2,
    max: 5,
    req: ['root'],
    cap: 0.3,
    desc: '+30% jar capacity',
    flavor: 'More room for the good stuff.',
  },
  {
    id: 'bees1',
    name: 'Busy Bees',
    icon: 'bee',
    x: 630,
    y: 122,
    cost: 20,
    growth: 2.1,
    max: 5,
    req: ['root'],
    prod: 0.25,
    desc: '+25% honey flow',
    flavor: 'Rally the swarm.',
  },
  {
    id: 'glass1',
    name: 'Amber Glass',
    icon: 'jar',
    x: 110,
    y: 232,
    cost: 70,
    growth: 2.15,
    max: 5,
    req: ['jar1'],
    value: 0.2,
    desc: '+20% honey value',
    flavor: 'Sunlight makes it glow.',
  },
  {
    id: 'nectar1',
    name: 'Sweet Nectar',
    icon: 'drop',
    x: 470,
    y: 232,
    cost: 90,
    growth: 2.2,
    max: 5,
    req: ['root'],
    prod: 0.3,
    desc: '+30% honey flow',
    flavor: 'Richer blooms, richer drops.',
  },
  {
    id: 'auto1',
    name: 'Honey Tap',
    icon: 'bolt',
    x: 830,
    y: 232,
    cost: 900,
    growth: 2,
    max: 1,
    req: ['bees1'],
    auto: 0.5,
    desc: 'Auto-store full jars at 50% value',
    flavor: 'It never sleeps. Neither do the bees.',
  },
  {
    id: 'jar2',
    name: 'Honey Vault',
    icon: 'jar',
    x: 310,
    y: 342,
    cost: 650,
    growth: 2.4,
    max: 4,
    req: ['glass1'],
    cap: 0.4,
    desc: '+40% jar capacity',
    flavor: 'A jar with ambitions.',
  },
  {
    id: 'nectar2',
    name: 'Nectar Rush',
    icon: 'drop',
    x: 470,
    y: 342,
    cost: 1100,
    growth: 2.5,
    max: 4,
    req: ['nectar1'],
    prod: 0.5,
    desc: '+50% honey flow',
    flavor: 'The hive hums a little louder.',
  },
  {
    id: 'royal1',
    name: 'Royal Treatment',
    icon: 'bee',
    x: 630,
    y: 342,
    cost: 1600,
    growth: 2.5,
    max: 5,
    req: ['bees1'],
    prod: 0.35,
    desc: '+35% honey flow',
    flavor: 'Only the finest royal jelly.',
  },
  {
    id: 'gold1',
    name: 'Liquid Gold',
    icon: 'coin',
    x: 830,
    y: 342,
    cost: 2000,
    growth: 2.6,
    max: 4,
    req: ['auto1'],
    value: 0.35,
    desc: '+35% honey value',
    flavor: 'Sell every drop for its weight in gold.',
  },
  {
    id: 'jar3',
    name: 'Endless Jar',
    icon: 'jar',
    x: 310,
    y: 452,
    cost: 11000,
    growth: 2.7,
    max: 4,
    req: ['jar2'],
    cap: 0.6,
    desc: '+60% jar capacity',
    flavor: 'Where does it all go? Nobody asks.',
  },
  {
    id: 'hive1',
    name: 'Endless Hive',
    icon: 'hive',
    x: 470,
    y: 452,
    cost: 22000,
    growth: 3,
    max: 3,
    req: ['nectar2'],
    prod: 1,
    desc: '+100% honey flow',
    flavor: 'The comb expands as fast as you can build.',
  },
  {
    id: 'auto2',
    name: 'Auto Pour',
    icon: 'bolt',
    x: 630,
    y: 452,
    cost: 38000,
    growth: 2,
    max: 1,
    req: ['auto1', 'royal1'],
    auto: 1,
    prod: 0.3,
    desc: 'Auto-store full jars at 100% +30% flow',
    flavor: 'Hands-free honey. Pure bliss.',
  },
  {
    id: 'gold2',
    name: 'Golden Seal',
    icon: 'coin',
    x: 830,
    y: 452,
    cost: 55000,
    growth: 3,
    max: 2,
    req: ['gold1'],
    value: 1,
    desc: '+100% honey value',
    flavor: 'A wax seal fit for a queen.',
  },
]

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]))
export const TREE_WIDTH = 940
export const TREE_HEIGHT = 545

// ---------------------------------------------------------------------------
// State + derived stats
// ---------------------------------------------------------------------------

export function createInitialState() {
  const unlocked = { meadow: true }
  const bees = {}
  BEE_TYPES.forEach((b) => (bees[b.id] = 0))
  bees.worker = 1
  return {
    version: SAVE_VERSION,
    honey: 0,
    jar: 0,
    lifetime: 0,
    runLifetime: 0,
    totalJars: 0,
    bees,
    upgrades: {},
    zone: 'meadow',
    unlocked,
    jelly: 0,
    rebirths: 0,
    sound: true,
    savedAt: Date.now(),
    createdAt: Date.now(),
    hintsSeen: {},
  }
}

export function derive(state) {
  const zone = ZONE_BY_ID[state.zone] || ZONES[0]
  let beeRate = 0
  let beeCount = 0
  for (const type of BEE_TYPES) {
    const count = state.bees[type.id] || 0
    beeRate += count * type.rate
    beeCount += count
  }

  let prodMul = 1
  let capMul = 1
  let valueMul = 1
  let autoEff = 0

  for (const up of UPGRADES) {
    const level = state.upgrades[up.id] || 0
    if (!level) continue
    if (up.prod) prodMul *= 1 + up.prod * level
    if (up.cap) capMul *= 1 + up.cap * level
    if (up.value) valueMul *= 1 + up.value * level
    if (up.auto) autoEff = Math.max(autoEff, up.auto)
  }

  const rebirthMul = 1 + state.jelly * REBIRTH_BONUS
  const rate = beeRate * prodMul * zone.prod * rebirthMul
  const capacity = 60 * capMul * zone.cap
  const value = valueMul * zone.value
  const fullBonus = 1.25
  const perSecondValue = rate * value

  return {
    zone,
    beeRate,
    beeCount,
    prodMul,
    capMul,
    valueMul,
    prodFromUpgrades: prodMul * zone.prod * rebirthMul,
    rebirthMul,
    autoEff,
    rate,
    capacity: Math.max(10, capacity),
    value,
    fullBonus,
    perSecondValue,
    fillTime: rate > 0 ? capacity / rate : Infinity,
    collectValue: state.jar * value * (state.jar >= capacity - 0.0001 ? fullBonus : 1),
  }
}

export function upgradeCost(up, level) {
  return Math.ceil(up.cost * Math.pow(up.growth, level))
}

export function isUpgradeUnlocked(state, up) {
  return up.req.every((id) => (state.upgrades[id] || 0) > 0)
}

export function beeCost(type, count) {
  return Math.ceil(type.cost * Math.pow(type.growth, count))
}

export function totalBeeCount(state) {
  return BEE_TYPES.reduce((sum, type) => sum + (state.bees[type.id] || 0), 0)
}

export function rebirthGain(state) {
  return Math.floor(Math.sqrt(Math.max(0, state.runLifetime) / REBIRTH_REQUIREMENT))
}

export function nextRebirthAt(state) {
  const next = rebirthGain(state) + 1
  return next * next * REBIRTH_REQUIREMENT
}

export function rebirthMultiplier(state) {
  return 1 + state.jelly * REBIRTH_BONUS
}

export function zoneUnlocked(state, zone) {
  return !!state.unlocked[zone.id]
}

export function bestBeeAvailable(state) {
  return BEE_TYPES.filter((b) => zoneUnlocked(state, ZONE_BY_ID[b.zone])).at(-1)
}

export function saveState(state) {
  try {
    state.savedAt = Date.now()
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    return true
  } catch (err) {
    console.warn('Could not save game', err)
    return false
  }
}

export function loadState() {
  const fresh = createInitialState()
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { state: fresh, loaded: false, elapsed: 0 }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { state: fresh, loaded: false, elapsed: 0 }
    const state = {
      ...fresh,
      ...parsed,
      bees: { ...fresh.bees, ...(parsed.bees || {}) },
      upgrades: { ...(parsed.upgrades || {}) },
      unlocked: { ...fresh.unlocked, ...(parsed.unlocked || {}) },
      hintsSeen: { ...(parsed.hintsSeen || {}) },
    }
    // Sanitise.
    if (!ZONE_BY_ID[state.zone]) state.zone = 'meadow'
    state.honey = Math.max(0, Number(state.honey) || 0)
    state.jar = Math.max(0, Number(state.jar) || 0)
    state.lifetime = Math.max(0, Number(state.lifetime) || 0)
    state.runLifetime = Math.max(0, Number(state.runLifetime) || 0)
    state.jelly = Math.max(0, Number(state.jelly) || 0)
    state.rebirths = Math.max(0, Number(state.rebirths) || 0)
    state.unlocked.meadow = true
    for (const id of Object.keys(state.unlocked)) if (!ZONE_BY_ID[id]) delete state.unlocked[id]
    for (const key of Object.keys(state.bees)) {
      if (!BEE_BY_ID[key]) delete state.bees[key]
      else state.bees[key] = Math.max(0, Math.floor(Number(state.bees[key]) || 0))
    }
    for (const key of Object.keys(state.upgrades)) {
      const up = UPGRADE_BY_ID[key]
      if (!up) delete state.upgrades[key]
      else state.upgrades[key] = Math.min(up.max, Math.max(0, Math.floor(Number(state.upgrades[key]) || 0)))
    }
    const elapsed = Math.max(0, (Date.now() - (Number(state.savedAt) || Date.now())) / 1000)
    return { state, loaded: true, elapsed }
  } catch (err) {
    console.warn('Could not load save', err)
    return { state: fresh, loaded: false, elapsed: 0 }
  }
}

export function resetState(state) {
  const fresh = createInitialState()
  fresh.sound = state.sound
  fresh.createdAt = state.createdAt
  fresh.hintsSeen = { ...state.hintsSeen }
  fresh.unlocked = { ...state.unlocked }
  fresh.zone = state.zone
  fresh.jelly = 0
  fresh.rebirths = 0
  return fresh
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {}
}
