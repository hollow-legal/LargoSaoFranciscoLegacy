// Constrói o cenário: Pátio das Arcadas, Largo de São Francisco e Igreja.
import * as THREE from 'three';

export const PATIO = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
export const LARGO = { minX: -45, maxX: 45, minZ: -92, maxZ: -38 };

// Materiais compartilhados (paleta neoclássica das Arcadas)
const MAT = {
  parede: new THREE.MeshLambertMaterial({ color: 0xd9c79a }),   // ocre claro
  paredeAlta: new THREE.MeshLambertMaterial({ color: 0xe6d6ae }),
  pedra: new THREE.MeshLambertMaterial({ color: 0x9a8f7d }),
  telhado: new THREE.MeshLambertMaterial({ color: 0x8a4a32 }),
  chao: new THREE.MeshLambertMaterial({ color: 0xb0a28a }),
  chaoLargo: new THREE.MeshLambertMaterial({ color: 0x8e8678 }),
  tronco: new THREE.MeshLambertMaterial({ color: 0x5a4430 }),
  folha: new THREE.MeshLambertMaterial({ color: 0x3e6b35 }),
  folhaRoxa: new THREE.MeshLambertMaterial({ color: 0x7a5a9e }),  // jacarandá em flor
  agua: new THREE.MeshPhongMaterial({ color: 0x3a6e8f, shininess: 120, transparent: true, opacity: 0.85 }),
  ferro: new THREE.MeshLambertMaterial({ color: 0x2a2a2e }),
  igreja: new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }),
  janela: new THREE.MeshLambertMaterial({ color: 0x33414f }),
  bronze: new THREE.MeshLambertMaterial({ color: 0x6e5a2e }),
};

// Colisores que o jogador respeita
export const colliders = {
  boxes: [],    // { minX, maxX, minZ, maxZ }
  circles: [],  // { x, z, r }
};

function addBoxCollider(cx, cz, sx, sz) {
  colliders.boxes.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
}

// Painel de parede com arco (estilo arcada)
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

// Uma ala do prédio: galeria de arcadas na frente, parede sólida atrás, andar superior, telhado
function buildWing(length, archCount) {
  const wing = new THREE.Group();
  const archW = 3.2, archH = 4.2, panelH = 5, panelW = length / archCount;
  const arcGeo = archPanelGeometry(panelW, panelH, 0.5, archW, archH);

  for (let i = 0; i < archCount; i++) {
    const x = -length / 2 + panelW * (i + 0.5);
    const panel = new THREE.Mesh(arcGeo, MAT.parede);
    panel.position.set(x, 0, 0); // shape centrado: cada painel fica no x do seu centro
    wing.add(panel);
  }

  // Andar superior com janelas
  const upper = new THREE.Mesh(new THREE.BoxGeometry(length, 4, 4.5), MAT.paredeAlta);
  upper.position.set(0, panelH + 2, -2);
  wing.add(upper);
  const winGeo = new THREE.BoxGeometry(1.2, 2.2, 0.15);
  for (let i = 0; i < archCount; i++) {
    const x = -length / 2 + panelW * (i + 0.5);
    const win = new THREE.Mesh(winGeo, MAT.janela);
    win.position.set(x, panelH + 2, 0.3);
    wing.add(win);
  }

  // Parede de fundo da galeria
  const back = new THREE.Mesh(new THREE.BoxGeometry(length, panelH, 0.5), MAT.parede);
  back.position.set(0, panelH / 2, -4.25);
  wing.add(back);

  // Telhado
  const roof = new THREE.Mesh(new THREE.BoxGeometry(length + 1, 0.6, 6.5), MAT.telhado);
  roof.position.set(0, panelH + 4.3, -1.75);
  wing.add(roof);

  // Cornija de pedra entre andares
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(length + 0.6, 0.35, 5.2), MAT.pedra);
  ledge.position.set(0, panelH + 0.1, -1.9);
  wing.add(ledge);

  return wing;
}

