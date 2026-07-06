import * as THREE from 'three';
import { toon, glow, capsule, sphere, box, cyl, cone, addOutline, shadowAll } from './modelkit.js';
import { terrainHeight } from './terrain.js';

// ---------------------------------------------------------------------------
// Humanoid rig + dressed characters: the player, village NPCs, and the
// giant GM avatar from the opening ceremony.
// ---------------------------------------------------------------------------

// Generic articulated humanoid. Returns pivot groups for animation.
export function buildHumanoid({ skin = 0xf2cfae, height = 1 } = {}) {
  const root = new THREE.Group();
  const skinMat = toon(skin);

  const legL = new THREE.Group(); legL.position.set(-0.11, 0.92, 0);
  const legR = new THREE.Group(); legR.position.set(0.11, 0.92, 0);
  const armL = new THREE.Group(); armL.position.set(-0.31, 1.46, 0);
  const armR = new THREE.Group(); armR.position.set(0.31, 1.46, 0);
  const head = new THREE.Group(); head.position.set(0, 1.58, 0);
  const torso = new THREE.Group(); torso.position.set(0, 1.2, 0);

  const face = sphere(0.155, skinMat, 16, 12);
  face.scale.set(0.95, 1.05, 0.9);
  face.position.y = 0.14;
  head.add(face);

  // anime eyes — flat decals
  const eyeW = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeB = new THREE.MeshBasicMaterial({ color: 0x202838 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.028, 10), eyeW);
    w.position.set(s * 0.055, 0.14, 0.132);
    w.userData.noOutline = true;
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.016, 10), eyeB);
    p.position.set(s * 0.055, 0.14, 0.136);
    p.userData.noOutline = true;
    head.add(w, p);
  }

  root.add(legL, legR, armL, armR, head, torso);
  root.scale.setScalar(height);
  return { root, legL, legR, armL, armR, head, torso, skinMat };
}

function limb(mat, r, len, y = -len / 2 - r) {
  const m = capsule(r, len, mat);
  m.position.y = y;
  return m;
}

// ---------------------------------------------------------------------------
// Kirito — starts in the starter tunic; earns the Coat of Midnight at the
// floor boss.
// ---------------------------------------------------------------------------
export function buildKirito() {
  const rig = buildHumanoid({ skin: 0xf2cfae });
  const { root, legL, legR, armL, armR, head, torso } = rig;

  // swappable outfit materials (unique instances — don't share the cache)
  const tunic = toon(0x3c4c68, { noCache: true });
  const tunicDark = toon(0x2c3850, { noCache: true });
  const trim = toon(0x5c4630, { noCache: true });

  // torso
  const chest = capsule(0.19, 0.3, tunic);
  chest.scale.set(1.15, 1, 0.8);
  chest.position.y = 0.06;
  const strap = box(0.07, 0.5, 0.04, trim);
  strap.rotation.z = 0.55;
  strap.position.set(0, 0.08, 0.16);
  const belt = box(0.42, 0.07, 0.26, toon(0x2a2118));
  belt.position.y = -0.24;
  const buckle = box(0.08, 0.05, 0.02, toon(0xc8b46a));
  buckle.position.set(0, -0.24, 0.13);
  // coat skirt
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.36, 0.5, 12, 1, true),
    tunicDark,
  );
  skirt.position.y = -0.48;
  torso.add(chest, strap, belt, buckle, skirt);

  // shoulders
  for (const [grp, s] of [[armL, -1], [armR, 1]]) {
    const pad = sphere(0.1, tunic, 10, 8);
    pad.scale.set(1.2, 0.8, 1);
    grp.add(pad);
    grp.add(limb(tunic, 0.07, 0.26, -0.2));
    const hand = sphere(0.06, rig.skinMat, 8, 6);
    hand.position.y = -0.46;
    grp.add(hand);
  }

  // legs
  for (const grp of [legL, legR]) {
    grp.add(limb(toon(0x262c3c, { noCache: true }), 0.085, 0.32, -0.24));
    const boot = box(0.14, 0.1, 0.24, toon(0x1c1a16));
    boot.position.set(0, -0.56, 0.04);
    grp.add(boot);
  }

  // hair — black spikes
  const hairMat = toon(0x1a1a22);
  const cap = sphere(0.16, hairMat, 14, 10);
  cap.scale.set(1.02, 0.95, 1.0);
  cap.position.y = 0.2;
  head.add(cap);
  for (let i = 0; i < 9; i++) {
    const spike = cone(0.045, 0.16 + Math.random() * 0.1, hairMat, 6);
    const ang = (i / 9) * Math.PI * 2;
    spike.position.set(Math.cos(ang) * 0.12, 0.28 + Math.sin(i * 2.4) * 0.03, Math.sin(ang) * 0.12 - 0.02);
    spike.rotation.set(Math.sin(ang) * 0.9, 0, -Math.cos(ang) * 0.9);
    head.add(spike);
  }
  const bangs = box(0.26, 0.09, 0.06, hairMat);
  bangs.position.set(0, 0.26, 0.11);
  bangs.rotation.x = 0.35;
  head.add(bangs);

  shadowAll(root);
  addOutline(root, 0.028);

  return {
    ...rig,
    // The Coat of Midnight — awarded after Illfang falls.
    equipCoat() {
      tunic.color.setHex(0x16181f);
      tunicDark.color.setHex(0x101218);
      trim.color.setHex(0x2a2d3a);
    },
  };
}

