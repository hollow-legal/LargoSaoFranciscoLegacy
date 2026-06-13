// Cenário: edifício da Faculdade (térreo + 3 pavimentos, conforme o prédio
// real), Pátio das Arcadas, fachada monumental com pórtico de colunas
// colossais e relógio, Largo de São Francisco com palmeiras e igreja.
import * as THREE from 'three';
import {
  limestoneTexture, rusticationTexture, roofTexture, flagstoneTexture,
  portuguesePavementTexture, woodTexture, windowTexture, clockTexture,
  inscriptionTexture, marbleTexture, texturedMaterial,
} from './textures.js';

export const PATIO = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
export const LARGO = { minX: -45, maxX: 45, minZ: -92, maxZ: -38 };

// ---------- Texturas (geradas uma vez) ----------
const TEX = {
  limeFacade: limestoneTexture('facade'),
  limePatio: limestoneTexture('patio'),
  rust: rusticationTexture(),
  roof: roofTexture(),
  flag: flagstoneTexture(),
  pav: portuguesePavementTexture(),
  wood: woodTexture(true),
  win: windowTexture(),
  winArch: windowTexture({ arched: true }),
  winGrille: windowTexture({ grille: true }),
  clock: clockTexture(),
};

const MAT = {
  calcario: texturedMaterial(TEX.limeFacade, 0.25, 0.25),          // pedra clara da fachada
  calcarioPatio: texturedMaterial(TEX.limePatio, 0.25, 0.25),      // arcadas do pátio
  rusticado: texturedMaterial(TEX.rust, 0.25, 0.25, { bumpScale: 1.0 }),
  telhado: texturedMaterial(TEX.roof, 0.35, 0.35, { bumpScale: 0.8 }),
  // pisos são BoxGeometry (UV 0..1): repeat dimensionado pelo tamanho real
  chaoPatio: texturedMaterial(TEX.flag, 78 / 7.2, 78 / 7.2),     // lajão ~1,2m
  chaoLargo: texturedMaterial(TEX.pav, 100 / 10, 64 / 10),       // pedra ~13cm
  madeira: new THREE.MeshStandardMaterial({ map: TEX.wood.map, roughness: 0.85 }),
  janela: new THREE.MeshStandardMaterial({ map: TEX.win.map, roughness: 0.3, metalness: 0.05 }),
  janelaArco: new THREE.MeshStandardMaterial({ map: TEX.winArch.map, roughness: 0.3, metalness: 0.05 }),
  janelaGrade: new THREE.MeshStandardMaterial({ map: TEX.winGrille.map, roughness: 0.35 }),
  relogio: new THREE.MeshStandardMaterial({ map: TEX.clock.map, roughness: 0.5 }),
  agua: new THREE.MeshPhongMaterial({ color: 0x3a6e8f, shininess: 120, transparent: true, opacity: 0.85 }),
  ferro: new THREE.MeshStandardMaterial({ color: 0x23232a, roughness: 0.55, metalness: 0.5 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x6e5526, roughness: 0.45, metalness: 0.55 }),
  igreja: new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.92 }),
  tronco: new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 1 }),
  troncoPalmeira: new THREE.MeshStandardMaterial({ color: 0x9a8d76, roughness: 1 }),
  folha: new THREE.MeshLambertMaterial({ color: 0x3e6b35 }),
  folhaPalmeira: new THREE.MeshLambertMaterial({ color: 0x2e5c2e, side: THREE.DoubleSide }),
  folhaRoxa: new THREE.MeshLambertMaterial({ color: 0x7a5a9e }),
};

// ---------- Cotas do edifício (térreo + 3 pavimentos) ----------
const H0 = 4.8;                       // térreo (arcada / rusticado)
const C1 = 0.4;                       // cornija sobre o térreo
const P1 = 3.8, P2 = 3.6;             // 1º e 2º pavimentos
const C2 = 0.4;                       // cornija intermediária
const P3 = 2.9;                       // 3º pavimento (sótão de janelas menores)
const TOPO = H0 + C1 + P1 + P2 + C2 + P3;   // ~16.0

// BoxGeometry tem UV 0..1 por face: o repeat precisa ser proporcional ao
// tamanho da caixa para a pedra manter a escala real (1 tile = `per` metros)
const matCache = new Map();
function sizedStone(tex, w, h, opts = {}, per = 4) {
  const key = `${tex.map.uuid}|${(w / per).toFixed(2)}|${(h / per).toFixed(2)}|${opts.bumpScale ?? ''}|${opts.roughness ?? ''}`;
  if (!matCache.has(key)) matCache.set(key, texturedMaterial(tex, w / per, h / per, opts));
  return matCache.get(key);
}

// ---------- Colisores ----------
export const colliders = { boxes: [], circles: [] };
function addBoxCollider(cx, cz, sx, sz) {
  colliders.boxes.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
}

// ---------- Geometrias auxiliares ----------
function archPanelGeometry(w, h, depth, archW, archH) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.closePath();
  const hole = new THREE.Path();
  const r = archW / 2;
  hole.moveTo(-r, 0);
  hole.lineTo(-r, archH - r);
  hole.absarc(0, archH - r, r, Math.PI, 0, true);
  hole.lineTo(r, 0);
  hole.closePath();
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

