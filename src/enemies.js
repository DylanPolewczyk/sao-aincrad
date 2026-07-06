import * as THREE from 'three';
import { BOSS_ARENA, TOWN_RADIUS, WORLD_RADIUS } from './world.js';

// Enemy definitions, procedural models, and AI (wander → aggro → attack).

const rand = (a, b) => a + Math.random() * (b - a);
const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });

// ---------------- models ----------------

function buildBoar() {
  const g = new THREE.Group();
  const bodyMat = lambert(0x7a6455);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.9), bodyMat);
  body.position.y = 0.75;
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.95), lambert(0x54443a));
  mane.position.set(0.35, 1.22, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.7), bodyMat);
  head.position.set(0.95, 0.72, 0);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.4), lambert(0x8d786a));
  snout.position.set(1.4, 0.6, 0);
  const tuskGeo = new THREE.ConeGeometry(0.06, 0.35, 6);
  const tuskMat = lambert(0xf2ead8);
  const t1 = new THREE.Mesh(tuskGeo, tuskMat);
  t1.position.set(1.35, 0.55, 0.22); t1.rotation.z = 0.9;
  const t2 = t1.clone(); t2.position.z = -0.22;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4030 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
  e1.position.set(1.18, 0.92, 0.24);
  const e2 = e1.clone(); e2.position.z = -0.24;
  g.add(body, mane, head, snout, t1, t2, e1, e2);
  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.22);
  for (const [lx, lz] of [[0.55, 0.3], [0.55, -0.3], [-0.55, 0.3], [-0.55, -0.3]]) {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(lx, 0.3, lz);
    g.add(leg); legs.push(leg);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, legs, hitY: 0.8 };
}

function buildWolf() {
  const g = new THREE.Group();
  const fur = lambert(0x6e7480);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 0.65), fur);
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), fur);
  head.position.set(1.05, 1.1, 0);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.26, 0.3), lambert(0x596070));
  muzzle.position.set(1.4, 1.0, 0);
  const earGeo = new THREE.ConeGeometry(0.1, 0.28, 4);
  const ear1 = new THREE.Mesh(earGeo, fur);
  ear1.position.set(0.95, 1.45, 0.15);
  const ear2 = ear1.clone(); ear2.position.z = -0.15;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.18), fur);
  tail.position.set(-1.1, 1.05, 0); tail.rotation.z = 0.45;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd020 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  e1.position.set(1.28, 1.2, 0.16);
  const e2 = e1.clone(); e2.position.z = -0.16;
  g.add(body, head, muzzle, ear1, ear2, tail, e1, e2);
  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.18, 0.85, 0.18);
  for (const [lx, lz] of [[0.65, 0.22], [0.65, -0.22], [-0.65, 0.22], [-0.65, -0.22]]) {
    const leg = new THREE.Mesh(legGeo, fur);
    leg.position.set(lx, 0.42, lz);
    g.add(leg); legs.push(leg);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, legs, hitY: 0.9 };
}

function buildKobold(scale = 1, boss = false) {
  const g = new THREE.Group();
  const skin = lambert(boss ? 0x8a3428 : 0x9a5a40);
  const belly = lambert(boss ? 0xb87a5a : 0xc09a78);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.6), skin);
  torso.position.y = 1.45;
  const bellyM = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.15), belly);
  bellyM.position.set(0, 1.35, 0.28);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.6), skin);
  head.position.y = 2.35;
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.35), belly);
  snout.position.set(0, 2.25, 0.42);
  const earGeo = new THREE.ConeGeometry(0.12, 0.5, 4);
  const ear1 = new THREE.Mesh(earGeo, skin);
  ear1.position.set(0.32, 2.75, 0); ear1.rotation.z = -0.5;
  const ear2 = ear1.clone(); ear2.position.x = -0.32; ear2.rotation.z = 0.5;
  const eyeMat = new THREE.MeshBasicMaterial({ color: boss ? 0xff2010 : 0xffc020 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeMat);
  e1.position.set(0.16, 2.42, 0.3);
  const e2 = e1.clone(); e2.position.x = -0.16;
  g.add(torso, bellyM, head, snout, ear1, ear2, e1, e2);

  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
  for (const lx of [0.28, -0.28]) {
    const leg = new THREE.Mesh(legGeo, skin);
    leg.position.set(lx, 0.45, 0);
    g.add(leg); legs.push(leg);
  }
  // weapon arm (animates on attack)
  const armR = new THREE.Group();
  armR.position.set(0.62, 1.9, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), skin);
  arm.position.y = -0.45;
  armR.add(arm);
  const weapon = new THREE.Group();
  if (boss) {
    // big bone axe
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 8), lambert(0x6a4a30));
    haft.position.y = -0.4;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.8), lambert(0xd8d0c0));
    blade.position.set(0, 0.55, 0.3);
    weapon.add(haft, blade);
  } else {
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 1.1, 7), lambert(0x7a5a3a));
    club.position.y = 0.2;
    weapon.add(club);
  }
  weapon.position.y = -0.9;
  armR.add(weapon);
  g.add(armR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), skin);
  armL.position.set(-0.62, 1.45, 0);
  g.add(armL);

  g.scale.setScalar(scale);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, legs, armR, hitY: 1.4 * scale };
}

