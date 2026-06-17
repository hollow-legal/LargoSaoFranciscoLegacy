// Controles touch para dispositivos móveis.
export let touchMode = false;

const JOY_MAX = 52; // raio máximo do joystick em px

export function initTouch(player, spells, hud, onCast, onSpellSelect, onTalk) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  touchMode = true;

  injectStyles();
  const ui = buildUI();
  document.body.appendChild(ui);

  patchIntro(player);
  setupJoystick(player, ui);
  setupCamera(player, ui);
  setupButtons(player, spells, hud, ui, onCast, onSpellSelect, onTalk);
}

// ── Inicia o jogo ao tocar a tela inicial (sem pointer lock) ──────────────────
function patchIntro(player) {
  const intro = document.getElementById('intro');
  const startEl = intro.querySelector('.start');
  if (startEl) startEl.textContent = '— Toque para entrar nas Arcadas —';

  intro.addEventListener('touchstart', (e) => {
    e.preventDefault();
    intro.style.display = 'none';
    // dispara o mesmo evento customizado que main.js ouve
    document.dispatchEvent(new CustomEvent('touchstart-game'));
  }, { passive: false });
}

// ── Joystick ──────────────────────────────────────────────────────────────────
function setupJoystick(player, ui) {
  const zone = ui.querySelector('#joy-zone');
  const base = ui.querySelector('#joy-base');
  const knob = ui.querySelector('#joy-knob');

  let touchId = null;
  let cx = 0, cy = 0;

  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    touchId = t.identifier;
    const r = zone.getBoundingClientRect();
    cx = r.left + r.width * 0.5;
    cy = r.top + r.height * 0.75;
    base.style.left = (cx - r.left - 44) + 'px';
    base.style.top  = (cy - r.top  - 44) + 'px';
    base.style.opacity = '1';
    moveKnob(t.clientX, t.clientY);
  }, { passive: false });

  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) moveKnob(t.clientX, t.clientY);
    }
  }, { passive: false });

  zone.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) {
        touchId = null;
        knob.style.transform = 'translate(-50%,-50%)';
        base.style.opacity = '0.45';
        clearJoyKeys();
      }
    }
  }, { passive: false });

  function moveKnob(px, py) {
    let dx = px - cx, dy = py - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_MAX) { dx *= JOY_MAX / dist; dy *= JOY_MAX / dist; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const nx = dx / JOY_MAX, ny = dy / JOY_MAX;
    player.keys['KeyW'] = ny < -0.28;
    player.keys['KeyS'] = ny >  0.28;
    player.keys['KeyA'] = nx < -0.28;
    player.keys['KeyD'] = nx >  0.28;
    // correr se joystick empurrado até a borda
    player.keys['ShiftLeft'] = Math.hypot(nx, ny) > 0.82;
  }

  function clearJoyKeys() {
    for (const k of ['KeyW','KeyS','KeyA','KeyD','ShiftLeft']) delete player.keys[k];
  }
}

// ── Câmera (drag no lado direito) ─────────────────────────────────────────────
function setupCamera(player, ui) {
  const zone = ui.querySelector('#cam-zone');
  const pointers = new Map(); // id → {x,y}

  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      pointers.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  }, { passive: false });

  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const prev = pointers.get(t.identifier);
      if (!prev) continue;
      const dx = t.clientX - prev.x;
      const dy = t.clientY - prev.y;
      player.onMouseMove(dx * 18, dy * 18); // 18 ≈ equivalente à sensibilidade do mouse
      pointers.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  }, { passive: false });

  zone.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) pointers.delete(t.identifier);
  });
}

// ── Botões de ação ────────────────────────────────────────────────────────────
function setupButtons(player, spells, hud, ui, onCast, onSpellSelect, onTalk) {
  // Feitiços 1/2/3
  ui.querySelectorAll('.t-spell').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const i = parseInt(btn.dataset.i);
      spells.select(i);
      onSpellSelect(i);
      ui.querySelectorAll('.t-spell').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }, { passive: false });
  });

  // Lançar feitiço
  const castBtn = ui.querySelector('#t-cast');
  castBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onCast();
  }, { passive: false });

  // Pulo — mantém a tecla pressionada enquanto o dedo está no botão
  const jumpBtn = ui.querySelector('#t-jump');
  jumpBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    player.keys['Space'] = true;
  }, { passive: false });
  jumpBtn.addEventListener('touchend', () => { delete player.keys['Space']; });

  // Conversar
  const talkBtn = ui.querySelector('#t-talk');
  talkBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onTalk();
  }, { passive: false });
}