function frontaoGeometry(w, h, depth) {
  const s = new THREE.Shape();
  const hw = w / 2;
  s.moveTo(-hw, 0);
  s.bezierCurveTo(-hw, h * 0.5, -hw * 0.6, h * 0.45, -hw * 0.44, h * 0.58);
  s.bezierCurveTo(-hw * 0.3, h * 0.7, -hw * 0.2, h * 0.94, 0, h);
  s.bezierCurveTo(hw * 0.2, h * 0.94, hw * 0.3, h * 0.7, hw * 0.44, h * 0.58);
  s.bezierCurveTo(hw * 0.6, h * 0.45, hw, h * 0.5, hw, 0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

// Telhado de duas águas ao longo do eixo X local
function roofPrism(length, width, height) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-length / 2, 0, 0);
  return new THREE.Mesh(g, MAT.telhado);
}

// Pináculo do coroamento (plintozinho + agulha + esfera)
function pinnacle() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), MAT.calcario);
  base.position.y = 0.22;
  g.add(base);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.3, 6), MAT.calcario);
  spire.position.y = 1.1;
  g.add(spire);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), MAT.calcario);
  ball.position.y = 1.85;
  g.add(ball);
  return g;
}

// Sacada com balaústres
function balcony(width) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.25, 1.0), MAT.calcario);
  g.add(slab);
  // mísulas
  for (const mx of [-width / 3, 0, width / 3]) {
    const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.6), MAT.calcario);
    corbel.position.set(mx, -0.35, -0.2);
    g.add(corbel);
  }
  const n = Math.round(width / 0.45);
  const balGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.62, 6);
  for (let i = 0; i <= n; i++) {
    const b = new THREE.Mesh(balGeo, MAT.calcario);
    b.position.set(-width / 2 + (width / n) * i, 0.43, 0.38);
    g.add(b);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.2), MAT.calcario);
  rail.position.set(0, 0.8, 0.38);
  g.add(rail);
  return g;
}

// ---------- Ala do pátio: arcada no térreo + 3 pavimentos de janelas ----------
// `depth` = profundidade do corpo superior (a planta real tem alas de pesos
// diferentes: as alas dos salões são bem mais profundas que as galerias)
function buildWing(length, depth = 4.9) {
  const wing = new THREE.Group();
  const panelW = 4;
  const count = Math.round(length / panelW);
  const arcGeo = archPanelGeometry(panelW, H0, 0.6, 2.7, 3.9);

  for (let i = 0; i < count; i++) {
    const x = -length / 2 + panelW * (i + 0.5);
    const panel = new THREE.Mesh(arcGeo, MAT.calcarioPatio);
    panel.position.set(x, 0, 0);
    wing.add(panel);
  }

  // cornija sobre a arcada
  const corn1 = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, C1, 1.0), MAT.calcario);
  corn1.position.set(0, H0 + C1 / 2, 0.1);
  wing.add(corn1);

  // corpo superior (3 pavimentos)
  const upperH = P1 + P2 + C2 + P3;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(length, upperH, depth), sizedStone(TEX.limeFacade, length, upperH));
  upper.position.set(0, H0 + C1 + upperH / 2, -depth / 2 + 0.3);
  wing.add(upper);

  // janelas dos pavimentos (face interna ao pátio)
  const zWin = 0.32;
  for (let i = 0; i < count; i++) {
    const x = -length / 2 + panelW * (i + 0.5);
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), MAT.janelaArco);
    w1.position.set(x, H0 + C1 + P1 / 2, zWin);
    wing.add(w1);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), MAT.janela);
    w2.position.set(x, H0 + C1 + P1 + P2 / 2, zWin);
    wing.add(w2);
    const w3 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), MAT.janela);
    w3.position.set(x, H0 + C1 + P1 + P2 + C2 + P3 / 2, zWin);
    wing.add(w3);
  }

  // cornija intermediária (sob o sótão) e de coroamento
  const corn2 = new THREE.Mesh(new THREE.BoxGeometry(length + 0.3, C2, 0.8), MAT.calcario);
  corn2.position.set(0, H0 + C1 + P1 + P2 + C2 / 2, 0.25);
  wing.add(corn2);
  const corn3 = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.5, depth + 0.7), MAT.calcario);
  corn3.position.set(0, TOPO + 0.25, -depth / 2 + 0.3);
  wing.add(corn3);

  // parede de fundo da galeria térrea + laje (teto da galeria)
  const fundo = new THREE.Mesh(new THREE.BoxGeometry(length, H0, 0.5), sizedStone(TEX.limePatio, length, H0));
  fundo.position.set(0, H0 / 2, -4.25);
  wing.add(fundo);
  const laje = new THREE.Mesh(new THREE.BoxGeometry(length, 0.35, 4.6), MAT.calcario);
  laje.position.set(0, H0 + 0.2, -2.1);
  wing.add(laje);

  // telhado de telhas coloniais (largura acompanha o peso da ala)
  const roof = roofPrism(length + 0.8, depth + 2.5, 2.5 + depth * 0.12);
  roof.position.set(0, TOPO + 0.5, -depth / 2 + 0.3);
  wing.add(roof);

  return wing;
}

