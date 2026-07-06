import * as THREE from 'three';
import { toon, glow, capsule, sphere, box, cyl, cone, shadowAll, addOutline, buildBoneAxe, buildBuckler, buildTalwar, buildHalberd, buildMace } from './modelkit.js';
import { terrainHeight, POI, ISLAND_R, distToRoad } from './terrain.js';

// ---------------------------------------------------------------------------
// Floor 1 bestiary (canon): Frenzy Boars in the starting plains, Dire Wolves
// further out, Little Nepents in Horunka's forest, Ruin Kobold Troopers in
// the Labyrinth approach — and Illfang the Kobold Lord with his Ruin Kobold
// Sentinel attendants and the infamous Talwar phase.
// ---------------------------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a);
const H = terrainHeight;

// ============================== models ==============================

function buildBoar() {
  const g = new THREE.Group();
  const hide = toon(0x8a6a54);
  const maneM = toon(0x5a463a);
  const body = sphere(0.62, hide, 14, 10);
  body.scale.set(1.4, 1, 1.05);
  body.position.y = 0.78;
  const mane = sphere(0.5, maneM, 10, 8);
  mane.scale.set(1.1, 0.75, 1.0);
  mane.position.set(0.25, 1.1, 0);
  const head = sphere(0.4, hide, 12, 9);
  head.scale.set(1.1, 0.95, 0.9);
  head.position.set(0.95, 0.72, 0);
  const snout = cyl(0.16, 0.2, 0.3, toon(0xa08a78), 8);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(1.38, 0.62, 0);
  const tuskMat = toon(0xf2ead8);
  for (const s of [-1, 1]) {
    const tusk = cone(0.055, 0.34, tuskMat, 6);
    tusk.position.set(1.3, 0.52, s * 0.2);
    tusk.rotation.set(0, 0, 0.8);
    tusk.rotation.x = -s * 0.35;
    g.add(tusk);
    const ear = cone(0.09, 0.2, maneM, 5);
    ear.position.set(0.75, 1.05, s * 0.28);
    ear.rotation.x = -s * 0.5;
    g.add(ear);
    const eye = sphere(0.05, glow(0xff4030, 1.5), 6, 5);
    eye.position.set(1.16, 0.88, s * 0.22);
    eye.userData.noOutline = true;
    g.add(eye);
  }
  const tail = capsule(0.035, 0.22, hide);
  tail.position.set(-0.85, 1.0, 0);
  tail.rotation.z = 0.8;
  g.add(body, mane, head, snout, tail);
  const legs = [];
  for (const [lx, lz] of [[0.5, 0.3], [0.5, -0.3], [-0.5, 0.3], [-0.5, -0.3]]) {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.62, lz);
    const l = capsule(0.09, 0.3, hide);
    l.position.y = -0.3;
    leg.add(l);
    g.add(leg); legs.push(leg);
  }
  shadowAll(g); addOutline(g, 0.03);
  return { group: g, legs, hitY: 0.85 };
}

function buildWolf() {
  const g = new THREE.Group();
  const fur = toon(0x6e7684);
  const furDark = toon(0x565e6c);
  const body = capsule(0.34, 0.8, fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.88;
  const chest = sphere(0.4, fur, 12, 9);
  chest.scale.set(1.05, 1, 0.95);
  chest.position.set(0.5, 0.9, 0);
  const head = sphere(0.26, fur, 12, 9);
  head.position.set(1.0, 1.12, 0);
  const muzzle = capsule(0.11, 0.16, furDark);
  muzzle.rotation.z = Math.PI / 2;
  muzzle.position.set(1.3, 1.04, 0);
  const nose = sphere(0.05, toon(0x22262e), 6, 5);
  nose.position.set(1.44, 1.06, 0);
  for (const s of [-1, 1]) {
    const ear = cone(0.09, 0.24, fur, 5);
    ear.position.set(0.9, 1.4, s * 0.14);
    ear.rotation.x = -s * 0.25;
    g.add(ear);
    const eye = sphere(0.045, glow(0xffd020, 1.6), 6, 5);
    eye.position.set(1.16, 1.2, s * 0.13);
    eye.userData.noOutline = true;
    g.add(eye);
  }
  const tail = capsule(0.09, 0.42, furDark);
  tail.position.set(-0.95, 1.12, 0);
  tail.rotation.z = -0.9;
  g.add(body, chest, head, muzzle, nose, tail);
  const legs = [];
  for (const [lx, lz] of [[0.55, 0.2], [0.55, -0.2], [-0.55, 0.2], [-0.55, -0.2]]) {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.72, lz);
    const l = capsule(0.07, 0.42, fur);
    l.position.y = -0.34;
    leg.add(l);
    g.add(leg); legs.push(leg);
  }
  shadowAll(g); addOutline(g, 0.028);
  return { group: g, legs, hitY: 0.95 };
}

