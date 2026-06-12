// Cenário: Pátio das Arcadas (arcadas em dois pavimentos, torreões), fachada
// monumental neocolonial voltada ao Largo de São Francisco, chafariz e igreja.
import * as THREE from 'three';
import {
  stoneTexture, roofTexture, flagstoneTexture, cobbleTexture,
  woodTexture, windowTexture, inscriptionTexture, texturedMaterial,
} from './textures.js';

export const PATIO = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
export const LARGO = { minX: -45, maxX: 45, minZ: -92, maxZ: -38 };

// ---------- Texturas geradas uma única vez ----------
const TEX = {
  wall: stoneTexture('wall'),
  rustic: stoneTexture('rustic'),
  cream: stoneTexture('cream'),
  roof: roofTexture(),
  flag: flagstoneTexture(),
  cobble: cobbleTexture(),
  wood: woodTexture(),
  win: windowTexture(),
  winArch: windowTexture(true),
};

// Materiais (repeat por metro: textura cobre ~4m)
const MAT = {
  pedraArcada: texturedMaterial(TEX.wall, 0.25, 0.25),
  pedraClara: texturedMaterial(TEX.cream, 0.25, 0.25),
  pedraRustica: texturedMaterial(TEX.rustic, 0.2, 0.2, { bumpScale: 1.2 }),
  telhado: texturedMaterial(TEX.roof, 0.5, 0.5),
  chaoPatio: texturedMaterial(TEX.flag, 0.33, 0.33),
  chaoLargo: texturedMaterial(TEX.cobble, 0.25, 0.25),
  madeira: new THREE.MeshStandardMaterial({ map: TEX.wood.map, roughness: 0.85 }),
  janela: new THREE.MeshStandardMaterial({ map: TEX.win.map, roughness: 0.25, metalness: 0.1 }),
  janelaArco: new THREE.MeshStandardMaterial({ map: TEX.winArch.map, roughness: 0.25, metalness: 0.1 }),
  agua: new THREE.MeshPhongMaterial({ color: 0x3a6e8f, shininess: 120, transparent: true, opacity: 0.85 }),
  ferro: new THREE.MeshStandardMaterial({ color: 0x23232a, roughness: 0.6, metalness: 0.5 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x7a5c28, roughness: 0.45, metalness: 0.55 }),
  igreja: new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.9 }),
  tronco: new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 1 }),
  folha: new THREE.MeshLambertMaterial({ color: 0x3e6b35 }),
  folhaRoxa: new THREE.MeshLambertMaterial({ color: 0x7a5a9e }),
};

// ---------- Colisores ----------
export const colliders = { boxes: [], circles: [] };

function addBoxCollider(cx, cz, sx, sz) {
  colliders.boxes.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
}

// ---------- Geometrias auxiliares ----------
// Painel de parede com vão em arco pleno
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