// Posiciona as quatro alas ao redor do pátio (abertura/portão na ala norte)
function buildArcadas(scene) {
  const L = 60; // comprimento de cada ala

  const make = (rotY, px, pz, withGate) => {
    if (withGate) {
      // duas metades com vão central de 8m (portão para o Largo)
      const g = new THREE.Group();
      const a = buildWing(25, 7);
      a.position.x = -17.5;
      const b = buildWing(25, 7);
      b.position.x = 17.5;
      g.add(a, b);
      // arco monumental sobre o portão
      const gate = new THREE.Mesh(archPanelGeometry(10, 8, 1.2, 7, 6.5), MAT.pedra);
      gate.position.set(0, 0, -0.3);
      g.add(gate);
      g.rotation.y = rotY;
      g.position.set(px, 0, pz);
      scene.add(g);
      return;
    }
    const w = buildWing(L, 15);
    w.rotation.y = rotY;
    w.position.set(px, 0, pz);
    scene.add(w);
  };

  // alas viradas para dentro do pátio
  make(0, 0, PATIO.minZ, true);            // norte (portão para o Largo)
  make(Math.PI, 0, PATIO.maxZ, false);     // sul
  make(Math.PI / 2, PATIO.minX, 0, false); // oeste
  make(-Math.PI / 2, PATIO.maxX, 0, false);// leste

  // Colisores das paredes de fundo (a galeria sob as arcadas fica transitável)
  addBoxCollider(-17.5, PATIO.minZ - 6.25, 27, 4.5);  // norte esq.
  addBoxCollider(17.5, PATIO.minZ - 6.25, 27, 4.5);   // norte dir.
  addBoxCollider(0, PATIO.maxZ + 6.25, 62, 4.5);      // sul
  addBoxCollider(PATIO.minX - 6.25, 0, 4.5, 62);      // oeste
  addBoxCollider(PATIO.maxX + 6.25, 0, 4.5, 62);      // leste

  // Pilares entre os arcos (colisores circulares na face interna)
  const pierR = 0.45;
  const addPiers = (side) => {
    const panelW = 4; // 60 / 15
    for (let i = 0; i <= 15; i++) {
      const along = -30 + i * panelW;
      if (side === 'n' && Math.abs(along) < 5) continue; // vão do portão
      if (side === 'n') colliders.circles.push({ x: along, z: PATIO.minZ, r: pierR });
      if (side === 's') colliders.circles.push({ x: along, z: PATIO.maxZ, r: pierR });
      if (side === 'w') colliders.circles.push({ x: PATIO.minX, z: along, r: pierR });
      if (side === 'e') colliders.circles.push({ x: PATIO.maxX, z: along, r: pierR });
    }
  };
  ['n', 's', 'w', 'e'].forEach(addPiers);
  // pilares do arco monumental do portão
  colliders.circles.push({ x: -4.2, z: PATIO.minZ, r: 0.7 });
  colliders.circles.push({ x: 4.2, z: PATIO.minZ, r: 0.7 });
}

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
  return head.material; // para acender à noite
}

// Chafariz do Largo
function buildFountain(scene, x, z) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.9, 24), MAT.pedra);
  base.position.y = 0.45;
  g.add(base);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.25, 24), MAT.agua);
  water.position.y = 0.95;
  g.add(water);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.4, 12), MAT.pedra);
  column.position.y = 2.0;
  g.add(column);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 0.5, 16), MAT.pedra);
  bowl.position.y = 3.2;
  g.add(bowl);
  g.position.set(x, 0, z);
  scene.add(g);
  colliders.circles.push({ x, z, r: 4.7 });
  return { x, z, r: 7 }; // zona de regeneração
}

// Monumento central do pátio (homenagem aos fundadores de 1827)
function buildMonument(scene) {
  const g = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), MAT.pedra);
  ped.position.y = 1.1;
  g.add(ped);
  const figure = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 2.6, 8), MAT.bronze);
  figure.position.y = 3.5;
  g.add(figure);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), MAT.bronze);
  head.position.y = 5.1;
  g.add(head);
  // balança da justiça estilizada
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.08), MAT.bronze);
  beam.position.y = 4.4;
  g.add(beam);
  scene.add(g);
  colliders.circles.push({ x: 0, z: 0, r: 2.2 });
}

// Igreja de São Francisco (silhueta colonial simplificada)
function buildChurch(scene) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(16, 11, 24), MAT.igreja);
  body.position.set(0, 5.5, 0);
  g.add(body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 9, 5, 4), MAT.telhado);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 1.6);
  roof.position.set(0, 13.5, 0);
  g.add(roof);
  // torre sineira
  const tower = new THREE.Mesh(new THREE.BoxGeometry(5, 17, 5), MAT.igreja);
  tower.position.set(6.5, 8.5, 10);
  g.add(tower);
  const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 3.8, 4, 4), MAT.telhado);
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.position.set(6.5, 19, 10);
  g.add(towerRoof);
  const cross = new THREE.Group();
  const cv = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), MAT.ferro);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.18), MAT.ferro);
  ch.position.y = 0.3;
  cross.add(cv, ch);
  cross.position.set(6.5, 21.8, 10);
  g.add(cross);
  // portal
  const portal = new THREE.Mesh(archPanelGeometry(6, 6, 0.4, 3, 5), MAT.pedra);
  portal.position.set(8 - 0.2, 0, -6);
  portal.rotation.y = Math.PI / 2;
  g.add(portal);

  g.position.set(-36, 0, -66);
  scene.add(g);
  addBoxCollider(-36, -66, 17, 25);
  addBoxCollider(-36 + 6.5, -66 + 10, 6, 6);
}

