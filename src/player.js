import * as THREE from 'three';
import { SwordTrail } from './effects.js';
import { buildKirito } from './characters.js';
import { buildSword } from './modelkit.js';
import { terrainHeight } from './terrain.js';

// ---------------------------------------------------------------------------
// The player. One-handed sword skills from Floor 1 canon:
//   Horizontal · Rage Spike · Vertical Arc
// Starts with the Small Sword; earns the Anneal Blade from the Horunka
// quest and the Coat of Midnight from the floor boss.
// ---------------------------------------------------------------------------

const SKILLS = [
  { name: 'Horizontal', cd: 5, dur: 0.5, mult: 1.7, color: 0x6ee7ff },
  { name: 'Rage Spike', cd: 7, dur: 0.4, mult: 2.3, color: 0xff8a4a },
  { name: 'Vertical Arc', cd: 10, dur: 0.55, mult: 1.5, color: 0xb08aff },
];

export class Player {
  constructor(game) {
    this.game = game;
    this.rig = buildKirito();
    this.mesh = this.rig.root;
    game.scene.add(this.mesh);

    // starter blade — swapped for the Anneal Blade by the Horunka quest
    this.swordMount = new THREE.Group();
    this.swordMount.position.set(0, -0.48, 0.03);
    this.swordMount.rotation.x = Math.PI / 2;
    this.rig.armR.add(this.swordMount);
    this.equipSword({ length: 0.85, width: 0.085, bladeColor: 0xaab4c4, edgeGlow: 0x9fd8ff });
    this.hasAnneal = false;

    this.trail = new SwordTrail(game.scene);

    // stats
    this.level = 1;
    this.xp = 0;
    this.col = 0;
    this.maxHp = 120;
    this.hp = this.maxHp;
    this.dead = false;
    this.atkBonus = 0;

    // movement
    this.vy = 0;
    this.onGround = true;
    this.yaw = 0;
    this.speed = 6.2;
    this.sprintMult = 1.55;
    this.jumpY = 0; // height above terrain

    // combat
    this.attackT = 0;
    this.attackDur = 0.34;
    this.combo = 0;
    this.comboReset = 0;
    this.attackCd = 0;
    this.didHit = false;
    this.iframes = 0;
    this.skillCds = [0, 0, 0];
    this.activeSkill = -1;
    this.skillT = 0;
    this.arcHits = 0;
    this.animT = 0;

    this._tipA = new THREE.Vector3();
    this._tipB = new THREE.Vector3();

    this.setPosition(0, 118); // just inside the Town of Beginnings plaza
  }

  setPosition(x, z) {
    this.mesh.position.set(x, terrainHeight(x, z), z);
    this.jumpY = 0;
    this.vy = 0;
  }

  get position() { return this.mesh.position; }
  get atk() { return 12 + this.level * 4 + this.atkBonus; }
  xpToNext() { return Math.floor(50 * Math.pow(this.level, 1.35)); }

  equipSword(opts) {
    while (this.swordMount.children.length) this.swordMount.remove(this.swordMount.children[0]);
    this.sword = buildSword(opts);
    this.sword.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    this.swordMount.add(this.sword);
  }

  equipAnnealBlade() {
    this.hasAnneal = true;
    this.atkBonus = 10;
    this.equipSword({ length: 1.05, width: 0.1, bladeColor: 0x7a90b8, edgeGlow: 0x8ac8ff, guardColor: 0x8a94ac });
  }

  equipCoat() { this.rig.equipCoat(); }

  gainXP(amount) {
    this.xp += amount;
    const ui = this.game.ui;
    ui.spawnDamage(this.position.clone().add(new THREE.Vector3(0, 1.6, 0)), `+${amount} XP`, 'xp');
    while (this.xp >= this.xpToNext()) {
      this.xp -= this.xpToNext();
      this.level++;
      this.maxHp = 120 + (this.level - 1) * 28;
      this.hp = this.maxHp;
      ui.setLevel(this.level);
      ui.setPlayerHP(this.hp, this.maxHp);
      ui.announce('LEVEL UP', `You are now level ${this.level}`, 2600);
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
    this.setPosition(0, 118);
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
    this.arcHits = 0;
    this.trail.setColor(s.color);
    this.game.audio.skill();
    this.game.ui.announce(s.name.toUpperCase(), '', 900);
    if (i === 1) {
      this.dashDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.rageHit = new Set();
    }
  }

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

    // jump & gravity relative to terrain
    if (input.space && this.onGround) {
      this.vy = 7.5;
      this.onGround = false;
    }
    this.vy -= 20 * dt;
    this.jumpY += this.vy * dt;
    if (this.jumpY <= 0) {
      this.jumpY = 0;
      this.vy = 0;
      this.onGround = true;
    }

    g.world.clampPosition(this.position, 0.45);
    this.position.y = terrainHeight(this.position.x, this.position.z) + this.jumpY;

    // town regen
    if (g.world.isSafeZone(this.position) && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.06 * dt);
      g.ui.setPlayerHP(this.hp, this.maxHp);
    }

