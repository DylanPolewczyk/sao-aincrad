import * as THREE from 'three';
import { SwordTrail } from './effects.js';

// The player: a procedural black-coat swordsman, third-person controls,
// basic combo attacks and three sword skills.

const lambert = (c) => new THREE.MeshLambertMaterial({ color: c });

function buildCharacter() {
  const g = new THREE.Group();
  const coat = lambert(0x1c1e26);
  const skinM = lambert(0xe8c4a8);
  const hairM = lambert(0x15151c);

  // torso + coat
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), coat);
  torso.position.y = 1.18;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.09, 0.36), lambert(0x3a3f52));
  belt.position.y = 0.84;
  const coatL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.33), coat);
  coatL.position.set(-0.17, 0.52, -0.03);
  const coatR = coatL.clone(); coatR.position.x = 0.17;

  // head
  const headG = new THREE.Group();
  headG.position.y = 1.78;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.38), skinM);
  head.position.y = 0.2;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.44), hairM);
  hair.position.y = 0.38;
  const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.1), hairM);
  bangs.position.set(0, 0.3, 0.18);
  headG.add(head, hair, bangs);

  // arms — right arm is a pivot group so it can swing the sword
  const armR = new THREE.Group();
  armR.position.set(0.41, 1.5, 0);
  const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.22), coat);
  armRMesh.position.y = -0.33;
  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.18), skinM);
  handR.position.y = -0.72;
  armR.add(armRMesh, handR);

  const armL = new THREE.Group();
  armL.position.set(-0.41, 1.5, 0);
  const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.22), coat);
  armLMesh.position.y = -0.33;
  armL.add(armLMesh);

  // legs (pivot at hip)
  const legL = new THREE.Group();
  legL.position.set(-0.16, 0.82, 0);
  const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.26), lambert(0x23252e));
  legLMesh.position.y = -0.4;
  legL.add(legLMesh);
  const legR = new THREE.Group();
  legR.position.set(0.16, 0.82, 0);
  const legRMesh = legLMesh.clone();
  legR.add(legRMesh);

  // sword — Elucidator: black blade, glowing edge
  const sword = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.05, 0.16), lambert(0x2a2d38));
  blade.position.y = 0.62;
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 1.05, 0.17),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff }),
  );
  edge.position.y = 0.62;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.2), lambert(0x4a4f63));
  guard.position.y = 0.08;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8), lambert(0x14161c));
  grip.position.y = -0.06;
  sword.add(blade, edge, guard, grip);
  sword.position.set(0, -0.74, 0.05);
  sword.rotation.x = Math.PI / 2; // rest: pointing forward-ish from hand
  armR.add(sword);

  g.add(torso, belt, coatL, coatR, headG, armR, armL, legL, legR);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });

  return { group: g, armR, armL, legL, legR, headG, sword, blade };
}

const SKILLS = [
  { name: 'Horizontal', key: '1', cd: 5, dur: 0.5, mult: 1.7, color: 0x6ee7ff },
  { name: 'Rage Spike', key: '2', cd: 7, dur: 0.4, mult: 2.3, color: 0xff8a4a },
  { name: 'Starburst', key: '3', cd: 14, dur: 1.35, mult: 0.75, color: 0xb08aff },
];

export class Player {
  constructor(game) {
    this.game = game;
    const built = buildCharacter();
    this.mesh = built.group;
    this.parts = built;
    this.mesh.position.set(0, 0, 8);
    game.scene.add(this.mesh);

    this.trail = new SwordTrail(game.scene);

    // stats
    this.level = 1;
    this.xp = 0;
    this.col = 0;
    this.maxHp = 120;
    this.hp = this.maxHp;
    this.dead = false;

    // movement
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.yaw = 0;          // facing
    this.speed = 6.2;
    this.sprintMult = 1.55;

    // combat
    this.attackT = 0;       // time left in current swing
    this.attackDur = 0.34;
    this.combo = 0;
    this.comboReset = 0;
    this.attackCd = 0;
    this.didHit = false;
    this.iframes = 0;
    this.skillCds = [0, 0, 0];
    this.activeSkill = -1;
    this.skillT = 0;
    this.starburstHits = 0;
    this.animT = 0;

    this._tipA = new THREE.Vector3();
    this._tipB = new THREE.Vector3();
  }

  get position() { return this.mesh.position; }
  get atk() { return 12 + this.level * 4; }
  xpToNext() { return Math.floor(50 * Math.pow(this.level, 1.35)); }

