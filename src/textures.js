// Texturas procedurais (canvas 2D) — calcário claro, rusticado em bandas,
// telhas coloniais, mosaico português, madeira e vitrais. Sem assets externos.
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
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Helpers de realismo ----------

// Ruído multi-escala tileável (quadrantes espelhados) aplicado como overlay
function noiseOverlay(ctx, size, { scales = [16, 64, 256], alpha = 0.07 } = {}) {
  for (const res of scales) {
    const half = Math.max(2, res >> 1);
    const [nc, nctx] = makeCanvas(half);
    const img = nctx.createImageData(half, half);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.random() * 75;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = true;
    const h = size / 2;
    ctx.drawImage(nc, 0, 0, h, h);
    ctx.save(); ctx.translate(size, 0); ctx.scale(-1, 1); ctx.drawImage(nc, 0, 0, h, h); ctx.restore();
    ctx.save(); ctx.translate(0, size); ctx.scale(1, -1); ctx.drawImage(nc, 0, 0, h, h); ctx.restore();
    ctx.save(); ctx.translate(size, size); ctx.scale(-1, -1); ctx.drawImage(nc, 0, 0, h, h); ctx.restore();
    ctx.restore();
  }
}

// Manchas orgânicas com wrap nas bordas (tileável)
function stains(ctx, size, n, hue, sat, light, aMax, rMax = 60) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 14 + Math.random() * rMax;
    const a = 0.04 + Math.random() * aMax;
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

// Escorrimentos verticais de intempérie (fuligem da chuva)
function streaks(ctx, size, n, aMax = 0.10) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * size;
    const y0 = Math.random() * size * 0.5;
    const len = size * (0.15 + Math.random() * 0.3);
    const w = 3 + Math.random() * 14;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
    const a = 0.03 + Math.random() * aMax;
    g.addColorStop(0, `hsla(35,15%,18%,${a})`);
    g.addColorStop(0.15, `hsla(35,15%,18%,${a * 0.8})`);
    g.addColorStop(1, 'hsla(35,15%,18%,0)');
    ctx.fillStyle = g;
    for (const ox of [-size, 0, size]) ctx.fillRect(x + ox - w / 2, y0, w, len);
  }
}

function speckle(ctx, size, n, color, aMax) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.random() * aMax;
    const s = 1 + Math.random() * 2;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }
  ctx.globalAlpha = 1;
}

// ---------- Calcário aparelhado (fachada e pátio) ----------
// Pedra clara creme como a do prédio real; juntas finas, variação sutil por bloco
export function limestoneTexture(kind = 'facade') {
  const size = 1024;
  const presets = {
    facade: { rows: 9, hue: 43, sat: 16, light: 64, jointL: 46, jointW: 5, varL: 4.5 },
    patio:  { rows: 10, hue: 42, sat: 13, light: 62, jointL: 44, jointW: 6, varL: 6 },
  };
  const p = presets[kind];
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);

  map.fillStyle = `hsl(${p.hue},${p.sat}%,${p.jointL}%)`;
  map.fillRect(0, 0, size, size);
  bump.fillStyle = '#404040';
  bump.fillRect(0, 0, size, size);

  const rowH = size / p.rows;
  for (let r = 0; r < p.rows; r++) {
    const cols = 5 + (r % 2);
    const colW = size / cols;
    const offset = (r % 2) * colW * 0.5;
    for (let c = -1; c < cols + 1; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const w = colW - p.jointW, h = rowH - p.jointW;
      const L = p.light + (Math.random() - 0.5) * 2 * p.varL;
      const hue = p.hue + (Math.random() - 0.5) * 6;

      // bloco com leve gradiente vertical (luz vinda de cima)
      const g = map.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, `hsl(${hue},${p.sat}%,${L + 2.5}%)`);
      g.addColorStop(1, `hsl(${hue},${p.sat}%,${L - 2.5}%)`);
      map.fillStyle = g;
      map.fillRect(x, y, w, h);

      // chanfro: filete claro em cima, sombra embaixo
      map.fillStyle = 'hsla(45,30%,95%,0.30)';
      map.fillRect(x, y, w, 2);
      map.fillStyle = 'hsla(40,20%,10%,0.28)';
      map.fillRect(x, y + h - 2, w, 2);
      map.fillRect(x + w - 2, y, 2, h);

      const b = 165 + (Math.random() - 0.5) * 26;
      bump.fillStyle = `rgb(${b},${b},${b})`;
      bump.fillRect(x, y, w, h);
    }
  }

  noiseOverlay(map, size, { scales: [24, 96, 384], alpha: 0.06 });
  stains(map, size, 8, 38, 14, 34, 0.10, 90);
  streaks(map, size, 10, 0.08);
  speckle(map, size, 1400, '#3a3428', 0.16);
  speckle(map, size, 900, '#f3ecd9', 0.12);
  speckle(bump, size, 2400, '#000', 0.25);
  speckle(bump, size, 1600, '#fff', 0.22);

  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Rusticado em bandas horizontais (embasamento/térreo) ----------
