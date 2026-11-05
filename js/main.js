// ---------------------------------------------------------------------------
// THE LAST FOLD — app shell, save game and touch interface
// ---------------------------------------------------------------------------
import { FoldGame } from './game.js';
import { SoundStudio } from './audio.js';
import { LEVELS } from './levels.js';
import { THEMES, PALETTES, SKINS, skinById } from './themes.js';

const SAVE_KEY = 'lastfold_save_v1';
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const DEFAULT_SAVE = {
  unlocked: 0,
  best: {},
  skin: 'pip',
  palette: 'morning',
  settings: { sfx: true, music: true, haptics: true, reduced: false },
  seenFold: false,
};

function loadSave () {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_SAVE);
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...raw,
      best: { ...(raw.best || {}) },
      settings: { ...DEFAULT_SAVE.settings, ...(raw.settings || {}) },
    };
  } catch (e) {
    return structuredClone(DEFAULT_SAVE);
  }
}

let save = loadSave();
let sound;
let game;
let currentLevel = Math.min(save.unlocked, LEVELS.length - 1);
let currentOverlay = null;
let settingsReturn = 'menu';
let howtoReturn = null;
let toastTimer = 0;
let tutorialTimer = 0;
let gaugeTimer = 0;
let overlayReturn = null;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const starsTotal = () => Object.values(save.best).reduce((n, v) => n + (Number(v) || 0), 0);
const pad2 = n => String(n + 1).padStart(2, '0');
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function saveNow () {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

function vibrate (kind) {
  if (!save.settings.haptics || !navigator.vibrate) return;
  const patterns = { tap: 8, star: [12, 40, 18], hit: [18, 30, 18], complete: [14, 50, 14, 50, 26] };
  navigator.vibrate(patterns[kind] || 10);
}

function toast (text, duration = 2200) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

function showPrimary (name) {
  const screen = $(`#screen-${name}`);
  $$('.screen[data-screen]').forEach(s => {
    if (s.classList.contains('modal-screen') || s.classList.contains('overlay-screen')) return;
    s.classList.toggle('is-active', s === screen);
  });
  if (screen) screen.setAttribute('aria-hidden', 'false');
}

function openOverlay (name) {
  $$('.overlay-screen, .modal-screen').forEach(el => {
    el.classList.toggle('is-active', el.dataset.screen === name);
    el.setAttribute('aria-hidden', el.dataset.screen === name ? 'false' : 'true');
  });
  currentOverlay = name;
}

function closeOverlays () {
  $$('.overlay-screen, .modal-screen').forEach(el => {
    el.classList.remove('is-active');
    el.setAttribute('aria-hidden', 'true');
  });
  currentOverlay = null;
}

function anySettingsOn () {
  return save.settings.sfx || save.settings.music;
}

// ---------------------------------------------------------------------------
// menu / level select / skins
// ---------------------------------------------------------------------------
function refreshTotals () {
  const total = starsTotal();
  for (const id of ['#menu-stars', '#levels-stars', '#skins-stars']) {
    const el = $(id);
    if (el) el.textContent = total;
  }
}

function refreshMenu () {
  currentLevel = Math.min(Math.max(0, save.unlocked), LEVELS.length - 1);
  const level = LEVELS[currentLevel];
  const theme = THEMES[level.theme];
  $('#continue-label').textContent = `Level ${currentLevel + 1} · ${level.name}`;
  $('#menu-chapter').textContent = theme.chapter;
  $('#menu-world').textContent = level.chapter;
  document.querySelector('#btn-play .btn-main').textContent =
    save.unlocked === 0 && !Object.keys(save.best).length ? 'Play' : 'Continue';
  refreshTotals();
}

const LEVEL_MARKS = { forest: '❧', frost: '❄', city: '⌂', sky: '☁', cosmic: '✧' };

function levelCard (index) {
  const level = LEVELS[index];
  const theme = THEMES[level.theme];
  const best = save.best[index] || 0;
  const locked = index > save.unlocked;
  const current = index === currentLevel && !locked;
  const stars = best ? `<span class="lc-star">${'✦'.repeat(best)}</span>` : '';
  const lock = locked
    ? `<span class="lc-lock"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>`
    : '';
  return `<button class="level-card${locked ? ' locked' : ''}${current ? ' current' : ''}" data-level="${index}" style="--card-tint:${theme.paper};--card-ink:${theme.accent}" ${locked ? 'disabled aria-disabled="true"' : ''} aria-label="Level ${index + 1}: ${level.name}${locked ? ' (locked)' : ''}">
    <span class="lc-mark" aria-hidden="true">${LEVEL_MARKS[level.theme] || '✦'}</span>
    <span class="lc-num">${pad2(index)}</span>
    <span class="lc-name">${level.name}</span>
    ${stars}${lock}<span class="lc-fold"></span>
  </button>`;
}

function buildLevels () {
  const wrap = $('#levels-list');
  const chapters = [...new Set(LEVELS.map(l => l.chapter))];
  wrap.innerHTML = chapters.map(chapter => {
    const rows = LEVELS.map((l, i) => ({ l, i })).filter(x => x.l.chapter === chapter);
    return `<section class="chapter-block">
      <div class="chapter-title"><h3>${chapter}</h3><span>${rows.length} fold${rows.length > 1 ? 's' : ''}</span><i></i></div>
      <div class="level-grid">${rows.map(x => levelCard(x.i)).join('')}</div>
    </section>`;
  }).join('');
  refreshTotals();
}

function foxSvg (skin) {
  const { a, b, c, d } = skin.svg;
  return `<svg viewBox="0 0 64 64" role="img" aria-label="Paper fox">
    <path d="M7 26 17 6l15 13 15-13 10 20-9 34H16Z" fill="${a}"/>
    <path d="M17 6l15 13-10 11Z" fill="${b}"/>
    <path d="M47 6 32 19l10 11Z" fill="${b}" opacity=".8"/>
    <path d="M17 27h30L32 47Z" fill="${c}"/>
    <path d="M17 27h30l-5 9H22Z" fill="${b}" opacity=".55"/>
    <path d="M23 29l3 4-3 3-3-3zM41 29l3 4-3 3-3-3z" fill="${skin.eye}"/>
    <path d="M29 39h6l-3 4Z" fill="${d}"/>
    <path d="M14 53h36l-6 7H20Z" fill="${d}" opacity=".85"/>
  </svg>`;
}

function buildSkins () {
  const total = starsTotal();
  const grid = $('#skin-grid');
  grid.innerHTML = SKINS.map(skin => {
    const owned = total >= skin.cost;
    const selected = save.skin === skin.id;
    const cost = !owned ? `<span class="skin-cost">✦ ${skin.cost} stars</span>` : `<span class="skin-cost">${selected ? 'worn' : 'ready'}</span>`;
    return `<button class="skin-card${selected ? ' selected' : ''}${owned ? '' : ' locked'}" data-skin="${skin.id}" aria-label="${skin.name}${owned ? '' : `, needs ${skin.cost} stars`}">
      <span class="skin-avatar">${foxSvg(skin)}</span>
      <span class="skin-name">${skin.name}</span>
      ${cost}
    </button>`;
  }).join('');

  const paletteNote = $('#palette-note');
  paletteNote.textContent = `${total} star${total === 1 ? '' : 's'} gathered`;
  $('#palette-grid').innerHTML = PALETTES.map(p => {
    const owned = total >= p.cost;
    const selected = save.palette === p.id;
    return `<button class="palette-card${selected ? ' selected' : ''}${owned ? '' : ' locked'}" data-palette="${p.id}" aria-label="${p.name}${owned ? '' : `, needs ${p.cost} stars`}">
      <span class="palette-swatch" style="background:${p.swatch}"></span>
      <span>${p.name}</span>
      <span class="skin-cost">${owned ? (selected ? 'in use' : p.note) : `✦ ${p.cost}`}</span>
    </button>`;
  }).join('');
  refreshTotals();
}

function applyPalette () {
  const p = PALETTES.find(x => x.id === save.palette) || PALETTES[0];
  $('#scene').style.filter = p.css === 'none' ? '' : p.css;
}

function selectSkin (id) {
  const skin = skinById(id);
  if (starsTotal() < skin.cost) {
    toast(`Collect ${skin.cost} star${skin.cost === 1 ? '' : 's'} to wake ${skin.name}.`);
    sound.error();
    return;
  }
  save.skin = id;
  saveNow();
  game.setSkin(id);
  buildSkins();
  sound.click();
  toast(`${skin.name} wears the fold.`, 1600);
  vibrate('tap');
}

function selectPalette (id) {
  const p = PALETTES.find(x => x.id === id);
  if (!p) return;
  if (starsTotal() < p.cost) {
    toast(`Collect ${p.cost} stars to unlock ${p.name}.`);
    sound.error();
    return;
  }
  save.palette = id;
  saveNow();
  applyPalette();
  buildSkins();
  sound.click();
  toast(`${p.name} ink.`, 1500);
}

// ---------------------------------------------------------------------------
// settings
// ---------------------------------------------------------------------------
function refreshSettings () {
  $$('[data-toggle]').forEach(btn => {
    btn.classList.toggle('on', !!save.settings[btn.dataset.toggle]);
    btn.setAttribute('aria-pressed', save.settings[btn.dataset.toggle] ? 'true' : 'false');
  });
  document.body.classList.toggle('muted', !anySettingsOn());
  sound.setSettings(save.settings);
  game.setReducedMotion(save.settings.reduced);
}

function toggleSetting (key) {
  save.settings[key] = !save.settings[key];
  if (key === 'sfx' || key === 'music') sound.unlock();
  saveNow();
  refreshSettings();
  sound.click();
  vibrate('tap');
}

function toggleSound () {
  const on = anySettingsOn();
  save.settings.sfx = !on;
  save.settings.music = !on;
  saveNow();
  refreshSettings();
  if (!on) sound.unlock();
  sound.click();
}

// ---------------------------------------------------------------------------
// game flow
// ---------------------------------------------------------------------------
function startLevel (index) {
  index = Math.max(0, Math.min(LEVELS.length - 1, index));
  if (index > save.unlocked) {
    toast('Finish the folds before this one.');
    sound.error();
    return;
  }
  currentLevel = index;
  sound.unlock();
  closeOverlays();
  showPrimary('game');
  $('#tutorial-banner').classList.remove('show');
  $('#fold-gauge').classList.remove('show');
  $('#crease-cancel').classList.remove('show');
  game.startLevel(index);
  vibrate('tap');
}

function pauseGame () {
  if (game.mode !== 'game' || game.completed || game.paused) return;
  game.pause();
  openOverlay('pause');
  sound.click();
}

function resumeGame () {
  closeOverlays();
  game.resume();
  sound.click();
}

function restartLevel () {
  if (!game.level) return;
  const index = game.levelIndex;
  closeOverlays();
  showPrimary('game');
  game.startLevel(index);
  sound.click();
}

function quitToMenu () {
  closeOverlays();
  game.returnToMenu();
  showPrimary('menu');
  currentLevel = Math.min(save.unlocked, LEVELS.length - 1);
  refreshMenu();
  buildLevels();
  buildSkins();
  sound.setMood('forest');
  sound.click();
}

function nextLevel () {
  if (game.levelIndex >= LEVELS.length - 1) {
    quitToMenu();
    return;
  }
  startLevel(game.levelIndex + 1);
}

function finishLevel (stats) {
  const i = stats.index;
  const previous = save.best[i] || 0;
  save.best[i] = Math.max(previous, stats.stars);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length - 1, i + 1));
  save.seenFold = true;
  saveNow();
  refreshMenu();
  buildLevels();
  buildSkins();
  refreshTotals();

  const level = LEVELS[i];
  $('#complete-eyebrow').textContent = i === LEVELS.length - 1 ? 'The last fold holds' : 'The fold holds';
  $('#complete-time').textContent = fmtTime(stats.time);
  $('#complete-folds').textContent = stats.folds;
  $('#complete-star-count').textContent = `${stats.stars}/${stats.total}`;
  $('#complete-quote').textContent = level.quote || 'Every ending is just another fold.';
  const slots = Math.max(1, stats.total);
  $('#complete-stars').innerHTML = Array.from({ length: slots }, (_, n) =>
    `<i class="${n < stats.stars ? 'lit' : ''}" style="animation-delay:${0.25 + n * 0.13}s">${n < stats.stars ? '★' : '☆'}</i>`
  ).join('');
  $('#btn-next').textContent = i >= LEVELS.length - 1 ? 'Back to menu' : 'Next fold';
  $('#btn-next').disabled = false;

  openOverlay('complete');
  sound.setMood(level.theme);
  vibrate('complete');
}

