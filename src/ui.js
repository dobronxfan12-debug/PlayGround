import {
  BEE_BY_ID,
  BEE_TYPES,
  REBIRTH_BONUS,
  REBIRTH_REQUIREMENT,
  TREE_HEIGHT,
  TREE_WIDTH,
  UPGRADES,
  UPGRADE_BY_ID,
  ZONES,
  ZONE_BY_ID,
  beeCost,
  fmt,
  fmtRate,
  isUpgradeUnlocked,
  nextRebirthAt,
  rebirthGain,
  rebirthMultiplier,
  upgradeCost,
} from './game/data.js'
import { ICONS, beePortrait } from './icons.js'

const TAB_TITLES = {
  upgrades: 'Upgrade Tree',
  bees: 'The Swarm',
  zones: 'Honey Islands',
  rebirth: 'Royal Rebirth',
  help: 'How to Play',
}

const NODE_WIDTH = 158
const NODE_HEIGHT = 82
const RING_CIRCUMFERENCE = 125.664

const $ = (id) => document.getElementById(id)
const clamp01 = (v) => Math.max(0, Math.min(1, v))

export class GameUI {
  constructor({ state, getStats, actions }) {
    this.state = state
    this.getStats = getStats
    this.actions = actions
    this.activeTab = 'upgrades'
    this.modalOpen = false
    this.rebirthConfirmUntil = 0
    this.resetConfirmUntil = 0
    this.hintTimer = null
    this.toasts = []
    this.hudCache = {}
    this.treeFocus = true
    this.treeScroll = { left: 0, top: 0 }
    this.lastShopTick = 0

    this.el = {
      wallet: $('walletAmount'),
      rate: $('honeyRate'),
      jarBar: $('jarBar'),
      jarPercent: $('jarPercent'),
      collectBtn: $('collectBtn'),
      collectKicker: $('collectKicker'),
      collectLabel: $('collectLabel'),
      collectValue: $('collectValue'),
      ring: $('ringProgress'),
      zoneName: $('zoneName'),
      zoneMult: $('zoneMult'),
      zoneOrb: $('zoneOrb'),
      zoneChip: $('zoneChip'),
      soundBtn: $('soundBtn'),
      shopDot: $('shopDot'),
      zonesDot: $('zonesDot'),
      rebirthChip: $('rebirthChip'),
      jellyChip: $('jellyChip'),
      rebirthChipMult: $('rebirthChipMult'),
      footWallet: $('footWallet'),
      modal: $('modal'),
      sheet: $('sheet'),
      sheetBody: $('sheetBody'),
      sheetTitle: $('sheetTitle'),
      tabs: $('tabs'),
      toastLayer: $('toastLayer'),
      floatLayer: $('floatLayer'),
      hintBar: $('hintBar'),
      hintText: $('hintText'),
      zoneFlash: $('zoneFlash'),
      zoneFlashName: $('zoneFlashName'),
      rebirthFlash: $('rebirthFlash'),
    }

    this.paintStaticIcons()
    this.bind()
    this.updateHud()
  }

  paintStaticIcons() {
    document.querySelectorAll('[data-icon]').forEach((node) => {
      const icon = ICONS[node.dataset.icon]
      if (icon) node.innerHTML = icon
    })
    this.updateSoundButton()
  }

  updateSoundButton() {
    this.el.soundBtn.innerHTML = this.state.sound ? ICONS.sound : ICONS.mute
    this.el.soundBtn.classList.toggle('muted', !this.state.sound)
    this.el.soundBtn.setAttribute('aria-pressed', String(!!this.state.sound))
    this.el.soundBtn.setAttribute('aria-label', this.state.sound ? 'Mute sound' : 'Enable sound')
  }

  setText(node, text) {
    if (!node) return
    if (node.textContent !== text) node.textContent = text
  }