export function rusticationTexture() {
  const size = 1024;
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);
  const bands = 8;                      // textura cobre ~4m -> banda de 0,5m
  const bandH = size / bands;

  for (let i = 0; i < bands; i++) {
    const y = i * bandH;
    const L = 63 + (Math.random() - 0.5) * 5;
    const g = map.createLinearGradient(0, y, 0, y + bandH);
    g.addColorStop(0, `hsl(43,15%,${L + 3}%)`);
    g.addColorStop(0.85, `hsl(43,15%,${L - 3}%)`);
    g.addColorStop(1, `hsl(42,14%,${L - 9}%)`);
    map.fillStyle = g;
    map.fillRect(0, y, size, bandH);
    // friso profundo entre as bandas
    map.fillStyle = 'hsla(40,18%,12%,0.55)';
    map.fillRect(0, y + bandH - 7, size, 7);
    map.fillStyle = 'hsla(45,30%,92%,0.30)';
    map.fillRect(0, y, size, 3);
    // juntas verticais esparsas e desencontradas
    const cols = 3 + (i % 2);
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5 * (i % 2)) / cols) * size;
      map.fillStyle = 'hsla(40,18%,18%,0.35)';
      map.fillRect(x, y + 3, 4, bandH - 10);
    }
    const b = 170 + (Math.random() - 0.5) * 20;
    bump.fillStyle = `rgb(${b},${b},${b})`;
    bump.fillRect(0, y, size, bandH - 7);
    bump.fillStyle = '#000';
    bump.fillRect(0, y + bandH - 7, size, 7);
  }

  noiseOverlay(map, size, { scales: [32, 128], alpha: 0.07 });
  stains(map, size, 8, 36, 14, 30, 0.12, 70);
  streaks(map, size, 8, 0.10);
  speckle(map, size, 1800, '#33291d', 0.18);
  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Telhas capa-e-canal (vista de cima: fiadas verticais) ----------
export function roofTexture() {
  const size = 1024;
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);
  const colW = 52;                      // fiadas verticais (sentido da água)
  const rowH = 78;

  map.fillStyle = 'hsl(12,45%,24%)';
  map.fillRect(0, 0, size, size);
  bump.fillStyle = '#222';
  bump.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += colW) {
    const hueBase = 10 + Math.random() * 10;
    for (let y = 0; y < size; y += rowH) {
      const L = 35 + (Math.random() - 0.5) * 17;
      // canal côncavo: sombras nas laterais da fiada
      const g = map.createLinearGradient(x, 0, x + colW, 0);
      g.addColorStop(0, `hsl(${hueBase},48%,${L - 11}%)`);
      g.addColorStop(0.5, `hsl(${hueBase},52%,${L + 7}%)`);
      g.addColorStop(1, `hsl(${hueBase},48%,${L - 11}%)`);
      map.fillStyle = g;
      map.fillRect(x, y, colW - 2, rowH - 2);
      // sobreposição horizontal (emenda da telha)
      map.fillStyle = 'hsla(8,40%,10%,0.5)';
      map.fillRect(x, y + rowH - 4, colW, 4);
      map.fillStyle = `hsla(${hueBase},45%,${L + 14}%,0.5)`;
      map.fillRect(x, y, colW - 2, 3);

      const gb = bump.createLinearGradient(x, 0, x + colW, 0);
      gb.addColorStop(0, '#303030');
      gb.addColorStop(0.5, '#d0d0d0');
      gb.addColorStop(1, '#303030');
      bump.fillStyle = gb;
      bump.fillRect(x, y, colW - 2, rowH - 4);
    }
  }

  noiseOverlay(map, size, { scales: [48, 192], alpha: 0.09 });
  stains(map, size, 12, 28, 24, 16, 0.16, 110);   // fuligem
  stains(map, size, 6, 80, 26, 32, 0.10, 60);     // líquen
  speckle(map, size, 1600, '#1d100a', 0.22);
  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Lajões do pátio ----------