  gainXP(amount) {
    this.xp += amount;
    const ui = this.game.ui;
    ui.spawnDamage(this.position.clone().add(new THREE.Vector3(0, 1.6, 0)), `+${amount} XP`, 'xp');
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level++;
      const oldMax = this.maxHp;
      this.maxHp = 120 + (this.level - 1) * 28;
      this.hp = this.maxHp;
      ui.setLevel(this.level);
      ui.announce('LEVEL UP', `You are now level ${this.level} · Max HP ${oldMax} → ${this.maxHp}`);
      this.game.effects.pillar(this.position);
      this.game.effects.ring(this.position, 0x6ee7ff, 2.2);
      this.game.audio.levelUp();
      this.game.save();
    }
    ui.setXP(this.xp / this.xpToNext());
  }

  takeDamage(amount, fromPos) {
    if (this.dead || this.iframes > 0) return;
    amount = Math.round(amount);
    this.hp -= amount;
    this.iframes = 0.5;
    const g = this.game;
    g.ui.spawnDamage(this.position.clone().add(new THREE.Vector3(0, 1.8, 0)), `-${amount}`, 'player-hit');
    g.ui.setPlayerHP(this.hp, this.maxHp);
    g.audio.hurt();
    if (fromPos) {
      const dir = this.position.clone().sub(fromPos).setY(0).normalize();
      this.position.addScaledVector(dir, 0.7);
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.hp = 0;
      g.effects.shatter(this.position, 1.3, 0xff6a5a);
      this.mesh.visible = false;
      g.onPlayerDeath();
    }
  }

  respawn() {
    this.dead = false;
    this.hp = this.maxHp;
    this.mesh.visible = true;
    this.mesh.position.set(0, 0, 8);
    this.vy = 0;
    this.game.ui.setPlayerHP(this.hp, this.maxHp);
  }

  // ---------- combat ----------
  tryAttack() {
    if (this.dead || this.attackCd > 0 || this.activeSkill >= 0) return;
    this.combo = this.comboReset > 0 ? (this.combo + 1) % 3 : 0;
    this.comboReset = 1.1;
    this.attackDur = 0.3 + this.combo * 0.05;
    this.attackT = this.attackDur;
    this.attackCd = this.attackDur + 0.12;
    this.didHit = false;
    this.trail.setColor(0x6ee7ff);
    this.game.audio.swish();
  }

  trySkill(i) {
    if (this.dead || this.skillCds[i] > 0 || this.activeSkill >= 0 || this.attackT > 0) return;
    const s = SKILLS[i];
    this.activeSkill = i;
    this.skillT = s.dur;
    this.skillCds[i] = s.cd;
    this.didHit = false;
    this.starburstHits = 0;
    this.trail.setColor(s.color);
    this.game.audio.skill();
    this.game.ui.announce(s.name.toUpperCase(), '', 900);
    if (i === 1) {
      // Rage Spike: dash forward
      this.dashDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.rageHit = new Set();
    }
  }

  // deal damage in a melee arc; returns true if anything was hit
  meleeHit(mult, range = 2.7, arc = 2.1, excludeSet = null) {
    const g = this.game;
    let hitAny = false;
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (excludeSet && excludeSet.has(e)) continue;
      const to = e.position.clone().sub(this.position).setY(0);
      const d = to.length();
      if (d > range + e.def.radius) continue;
      if (d > 0.01 && fwd.angleTo(to.normalize()) > arc / 2) continue;
      const isCrit = Math.random() < 0.12;
      const dmg = Math.round(this.atk * mult * (isCrit ? 2 : 1) * (0.9 + Math.random() * 0.2));
      e.takeDamage(dmg, this.position);
      if (excludeSet) excludeSet.add(e);
      const hitPos = e.position.clone(); hitPos.y += e.hitY;
      g.ui.spawnDamage(hitPos, String(dmg), isCrit ? 'crit' : '');
      g.effects.hitSpark(hitPos, isCrit ? 0xffe27a : 0xffd070);
      isCrit ? g.audio.crit() : g.audio.hit();
      hitAny = true;
    }
    return hitAny;
  }

  // ---------- per-frame ----------
  update(dt, input, camYaw) {
    const g = this.game;
    this.animT += dt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.comboReset = Math.max(0, this.comboReset - dt);
    for (let i = 0; i < 3; i++) {
      this.skillCds[i] = Math.max(0, this.skillCds[i] - dt);
      g.ui.setSkillCD(i, this.skillCds[i] / SKILLS[i].cd);
    }
    if (this.dead) { this.trail.update(dt); return; }

    // ----- movement -----
    let mx = 0, mz = 0;
    if (input.w) mz += 1;
    if (input.s) mz -= 1;
    if (input.a) mx -= 1;
    if (input.d) mx += 1;
    const moving = (mx || mz) && this.activeSkill !== 1;
    const sprint = input.shift && moving;

    if (moving) {
      const ang = camYaw + Math.atan2(-mx, mz);
      const spd = this.speed * (sprint ? this.sprintMult : 1);
      this.position.x += Math.sin(ang) * spd * dt;
      this.position.z += Math.cos(ang) * spd * dt;
      // face movement direction unless mid-attack (then face camera fwd)
      const targetYaw = (this.attackT > 0 || this.activeSkill >= 0) ? camYaw : ang;
      let dy = targetYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, 12 * dt);
    } else if (this.attackT > 0 || this.activeSkill >= 0) {
      let dy = camYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, 14 * dt);
    }
    this.mesh.rotation.y = this.yaw;

    // jump & gravity
    if (input.space && this.onGround) {
      this.vy = 7.5;
      this.onGround = false;
    }
    this.vy -= 20 * dt;
    this.position.y += this.vy * dt;
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.vy = 0;
      this.onGround = true;
    }

    g.world.clampPosition(this.position, 0.45);

    // town regen
    if (g.world.isSafeZone(this.position) && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.06 * dt);
      g.ui.setPlayerHP(this.hp, this.maxHp);
    }

    // ----- animation -----
    const p = this.parts;
    const walkRate = sprint ? 13 : 9;
    if (moving && this.onGround) {
      p.legL.rotation.x = Math.sin(this.animT * walkRate) * 0.65;
      p.legR.rotation.x = -Math.sin(this.animT * walkRate) * 0.65;
      if (this.attackT <= 0 && this.activeSkill < 0) {
        p.armR.rotation.x = -Math.sin(this.animT * walkRate) * 0.5;
      }
      p.armL.rotation.x = Math.sin(this.animT * walkRate) * 0.5;
    } else {
      p.legL.rotation.x *= 1 - Math.min(1, 8 * dt);
      p.legR.rotation.x *= 1 - Math.min(1, 8 * dt);
      p.armL.rotation.x *= 1 - Math.min(1, 8 * dt);
    }
    if (!this.onGround) {
      p.legL.rotation.x = 0.4; p.legR.rotation.x = -0.3;
    }

    // ----- basic attack swing -----
    if (this.attackT > 0) {
      this.attackT -= dt;
      const t = 1 - this.attackT / this.attackDur; // 0→1
      // arm swings across: combo alternates diagonal/horizontal
      const swing = Math.sin(t * Math.PI);
      if (this.combo === 0) {
        p.armR.rotation.x = -2.4 + t * 2.9;
        p.armR.rotation.z = -0.3 * swing;
      } else if (this.combo === 1) {
        p.armR.rotation.x = -0.5 - swing * 0.4;
        p.armR.rotation.z = 1.2 - t * 2.4;
      } else {
        p.armR.rotation.x = -2.8 + t * 3.4;
        p.armR.rotation.z = 0.35 * Math.sin(t * Math.PI * 2);
      }
      this.pushTrail();
      // hit at mid-swing
      if (!this.didHit && t > 0.35) {
        this.didHit = true;
        this.meleeHit(1 + this.combo * 0.15);
      }
      if (this.attackT <= 0) {
        p.armR.rotation.set(0, 0, 0);
      }
    }

    // ----- sword skills -----
    if (this.activeSkill >= 0) {
      const s = SKILLS[this.activeSkill];
      this.skillT -= dt;
      const t = 1 - Math.max(0, this.skillT) / s.dur;
      if (this.activeSkill === 0) {
        // Horizontal: full spin
        this.mesh.rotation.y = this.yaw + t * Math.PI * 2;
        p.armR.rotation.x = -1.4;
        p.armR.rotation.z = -1.2;
        this.pushTrail();
        if (!this.didHit && t > 0.4) {
          this.didHit = true;
          this.meleeHit(s.mult, 3.4, Math.PI * 2.1);
          this.game.effects.ring(this.position, s.color, 2.6, 0.5);
        }
      } else if (this.activeSkill === 1) {
        // Rage Spike: thrust while dashing
        p.armR.rotation.x = -Math.PI / 2;
        const dashSpd = 16 * (1 - t * 0.5);
        this.position.addScaledVector(this.dashDir, dashSpd * dt);
        g.world.clampPosition(this.position, 0.45);
        this.pushTrail();
        this.meleeHit(s.mult, 2.2, 2.4, this.rageHit);
      } else {
        // Starburst: 8 rapid strikes
        p.armR.rotation.x = -2.2 + Math.sin(t * Math.PI * 8) * 1.4;
        p.armR.rotation.z = Math.cos(t * Math.PI * 8) * 0.8;
        this.pushTrail();
        const strikeIdx = Math.floor(t * 8);
        if (strikeIdx > this.starburstHits && strikeIdx <= 8) {
          this.starburstHits = strikeIdx;
          this.meleeHit(s.mult, 3.0, 2.3);
          g.audio.swish();
        }
      }
      if (this.skillT <= 0) {
        this.activeSkill = -1;
        p.armR.rotation.set(0, 0, 0);
        this.mesh.rotation.y = this.yaw;
      }
    }

    this.trail.update(dt);
    g.ui.setXP(this.xp / this.xpToNext());
  }

  pushTrail() {
    // world positions of blade base and tip
    this.parts.blade.updateWorldMatrix(true, false);
    this._tipA.set(0, -0.45, 0).applyMatrix4(this.parts.blade.matrixWorld);
    this._tipB.set(0, 0.55, 0).applyMatrix4(this.parts.blade.matrixWorld);
    this.trail.push(this._tipB, this._tipA);
  }
}

export { SKILLS };
