import './style.css'
import {
  BEE_BY_ID,
  BEE_TYPES,
  SAVE_VERSION,
  UPGRADE_BY_ID,
  ZONES,
  ZONE_BY_ID,
  beeCost,
  clearSave,
  derive,
  fmt,
  isUpgradeUnlocked,
  loadState,
  nextRebirthAt,
  rebirthGain,
  saveState,
  upgradeCost,
} from './game/data.js'
import { HoneyWorld } from './game/world.js'
import { Sound } from './game/audio.js'
import { GameUI } from './ui.js'

// ---------------------------------------------------------------------------
// State + offline catch-up
// ---------------------------------------------------------------------------

const loaded = loadState()
const state = loaded.state
let stats = derive(state)
if (state.jar > stats.capacity) state.jar = stats.capacity

let offlineReport = null
if (loaded.loaded && loaded.elapsed > 45) {
  offlineReport = applyOffline(loaded.elapsed)
}
stats = derive(state)
if (state.jar > stats.capacity) state.jar = stats.capacity

function applyOffline(elapsedSeconds) {
  const before = derive(state)
  const seconds = Math.min(elapsedSeconds, 8 * 3600)
  const produced = before.rate * seconds
  let earned = 0
  if (before.autoEff > 0) {
    const total = state.jar + produced
    const jars = Math.floor(total / before.capacity)
    if (jars > 0) {
      earned = jars * before.capacity * before.value * before.fullBonus * before.autoEff
      state.honey += earned
      state.lifetime += earned
      state.runLifetime += earned
      state.jar = total - jars * before.capacity
    } else {
      state.jar = total
    }
  } else {
    state.jar = Math.min(before.capacity, state.jar + produced)
  }
  return {
    seconds,
    earned,
    auto: before.autoEff > 0,
    full: state.jar >= before.capacity - 0.001,
  }
}

// ---------------------------------------------------------------------------
// World, sound, UI
// ---------------------------------------------------------------------------

const canvas = document.getElementById('scene')
const sound = new Sound()
sound.enabled = !!state.sound

let world
try {
  world = new HoneyWorld(canvas, {
    onJarTap: () => collect(false),
  })
} catch (err) {
  console.error(err)
  document.getElementById('webglError').classList.remove('hidden')
}

if (world) {
  world.setZone(state.zone, state)
}

let ui = null
let autoOverflow = 0
let autoTimer = 1.1
let fullNotified = false
let saveTimer = 0
let hintTimer = 0
let hiddenAt = 0
let lastTime = performance.now()
let saveDisabled = false

const actions = {
  collect: () => collect(false),
  buyUpgrade,
  buyBee,
  unlockZone,
  travelZone,
  rebirth,
  toggleSound,
  eraseSave,
}