export function flagstoneTexture() {
  const size = 1024;
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);
  map.fillStyle = 'hsl(40,9%,34%)';
  map.fillRect(0, 0, size, size);
  bump.fillStyle = '#2a2a2a';
  bump.fillRect(0, 0, size, size);

  const n = 6, cell = size / n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = c * cell + 4, y = r * cell + 4;
      const w = cell - 8, h = cell - 8;
      const L = 52 + (Math.random() - 0.5) * 11;
      const g = map.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, `hsl(${41 + (Math.random() - 0.5) * 10},${10 + Math.random() * 5}%,${L + 3}%)`);
      g.addColorStop(1, `hsl(${41 + (Math.random() - 0.5) * 10},${10 + Math.random() * 5}%,${L - 3}%)`);
      map.fillStyle = g;
      map.fillRect(x, y, w, h);
      map.fillStyle = 'hsla(0,0%,100%,0.08)';
      map.fillRect(x, y, w, 2);
      map.fillStyle = 'hsla(0,0%,0%,0.20)';
      map.fillRect(x, y + h - 2, w, 2);
      const b = 150 + (Math.random() - 0.5) * 40;
      bump.fillStyle = `rgb(${b},${b},${b})`;
      bump.fillRect(x, y, w, h);
    }
  }
  noiseOverlay(map, size, { scales: [32, 128, 512], alpha: 0.07 });
  stains(map, size, 16, 36, 12, 24, 0.10, 130);
  stains(map, size, 6, 90, 16, 30, 0.06, 70);
  speckle(map, size, 2600, '#241f18', 0.22);
  speckle(map, size, 1200, '#d8cfba', 0.10);
  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Calçada portuguesa (ondas pretas sobre branco) ----------
export function portuguesePavementTexture() {
  const size = 1024;
  const [cMap, map] = makeCanvas(size);
  const [cBump, bump] = makeCanvas(size);
  const stone = 13;

  for (let y = 0; y < size; y += stone) {
    for (let x = 0; x < size; x += stone) {
      // duas famílias de ondas senoidais (padrão "mar largo")
      const u = x / size, v = y / size;
      const w1 = Math.sin(u * Math.PI * 4 + Math.sin(v * Math.PI * 2) * 1.2);
      const w2 = Math.sin((u + v) * Math.PI * 2 + 1.7);
      const dark = w1 > 0.55 || w2 > 0.78;
      const L = dark ? 18 + Math.random() * 7 : 76 + Math.random() * 9;
      map.fillStyle = `hsl(${dark ? 220 : 45},${dark ? 5 : 12}%,${L}%)`;
      const j = 1.5;
      map.fillRect(x + j, y + j, stone - j * 2, stone - j * 2);
      const b = 110 + Math.random() * 70;
      bump.fillStyle = `rgb(${b},${b},${b})`;
      bump.fillRect(x + j, y + j, stone - j * 2, stone - j * 2);
    }
  }
  // rejunte
  map.globalCompositeOperation = 'destination-over';
  map.fillStyle = 'hsl(40,10%,42%)';
  map.fillRect(0, 0, size, size);
  map.globalCompositeOperation = 'source-over';
  bump.globalCompositeOperation = 'destination-over';
  bump.fillStyle = '#000';
  bump.fillRect(0, 0, size, size);
  bump.globalCompositeOperation = 'source-over';

  noiseOverlay(map, size, { scales: [64, 256], alpha: 0.06 });
  stains(map, size, 14, 36, 10, 26, 0.09, 110);
  speckle(map, size, 2000, '#26221c', 0.16);
  return { map: toTexture(cMap), bump: toTexture(cBump, { srgb: false }) };
}