// Little Nepent — the carnivorous plant from the Horunka quest. The variant
// with a red flower carries the Ovule.
function buildNepent(hasFlower = false) {
  const g = new THREE.Group();
  const plant = toon(0x4a8a3c);
  const plantDark = toon(0x3a6e30);
  // pitcher body via lathe
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const r = 0.18 + Math.sin(t * Math.PI) * 0.34 + t * 0.05;
    pts.push(new THREE.Vector2(r, t * 1.15));
  }
  const bodyGeo = new THREE.LatheGeometry(pts, 14);
  const body = new THREE.Mesh(bodyGeo, plant);
  body.position.y = 0.2;
  // mouth lid
  const lid = cone(0.34, 0.3, plantDark, 10);
  lid.position.set(0.08, 1.5, 0);
  lid.rotation.z = -0.7;
  // teeth
  for (let i = 0; i < 5; i++) {
    const tooth = cone(0.035, 0.1, toon(0xe8e8d0), 4);
    tooth.position.set(0.22, 1.36 - 0.0 * i, -0.16 + i * 0.08);
    tooth.rotation.z = 1.4;
    g.add(tooth);
  }
  // leaf collar
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const leaf = cone(0.16, 0.75, plantDark, 4);
    leaf.position.set(Math.cos(ang) * 0.3, 0.3, Math.sin(ang) * 0.3);
    leaf.rotation.set(Math.sin(ang) * 1.25, 0, -Math.cos(ang) * 1.25);
    g.add(leaf);
  }
  // vine arms
  const vines = [];
  for (const s of [-1, 1]) {
    const vine = new THREE.Group();
    vine.position.set(s * 0.36, 0.9, 0);
    const v1 = capsule(0.05, 0.4, plant);
    v1.position.y = 0.15;
    v1.rotation.z = s * 0.9;
    const v2 = capsule(0.04, 0.3, plantDark);
    v2.position.set(s * 0.3, 0.45, 0);
    v2.rotation.z = s * 1.5;
    vine.add(v1, v2);
    g.add(vine); vines.push(vine);
  }
  if (hasFlower) {
    const stem = capsule(0.03, 0.3, plantDark);
    stem.position.set(-0.15, 1.65, 0);
    const bloom = sphere(0.14, toon(0xd84a5a), 8, 6);
    bloom.scale.y = 0.7;
    bloom.position.set(-0.15, 1.85, 0);
    const core = sphere(0.06, glow(0xffd24a, 1.6), 6, 5);
    core.position.set(-0.15, 1.92, 0);
    core.userData.noOutline = true;
    g.add(stem, bloom, core);
  }
  g.add(body, lid);
  shadowAll(g); addOutline(g, 0.026);
  return { group: g, legs: [], vines, hitY: 0.9 };
}

