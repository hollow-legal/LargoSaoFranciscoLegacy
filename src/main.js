// Arcadas Arcanas — Largo São Francisco Legacy
// Ponto de entrada: cena, ciclo dia/noite, loop do jogo e estado geral.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { SpellSystem, SPELLS } from './spells.js';
import { spawnAutos, spawnFolhas, spawnEstudantes } from './entities.js';
import { HUD } from './hud.js';
import { initTouch, touchMode } from './touch.js';

// ---------- Setup básico ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9bb8d4, 60, 220);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Iluminação e céu ----------
const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x6b5d48, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffefd0, 1.4);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -110;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 320;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(0, 0, -30); // centro do mapa (pátio + largo)

// estrelas (visíveis à noite)
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 400; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 150 + Math.random() * 100;
  const y = 40 + Math.random() * 160;
  starPos.push(Math.cos(a) * r, y, Math.sin(a) * r - 30);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0 }));
scene.add(stars);

// ---------- Mundo e entidades ----------
const world = buildWorld(scene);
const player = new Player(scene, camera);
const spells = new SpellSystem(scene);
const hud = new HUD();
const autos = spawnAutos(scene);
const folhas = spawnFolhas(scene);
const estudantes = spawnEstudantes(scene);

const state = {
  started: false,
  won: false,
  folhas: 0,
  autosArquivados: 0,
};

// ---------- Modo debug ----------
const params = new URLSearchParams(location.search);
const autoMode = params.has('auto');
const timeOffset = (parseFloat(params.get('hora')) || 0) * 240;
if (autoMode) {
  state.started = true;
  document.getElementById('intro').style.display = 'none';
  if (params.has('x')) player.position.x = parseFloat(params.get('x'));
  if (params.has('z')) player.position.z = parseFloat(params.get('z'));
  if (params.has('yaw')) player.yaw = parseFloat(params.get('yaw'));
  if (params.has('pitch')) player.pitch = parseFloat(params.get('pitch'));
}

// ---------- Callbacks de feitiço (compartilhados com touch) ----------
function doCast() {
  if (!spells.cast(player)) {
    hud.message('<small>Mana insuficiente...</small>', 1200);
  }
}
function doSpellSelect(i) { hud.setSpell(i); }

// ---------- Touch controls (mobile) ----------
initTouch(player, spells, hud, doCast, doSpellSelect, () => {
  if (nearestNPC) hud.message(nearestNPC.fala, 4000);
});

// Inicia o jogo ao tocar a tela (mobile sem pointer lock)
document.addEventListener('touchstart-game', () => {
  if (!state.started) {
    state.started = true;
    hud.message('Recolha as <b>Folhas do Códice</b> e arquive os <b>Autos Malditos</b>!', 5000);
  }
});

// ---------- Controles de teclado/mouse ----------
const intro = document.getElementById('intro');
intro.addEventListener('click', () => {
  document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === document.body;
  intro.style.display = locked ? 'none' : 'flex';
  if (locked && !state.started) {
    state.started = true;
    hud.message('Recolha as <b>Folhas do Códice</b> e arquive os <b>Autos Malditos</b>!', 5000);
  }
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === document.body) {
    player.onMouseMove(e.movementX, e.movementY);
  }
});

document.addEventListener('keydown', (e) => {
  player.keys[e.code] = true;
  if (e.code === 'Digit1') { spells.select(0); hud.setSpell(0); }
  if (e.code === 'Digit2') { spells.select(1); hud.setSpell(1); }
  if (e.code === 'Digit3') { spells.select(2); hud.setSpell(2); }
  if (e.code === 'KeyE' && nearestNPC) {
    hud.message(nearestNPC.fala, 4000);
  }
});
document.addEventListener('keyup', (e) => { player.keys[e.code] = false; });

document.addEventListener('mousedown', (e) => {
  if ((document.pointerLockElement !== document.body && !autoMode) || e.button !== 0) return;
  doCast();
});

// ---------- Ciclo dia/noite (um dia = 4 minutos) ----------
const DAY_LENGTH = 240;
const skyDay = new THREE.Color(0x9bb8d4);
const skyDusk = new THREE.Color(0xd98a4a);
const skyNight = new THREE.Color(0x0a0a1e);
const tmpColor = new THREE.Color();