  updateHud() {
    const state = this.state
    const stats = this.getStats()
    const zone = stats.zone
    const cap = stats.capacity || 1
    const frac = clamp01(state.jar / cap)
    const full = frac >= 0.999
    const gain = state.jar * stats.value * (full ? stats.fullBonus : 1)

    this.setText(this.el.wallet, fmt(state.honey))
    this.setText(this.el.rate, `+${fmtRate(stats.rate)}/s`)
    const pct = Math.floor(frac * 100)
    this.setText(this.el.jarPercent, `${pct}%`)
    this.el.jarBar.style.width = `${(frac * 100).toFixed(1)}%`
    this.el.ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - frac))

    this.setText(this.el.collectKicker, full ? 'FULL JAR • +25%' : `JAR ${pct}% • ${fmt(stats.capacity)} CAP`)
    this.setText(this.el.collectLabel, full ? 'STORE THE JAR' : 'STORE HONEY')
    this.setText(this.el.collectValue, `+${fmt(gain)} honey`)
    this.el.collectBtn.classList.toggle('full', full)
    this.el.collectBtn.disabled = state.jar < 0.5
    this.el.collectBtn.setAttribute(
      'aria-label',
      state.jar < 0.5 ? 'Jar is still filling' : `Store ${fmt(gain)} honey from the jar`,
    )

    this.setText(this.el.zoneName, zone.name)
    this.setText(this.el.zoneMult, `×${fmt(zone.prod)}`)
    if (this.el.zoneOrb.dataset.zone !== zone.id) {
      this.el.zoneOrb.dataset.zone = zone.id
      this.el.zoneOrb.innerHTML = ICONS[zone.icon] || ICONS.flower
    }
    this.el.zoneChip.style.setProperty('--accent', zone.accent)
    document.documentElement.style.setProperty('--accent', zone.accent)

    const affordableUpgrade = UPGRADES.some((up) => {
      const level = state.upgrades[up.id] || 0
      if (level >= up.max) return false
      if (!isUpgradeUnlocked(state, up)) return false
      return state.honey >= upgradeCost(up, level)
    })
    const affordableBee = BEE_TYPES.some((type) => {
      if (!state.unlocked[type.zone]) return false
      return state.honey >= beeCost(type, state.bees[type.id] || 0)
    })
    this.el.shopDot.hidden = !(affordableUpgrade || affordableBee)
    const affordableZone = ZONES.some((z) => !state.unlocked[z.id] && state.honey >= z.cost)
    this.el.zonesDot.hidden = !affordableZone

    if (state.jelly > 0) {
      this.el.rebirthChip.hidden = false
      this.setText(this.el.jellyChip, fmt(state.jelly))
      this.setText(this.el.rebirthChipMult, `+${Math.round((rebirthMultiplier(state) - 1) * 100)}% flow`)
    } else {
      this.el.rebirthChip.hidden = true
    }

    this.setText(this.el.footWallet, fmt(state.honey))
    document.title = `Honeymoon Hive — ${fmt(state.honey)} honey`
  }

  bumpWallet() {
    const node = this.el.wallet
    node.classList.remove('pop')
    void node.offsetWidth
    node.classList.add('pop')
    setTimeout(() => node.classList.remove('pop'), 160)
  }

  tick(dt) {
    this.lastShopTick += dt
    if (this.lastShopTick >= 0.11) {
      this.lastShopTick = 0
      this.updateHud()
    }
    if (this.lastShopTick === 0 && this.modalOpen) this.updateShopAffordability()
    if (this.rebirthConfirmUntil && Date.now() > this.rebirthConfirmUntil) {
      this.rebirthConfirmUntil = 0
      if (this.modalOpen && this.activeTab === 'rebirth') this.renderShop({ preserve: true })
    }
    if (this.resetConfirmUntil && Date.now() > this.resetConfirmUntil) {
      this.resetConfirmUntil = 0
      if (this.modalOpen && this.activeTab === 'rebirth') this.renderShop({ preserve: true })
    }
  }

  // ---------------------------------------------------------------- toasts

  toast(title, message = '', icon = 'drop', duration = 3400) {
    const node = document.createElement('div')
    node.className = 'toast'
    node.innerHTML = `<span class="toast-icon">${ICONS[icon] || ICONS.drop}</span>
      <div class="toast-copy"><b>${title}</b>${message ? `<span>${message}</span>` : ''}</div>`
    this.el.toastLayer.appendChild(node)
    this.toasts.push(node)
    while (this.toasts.length > 3) {
      const old = this.toasts.shift()
      old.remove()
    }
    setTimeout(() => {
      node.classList.add('out')
      setTimeout(() => {
        node.remove()
        this.toasts = this.toasts.filter((t) => t !== node)
      }, 280)
    }, duration)
  }

  floatGain(amount, full = false) {
    const rect = this.el.collectBtn.getBoundingClientRect()
    const x = rect.left + rect.width * 0.56
    const y = rect.top + 4
    const node = document.createElement('div')
    node.className = 'float-gain'
    node.innerHTML = `+${fmt(amount)}<small> honey</small>`
    node.style.left = `${x}px`
    node.style.top = `${y}px`
    if (full) node.style.fontSize = '30px'
    this.el.floatLayer.appendChild(node)
    for (let i = 0; i < 5; i++) {
      const drop = document.createElement('div')
      drop.className = 'float-drop'
      drop.style.left = `${x + (Math.random() - 0.5) * 120}px`
      drop.style.top = `${y - Math.random() * 20}px`
      drop.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`)
      drop.style.animationDelay = `${Math.random() * 0.16}s`
      this.el.floatLayer.appendChild(drop)
      setTimeout(() => drop.remove(), 1200)
    }
    setTimeout(() => node.remove(), 1300)
    this.bumpWallet()
  }

  showHint(text, duration = 6500) {
    this.el.hintText.textContent = text
    this.el.hintBar.hidden = false
    this.el.hintBar.style.animation = 'none'
    void this.el.hintBar.offsetWidth
    this.el.hintBar.style.animation = ''
    clearTimeout(this.hintTimer)
    if (duration > 0) {
      this.hintTimer = setTimeout(() => this.hideHint(), duration)
    }
  }

  hideHint() {
    this.el.hintBar.hidden = true
    clearTimeout(this.hintTimer)
  }

  shakeCollect() {
    const btn = this.el.collectBtn
    btn.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px) rotate(-0.5deg)' },
        { transform: 'translateX(5px) rotate(0.5deg)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 260, easing: 'ease-out' },
    )
  }

  // ---------------------------------------------------------------- modal

  bind() {
    this.el.collectBtn.addEventListener('click', () => this.actions.collect())
    $('zonesBtn').addEventListener('click', () => this.openShop('zones'))
    $('shopBtn').addEventListener('click', () => this.openShop('upgrades'))
    this.el.zoneChip.addEventListener('click', () => this.openShop('zones'))
    this.el.soundBtn.addEventListener('click', () => {
      this.actions.toggleSound()
      this.updateSoundButton()
    })
    $('sheetClose').addEventListener('click', () => this.closeShop())
    $('doneBtn').addEventListener('click', () => this.closeShop())
    $('modalScrim').addEventListener('click', () => this.closeShop())
    $('hintClose').addEventListener('click', () => this.hideHint())
    $('helpLink').addEventListener('click', () => {
      this.activeTab = 'help'
      this.renderShop()
    })
    this.el.tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]')
      if (!tab) return
      this.activeTab = tab.dataset.tab
      this.treeFocus = this.activeTab === 'upgrades'
      this.renderShop()
    })
    this.el.sheetBody.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]')
      if (!target) return
      this.handleAction(target)
    })
    this.el.sheetBody.addEventListener(
      'scroll',
      (e) => {
        if (e.target.id === 'treeScroll') {
          this.treeScroll.left = e.target.scrollLeft
          this.treeScroll.top = e.target.scrollTop
        }
      },
      true,
    )
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalOpen) this.closeShop()
    })
  }

  handleAction(target) {
    const action = target.dataset.action
    const id = target.dataset.id
    if (action === 'upgrade') {
      const ok = this.actions.buyUpgrade(id)
      if (ok) {
        this.updateHud()
        this.renderShop({ preserve: true })
      }
    } else if (action === 'bee') {
      const ok = this.actions.buyBee(id)
      if (ok) {
        this.updateHud()
        this.renderShop({ preserve: true })
      }
    } else if (action === 'zone') {
      const zone = ZONE_BY_ID[id]
      if (!zone) return
      if (this.state.unlocked[id]) {
        const ok = this.actions.travelZone(id)
        if (ok) {
          this.updateHud()
          this.closeShop()
        }
      } else {
        const ok = this.actions.unlockZone(id)
        if (ok) {
          this.updateHud()
          this.renderShop({ preserve: true })
        }
      }
    } else if (action === 'rebirth') {
      const gain = rebirthGain(this.state)
      if (gain < 1) return
      if (Date.now() < this.rebirthConfirmUntil) {
        this.rebirthConfirmUntil = 0
        this.actions.rebirth()
        this.updateHud()
        this.closeShop()
      } else {
        this.rebirthConfirmUntil = Date.now() + 5200
        this.renderShop({ preserve: true })
        this.toast('This resets this run', 'Tap the red button once more to rebirth.', 'sparkle', 3000)
      }
    } else if (action === 'erase') {
      if (Date.now() < this.resetConfirmUntil) {
        this.actions.eraseSave()
      } else {
        this.resetConfirmUntil = Date.now() + 3800
        this.renderShop({ preserve: true })
        this.toast('Erase everything?', 'Tap “Erase save” again to confirm.', 'help', 3000)
      }
    } else if (action === 'help-back') {
      this.activeTab = 'upgrades'
      this.renderShop()
    }
  }

  openShop(tab = 'upgrades') {
    this.activeTab = tab
    this.treeFocus = tab === 'upgrades'
    this.modalOpen = true
    this.el.modal.classList.remove('hidden')
    this.el.modal.setAttribute('aria-hidden', 'false')
    this.renderShop()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.el.modal.classList.add('open'))
    })
    setTimeout(() => this.el.sheetBody.scrollTop = 0, 30)
  }

  closeShop() {
    if (!this.modalOpen) return
    this.modalOpen = false
    this.el.modal.classList.remove('open')
    this.el.modal.setAttribute('aria-hidden', 'true')
    setTimeout(() => {
      if (!this.modalOpen) this.el.modal.classList.add('hidden')
    }, 330)
  }

  renderShop(opts = {}) {
    const preserve = opts.preserve
    const oldTree = $('treeScroll')
    const savedTree = preserve && oldTree ? { left: oldTree.scrollLeft, top: oldTree.scrollTop } : this.treeScroll
    const savedBody = this.el.sheetBody.scrollTop

    this.setText(this.el.sheetTitle, TAB_TITLES[this.activeTab] || 'Honeymoon Hive')
    this.el.tabs.querySelectorAll('[data-tab]').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === this.activeTab)
    })

    if (this.activeTab === 'upgrades') this.el.sheetBody.innerHTML = this.renderUpgrades()
    else if (this.activeTab === 'bees') this.el.sheetBody.innerHTML = this.renderBees()
    else if (this.activeTab === 'zones') this.el.sheetBody.innerHTML = this.renderZones()
    else if (this.activeTab === 'rebirth') this.el.sheetBody.innerHTML = this.renderRebirth()
    else this.el.sheetBody.innerHTML = this.renderHelp()

    this.el.sheetBody.scrollTop = preserve ? savedBody : 0
    if (this.activeTab === 'upgrades') {
      const tree = $('treeScroll')
      if (tree) {
        requestAnimationFrame(() => {
          if (this.treeFocus || !preserve) {
            this.focusTreeOnNext()
          } else {
            tree.scrollLeft = savedTree.left
            tree.scrollTop = savedTree.top
          }
          this.treeFocus = false
        })
      }
    }
    this.updateShopAffordability()
    this.updateHud()
  }

  focusTreeOnNext() {
    const tree = $('treeScroll')
    if (!tree) return
    const state = this.state
    let focus = null
    for (const up of UPGRADES) {
      const level = state.upgrades[up.id] || 0
      if (level >= up.max) continue
      if (!isUpgradeUnlocked(state, up)) continue
      if (!focus || up.y > focus.y) focus = up
    }
    if (!focus) focus = UPGRADE_BY_ID.root
    const targetLeft = focus.x - tree.clientWidth / 2
    const targetTop = focus.y - 70
    tree.scrollLeft = Math.max(0, Math.min(TREE_WIDTH - tree.clientWidth, targetLeft))
    tree.scrollTop = Math.max(0, Math.min(TREE_HEIGHT - tree.clientHeight, targetTop))
    this.treeScroll.left = tree.scrollLeft
    this.treeScroll.top = tree.scrollTop
  }

  updateShopAffordability() {
    if (!this.modalOpen) return
    const state = this.state
    if (this.activeTab === 'upgrades') {
      this.el.sheetBody.querySelectorAll('.tree-node').forEach((node) => {
        const up = UPGRADE_BY_ID[node.dataset.id]
        if (!up) return
        const level = state.upgrades[up.id] || 0
        const affordable = level < up.max && isUpgradeUnlocked(state, up) && state.honey >= upgradeCost(up, level)
        node.classList.toggle('affordable', affordable)
      })
    } else if (this.activeTab === 'bees') {
      this.el.sheetBody.querySelectorAll('[data-action="bee"]').forEach((btn) => {
        const type = BEE_BY_ID[btn.dataset.id]
        if (!type) return
        const unlocked = !!state.unlocked[type.zone]
        const cost = beeCost(type, state.bees[type.id] || 0)
        btn.disabled = !unlocked || state.honey < cost
      })
    } else if (this.activeTab === 'zones') {
      this.el.sheetBody.querySelectorAll('[data-action="zone"]').forEach((btn) => {
        const zone = ZONE_BY_ID[btn.dataset.id]
        if (!zone) return
        if (state.unlocked[zone.id]) {
          btn.disabled = state.zone === zone.id
        } else {
          btn.disabled = state.honey < zone.cost
        }
      })
    }
  }

  // ---------------------------------------------------------------- trees

  renderUpgrades() {
    const state = this.state
    const stats = this.getStats()
    const links = []
    const nodes = []
    for (const up of UPGRADES) {
      for (const reqId of up.req) {
        const req = UPGRADE_BY_ID[reqId]
        if (!req) continue
        const x1 = req.x
        const y1 = req.y + NODE_HEIGHT
        const x2 = up.x
        const y2 = up.y
        const on = (state.upgrades[reqId] || 0) > 0
        links.push(
          `<path class="link${on ? ' on' : ''}" d="M ${x1} ${y1} C ${x1} ${y1 + 40}, ${x2} ${y2 - 40}, ${x2} ${y2}" />`,
        )
      }
      nodes.push(this.upgradeNode(up))
    }

    const auto = stats.autoEff > 0 ? `${Math.round(stats.autoEff * 100)}%` : 'OFF'
    return `<div class="tree-overview">
      <div class="stat-chip"><small>${ICONS.drop} Flow</small><b>+${fmtRate(stats.rate)}/s</b></div>
      <div class="stat-chip"><small>${ICONS.jar} Jar</small><b>${fmt(stats.capacity)}</b></div>
      <div class="stat-chip"><small>${ICONS.coin} Value</small><b>×${stats.value.toFixed(2)}</b></div>
      <div class="stat-chip"><small>${ICONS.bolt} Auto</small><b>${auto}</b></div>
    </div>
    <div class="tree-shell">
      <div class="tree-fade left" aria-hidden="true"></div>
      <div class="tree-fade right" aria-hidden="true"></div>
      <div class="tree-scroll" id="treeScroll">
        <div class="tree-canvas" style="width:${TREE_WIDTH}px;height:${TREE_HEIGHT}px">
          <svg class="tree-links" viewBox="0 0 ${TREE_WIDTH} ${TREE_HEIGHT}" width="${TREE_WIDTH}" height="${TREE_HEIGHT}" aria-hidden="true">${links.join('')}</svg>
          ${nodes.join('')}
        </div>
      </div>
    </div>
    <div class="tree-tip"><span>${ICONS.arrow} <b>Drag to explore.</b> Buy a node to open the next branch.</span><span>${this.countOwnedUpgrades()} / ${UPGRADES.length} bought</span></div>`
  }

  countOwnedUpgrades() {
    return UPGRADES.filter((up) => (this.state.upgrades[up.id] || 0) > 0).length
  }

  upgradeNode(up) {
    const state = this.state
    const level = state.upgrades[up.id] || 0
    const unlocked = isUpgradeUnlocked(state, up)
    const maxed = level >= up.max
    const cost = upgradeCost(up, level)
    const affordable = unlocked && !maxed && state.honey >= cost
    const classes = ['tree-node']
    if (!unlocked) classes.push('locked')
    if (maxed) classes.push('maxed')
    if (affordable) classes.push('affordable')
    const icon = ICONS[up.icon] || ICONS.drop
    const reqNames = up.req.map((id) => UPGRADE_BY_ID[id]?.name).filter(Boolean).join(', ')
    const pips = Array.from({ length: up.max }, (_, i) => `<i class="pip${i < level ? ' on' : ''}"></i>`).join('')
    let flag = ''
    if (maxed) flag = '<span class="node-flag">MAXED</span>'
    else if (!unlocked) flag = '<span class="node-flag needs">LOCKED</span>'
    else if (affordable) flag = '<span class="node-flag">READY</span>'
    return `<button class="${classes.join(' ')}" style="left:${up.x - NODE_WIDTH / 2}px;top:${up.y}px;width:${NODE_WIDTH}px;min-height:${NODE_HEIGHT}px" data-action="upgrade" data-id="${up.id}" title="${up.flavor}${reqNames ? ` Needs: ${reqNames}` : ''}">
      <div class="node-top">
        <span class="node-icon">${icon}</span>
        <span class="node-level">${maxed ? 'MAX' : `Lv ${level}/${up.max}`}</span>
        ${unlocked ? '' : `<span class="node-lock">${ICONS.lock}</span>`}
      </div>
      <b class="node-name">${up.name}</b>
      <span class="node-desc">${up.desc}</span>
      <div class="node-bottom">
        <span class="node-cost">${ICONS.drop}${maxed ? 'Done' : fmt(cost)}</span>
        ${flag}
        <span class="pips">${pips}</span>
      </div>
    </button>`
  }

  // ---------------------------------------------------------------- bees

  renderBees() {
    const state = this.state
    const stats = this.getStats()
    const cards = BEE_TYPES.map((type) => {
      const count = state.bees[type.id] || 0
      const unlocked = !!state.unlocked[type.zone]
      const cost = beeCost(type, count)
      const affordable = unlocked && state.honey >= cost
      const zone = ZONE_BY_ID[type.zone]
      return `<article class="bee-card${unlocked ? '' : ' locked'}">
        ${count ? `<span class="owned-pill">×${count}</span>` : ''}
        <div class="card-head">
          ${beePortrait(type, !unlocked)}
          <div class="bee-card-title">
            <b>${type.name}</b>
            <span class="tier-pill">TIER ${type.tier}</span>
          </div>
        </div>
        <p class="bee-blurb">${type.blurb}</p>
        <div class="bee-numbers"><span>${fmtRate(type.rate)} honey/s each</span><strong>${count ? `+${fmtRate(count * type.rate)}/s` : 'not hired'}</strong></div>
        <button class="buy-btn" data-action="bee" data-id="${type.id}" ${!affordable ? 'disabled' : ''}>
          ${unlocked ? `${ICONS.drop} HIRE • ${fmt(cost)}` : `${ICONS.lock} ${zone.short.toUpperCase()} ZONE`}
        </button>
      </article>`
    }).join('')
    const best = this.bestAffordableBee()
    return `<div class="panel-intro">
      <p><b>${stats.beeCount} busy bee${stats.beeCount === 1 ? '' : 's'}</b> in your swarm, making <b>+${fmtRate(stats.rate)} honey/s</b> right now. Every bee joins the island.</p>
      <div class="mini-stat"><small>NEXT BEE</small><strong>${best ? best.name : '—'}</strong></div>
    </div>
    <div class="bee-grid">${cards}</div>`
  }

  bestAffordableBee() {
    const state = this.state
    let best = null
    for (const type of BEE_TYPES) {
      if (!state.unlocked[type.zone]) continue
      const cost = beeCost(type, state.bees[type.id] || 0)
      if (state.honey < cost) continue
      best = type
    }
    return best
  }

  // ---------------------------------------------------------------- zones

  renderZones() {
    const state = this.state
    const cards = ZONES.map((zone) => {
      const unlocked = !!state.unlocked[zone.id]
      const active = state.zone === zone.id
      const affordable = state.honey >= zone.cost
      let tag = 'LOCKED'
      let label = `${ICONS.lock} ${fmt(zone.cost)}`
      let cls = ''
      if (active) {
        tag = 'YOU ARE HERE'
        label = 'CURRENT'
        cls = ' current'
      } else if (unlocked) {
        tag = 'UNLOCKED'
        label = `TRAVEL ${ICONS.arrow}`
        cls = ' travel'
      } else if (!affordable) {
        label = `${ICONS.lock} ${fmt(zone.cost)}`
      }
      return `<article class="zone-card${active ? ' active' : ''}${unlocked ? '' : ' locked'}">
        <div class="zone-art" style="background:linear-gradient(155deg, ${zone.sky[0]}, ${zone.sky[1]})">
          <span class="zone-tag">${tag}</span>
          <span class="zone-art-icon">${ICONS[zone.icon] || ICONS.flower}</span>
          <div><h3>${zone.name}</h3><p>${zone.tagline}</p></div>
        </div>
        <div class="zone-body">
          <div class="zone-boosts">
            <span class="boost-chip">${ICONS.drop} Flow <b>×${fmt(zone.prod)}</b></span>
            <span class="boost-chip">${ICONS.coin} Value <b>×${zone.value}</b></span>
            <span class="boost-chip">${ICONS.jar} Jar <b>×${zone.cap}</b></span>
          </div>
          <div class="zone-meta">
            <div class="zone-native">Native bee <b>${zone.nativeBee}</b>Jar: ${zone.jarName}</div>
            <button class="zone-btn${cls}" data-action="zone" data-id="${zone.id}" ${(!unlocked && !affordable) || active ? 'disabled' : ''}>${label}</button>
          </div>
        </div>
      </article>`
    }).join('')
    return `<div class="panel-intro">
      <p>Each island multiplies everything and brings its own <b>bees, jar and scenery</b>. Unlocked islands stay with you through rebirths.</p>
      <div class="mini-stat"><small>ZONES</small><strong>${Object.keys(state.unlocked).length} / ${ZONES.length}</strong></div>
    </div>
    <div class="zone-grid">${cards}</div>`
  }

  // ---------------------------------------------------------------- rebirth

  renderRebirth() {
    const state = this.state
    const gain = rebirthGain(state)
    const next = nextRebirthAt(state)
    const currentThreshold = gain * gain * REBIRTH_REQUIREMENT
    const progress = clamp01((state.runLifetime - currentThreshold) / Math.max(1, next - currentThreshold))
    const mult = rebirthMultiplier(state)
    const nextMult = 1 + (state.jelly + Math.max(1, gain)) * REBIRTH_BONUS
    const confirming = Date.now() < this.rebirthConfirmUntil
    const resetConfirming = Date.now() < this.resetConfirmUntil
    return `<div class="rebirth-hero">
      <div class="rebirth-top">
        <span class="jelly-orb">${ICONS.sparkle}</span>
        <div><h3>Royal Rebirth</h3><p>Melt the hive down to its royal core. Keep your islands, gain permanent jelly.</p></div>
        <div class="rebirth-jelly-count"><strong>${fmt(state.jelly)}</strong><span>royal jelly</span></div>
      </div>
      <div class="rebirth-multiplier"><span>PERMANENT HONEY FLOW</span><b>×${mult.toFixed(2)}</b></div>
    </div>
    <div class="progress-box">
      <div class="progress-head"><span>This run's stored honey</span><b>${fmt(state.runLifetime)} / ${fmt(next)}</b></div>
      <div class="progress-track"><i style="width:${(progress * 100).toFixed(1)}%"></i></div>
      <div class="progress-head" style="margin-top:6px"><span>Next jelly at ${fmt(next)}</span><span>+${REBIRTH_BONUS * 100}% flow each</span></div>
    </div>
    <div class="rebirth-gain">
      <span class="icon-wrap">${ICONS.sparkle}</span>
      <p>${gain >= 1 ? `Rebirth now for <strong>+${gain} royal jelly</strong>, lifting your flow to <strong>×${nextMult.toFixed(2)}</strong>.` : `Store <strong>${fmt(Math.max(0, next - state.runLifetime))} more honey</strong> this run to earn your first royal jelly.`}</p>
    </div>
    <button class="rebirth-btn${confirming ? ' confirm' : ''}" data-action="rebirth" ${gain < 1 ? 'disabled' : ''}>
      ${gain < 1 ? 'KEEP PRODUCING' : confirming ? 'TAP AGAIN TO REBIRTH' : `REBIRTH FOR +${gain} JELLY`}
    </button>
    <div class="rebirth-columns">
      <div class="rebirth-list"><b>${ICONS.arrow} RESETS</b><ul><li>Honey &amp; jar</li><li>Upgrades</li><li>Swarm</li><li>This run's total</li></ul></div>
      <div class="rebirth-list"><b>${ICONS.check} KEEPS</b><ul><li>Royal jelly</li><li>All unlocked zones</li><li>Current island</li><li>Sound &amp; save</li></ul></div>
    </div>
    <div class="help-note">Royal jelly is forever. Each one permanently adds <b>+${Math.round(REBIRTH_BONUS * 100)}% honey flow</b>, stacking with every upgrade and island.</div>
    <div class="danger-row"><button class="small-danger${resetConfirming ? ' confirm' : ''}" data-action="erase">${resetConfirming ? 'Tap again to erase your save' : 'Erase save'}</button></div>`
  }

  // ---------------------------------------------------------------- help

  renderHelp() {
    return `<div class="help-grid">
      <div class="help-step"><span class="step-num">1</span><div><b>Bees fill the jar</b><p>Your swarm makes honey automatically. It drizzles from the hive pipe straight into the giant jar.</p></div></div>
      <div class="help-step"><span class="step-num">2</span><div><b>Store a full jar</b><p>Tap the big STORE button — or the jar itself — to bank the honey. A full jar adds a +25% bonus.</p></div></div>
      <div class="help-step"><span class="step-num">3</span><div><b>Grow the hive</b><p>Spend honey on the upgrade tree, hire better bees, and unlock islands full of themed bees and jars.</p></div></div>
      <div class="help-step"><span class="step-num">4</span><div><b>Rebirth for royal jelly</b><p>Once you have stored enough in one run, rebirth to earn permanent royal jelly. Each jelly boosts everything by +20%.</p></div></div>
    </div>
    <div class="help-note">${ICONS.sparkle} <b>Little tips:</b> drag the island to peek around, tap the jar to store, and watch for the auto-pour upgrades in the tree — they collect full jars while you are away.</div>
    <button class="help-back" data-action="help-back">${ICONS.arrow} Back to the upgrade tree</button>`
  }

  // ---------------------------------------------------------------- effects

  showZoneFlash(zone) {
    this.el.zoneFlashName.textContent = zone.name
    this.el.zoneFlash.classList.remove('run')
    void this.el.zoneFlash.offsetWidth
    this.el.zoneFlash.classList.add('run')
  }

  showRebirthFlash() {
    this.el.rebirthFlash.classList.remove('run')
    void this.el.rebirthFlash.offsetWidth
    this.el.rebirthFlash.classList.add('run')
  }
}