if (world) {
  ui = new GameUI({ state, getStats: () => stats, actions })

  if (offlineReport) {
    const report = offlineReport
    if (report.earned > 0) {
      setTimeout(
        () =>
          ui.toast(
            'Welcome back!',
            `Your bees banked +${fmt(report.earned)} honey while you were away.`,
            'coin',
            6200,
          ),
        900,
      )
    } else if (report.full) {
      setTimeout(() => ui.toast('Welcome back!', 'Your jar filled up while you were away. Come and get it!', 'jar', 5600), 900)
    } else {
      setTimeout(() => ui.toast('Welcome back!', 'The hive kept buzzing. Your jar has fresh honey.', 'honeybee', 4800), 900)
    }
  }

  if (!state.hintsSeen.intro) {
    setTimeout(() => {
      ui.showHint('Your bees fill the jar automatically. Tap STORE when it is ready!', 9000)
    }, 900)
    state.hintsSeen.intro = true
    saveState(state)
  } else if (state.jar >= stats.capacity - 0.001 && stats.autoEff === 0) {
    setTimeout(() => ui.showHint('Jar full! Tap STORE for a +25% bonus.', 7000), 800)
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => world.refreshFonts()).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Audio unlock + UI clicks
// ---------------------------------------------------------------------------

const unlockAudio = () => {
  sound.init()
  sound.setEnabled(!!state.sound)
  window.removeEventListener('pointerdown', unlockAudio)
}
window.addEventListener('pointerdown', unlockAudio, { passive: true })

document.addEventListener(
  'click',
  (e) => {
    if (!e.target.closest('button')) return
    if (!sound.ctx) return
    sound.click()
  },
  { passive: true },
)

// ---------------------------------------------------------------------------
// Gameplay actions
// ---------------------------------------------------------------------------

function recompute() {
  stats = derive(state)
  if (state.jar > stats.capacity) state.jar = stats.capacity
  return stats
}

function collect(auto = false, extra = 0) {
  if (!ui) return false
  const jarAmount = state.jar + (auto ? extra : 0)
  if (jarAmount < 0.5) {
    if (!auto) {
      ui.toast('Still filling…', 'Your bees need another moment. Give the jar a little time.', 'jar', 2200)
      ui.shakeCollect()
      sound.error()
    }
    return false
  }
  const stat = derive(state)
  const full = state.jar >= stat.capacity - 0.001
  let gain = jarAmount * stat.value * (full ? stat.fullBonus : 1)
  if (auto) gain *= stat.autoEff
  if (gain <= 0) return false

  state.jar = 0
  autoOverflow = 0
  state.honey += gain
  state.lifetime += gain
  state.runLifetime += gain
  fullNotified = false
  autoTimer = 1.1
  if (!auto) {
    state.totalJars += 1
    ui.floatGain(gain, full)
    ui.hideHint()
    if (world) world.spawnCollectBurst()
    sound.collect(full)
    state.hintsSeen.firstCollect = true
  }
  ui.updateHud()
  return true
}

function buyUpgrade(id) {
  if (!ui) return false
  const up = UPGRADE_BY_ID[id]
  if (!up) return false
  const level = state.upgrades[id] || 0
  if (level >= up.max) {
    ui.toast('Already maxed', `${up.name} is fully upgraded.`, 'check')
    return false
  }
  if (!isUpgradeUnlocked(state, up)) {
    const reqs = up.req.map((r) => UPGRADE_BY_ID[r]?.name).filter(Boolean).join(' & ')
    ui.toast('Upgrade locked', `Buy ${reqs || 'the previous node'} first.`, 'lock')
    sound.error()
    return false
  }
  const cost = upgradeCost(up, level)
  if (state.honey < cost) {
    ui.toast('Not enough honey', `${fmt(cost - state.honey)} more needed for ${up.name}.`, 'drop')
    sound.error()
    return false
  }
  state.honey -= cost
  state.upgrades[id] = level + 1
  recompute()
  sound.buy()
  if (world) world.spawnUpgradeBurst()
  ui.toast(`${up.name} • Lv ${level + 1}`, up.flavor, up.icon || 'drop')
  if (up.auto) {
    ui.toast(
      'Auto-pour online',
      `Full jars now store themselves at ${Math.round(up.auto * 100)}% value.`,
      'bolt',
      4600,
    )
  }
  saveState(state)
  return true
}

function buyBee(id) {
  if (!ui) return false
  const type = BEE_BY_ID[id]
  if (!type) return false
  if (!state.unlocked[type.zone]) {
    const zone = ZONE_BY_ID[type.zone]
    ui.toast('Bee not found here', `Unlock ${zone.name} to meet the ${type.name}.`, 'lock')
    sound.error()
    return false
  }
  const count = state.bees[id] || 0
  const cost = beeCost(type, count)
  if (state.honey < cost) {
    ui.toast('Not enough honey', `${fmt(cost - state.honey)} more needed to hire a ${type.name}.`, 'drop')
    sound.error()
    return false
  }
  state.honey -= cost
  state.bees[id] = count + 1
  recompute()
  if (world) {
    world.syncBees(state)
    world.spawnBeeBurst()
  }
  sound.beeBuy()
  ui.toast(`${type.name} joined!`, `The swarm now makes ${fmt(stats.beeRate)} base honey per second.`, 'bee')
  saveState(state)
  return true
}

function unlockZone(id) {
  if (!ui) return false
  const zone = ZONE_BY_ID[id]
  if (!zone) return false
  if (state.unlocked[id]) {
    return travelZone(id)
  }
  if (state.honey < zone.cost) {
    ui.toast('Not enough honey', `${fmt(zone.cost - state.honey)} more needed to reach ${zone.name}.`, 'drop')
    sound.error()
    return false
  }
  state.honey -= zone.cost
  state.unlocked[id] = true
  saveState(state)
  const ok = travelZone(id, true)
  if (ok) {
    ui.toast(`${zone.name} unlocked!`, `Flow ×${fmt(zone.prod)} · ${zone.jarName} jar · ${zone.nativeBee}`, zone.icon, 5200)
  }
  return ok
}

function travelZone(id, fromUnlock = false) {
  if (!ui) return false
  const zone = ZONE_BY_ID[id]
  if (!zone || !state.unlocked[id]) return false
  state.zone = id
  recompute()
  if (world) {
    world.setZone(id, state)
  }
  if (!fromUnlock) {
    ui.toast(zone.name, `Flow ×${fmt(zone.prod)} · ${zone.value}× jar value · ${zone.jarName}`, zone.icon, 4200)
  }
  ui.showZoneFlash(zone)
  ui.updateHud()
  sound.zone()
  saveState(state)
  return true
}

function rebirth() {
  if (!ui) return false
  const gain = rebirthGain(state)
  if (gain < 1) {
    ui.toast('Not ready yet', `Store ${fmt(nextRebirthAt(state) - state.runLifetime)} more honey this run.`, 'sparkle')
    return false
  }
  state.jelly += gain
  state.rebirths += 1
  state.honey = 0
  state.jar = 0
  state.runLifetime = 0
  state.upgrades = {}
  for (const type of BEE_TYPES) state.bees[type.id] = 0
  state.bees.worker = 1
  autoOverflow = 0
  fullNotified = false
  recompute()
  if (world) {
    world.setZone(state.zone, state)
    world.syncBees(state)
    world.spawnUpgradeBurst()
  }
  ui.showRebirthFlash()
  ui.toast(
    `Rebirth complete! +${gain} royal jelly`,
    `Permanent flow is now ×${(1 + state.jelly * 0.2).toFixed(2)}. Your islands are still unlocked.`,
    'sparkle',
    6000,
  )
  ui.updateHud()
  sound.rebirth()
  saveState(state)
  return true
}

function toggleSound() {
  state.sound = !state.sound
  sound.setEnabled(state.sound)
  if (ui) {
    ui.updateSoundButton()
    ui.toast(state.sound ? 'Sound on' : 'Sound off', state.sound ? 'The hive hums again.' : 'A quiet little apiary.', state.sound ? 'sound' : 'mute', 1800)
  }
  saveState(state)
}

function eraseSave() {
  saveDisabled = true
  clearSave()
  window.location.reload()
}

// ---------------------------------------------------------------------------
// Tick + milestones
// ---------------------------------------------------------------------------

function milestoneCheck() {
  if (!ui) return
  const nextZone = ZONES.find((z) => !state.unlocked[z.id])
  if (nextZone && state.honey >= nextZone.cost && !state.hintsSeen.zoneHint) {
    state.hintsSeen.zoneHint = true
    ui.toast('A new island awaits', `${nextZone.name} is affordable. Open ZONES to unlock it.`, 'compass', 5600)
    saveState(state)
  }
  const gain = rebirthGain(state)
  if (gain >= 1 && !state.hintsSeen.rebirthHint) {
    state.hintsSeen.rebirthHint = true
    ui.toast('Royal Rebirth ready', `You can earn +${gain} royal jelly in the Rebirth tab.`, 'sparkle', 6000)
    saveState(state)
  }
}

function step(dt) {
  if (stats.rate > 0 && state.jar < stats.capacity) {
    state.jar = Math.min(stats.capacity, state.jar + stats.rate * dt)
  } else if (stats.rate > 0 && stats.autoEff > 0 && state.jar >= stats.capacity - 0.0001) {
    autoOverflow += stats.rate * dt
  }

  const full = state.jar >= stats.capacity - 0.001
  if (full && stats.autoEff > 0) {
    autoTimer -= dt
    if (autoTimer <= 0) {
      autoTimer = 1.1
      collect(true, autoOverflow)
    }
  } else {
    autoTimer = 1.1
  }

  if (full && !fullNotified) {
    fullNotified = true
    if (stats.autoEff === 0) {
      sound.full()
      if (!state.hintsSeen.fullHint) {
        state.hintsSeen.fullHint = true
        ui.showHint('Jar full! Tap STORE for a +25% bonus.', 7000)
      }
    }
  } else if (!full) {
    fullNotified = false
  }

  hintTimer += dt
  if (hintTimer > 1.2) {
    hintTimer = 0
    milestoneCheck()
  }

  saveTimer += dt
  if (saveTimer > 5) {
    saveTimer = 0
    saveState(state)
  }
}

function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000))
  lastTime = now
  if (!document.hidden && world) {
    step(dt)
    world.update(dt, state, stats)
    world.render()
    if (ui) ui.tick(dt)
  }
  requestAnimationFrame(frame)
}