function openLevels () {
  buildLevels();
  openOverlay('levels');
  sound.click();
}

function openSkins () {
  buildSkins();
  openOverlay('skins');
  sound.click();
}

function openSettings (from = 'menu') {
  settingsReturn = from;
  refreshSettings();
  openOverlay('settings');
  sound.click();
}

function backFromSettings () {
  if (settingsReturn === 'pause') {
    openOverlay('pause');
    sound.click();
  } else {
    closeOverlays();
    sound.click();
  }
}

function openHowto () {
  howtoReturn = currentOverlay;
  openOverlay('howto');
  sound.click();
}

function closeHowto () {
  if (howtoReturn) openOverlay(howtoReturn);
  else closeOverlays();
  sound.click();
}

function resetProgress () {
  const ok = window.confirm('Reset every fold, star and unlocked paper soul?');
  if (!ok) return;
  const settings = { ...save.settings };
  save = { ...structuredClone(DEFAULT_SAVE), settings };
  saveNow();
  applyPalette();
  game.setSkin('pip');
  refreshSettings();
  refreshMenu();
  buildLevels();
  buildSkins();
  toast('Fresh paper. Nothing folded yet.', 2400);
  sound.click();
}

// ---------------------------------------------------------------------------
// game events -> HUD
// ---------------------------------------------------------------------------
function setHud (data) {
  const stars = data.stars || 0;
  const total = data.total || 0;
  const num = $('#hud-stars');
  num.textContent = stars;
  const small = num.parentElement.querySelector('small');
  if (small) small.textContent = `/ ${total}`;
  const chip = num.parentElement;
  chip.classList.remove('bump');
  void chip.offsetWidth;
  chip.classList.add('bump');
}