// Bloco de canto (liga as alas; telhado piramidal — sem torres, como no real)
function buildCorner(scene, x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(9.4, TOPO, 9.4), sizedStone(TEX.limeFacade, 9.4, TOPO));
  body.position.y = TOPO / 2;
  g.add(body);
  const base = new THREE.Mesh(new THREE.BoxGeometry(9.8, H0, 9.8), sizedStone(TEX.rust, 9.8, H0, { bumpScale: 1.0 }));
  base.position.y = H0 / 2;
  g.add(base);
  const corn = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.5, 10.0), MAT.calcario);
  corn.position.y = TOPO + 0.25;
  g.add(corn);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.9, 2.8, 4), MAT.telhado);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = TOPO + 0.5 + 1.4;
  g.add(roof);
  const pin = pinnacle();
  pin.position.y = TOPO + 0.5;
  pin.position.x = 0;
  g.add(pin);
  g.position.set(x, 0, z);
  scene.add(g);
  addBoxCollider(x, z, 9.8, 9.8);
}

// ---------- Fachada monumental (face ao Largo) ----------
function buildFacade(scene) {
  const g = new THREE.Group();
  const zF = -38.5;                       // plano das alas laterais
  const zC = -40.1;                       // corpo central avançado

  // ----- alas laterais -----
  const slab = new THREE.Mesh(new THREE.BoxGeometry(56, TOPO, 1.6), sizedStone(TEX.limeFacade, 56, TOPO));
  slab.position.set(0, TOPO / 2, zF + 0.8);
  g.add(slab);
  // térreo rusticado
  const rustStrip = new THREE.Mesh(new THREE.BoxGeometry(56.3, H0, 1.8), sizedStone(TEX.rust, 56.3, H0, { bumpScale: 1.0 }));
  rustStrip.position.set(0, H0 / 2, zF + 0.8);
  g.add(rustStrip);
  // cunhais rusticados nos cantos
  for (const qx of [-27.6, 27.6]) {
    const quoin = new THREE.Mesh(new THREE.BoxGeometry(1.6, TOPO, 2.1), sizedStone(TEX.rust, 1.6, TOPO, { bumpScale: 1.0 }));
    quoin.position.set(qx, TOPO / 2, zF + 0.8);
    g.add(quoin);
  }

  // janelas das alas: térreo c/ grade, P1 nobre, P2, P3 sótão
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const wx = lado * (14.8 + i * 3.5);
      const rows = [
        [H0 * 0.55, 1.6, 2.2, MAT.janelaGrade],
        [H0 + C1 + P1 / 2, 1.8, 2.9, MAT.janelaArco],
        [H0 + C1 + P1 + P2 / 2, 1.7, 2.4, MAT.janela],
        [H0 + C1 + P1 + P2 + C2 + P3 / 2, 1.3, 1.5, MAT.janela],
      ];
      for (const [wy, ww, wh, mat] of rows) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), mat);
        win.position.set(wx, wy, zF - 0.02);
        win.rotation.y = Math.PI;
        g.add(win);
      }
      // pequeno frontão triangular sobre as janelas nobres (P1)
      const ped = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 4), MAT.calcario);
      ped.rotation.y = Math.PI / 4;
      ped.scale.z = 0.25;
      ped.position.set(wx, H0 + C1 + P1 / 2 + 1.75, zF - 0.05);
      g.add(ped);
    }
  }

  // cornijas das alas
  const cornInt = new THREE.Mesh(new THREE.BoxGeometry(56.4, C2, 2.0), MAT.calcario);
  cornInt.position.set(0, H0 + C1 + P1 + P2 + C2 / 2, zF + 0.8);
  g.add(cornInt);
  const cornTop = new THREE.Mesh(new THREE.BoxGeometry(56.8, 0.6, 2.3), MAT.calcario);
  cornTop.position.set(0, TOPO + 0.3, zF + 0.8);
  g.add(cornTop);
  // platibanda com pináculos
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(56.4, 0.9, 1.0), MAT.calcario);
  parapet.position.set(0, TOPO + 0.6 + 0.45, zF + 0.4);
  g.add(parapet);
  for (const px of [-27.6, -21, -14, 14, 21, 27.6]) {
    const pin = pinnacle();
    pin.position.set(px, TOPO + 1.5, zF + 0.4);
    g.add(pin);
  }

  // ----- corpo central com pórtico (com abertura real no eixo do portal) -----
  const corpoMat = sizedStone(TEX.limeFacade, 9.4, TOPO);
  for (const side of [-1, 1]) {
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(9.4, TOPO, 1.6), corpoMat);
    corpo.position.set(side * 7.3, TOPO / 2, zC + 0.8);
    g.add(corpo);
    const corpoRust = new THREE.Mesh(new THREE.BoxGeometry(9.6, H0 + 0.6, 1.8), sizedStone(TEX.rust, 9.6, H0 + 0.6, { bumpScale: 1.0 }));
    corpoRust.position.set(side * 7.3, (H0 + 0.6) / 2, zC + 0.8);
    g.add(corpoRust);
  }
  // verga sobre o vão central (da altura do arco ao topo)
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.2, TOPO - 6.0, 1.6), sizedStone(TEX.limeFacade, 5.2, TOPO - 6.0));
  lintel.position.set(0, 6.0 + (TOPO - 6.0) / 2, zC + 0.8);
  g.add(lintel);

  // três portais em arco
  const portalGeo = archPanelGeometry(7.0, H0 + 0.6, 0.8, 4.2, 5.2);
  for (const px of [-6.0, 0, 6.0]) {
    const portal = new THREE.Mesh(portalGeo, MAT.rusticado);
    portal.position.set(px, 0, zC - 0.9);
    g.add(portal);
    if (px !== 0) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 5.0), MAT.madeira);
      door.position.set(px, 2.5, zC - 0.5);
      door.rotation.y = Math.PI;
      g.add(door);
    }
    // sacada sobre cada portal
    const bal = balcony(3.4);
    bal.position.set(px, H0 + 0.85, zC - 1.0);
    bal.rotation.y = Math.PI;
    g.add(bal);
  }

  // sombra da loggia: escurece o plano de fundo da colunata (profundidade)
  const colH = P1 + P2 + C2;
  const loggia = new THREE.Mesh(
    new THREE.PlaneGeometry(22.5, colH + 1.2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 })
  );
  loggia.position.set(0, H0 + C1 + 0.8 + colH / 2, zC - 0.05);
  loggia.rotation.y = Math.PI;
  g.add(loggia);

  // ordem colossal: 6 colunas atravessando P1+P2
  const colGeo = new THREE.CylinderGeometry(0.52, 0.6, colH, 14);
  const plinthGeo = new THREE.BoxGeometry(1.5, 0.8, 1.5);
  const capGeo = new THREE.BoxGeometry(1.35, 0.5, 1.35);
  for (const cx of [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5]) {
    const plinth = new THREE.Mesh(plinthGeo, MAT.calcario);
    plinth.position.set(cx, H0 + C1 + 0.4, zC - 1.7);
    g.add(plinth);
    const col = new THREE.Mesh(colGeo, MAT.calcario);
    col.position.set(cx, H0 + C1 + 0.8 + colH / 2, zC - 1.7);
    g.add(col);
    const cap = new THREE.Mesh(capGeo, MAT.calcario);
    cap.position.set(cx, H0 + C1 + 0.8 + colH + 0.25, zC - 1.7);
    g.add(cap);
  }

  // janelões em arco atrás das colunas (P1) + janelas retas (P2)
  for (const wx of [0, -4.2, 4.2]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 4.6), MAT.janelaArco);
    win.position.set(wx, H0 + C1 + 0.8 + 2.5, zC - 0.02);
    win.rotation.y = Math.PI;
    g.add(win);
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.0), MAT.janela);
    win2.position.set(wx, H0 + C1 + P1 + P2 - 0.6, zC - 0.02);
    win2.rotation.y = Math.PI;
    g.add(win2);
  }

  // entablamento com a inscrição
  const entabY = H0 + C1 + 0.8 + colH + 0.5;
  const entab = new THREE.Mesh(new THREE.BoxGeometry(24.4, 1.5, 2.2), MAT.calcario);
  entab.position.set(0, entabY + 0.75, zC - 0.4);
  g.add(entab);
  const placaTex = inscriptionTexture(['FACVLDADE DE DIREITO']);
  const placa = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 1.25),
    new THREE.MeshStandardMaterial({ map: placaTex.map, roughness: 0.9 })
  );
  placa.position.set(0, entabY + 0.75, zC - 1.52);
  placa.rotation.y = Math.PI;
  g.add(placa);

  // frontão barroco com relógio e pináculos
  const frontao = new THREE.Mesh(frontaoGeometry(17, 4.8, 1.4), MAT.calcario);
  frontao.position.set(0, entabY + 1.5, zC - 0.6);
  g.add(frontao);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32), MAT.relogio);
  clock.position.set(0, entabY + 1.5 + 2.3, zC - 0.65);
  clock.rotation.y = Math.PI;
  g.add(clock);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.12, 8, 28), MAT.calcario);
  aro.position.set(0, entabY + 1.5 + 2.3, zC - 0.62);
  g.add(aro);
  for (const [px, py] of [[0, 4.9], [-6.8, 2.6], [6.8, 2.6]]) {
    const pin = pinnacle();
    pin.position.set(px, entabY + 1.5 + py, zC - 0.2);
    g.add(pin);
  }

  // telhado raso de ligação com a ala norte
  const ligacao = new THREE.Mesh(new THREE.BoxGeometry(56, 0.4, 4.6), sizedStone(TEX.roof, 56, 4.6, { bumpScale: 0.8 }, 2.9));
  ligacao.position.set(0, TOPO - 0.3, -36.2);
  g.add(ligacao);

  // escadaria rasa
  for (const [i, [w, d]] of [[18, 1.3], [20, 2.4]].entries()) {
    const degrau = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, d), MAT.calcarioPatio);
    degrau.position.set(0, 0.065 + (1 - i) * 0.12, zC - 1.8 - d / 2);
    g.add(degrau);
  }

  scene.add(g);

  // colisores
  addBoxCollider(-15.9, zF + 0.8, 24.2, 2.4);     // ala oeste
  addBoxCollider(15.9, zF + 0.8, 24.2, 2.4);      // ala leste
  addBoxCollider(-7.8, zC - 0.4, 11.6, 3.4);      // corpo central esq. (portal fechado)
  addBoxCollider(7.8, zC - 0.4, 11.6, 3.4);       // corpo central dir.
  for (const cx of [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5]) {
    colliders.circles.push({ x: cx, z: zC - 1.3, r: 0.7 });
  }
}