// Frontão barroco com curvas e contracurvas (neocolonial)
function frontaoGeometry(w, h, depth) {
  const s = new THREE.Shape();
  const hw = w / 2;
  s.moveTo(-hw, 0);
  s.bezierCurveTo(-hw, h * 0.55, -hw * 0.62, h * 0.5, -hw * 0.45, h * 0.62);
  s.bezierCurveTo(-hw * 0.3, h * 0.72, -hw * 0.22, h * 0.92, 0, h);
  s.bezierCurveTo(hw * 0.22, h * 0.92, hw * 0.3, h * 0.72, hw * 0.45, h * 0.62);
  s.bezierCurveTo(hw * 0.62, h * 0.5, hw, h * 0.55, hw, 0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

// Telhado de duas águas (prisma triangular) ao longo do eixo X local
function roofPrism(length, width, height) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.rotateY(Math.PI / 2);                 // extrusão +Z -> +X
  g.translate(-length / 2, 0, 0);         // centraliza
  const mesh = new THREE.Mesh(g, MAT.telhado);
  return mesh;
}

// ---------- Ala das Arcadas: dois pavimentos de arcos ----------
const H1 = 5.0;   // pé-direito do térreo
const H2 = 4.4;   // pavimento superior

function buildWing(length) {
  const wing = new THREE.Group();
  const panelW = 4;
  const count = Math.round(length / panelW);

  // térreo: arcada de pedra
  const arcGeoBaixo = archPanelGeometry(panelW, H1, 0.6, 2.7, 3.9);
  // superior: arcada mais leve, pedra clara
  const arcGeoCima = archPanelGeometry(panelW, H2, 0.5, 2.0, 3.3);

  for (let i = 0; i < count; i++) {
    const x = -length / 2 + panelW * (i + 0.5);
    const baixo = new THREE.Mesh(arcGeoBaixo, MAT.pedraArcada);
    baixo.position.set(x, 0, 0);
    wing.add(baixo);
    const cima = new THREE.Mesh(arcGeoCima, MAT.pedraClara);
    cima.position.set(x, H1 + 0.4, 0.05);
    wing.add(cima);
  }

  // cornija entre pavimentos
  const cornija1 = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 0.4, 1.0), MAT.pedraClara);
  cornija1.position.set(0, H1 + 0.2, 0.1);
  wing.add(cornija1);

  // guarda-corpo do pavimento superior (parapeito dentro dos arcos)
  const parapeito = new THREE.Mesh(new THREE.BoxGeometry(length, 1.0, 0.25), MAT.pedraClara);
  parapeito.position.set(0, H1 + 0.4 + 0.5, 0.32);
  wing.add(parapeito);

  // parede de fundo da galeria (dois pavimentos)
  const fundo = new THREE.Mesh(new THREE.BoxGeometry(length, H1 + 0.4 + H2, 0.5), MAT.pedraClara);
  fundo.position.set(0, (H1 + 0.4 + H2) / 2, -4.25);
  wing.add(fundo);

  // piso da galeria superior
  const laje = new THREE.Mesh(new THREE.BoxGeometry(length, 0.35, 4.6), MAT.pedraClara);
  laje.position.set(0, H1 + 0.2, -2.1);
  wing.add(laje);

  // cornija superior
  const topo = H1 + 0.4 + H2;
  const cornija2 = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.5, 5.6), MAT.pedraClara);
  cornija2.position.set(0, topo + 0.25, -1.9);
  wing.add(cornija2);

  // telhado de duas águas com telhas coloniais
  const roof = roofPrism(length + 0.8, 7.2, 2.6);
  roof.position.set(0, topo + 0.5, -1.9);
  roof.rotateY(0); // eixo já em X
  wing.add(roof);

  return wing;
}

// Torreão de canto (pavilhão com coruchéu piramidal)
function buildTower(scene, x, z) {
  const g = new THREE.Group();
  const h = H1 + 0.4 + H2 + 1.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(9, h, 9), MAT.pedraClara);
  body.position.y = h / 2;
  g.add(body);
  // base rústica
  const base = new THREE.Mesh(new THREE.BoxGeometry(9.4, 2.2, 9.4), MAT.pedraRustica);
  base.position.y = 1.1;
  g.add(base);
  // janelas em arco nas faces superiores
  const winGeo = new THREE.PlaneGeometry(1.5, 2.4);
  for (let f = 0; f < 4; f++) {
    const ang = (f * Math.PI) / 2;
    const win = new THREE.Mesh(winGeo, MAT.janelaArco);
    win.position.set(Math.sin(ang) * 4.55, h - 3, Math.cos(ang) * 4.55);
    win.rotation.y = ang;
    g.add(win);
  }
  // cornija + coruchéu
  const corn = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.5, 9.8), MAT.pedraClara);
  corn.position.y = h + 0.25;
  g.add(corn);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3.4, 4), MAT.telhado);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = h + 0.5 + 1.7;
  g.add(roof);

  g.position.set(x, 0, z);
  scene.add(g);
  addBoxCollider(x, z, 9.4, 9.4);
}