function setGauge (angle) {
  const a = Math.max(0, Math.min(180, angle || 0));
  $('#gauge-angle').textContent = `${Math.round(a)}°`;
  $('#gauge-fill').style.width = `${(a / 180) * 100}%`;
  $('#gauge-hint').textContent = a < 8 ? 'Drag up to fold · release to set' : 'Release near 45 · 90 · 180';
}

function showTutorial (title, text, duration = 6400) {
  $('#tut-title').textContent = title;
  $('#tut-text').textContent = text;
  $('#tutorial-banner').classList.add('show');
  clearTimeout(tutorialTimer);
  tutorialTimer = setTimeout(() => $('#tutorial-banner').classList.remove('show'), duration);
}

function wireGameEvents () {
  game.on('levelstart', ({ index, level, totalStars }) => {
    currentLevel = index;
    $('#hud-level-num').textContent = pad2(index);
    $('#hud-level-name').textContent = level.name;
    $('#hud-chapter').textContent = level.chapter;
    setHud({ stars: 0, total: totalStars });
    $('#fold-legend').classList.remove('hide');
    $('#crease-cancel').classList.remove('show');
    $('#fold-gauge').classList.remove('show');
    $('#tutorial-banner').classList.remove('show');
    showPrimary('game');
  });

  game.on('hud', setHud);
  game.on('tutorial', ({ title, text }) => showTutorial(title, text));
  game.on('toast', ({ text, duration }) => toast(text, duration || 2200));
  game.on('haptic', kind => vibrate(kind === 'star' ? 'star' : kind));

  game.on('crease', () => {
    $('#crease-cancel').classList.add('show');
    $('#fold-legend').classList.add('hide');
  });
  game.on('creaseclear', () => $('#crease-cancel').classList.remove('show'));

  game.on('foldstart', ({ angle }) => {
    $('#crease-cancel').classList.remove('show');
    $('#fold-legend').classList.add('hide');
    clearTimeout(gaugeTimer);
    $('#fold-gauge').classList.add('show');
    setGauge(angle || 0);
  });
  game.on('folddrag', ({ angle }) => {
    clearTimeout(gaugeTimer);
    $('#fold-gauge').classList.add('show');
    setGauge(angle);
  });
  game.on('foldchange', ({ angle }) => {
    if (game.fold) setGauge(angle);
  });
  game.on('foldend', ({ angle }) => {
    setGauge(angle);
    clearTimeout(gaugeTimer);
    gaugeTimer = setTimeout(() => $('#fold-gauge').classList.remove('show'), 950);
  });
  game.on('trapped', ({ message }) => {
    toast(message || 'Trapped in the fold — restarting', 2000);
    $('#fold-gauge').classList.remove('show');
  });
  game.on('levelcomplete', finishLevel);
}