// Kobold humanoid base, reused by troopers / sentinels / Illfang.
function buildKoboldBase({ scale = 1, skin = 0x9a6248, armored = false, boss = false }) {
  const g = new THREE.Group();
  const skinMat = toon(skin);
  const bellyMat = toon(boss ? 0xc89a7a : 0xc4a284);

  const torso = sphere(0.42, skinMat, 12, 10);
  torso.scale.set(1.05, 1.3, 0.85);
  torso.position.y = 1.35;
  const belly = sphere(0.3, bellyMat, 10, 8);
  belly.scale.set(0.9, 1.1, 0.6);
  belly.position.set(0, 1.25, 0.22);
  g.add(torso, belly);
  if (armored) {
    const plate = box(0.72, 0.55, 0.14, toon(0x5a5e6a));
    plate.position.set(0, 1.55, 0.3);
    const pauldL = sphere(0.18, toon(0x4a4e5a), 8, 6);
    pauldL.position.set(-0.5, 1.75, 0);
    const pauldR = pauldL.clone(); pauldR.position.x = 0.5;
    g.add(plate, pauldL, pauldR);
  }
  if (boss) {
    // armored kilt
    const kilt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 0.55, 10, 1, true), toon(0x4a3828));
    kilt.position.y = 0.78;
    g.add(kilt);
    // mane of grey fur
    const mane = sphere(0.4, toon(0x8a8890), 10, 8);
    mane.scale.set(1.15, 0.7, 0.9);
    mane.position.set(0, 1.95, -0.1);
    g.add(mane);
  }

  // dog head
  const head = sphere(0.3, skinMat, 12, 9);
  head.position.y = 2.15;
  const muzzle = capsule(0.13, 0.18, bellyMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 2.08, 0.3);
  const jaw = box(0.2, 0.08, 0.24, skinMat);
  jaw.position.set(0, 1.95, 0.26);
  g.add(head, muzzle, jaw);
  for (const s of [-1, 1]) {
    const ear = cone(0.1, 0.4, skinMat, 5);
    ear.position.set(s * 0.24, 2.5, -0.05);
    ear.rotation.z = -s * 0.45;
    const eye = sphere(0.055, glow(boss ? 0xff2010 : 0xffc020, 1.8), 6, 5);
    eye.position.set(s * 0.13, 2.22, 0.26);
    eye.userData.noOutline = true;
    // fangs
    const fang = cone(0.025, 0.09, toon(0xf0ead8), 4);
    fang.position.set(s * 0.08, 1.92, 0.34);
    fang.rotation.x = Math.PI;
    g.add(ear, eye, fang);
  }

  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.24, 0.95, 0);
    const thigh = capsule(0.13, 0.3, skinMat);
    thigh.position.y = -0.25;
    const foot = box(0.22, 0.1, 0.34, toon(0x6a4634));
    foot.position.set(0, -0.62, 0.06);
    leg.add(thigh, foot);
    g.add(leg); legs.push(leg);
  }

  // arms — right arm is the weapon pivot
  const armR = new THREE.Group();
  armR.position.set(0.5, 1.72, 0);
  const armRm = capsule(0.11, 0.34, skinMat);
  armRm.position.y = -0.3;
  armR.add(armRm);
  const armL = new THREE.Group();
  armL.position.set(-0.5, 1.72, 0);
  const armLm = capsule(0.11, 0.34, skinMat);
  armLm.position.y = -0.3;
  armL.add(armLm);
  g.add(armR, armL);

  g.scale.setScalar(scale);
  return { group: g, legs, armR, armL, scale };
}

function buildTrooper() {
  const base = buildKoboldBase({ scale: 1, armored: false });
  const mace = buildMace(0.9);
  mace.position.y = -0.62;
  mace.rotation.x = Math.PI / 2;
  base.armR.add(mace);
  shadowAll(base.group); addOutline(base.group, 0.03);
  return { group: base.group, legs: base.legs, armR: base.armR, hitY: 1.5 };
}

function buildSentinel() {
  const base = buildKoboldBase({ scale: 1.15, skin: 0x8a5a44, armored: true });
  const halberd = buildHalberd(1);
  halberd.position.y = -0.66;
  halberd.rotation.x = Math.PI / 2;
  base.armR.add(halberd);
  shadowAll(base.group); addOutline(base.group, 0.032);
  return { group: base.group, legs: base.legs, armR: base.armR, hitY: 1.7 };
}

// Illfang the Kobold Lord: Bone Axe + Leather Buckler, then the Talwar.
function buildIllfang() {
  const base = buildKoboldBase({ scale: 2.6, skin: 0x8a3428, boss: true });
  const axe = buildBoneAxe(1.0);
  axe.position.y = -0.75;
  axe.rotation.x = Math.PI / 2;
  base.armR.add(axe);
  const buckler = buildBuckler(1.1);
  buckler.position.set(0, -0.55, 0.15);
  base.armL.add(buckler);
  // talwar sheathed on his back until the last HP bar
  const talwar = buildTalwar(1.15);
  talwar.position.set(-0.2, 1.6, -0.55);
  talwar.rotation.set(0.4, 0, 2.4);
  base.group.add(talwar);
  shadowAll(base.group); addOutline(base.group, 0.05);
  return {
    group: base.group, legs: base.legs, armR: base.armR, hitY: 3.6,
    axe, buckler, talwar,
  };
}

// ============================== definitions ==============================

