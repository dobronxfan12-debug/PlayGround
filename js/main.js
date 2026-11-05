/* THE LAST FOLD — bootstrap */
import { PaperWorld } from './world.js';
import { Game } from './game.js';

const boot = document.getElementById('boot');
const bootNote = boot?.querySelector('.boot-note');

async function waitForFonts() {
  if (!document.fonts?.ready) return;
  await Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1600)),
  ]);
}

function fail(message) {
  if (bootNote) bootNote.textContent = message;
  if (boot) boot.classList.remove('done');
  console.error(message);
}

async function start() {
  await waitForFonts();

  let world;
  try {
    world = new PaperWorld(document.getElementById('scene'));
  } catch (error) {
    fail('This browser could not fold the paper. Try a device with WebGL enabled.');
    console.error(error);
    return;
  }

  const game = new Game(world);
  window.__lastFold = game;

  try {
    await game.init();
  } catch (error) {
    fail('Something tore while folding the world. Reload the page to try again.');
    console.error(error);
    return;
  }

  game.start();

  // Let the opening print dry for a beat, then lift the boot sheet.
  requestAnimationFrame(() => {
    setTimeout(() => {
      boot?.classList.add('done');
      setTimeout(() => boot?.remove(), 900);
      document.body.dataset.ready = 'true';
    }, 480);
  });
}

start();