// ---------------- enemy class ----------------

export const ENEMY_TYPES = {
  boar: {
    name: 'Frenzy Boar', level: 1, hp: 40, atk: 7, xp: 16, col: 9,
    speed: 3.6, aggroR: 8, atkR: 1.9, atkCd: 1.6, radius: 0.8,
    build: buildBoar,
  },
  wolf: {
    name: 'Dire Wolf', level: 3, hp: 85, atk: 13, xp: 34, col: 20,
    speed: 5.2, aggroR: 11, atkR: 2.0, atkCd: 1.3, radius: 0.8,
    build: buildWolf,
  },
  kobold: {
    name: 'Kobold Sentinel', level: 6, hp: 150, atk: 19, xp: 65, col: 42,
    speed: 4.4, aggroR: 12, atkR: 2.3, atkCd: 1.7, radius: 0.7,
    build: () => buildKobold(1),
  },
  boss: {
    name: 'Illfang the Kobold Lord', level: 12, hp: 1100, atk: 26, xp: 600, col: 900,
    speed: 5.6, aggroR: 16, atkR: 3.4, atkCd: 2.2, radius: 1.6,
    build: () => buildKobold(2.4, true), boss: true, barCount: 4,
  },
};

export class Enemy {
  constructor(typeKey, pos, game) {
    const t = ENEMY_TYPES[typeKey];
    this.type = typeKey;
    this.def = t;
    this.name = t.name;
    this.level = t.level;
    this.maxHp = t.hp;
    this.hp = t.hp;
    this.isBoss = !!t.boss;
    this.barCount = t.barCount || 1;
    this.game = game;

    const built = t.build();
    this.mesh = built.group;
    this.legs = built.legs || [];
    this.armR = built.armR || null;
    this.hitY = built.hitY;
    this.mesh.position.copy(pos);
    game.scene.add(this.mesh);

    this.home = pos.clone();
    this.state = 'idle'; // idle | wander | chase | attack | dead
    this.aggro = false;
    this.stateTime = rand(0, 2);
    this.wanderTarget = null;
    this.atkTimer = 0;
    this.windup = 0;
    this.dead = false;
    this.hitFlash = 0;
    this.animT = rand(0, 10);
    this.slamCd = 6; // boss AoE
  }

  get position() { return this.mesh.position; }

  takeDamage(amount, fromPos) {
    if (this.dead) return;
    this.hp -= amount;
    this.hitFlash = 0.12;
    this.aggro = true;
    this.state = 'chase';
    if (this.hp <= 0) this.die();
    else if (fromPos && !this.isBoss) {
      // small knockback
      const dir = this.position.clone().sub(fromPos).setY(0).normalize();
      this.position.addScaledVector(dir, 0.35);
    }
  }

  die() {
    this.dead = true;
    this.state = 'dead';
    this.hp = 0;
    const g = this.game;
    g.effects.shatter(this.position, this.isBoss ? 3.2 : 1);
    g.audio.shatter();
    this.mesh.visible = false;
    g.onEnemyKilled(this);
  }

  update(dt) {
    if (this.dead) return;
    const g = this.game;
    const player = g.player;
    this.animT += dt;
    this.stateTime += dt;
    this.atkTimer -= dt;

    // hit flash: tint red briefly
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const f = this.hitFlash > 0 ? 1 : 0;
      this.mesh.traverse((m) => {
        if (m.isMesh && m.material.emissive) m.material.emissiveIntensity = f;
      });
      if (this.hitFlash <= 0) this.mesh.traverse((m) => {
        if (m.isMesh && m.material.emissive) m.material.emissive.setHex(0);
      });
      else this.mesh.traverse((m) => {
        if (m.isMesh && m.material.emissive) m.material.emissive.setHex(0x802020);
      });
    }

    const toPlayer = player.position.clone().sub(this.position).setY(0);
    const distP = toPlayer.length();
    const playerSafe = g.world.isSafeZone(player.position);

    // aggro check
    if (!player.dead && !playerSafe && distP < this.def.aggroR) this.aggro = true;
    if (player.dead || playerSafe || distP > this.def.aggroR * 3.2) {
      if (this.aggro && !this.isBoss) { this.aggro = false; this.state = 'idle'; }
      if (this.isBoss && (player.dead || distP > 40)) this.aggro = false;
    }

    let moving = false;

