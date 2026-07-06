import * as THREE from 'three';

// All HUD / DOM handling. 3D positions are projected to screen space for
// floating combat text.
export class UI {
  constructor() {
    this.el = {
      playerHp: document.getElementById('player-hp'),
      playerHpGhost: document.getElementById('player-hp-ghost'),
      playerHpText: document.getElementById('player-hp-text'),
      playerLevel: document.getElementById('player-level'),
      xpFill: document.getElementById('xp-fill'),
      colAmt: document.getElementById('col-amt'),
      targetFrame: document.getElementById('target-frame'),
      targetNm: document.getElementById('target-nm'),
      targetLv: document.getElementById('target-lv'),
      targetHp: document.getElementById('target-hp'),
      targetCursor: document.getElementById('target-cursor'),
      bossFrame: document.getElementById('boss-frame'),
      bossBars: document.getElementById('boss-bars'),
      bossName: document.getElementById('boss-name'),
      locName: document.getElementById('loc-name'),
      zoneTag: document.getElementById('zone-tag'),
      announce: document.getElementById('announce'),
      hud: document.getElementById('hud'),
      deathScreen: document.getElementById('death-screen'),
      victoryScreen: document.getElementById('victory-screen'),
      skills: [0, 1, 2].map((i) => document.getElementById(`skill-${i}`)),
    };
    this.dmgPool = [];
    this.activeDmg = [];
    this.announceTimer = null;
    this.bossSegs = [];
    this._v = new THREE.Vector3();
  }

  // ------- player frame -------
  setPlayerHP(hp, max) {
    const pct = Math.max(0, hp / max) * 100;
    this.el.playerHp.style.width = pct + '%';
    this.el.playerHp.className = 'bar-fill' + (pct < 25 ? ' danger' : pct < 55 ? ' warn' : '');
    this.el.playerHpText.textContent = `${Math.max(0, Math.ceil(hp))} / ${max}`;
    this.el.playerHpGhost.style.width = pct + '%';
  }
  setLevel(lv) { this.el.playerLevel.textContent = 'LV ' + lv; }
  setXP(frac) { this.el.xpFill.style.width = Math.min(100, frac * 100) + '%'; }
  setCol(c) { this.el.colAmt.textContent = c; }

  // ------- target frame -------
  showTarget(enemy) {
    if (!enemy) { this.el.targetFrame.style.display = 'none'; return; }
    this.el.targetFrame.style.display = 'block';
    this.el.targetNm.textContent = enemy.name;
    this.el.targetLv.textContent = 'LV ' + enemy.level;
    const pct = Math.max(0, enemy.hp / enemy.maxHp) * 100;
    this.el.targetHp.style.width = pct + '%';
    this.el.targetHp.className = 'bar-fill' + (pct < 25 ? ' danger' : pct < 55 ? ' warn' : '');
    const col = enemy.aggro ? '#ff5a4a' : '#ffb43c';
    this.el.targetCursor.style.background = col;
    this.el.targetCursor.style.boxShadow = `0 0 6px ${col}`;
  }

  // ------- boss -------
  showBoss(boss) {
    this.el.bossFrame.style.display = 'block';
    this.el.bossName.textContent = boss.name.toUpperCase();
    this.el.bossBars.innerHTML = '';
    this.bossSegs = [];
    for (let i = 0; i < boss.barCount; i++) {
      const shell = document.createElement('div');
      shell.className = 'boss-bar-shell';
      const fill = document.createElement('div');
      fill.className = 'boss-bar-fill';
      shell.appendChild(fill);
      this.el.bossBars.appendChild(shell);
      this.bossSegs.push(fill);
    }
  }
  updateBoss(boss) {
    const per = boss.maxHp / boss.barCount;
    for (let i = 0; i < boss.barCount; i++) {
      const lo = boss.maxHp - (i + 1) * per;
      const frac = Math.min(1, Math.max(0, (boss.hp - lo) / per));
      this.bossSegs[i].style.width = frac * 100 + '%';
    }
  }
  hideBoss() { this.el.bossFrame.style.display = 'none'; }

  // ------- zone -------
  setZone(name, tag, safe) {
    this.el.locName.textContent = name;
    this.el.zoneTag.textContent = tag;
    this.el.zoneTag.className = safe ? 'safe' : '';
  }

  // ------- skills -------
  setSkillCD(i, frac) { // frac: 1 = just used, 0 = ready
    const s = this.el.skills[i];
    s.querySelector('.cd').style.transform = `scaleY(${Math.max(0, frac)})`;
    s.classList.toggle('ready', frac <= 0);
  }

  // ------- announcements -------
  announce(text, sub = '', dur = 2600) {
    const a = this.el.announce;
    a.innerHTML = text + (sub ? `<span class="sub">${sub}</span>` : '');
    a.style.opacity = 1;
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => { a.style.opacity = 0; }, dur);
  }

  // ------- floating combat text -------
  spawnDamage(worldPos, text, cls = '') {
    let div = this.dmgPool.pop();
    if (!div) {
      div = document.createElement('div');
      this.el.hud.appendChild(div);
    }
    div.className = 'dmg ' + cls;
    div.textContent = text;
    div.style.opacity = 1;
    this.activeDmg.push({
      div,
      pos: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7)),
      age: 0,
      life: 1.0,
      rise: 1.6 + Math.random() * 0.5,
    });
  }

  updateDamage(dt, camera) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = this.activeDmg.length - 1; i >= 0; i--) {
      const d = this.activeDmg[i];
      d.age += dt;
      if (d.age >= d.life) {
        d.div.style.opacity = 0;
        d.div.style.transform = 'translate(-9999px,-9999px)';
        this.dmgPool.push(d.div);
        this.activeDmg.splice(i, 1);
        continue;
      }
      this._v.copy(d.pos);
      this._v.y += d.age * d.rise;
      this._v.project(camera);
      if (this._v.z > 1) { d.div.style.opacity = 0; continue; }
      const x = (this._v.x * 0.5 + 0.5) * w;
      const y = (-this._v.y * 0.5 + 0.5) * h;
      d.div.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      d.div.style.opacity = d.age > d.life * 0.6 ? 1 - (d.age - d.life * 0.6) / (d.life * 0.4) : 1;
    }
  }

  showDeath() { this.el.deathScreen.style.display = 'flex'; }
  hideDeath() { this.el.deathScreen.style.display = 'none'; }
  showVictory() { this.el.victoryScreen.style.display = 'flex'; }
  hideVictory() { this.el.victoryScreen.style.display = 'none'; }
}