// ---------- Fachada monumental (face ao Largo) ----------
function buildFacade(scene) {
  const g = new THREE.Group();
  const zFace = -38.5;          // plano principal
  const altura = 12.2;

  // corpo principal da fachada (duas alas laterais)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(56, altura, 1.5), MAT.pedraClara);
  slab.position.set(0, altura / 2, zFace + 0.75);
  g.add(slab);

  // embasamento rústico contínuo
  const baseStrip = new THREE.Mesh(new THREE.BoxGeometry(56.4, 1.6, 1.7), MAT.pedraRustica);
  baseStrip.position.set(0, 0.8, zFace + 0.75);
  g.add(baseStrip);

  // corpo central avançado (avant-corps)
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(24, altura, 1.6), MAT.pedraClara);
  corpo.position.set(0, altura / 2, zFace - 0.8);
  g.add(corpo);

  // três portais em arco com moldura rústica
  const portalGeo = archPanelGeometry(7.2, 6.4, 0.7, 4.4, 5.6);
  for (const px of [-7.5, 0, 7.5]) {
    const portal = new THREE.Mesh(portalGeo, MAT.pedraRustica);
    portal.position.set(px, 0, zFace - 1.75);
    g.add(portal);
    if (px !== 0) {
      // portas de madeira fechadas nos portais laterais
      const door = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.4), MAT.madeira);
      door.position.set(px, 2.7, zFace - 1.4);
      door.rotation.y = Math.PI;
      g.add(door);
    }
  }

  // colunas neoclássicas engajadas entre os portais
  const colGeo = new THREE.CylinderGeometry(0.45, 0.5, 6.4, 12);
  const capGeo = new THREE.BoxGeometry(1.3, 0.5, 1.3);
  for (const cx of [-11.2, -3.75, 3.75, 11.2]) {
    const col = new THREE.Mesh(colGeo, MAT.pedraClara);
    col.position.set(cx, 3.2, zFace - 2.0);
    g.add(col);
    const cap = new THREE.Mesh(capGeo, MAT.pedraClara);
    cap.position.set(cx, 6.65, zFace - 2.0);
    g.add(cap);
  }

  // entablamento com inscrição
  const entab = new THREE.Mesh(new THREE.BoxGeometry(24.4, 1.6, 1.8), MAT.pedraClara);
  entab.position.set(0, 7.6, zFace - 0.85);
  g.add(entab);
  const placaTex = inscriptionTexture(['FACVLDADE DE DIREITO']);
  const placa = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 1.3),
    new THREE.MeshStandardMaterial({ map: placaTex.map, roughness: 0.9 })
  );
  placa.position.set(0, 7.6, zFace - 1.78);
  placa.rotation.y = Math.PI;
  g.add(placa);

  // pavimento superior do corpo central: três janelões em arco
  for (const wx of [-6.5, 0, 6.5]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), MAT.janelaArco);
    win.position.set(wx, 10.1, zFace - 1.62);
    win.rotation.y = Math.PI;
    g.add(win);
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 0.25), MAT.pedraArcada);
    moldura.position.set(wx, 10.1, zFace - 1.45);
    g.add(moldura);
  }

  // janelas das alas laterais (dois pavimentos)
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const wx = lado * (15.5 + i * 3.4);
      for (const [wy, geoH] of [[3.4, 2.8], [9.4, 2.6]]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.7, geoH), MAT.janela);
        win.position.set(wx, wy, zFace - 0.05);
        win.rotation.y = Math.PI;
        g.add(win);
        const verga = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.35, 0.3), MAT.pedraArcada);
        verga.position.set(wx, wy + geoH / 2 + 0.2, zFace - 0.05);
        g.add(verga);
      }
    }
  }

  // cornija de coroamento + frontão barroco com medalhão de bronze
  const cornija = new THREE.Mesh(new THREE.BoxGeometry(57, 0.6, 2.2), MAT.pedraClara);
  cornija.position.set(0, altura + 0.3, zFace + 0.7);
  g.add(cornija);
  const frontao = new THREE.Mesh(frontaoGeometry(16, 4.6, 1.2), MAT.pedraClara);
  frontao.position.set(0, altura + 0.6, zFace - 1.0);
  g.add(frontao);
  const medalhao = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 24), MAT.bronze);
  medalhao.rotation.x = Math.PI / 2;
  medalhao.position.set(0, altura + 2.6, zFace - 1.15);
  g.add(medalhao);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 8, 24), MAT.pedraClara);
  aro.position.copy(medalhao.position);
  g.add(aro);

  // telhado raso ligando fachada à ala norte
  const ligacao = new THREE.Mesh(new THREE.BoxGeometry(56, 0.4, 5.0), MAT.telhado);
  ligacao.position.set(0, altura - 0.4, -36);
  g.add(ligacao);

  // escadaria rasa diante dos portais
  for (const [i, [w, d]] of [[16, 1.2], [18, 2.2]].entries()) {
    const degrau = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), MAT.pedraRustica);
    degrau.position.set(0, 0.07 + (1 - i) * 0.13, zFace - 2.4 - d / 2);
    g.add(degrau);
  }

  scene.add(g);

  // colisores: alas laterais + corpo central (vão livre no portal central)
  addBoxCollider(-15.9, zFace + 0.75, 24.2, 2.2);   // ala oeste da fachada
  addBoxCollider(15.9, zFace + 0.75, 24.2, 2.2);    // ala leste
  addBoxCollider(-7.9, zFace - 0.9, 11.2, 2.8);     // corpo central esq. (portal lateral fechado)
  addBoxCollider(7.9, zFace - 0.9, 11.2, 2.8);      // corpo central dir.
  // colunas
  for (const cx of [-11.2, -3.75, 3.75, 11.2]) {
    colliders.circles.push({ x: cx, z: zFace - 2.0, r: 0.6 });
  }
}