function updateDayNight(elapsed) {
  const t = (elapsed / DAY_LENGTH) % 1;
  const ang = t * Math.PI * 2;
  const sunH = Math.sin(ang);
  sun.position.set(Math.cos(ang) * 80, sunH * 80, 30);
  sun.intensity = Math.max(0, sunH) * 2.4;
  hemi.intensity = 0.32 + Math.max(0, sunH) * 0.75;

  if (sunH > 0.25) tmpColor.copy(skyDay);
  else if (sunH > -0.15) {
    const k = (sunH + 0.15) / 0.4;
    tmpColor.copy(skyNight).lerp(skyDusk, k).lerp(skyDay, Math.max(0, k - 0.5) * 2);
  } else tmpColor.copy(skyNight);
  scene.background = tmpColor;
  scene.fog.color.copy(tmpColor);

  const night = sunH < 0.05;
  stars.material.opacity = night ? Math.min(1, (0.05 - sunH) * 4) : 0;
  for (const l of world.nightLights) l.intensity = night ? 2.4 : 0;
  for (const m of world.lampMats) m.emissive.setHex(night ? 0xffd070 : 0x000000);
}

// ---------- Vitória / derrota ----------
function checkWin() {
  if (!state.won && state.folhas >= folhas.length && state.autosArquivados >= autos.length) {
    state.won = true;
    hud.message(
      '🎓 <b>Aprovado(a) com louvor!</b><br/><small>O Códice está completo e os autos, arquivados.<br/>As Arcadas Arcanas estão em paz. <i>Dura lex, sed lex.</i></small>',
      0
    );
  }
}

// ---------- Loop principal ----------
let nearestNPC = null;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  updateDayNight(elapsed + timeOffset);
  world.waterMat.opacity = 0.75 + Math.sin(elapsed * 2) * 0.08;

  if (!state.started) {
    const a = elapsed * 0.1;
    camera.position.set(Math.cos(a) * 26, 14, Math.sin(a) * 26);
    camera.lookAt(0, 3, 0);
    renderer.render(scene, camera);
    return;
  }

  player.update(dt, world.fountainZone);

  for (const auto of autos) {
    const touched = auto.update(dt, player.position);
    if (touched && player.takeDamage(12)) {
      hud.message('<small>Você foi <b>citado</b> por um Auto Maldito! (-12)</small>', 1500);
    }
    if (player.shielded && auto.alive) {
      const d = auto.group.position.clone().sub(player.position);
      d.y = 0;
      if (d.length() < 3.5) {
        d.normalize();
        auto.group.position.addScaledVector(d, 8 * dt);
      }
    }
  }

  if (player.hp <= 0) {
    player.respawn();
    hud.message('<small>Você desmaiou de exaustão processual...<br/>Acordou junto ao monumento.</small>', 3500);
  }

  const hits = spells.update(dt, autos);
  for (const { enemy, projectile } of hits) {
    const arquivado = enemy.hit(projectile.damage, projectile.dir, projectile.knockback);
    if (arquivado) {
      state.autosArquivados++;
      spells.paperBurst(enemy.group.position);
      hud.message('<small>Auto Maldito <b>arquivado</b>! ⚖️</small>', 1500);
      checkWin();
    }
  }

  for (const f of folhas) {
    if (f.update(dt, player.position)) {
      state.folhas++;
      spells.burst(f.group.position, 0xffe9a0, 12, 4);
      hud.message(`<small>Folha do Códice recolhida! (${state.folhas}/${folhas.length})</small>`, 1500);
      checkWin();
    }
  }

  nearestNPC = null;
  let best = 3;
  for (const npc of estudantes) {
    npc.update(dt);
    const d = npc.group.position.distanceTo(player.position);
    if (d < best) {
      best = d;
      nearestNPC = npc;
    }
  }
  hud.interact(nearestNPC ? '[E] Conversar com estudante' : null);

  hud.setBars(player.hp, player.maxHp, player.mana, player.maxMana);
  hud.setCounters(state.folhas, state.autosArquivados);

  renderer.render(scene, camera);
}

animate();