// ---------------------------------------------------------------------------
// joystick
// ---------------------------------------------------------------------------
function wireJoystick () {
  const stick = $('#joystick');
  const knob = $('#joy-knob');
  let active = false;
  let id = null;
  let cx = 0, cy = 0;
  const radius = 41;

  const begin = e => {
    if (game.mode !== 'game' || game.paused) return;
    active = true;
    id = e.pointerId;
    const rect = stick.getBoundingClientRect();
    cx = rect.left + rect.width / 2;
    cy = rect.top + rect.height / 2;
    stick.setPointerCapture?.(e.pointerId);
    move(e);
    e.preventDefault();
  };
  const move = e => {
    if (!active || (id !== null && e.pointerId !== id)) return;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const mag = Math.hypot(dx, dy);
    if (mag > radius) { dx = (dx / mag) * radius; dy = (dy / mag) * radius; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.setJoystick(dx / radius, -dy / radius, true);
    e.preventDefault();
  };
  const end = e => {
    if (id !== null && e.pointerId !== id) return;
    active = false;
    id = null;
    knob.style.transform = '';
    game.setJoystick(0, 0, false);
  };

  stick.addEventListener('pointerdown', begin);
  stick.addEventListener('pointermove', move);
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);
  stick.addEventListener('lostpointercapture', end);
}

