/* THE LAST FOLD — game orchestration, input, saves and UI */
import {
  LEVELS,
  WORLDS,
  SKINS,
  getLevel,
  worldForLevel,
  createInitialState,
  cloneState,
  foldPlan,
  findPath,
  key,
  collectStar,
  enemyCell,
  totalStars,
  isLevelUnlocked,
  nextLevelId,
  skinById,
  createDefaultSave,
  normalizeSave,
  levelEntryStars,
  inBounds,
  isWalkable,
} from './levels.js';
import { AudioEngine } from './audio.js';

const SAVE_KEY = 'the-last-fold.save.v1';
const TOTAL_POSSIBLE = LEVELS.length * 3;
const FOLD_COMMIT = 0.45;
const SCREEN_NAMES = ['menu', 'levels', 'skins', 'settings', 'game'];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeIcon(id, className = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.appendChild(use);
  return svg;
}

function setButtonIcon(button, id) {
  const use = button?.querySelector('use');
  if (use) use.setAttribute('href', `#${id}`);
}

function skinArtMarkup(skin) {
  const { body, accent, accent2, dark, eyes } = skin;
  const eyesMarkup = `<circle cx="39" cy="51" r="3.1" fill="${eyes}"/><circle cx="61" cy="51" r="3.1" fill="${eyes}"/>`;

  if (skin.kind === 'hare') {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="36" cy="25" rx="7" ry="24" fill="${accent}" transform="rotate(-9 36 25)"/>
      <ellipse cx="64" cy="25" rx="7" ry="24" fill="${accent}" transform="rotate(9 64 25)"/>
      <ellipse cx="36" cy="26" rx="3" ry="14" fill="${accent2}" transform="rotate(-9 36 26)"/>
      <ellipse cx="64" cy="26" rx="3" ry="14" fill="${accent2}" transform="rotate(9 64 26)"/>
      <path d="M20 60c0-15 13-24 30-24s30 9 30 24c0 15-13 24-30 24S20 75 20 60Z" fill="${body}" stroke="${dark}" stroke-width="2"/>
      ${eyesMarkup}
      <path d="M50 60l-4.5 4.5L50 68l4.5-3.5z" fill="${dark}"/>
    </svg>`;
  }
  if (skin.kind === 'crane') {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 50 17 33 9 48l35 19z" fill="${accent2}"/>
      <path d="M50 50 83 33l8 15-35 19z" fill="${accent2}"/>
      <path d="M23 64c0-14 12-23 27-23s27 9 27 23-12 20-27 20-27-6-27-20Z" fill="${body}" stroke="${dark}" stroke-width="2"/>
      <path d="M45 45 48 24 57 27 55 47z" fill="${body}" stroke="${dark}" stroke-width="2"/>
      <circle cx="55" cy="22" r="7" fill="${body}" stroke="${dark}" stroke-width="2"/>
      <path d="M61 20 75 25 61 29z" fill="${accent}"/>
      <circle cx="53" cy="21" r="2" fill="${eyes}"/>
      <path d="M50 53 42 66 50 76 58 66z" fill="${accent2}"/>
      <path d="M40 84h20" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }
  if (skin.kind === 'koi') {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M24 51c0-16 15-27 32-27 15 0 24 10 27 27-3 17-12 27-27 27-17 0-32-11-32-27Z" fill="${body}" stroke="${dark}" stroke-width="2"/>
      <path d="M23 51 4 29l8 22-8 22z" fill="${accent}"/>
      <path d="M48 30 38 12l-4 20z" fill="${accent2}"/>
      <path d="M48 72 38 90l-4-20z" fill="${accent2}"/>
      <path d="M57 38c9 0 15 5 15 13s-6 13-15 13-14-5-14-13 5-13 14-13Z" fill="${accent2}" opacity=".85"/>
      <circle cx="67" cy="46" r="3" fill="${eyes}"/>
      <path d="M83 51h10" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M27 33 11 17l9 33z" fill="${accent}"/>
    <path d="M73 33 89 17l-9 33z" fill="${accent}"/>
    <path d="M50 22 78 38 65 80 50 90 35 80 22 38z" fill="${body}" stroke="${dark}" stroke-width="2"/>
    <path d="M50 45 39 63 50 82 61 63z" fill="${accent2}"/>
    ${eyesMarkup}
    <path d="M50 67 45 72 50 76 55 72z" fill="${dark}"/>
    <path d="M19 56 6 66l17 4z" fill="${accent2}"/>
    <path d="M81 56 94 66l-17 4z" fill="${accent2}"/>
  </svg>`;
}

export class Game {
  constructor(world) {
    this.world = world;
    this.audio = new AudioEngine();
    this.canvas = world.canvas;

    this.save = null;
    this.screen = 'menu';
    this.levelId = null;
    this.def = null;
    this.theme = null;
    this.state = null;
    this.history = [];
    this.levelStarTotal = 0;
    this.levelActive = false;

    this.paused = false;
    this.won = false;
    this.caught = false;
    this.settingsFromGame = false;
    this.freezeUntil = 0;

    this.gesture = null;
    this.walk = null;
    this.anim = null;
    this.playerFacing = 0;

    this.worldTime = 0;
    this.lastFrame = 0;
    this.frame = 0;
    this.foldTravel = 90;
    this.toastTimer = 0;
    this.worldCardTimer = 0;
    this.winTimer = 0;
    this.hurtTimer = 0;
    this.gestureHintTimer = 0;

    this.dom = {
      boot: $('#boot'),
      hintText: $('#hint-text'),
      hintButton: $('#btn-hint'),
      foldMeter: $('#fold-meter'),
      foldMeterFill: $('#fold-meter-fill'),
      foldMeterText: $('#fold-meter-text'),
      gestureHint: $('#gesture-hint'),
      worldCard: $('#world-card'),
      worldCardChapter: $('#world-card-chapter'),
      worldCardName: $('#world-card-name'),
      worldCardTagline: $('#world-card-tagline'),
      toast: $('#toast'),
      hurtFlash: $('#hurt-flash'),
      pauseModal: $('#pause-modal'),
      winModal: $('#win-modal'),
      confirmModal: $('#confirm-modal'),
      levelWorlds: $('#level-worlds'),
      skinGrid: $('#skin-grid'),
      menuProgressChip: $('#menu-progress-chip'),
      levelsStarChip: $('#levels-star-chip'),
      skinsStarChip: $('#skins-star-chip'),
      menuLevelCount: $('#menu-level-count'),
      menuStarCount: $('#menu-star-count'),
      playSub: $('#btn-play-sub'),
      hudWorld: $('#hud-world'),
      hudLevel: $('#hud-level'),
      hudFolds: $('#hud-folds'),
      hudStars: $('#hud-stars'),
      menuSound: $('#menu-sound'),
      setSound: $('#set-sound'),
      setMotion: $('#set-motion'),
      qualityGroup: $('#set-quality'),
    };

    this.bindInput();
    this.bindUI();
    this.bindGlobal();
  }

  async init() {
    this.loadSave();
    this.audio.setMuted(!this.save.sound);
    this.world.setReducedMotion(this.save.reducedMotion);
    this.applyQuality();
    this.updateMenuContent();
    this.buildLevelCards();
    this.buildSkins();
    this.syncSettingsUI();
    this.syncSoundButtons();
    this.refreshMenuWorld();
    this.showScreen('menu');
    this.bindAudioUnlock();
  }

  start() {
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  /* ------------------------------------------------------------------ save */

  loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      this.save = normalizeSave(raw);
    } catch {
      this.save = createDefaultSave();
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      if (!rawHasKey()) this.save.reducedMotion = true;
    }
    function rawHasKey() {
      try {
        const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        return Boolean(raw && Object.prototype.hasOwnProperty.call(raw, 'reducedMotion'));
      } catch {
        return false;
      }
    }
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      /* private mode / storage denied — the game still works for this session */
    }
  }

  /* --------------------------------------------------------------- settings */

  applyQuality() {
    if (!this.save) return;
    let quality = this.save.quality;
    if (quality === 'auto') quality = this.detectLite() ? 'lite' : 'high';
    this.world.setQuality(quality);
    this.activeQuality = quality;
  }

  detectLite() {
    let info = '';
    try {
      info = (this.world.getRendererInfo() || '').toLowerCase();
    } catch {
      info = '';
    }
    const software = /swiftshader|llvmpipe|software|microsoft basic|angle \(.*swiftshader/.test(info);
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const small = Math.min(window.innerWidth, window.innerHeight) < 620;
    return software || cores <= 4 || memory <= 4 || (small && cores <= 6);
  }

  toggleSound(force) {
    const next = typeof force === 'boolean' ? force : !this.save.sound;
    if (next === this.save.sound) return;
    this.save.sound = next;
    this.persist();
    this.audio.init();
    this.audio.setMuted(!next);
    this.syncSoundButtons();
    if (next) this.audio.click();
  }

  syncSoundButtons() {
    const on = Boolean(this.save?.sound);
    if (this.dom.menuSound) {
      setButtonIcon(this.dom.menuSound, on ? 'i-sound' : 'i-mute');
      this.dom.menuSound.setAttribute('aria-label', on ? 'Mute sound' : 'Enable sound');
    }
    if (this.dom.setSound) {
      this.dom.setSound.classList.toggle('on', on);
      this.dom.setSound.setAttribute('aria-checked', String(on));
    }
  }

  syncSettingsUI() {
    if (!this.save) return;
    if (this.dom.setSound) {
      this.dom.setSound.classList.toggle('on', this.save.sound);
      this.dom.setSound.setAttribute('aria-checked', String(this.save.sound));
    }
    if (this.dom.setMotion) {
      this.dom.setMotion.classList.toggle('on', this.save.reducedMotion);
      this.dom.setMotion.setAttribute('aria-checked', String(this.save.reducedMotion));
    }
    if (this.dom.qualityGroup) {
      $$('button', this.dom.qualityGroup).forEach((button) => {
        button.classList.toggle('active', button.dataset.quality === this.save.quality);
      });
    }
  }

  setQualityChoice(choice) {
    if (!['auto', 'high', 'lite'].includes(choice)) return;
    this.save.quality = choice;
    this.persist();
    this.applyQuality();
    this.syncSettingsUI();
    this.audio.click();
    const label = choice === 'auto' ? 'Automatic' : choice === 'high' ? 'High' : 'Lite';
    this.showToast(`Graphics: ${label}`);
  }

  /* ---------------------------------------------------------------- screens */

  showScreen(name) {
    this.screen = name;
    SCREEN_NAMES.forEach((screenName) => {
      const element = document.getElementById(`screen-${screenName}`);
      if (element) element.classList.toggle('active', screenName === name);
    });
    document.body.dataset.screen = name;
    if (name !== 'game') {
      this.world.root.position.set(0, 0, 0);
    }
  }

  updateMenuContent() {
    if (!this.save) return;
    const stars = totalStars(this.save);
    const completed = LEVELS.filter((level) => this.save.levels[String(level.id)]?.complete).length;
    const playLevel = this.currentPlayLevel();
    const playTheme = worldForLevel(playLevel);

    if (this.dom.menuProgressChip) this.dom.menuProgressChip.innerHTML = `<svg class="icon"><use href="#i-star"></use></svg> ${stars} / ${TOTAL_POSSIBLE}`;
    if (this.dom.levelsStarChip) this.dom.levelsStarChip.innerHTML = `<svg class="icon"><use href="#i-star"></use></svg> ${stars} / ${TOTAL_POSSIBLE}`;
    if (this.dom.skinsStarChip) this.dom.skinsStarChip.innerHTML = `<svg class="icon"><use href="#i-star"></use></svg> ${stars} / ${TOTAL_POSSIBLE}`;
    if (this.dom.menuLevelCount) this.dom.menuLevelCount.textContent = `${completed} of ${LEVELS.length} pages folded`;
    if (this.dom.menuStarCount) this.dom.menuStarCount.textContent = `${stars} star${stars === 1 ? '' : 's'}`;
    if (this.dom.playSub) {
      this.dom.playSub.textContent = completed === LEVELS.length
        ? 'All pages folded · choose a page'
        : `Level ${playLevel.id} · ${playLevel.name} · ${playTheme.name}`;
    }
    this.syncSoundButtons();
  }

  currentPlayLevel() {
    const next = LEVELS.find((level) => {
      const entry = this.save.levels[String(level.id)];
      return !entry?.complete && isLevelUnlocked(this.save, level.id);
    });
    return next || LEVELS[LEVELS.length - 1];
  }

  refreshMenuWorld() {
    if (!this.save) return;
    const level = this.currentPlayLevel();
    const theme = worldForLevel(level);
    this.theme = theme;
    this.applyThemeToCss(theme);
    this.world.setReducedMotion(this.save.reducedMotion);
    this.world.buildMenu(theme, skinById(this.save.skin), this.save, level.id);
    this.audio.setWorld(theme.id);
  }

  applyThemeToCss(theme) {
    if (!theme) return;
    const p = theme.palette;
    const root = document.documentElement;
    root.style.setProperty('--sky-top', p.skyTop);
    root.style.setProperty('--sky-bottom', p.skyBottom);
    root.style.setProperty('--sky-deep', p.haze);
    root.style.setProperty('--accent', p.accent);
    root.style.setProperty('--accent-deep', p.accentDeep);
    root.style.setProperty('--accent-soft', p.accentSoft);
    root.style.setProperty('--gold', p.star);
    root.style.setProperty('--gold-soft', p.glow);
    document.body.dataset.theme = theme.id;
    document.body.classList.toggle('theme-dark', Boolean(theme.dark));
  }

  goMenu() {
    this.closeAllModals();
    this.paused = false;
    this.won = false;
    this.caught = false;
    this.settingsFromGame = false;
    this.levelActive = false;
    this.levelId = null;
    this.def = null;
    this.state = null;
    this.history = [];
    this.walk = null;
    this.anim = null;
    this.gesture = null;
    this.hideFoldMeter();
    this.hideGestureHint();
    this.updateMenuContent();
    this.refreshMenuWorld();
    this.showScreen('menu');
    this.audio.click();
  }

  openLevels() {
    this.audio.click();
    this.closeAllModals();
    if (this.screen === 'game') this.paused = true;
    this.updateMenuContent();
    this.buildLevelCards();
    this.showScreen('levels');
  }

  openSkins() {
    this.audio.click();
    this.settingsFromGame = false;
    this.buildSkins();
    this.showScreen('skins');
  }

  openSettings(fromGame = false) {
    this.audio.click();
    this.settingsFromGame = Boolean(fromGame);
    if (fromGame) {
      this.closeModal(this.dom.pauseModal);
      this.paused = true;
    }
    this.syncSettingsUI();
    this.showScreen('settings');
  }

  leaveSettings() {
    if (this.settingsFromGame) {
      this.settingsFromGame = false;
      this.showScreen('game');
      this.paused = false;
    } else {
      this.goMenu();
    }
    this.audio.click();
  }

  /* -------------------------------------------------------------- level list */

  buildLevelCards() {
    if (!this.dom.levelWorlds) return;
    this.dom.levelWorlds.replaceChildren();
    const current = this.currentPlayLevel();

    WORLDS.forEach((world, worldIndex) => {
      const block = document.createElement('section');
      block.className = 'world-block';

      const head = document.createElement('div');
      head.className = 'world-head';
      const num = document.createElement('span');
      num.className = 'world-num';
      num.textContent = world.chapter;
      num.style.borderColor = `${world.palette.accent}66`;
      num.style.color = world.palette.accentDeep;
      const title = document.createElement('h3');
      title.textContent = world.name;
      const tag = document.createElement('span');
      tag.className = 'world-tag';
      tag.textContent = world.blurb;
      head.append(num, title, tag);

      const grid = document.createElement('div');
      grid.className = 'level-grid';

      LEVELS.filter((level) => level.world === worldIndex).forEach((level) => {
        const entry = this.save.levels[String(level.id)];
        const unlocked = isLevelUnlocked(this.save, level.id);
        const stars = levelEntryStars(this.save, level.id);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'level-card';
        card.dataset.level = String(level.id);
        card.style.setProperty('--m-paper', world.palette.paper);
        card.style.setProperty('--m-floor', world.palette.tile);
        card.style.setProperty('--m-wall', world.palette.wall);
        card.style.setProperty('--m-goal', world.palette.star);
        card.style.setProperty('--m-star', world.palette.star);
        card.style.setProperty('--m-player', world.palette.accentDeep);
        if (entry?.complete) card.classList.add('completed');
        if (level.id === current.id) card.classList.add('current');
        if (!unlocked) card.classList.add('locked');
        card.setAttribute('aria-label', `${level.name}${unlocked ? '' : ' — locked'}`);

        const mini = document.createElement('div');
        mini.className = 'mini-grid';
        mini.style.gridTemplateColumns = `repeat(${level.grid[0].length}, 1fr)`;
        mini.style.aspectRatio = `${level.grid[0].length} / ${level.grid.length}`;
        level.grid.forEach((row) => {
          for (const ch of row) {
            const cell = document.createElement('span');
            cell.className = 'mini-cell';
            if (ch === '.') cell.classList.add('void');
            else {
              cell.classList.add('floor');
              if (ch === 'X') cell.classList.add('wall');
              else if (ch === 'G') cell.classList.add('goal');
              else if (ch === 'S') cell.classList.add('star');
              else if (ch === 'P') cell.classList.add('player');
            }
            mini.appendChild(cell);
          }
        });

        const foot = document.createElement('div');
        foot.className = 'level-card-foot';
        const names = document.createElement('div');
        const page = document.createElement('span');
        page.className = 'level-num';
        page.textContent = `PAGE ${String(level.id).padStart(2, '0')}`;
        const name = document.createElement('h4');
        name.textContent = level.name;
        names.append(page, name);

        const starRow = document.createElement('div');
        starRow.className = 'card-stars';
        for (let i = 0; i < 3; i += 1) {
          const icon = makeIcon('i-star');
          if (i < stars) icon.classList.add('on');
          starRow.appendChild(icon);
        }
        foot.append(names, starRow);
        card.append(mini, foot);

        if (!unlocked) {
          const badge = document.createElement('span');
          badge.className = 'lock-badge';
          badge.appendChild(makeIcon('i-lock'));
          card.appendChild(badge);
        } else if (entry?.complete) {
          const badge = document.createElement('span');
          badge.className = 'check-badge';
          badge.appendChild(makeIcon('i-check'));
          card.appendChild(badge);
        }

        card.addEventListener('click', () => {
          if (!isLevelUnlocked(this.save, level.id)) {
            this.audio.error();
            this.showToast('Finish the previous page to unlock this one.');
            return;
          }
          this.startLevel(level.id);
        });

        grid.appendChild(card);
      });

      block.append(head, grid);
      this.dom.levelWorlds.appendChild(block);
    });
  }

  /* ------------------------------------------------------------------ skins */

  buildSkins() {
    if (!this.dom.skinGrid) return;
    this.dom.skinGrid.replaceChildren();
    const stars = totalStars(this.save);
    const selected = this.save.skin;

    SKINS.forEach((skin) => {
      const unlocked = stars >= skin.unlock;
      const isSelected = selected === skin.id;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'skin-card';
      if (isSelected) card.classList.add('selected');
      if (!unlocked) card.classList.add('locked');
      card.setAttribute('aria-label', `${skin.name}${unlocked ? '' : ` — unlock at ${skin.unlock} stars`}`);

      const art = document.createElement('div');
      art.className = 'skin-art';
      art.style.setProperty('--skin-sky', `${skin.accentSoft}66`);
      art.innerHTML = skinArtMarkup(skin);

      const name = document.createElement('h4');
      name.textContent = skin.name;
      const desc = document.createElement('p');
      desc.textContent = skin.description;

      const unlock = document.createElement('span');
      unlock.className = 'skin-unlock';
      if (unlocked && isSelected) {
        unlock.classList.add('skin-selected-tag');
        unlock.appendChild(makeIcon('i-check'));
        unlock.append('Selected');
      } else if (unlocked) {
        unlock.append('Ready to fold');
      } else {
        unlock.appendChild(makeIcon('i-star'));
        unlock.append(`Unlock at ${skin.unlock} stars`);
      }

      card.append(art, name, desc, unlock);

      if (!unlocked) {
        const lock = document.createElement('span');
        lock.className = 'skin-lock';
        lock.appendChild(makeIcon('i-lock'));
        card.appendChild(lock);
      }

      card.addEventListener('click', () => {
        if (stars < skin.unlock) {
          this.audio.error();
          this.showToast(`Reach ${skin.unlock} stars to fold the ${skin.name}.`);
          return;
        }
        this.save.skin = skin.id;
        this.persist();
        this.audio.click();
        this.buildSkins();
        this.refreshMenuWorld();
        this.showToast(`${skin.name} selected.`);
      });

      this.dom.skinGrid.appendChild(card);
    });
  }

  /* --------------------------------------------------------------- gameplay */

  startLevel(id, { intro = true, keepRun = false, animateEntry = true } = {}) {
    const def = getLevel(id);
    if (!def) return;
    if (!isLevelUnlocked(this.save, id)) {
      this.showToast('Finish the previous page to unlock this one.');
      return;
    }

    clearTimeout(this.winTimer);
    clearTimeout(this.hurtTimer);
    clearTimeout(this.worldCardTimer);
    this.closeAllModals();

    this.levelId = id;
    this.def = def;
    this.theme = worldForLevel(def);
    this.state = createInitialState(def);
    this.levelStarTotal = this.state.stars.size;
    this.history = [];
    this.walk = null;
    this.anim = null;
    this.gesture = null;
    this.won = false;
    this.caught = false;
    this.paused = false;
    this.levelActive = true;
    this.settingsFromGame = false;
    this.freezeUntil = 0;

    this.applyThemeToCss(this.theme);
    this.audio.setWorld(this.theme.id);
    this.world.setReducedMotion(this.save.reducedMotion);
    this.applyQuality();
    this.world.buildLevel(this.state, def, skinById(this.save.skin), this.theme, { animateEntry });
    this.showScreen('game');

    if (!keepRun) {
      this.save.totalRuns = (this.save.totalRuns || 0) + 1;
      this.persist();
    }

    if (this.dom.hudWorld) this.dom.hudWorld.textContent = this.theme.name;
    if (this.dom.hudLevel) this.dom.hudLevel.textContent = def.name;
    this.setHint(def.intro || def.hint);
    this.updateHUD();
    this.hideFoldMeter();
    this.hideGestureHint();
    this.dom.hurtFlash?.classList.remove('on');
    this.dom.worldCard?.classList.remove('show');

    if (def.tutorial) this.showGestureHint('Swipe from the fox across the gap');

    const firstVisit = !this.save.seenWorlds.includes(this.theme.id);
    if (intro && firstVisit) {
      this.save.seenWorlds.push(this.theme.id);
      this.persist();
      this.showWorldCard(this.theme);
    }

    this.audio.whoosh();
  }

  restartLevel() {
    if (!this.levelId) return;
    this.startLevel(this.levelId, { intro: false, keepRun: true, animateEntry: true });
    this.showToast('A fresh page.');
  }

  rebuildLevel(animateEntry = false) {
    if (!this.def || !this.state) return;
    this.world.buildLevel(this.state, this.def, skinById(this.save.skin), this.theme, { animateEntry });
    this.walk = null;
    this.anim = null;
    this.gesture = null;
    this.hideFoldMeter();
  }

  updateHUD() {
    if (!this.state) return;
    if (this.dom.hudFolds) this.dom.hudFolds.textContent = String(this.state.folds);
    if (this.dom.hudStars) {
      const collected = Math.max(0, this.levelStarTotal - this.state.stars.size);
      this.dom.hudStars.textContent = `${collected}/${this.levelStarTotal}`;
    }
    const undo = $('#btn-undo');
    if (undo) undo.disabled = this.history.length === 0;
  }

  setHint(text) {
    if (this.dom.hintText) this.dom.hintText.textContent = text;
  }

  showGestureHint(text) {
    if (!this.dom.gestureHint) return;
    this.dom.gestureHint.classList.add('show');
    const span = this.dom.gestureHint.querySelector('span');
    if (span && text) span.textContent = text;
    clearTimeout(this.gestureHintTimer);
    this.gestureHintTimer = setTimeout(() => this.hideGestureHint(), 9000);
  }

  hideGestureHint() {
    clearTimeout(this.gestureHintTimer);
    this.dom.gestureHint?.classList.remove('show');
  }

  showWorldCard(theme) {
    if (!this.dom.worldCard) return;
    this.dom.worldCardChapter.textContent = `Chapter ${theme.chapter}`;
    this.dom.worldCardName.textContent = theme.name;
    this.dom.worldCardTagline.textContent = theme.tagline;
    this.dom.worldCard.classList.toggle('on-dark', Boolean(theme.dark));
    this.dom.worldCard.classList.add('show');
    this.freezeUntil = performance.now() + 1350;
    clearTimeout(this.worldCardTimer);
    this.worldCardTimer = setTimeout(() => this.dom.worldCard.classList.remove('show'), 2300);
  }

  /* ------------------------------------------------------------------- input */

  bindInput() {
    const onDown = (event) => this.pointerDown(event);
    const onMove = (event) => this.pointerMove(event);
    const onUp = (event) => this.pointerUp(event, false);
    const onCancel = (event) => this.pointerUp(event, true);

    this.canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  canInteract() {
    return Boolean(
      this.screen === 'game'
      && this.levelActive
      && this.state
      && !this.paused
      && !this.won
      && !this.caught
      && !this.anim
      && !this.modalOpen()
      && performance.now() >= this.freezeUntil
    );
  }

  modalOpen() {
    return Boolean(document.querySelector('.overlay.open'));
  }

  pointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!this.canInteract() || this.gesture) return;
    const ground = this.world.screenToGround(event.clientX, event.clientY);
    if (!ground) return;

    this.freezeUntil = Math.max(this.freezeUntil, 0);
    this.ensureAudio();

    this.gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      cell: ground.cell,
      startPoint: ground.point,
      dist: 0,
      fold: null,
      reason: null,
      progress: 0,
      moved: false,
      armed: false,
    };

    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      /* some browsers refuse capture for synthetic pointers */
    }
    if (event.cancelable) event.preventDefault();
  }

  pointerMove(event) {
    const g = this.gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    const dist = Math.hypot(dx, dy);
    g.dist = dist;
    if (dist > 6) g.moved = true;

    if (!g.fold) {
      if (dist >= 12) {
        const info = this.planFoldFromDrag(g.cell, dx, dy);
        if (info.plan.ok) {
          g.fold = info;
          this.world.beginFold(info.plan, this.state, info.axis, info.k, info.side);
          this.audio.foldStart();
          this.hideGestureHint();
          this.showFoldMeter();
          if (navigator.vibrate) navigator.vibrate(8);
          this.setFoldProgress(dist);
        } else {
          g.reason = info.plan.reason || info.reason || 'invalid';
        }
      }
    } else {
      this.setFoldProgress(dist);
    }

    if (event.cancelable) event.preventDefault();
  }

  pointerUp(event, cancelled) {
    const g = this.gesture;
    if (!g || event.pointerId !== g.pointerId) return;
    this.gesture = null;
    try {
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    if (g.fold) {
      this.hideFoldMeter();
      if (!cancelled && g.progress >= FOLD_COMMIT) {
        this.anim = {
          kind: 'fold',
          info: g.fold,
          from: g.progress,
          to: 1,
          t: 0,
          duration: 0.1 + (1 - g.progress) * 0.16,
        };
        if (navigator.vibrate) navigator.vibrate(16);
      } else {
        this.anim = {
          kind: 'cancel',
          info: g.fold,
          from: g.progress,
          to: 0,
          t: 0,
          duration: 0.08 + g.progress * 0.1,
        };
      }
      return;
    }

    const elapsed = performance.now() - g.startTime;
    if (!cancelled && g.dist < 10 && elapsed < 650) {
      this.tapCell(g.cell);
      return;
    }

    if (!cancelled && g.reason) {
      this.audio.error();
      this.showToast(this.foldErrorText(g.reason));
    }
  }

  planFoldFromDrag(cell, dx, dy) {
    if (!this.state) return { plan: { ok: false, reason: 'not-playing' } };
    if (!inBounds(this.state, cell.x, cell.z)) return { plan: { ok: false, reason: 'outside' } };

    const horizontal = Math.abs(dx) >= Math.abs(dy);
    let axis;
    let side;
    let k;
    if (horizontal) {
      axis = 'x';
      if (dx >= 0) {
        side = -1;
        k = cell.x + 1;
      } else {
        side = 1;
        k = cell.x;
      }
    } else {
      axis = 'z';
      if (dy >= 0) {
        side = -1;
        k = cell.z + 1;
      } else {
        side = 1;
        k = cell.z;
      }
    }

    const plan = foldPlan(this.state, axis, k, side);
    return { axis, side, k, plan };
  }

  setFoldProgress(distance) {
    const g = this.gesture;
    if (!g?.fold) return;
    const p = clamp((distance - 12) / this.foldTravel, 0, 1);
    if (Math.abs(p - g.progress) < 0.003 && p !== 0 && p !== 1) return;
    g.progress = p;
    this.world.setFoldProgress(p, g.fold.axis, g.fold.side);
    if (this.dom.foldMeterFill) this.dom.foldMeterFill.style.width = `${Math.round(p * 100)}%`;
    if (this.dom.foldMeterText) {
      this.dom.foldMeterText.textContent = p >= FOLD_COMMIT ? 'release to fold the page' : 'keep dragging to fold';
    }
    if (p >= FOLD_COMMIT && !g.armed) {
      g.armed = true;
      this.audio.crease();
      if (navigator.vibrate) navigator.vibrate(6);
    }
  }

  showFoldMeter() {
    this.dom.foldMeter?.classList.add('show');
    if (this.dom.foldMeterFill) this.dom.foldMeterFill.style.width = '0%';
    if (this.dom.foldMeterText) this.dom.foldMeterText.textContent = 'keep dragging to fold';
  }

  hideFoldMeter() {
    this.dom.foldMeter?.classList.remove('show');
    if (this.dom.foldMeterFill) this.dom.foldMeterFill.style.width = '0%';
  }

  foldErrorText(reason) {
    if (reason === 'too-wide') return 'That page is wider than the one beneath it.';
    if (reason === 'empty') return 'There is no paper on that side to fold.';
    if (reason === 'player-drops') return 'That fold would drop your soul into the void.';
    if (reason === 'goal-drops') return 'The glowing exit would be lost in that fold.';
    if (reason === 'bad-crease') return 'The crease needs a little more paper on each side.';
    if (reason === 'outside') return 'Start your swipe on the paper.';
    return 'That fold does not work yet.';
  }

  tapCell(cell) {
    if (!this.state || this.walk) return;
    if (!inBounds(this.state, cell.x, cell.z)) return;
    if (cell.x === this.state.player.x && cell.z === this.state.player.z) return;
    if (!isWalkable(this.state, cell.x, cell.z)) {
      this.audio.error();
      this.showToast('There is no folded paper there yet.');
      return;
    }
    const path = findPath(this.state, this.state.player, cell);
    if (!path || !path.length) {
      this.audio.error();
      this.showToast('No paper path reaches that page yet.');
      return;
    }
    this.audio.click();
    this.beginWalk(path);
    this.hideGestureHint();
  }

  beginWalk(path) {
    const first = path[0];
    this.walk = {
      path: path.slice(),
      cell: null,
      from: { x: this.world.player.position.x, z: this.world.player.position.z },
      to: { x: this.world.worldX(first.x), z: this.world.worldZ(first.z) },
      t: 0,
      duration: 0.145,
    };
    this.startNextStep(this.walk);
  }

  startNextStep(walk) {
    const cell = walk.path.shift();
    if (!cell) {
      this.walk = null;
      return;
    }
    walk.cell = cell;
    walk.from = { x: this.world.player.position.x, z: this.world.player.position.z };
    walk.to = { x: this.world.worldX(cell.x), z: this.world.worldZ(cell.z) };
    walk.t = 0;
    walk.duration = 0.13 + (this.save.reducedMotion ? 0 : 0.015);
    this.playerFacing = Math.atan2(walk.to.x - walk.from.x, walk.to.z - walk.from.z);
    this.world.player.rotation.y = this.playerFacing;
    this.audio.step();
  }

  updateWalking(dt) {
    const walk = this.walk;
    if (!walk) return;
    walk.t += dt;
    const t = clamp(walk.t / walk.duration, 0, 1);
    const e = easeInOutCubic(t);
    const x = lerp(walk.from.x, walk.to.x, e);
    const z = lerp(walk.from.z, walk.to.z, e);
    const hop = this.save.reducedMotion ? 0 : Math.sin(Math.PI * t) * 0.16;
    this.world.player.position.set(x, 0.07 + hop, z);

    if (t < 1) return;

    this.world.player.position.set(walk.to.x, 0.07, walk.to.z);
    this.state.player = { x: walk.cell.x, z: walk.cell.z };
    this.state.moves += 1;
    this.handleArrival(walk.cell);

    if (this.walk !== walk) return;
    if (walk.path.length) this.startNextStep(walk);
    else this.walk = null;
  }

  handleArrival(cell) {
    const starKey = key(cell.x, cell.z);
    if (collectStar(this.state, cell.x, cell.z)) {
      this.audio.star();
      this.world.updateStarCollection(starKey);
      this.world.burst(cell.x, cell.z, this.theme.palette.star, 18, 0.5);
      if (navigator.vibrate) navigator.vibrate(14);
      this.showToast('Golden star found.');
      this.updateHUD();
    }

    if (this.state.player.x === this.state.goal.x && this.state.player.z === this.state.goal.z) {
      this.winLevel();
      return;
    }
    this.checkCollision();
  }

  updateEnemies(dt) {
    if (!this.state || this.won || this.caught) return;
    let changed = false;
    for (const enemy of this.state.enemies) {
      if (!enemy.route || enemy.route.length < 2) continue;
      const stepTime = 0.92 / Math.max(0.4, enemy.speed || 1);
      enemy.timer = (enemy.timer || 0) + dt;
      let guard = 0;
      while (enemy.timer >= stepTime && guard < 3) {
        enemy.timer -= stepTime;
        let next = enemy.idx + enemy.dir;
        if (next >= enemy.route.length || next < 0) {
          enemy.dir *= -1;
          next = enemy.idx + enemy.dir;
        }
        if (next >= 0 && next < enemy.route.length) {
          enemy.idx = next;
          changed = true;
        }
        guard += 1;
      }
    }
    if (changed) this.world.updateEnemyTargets(this.state);
    this.checkCollision();
  }

  checkCollision() {
    if (!this.state || this.won || this.caught) return;
    for (const enemy of this.state.enemies) {
      const cell = enemyCell(enemy);
      if (cell && cell.x === this.state.player.x && cell.z === this.state.player.z) {
        this.caughtByInk();
        return;
      }
    }
  }

  caughtByInk() {
    if (this.caught || this.won) return;
    this.caught = true;
    this.walk = null;
    this.anim = null;
    this.gesture = null;
    this.hideFoldMeter();
    this.audio.caught();
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
    const cell = this.state.player;
    this.world.burst(cell.x, cell.z, this.theme.palette.ink, 20, 0.35);
    this.dom.hurtFlash?.classList.add('on');
    clearTimeout(this.hurtTimer);
    this.hurtTimer = setTimeout(() => this.dom.hurtFlash?.classList.remove('on'), 360);
    this.showToast('The ink shade caught you. The page resets.', 1500);
    const levelId = this.levelId;
    this.winTimer = setTimeout(() => {
      if (this.screen === 'game' && this.levelId === levelId) {
        this.startLevel(levelId, { intro: false, keepRun: true, animateEntry: true });
      }
    }, 1000);
  }

  updateAnimations(dt) {
    const anim = this.anim;
    if (!anim) return;
    anim.t += dt;
    const t = clamp(anim.t / anim.duration, 0, 1);
    const value = lerp(anim.from, anim.to, easeInOutCubic(t));
    this.world.setFoldProgress(value, anim.info.axis, anim.info.side);

    if (t < 1) return;
    this.anim = null;
    if (anim.kind === 'fold') {
      this.applyFold(anim.info);
    } else {
      this.world.cancelFoldProgress();
      this.world.endFold(true);
      this.audio.crease();
    }
  }

  applyFold(info) {
    if (!this.state) return;
    this.history.push(cloneState(this.state));
    if (this.history.length > 40) this.history.shift();
    this.state = info.plan.state;
    this.world.endFold(false);
    this.rebuildLevel(false);

    if (info.plan.collectedStar) {
      const cell = this.state.player;
      this.audio.star();
      this.world.burst(cell.x, cell.z, this.theme.palette.star, 22, 0.52);
      this.showToast('Golden star found.');
      if (navigator.vibrate) navigator.vibrate(14);
    }

    this.audio.foldComplete();
    this.updateHUD();

    if (this.state.player.x === this.state.goal.x && this.state.player.z === this.state.goal.z) {
      this.winLevel();
      return;
    }
    this.checkCollision();
  }

  undoFold() {
    if (!this.levelActive || this.anim || this.caught) return;
    if (!this.history.length) {
      this.audio.error();
      this.showToast('No folds to undo yet.');
      return;
    }
    this.state = this.history.pop();
    this.walk = null;
    this.rebuildLevel(false);
    this.updateHUD();
    this.audio.crease();
    this.showToast('Fold undone.');
  }

  /* -------------------------------------------------------------------- win */

  winLevel() {
    if (this.won || !this.state || !this.def) return;
    this.won = true;
    this.walk = null;
    this.anim = null;
    this.gesture = null;
    this.hideFoldMeter();
    this.hideGestureHint();

    const golden = this.state.stars.size === 0;
    const grace = this.state.folds <= this.def.par;
    const collected = Math.max(0, this.levelStarTotal - this.state.stars.size);
    const earned = 1 + (golden ? 1 : 0) + (grace ? 1 : 0);

    const starsBefore = totalStars(this.save);
    const saveKey = String(this.def.id);
    const previous = this.save.levels[saveKey] || {};
    this.save.levels[saveKey] = {
      complete: true,
      golden: Boolean(previous.golden || golden),
      grace: Boolean(previous.grace || grace),
      bestFolds: Math.min(previous.bestFolds ?? this.state.folds, this.state.folds),
      bestStars: Math.max(previous.bestStars || 0, earned),
      lastFolds: this.state.folds,
    };
    this.persist();
    const starsAfter = totalStars(this.save);
    const newlyUnlocked = SKINS.filter((skin) => starsBefore < skin.unlock && starsAfter >= skin.unlock);

    this.updateMenuContent();
    this.buildLevelCards();
    this.buildSkins();

    this.audio.win();
    this.world.winBurst(this.state.goal.x, this.state.goal.z, this.theme);
    if (navigator.vibrate) navigator.vibrate([18, 40, 22]);

    if (newlyUnlocked.length) {
      this.audio.unlock();
      const names = newlyUnlocked.map((skin) => skin.name).join(' and ');
      setTimeout(() => this.showToast(`${names} unlocked in Skins.`, 2400), 1700);
    }

    const levelId = this.levelId;
    clearTimeout(this.winTimer);
    this.winTimer = setTimeout(() => {
      if (this.won && this.levelId === levelId) {
        this.openWinModal(collected, golden, grace);
      }
    }, 560);
  }

  openWinModal(collected, golden, grace) {
    const world = this.theme;
    const lastLevel = this.def.id === LEVELS[LEVELS.length - 1].id;
    const eyebrow = $('#win-eyebrow');
    const title = $('#win-title');
    const stats = $('#win-stats');
    const quote = $('#win-quote');
    const nextButton = $('#btn-next');
    const next = nextLevelId(this.def.id);

    if (eyebrow) eyebrow.textContent = `Chapter ${world.chapter} · ${world.name}`;
    if (title) title.textContent = lastLevel ? 'The last fold.' : 'Folded.';
    if (stats) {
      stats.textContent = `${this.state.folds} fold${this.state.folds === 1 ? '' : 's'} · ${collected} golden star${collected === 1 ? '' : 's'}${grace ? ' · light fold' : ''}`;
    }
    if (quote) {
      quote.textContent = lastLevel
        ? 'The last page is folded. Somewhere beyond it, the world unfolds again.'
        : world.tagline;
    }
    if (nextButton) {
      nextButton.textContent = next ? 'Next page' : 'Return to the atlas';
      nextButton.dataset.next = next ? String(next) : '';
    }

    $$('#win-stars .win-star').forEach((element) => {
      const kind = element.dataset.star;
      const earned = kind === 'complete' || (kind === 'golden' && golden) || (kind === 'grace' && grace);
      element.classList.toggle('earned', Boolean(earned));
    });

    this.openModal(this.dom.winModal);
  }

  /* ---------------------------------------------------------------- modals */

  openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  closeAllModals() {
    [this.dom.pauseModal, this.dom.winModal, this.dom.confirmModal].forEach((modal) => this.closeModal(modal));
  }

  openPause() {
    if (this.screen !== 'game' || this.won || this.caught) return;
    this.paused = true;
    this.openModal(this.dom.pauseModal);
    this.audio.click();
  }

  resumeGame() {
    this.closeModal(this.dom.pauseModal);
    this.paused = false;
  }

  /* ------------------------------------------------------------------ toast */

  showToast(text, duration = 1900) {
    if (!this.dom.toast) return;
    this.dom.toast.textContent = text;
    this.dom.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.dom.toast.classList.remove('show'), duration);
  }

  /* ------------------------------------------------------------------- loop */

  tick(now) {
    this.frame = requestAnimationFrame((next) => this.tick(next));
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    if (this.screen === 'game') {
      const frozen = this.paused;
      const worldDt = frozen ? 0 : dt;
      if (!frozen) this.worldTime += dt;
      if (!frozen) {
        if (this.anim) {
          this.updateAnimations(dt);
        } else if (!this.won && !this.caught) {
          this.updateWalking(dt);
          if (!this.won && !this.caught && !this.anim) this.updateEnemies(dt);
        }
      }
      this.world.update(worldDt, this.worldTime);
    } else {
      this.worldTime += dt;
      this.world.update(dt, this.worldTime);
    }
    this.world.render();
  }

  /* -------------------------------------------------------------- bind UI */

  bindUI() {
    $('#btn-play')?.addEventListener('click', () => {
      if (!this.save) return;
      const allDone = LEVELS.every((level) => this.save.levels[String(level.id)]?.complete);
      if (allDone) this.openLevels();
      else this.startLevel(this.currentPlayLevel().id);
    });
    $('#btn-levels')?.addEventListener('click', () => this.openLevels());
    $('#btn-skins')?.addEventListener('click', () => this.openSkins());
    $('#btn-settings')?.addEventListener('click', () => this.openSettings(false));
    this.dom.menuSound?.addEventListener('click', () => this.toggleSound());

    $('#btn-exit')?.addEventListener('click', () => this.openLevels());
    $('#btn-undo')?.addEventListener('click', () => this.undoFold());
    $('#btn-restart')?.addEventListener('click', () => this.restartLevel());
    $('#btn-pause')?.addEventListener('click', () => this.openPause());
    this.dom.hintButton?.addEventListener('click', () => {
      if (!this.def) return;
      this.audio.click();
      this.setHint(this.def.hint);
    });

    this.dom.setSound?.addEventListener('click', () => this.toggleSound());
    this.dom.setMotion?.addEventListener('click', () => {
      this.save.reducedMotion = !this.save.reducedMotion;
      this.persist();
      this.world.setReducedMotion(this.save.reducedMotion);
      this.syncSettingsUI();
      this.audio.click();
      this.showToast(this.save.reducedMotion ? 'Gentle motion on.' : 'Gentle motion off.');
    });
    this.dom.qualityGroup?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-quality]');
      if (button) this.setQualityChoice(button.dataset.quality);
    });

    $('#btn-reset')?.addEventListener('click', () => {
      this.audio.click();
      this.openModal(this.dom.confirmModal);
    });
    $('#btn-cancel-reset')?.addEventListener('click', () => {
      this.closeModal(this.dom.confirmModal);
      this.audio.click();
    });
    $('#btn-confirm-reset')?.addEventListener('click', () => this.resetProgress());

    $('#btn-resume')?.addEventListener('click', () => this.resumeGame());
    $('#btn-pause-restart')?.addEventListener('click', () => {
      this.closeModal(this.dom.pauseModal);
      this.paused = false;
      this.restartLevel();
    });
    $('#btn-pause-levels')?.addEventListener('click', () => {
      this.closeModal(this.dom.pauseModal);
      this.openLevels();
    });
    $('#btn-pause-settings')?.addEventListener('click', () => this.openSettings(true));

    $('#btn-next')?.addEventListener('click', () => {
      const next = $('#btn-next')?.dataset.next;
      this.closeModal(this.dom.winModal);
      if (next) this.startLevel(Number(next), { intro: false, keepRun: true, animateEntry: true });
      else this.openLevels();
    });
    $('#btn-replay')?.addEventListener('click', () => {
      this.closeModal(this.dom.winModal);
      this.startLevel(this.levelId, { intro: false, keepRun: true, animateEntry: true });
    });
    $('#btn-win-levels')?.addEventListener('click', () => {
      this.closeModal(this.dom.winModal);
      this.openLevels();
    });

    $$('[data-go]').forEach((button) => {
      button.addEventListener('click', () => {
        if (this.screen === 'settings' && this.settingsFromGame) this.leaveSettings();
        else this.goMenu();
      });
    });
  }

  resetProgress() {
    this.save = createDefaultSave();
    this.persist();
    this.closeAllModals();
    this.settingsFromGame = false;
    this.paused = false;
    this.won = false;
    this.caught = false;
    this.levelId = null;
    this.levelActive = false;
    this.state = null;
    this.history = [];
    this.audio.setMuted(!this.save.sound);
    this.world.setReducedMotion(this.save.reducedMotion);
    this.syncSoundButtons();
    this.syncSettingsUI();
    this.updateMenuContent();
    this.buildLevelCards();
    this.buildSkins();
    this.refreshMenuWorld();
    this.showScreen('menu');
    this.audio.click();
    this.showToast('The paper is blank again. A new story begins.');
  }

  /* -------------------------------------------------------------- globals */

  bindGlobal() {
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.world.resize();
        this.foldTravel = Math.max(70, Math.min(150, Math.min(window.innerWidth, window.innerHeight) * 0.22));
      }, 90);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const open = document.querySelector('.overlay.open');
        if (open === this.dom.pauseModal) this.resumeGame();
        else if (!open) {
          if (this.screen === 'settings') this.leaveSettings();
          else if (this.screen === 'game') this.openPause();
          else if (this.screen === 'levels' || this.screen === 'skins') this.goMenu();
        }
      }
      if (event.key === 'r' && (event.metaKey || event.ctrlKey) && this.screen === 'game') {
        event.preventDefault();
        this.restartLevel();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'game' && !this.paused && !this.won && !this.caught) {
        this.openPause();
      }
    });

    this.foldTravel = Math.max(70, Math.min(150, Math.min(window.innerWidth, window.innerHeight) * 0.22));
  }

  bindAudioUnlock() {
    const unlock = () => {
      this.ensureAudio();
      this.audio.setWorld(this.theme?.id || 'forest');
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  ensureAudio() {
    this.audio.init();
    this.audio.setMuted(!this.save.sound);
  }
}