// ---------- Madeira de demolição (portas e bancos) ----------
export function woodTexture(dark = true) {
  const size = 512;
  const [cMap, map] = makeCanvas(size);
  const base = dark ? 16 : 26;
  map.fillStyle = `hsl(24,36%,${base}%)`;
  map.fillRect(0, 0, size, size);
  const planks = 6, w = size / planks;
  for (let p = 0; p < planks; p++) {
    const L = base + (Math.random() - 0.5) * 7;
    const g = map.createLinearGradient(p * w, 0, (p + 1) * w, 0);
    g.addColorStop(0, `hsl(${22 + Math.random() * 6},38%,${L - 2}%)`);
    g.addColorStop(0.5, `hsl(${22 + Math.random() * 6},40%,${L + 2}%)`);
    g.addColorStop(1, `hsl(${22 + Math.random() * 6},38%,${L - 2}%)`);
    map.fillStyle = g;
    map.fillRect(p * w + 1, 0, w - 2, size);
    for (let v = 0; v < 9; v++) {
      map.strokeStyle = `hsla(22,42%,${L - 7 - Math.random() * 5}%,0.55)`;
      map.lineWidth = 0.8 + Math.random() * 1.4;
      map.beginPath();
      const vx = p * w + 3 + Math.random() * (w - 6);
      map.moveTo(vx, 0);
      map.bezierCurveTo(vx + 7, size * 0.3, vx - 7, size * 0.65, vx + 4, size);
      map.stroke();
    }
    // nó ocasional
    if (Math.random() < 0.5) {
      const kx = p * w + w / 2, ky = Math.random() * size;
      map.strokeStyle = `hsla(20,45%,${L - 10}%,0.8)`;
      map.lineWidth = 2;
      map.beginPath();
      map.ellipse(kx, ky, 5 + Math.random() * 5, 9 + Math.random() * 6, 0, 0, Math.PI * 2);
      map.stroke();
    }
  }
  noiseOverlay(map, size, { scales: [32, 128], alpha: 0.08 });
  speckle(map, size, 900, '#0e0905', 0.25);
  return { map: toTexture(cMap) };
}

// ---------- Janela: caixilho claro, vidro com reflexo de céu ----------
export function windowTexture({ arched = false, grille = false } = {}) {
  const w = 256, h = 384;
  const [cMap, map] = makeCanvas(w, h);

  // moldura de pedra clara em volta
  map.fillStyle = 'hsl(43,16%,66%)';
  map.fillRect(0, 0, w, h);
  map.fillStyle = 'hsla(0,0%,0%,0.25)';
  map.fillRect(10, 10, w - 20, h - 20);

  // vidro: gradiente de céu refletido
  const inset = 18;
  const g = map.createLinearGradient(0, inset, 0, h - inset);
  g.addColorStop(0, '#7d96ad');
  g.addColorStop(0.35, '#3d5266');
  g.addColorStop(0.6, '#1c2836');
  g.addColorStop(1, '#10161f');
  map.fillStyle = g;
  map.fillRect(inset, inset, w - inset * 2, h - inset * 2);
  // brilho diagonal
  map.save();
  map.beginPath();
  map.moveTo(inset, h * 0.55);
  map.lineTo(w - inset, h * 0.2);
  map.lineTo(w - inset, h * 0.34);
  map.lineTo(inset, h * 0.72);
  map.closePath();
  map.fillStyle = 'hsla(210,40%,80%,0.13)';
  map.fill();
  map.restore();

  // caixilhos brancos (como nas fotos)
  map.strokeStyle = '#ddd6c4';
  map.lineWidth = 6;
  map.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  map.lineWidth = 4;
  map.beginPath(); map.moveTo(w / 2, inset); map.lineTo(w / 2, h - inset); map.stroke();
  for (let i = 1; i < 4; i++) {
    const y = inset + ((h - inset * 2) / 4) * i;
    map.beginPath(); map.moveTo(inset, y); map.lineTo(w - inset, y); map.stroke();
  }

  if (grille) {
    map.strokeStyle = '#22221f';
    map.lineWidth = 5;
    for (let i = 1; i < 6; i++) {
      const x = inset + ((w - inset * 2) / 6) * i;
      map.beginPath(); map.moveTo(x, inset); map.lineTo(x, h - inset); map.stroke();
    }
  }

  if (arched) {
    // cantos superiores em pedra simulando verga em arco
    map.fillStyle = 'hsl(43,16%,66%)';
    map.beginPath();
    map.moveTo(0, 0); map.lineTo(w * 0.5, 0);
    map.quadraticCurveTo(w * 0.08, h * 0.02, 0, h * 0.22);
    map.closePath(); map.fill();
    map.beginPath();
    map.moveTo(w, 0); map.lineTo(w * 0.5, 0);
    map.quadraticCurveTo(w * 0.92, h * 0.02, w, h * 0.22);
    map.closePath(); map.fill();
  }
  return { map: toTexture(cMap) };
}