// ---------------------------------------------------------------------------
// global UI actions
// ---------------------------------------------------------------------------
function handleAction (action) {
  switch (action) {
    case 'play': startLevel(currentLevel); break;
    case 'open-levels': openLevels(); break;
    case 'open-skins': openSkins(); break;
    case 'open-settings': openSettings('menu'); break;
    case 'open-settings-inpause': openSettings('pause'); break;
    case 'back-menu':
      if (currentOverlay === 'settings') backFromSettings();
      else {
        closeOverlays();
        if (game.mode === 'menu') refreshMenu();
        sound.click();
      }
      break;
    case 'toggle-sound': toggleSound(); break;
    case 'pause': pauseGame(); break;
    case 'resume': resumeGame(); break;
    case 'restart': restartLevel(); break;
    case 'quit-menu': quitToMenu(); break;
    case 'replay': startLevel(game.levelIndex); break;
    case 'next': nextLevel(); break;
    case 'hint': if (game.mode === 'game' && !game.paused) game.nextHint(); break;
    case 'clear-crease': game.clearCrease(); break;
    case 'how-to': openHowto(); break;
    case 'close-howto': closeHowto(); break;
    case 'reset-progress': resetProgress(); break;
    default: break;
  }
}

function wireUi () {
  document.addEventListener('click', e => {
    const levelCardEl = e.target.closest('[data-level]');
    if (levelCardEl) {
      const index = Number(levelCardEl.dataset.level);
      if (index <= save.unlocked) startLevel(index);
      else toast('This fold is still hidden.');
      return;
    }
    const skinEl = e.target.closest('[data-skin]');
    if (skinEl) { selectSkin(skinEl.dataset.skin); return; }
    const paletteEl = e.target.closest('[data-palette]');
    if (paletteEl) { selectPalette(paletteEl.dataset.palette); return; }
    const toggleEl = e.target.closest('[data-toggle]');
    if (toggleEl) { toggleSetting(toggleEl.dataset.toggle); return; }
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      vibrate('tap');
      handleAction(actionEl.dataset.action);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (currentOverlay === 'howto') closeHowto();
      else if (currentOverlay === 'settings') backFromSettings();
      else if (currentOverlay === 'levels' || currentOverlay === 'skins') closeOverlays();
      else if (currentOverlay === 'pause') resumeGame();
      else if (game.mode === 'game' && !game.completed) {
        if (game.paused) resumeGame(); else pauseGame();
      }
    }
    if (e.key === 'Enter' && currentOverlay === null) {
      if (game.mode === 'menu') startLevel(currentLevel);
    }
  });

  const unlockOnce = () => {
    sound.unlock();
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce);
  window.addEventListener('keydown', unlockOnce);

  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.mode === 'game' && !game.paused && !game.completed) pauseGame();
  });
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------
function boot () {
  sound = new SoundStudio(save.settings);
  game = new FoldGame($('#scene'), sound, {
    skin: save.skin,
    reducedMotion: save.settings.reduced,
  });

  applyPalette();
  wireUi();
  wireJoystick();
  wireGameEvents();
  refreshSettings();
  refreshMenu();
  buildLevels();
  buildSkins();
  sound.setMood('forest');
  showPrimary('menu');

  // expose a small, deliberately boring debug surface for automated checks
  window.__lastfold = {
    game,
    sound,
    get save () { return save; },
    LEVELS,
    THEMES,
    SKINS,
    PALETTES,
    startLevel,
    finishLevel,
    starsTotal,
    saveNow,
    get ui () { return { currentOverlay, currentLevel, toast }; },
  };

  const loading = $('#loading');
  const finish = () => {
    loading.classList.add('done');
    setTimeout(() => { loading.style.display = 'none'; }, 700);
  };
  const fonts = document.fonts?.ready || Promise.resolve();
  Promise.race([fonts, new Promise(resolve => setTimeout(resolve, 900))]).then(finish);
}

boot();
