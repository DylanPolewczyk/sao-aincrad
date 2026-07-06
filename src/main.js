import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { buildWorld } from './world.js';
import { terrainHeight, POI } from './terrain.js';
import { Player } from './player.js';
import { Enemy, createSpawns } from './enemies.js';
import { Effects } from './effects.js';
import { UI } from './ui.js';
import { AudioSys } from './audio.js';
import { QuestSystem } from './quests.js';
import { buildGMAvatar } from './characters.js';

const SAVE_KEY = 'sao-aincrad-save-v2';

const KAYABA_LINES = [
  ['Attention, players. I welcome you to my world.', 4200],
  ['My name is Kayaba Akihiko. As of this moment, I am the sole person who can control this world.', 5200],
  ['You may have noticed that the log-out button is missing from the main menu. This is not a defect in the game.', 5200],
  ['I repeat — this is not a defect. This is how Sword Art Online was designed to be.', 4600],
  ['If your HP drops to zero, your avatar will be lost forever — and the NerveGear will simultaneously end your life.', 5600],
  ['There is only one means of escape: to clear the game. Defeat the final boss of every floor, and reach the top of Aincrad.', 5600],
  ['This concludes the tutorial for the official launch of Sword Art Online. Good luck, players.', 5000],
];

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);

    // post-processing: subtle bloom for glows, skills, and shatter effects
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.5, 0.85,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.ui = new UI();
    this.audio = new AudioSys();
    this.effects = new Effects(this.scene);
    this.world = buildWorld(this.scene);
    this.player = new Player(this);
    this.enemies = createSpawns(this);
    this.quests = new QuestSystem(this);
    this.boss = null;
    this.bossDefeated = false;
    this.introSeen = false;
    this.respawnQueue = [];

    // camera orbit
    this.camYaw = Math.PI;
    this.camPitch = 0.3;
    this.camDist = 6.8;
    this.pointerLocked = false;

    this.input = { w: false, a: false, s: false, d: false, shift: false, space: false };
    this.started = false;
    this.intro = null; // Kayaba sequence state
    this.clock = new THREE.Clock();
    this.zoneName = '';

    this.load();
    if (this._questSave) { this.quests.restore(this._questSave); this._questSave = null; }
    this.bindEvents();
    this.ui.setPlayerHP(this.player.hp, this.player.maxHp);
    this.ui.setLevel(this.player.level);
    this.ui.setCol(this.player.col);
    this.ui.setXP(this.player.xp / this.player.xpToNext());
    this.quests.refreshHUD();

    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ---------------- persistence ----------------
  save() {
    const p = this.player;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      level: p.level, xp: p.xp, col: p.col,
      bossDefeated: this.bossDefeated, introSeen: this.introSeen,
      anneal: p.hasAnneal, coat: this.bossDefeated,
      quest: this.quests ? this.quests.serialize() : null,
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
      this.introSeen = !!d.introSeen;
      if (d.anneal) p.equipAnnealBlade();
      if (d.coat) p.equipCoat();
      this._questSave = d.quest;
    } catch { /* fresh start */ }
  }

  // ---------------- events ----------------
  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (this.started && !this.pointerLocked && !this.intro) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked || this.intro) return;
      this.camYaw -= e.movementX * 0.0026;
      this.camPitch = Math.max(-0.15, Math.min(1.15, this.camPitch + e.movementY * 0.0022));
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.started || !this.pointerLocked || e.button !== 0 || this.intro || this.ui.dialogOpen) return;
      this.player.tryAttack();
    });
    document.addEventListener('wheel', (e) => {
      if (!this.started) return;
      this.camDist = Math.max(3, Math.min(13, this.camDist + e.deltaY * 0.004));
    });

    const keymap = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ShiftLeft: 'shift', ShiftRight: 'shift', Space: 'space' };
    document.addEventListener('keydown', (e) => {
      if (keymap[e.code] !== undefined) { this.input[keymap[e.code]] = true; e.preventDefault(); }
      if (this.intro) {
        if (e.code === 'Enter' || e.code === 'KeyE') this.advanceIntro();
        return;
      }
      if (e.code === 'KeyE') this.tryInteract();
      if (this.ui.dialogOpen) return;
      if (e.code === 'Digit1') this.player.trySkill(0);
      if (e.code === 'Digit2') this.player.trySkill(1);
      if (e.code === 'Digit3') this.player.trySkill(2);
    });
    document.addEventListener('keyup', (e) => {
      if (keymap[e.code] !== undefined) this.input[keymap[e.code]] = false;
    });

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
      this.clock.getDelta();
      if (!this.introSeen) {
        this.startIntro();
      } else {
        this.ui.announce('WELCOME BACK TO AINCRAD', 'Floor 1 — Town of Beginnings', 3600);
        this.renderer.domElement.requestPointerLock();
      }
    }, 1700);
  }

  // ---------------- the opening ceremony ----------------
  startIntro() {
    const T = POI.town;
    const avatar = buildGMAvatar();
    avatar.scale.setScalar(5.5);
    avatar.position.set(T.x, terrainHeight(T.x, T.z) + 24, T.z - 20);
    this.scene.add(avatar);
    this.ui.showKayabaOverlay(true);
    this.audio.bossRoar();
    this.intro = { avatar, line: -1, timer: 0.8, fading: false, fadeT: 0 };
  }

  advanceIntro() {
    if (this.intro && !this.intro.fading) this.intro.timer = 0;
  }

  updateIntro(dt) {
    const it = this.intro;
    const T = POI.town;
    it.avatar.position.y = terrainHeight(T.x, T.z) + 24 + Math.sin(performance.now() * 0.0006) * 0.8;
    it.avatar.rotation.y = 0; // faces south, toward the plaza and camera

    if (it.fading) {
      it.fadeT += dt;
      const o = Math.max(0, 1 - it.fadeT / 1.8);
      it.avatar.traverse((m) => {
        if (m.isMesh && m.material.transparent) m.material.opacity = o;
      });
      if (it.fadeT >= 1.8) {
        this.scene.remove(it.avatar);
        this.intro = null;
        this.ui.setSubtitle(null);
        this.ui.showKayabaOverlay(false);
        this.introSeen = true;
        this.save();
        this.ui.announce('SWORD ART ONLINE', 'Floor 1 — Town of Beginnings · The game has begun', 4200);
        this.renderer.domElement.requestPointerLock();
      }
      return;
    }

    it.timer -= dt;
    if (it.timer <= 0) {
      it.line++;
      if (it.line >= KAYABA_LINES.length) {
        it.fading = true;
        this.effects.shatter(it.avatar.position.clone(), 4, 0xff5a4a);
        this.audio.shatter();
        this.ui.setSubtitle(null);
      } else {
        const [text, dur] = KAYABA_LINES[it.line];
        this.ui.setSubtitle(text);
        it.timer = dur / 1000;
        this.audio.tone(70, 1.4, { type: 'sawtooth', vol: 0.05, glide: -12 });
      }
    }
  }

  // ---------------- interactions ----------------
  nearestInteraction() {
    const p = this.player.position;
    const d = (v) => p.distanceTo(v);
    if (this.quests && d(this.quests.npcPos) < 3.6) {
      return { text: 'Talk', fn: () => this.quests.interact() };
    }
    if (d(this.world.monumentPos) < 6) {
      return {
        text: 'Read the Monument of Life',
        fn: () => this.ui.announce('MONUMENT OF LIFE', 'Ten thousand names are carved here. Some are already struck through.', 4200),
      };
    }
    if (d(this.world.teleGatePos) < 5.5) {
      return {
        text: 'Touch the Teleport Gate',
        fn: () => this.ui.announce('TELEPORT GATE', 'The gate to the upper floors is sealed until the Floor Boss falls.', 4200),
      };
    }
    return null;
  }

  tryInteract() {
    if (this.ui.dialogOpen) { this.ui.advanceDialog(); return; }
    const it = this.nearestInteraction();
    if (it) it.fn();
  }

  // ---------------- game events ----------------
  onEnemyKilled(enemy) {
    const p = this.player;
    p.col += enemy.def.col;
    this.ui.setCol(p.col);
    p.gainXP(enemy.def.xp);
    this.quests.onKill(enemy);
    this.save();

    if (enemy.isBoss) {
      this.bossDefeated = true;
      this.boss = null;
      this.ui.hideBoss();
      this.audio.victory();
      // canon reward: the Coat of Midnight
      p.equipCoat();
      this.save();
      setTimeout(() => {
        this.ui.announce('LAST ATTACK BONUS', 'Obtained: Coat of Midnight', 4200);
      }, 1600);
      setTimeout(() => {
        document.exitPointerLock();
        this.ui.showVictory();
      }, 3400);
      return;
    }
    if (!enemy.isAdd) this.respawnQueue.push({ type: enemy.type, home: enemy.home.clone(), t: 22 });
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
    const Tw = POI.tower;
    this.boss = new Enemy('boss', new THREE.Vector3(Tw.x, 0, Tw.z - 12), this);
    this.boss.aggro = true;
    this.enemies.push(this.boss);
    this.ui.showBoss(this.boss);
    this.ui.updateBoss(this.boss);
    this.ui.announce('BOSS BATTLE', 'Illfang the Kobold Lord', 3400);
    this.audio.bossRoar();
  }

  spawnBossAdds(n) {
    if (!this.boss) return;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const pos = this.boss.position.clone().add(
        new THREE.Vector3(Math.cos(ang) * 5, 0, Math.sin(ang) * 5),
      );
      const add = new Enemy('sentinel', pos, this);
      add.aggro = true;
      add.state = 'chase';
      add.isAdd = true; // boss guards don't respawn
      this.enemies.push(add);
    }
    this.ui.announce('RUIN KOBOLD SENTINELS', 'The lord calls his guards', 2200);
  }

  // ---------------- HUD ----------------
  updateZoneHUD() {
    const z = this.world.zoneAt(this.player.position);
    if (z.name !== this.zoneName) {
      this.zoneName = z.name;
      this.ui.setZone('Floor 1 — ' + z.name, z.tag, z.safe);
    }
  }

  updateTargetHUD() {
    const p = this.player.position;
    let best = null, bestScore = Infinity;
    const camFwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    for (const e of this.enemies) {
      if (e.dead) continue;
      const to = e.position.clone().sub(p).setY(0);
      const d = to.length();
      if (d > 20) continue;
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
      const t = performance.now() * 0.00006;
      const T = POI.town;
      this.camera.position.set(T.x + Math.sin(t) * 55, 26, T.z + Math.cos(t) * 55);
      this.camera.lookAt(T.x, 6, T.z);
      this.world.update(dt, this.camera.position);
      this.composer.render();
      return;
    }

    this.world.update(dt, this.player.position);
    this.effects.update(dt);
    this.quests.update(dt);

    if (this.intro) {
      this.updateIntro(dt);
      // cinematic camera: look up at the GM avatar from across the plaza
      const T = POI.town;
      const py = terrainHeight(T.x, T.z);
      const camPos = new THREE.Vector3(T.x + 3, py + 4, T.z + 28);
      this.camera.position.lerp(camPos, Math.min(1, 2.5 * dt));
      this.camera.lookAt(T.x, py + 22, T.z - 20);
      this.composer.render();
      return;
    }

    this.player.update(dt, this.ui.dialogOpen ? {} : this.input, this.camYaw);
    for (const e of this.enemies) e.update(dt);

    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const r = this.respawnQueue[i];
      r.t -= dt;
      if (r.t <= 0 && r.home.distanceTo(this.player.position) > 16) {
        this.enemies.push(new Enemy(r.type, r.home, this));
        this.respawnQueue.splice(i, 1);
      }
    }

    if (!this.boss && !this.bossDefeated && this.world.inBossRoom(this.player.position)) {
      this.spawnBoss();
    }

    this.updateZoneHUD();
    this.updateTargetHUD();
    this.ui.updateDamage(dt, this.camera);
    this.ui.setInteract(this.ui.dialogOpen ? null : this.nearestInteraction()?.text);

    // ----- third-person camera -----
    const p = this.player.position;
    const target = new THREE.Vector3(p.x, p.y + 1.55, p.z);
    const off = new THREE.Vector3(
      -Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      -Math.cos(this.camYaw) * Math.cos(this.camPitch),
    ).multiplyScalar(this.camDist);
    const desired = target.clone().add(off);
    const groundY = terrainHeight(desired.x, desired.z) + 0.5;
    if (desired.y < groundY) desired.y = groundY;
    this.camera.position.lerp(desired, Math.min(1, 14 * dt));
    this.camera.lookAt(target);

    this.composer.render();
  }
}

window.__game = new Game();
