// Texturas procedurais (canvas 2D) — pedra envelhecida, telhas, madeira, vitrais.
// Nenhum asset externo: tudo gerado em código.
import * as THREE from 'three';

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, { srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ruído pontilhado (sujeira/granulação)
function speckle(ctx, size, n, color, aMax) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.random() * aMax;
    const s = 1 + Math.random() * 2;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }
  ctx.globalAlpha = 1;
}

// Manchas orgânicas (umidade, fuligem, musgo) — desenhadas com wrap nas
// bordas para a textura tilar sem emendas visíveis
function stains(ctx, size, n, hue, sat, light, aMax, rMax = 60) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 14 + Math.random() * rMax;
    const a = 0.05 + Math.random() * aMax;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const cx = x + ox, cy = y + oy;
        if (cx + r < 0 || cx - r > size || cy + r < 0 || cy - r > size) continue;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `hsla(${hue},${sat}%,${light}%,${a})`);
        g.addColorStop(1, `hsla(${hue},${sat}%,${light}%,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
  }
}

// ---------- Cantaria: blocos de pedra aparelhada, envelhecida ----------
// kind: 'wall' (cinza-creme, blocos médios), 'rustic' (blocos grandes rugosos),
//       'cream' (pedra clara lisa do pavimento superior)
export function stoneTexture(kind = 'wall') {
  const size = 512;
  const presets = {
    wall:   { rows: 7, hue: 42, sat: 12, light: 52, jointL: 22, jointW: 5, varL: 9, bevel: 0.22 },
    rustic: { rows: 4, hue: 38, sat: 10, light: 42, jointL: 16, jointW: 8, varL: 11, bevel: 0.35 },
    cream:  { rows: 6, hue: 45, sat: 18, light: 66, jointL: 38, jointW: 3, varL: 5, bevel: 0.12 },
  };
  const p = presets[kind];
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);

  map.fillStyle = `hsl(${p.hue},${p.sat}%,${p.jointL}%)`;
  map.fillRect(0, 0, size, size);
  bump.fillStyle = '#1a1a1a';
  bump.fillRect(0, 0, size, size);

  const rowH = size / p.rows;
  for (let r = 0; r < p.rows; r++) {
    const cols = (kind === 'rustic' ? 3 : 4) + (r % 2);
    const colW = size / cols;
    const offset = (r % 2) * colW * 0.5;
    for (let c = -1; c < cols + 1; c++) {
      const x = c * colW + offset + (Math.random() - 0.5) * 4;
      const y = r * rowH + (Math.random() - 0.5) * 3;
      const w = colW - p.jointW, h = rowH - p.jointW;
      const L = p.light + (Math.random() - 0.5) * 2 * p.varL;

      // cor base do bloco
      map.fillStyle = `hsl(${p.hue + (Math.random() - 0.5) * 10},${p.sat}%,${L}%)`;
      map.fillRect(x, y, w, h);
      // relevo: borda superior clara, inferior escura
      map.fillStyle = `hsla(0,0%,100%,${p.bevel})`;
      map.fillRect(x, y, w, 3);
      map.fillRect(x, y, 3, h);
      map.fillStyle = `hsla(0,0%,0%,${p.bevel})`;
      map.fillRect(x, y + h - 3, w, 3);
      map.fillRect(x + w - 3, y, 3, h);
      // erosão interna sutil
      stains(map, 0, 0); // no-op para clareza
      map.save();
      map.beginPath();
      map.rect(x, y, w, h);
      map.clip();
      stains(map, size, 2, p.hue, p.sat, Math.max(10, p.light - 25), 0.10, 30);
      map.restore();

      // bump: bloco claro, junta escura
      const b = 150 + (Math.random() - 0.5) * 50;
      bump.fillStyle = `rgb(${b},${b},${b})`;
      bump.fillRect(x, y, w, h);
    }
  }

  // intempéries gerais
  stains(map, size, 10, 32, 18, 22, 0.12);            // fuligem/umidade
  stains(map, size, 5, 92, 22, 30, 0.08, 40);         // musgo discreto
  speckle(map, size, kind === 'rustic' ? 2600 : 1600, '#2e2a24', 0.30);
  speckle(map, size, 800, '#efe8d6', 0.18);
  speckle(bump, size, 2000, '#000', 0.35);
  speckle(bump, size, 1200, '#fff', 0.3);

  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Telhas coloniais (capa e canal) ----------
export function roofTexture() {
  const size = 512;
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);
  map.fillStyle = 'hsl(14,46%,26%)';
  map.fillRect(0, 0, size, size);
  bump.fillStyle = '#333';
  bump.fillRect(0, 0, size, size);

  const tile = 42;
  for (let y = 0; y < size + tile; y += tile * 0.78) {
    const off = (Math.round(y / (tile * 0.78)) % 2) * tile * 0.5;
    for (let x = -tile; x < size + tile; x += tile) {
      const L = 34 + (Math.random() - 0.5) * 16;
      const hue = 12 + (Math.random() - 0.5) * 10;
      map.fillStyle = `hsl(${hue},48%,${L}%)`;
      map.beginPath();
      map.arc(x + off + tile / 2, y + tile * 0.7, tile * 0.46, Math.PI, 0);
      map.fill();
      map.strokeStyle = 'hsla(10,40%,12%,0.65)';
      map.lineWidth = 3;
      map.stroke();
      const b = 120 + (Math.random() - 0.5) * 60;
      bump.fillStyle = `rgb(${b},${b},${b})`;
      bump.beginPath();
      bump.arc(x + off + tile / 2, y + tile * 0.7, tile * 0.46, Math.PI, 0);
      bump.fill();
    }
  }
  stains(map, size, 8, 30, 20, 18, 0.15);
  speckle(map, size, 1200, '#1f130c', 0.3);
  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Lajões do pátio ----------
export function flagstoneTexture() {
  const size = 512;
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);
  map.fillStyle = 'hsl(40,8%,30%)';
  map.fillRect(0, 0, size, size);
  bump.fillStyle = '#222';
  bump.fillRect(0, 0, size, size);

  const n = 5, cell = size / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = c * cell + 3 + (Math.random() - 0.5) * 5;
      const y = r * cell + 3 + (Math.random() - 0.5) * 5;
      const w = cell - 7, h = cell - 7;
      const L = 48 + (Math.random() - 0.5) * 14;
      map.fillStyle = `hsl(${40 + (Math.random() - 0.5) * 14},${9 + Math.random() * 6}%,${L}%)`;
      map.fillRect(x, y, w, h);
      map.fillStyle = 'hsla(0,0%,100%,0.10)';
      map.fillRect(x, y, w, 2);
      map.fillStyle = 'hsla(0,0%,0%,0.18)';
      map.fillRect(x, y + h - 2, w, 2);
      const b = 140 + (Math.random() - 0.5) * 50;
      bump.fillStyle = `rgb(${b},${b},${b})`;
      bump.fillRect(x, y, w, h);
    }
  }
  stains(map, size, 14, 36, 14, 20, 0.12);
  stains(map, size, 6, 95, 18, 28, 0.07, 50);
  speckle(map, size, 2200, '#241f18', 0.3);
  speckle(map, size, 900, '#ddd3bd', 0.15);
  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Calçada portuguesa do Largo (ondas claras sobre basalto) ----------
export function cobbleTexture() {
  const size = 512;
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);
  const stone = 16;
  for (let y = 0; y < size; y += stone) {
    for (let x = 0; x < size; x += stone) {
      // padrão de ondas: faixas claras senoidais
      const wave = Math.sin((x / size) * Math.PI * 4 + (y / size) * Math.PI * 2);
      const isLight = wave > 0.35;
      const L = isLight ? 60 + (Math.random() - 0.5) * 10 : 34 + (Math.random() - 0.5) * 10;
      map.fillStyle = `hsl(${isLight ? 46 : 220},${isLight ? 14 : 6}%,${L}%)`;
      map.fillRect(x + 1, y + 1, stone - 2, stone - 2);
      const b = 120 + (Math.random() - 0.5) * 70;
      bump.fillStyle = `rgb(${b},${b},${b})`;
      bump.fillRect(x + 1, y + 1, stone - 2, stone - 2);
    }
  }
  stains(map, size, 12, 36, 12, 22, 0.12);
  speckle(map, size, 1800, '#1c1a16', 0.25);
  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Madeira maciça (portas) ----------
export function woodTexture() {
  const size = 256;
  const [cMap, map] = makeCanvas(size);
  map.fillStyle = 'hsl(22,38%,22%)';
  map.fillRect(0, 0, size, size);
  const planks = 5, w = size / planks;
  for (let p = 0; p < planks; p++) {
    const L = 22 + (Math.random() - 0.5) * 8;
    map.fillStyle = `hsl(${20 + Math.random() * 8},40%,${L}%)`;
    map.fillRect(p * w + 1, 0, w - 2, size);
    // veios
    for (let v = 0; v < 7; v++) {
      map.strokeStyle = `hsla(20,45%,${L - 8 - Math.random() * 6}%,0.6)`;
      map.lineWidth = 1 + Math.random();
      map.beginPath();
      const vx = p * w + 3 + Math.random() * (w - 6);
      map.moveTo(vx, 0);
      map.bezierCurveTo(vx + 6, size * 0.33, vx - 6, size * 0.66, vx + 3, size);
      map.stroke();
    }
  }
  // travessas de ferro
  map.fillStyle = 'hsl(20,10%,12%)';
  map.fillRect(0, size * 0.18, size, 8);
  map.fillRect(0, size * 0.78, size, 8);
  speckle(map, size, 600, '#120c06', 0.3);
  return { map: toTexture(cMap) };
}

// ---------- Janela de vidro com caixilhos (leve brilho) ----------
export function windowTexture(arched = false) {
  const w = 256, h = 384;
  const [cMap, map] = makeCanvas(w, h);
  // vidro escuro com gradiente de reflexo
  const g = map.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2a3a4e');
  g.addColorStop(0.45, '#16202e');
  g.addColorStop(0.55, '#3d5468');
  g.addColorStop(1, '#101822');
  map.fillStyle = g;
  map.fillRect(0, 0, w, h);
  // caixilhos
  map.strokeStyle = '#caa86a';
  map.lineWidth = 7;
  map.strokeRect(4, 4, w - 8, h - 8);
  map.lineWidth = 4;
  for (let i = 1; i < 3; i++) {
    map.beginPath(); map.moveTo((w / 3) * i, 0); map.lineTo((w / 3) * i, h); map.stroke();
  }
  for (let i = 1; i < 4; i++) {
    map.beginPath(); map.moveTo(0, (h / 4) * i); map.lineTo(w, (h / 4) * i); map.stroke();
  }
  if (arched) {
    // escurece cantos superiores para sugerir verga em arco
    map.fillStyle = '#0a0a0a';
    map.beginPath(); map.moveTo(0, 0); map.lineTo(w * 0.2, 0); map.quadraticCurveTo(0, 0, 0, h * 0.15); map.fill();
    map.beginPath(); map.moveTo(w, 0); map.lineTo(w * 0.8, 0); map.quadraticCurveTo(w, 0, w, h * 0.15); map.fill();
  }
  return { map: toTexture(cMap) };
}

// ---------- Placa com inscrição gravada ----------
export function inscriptionTexture(lines) {
  const w = 1024, h = 256;
  const [cMap, map] = makeCanvas(w, h);
  map.fillStyle = 'hsl(45,16%,62%)';
  map.fillRect(0, 0, w, h);
  stains(map, w, 8, 38, 14, 30, 0.10);
  speckle(map, w, 900, '#3a342a', 0.2);
  map.fillStyle = 'hsla(0,0%,100%,0.25)';
  map.fillRect(0, 0, w, 6);
  map.fillStyle = 'hsla(0,0%,0%,0.25)';
  map.fillRect(0, h - 6, w, 6);
  map.textAlign = 'center';
  map.textBaseline = 'middle';
  const fs = lines.length > 1 ? 72 : 96;
  lines.forEach((text, i) => {
    const y = (h / (lines.length + 1)) * (i + 1);
    map.font = `bold ${fs}px Georgia, serif`;
    const maxW = w * 0.92; // não deixa o texto estourar a placa
    // gravação: sombra clara abaixo, texto escuro
    map.fillStyle = 'hsla(45,20%,85%,0.8)';
    map.fillText(text, w / 2, y + 3, maxW);
    map.fillStyle = 'hsl(40,18%,22%)';
    map.fillText(text, w / 2, y, maxW);
  });
  return { map: toTexture(cMap) };
}

// Helper: material de pedra com mapa repetido na escala dada (metros por tile)
export function texturedMaterial({ map, bump }, repeatX, repeatY, opts = {}) {
  const m = map.clone();
  m.repeat.set(repeatX, repeatY);
  m.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({
    map: m,
    roughness: opts.roughness ?? 0.95,
    metalness: 0.0,
    ...opts.material,
  });
  if (bump) {
    const b = bump.clone();
    b.repeat.set(repeatX, repeatY);
    b.needsUpdate = true;
    mat.bumpMap = b;
    mat.bumpScale = opts.bumpScale ?? 0.6;
  }
  return mat;
}