// ---------- Relógio do frontão ----------
export function clockTexture() {
  const s = 256;
  const [cMap, map] = makeCanvas(s);
  map.fillStyle = '#caa86a';
  map.fillRect(0, 0, s, s);
  const cx = s / 2;
  map.beginPath(); map.arc(cx, cx, s * 0.46, 0, Math.PI * 2);
  map.fillStyle = '#221d14'; map.fill();
  map.beginPath(); map.arc(cx, cx, s * 0.40, 0, Math.PI * 2);
  map.fillStyle = '#efe8d2'; map.fill();
  // marcações
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    map.strokeStyle = '#26211a';
    map.lineWidth = i % 3 === 0 ? 7 : 3;
    map.beginPath();
    map.moveTo(cx + Math.cos(a) * s * 0.32, cx + Math.sin(a) * s * 0.32);
    map.lineTo(cx + Math.cos(a) * s * 0.38, cx + Math.sin(a) * s * 0.38);
    map.stroke();
  }
  // ponteiros (10h10)
  map.strokeStyle = '#1c1812';
  map.lineWidth = 8;
  map.beginPath(); map.moveTo(cx, cx);
  map.lineTo(cx + Math.cos(-Math.PI * 0.83) * s * 0.22, cx + Math.sin(-Math.PI * 0.83) * s * 0.22);
  map.stroke();
  map.lineWidth = 6;
  map.beginPath(); map.moveTo(cx, cx);
  map.lineTo(cx + Math.cos(-Math.PI * 0.17) * s * 0.32, cx + Math.sin(-Math.PI * 0.17) * s * 0.32);
  map.stroke();
  return { map: toTexture(cMap) };
}

// ---------- Placa com inscrição gravada ----------
export function inscriptionTexture(lines) {
  const w = 1024, h = 256;
  const [cMap, map] = makeCanvas(w, h);
  map.fillStyle = 'hsl(44,16%,64%)';
  map.fillRect(0, 0, w, h);
  noiseOverlay(map, w, { scales: [64, 256], alpha: 0.05 });
  stains(map, w, 6, 38, 14, 34, 0.08);
  speckle(map, w, 700, '#3a342a', 0.15);
  map.textAlign = 'center';
  map.textBaseline = 'middle';
  const fs = lines.length > 1 ? 72 : 92;
  lines.forEach((text, i) => {
    const y = (h / (lines.length + 1)) * (i + 1);
    map.font = `${fs}px Georgia, serif`;
    const maxW = w * 0.9;
    map.fillStyle = 'hsla(45,22%,88%,0.85)';
    map.fillText(text, w / 2, y + 3, maxW);
    map.fillStyle = 'hsl(40,16%,28%)';
    map.fillText(text, w / 2, y, maxW);
  });
  return { map: toTexture(cMap) };
}

// Helper: material PBR com mapa repetido na escala dada
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
    mat.bumpScale = opts.bumpScale ?? 0.5;
  }
  return mat;
}