// ---------------------------------------------------------------------------
// Villagers — ambient NPCs that wander the safe zones.
// ---------------------------------------------------------------------------
const TUNIC_COLORS = [0x8a5a3c, 0x5a7a4a, 0x7a5a8a, 0x4a6a8a, 0xa8724a, 0x6a8a7a];
const HAIR_COLORS = [0x3a2c1c, 0x6a4a28, 0x8a8078, 0x2a2420, 0xa8865a];

export function buildVillager(seed = 0) {
  const r = (n) => { seed = (seed * 9301 + 49297) % 233280; return (seed / 233280) * n; };
  const rig = buildHumanoid({ skin: 0xf2cfae, height: 0.92 + r(0.14) });
  const { root, legL, legR, armL, armR, head, torso } = rig;
  const tunicC = TUNIC_COLORS[Math.floor(r(TUNIC_COLORS.length))];
  const hairC = HAIR_COLORS[Math.floor(r(HAIR_COLORS.length))];
  const tunic = toon(tunicC);

  const chest = capsule(0.19, 0.28, tunic);
  chest.scale.set(1.1, 1, 0.85);
  chest.position.y = 0.05;
  const skirtLen = r(1) > 0.5 ? 0.62 : 0.4; // some wear long skirts
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.34, skirtLen, 10, 1, true),
    toon(new THREE.Color(tunicC).multiplyScalar(0.75).getHex()),
  );
  skirt.position.y = -0.28 - skirtLen / 2 + 0.1;
  torso.add(chest, skirt);

  for (const grp of [armL, armR]) {
    grp.add(limb(tunic, 0.065, 0.24, -0.18));
    const hand = sphere(0.055, rig.skinMat, 8, 6);
    hand.position.y = -0.42;
    grp.add(hand);
  }
  for (const grp of [legL, legR]) {
    grp.add(limb(toon(0x4a4038), 0.08, 0.3, -0.22));
  }

  const hairMat = toon(hairC);
  const cap = sphere(0.16, hairMat, 12, 8);
  cap.scale.set(1.02, 0.9, 1.0);
  cap.position.y = 0.21;
  head.add(cap);
  if (r(1) > 0.5) { // long hair
    const back = capsule(0.09, 0.25, hairMat);
    back.position.set(0, 0.02, -0.12);
    head.add(back);
  }

  shadowAll(root);
  addOutline(root, 0.024);
  return rig;
}