// ---------- Vestíbulo monumental (entre o portal do Largo e o Pátio) ----------
// Conforme a planta: hall no eixo da entrada com duas escadarias curvas
// simétricas, piso de mármore em xadrez e pé-direito duplo.
function buildHall(scene) {
  const g = new THREE.Group();
  const marble = marbleTexture();
  const matMarble = texturedMaterial(marble, 0.31, 0.31, { roughness: 0.35 });
  const zFront = -38.3, zBack = -30.0;            // do portal ao arco do pátio
  const halfW = 10.4;
  const len = zBack - zFront;                     // 8.3
  const zMid = (zFront + zBack) / 2;
  const ceilH = 8.4;

  // piso de mármore (repeat dimensionado: placa ~0,8m)
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 2, 0.14, len + 0.6),
    texturedMaterial(marble, (halfW * 2) / 3.2, (len + 0.6) / 3.2, { roughness: 0.35 })
  );
  floor.position.set(0, 0.07, zMid);
  g.add(floor);

  // paredes laterais com pilastras
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, ceilH, len), sizedStone(TEX.limePatio, len, ceilH));
    wall.position.set(side * halfW, ceilH / 2, zMid);
    g.add(wall);
    for (let i = 0; i < 3; i++) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.35, ceilH - 0.8, 0.8), MAT.calcario);
      pil.position.set(side * (halfW - 0.4), (ceilH - 0.8) / 2, zFront + 1.6 + i * 2.8);
      g.add(pil);
    }
  }
  // paredes de fundo ladeando o arco do pátio e a frente ladeando o portal
  for (const side of [-1, 1]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(halfW - 3.4, ceilH, 0.5), sizedStone(TEX.limePatio, halfW - 3.4, ceilH));
    back.position.set(side * (3.4 + (halfW - 3.4) / 2), ceilH / 2, zBack);
    g.add(back);
    const front = new THREE.Mesh(new THREE.BoxGeometry(halfW - 3.4, ceilH, 0.5), sizedStone(TEX.limePatio, halfW - 3.4, ceilH));
    front.position.set(side * (3.4 + (halfW - 3.4) / 2), ceilH / 2, zFront);
    g.add(front);
  }

  // forro com lanternim central iluminado
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 1, 0.5, len + 1), MAT.calcario);
  ceil.position.set(0, ceilH + 0.25, zMid);
  g.add(ceil);
  const sky = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2d0 })
  );
  sky.rotation.x = Math.PI / 2;
  sky.position.set(0, ceilH - 0.02, zMid);
  g.add(sky);
  const hallLight = new THREE.PointLight(0xffe2b0, 3.0, 26, 1.5);
  hallLight.position.set(0, ceilH - 1.5, zMid);
  g.add(hallLight);

  // escadarias gêmeas curvas (quarto de volta, espelhadas)
  const steps = 11, rise = 3.6 / steps, stepGeo = new THREE.BoxGeometry(2.3, 0.34, 1.15);
  for (const side of [-1, 1]) {
    const cx = side * 6.2, cz = zMid - 0.4, R = 3.1;
    for (let i = 0; i < steps; i++) {
      const a = (i / (steps - 1)) * (Math.PI / 2);   // 0 = de frente, 90° = junto à parede
      const step = new THREE.Mesh(stepGeo, matMarble);
      step.position.set(
        cx + side * Math.sin(a) * R * 0.4,
        rise * (i + 0.5),
        cz + Math.cos(a) * R - R * 0.4
      );
      step.rotation.y = side * a * 0.9;
      g.add(step);
    }
    // patamar superior com balaustrada
    const landing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 2.6), matMarble);
    landing.position.set(cx + side * 1.6, 3.6, zMid - 2.6);
    g.add(landing);
    const balGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.6, 6);
    for (let bi = 0; bi < 6; bi++) {
      const b = new THREE.Mesh(balGeo, MAT.calcario);
      b.position.set(cx + side * 1.6 - 1.5 + bi * 0.6, 4.1, zMid - 1.4);
      g.add(b);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.16), MAT.calcario);
    rail.position.set(cx + side * 1.6, 4.45, zMid - 1.4);
    g.add(rail);
  }

  // busto no nicho entre as escadas (homenagem aos fundadores)
  const nichePed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 1.1), MAT.calcario);
  nichePed.position.set(0, 0.75, zMid - 2.8);
  g.add(nichePed);
  const bust = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), MAT.bronze);
  bust.position.set(0, 1.85, zMid - 2.8);
  g.add(bust);

  scene.add(g);

  // colisores: paredes laterais, trechos de fundo/frente e escadas
  addBoxCollider(-halfW - 0.1, zMid, 0.7, len);
  addBoxCollider(halfW + 0.1, zMid, 0.7, len);
  for (const side of [-1, 1]) {
    addBoxCollider(side * (3.4 + (halfW - 3.4) / 2), zBack, halfW - 3.4, 0.6);
    addBoxCollider(side * (3.4 + (halfW - 3.4) / 2), zFront, halfW - 3.4, 0.6);
    colliders.circles.push({ x: side * 6.4, z: zMid - 1.2, r: 3.0 });
  }
  colliders.circles.push({ x: 0, z: zMid - 2.8, r: 0.9 });
}