export const ENEMY_TYPES = {
  boar: {
    name: 'Frenzy Boar', level: 1, hp: 42, atk: 7, xp: 16, col: 9,
    speed: 3.6, aggroR: 8, atkR: 1.9, atkCd: 1.6, radius: 0.8, build: buildBoar,
  },
  wolf: {
    name: 'Dire Wolf', level: 3, hp: 88, atk: 13, xp: 34, col: 20,
    speed: 5.4, aggroR: 11, atkR: 2.0, atkCd: 1.3, radius: 0.8, build: buildWolf,
  },
  nepent: {
    name: 'Little Nepent', level: 2, hp: 60, atk: 10, xp: 24, col: 14,
    speed: 1.7, aggroR: 7, atkR: 2.2, atkCd: 1.8, radius: 0.7,
    build: () => buildNepent(false),
  },
  nepentFlower: {
    name: 'Little Nepent', level: 3, hp: 75, atk: 12, xp: 32, col: 18,
    speed: 1.7, aggroR: 7, atkR: 2.2, atkCd: 1.8, radius: 0.7,
    build: () => buildNepent(true), carriesOvule: true,
  },
  trooper: {
    name: 'Ruin Kobold Trooper', level: 6, hp: 150, atk: 19, xp: 65, col: 42,
    speed: 4.4, aggroR: 12, atkR: 2.3, atkCd: 1.7, radius: 0.7, build: buildTrooper,
  },
  sentinel: {
    name: 'Ruin Kobold Sentinel', level: 8, hp: 200, atk: 23, xp: 90, col: 60,
    speed: 4.8, aggroR: 14, atkR: 2.6, atkCd: 1.6, radius: 0.75, build: buildSentinel,
  },
  boss: {
    name: 'Illfang the Kobold Lord', level: 12, hp: 1400, atk: 27, xp: 800, col: 1200,
    speed: 5.4, aggroR: 26, atkR: 3.8, atkCd: 2.1, radius: 1.8,
    build: buildIllfang, boss: true, barCount: 4,
  },
};