// Ambient NPC behaviour: wander near an anchor point, pause, repeat.
export class NPC {
  constructor(scene, pos, seed = 0, name = '') {
    this.rig = buildVillager(seed);
    this.mesh = this.rig.root;
    this.mesh.position.copy(pos);
    this.name = name;
    this.anchor = pos.clone();
    this.target = null;
    this.pause = Math.random() * 4;
    this.animT = Math.random() * 10;
    this.speed = 1.1 + Math.random() * 0.5;
    scene.add(this.mesh);
  }

  get position() { return this.mesh.position; }

  update(dt) {
    this.animT += dt;
    let moving = false;
    if (this.pause > 0) {
      this.pause -= dt;
    } else if (!this.target) {
      const ang = Math.random() * Math.PI * 2;
      this.target = this.anchor.clone().add(
        new THREE.Vector3(Math.cos(ang) * (2 + Math.random() * 7), 0, Math.sin(ang) * (2 + Math.random() * 7)),
      );
    } else {
      const to = this.target.clone().sub(this.position).setY(0);
      if (to.length() < 0.4) {
        this.target = null;
        this.pause = 2 + Math.random() * 5;
      } else {
        to.normalize();
        this.position.addScaledVector(to, this.speed * dt);
        const yaw = Math.atan2(to.x, to.z);
        let dy = yaw - this.mesh.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.mesh.rotation.y += dy * Math.min(1, 6 * dt);
        moving = true;
      }
    }
    this.position.y = terrainHeight(this.position.x, this.position.z);
    const swing = moving ? Math.sin(this.animT * 7) * 0.5 : 0;
    this.rig.legL.rotation.x += (swing - this.rig.legL.rotation.x) * Math.min(1, 10 * dt);
    this.rig.legR.rotation.x += (-swing - this.rig.legR.rotation.x) * Math.min(1, 10 * dt);
    this.rig.armL.rotation.x += (-swing * 0.7 - this.rig.armL.rotation.x) * Math.min(1, 10 * dt);
    this.rig.armR.rotation.x += (swing * 0.7 - this.rig.armR.rotation.x) * Math.min(1, 10 * dt);
  }
}

// ---------------------------------------------------------------------------
// The giant hooded GM avatar — Kayaba's form at the opening ceremony.
// ---------------------------------------------------------------------------
export function buildGMAvatar() {
  const g = new THREE.Group();
  const robe = toon(0x8a1410, { noCache: true, transparent: true, side: THREE.DoubleSide });
  const robeDark = toon(0x5c0c0a, { noCache: true, transparent: true, side: THREE.DoubleSide });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 2.2, 4.2, 16, 4, true), robe);
  body.position.y = 2.1;
  const shoulders = sphere(0.95, robe, 16, 12);
  shoulders.scale.set(1.25, 0.75, 0.9);
  shoulders.position.y = 4.1;
  // hood — open cone with a black void where the face should be
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.5, 14, 3, true), robe);
  hood.position.y = 5.15;
  const voidFace = sphere(0.5, new THREE.MeshBasicMaterial({ color: 0x080406, transparent: true }), 12, 10);
  voidFace.position.set(0, 4.85, 0.18);
  voidFace.userData.noOutline = true;
  // sleeves + white gloves
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 1.9, 10, 1, true), robeDark);
    sleeve.position.set(s * 1.35, 3.4, 0.4);
    sleeve.rotation.z = s * 0.7;
    sleeve.rotation.x = -0.3;
    const gloveMat = toon(0xe8e4dc, { noCache: true, transparent: true });
    const glove = sphere(0.32, gloveMat, 10, 8);
    glove.scale.set(1, 1.25, 0.75);
    glove.position.set(s * 1.95, 2.6, 0.75);
    g.add(sleeve, glove);
  }
  const hem = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.12, 8, 20), robeDark);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.05;
  g.add(body, shoulders, hood, voidFace, hem);
  g.userData.mats = [robe, robeDark];
  g.traverse((m) => {
    if (m.isMesh && m.material.transparent !== undefined) m.userData.noOutline = true;
  });
  return g;
}