// ---------- Alas ao redor do pátio ----------
function buildArcadas(scene) {
  const make = (rotY, px, pz, withGate, opts = {}) => {
    const g = new THREE.Group();
    if (withGate) {
      const a = buildWing(24);
      a.position.x = -16;
      const b = buildWing(24);
      b.position.x = 16;
      g.add(a, b);
      const gate = new THREE.Mesh(archPanelGeometry(8, H0, 1.0, 6.8, 4.6), MAT.rusticado);
      gate.position.set(0, 0, -0.4);
      g.add(gate);
      const upperH = P1 + P2 + C2 + P3;
      const sobre = new THREE.Mesh(new THREE.BoxGeometry(8, C1 + upperH, 4.9), sizedStone(TEX.limeFacade, 8, C1 + upperH));
      sobre.position.set(0, H0 + (C1 + upperH) / 2, -2.15);
      g.add(sobre);
    } else {
      g.add(buildWing(56, opts.depth));
    }
    g.rotation.y = rotY;
    g.position.set(px, 0, pz);
    scene.add(g);
  };

  // pesos conforme a planta: alas dos salões (sul e oeste) bem mais profundas
  make(0, 0, PATIO.minZ, true);                              // norte: entrada/galeria
  make(Math.PI, 0, PATIO.maxZ, false, { depth: 10.5 });      // sul (R. Cristóvão Colombo)
  make(Math.PI / 2, PATIO.minX, 0, false, { depth: 8.5 });   // oeste (R. Riachuelo)
  make(-Math.PI / 2, PATIO.maxX, 0, false, { depth: 4.9 });  // leste: galeria

  buildCorner(scene, -32, -32);
  buildCorner(scene, 32, -32);
  buildCorner(scene, -32, 32);
  buildCorner(scene, 32, 32);

  // colisores das paredes de fundo (galeria térrea transitável; o trecho
  // central da ala norte fica livre — é o vestíbulo monumental)
  addBoxCollider(-20, PATIO.minZ - 6.25, 18, 4.5);
  addBoxCollider(20, PATIO.minZ - 6.25, 18, 4.5);
  addBoxCollider(0, PATIO.maxZ + 6.25, 58, 4.5);
  addBoxCollider(PATIO.minX - 6.25, 0, 4.5, 58);
  addBoxCollider(PATIO.maxX + 6.25, 0, 4.5, 58);

  // pilares entre arcos
  const pierR = 0.5;
  for (let i = 0; i <= 14; i++) {
    const along = -28 + i * 4;
    if (Math.abs(along) >= 5) {
      colliders.circles.push({ x: along, z: PATIO.minZ, r: pierR });
    }
    colliders.circles.push({ x: along, z: PATIO.maxZ, r: pierR });
    colliders.circles.push({ x: PATIO.minX, z: along, r: pierR });
    colliders.circles.push({ x: PATIO.maxX, z: along, r: pierR });
  }
  colliders.circles.push({ x: -4.0, z: PATIO.minZ, r: 0.8 });
  colliders.circles.push({ x: 4.0, z: PATIO.minZ, r: 0.8 });
}