// ── DOM ───────────────────────────────────────────────────────────────────────
function buildUI() {
  const div = document.createElement('div');
  div.id = 'touch-overlay';
  div.innerHTML = `
    <div id="joy-zone">
      <div id="joy-base"><div id="joy-knob"></div></div>
    </div>
    <div id="cam-zone"></div>
    <div id="btn-zone">
      <div id="spell-row">
        <button class="t-spell active" data-i="0">1<br><small>Lumen</small></button>
        <button class="t-spell" data-i="1">2<br><small>Data V.</small></button>
        <button class="t-spell" data-i="2">3<br><small>Habeas</small></button>
      </div>
      <div id="action-row">
        <button id="t-talk">E</button>
        <button id="t-cast">⚡</button>
        <button id="t-jump">↑</button>
      </div>
    </div>
  `;
  return div;
}

function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #touch-overlay {
      position: fixed; inset: 0; z-index: 5;
      pointer-events: none;
      display: flex; align-items: stretch;
    }
    #joy-zone {
      pointer-events: all;
      position: relative;
      width: 44%; flex-shrink: 0;
    }
    #cam-zone {
      pointer-events: all;
      flex: 1;
    }
    #btn-zone {
      pointer-events: none;
      width: 44%; flex-shrink: 0;
      display: flex; flex-direction: column;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 0 14px 20px 0;
      gap: 10px;
    }
    #joy-base {
      position: absolute;
      width: 88px; height: 88px;
      border-radius: 50%;
      background: rgba(255,255,255,0.12);
      border: 2px solid rgba(255,255,255,0.35);
      opacity: 0.45;
      transition: opacity 0.15s;
      left: 50%; top: 60%;
      transform: translate(-50%, -50%);
    }
    #joy-knob {
      position: absolute;
      width: 42px; height: 42px;
      border-radius: 50%;
      background: rgba(232,196,90,0.75);
      border: 2px solid rgba(232,196,90,0.9);
      top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    #spell-row {
      pointer-events: all;
      display: flex; gap: 8px;
    }
    .t-spell {
      width: 58px; height: 58px;
      border-radius: 10px;
      background: rgba(10,8,20,0.75);
      border: 1.5px solid rgba(240,230,210,0.35);
      color: #f0e6d2; font-family: Georgia, serif;
      font-size: 13px; line-height: 1.2;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    .t-spell.active {
      border-color: #e8c45a;
      background: rgba(60,45,10,0.85);
      box-shadow: 0 0 10px rgba(232,196,90,0.5);
    }
    .t-spell small { font-size: 9px; opacity: 0.8; display: block; }
    #action-row {
      pointer-events: all;
      display: flex; gap: 12px; align-items: center;
    }
    #t-cast {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: rgba(139,26,26,0.8);
      border: 2px solid rgba(220,80,80,0.6);
      font-size: 26px; color: #fff;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
      box-shadow: 0 0 16px rgba(220,80,80,0.4);
    }
    #t-jump {
      width: 54px; height: 54px;
      border-radius: 50%;
      background: rgba(26,58,139,0.8);
      border: 2px solid rgba(80,120,220,0.6);
      font-size: 22px; color: #fff;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    #t-talk {
      width: 46px; height: 46px;
      border-radius: 50%;
      background: rgba(30,60,30,0.8);
      border: 2px solid rgba(80,180,80,0.6);
      font-size: 14px; color: #c8f0c8; font-family: Georgia, serif;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    /* Oculta controles de teclado no mobile */
    @media (pointer: coarse) {
      #spellbar { display: none !important; }
      #crosshair { display: none !important; }
    }
  `;
  document.head.appendChild(s);
}
