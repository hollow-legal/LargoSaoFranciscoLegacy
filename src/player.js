// Personagem do jogador: estudante das Arcadas com beca, em terceira pessoa.
import * as THREE from 'three';
import { resolveCollisions } from './world.js';

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.position = new THREE.Vector3(0, 0, 12);
    this.velocityY = 0;
    this.onGround = true;
    this.yaw = 0;             // olhando para o monumento
    this.pitch = -0.15;
    this.radius = 0.6;

    this.hp = 100;
    this.maxHp = 100;
    this.mana = 100;
    this.maxMana = 100;
    this.invulnUntil = 0;
    this.shieldUntil = 0;

    this.keys = {};
    this.moving = false;
    this.walkPhase = 0;

    this.mesh = this.buildMesh();
    this.mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.shieldMesh.castShadow = false;
    scene.add(this.mesh);
  }

  buildMesh() {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xc89a72 });
    const beca = new THREE.MeshLambertMaterial({ color: 0x14141c }); // beca preta
    const shirt = new THREE.MeshLambertMaterial({ color: 0xe8e2d4 });
    const faixa = new THREE.MeshLambertMaterial({ color: 0x8b1a1a }); // faixa vermelha (Direito)

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.42), beca);
    torso.position.y = 1.25;
    g.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.05), shirt);
    chest.position.set(0, 1.32, 0.22);
    g.add(chest);

    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.46), faixa);
    sash.position.y = 0.95;
    g.add(sash);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 12), skin);
    head.position.y = 2.0;
    g.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), new THREE.MeshLambertMaterial({ color: 0x2a1c10 }));
    hair.position.y = 2.05;
    g.add(hair);

    // braços e pernas articulados
    const armGeo = new THREE.BoxGeometry(0.18, 0.72, 0.18);
    armGeo.translate(0, -0.32, 0);
    this.armL = new THREE.Mesh(armGeo, beca);
    this.armL.position.set(-0.46, 1.62, 0);
    this.armR = new THREE.Mesh(armGeo, beca);
    this.armR.position.set(0.46, 1.62, 0);
    g.add(this.armL, this.armR);

    const legGeo = new THREE.BoxGeometry(0.22, 0.78, 0.22);
    legGeo.translate(0, -0.36, 0);
    const pants = new THREE.MeshLambertMaterial({ color: 0x222230 });
    this.legL = new THREE.Mesh(legGeo, pants);
    this.legL.position.set(-0.18, 0.78, 0);
    this.legR = new THREE.Mesh(legGeo, pants);
    this.legR.position.set(0.18, 0.78, 0);
    g.add(this.legL, this.legR);

    // capa da beca esvoaçando atrás
    this.cape = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.06), beca);
    this.cape.position.set(0, 1.2, -0.26);
    g.add(this.cape);

    // escudo Habeas Corpus (invisível por padrão)
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x6ab0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    this.shieldMesh.position.y = 1.2;
    this.shieldMesh.visible = false;
    g.add(this.shieldMesh);

    return g;
  }

  onMouseMove(dx, dy) {
    this.yaw -= dx * 0.0026;
    this.pitch -= dy * 0.0022;
    this.pitch = Math.max(-0.55, Math.min(0.7, this.pitch));
  }

  // direção em que o feitiço será lançado
  castDirection() {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return d.normalize();
  }

  castOrigin() {
    return this.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  }

  get shielded() {
    return performance.now() < this.shieldUntil;
  }

  takeDamage(amount) {
    const now = performance.now();
    if (now < this.invulnUntil || this.shielded) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnUntil = now + 900;
    return true;
  }

  respawn() {
    this.position.set(0, 0, 12);
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.velocityY = 0;
  }

  update(dt, fountainZone) {
    const k = this.keys;
    const forward = (k['KeyW'] ? 1 : 0) - (k['KeyS'] ? 1 : 0);
    const strafe = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);
    const running = !!k['ShiftLeft'] || !!k['ShiftRight'];
    const speed = running ? 10 : 5.5;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let vx = (sin * -forward + cos * strafe);
    let vz = (cos * -forward - sin * strafe);
    const len = Math.hypot(vx, vz);
    this.moving = len > 0.01;
    if (this.moving) {
      vx = (vx / len) * speed;
      vz = (vz / len) * speed;
      this.position.x += vx * dt;
      this.position.z += vz * dt;
      // personagem vira para a direção do movimento
      this.mesh.rotation.y = Math.atan2(vx, vz);
    }

    // pulo / gravidade
    if (k['Space'] && this.onGround) {
      this.velocityY = 7.5;
      this.onGround = false;
    }
    this.velocityY -= 20 * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocityY = 0;
      this.onGround = true;
    }

    resolveCollisions(this.position, this.radius);

    // animação de caminhada
    if (this.moving && this.onGround) {
      this.walkPhase += dt * (running ? 13 : 9);
      const s = Math.sin(this.walkPhase) * 0.6;
      this.armL.rotation.x = s;
      this.armR.rotation.x = -s;
      this.legL.rotation.x = -s;
      this.legR.rotation.x = s;
      this.cape.rotation.x = 0.25 + Math.sin(this.walkPhase * 0.5) * 0.08;
    } else {
      const decay = Math.exp(-10 * dt);
      for (const limb of [this.armL, this.armR, this.legL, this.legR]) limb.rotation.x *= decay;
      this.cape.rotation.x *= decay;
    }

    this.mesh.position.copy(this.position);

    // escudo
    this.shieldMesh.visible = this.shielded;
    if (this.shieldMesh.visible) {
      this.shieldMesh.material.opacity = 0.12 + Math.sin(performance.now() * 0.008) * 0.06;
    }

    // regeneração de mana; vida regenera perto do chafariz
    this.mana = Math.min(this.maxMana, this.mana + 12 * dt);
    const df = Math.hypot(this.position.x - fountainZone.x, this.position.z - fountainZone.z);
    if (df < fountainZone.r) {
      this.hp = Math.min(this.maxHp, this.hp + 8 * dt);
    }

    // câmera em terceira pessoa
    const camDist = 6.2;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const cx = this.position.x + Math.sin(this.yaw) * cp * camDist;
    const cz = this.position.z + Math.cos(this.yaw) * cp * camDist;
    const cy = Math.max(0.4, this.position.y + 2.0 - sp * camDist);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.position.x, this.position.y + 1.6, this.position.z);
  }
}