// ---------- Vegetação ----------
function buildTree(scene, x, z, purple = false, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 3.4 * scale, 7), MAT.tronco);
  trunk.position.y = 1.7 * scale;
  g.add(trunk);
  const mat = purple ? MAT.folhaRoxa : MAT.folha;
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry((1.6 - i * 0.25) * scale, 0), mat);
    blob.position.set((Math.random() - 0.5) * 1.4 * scale, (3.6 + i * 1.0) * scale, (Math.random() - 0.5) * 1.4 * scale);
    g.add(blob);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  colliders.circles.push({ x, z, r: 0.6 * scale });
}

// Palmeira imperial (como nas fotos do Largo)
function buildPalm(scene, x, z, h = 8) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.30, h, 8), MAT.troncoPalmeira);
  trunk.position.y = h / 2;
  g.add(trunk);
  // anéis do estipe
  for (let i = 1; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17 + (1 - i / 6) * 0.1, 0.02, 5, 10), MAT.tronco);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = (h / 6) * i;
    g.add(ring);
  }
  // coroa de folhas arqueadas
  const frondGeo = new THREE.ConeGeometry(0.45, 3.4, 4);
  frondGeo.translate(0, -1.7, 0);
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    const frond = new THREE.Mesh(frondGeo, MAT.folhaPalmeira);
    frond.scale.set(1, 1, 0.22);
    frond.position.set(0, h + 0.2, 0);
    frond.rotation.z = Math.PI / 2 - 0.55 - Math.random() * 0.25; // arqueia para fora
    frond.rotation.y = ang;
    frond.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0);
    const pivot = new THREE.Group();
    pivot.position.set(0, h + 0.2, 0);
    pivot.rotation.y = ang;
    frond.position.set(1.2, 0.35, 0);
    frond.rotation.set(0, 0, -0.9 - Math.random() * 0.3);
    pivot.add(frond);
    g.add(pivot);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  colliders.circles.push({ x, z, r: 0.4 });
}