    if (this.aggro && !player.dead) {
      if (distP > this.def.atkR) {
        this.state = 'chase';
        const step = this.def.speed * dt;
        this.position.addScaledVector(toPlayer.normalize(), step);
        moving = true;
      } else if (this.atkTimer <= 0) {
        // begin attack windup
        this.state = 'attack';
        this.windup = 0.45;
        this.atkTimer = this.def.atkCd;
      }
      // boss ground slam
      if (this.isBoss) {
        this.slamCd -= dt;
        if (this.slamCd <= 0 && distP < 9) {
          this.slamCd = rand(7, 10);
          g.effects.ring(this.position, 0xff5030, 3.2, 0.9);
          setTimeout(() => {
            if (this.dead) return;
            const d = player.position.clone().sub(this.position).setY(0).length();
            if (d < 8 && !player.dead) player.takeDamage(this.def.atk * 1.6, this.position);
            g.effects.ring(this.position, 0xffa040, 4, 0.5);
            g.audio.bossRoar();
          }, 850);
        }
      }
    } else {
      // wander around home
      if (this.state === 'idle' && this.stateTime > rand(2, 5)) {
        this.state = 'wander';
        this.stateTime = 0;
        const ang = Math.random() * Math.PI * 2;
        this.wanderTarget = this.home.clone().add(
          new THREE.Vector3(Math.cos(ang) * rand(2, 7), 0, Math.sin(ang) * rand(2, 7)),
        );
      } else if (this.state === 'wander' && this.wanderTarget) {
        const toT = this.wanderTarget.clone().sub(this.position).setY(0);
        if (toT.length() < 0.5 || this.stateTime > 6) {
          this.state = 'idle'; this.stateTime = 0;
        } else {
          this.position.addScaledVector(toT.normalize(), this.def.speed * 0.35 * dt);
          moving = true;
        }
      }
    }

    // attack windup → strike
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.armR) this.armR.rotation.x = -1.8 * (this.windup / 0.45);
      if (this.windup <= 0) {
        if (this.armR) this.armR.rotation.x = 0.6;
        const d = player.position.clone().sub(this.position).setY(0).length();
        if (d < this.def.atkR + 0.6 && !player.dead && !g.world.isSafeZone(player.position)) {
          player.takeDamage(this.def.atk * rand(0.85, 1.15), this.position);
        }
      }
    } else if (this.armR) {
      this.armR.rotation.x *= 1 - Math.min(1, 6 * dt);
    }

    // face movement/player
    const face = this.aggro && !player.dead ? toPlayer : (this.wanderTarget ? this.wanderTarget.clone().sub(this.position) : null);
    if (face && face.lengthSq() > 0.001) {
      const targetYaw = Math.atan2(face.x, face.z) - Math.PI / 2;
      let dy = targetYaw - this.mesh.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.mesh.rotation.y += dy * Math.min(1, 8 * dt);
    }

    // leg animation
    const rate = moving ? (this.aggro ? 11 : 6) : 0;
    for (let i = 0; i < this.legs.length; i++) {
      const target = rate ? Math.sin(this.animT * rate + i * Math.PI) * 0.5 : 0;
      this.legs[i].rotation.x += (target - this.legs[i].rotation.x) * Math.min(1, 10 * dt);
    }

    g.world.clampPosition(this.position, this.def.radius);
    // keep boss inside its arena
    if (this.isBoss) {
      const dx = this.position.x - BOSS_ARENA.x, dz = this.position.z - BOSS_ARENA.z;
      const d = Math.hypot(dx, dz);
      const maxD = BOSS_ARENA.r - 1.5;
      if (d > maxD) {
        this.position.x = BOSS_ARENA.x + (dx / d) * maxD;
        this.position.z = BOSS_ARENA.z + (dz / d) * maxD;
      }
    }
  }
}

// ---------------- spawner ----------------

export function createSpawns(game) {
  const enemies = [];
  const add = (type, x, z) => {
    const e = new Enemy(type, new THREE.Vector3(x, 0, z), game);
    enemies.push(e);
    return e;
  };

  // boars in the meadows near town
  for (let i = 0; i < 9; i++) {
    const ang = rand(0, Math.PI * 2);
    const r = rand(TOWN_RADIUS + 8, TOWN_RADIUS + 26);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (Math.hypot(x - BOSS_ARENA.x, z - BOSS_ARENA.z) < BOSS_ARENA.r + 10) { i--; continue; }
    add('boar', x, z);
  }
  // wolves further out
  for (let i = 0; i < 7; i++) {
    const ang = rand(0, Math.PI * 2);
    const r = rand(TOWN_RADIUS + 32, WORLD_RADIUS - 25);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (Math.hypot(x - BOSS_ARENA.x, z - BOSS_ARENA.z) < BOSS_ARENA.r + 12) { i--; continue; }
    add('wolf', x, z);
  }
  // kobold sentinels guarding the approach to the gate
  add('kobold', -8, -78);
  add('kobold', 8, -74);
  add('kobold', -4, -88);
  add('kobold', 10, -86);

  return enemies;
}
