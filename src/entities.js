// Entidades do jogo: Autos Malditos (inimigos), estudantes NPC e Folhas do Códice.
import * as THREE from 'three';

const PAPER = new THREE.MeshLambertMaterial({ color: 0xe8dfc2 });
const PAPER_DARK = new THREE.MeshLambertMaterial({ color: 0xc9bd99 });
const STRING = new THREE.MeshLambertMaterial({ color: 0x8b1a1a });

// ---------- Autos Malditos: pilhas de processos encantadas ----------
export class Auto {
  constructor(scene, x, z) {
    this.scene = scene;
    this.alive = true;
    this.hp = 3;
    this.speed = 3.2 + Math.random() * 0.8;
    this.touchCooldown = 0;
    this.flashUntil = 0;
    this.knock = new THREE.Vector3();

    const g = new THREE.Group();
    let h = 0;
    for (let i = 0; i < 5; i++) {
      const sx = 0.9 - i * 0.06;
      const stack = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.22, sx * 1.25), i % 2 ? PAPER : PAPER_DARK);
      stack.position.y = h + 0.11;
      stack.rotation.y = (Math.random() - 0.5) * 0.7;
      h += 0.22;
      g.add(stack);
    }
    // barbante vermelho de cartório amarrando a pilha
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, h + 0.05, 1.3), STRING);
    tie.position.y = h / 2;
    g.add(tie);
    // olhos malignos
    const eyeGeo = new THREE.SphereGeometry(0.09, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    const e1 = new THREE.Mesh(eyeGeo, eyeMat);
    e1.position.set(-0.2, h - 0.3, 0.62);
    const e2 = new THREE.Mesh(eyeGeo, eyeMat);
    e2.position.set(0.2, h - 0.3, 0.62);
    g.add(e1, e2);

    g.position.set(x, 0.6, z);
    scene.add(g);
    this.group = g;
    this.baseY = 0.6;
    this.phase = Math.random() * Math.PI * 2;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }

  hit(damage, knockDir, knockForce) {
    this.hp -= damage;
    this.flashUntil = performance.now() + 120;
    this.knock.copy(knockDir).setY(0).normalize().multiplyScalar(knockForce);
    if (this.hp <= 0) {
      this.alive = false;
      this.scene.remove(this.group);
      return true; // arquivado!
    }
    return false;
  }

  update(dt, playerPos) {
    if (!this.alive) return false;
    this.phase += dt * 3;
    const p = this.group.position;

    // flutuação
    p.y = this.baseY + Math.sin(this.phase) * 0.25;

    // empurrão de Data Venia decai
    p.x += this.knock.x * dt;
    p.z += this.knock.z * dt;
    this.knock.multiplyScalar(Math.exp(-4 * dt));

    const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 18 && dist > 0.1) {
      // persegue o jogador
      p.x += (dx / dist) * this.speed * dt;
      p.z += (dz / dist) * this.speed * dt;
      this.group.rotation.y = Math.atan2(dx, dz);
    } else {
      // vagueia
      this.wanderAngle += (Math.random() - 0.5) * dt * 2;
      p.x += Math.sin(this.wanderAngle) * dt * 1.2;
      p.z += Math.cos(this.wanderAngle) * dt * 1.2;
    }

    // flash de dano (materiais são compartilhados, então o feedback é por escala)
    this.group.scale.setScalar(performance.now() < this.flashUntil ? 1.15 : 1);

    // retorna true se encostou no jogador (dano por contato)
    this.touchCooldown -= dt;
    if (dist < 1.5 && this.touchCooldown <= 0) {
      this.touchCooldown = 1.0;
      return true;
    }
    return false;
  }
}

export function spawnAutos(scene) {
  const spots = [
    [-18, -8], [16, 14], [-10, 22], [22, -20],
    [-14, -52], [18, -70], [-30, -80], [30, -48],
  ];
  return spots.map(([x, z]) => new Auto(scene, x, z));
}