export function buildWorld(scene) {
  // Pisos
  const patioFloor = new THREE.Mesh(new THREE.BoxGeometry(78, 0.2, 78), MAT.chao);
  patioFloor.position.y = -0.1;
  scene.add(patioFloor);
  const largoFloor = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, 64), MAT.chaoLargo);
  largoFloor.position.set(0, -0.11, -66);
  scene.add(largoFloor);

  // Faixas de "calçada portuguesa" no Largo (detalhe visual)
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xa8a092 });
  for (let i = -4; i <= 4; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 54), stripeMat);
    s.position.set(i * 9, 0.01, -66);
    scene.add(s);
  }

  buildArcadas(scene);
  buildMonument(scene);
  buildChurch(scene);

  const fountainZone = buildFountain(scene, 8, -66);

  // Árvores do pátio e do largo (algumas floridas)
  buildTree(scene, -20, -18); buildTree(scene, 20, -18, true);
  buildTree(scene, -20, 18, true); buildTree(scene, 20, 18);
  buildTree(scene, -12, 6); buildTree(scene, 14, -4);
  buildTree(scene, -28, -58, true, 1.2); buildTree(scene, 28, -82, false, 1.3);
  buildTree(scene, 34, -52, true); buildTree(scene, -8, -84);
  buildTree(scene, 22, -64);

  // Postes de luz
  const lampMats = [];
  [[-14, -14], [14, -14], [-14, 14], [14, 14],
   [-4, -45], [4, -45], [-20, -70], [20, -75], [0, -88], [36, -62]]
    .forEach(([x, z]) => lampMats.push(buildLamp(scene, x, z)));

  // Luzes pontuais noturnas (poucas, por performance)
  const nightLights = [];
  [[0, -14], [0, 14], [8, -66], [0, -45]].forEach(([x, z]) => {
    const l = new THREE.PointLight(0xffd9a0, 0, 22, 1.8);
    l.position.set(x, 4, z);
    scene.add(l);
    nightLights.push(l);
  });

  // Bancos do pátio
  const benchGeo = new THREE.BoxGeometry(2.4, 0.45, 0.7);
  [[-8, -22, 0], [8, -22, 0], [-22, 8, Math.PI / 2], [22, -8, Math.PI / 2], [-10, -60, 0.4], [16, -78, -0.7]]
    .forEach(([x, z, ry]) => {
      const b = new THREE.Mesh(benchGeo, MAT.tronco);
      b.position.set(x, 0.35, z);
      b.rotation.y = ry;
      scene.add(b);
      colliders.circles.push({ x, z, r: 1.1 });
    });

  // Muros externos do Largo
  const wallMat = MAT.parede;
  const mkWall = (cx, cz, sx, sz) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, 3, sz), wallMat);
    w.position.set(cx, 1.5, cz);
    scene.add(w);
    addBoxCollider(cx, cz, sx, sz);
  };
  mkWall(0, LARGO.minZ - 1, 100, 2);                 // fundo do largo
  mkWall(LARGO.minX - 1, -66, 2, 58);                // oeste
  mkWall(LARGO.maxX + 1, -66, 2, 58);                // leste
  mkWall(-26, LARGO.maxZ + 1, 40, 2);                // liga largo à ala norte (esq.)
  mkWall(26, LARGO.maxZ + 1, 40, 2);                 // (dir.) — vão central = portão

  // Prédios distantes da cidade (pano de fundo)
  const cityMat = new THREE.MeshLambertMaterial({ color: 0x4a4a55 });
  for (let i = 0; i < 14; i++) {
    const h = 14 + Math.random() * 26;
    const b = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 8, h, 8 + Math.random() * 8), cityMat);
    const ang = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * 50;
    b.position.set(Math.cos(ang) * dist, h / 2 - 2, Math.sin(ang) * dist - 30);
    scene.add(b);
  }

  return { fountainZone, lampMats, nightLights, waterMat: MAT.agua };
}

// Resolve colisão do jogador (raio r) contra paredes e círculos
export function resolveCollisions(pos, r) {
  // limites gerais do mapa
  const inLargo = pos.z < PATIO.minZ - 8;
  const inGate = Math.abs(pos.x) < 3.4 && pos.z >= PATIO.minZ - 9 && pos.z <= PATIO.minZ + 1;
  if (!inGate) {
    if (pos.z >= PATIO.minZ - 1) {
      // dentro do pátio + galerias
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
        // dentro da caixa: empurra pela face mais próxima
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