function buildLamp(scene, x, z) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.6, 6), MAT.ferro);
  post.position.y = 1.8;
  g.add(post);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshLambertMaterial({ color: 0xffe9b0, emissive: 0x000000 }));
  head.position.y = 3.7;
  g.add(head);
  g.position.set(x, 0, z);
  scene.add(g);
  colliders.circles.push({ x, z, r: 0.25 });
  return head.material;
}

function buildFountain(scene, x, z) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.9, 24), MAT.calcarioPatio);
  base.position.y = 0.45;
  g.add(base);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.25, 24), MAT.agua);
  water.position.y = 0.95;
  g.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 12), MAT.calcario);
  column.position.y = 2.0;
  g.add(column);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 0.5, 16), MAT.calcario);
  bowl.position.y = 3.2;
  g.add(bowl);
  g.position.set(x, 0, z);
  scene.add(g);
  colliders.circles.push({ x, z, r: 4.7 });
  return { x, z, r: 7 };
}

function buildMonument(scene) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), MAT.calcarioPatio);
  ped.position.y = 1.1;
  g.add(ped);
  const figure = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 2.6, 8), MAT.bronze);
  figure.position.y = 3.5;
  g.add(figure);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), MAT.bronze);
  head.position.y = 5.1;
  g.add(head);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.08), MAT.bronze);
  beam.position.y = 4.4;
  g.add(beam);
  scene.add(g);
  colliders.circles.push({ x: 0, z: 0, r: 2.2 });
}

function buildChurch(scene) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(16, 11, 24), MAT.igreja);
  body.position.set(0, 5.5, 0);
  g.add(body);
  const soco = new THREE.Mesh(new THREE.BoxGeometry(16.4, 1.6, 24.4), MAT.rusticado);
  soco.position.y = 0.8;
  g.add(soco);
  const roof = roofPrism(24.5, 17, 4.4);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(0, 11, 0);
  g.add(roof);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 17, 5), MAT.igreja);
  tower.position.set(6.5, 8.5, 10);
  g.add(tower);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 4, 4), MAT.telhado);
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.position.set(6.5, 19, 10);
  g.add(towerRoof);
  for (const ang of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), MAT.janelaArco);
    win.position.set(6.5 + Math.sin(ang) * 2.55, 14.5, 10 + Math.cos(ang) * 2.55);
    win.rotation.y = ang;
    g.add(win);
  }
  const cross = new THREE.Group();
  const cv = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), MAT.ferro);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.18), MAT.ferro);
  ch.position.y = 0.3;
  cross.add(cv, ch);
  cross.position.set(6.5, 21.8, 10);
  g.add(cross);
  const portal = new THREE.Mesh(archPanelGeometry(6, 6, 0.5, 3, 5), MAT.rusticado);
  portal.position.set(8 - 0.2, 0, -6);
  portal.rotation.y = Math.PI / 2;
  g.add(portal);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 4.6), MAT.madeira);
  door.position.set(8.15, 2.3, -3);
  door.rotation.y = Math.PI / 2;
  g.add(door);
  for (const wz of [-8, 0, 8]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), MAT.janelaArco);
    win.position.set(8.05, 6.5, wz);
    win.rotation.y = Math.PI / 2;
    g.add(win);
  }

  g.position.set(-36, 0, -66);
  scene.add(g);
  addBoxCollider(-36, -66, 17, 25);
  addBoxCollider(-36 + 6.5, -66 + 10, 6, 6);
}