// ---------- Posiciona as alas ao redor do pátio ----------
function buildArcadas(scene) {
  const make = (rotY, px, pz, withGate) => {
    const g = new THREE.Group();
    if (withGate) {
      const a = buildWing(24);
      a.position.x = -16;
      const b = buildWing(24);
      b.position.x = 16;
      g.add(a, b);
      // arco monumental interno sobre o portão
      const gate = new THREE.Mesh(archPanelGeometry(8, H1 + 0.4, 1.0, 6.8, 4.9), MAT.pedraRustica);
      gate.position.set(0, 0, -0.4);
      g.add(gate);
      // corpo sobre o vão (sustenta o pavimento superior)
      const sobre = new THREE.Mesh(new THREE.BoxGeometry(8, H2 + 0.4, 4.8), MAT.pedraClara);
      sobre.position.set(0, H1 + 0.4 + (H2 + 0.4) / 2 - 0.2, -2.2);
      g.add(sobre);
    } else {
      g.add(buildWing(56));
    }
    g.rotation.y = rotY;
    g.position.set(px, 0, pz);
    scene.add(g);
  };

  make(0, 0, PATIO.minZ, true);             // norte (portão para o Largo)
  make(Math.PI, 0, PATIO.maxZ, false);      // sul
  make(Math.PI / 2, PATIO.minX, 0, false);  // oeste
  make(-Math.PI / 2, PATIO.maxX, 0, false); // leste

  // torreões nos quatro cantos
  buildTower(scene, -32, -32);
  buildTower(scene, 32, -32);
  buildTower(scene, -32, 32);
  buildTower(scene, 32, 32);

  // colisores das paredes de fundo (galeria térrea transitável)
  addBoxCollider(-16, PATIO.minZ - 6.25, 26, 4.5);
  addBoxCollider(16, PATIO.minZ - 6.25, 26, 4.5);
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
  // ombreiras do portão interno
  colliders.circles.push({ x: -4.0, z: PATIO.minZ, r: 0.8 });
  colliders.circles.push({ x: 4.0, z: PATIO.minZ, r: 0.8 });
}

// ---------- Elementos do Largo ----------
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
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.9, 24), MAT.pedraRustica);
  base.position.y = 0.45;
  g.add(base);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.25, 24), MAT.agua);
  water.position.y = 0.95;
  g.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 12), MAT.pedraClara);
  column.position.y = 2.0;
  g.add(column);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 0.5, 16), MAT.pedraClara);
  bowl.position.y = 3.2;
  g.add(bowl);
  g.position.set(x, 0, z);
  scene.add(g);
  colliders.circles.push({ x, z, r: 4.7 });
  return { x, z, r: 7 };
}