// ---------- Folhas do Códice (colecionáveis) ----------
export class Folha {
  constructor(scene, x, z) {
    this.collected = false;
    const g = new THREE.Group();
    const page = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, side: THREE.DoubleSide })
    );
    g.add(page);
    // halo luminoso (sem PointLight: 11 luzes extras pesariam no shader)
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.25 })
    );
    g.add(halo);
    g.position.set(x, 1.3, z);
    scene.add(g);
    this.group = g;
    this.scene = scene;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, playerPos) {
    if (this.collected) return false;
    this.phase += dt * 2;
    this.group.rotation.y += dt * 1.5;
    this.group.position.y = 1.3 + Math.sin(this.phase) * 0.2;
    if (this.group.position.distanceTo(playerPos) < 1.8) {
      this.collected = true;
      this.scene.remove(this.group);
      return true;
    }
    return false;
  }
}

export function spawnFolhas(scene) {
  const spots = [
    [0, -6],            // perto do monumento
    [-24, -24], [24, 24], [24, -26], [-26, 20],   // cantos do pátio
    [0, 33],            // galeria sul
    [-33, 0],           // galeria oeste
    [0, -44],           // saída do portão
    [8, -60],           // chafariz
    [-24, -66],         // frente da igreja
    [38, -84],          // canto do largo
  ];
  return spots.map(([x, z]) => new Folha(scene, x, z));
}

// ---------- Estudantes NPC ----------
const FALAS = [
  '"Dizem que o Códice foi escrito à luz de velas, na primeira aula de 1827..."',
  '"Cuidado com os Autos Malditos! Um deles quase me citou ontem."',
  '"Data venia, colega, você está pisando na minha sombra."',
  '"O bedel disse que quem dorme nas Arcadas sonha em latim."',
  '"Minha prova oral é amanhã. Se eu falhar, viro estagiário fantasma."',
  '"O chafariz do Largo cura qualquer canseira. Água com fé é quase mandado."',
  '"Já tentou lançar Habeas Corpus em si mesmo? Liberdade garantida por cinco segundos."',
  '"Os processos do porão criaram vida. Era óbvio: ninguém os movimentava há séculos."',
];

export class Estudante {
  constructor(scene, x, z) {
    const g = new THREE.Group();
    const robe = new THREE.MeshLambertMaterial({
      color: [0x1a2a4a, 0x3a1a2a, 0x14141c, 0x2a3a1a][Math.floor(Math.random() * 4)],
    });
    const skinTones = [0xc89a72, 0x8a6242, 0x5c3d28, 0xe0b48a];
    const skin = new THREE.MeshLambertMaterial({ color: skinTones[Math.floor(Math.random() * skinTones.length)] });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.4, 8), robe);
    body.position.y = 0.9;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), skin);
    head.position.y = 1.85;
    g.add(head);
    // livro debaixo do braço
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.12), new THREE.MeshLambertMaterial({ color: 0x7a2e1a }));
    book.position.set(0.38, 1.1, 0.1);
    g.add(book);

    g.position.set(x, 0, z);
    scene.add(g);
    this.group = g;
    this.home = new THREE.Vector3(x, 0, z);
    this.target = this.pickTarget();
    this.fala = FALAS[Math.floor(Math.random() * FALAS.length)];
    this.speed = 1.0 + Math.random() * 0.6;
    this.pause = Math.random() * 3;
  }

  pickTarget() {
    return this.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16));
  }

  update(dt) {
    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    const p = this.group.position;
    const d = this.target.clone().sub(p);
    d.y = 0;
    const dist = d.length();
    if (dist < 0.4) {
      this.pause = 2 + Math.random() * 4;
      this.target = this.pickTarget();
      return;
    }
    d.normalize();
    p.addScaledVector(d, this.speed * dt);
    this.group.rotation.y = Math.atan2(d.x, d.z);
  }
}

export function spawnEstudantes(scene) {
  const spots = [[-10, 10], [12, -10], [-6, -16], [18, 6], [-6, -50], [14, -72]];
  return spots.map(([x, z]) => new Estudante(scene, x, z));
}