// ============================== enemy ==============================

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
    this.vines = built.vines || null;
    this.armR = built.armR || null;
    this.hitY = built.hitY;
    this.bossParts = this.isBoss ? built : null;

    this.mesh.position.copy(pos);
    this.mesh.position.y = H(pos.x, pos.z);
    this.baseScale = this.mesh.scale.x;
    game.scene.add(this.mesh);

    this.home = this.mesh.position.clone();
    this.state = 'idle';
    this.aggro = false;
    this.stateTime = rand(0, 2);
    this.wanderTarget = null;
    this.atkTimer = 0;
    this.windup = 0;
    this.dead = false;
    this.hitPulse = 0;
    this.animT = rand(0, 10);

    // boss phase state
    this.addsSpawned = new Set();
    this.talwarPhase = false;
    this.jumpT = -1;
    this.jumpFrom = new THREE.Vector3();
    this.jumpTo = new THREE.Vector3();
    this.jumpCd = 5;
  }

  get position() { return this.mesh.position; }

  takeDamage(amount, fromPos) {
    if (this.dead) return;
    this.hp -= amount;
    this.hitPulse = 0.12;
    this.aggro = true;
    if (this.state === 'idle' || this.state === 'wander') this.state = 'chase';
    if (this.hp <= 0) { this.die(); return; }
    if (fromPos && !this.isBoss) {
      const dir = this.position.clone().sub(fromPos).setY(0).normalize();
      this.position.addScaledVector(dir, 0.3);
    }
    if (this.isBoss) this.updateBossPhase();
  }

  updateBossPhase() {
    const frac = this.hp / this.maxHp;
    // spawn Ruin Kobold Sentinels as each bar breaks
    for (const thresh of [0.75, 0.5, 0.25]) {
      if (frac <= thresh && !this.addsSpawned.has(thresh)) {
        this.addsSpawned.add(thresh);
        this.game.spawnBossAdds(2);
      }
    }
    // the Talwar: last bar — throws away axe and buckler
    if (frac <= 0.25 && !this.talwarPhase) {
      this.talwarPhase = true;
      const p = this.bossParts;
      if (p) {
        p.axe.visible = false;
        p.buckler.visible = false;
        p.talwar.position.set(0, -0.85, 0.05);
        p.talwar.rotation.set(Math.PI / 2, 0, 0);
        this.armR.add(p.talwar);
      }
      this.game.ui.announce('ILLFANG DRAWS THE TALWAR', 'His attacks grow faster and fiercer', 3000);
      this.game.audio.bossRoar();
      this.game.effects.ring(this.position, 0xff3020, 4.5, 0.9);
    }
  }

  die() {
    this.dead = true;
    this.state = 'dead';
    this.hp = 0;
    const g = this.game;
    g.effects.shatter(this.position, this.isBoss ? 3.6 : 1, this.isBoss ? 0x9fd8ff : 0x7fd8ff);
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

    // hit reaction: quick scale pulse (relative to the model's base scale)
    if (this.hitPulse > 0) {
      this.hitPulse -= dt;
      const s = 1 + Math.max(0, this.hitPulse) * 0.5;
      this.mesh.scale.setScalar(this.baseScale * s);
      if (this.hitPulse <= 0) this.mesh.scale.setScalar(this.baseScale);
    }

    const toPlayer = player.position.clone().sub(this.position).setY(0);
    const distP = toPlayer.length();
    const playerSafe = g.world.isSafeZone(player.position);

    if (!player.dead && !playerSafe && distP < this.def.aggroR) this.aggro = true;
    if (player.dead || playerSafe || distP > this.def.aggroR * 3.5) {
      if (this.aggro && !this.isBoss) { this.aggro = false; this.state = 'idle'; }
      if (this.isBoss && (player.dead || distP > 55)) this.aggro = false;
    }

    let moving = false;

    // ----- boss talwar leap -----
    if (this.isBoss && this.jumpT >= 0) {
      this.jumpT += dt;
      const t = Math.min(1, this.jumpT / 0.65);
      this.position.lerpVectors(this.jumpFrom, this.jumpTo, t);
      this.position.y = H(this.position.x, this.position.z) + Math.sin(t * Math.PI) * 5;
      if (t >= 1) {
        this.jumpT = -1;
        this.position.y = H(this.position.x, this.position.z);
        g.effects.ring(this.position, 0xffa040, 4.5, 0.5);
        g.audio.bossRoar();
        const d = player.position.clone().sub(this.position).setY(0).length();
        if (d < 5 && !player.dead) player.takeDamage(this.def.atk * 1.5, this.position);
      }
      return; // airborne — skip normal AI
    }

    if (this.aggro && !player.dead) {
      if (distP > this.def.atkR) {
        this.state = 'chase';
        const spd = this.def.speed * (this.talwarPhase ? 1.45 : 1);
        this.position.addScaledVector(toPlayer.clone().normalize(), spd * dt);
        moving = true;
      } else if (this.atkTimer <= 0) {
        this.state = 'attack';
        this.windup = 0.45;
        this.atkTimer = this.def.atkCd * (this.talwarPhase ? 0.6 : 1);
      }
      // boss specials
      if (this.isBoss) {
        this.jumpCd -= dt;
        if (this.talwarPhase && this.jumpCd <= 0 && distP > 5 && distP < 24) {
          this.jumpCd = rand(6, 9);
          this.jumpT = 0;
          this.jumpFrom.copy(this.position);
          this.jumpTo.copy(player.position);
          g.effects.ring(player.position, 0xff5030, 3.5, 0.65);
        } else if (!this.talwarPhase && this.jumpCd <= 0 && distP < 10) {
          // axe ground slam
          this.jumpCd = rand(7, 10);
          g.effects.ring(this.position, 0xff5030, 3.4, 0.9);
          const slamPos = this.position.clone();
          setTimeout(() => {
            if (this.dead) return;
            const d = player.position.clone().sub(slamPos).setY(0).length();
            if (d < 8.5 && !player.dead) player.takeDamage(this.def.atk * 1.6, slamPos);
            g.effects.ring(slamPos, 0xffa040, 4.2, 0.5);
            g.audio.bossRoar();
          }, 880);
        }
      }
    } else {
      if (this.state === 'idle' && this.stateTime > rand(2, 5)) {
        this.state = 'wander';
        this.stateTime = 0;
        const ang = Math.random() * Math.PI * 2;
        this.wanderTarget = this.home.clone().add(
          new THREE.Vector3(Math.cos(ang) * rand(2, 6), 0, Math.sin(ang) * rand(2, 6)),
        );
      } else if (this.state === 'wander' && this.wanderTarget) {
        const toT = this.wanderTarget.clone().sub(this.position).setY(0);
        if (toT.length() < 0.5 || this.stateTime > 7) {
          this.state = 'idle'; this.stateTime = 0;
        } else {
          this.position.addScaledVector(toT.normalize(), this.def.speed * 0.32 * dt);
          moving = true;
        }
      }
    }

    // attack windup → strike
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.armR) this.armR.rotation.x = -1.9 * (this.windup / 0.45);
      if (this.vines) for (const v of this.vines) v.rotation.x = -1.2 * (this.windup / 0.45);
      if (this.windup <= 0) {
        if (this.armR) this.armR.rotation.x = 0.7;
        const d = player.position.clone().sub(this.position).setY(0).length();
        if (d < this.def.atkR + 0.6 && !player.dead && !g.world.isSafeZone(player.position)) {
          const mult = this.talwarPhase ? 1.35 : 1;
          player.takeDamage(this.def.atk * mult * rand(0.85, 1.15), this.position);
        }
      }
    } else if (this.armR) {
      this.armR.rotation.x *= 1 - Math.min(1, 6 * dt);
    }

    // facing
    const face = this.aggro && !player.dead
      ? toPlayer
      : (this.wanderTarget ? this.wanderTarget.clone().sub(this.position) : null);
    if (face && face.lengthSq() > 0.001) {
      const targetYaw = Math.atan2(face.x, face.z);
      let dy = targetYaw - this.mesh.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.mesh.rotation.y += dy * Math.min(1, 8 * dt);
    }

    // locomotion animation
    const rate = moving ? (this.aggro ? 11 : 6) : 0;
    for (let i = 0; i < this.legs.length; i++) {
      const target = rate ? Math.sin(this.animT * rate + i * Math.PI) * 0.55 : 0;
      this.legs[i].rotation.x += (target - this.legs[i].rotation.x) * Math.min(1, 10 * dt);
    }
    if (this.vines && this.windup <= 0) {
      for (let i = 0; i < this.vines.length; i++) {
        this.vines[i].rotation.x = Math.sin(this.animT * 2 + i * 2.5) * 0.25;
      }
    }
    // nepents sway
    if (this.type.startsWith('nepent')) {
      this.mesh.rotation.z = Math.sin(this.animT * 1.6) * 0.05;
    }

    g.world.clampPosition(this.position, this.def.radius);
    this.position.y = H(this.position.x, this.position.z);
    // boss stays in his chamber
    if (this.isBoss) {
      const dx = this.position.x - POI.tower.x, dz = this.position.z - POI.tower.z;
      const d = Math.hypot(dx, dz);
      const maxD = 22;
      if (d > maxD) {
        this.position.x = POI.tower.x + (dx / d) * maxD;
        this.position.z = POI.tower.z + (dz / d) * maxD;
      }
    }
  }
}