function buildMonument(scene) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), MAT.pedraRustica);
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
  // soco de pedra
  const soco = new THREE.Mesh(new THREE.BoxGeometry(16.4, 1.6, 24.4), MAT.pedraRustica);
  soco.position.y = 0.8;
  g.add(soco);
  const roof = roofPrism(24.5, 17, 4.4);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(0, 11, 0);
  g.add(roof);
  // torre sineira
  const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 17, 5), MAT.igreja);
  tower.position.set(6.5, 8.5, 10);
  g.add(tower);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 4, 4), MAT.telhado);
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.position.set(6.5, 19, 10);
  g.add(towerRoof);
  // sineira: aberturas em arco
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
  // portal com porta de madeira
  const portal = new THREE.Mesh(archPanelGeometry(6, 6, 0.5, 3, 5), MAT.pedraRustica);
  portal.position.set(8 - 0.2, 0, -6);
  portal.rotation.y = Math.PI / 2;
  g.add(portal);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 4.6), MAT.madeira);
  door.position.set(8.15, 2.3, -3);
  door.rotation.y = Math.PI / 2;
  g.add(door);
  // janelas laterais
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
  // pisos
  const patioFloor = new THREE.Mesh(new THREE.BoxGeometry(78, 0.2, 78), MAT.chaoPatio);
  patioFloor.position.y = -0.1;
  scene.add(patioFloor);
  const largoFloor = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, 64), MAT.chaoLargo);
  largoFloor.position.set(0, -0.11, -66);
  scene.add(largoFloor);

  buildArcadas(scene);
  buildFacade(scene);
  buildMonument(scene);
  buildChurch(scene);

  const fountainZone = buildFountain(scene, 8, -66);

  buildTree(scene, -20, -18); buildTree(scene, 20, -18, true);
  buildTree(scene, -20, 18, true); buildTree(scene, 20, 18);
  buildTree(scene, -12, 6); buildTree(scene, 14, -4);
  buildTree(scene, -28, -58, true, 1.2); buildTree(scene, 28, -82, false, 1.3);
  buildTree(scene, 34, -52, true); buildTree(scene, -8, -84);
  buildTree(scene, 22, -64);

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

  // bancos
  const benchGeo = new THREE.BoxGeometry(2.4, 0.45, 0.7);
  [[-8, -22, 0], [8, -22, 0], [-22, 8, Math.PI / 2], [22, -8, Math.PI / 2], [-10, -60, 0.4], [16, -78, -0.7]]
    .forEach(([x, z, ry]) => {
      const b = new THREE.Mesh(benchGeo, MAT.madeira);
      b.position.set(x, 0.35, z);
      b.rotation.y = ry;
      scene.add(b);
      colliders.circles.push({ x, z, r: 1.1 });
    });

  // muros externos do Largo
  const mkWall = (cx, cz, sx, sz) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, 3, sz), MAT.pedraArcada);
    w.position.set(cx, 1.5, cz);
    scene.add(w);
    addBoxCollider(cx, cz, sx, sz);
  };
  mkWall(0, LARGO.minZ - 1, 100, 2);
  mkWall(LARGO.minX - 1, -66, 2, 58);
  mkWall(LARGO.maxX + 1, -66, 2, 58);
  mkWall(-26, LARGO.maxZ + 1, 40, 2);
  mkWall(26, LARGO.maxZ + 1, 40, 2);

  // skyline distante
  const cityMat = new THREE.MeshLambertMaterial({ color: 0x4a4a55 });
  for (let i = 0; i < 14; i++) {
    const h = 14 + Math.random() * 26;
    const b = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 8, h, 8 + Math.random() * 8), cityMat);
    const ang = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * 50;
    b.position.set(Math.cos(ang) * dist, h / 2 - 2, Math.sin(ang) * dist - 30);
    scene.add(b);
  }

  // sombras: tudo que é cenário projeta e recebe
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
  const inGate = Math.abs(pos.x) < 3.4 && pos.z >= PATIO.minZ - 11 && pos.z <= PATIO.minZ + 1;
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
