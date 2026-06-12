// Sistema de feitiços em latim forense + projéteis e partículas.
import * as THREE from 'three';

export const SPELLS = [
  { id: 'lumen',  name: 'Lumen Iuris',    key: '1', cost: 10, desc: 'projétil de luz',   color: 0xffd966 },
  { id: 'venia',  name: 'Data Venia',     key: '2', cost: 25, desc: 'onda de impacto',   color: 0x6ab0ff },
  { id: 'habeas', name: 'Habeas Corpus',  key: '3', cost: 40, desc: 'escudo protetor',   color: 0x9be8a8 },
];

// Som sintetizado simples para o lançamento (sem assets externos)
let audioCtx = null;
function playCastSound(freq) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 2.2, audioCtx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    o.connect(gain).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.3);
  } catch (_) { /* áudio indisponível */ }
}

export class SpellSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.particles = [];
    this.selected = 0;
  }

  select(i) {
    if (i >= 0 && i < SPELLS.length) this.selected = i;
  }

  get current() {
    return SPELLS[this.selected];
  }

  // Tenta lançar o feitiço selecionado. Retorna true se conseguiu.
  cast(player) {
    const spell = this.current;
    if (player.mana < spell.cost) return false;
    player.mana -= spell.cost;

    if (spell.id === 'habeas') {
      player.shieldUntil = performance.now() + 5000;
      playCastSound(220);
      this.burst(player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), spell.color, 18, 3);
      return true;
    }

    const isVenia = spell.id === 'venia';
    const geo = isVenia
      ? new THREE.TorusGeometry(0.45, 0.12, 8, 16)
      : new THREE.SphereGeometry(0.22, 10, 10);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: spell.color }));
    const dir = player.castDirection();
    mesh.position.copy(player.castOrigin());
    if (isVenia) mesh.lookAt(mesh.position.clone().add(dir)); // anel perpendicular à trajetória

    const light = new THREE.PointLight(spell.color, 2.2, 9, 2);
    mesh.add(light);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      dir,
      speed: isVenia ? 22 : 34,
      life: 1.6,
      spell: spell.id,
      radius: isVenia ? 1.8 : 1.1,
      damage: isVenia ? 1 : 1,
      knockback: isVenia ? 14 : 2,
      color: spell.color,
    });
    playCastSound(isVenia ? 320 : 540);
    return true;
  }

  // Explosão de partículas
  burst(pos, color, count = 14, speed = 7) {
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
      m.position.copy(pos);
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));
      this.scene.add(m);
      this.particles.push({ mesh: m, vel: v, life: 0.7 + Math.random() * 0.4 });
    }
  }

  // Papéis voando quando um Auto Maldito é arquivado
  paperBurst(pos) {
    const geo = new THREE.PlaneGeometry(0.3, 0.4);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf5efd8, side: THREE.DoubleSide, transparent: true, opacity: 1 }));
      m.position.copy(pos);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 6);
      this.scene.add(m);
      this.particles.push({ mesh: m, vel: v, life: 1.4 + Math.random() * 0.6, spin: true });
    }
  }

  // Atualiza projéteis e testa colisão contra inimigos. Devolve acertos.
  update(dt, enemies) {
    const hits = [];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 6;

      let dead = p.life <= 0 || p.mesh.position.y < 0;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (p.mesh.position.distanceTo(e.group.position) < p.radius + 0.9) {
          hits.push({ enemy: e, projectile: p });
          dead = true;
          break;
        }
      }
      if (dead) {
        this.burst(p.mesh.position, p.color, 10, 4);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.vel.y -= 9 * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      if (pt.spin) pt.mesh.rotation.x += dt * 4;
      pt.mesh.material.opacity = Math.max(0, pt.life);
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        pt.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    return hits;
  }
}
