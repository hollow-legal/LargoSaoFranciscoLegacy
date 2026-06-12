// Interface: barras, contadores, mensagens e barra de feitiços.
import { SPELLS } from './spells.js';

const $ = (sel) => document.querySelector(sel);

export class HUD {
  constructor() {
    this.hpFill = $('#hp .fill');
    this.mpFill = $('#mp .fill');
    this.cFolhas = $('#cFolhas');
    this.cAutos = $('#cAutos');
    this.messageEl = $('#message');
    this.interactEl = $('#interact');
    this.msgTimer = null;

    // monta a barra de feitiços
    const bar = $('#spellbar');
    this.slots = SPELLS.map((s, i) => {
      const div = document.createElement('div');
      div.className = 'spell' + (i === 0 ? ' active' : '');
      div.innerHTML = `<span class="key">[${s.key}] · ${s.cost} mana</span><span class="name">${s.name}</span><span>${s.desc}</span>`;
      bar.appendChild(div);
      return div;
    });
  }

  setSpell(index) {
    this.slots.forEach((el, i) => el.classList.toggle('active', i === index));
  }

  setBars(hp, maxHp, mana, maxMana) {
    this.hpFill.style.width = `${(hp / maxHp) * 100}%`;
    this.mpFill.style.width = `${(mana / maxMana) * 100}%`;
  }

  setCounters(folhas, autos) {
    this.cFolhas.textContent = folhas;
    this.cAutos.textContent = autos;
  }

  message(text, duration = 3000) {
    this.messageEl.innerHTML = text;
    this.messageEl.classList.add('show');
    clearTimeout(this.msgTimer);
    if (duration > 0) {
      this.msgTimer = setTimeout(() => this.messageEl.classList.remove('show'), duration);
    }
  }

  interact(text) {
    if (text) {
      this.interactEl.textContent = text;
      this.interactEl.style.display = 'block';
    } else {
      this.interactEl.style.display = 'none';
    }
  }
}
