// Controles touch para dispositivos móveis.
// Usa um único listener no document para suportar multi-touch real —
// iOS Safari não despacha eventos para outros elementos DOM enquanto
// outro toque com preventDefault() está ativo.
export let touchMode = false;

const JOY_MAX  = 56;   // raio máximo do joystick em px
const CAM_SENS = 1.5;  // sensibilidade de rotação de câmera

export function initTouch(player, spells, hud, onCast, onSpellSelect, onTalk) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  touchMode = true;

  injectStyles();
  const ui = buildUI();
  document.body.appendChild(ui);

  patchIntro();
  setupAllTouches(player, spells, hud, ui, onCast, onSpellSelect, onTalk);
}

// ── Tela inicial ──────────────────────────────────────────────────────────────
function patchIntro() {
  const intro = document.getElementById('intro');
  const startEl = intro && intro.querySelector('.start');
  if (startEl) startEl.textContent = '— Toque para entrar nas Arcadas —';
}

// ── Controlador central de multi-touch ───────────────────────────────────────
function setupAllTouches(player, spells, hud, ui, onCast, onSpellSelect, onTalk) {
  const joyBase   = ui.querySelector('#joy-base');
  const joyKnob   = ui.querySelector('#joy-knob');
  const castBtn   = ui.querySelector('#t-cast');
  const jumpBtn   = ui.querySelector('#t-jump');
  const talkBtn   = ui.querySelector('#t-talk');
  const spellBtns = [...ui.querySelectorAll('.t-spell')];
  const hint      = ui.querySelector('#cam-hint');

  let joyId  = null;
  let joyOx  = 0, joyOy = 0;
  const camPointers  = new Map();  // id → {x,y}
  const jumpTouches  = new Set();  // ids ativos no botão de pulo
  let velX = 0, velY = 0, inertiaId = null;

  // ── Hit-test por coordenadas (independe do alvo DOM) ─────────────────────
  function hit(x, y, el) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function handleStart(t) {
    const x = t.clientX, y = t.clientY;

    // 1. Botões (prioridade máxima — verificados por coordenada)
    if (hit(x, y, castBtn)) { onCast(); return; }
    if (hit(x, y, jumpBtn)) { player.keys['Space'] = true; jumpTouches.add(t.identifier); return; }
    if (hit(x, y, talkBtn)) { onTalk(); return; }
    for (const btn of spellBtns) {
      if (hit(x, y, btn)) {
        const i = parseInt(btn.dataset.i);
        spells.select(i); onSpellSelect(i);
        spellBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        return;
      }
    }

    // 2. Lado esquerdo → joystick
    if (x < window.innerWidth * 0.44) {
      if (joyId !== null) return;
      joyId = t.identifier;
      joyOx = x; joyOy = y;
      const r = joyBase.parentElement.getBoundingClientRect();
      joyBase.style.left = (x - r.left - 44) + 'px';
      joyBase.style.top  = (y - r.top  - 44) + 'px';
      joyBase.style.opacity = '1';
      moveKnob(x, y);
      return;
    }

    // 3. Lado direito → câmera
    if (inertiaId) { cancelAnimationFrame(inertiaId); inertiaId = null; }
    velX = 0; velY = 0;
    camPointers.set(t.identifier, { x, y });
    if (hint) hint.style.display = 'none';
  }

  function handleMove(t) {
    const x = t.clientX, y = t.clientY;

    if (t.identifier === joyId) {
      moveKnob(x, y);
      return;
    }

    const prev = camPointers.get(t.identifier);
    if (prev) {
      const dx = x - prev.x, dy = y - prev.y;
      player.onMouseMove(dx * CAM_SENS, dy * CAM_SENS);
      velX = dx * CAM_SENS;
      velY = dy * CAM_SENS;
      camPointers.set(t.identifier, { x, y });
    }
  }

  function handleEnd(t) {
    if (t.identifier === joyId) {
      joyId = null;
      joyKnob.style.transform = 'translate(-50%,-50%)';
      joyBase.style.opacity = '0.45';
      clearJoyKeys();
      return;
    }
    if (jumpTouches.has(t.identifier)) {
      jumpTouches.delete(t.identifier);
      if (jumpTouches.size === 0) delete player.keys['Space'];
      return;
    }
    camPointers.delete(t.identifier);
    if (camPointers.size === 0 && (Math.abs(velX) > 0.4 || Math.abs(velY) > 0.4)) {
      startInertia();
    }
  }

  // ── Listener único no document ───────────────────────────────────────────
  document.addEventListener('touchstart', (e) => {
    e.preventDefault();

    // Tela inicial ainda visível → inicia o jogo
    const intro = document.getElementById('intro');
    if (intro && intro.style.display !== 'none') {
      intro.style.display = 'none';
      document.dispatchEvent(new CustomEvent('touchstart-game'));
      return;
    }

    for (const t of e.changedTouches) handleStart(t);
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) handleMove(t);
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) handleEnd(t);
  });

  document.addEventListener('touchcancel', (e) => {
    for (const t of e.changedTouches) handleEnd(t);
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function moveKnob(px, py) {
    let dx = px - joyOx, dy = py - joyOy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_MAX) { dx *= JOY_MAX / dist; dy *= JOY_MAX / dist; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / JOY_MAX, ny = dy / JOY_MAX;
    player.keys['KeyW'] = ny < -0.28;
    player.keys['KeyS'] = ny >  0.28;
    player.keys['KeyA'] = nx < -0.28;
    player.keys['KeyD'] = nx >  0.28;
    player.keys['ShiftLeft'] = Math.hypot(nx, ny) > 0.82;
  }

  function clearJoyKeys() {
    for (const k of ['KeyW','KeyS','KeyA','KeyD','ShiftLeft']) delete player.keys[k];
  }

  function startInertia() {
    const tick = () => {
      if (Math.abs(velX) < 0.08 && Math.abs(velY) < 0.08) { inertiaId = null; return; }
      player.onMouseMove(velX, velY);
      velX *= 0.84; velY *= 0.84;
      inertiaId = requestAnimationFrame(tick);
    };
    inertiaId = requestAnimationFrame(tick);
  }
}

// ── DOM ───────────────────────────────────────────────────────────────────────
function buildUI() {
  const div = document.createElement('div');
  div.id = 'touch-overlay';
  div.innerHTML = `
    <div id="joy-zone">
      <div id="joy-base"><div id="joy-knob"></div></div>
    </div>
    <div id="cam-zone">
      <div id="cam-hint">Arraste para girar a câmera</div>
    </div>
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
    /* Todos os elementos de UI não capturam eventos (o document-listener faz hit-test) */
    #touch-overlay {
      position: fixed; inset: 0; z-index: 5;
      pointer-events: none;
    }
    #joy-zone {
      position: absolute;
      left: 0; bottom: 0;
      width: 44%; height: 58%;
    }
    #cam-zone {
      position: absolute;
      right: 0; top: 0;
      width: 56%; height: 100%;
    }
    #btn-zone {
      position: absolute;
      right: 14px; bottom: 20px;
      display: flex; flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      z-index: 2;
    }
    #joy-base {
      position: absolute;
      width: 88px; height: 88px;
      border-radius: 50%;
      background: rgba(255,255,255,0.10);
      border: 2px solid rgba(255,255,255,0.35);
      opacity: 0.45;
      transition: opacity 0.12s;
      left: 50%; top: 60%;
      transform: translate(-50%, -50%);
    }
    #joy-knob {
      position: absolute;
      width: 44px; height: 44px;
      border-radius: 50%;
      background: rgba(232,196,90,0.8);
      border: 2px solid rgba(232,196,90,1);
      top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
    #cam-hint {
      position: absolute;
      bottom: 28%; left: 50%;
      transform: translateX(-50%);
      color: rgba(240,230,210,0.38);
      font-size: 11px; font-family: Georgia, serif;
      text-align: center; pointer-events: none;
      white-space: nowrap; letter-spacing: 0.5px;
      animation: cam-hint-fade 5s ease-out 1.5s both;
    }
    @keyframes cam-hint-fade { 0%,65% { opacity:1; } 100% { opacity:0; } }
    #spell-row { display: flex; gap: 8px; }
    .t-spell {
      width: 58px; height: 58px; border-radius: 10px;
      background: rgba(10,8,20,0.78);
      border: 1.5px solid rgba(240,230,210,0.35);
      color: #f0e6d2; font-family: Georgia, serif;
      font-size: 13px; line-height: 1.2;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    .t-spell.active {
      border-color: #e8c45a; background: rgba(60,45,10,0.88);
      box-shadow: 0 0 10px rgba(232,196,90,0.55);
    }
    .t-spell small { font-size: 9px; opacity: 0.8; display: block; }
    #action-row { display: flex; gap: 12px; align-items: center; }
    #t-cast {
      width: 74px; height: 74px; border-radius: 50%;
      background: rgba(139,26,26,0.85);
      border: 2px solid rgba(220,80,80,0.65);
      font-size: 28px; color: #fff;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
      box-shadow: 0 0 18px rgba(220,80,80,0.45);
    }
    #t-jump {
      width: 56px; height: 56px; border-radius: 50%;
      background: rgba(26,58,139,0.85);
      border: 2px solid rgba(80,120,220,0.65);
      font-size: 22px; color: #fff;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    #t-talk {
      width: 46px; height: 46px; border-radius: 50%;
      background: rgba(30,60,30,0.85);
      border: 2px solid rgba(80,180,80,0.65);
      font-size: 14px; color: #c8f0c8; font-family: Georgia, serif;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    @media (pointer: coarse) {
      #spellbar  { display: none !important; }
      #crosshair { display: none !important; }
    }
  `;
  document.head.appendChild(s);
}