// ---------- Monta o mundo ----------
export function buildWorld(scene) {
  const patioFloor = new THREE.Mesh(new THREE.BoxGeometry(78, 0.2, 78), MAT.chaoPatio);
  patioFloor.position.y = -0.1;
  scene.add(patioFloor);
  const largoFloor = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, 64), MAT.chaoLargo);
  largoFloor.position.set(0, -0.11, -66);
  scene.add(largoFloor);

  buildArcadas(scene);
  buildFacade(scene);
  buildHall(scene);
  buildMonument(scene);
  buildChurch(scene);

  const fountainZone = buildFountain(scene, 8, -66);

  // árvores do pátio (versão mágica) e do largo
  buildTree(scene, -20, -18); buildTree(scene, 20, 18, true);
  buildTree(scene, -12, 6); buildTree(scene, 14, -4);
  buildTree(scene, 28, -82, false, 1.3); buildTree(scene, -8, -84);

  // palmeiras imperiais diante da fachada e pelo largo (como nas fotos)
  buildPalm(scene, -10, -44, 8.5); buildPalm(scene, 10, -44, 9);
  buildPalm(scene, -18, -46, 7.5); buildPalm(scene, 18, -46, 8);
  buildPalm(scene, -30, -52, 9); buildPalm(scene, 30, -56, 8.5);
  buildPalm(scene, 22, -64, 7.5); buildPalm(scene, -16, -74, 8);
  buildPalm(scene, 34, -78, 9); buildPalm(scene, 2, -80, 7);

  const lampMats = [];
  [[-14, -14], [14, -14], [-14, 14], [14, 14],
   [-10, -45], [10, -45], [-20, -70], [20, -75], [0, -88], [36, -62]]
    .forEach(([x, z]) => lampMats.push(buildLamp(scene, x, z)));

  const nightLights = [];
  [[0, -14], [0, 14], [8, -66], [0, -45]].forEach(([x, z]) => {
    const l = new THREE.PointLight(0xffd9a0, 0, 22, 1.8);
    l.position.set(x, 4, z);
    scene.add(l);
    nightLights.push(l);
  });

  const benchGeo = new THREE.BoxGeometry(2.4, 0.45, 0.7);
  [[-8, -22, 0], [8, -22, 0], [-22, 8, Math.PI / 2], [22, -8, Math.PI / 2], [-10, -60, 0.4], [16, -78, -0.7]]
    .forEach(([x, z, ry]) => {
      const b = new THREE.Mesh(benchGeo, MAT.madeira);
      b.position.set(x, 0.35, z);
      b.rotation.y = ry;
      scene.add(b);
      colliders.circles.push({ x, z, r: 1.1 });
    });

  const mkWall = (cx, cz, sx, sz) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, 3, sz), sizedStone(TEX.limePatio, Math.max(sx, sz), 3));
    w.position.set(cx, 1.5, cz);
    scene.add(w);
    addBoxCollider(cx, cz, sx, sz);
  };
  mkWall(0, LARGO.minZ - 1, 100, 2);
  mkWall(LARGO.minX - 1, -66, 2, 58);
  mkWall(LARGO.maxX + 1, -66, 2, 58);
  mkWall(-26, LARGO.maxZ + 1, 40, 2);
  mkWall(26, LARGO.maxZ + 1, 40, 2);

  const cityMat = new THREE.MeshLambertMaterial({ color: 0x4a4a55 });
  for (let i = 0; i < 14; i++) {
    const h = 14 + Math.random() * 26;
    const b = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 8, h, 8 + Math.random() * 8), cityMat);
    const ang = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * 50;
    b.position.set(Math.cos(ang) * dist, h / 2 - 2, Math.sin(ang) * dist - 30);
    scene.add(b);
  }

  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  patioFloor.castShadow = false;
  largoFloor.castShadow = false;

  return { fountainZone, lampMats, nightLights, waterMat: MAT.agua };
}

// ---------- Colisão do jogador ----------
export function resolveCollisions(pos, r) {
  const inLargo = pos.z < PATIO.minZ - 8;
  // passagem livre: portal externo + vestíbulo monumental + arco do pátio
  const inGate =
    (Math.abs(pos.x) < 3.4 && pos.z >= PATIO.minZ - 12 && pos.z <= PATIO.minZ + 1) ||
    (Math.abs(pos.x) < 10.2 && pos.z >= PATIO.minZ - 8.2 && pos.z <= PATIO.minZ + 0.4);
  if (!inGate) {
    if (pos.z >= PATIO.minZ - 1) {
      pos.x = Math.max(PATIO.minX - 7.5 + r, Math.min(PATIO.maxX + 7.5 - r, pos.x));
      pos.z = Math.max(PATIO.minZ - 7.5 + r, Math.min(PATIO.maxZ + 7.5 - r, pos.z));
    } else if (inLargo) {
      pos.x = Math.max(LARGO.minX + r, Math.min(LARGO.maxX - r, pos.x));
      pos.z = Math.max(LARGO.minZ + r, Math.min(LARGO.maxZ - r, pos.z));
    }
  }

  for (const b of colliders.boxes) {
    const nx = Math.max(b.minX, Math.min(b.maxX, pos.x));
    const nz = Math.max(b.minZ, Math.min(b.maxZ, pos.z));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * r;
        pos.z = nz + (dz / d) * r;
      } else {
        const pushL = pos.x - b.minX, pushR = b.maxX - pos.x;
        const pushB = pos.z - b.minZ, pushF = b.maxZ - pos.z;
        const m = Math.min(pushL, pushR, pushB, pushF);
        if (m === pushL) pos.x = b.minX - r;
        else if (m === pushR) pos.x = b.maxX + r;
        else if (m === pushB) pos.z = b.minZ - r;
        else pos.z = b.maxZ + r;
      }
    }
  }

  for (const c of colliders.circles) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const d2 = dx * dx + dz * dz;
    const min = r + c.r;
    if (d2 < min * min && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }
}