// ---------------------------------------------------------------------------
// Visibility / resize / save
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  if (world) world.resize()
})

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (world) world.resize()
  }, 220)
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now()
    if (!saveDisabled) saveState(state)
  } else {
    if (hiddenAt && ui) {
      const elapsed = (Date.now() - hiddenAt) / 1000
      hiddenAt = 0
      if (elapsed > 45) {
        const report = applyOffline(elapsed)
        recompute()
        if (world) world.syncBees(state)
        ui.updateHud()
        if (report.earned > 0) {
          ui.toast('Welcome back!', `Auto-pour banked +${fmt(report.earned)} honey while you were away.`, 'coin', 5200)
        } else if (report.full) {
          ui.showHint('Your jar filled up while you were away. Tap STORE to collect it!', 7000)
        } else {
          ui.toast('Welcome back!', 'The swarm kept buzzing in your absence.', 'bee', 4000)
        }
        saveState(state)
      }
    }
    lastTime = performance.now()
    if (sound.ctx?.state === 'suspended') sound.ctx.resume().catch(() => {})
  }
})

window.addEventListener('pagehide', () => {
  if (!saveDisabled) saveState(state)
})
window.addEventListener('beforeunload', () => {
  if (!saveDisabled) saveState(state)
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

if (world && ui) {
  requestAnimationFrame(frame)
  window.__honeyGame = {
    state,
    get stats() {
      return stats
    },
    world,
    ui,
    actions,
    collect: () => collect(false),
    addHoney(amount) {
      state.honey += amount
      state.lifetime += amount
      state.runLifetime += amount
      recompute()
      ui.updateHud()
    },
    fillJar() {
      state.jar = stats.capacity
      ui.updateHud()
    },
    enableAuto() {
      state.upgrades.auto1 = 1
      state.upgrades.root = 1
      state.upgrades.bees1 = 1
      recompute()
      ui.updateHud()
    },
    travel: (id) => travelZone(id),
    refresh: () => {
      recompute()
      ui.updateHud()
      if (ui.modalOpen) ui.renderShop({ preserve: true })
    },
    save: () => saveState(state),
    version: SAVE_VERSION,
  }
}
