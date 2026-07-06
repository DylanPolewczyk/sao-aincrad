import * as THREE from 'three';
import { buildWorld, TOWN_RADIUS, BOSS_ARENA } from './world.js';
import { Player } from './player.js';
import { Enemy, createSpawns } from './enemies.js';
import { Effects } from './effects.js';
import { UI } from './ui.js';
import { AudioSys } from './audio.js';

const SAVE_KEY = 'sao-aincrad-save-v1';

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);

    this.ui = new UI();
    this.audio = new AudioSys();
    this.effects = new Effects(this.scene);
    this.world = buildWorld(this.scene);
    this.player = new Player(this);
    this.enemies = createSpawns(this);
    this.boss = null;
    this.bossDefeated = false;
    this.bossEngaged = false;
    this.respawnQueue = []; // { type, home, t }

    // camera orbit state
    this.camYaw = Math.PI;      // behind player looking at town center initially
    this.camPitch = 0.32;
    this.camDist = 6.8;
    this.pointerLocked = false;

    this.input = { w: false, a: false, s: false, d: false, shift: false, space: false };
    this.started = false;
    this.clock = new THREE.Clock();
    this.zone = 'town';

    this.load();
    this.bindEvents();
    this.ui.setPlayerHP(this.player.hp, this.player.maxHp);
    this.ui.setLevel(this.player.level);
    this.ui.setCol(this.player.col);
    this.ui.setXP(this.player.xp / this.player.xpToNext());

    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ---------------- persistence ----------------
  save() {
    const p = this.player;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      level: p.level, xp: p.xp, col: p.col, bossDefeated: this.bossDefeated,
    }));
  }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return;
      const p = this.player;
      p.level = d.level || 1;
      p.xp = d.xp || 0;
      p.col = d.col || 0;
      p.maxHp = 120 + (p.level - 1) * 28;
      p.hp = p.maxHp;
      this.bossDefeated = !!d.bossDefeated;
    } catch { /* fresh start */ }
  }

  // ---------------- events ----------------
  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (this.started && !this.pointerLocked) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.camYaw -= e.movementX * 0.0026;
      this.camPitch = Math.max(-0.15, Math.min(1.15, this.camPitch + e.movementY * 0.0022));
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.started || !this.pointerLocked || e.button !== 0) return;
      this.player.tryAttack();
    });
    document.addEventListener('wheel', (e) => {
      if (!this.started) return;
      this.camDist = Math.max(3, Math.min(13, this.camDist + e.deltaY * 0.004));
    });

    const keymap = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ShiftLeft: 'shift', ShiftRight: 'shift', Space: 'space' };
    document.addEventListener('keydown', (e) => {
      if (keymap[e.code] !== undefined) { this.input[keymap[e.code]] = true; e.preventDefault(); }
      if (e.code === 'Digit1') this.player.trySkill(0);
      if (e.code === 'Digit2') this.player.trySkill(1);
      if (e.code === 'Digit3') this.player.trySkill(2);
    });
    document.addEventListener('keyup', (e) => {
      if (keymap[e.code] !== undefined) this.input[keymap[e.code]] = false;
    });

    // title screen
    document.getElementById('link-start').addEventListener('click', () => this.linkStart());
    document.getElementById('respawn-btn').addEventListener('click', () => {
      this.ui.hideDeath();
      this.player.respawn();
      this.ui.announce('RETURNED TO TOWN', 'Town of Beginnings');
      this.renderer.domElement.requestPointerLock();
    });
    document.getElementById('continue-btn').addEventListener('click', () => {
      this.ui.hideVictory();
      this.renderer.domElement.requestPointerLock();
    });
  }

  linkStart() {
    this.audio.init();
    this.audio.linkStart();
    const streaks = document.getElementById('streaks');
    // build rainbow streaks flying past — the dive into Aincrad
    const hues = [0, 30, 60, 120, 180, 210, 260, 300];
    for (let i = 0; i < 90; i++) {
      const s = document.createElement('div');
      s.className = 'streak';
      const h = hues[Math.floor(Math.random() * hues.length)];
      s.style.background = `hsl(${h}, 95%, 65%)`;
      s.style.boxShadow = `0 0 6px hsl(${h}, 95%, 65%)`;
      s.style.setProperty('--a', `${Math.random() * 360}deg`);
      s.style.animationDelay = `${Math.random() * 0.9}s`;
      streaks.appendChild(s);
    }
    streaks.classList.add('go');
    setTimeout(() => {
      document.getElementById('title-screen').style.display = 'none';
      streaks.style.transition = 'opacity 0.8s';
      streaks.style.opacity = 0;
      setTimeout(() => streaks.remove(), 900);
      this.started = true;
      this.clock.getDelta(); // discard time spent on the title screen
      this.ui.announce('WELCOME TO SWORD ART ONLINE', 'Floor 1 — Town of Beginnings', 3800);
      this.renderer.domElement.requestPointerLock();
    }, 1700);
  }

  // ---------------- game events ----------------
  onEnemyKilled(enemy) {
    const p = this.player;
    p.col += enemy.def.col;
    this.ui.setCol(p.col);
    p.gainXP(enemy.def.xp);
    this.save();

    if (enemy.isBoss) {
      this.bossDefeated = true;
      this.boss = null;
      this.ui.hideBoss();
      this.audio.victory();
      this.save();
      setTimeout(() => {
        document.exitPointerLock();
        this.ui.showVictory();
      }, 1400);
      return;
    }
    // respawn regular mobs after a delay, back at their home point
    this.respawnQueue.push({ type: enemy.type, home: enemy.home.clone(), t: 20 });
    const idx = this.enemies.indexOf(enemy);
    if (idx >= 0) this.enemies.splice(idx, 1);
    this.scene.remove(enemy.mesh);
  }

  onPlayerDeath() {
    document.exitPointerLock();
    setTimeout(() => this.ui.showDeath(), 900);
    if (this.boss) this.boss.aggro = false;
  }

  spawnBoss() {
    this.boss = new Enemy('boss', new THREE.Vector3(BOSS_ARENA.x, 0, BOSS_ARENA.z - 8), this);
    this.enemies.push(this.boss);
    this.ui.showBoss(this.boss);
    this.ui.updateBoss(this.boss);
    this.ui.announce('BOSS BATTLE', 'Illfang the Kobold Lord', 3200);
    this.audio.bossRoar();
    this.bossEngaged = true;
  }

  // ---------------- zone / target HUD ----------------
  updateZoneHUD() {
    const pos = this.player.position;
    let zone;
    if (this.world.isSafeZone(pos)) zone = 'town';
    else if (this.world.inBossArena(pos) || (this.boss && this.boss.aggro)) zone = 'boss';
    else zone = 'field';
    if (zone !== this.zone) {
      this.zone = zone;
      if (zone === 'town') this.ui.setZone('Floor 1 — Town of Beginnings', 'SAFE ZONE', true);
      else if (zone === 'field') this.ui.setZone('Floor 1 — West Field', 'FIELD', false);
      else this.ui.setZone('Floor 1 — Pillar of the Kobold Lord', 'BOSS AREA', false);
    }
  }

  updateTargetHUD() {
    // nearest living enemy in front-ish of the camera within 18m
    const p = this.player.position;
    let best = null, bestScore = Infinity;
    const camFwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    for (const e of this.enemies) {
      if (e.dead) continue;
      const to = e.position.clone().sub(p).setY(0);
      const d = to.length();
      if (d > 18) continue;
      const ang = d > 0.01 ? camFwd.angleTo(to.normalize()) : 0;
      if (ang > 1.2) continue;
      const score = d + ang * 4;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    this.ui.showTarget(best);
    if (this.boss && !this.boss.dead) this.ui.updateBoss(this.boss);
  }

  // ---------------- main loop ----------------
  tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.started) {
      // idle camera drift on the title screen behind the overlay
      const t = performance.now() * 0.0001;
      this.camera.position.set(Math.sin(t) * 40, 18, Math.cos(t) * 40);
      this.camera.lookAt(0, 4, 0);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.world.update(dt);
    this.player.update(dt, this.input, this.camYaw);
    for (const e of this.enemies) e.update(dt);
    this.effects.update(dt);

    // mob respawns
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const r = this.respawnQueue[i];
      r.t -= dt;
      if (r.t <= 0 && r.home.distanceTo(this.player.position) > 14) {
        this.enemies.push(new Enemy(r.type, r.home, this));
        this.respawnQueue.splice(i, 1);
      }
    }

    // boss trigger
    if (!this.boss && !this.bossDefeated && this.world.inBossArena(this.player.position)) {
      this.spawnBoss();
    }

    this.updateZoneHUD();
    this.updateTargetHUD();
    this.ui.updateDamage(dt, this.camera);

    // ----- third-person camera -----
    const p = this.player.position;
    const target = new THREE.Vector3(p.x, p.y + 1.55, p.z);
    const off = new THREE.Vector3(
      -Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      -Math.cos(this.camYaw) * Math.cos(this.camPitch),
    ).multiplyScalar(this.camDist);
    const desired = target.clone().add(off);
    if (desired.y < 0.4) desired.y = 0.4;
    this.camera.position.lerp(desired, Math.min(1, 14 * dt));
    this.camera.lookAt(target);

    this.renderer.render(this.scene, this.camera);
  }
}

window.__game = new Game();