// ============================== spawner ==============================

export function createSpawns(game) {
  const enemies = [];
  const add = (type, x, z) => {
    const e = new Enemy(type, new THREE.Vector3(x, 0, z), game);
    enemies.push(e);
    return e;
  };
  const nearPOI = (x, z, k, pad = 6) =>
    Math.hypot(x - POI[k].x, z - POI[k].z) < POI[k].r + pad;
  const anyTown = (x, z) =>
    nearPOI(x, z, 'town') || nearPOI(x, z, 'horunka') || nearPOI(x, z, 'tolbana') || nearPOI(x, z, 'tower');

  // Frenzy Boars — meadows outside the Town of Beginnings
  for (let i = 0; i < 10; i++) {
    const ang = rand(0, Math.PI * 2);
    const r = rand(POI.town.r + 10, POI.town.r + 42);
    const x = POI.town.x + Math.cos(ang) * r, z = POI.town.z + Math.sin(ang) * r;
    if (Math.hypot(x, z) > ISLAND_R - 12 || anyTown(x, z) || distToRoad(x, z) < 4) { i--; continue; }
    add('boar', x, z);
  }
  // Dire Wolves — the open plains mid-island
  for (let i = 0; i < 8; i++) {
    const x = rand(-60, 80), z = rand(-70, 40);
    if (anyTown(x, z) || nearPOI(x, z, 'forest', -10) || nearPOI(x, z, 'lake', 4) || distToRoad(x, z) < 5) { i--; continue; }
    add('wolf', x, z);
  }
  // Little Nepents — deep in Horunka's forest (two carry the flower)
  for (let i = 0; i < 8; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(14, POI.forest.r - 6);
    const x = POI.forest.x + Math.cos(ang) * r, z = POI.forest.z + Math.sin(ang) * r;
    if (anyTown(x, z) || Math.hypot(x, z) > ISLAND_R - 10) { i--; continue; }
    add(i < 2 ? 'nepentFlower' : 'nepent', x, z);
  }
  // Ruin Kobold Troopers — the Labyrinth approach
  add('trooper', 14, -128);
  add('trooper', -12, -134);
  add('trooper', 8, -142);
  add('trooper', -6, -120);
  // Sentinels guarding the tower door
  add('sentinel', -5, -125);
  add('sentinel', 5, -125);

  return enemies;
}