    // ----- animation -----
    const p = this.rig;
    const walkRate = sprint ? 13 : 9;
    if (moving && this.onGround) {
      p.legL.rotation.x = Math.sin(this.animT * walkRate) * 0.65;
      p.legR.rotation.x = -Math.sin(this.animT * walkRate) * 0.65;
      if (this.attackT <= 0 && this.activeSkill < 0) {
        p.armR.rotation.x = -Math.sin(this.animT * walkRate) * 0.5;
      }
      p.armL.rotation.x = Math.sin(this.animT * walkRate) * 0.5;
      // subtle run lean
      p.torso.rotation.x = sprint ? 0.12 : 0.05;
    } else {
      p.legL.rotation.x *= 1 - Math.min(1, 8 * dt);
      p.legR.rotation.x *= 1 - Math.min(1, 8 * dt);
      p.armL.rotation.x *= 1 - Math.min(1, 8 * dt);
      p.torso.rotation.x *= 1 - Math.min(1, 6 * dt);
    }
    if (!this.onGround) {
      p.legL.rotation.x = 0.4; p.legR.rotation.x = -0.3;
    }
    // idle breath
    p.head.position.y = 1.58 + Math.sin(this.animT * 2.2) * 0.008;

    // ----- basic attack swing -----
    if (this.attackT > 0) {
      this.attackT -= dt;
      const t = 1 - this.attackT / this.attackDur;
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
      if (!this.didHit && t > 0.35) {
        this.didHit = true;
        this.meleeHit(1 + this.combo * 0.15);
      }
      if (this.attackT <= 0) p.armR.rotation.set(0, 0, 0);
    }

    // ----- sword skills -----
    if (this.activeSkill >= 0) {
      const s = SKILLS[this.activeSkill];
      this.skillT -= dt;
      const t = 1 - Math.max(0, this.skillT) / s.dur;
      if (this.activeSkill === 0) {
        // Horizontal — full spinning slash
        this.mesh.rotation.y = this.yaw + t * Math.PI * 2;
        p.armR.rotation.x = -1.4;
        p.armR.rotation.z = -1.2;
        this.pushTrail();
        if (!this.didHit && t > 0.4) {
          this.didHit = true;
          this.meleeHit(s.mult, 3.4, Math.PI * 2.1);
          g.effects.ring(this.position, s.color, 2.6, 0.5);
        }
      } else if (this.activeSkill === 1) {
        // Rage Spike — dashing thrust
        p.armR.rotation.x = -Math.PI / 2;
        const dashSpd = 16 * (1 - t * 0.5);
        this.position.addScaledVector(this.dashDir, dashSpd * dt);
        g.world.clampPosition(this.position, 0.45);
        this.position.y = terrainHeight(this.position.x, this.position.z) + this.jumpY;
        this.pushTrail();
        this.meleeHit(s.mult, 2.2, 2.4, this.rageHit);
      } else {
        // Vertical Arc — two heavy V-shaped cuts
        const phase = t < 0.5 ? t * 2 : (t - 0.5) * 2;
        p.armR.rotation.x = -2.6 + phase * 3.2;
        p.armR.rotation.z = t < 0.5 ? -0.4 : 0.4;
        this.pushTrail();
        const strike = t < 0.5 ? 1 : 2;
        if (this.arcHits < strike && phase > 0.45) {
          this.arcHits = strike;
          this.meleeHit(s.mult, 2.9, 2.0);
          if (strike === 2) g.audio.swish();
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
    this.sword.updateWorldMatrix(true, false);
    this._tipA.set(0, 0.15, 0).applyMatrix4(this.sword.matrixWorld);
    this._tipB.set(0, 1.05, 0).applyMatrix4(this.sword.matrixWorld);
    this.trail.push(this._tipB, this._tipA);
  }
}

export { SKILLS };
