import * as THREE from 'three';
import { toon, glow, box, cyl, cone, sphere, capsule, shadowAll, addOutline } from './modelkit.js';
import { buildTerrain, terrainHeight, distToRoad, POI, ISLAND_R } from './terrain.js';
import { NPC } from './characters.js';

// ---------------------------------------------------------------------------
// Floor 1 of Aincrad, lore layout:
//   · Town of Beginnings (south) — walls, Teleport Plaza, Black Iron Palace
//     with the Monument of Life
//   · Horunka Village (west, in the forest) — the Anneal Blade quest village
//   · Tolbana (north) — windmill town where the boss raid was planned
//   · The Labyrinth (far north) — tower to Floor 2, Illfang's boss chamber
// ---------------------------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a);
const H = terrainHeight;

// ============================== small props ==============================

function buildLampPost() {
  const g = new THREE.Group();
  const pole = cyl(0.05, 0.07, 2.6, toon(0x3a3f4a), 8);
  pole.position.y = 1.3;
  const arm = box(0.06, 0.06, 0.5, toon(0x3a3f4a));
  arm.position.set(0, 2.55, 0.2);
  const cage = box(0.22, 0.3, 0.22, toon(0x2a2e38));
  cage.position.set(0, 2.4, 0.42);
  const lamp = sphere(0.09, glow(0xffc86a, 2.2), 8, 6);
  lamp.position.set(0, 2.4, 0.42);
  lamp.userData.noOutline = true;
  g.add(pole, arm, cage, lamp);
  shadowAll(g);
  return g;
}

function buildWell() {
  const g = new THREE.Group();
  const ring = cyl(0.9, 1.0, 0.8, toon(0x8d8478), 12);
  ring.position.y = 0.4;
  const waterM = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), toon(0x3fa8dd));
  waterM.rotation.x = -Math.PI / 2;
  waterM.position.y = 0.7;
  const postL = cyl(0.06, 0.06, 1.6, toon(0x6a4c30), 6);
  postL.position.set(-0.85, 1.2, 0);
  const postR = postL.clone(); postR.position.x = 0.85;
  const roof = cone(1.3, 0.7, toon(0x8a4434), 4);
  roof.position.y = 2.2;
  roof.rotation.y = Math.PI / 4;
  g.add(ring, waterM, postL, postR, roof);
  shadowAll(g);
  return g;
}

function buildBarrel() {
  const b = cyl(0.28, 0.24, 0.7, toon(0x7a5a38), 10);
  b.position.y = 0.35;
  const g = new THREE.Group();
  g.add(b);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 6, 12), toon(0x4a4640));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.5;
  const band2 = band.clone(); band2.position.y = 0.2;
  g.add(band, band2);
  shadowAll(g);
  return g;
}

function buildCrate() {
  const g = new THREE.Group();
  const c = box(0.6, 0.6, 0.6, toon(0x9a7648));
  c.position.y = 0.3;
  const lid = box(0.64, 0.05, 0.64, toon(0x7a5a38));
  lid.position.y = 0.6;
  g.add(c, lid);
  shadowAll(g);
  return g;
}

function buildStall() {
  const g = new THREE.Group();
  const counter = box(1.8, 0.8, 0.8, toon(0x8a6a44));
  counter.position.y = 0.4;
  for (const s of [-1, 1]) {
    const post = cyl(0.05, 0.05, 2.1, toon(0x6a4c30), 6);
    post.position.set(s * 0.85, 1.05, -0.3);
    g.add(post);
  }
  const awning = box(2.1, 0.06, 1.3, toon([0xc85a4a, 0x4a7ac8, 0xc8a44a][Math.floor(Math.random() * 3)]));
  awning.position.set(0, 2.1, 0.1);
  awning.rotation.x = 0.18;
  const goods = box(1.4, 0.25, 0.5, toon(0xc8a45a));
  goods.position.set(0, 0.92, 0);
  g.add(counter, awning, goods);
  shadowAll(g);
  return g;
}

function buildFence(len = 2) {
  const g = new THREE.Group();
  const mat = toon(0x8a6a48);
  for (const x of [-len / 2, len / 2]) {
    const post = cyl(0.05, 0.06, 0.9, mat, 6);
    post.position.set(x, 0.45, 0);
    g.add(post);
  }
  const rail = box(len, 0.07, 0.05, mat);
  rail.position.y = 0.65;
  const rail2 = rail.clone(); rail2.position.y = 0.35;
  g.add(rail, rail2);
  shadowAll(g);
  return g;
}

function buildBanner(color = 0x3a6ac8) {
  const g = new THREE.Group();
  const pole = cyl(0.045, 0.055, 3.4, toon(0x4a4640), 7);
  pole.position.y = 1.7;
  const cloth = box(0.5, 1.2, 0.03, toon(color));
  cloth.position.set(0.28, 2.6, 0);
  const tip = cone(0.07, 0.2, toon(0xc8b46a), 6);
  tip.position.y = 3.5;
  g.add(pole, cloth, tip);
  shadowAll(g);
  return g;
}

// ============================== houses ==============================

const WALLS = [0xe8dcc4, 0xdccfb4, 0xd8c8ae, 0xe2d4be];
const ROOFS = [0xa04a38, 0x8a4434, 0x7a5a8a, 0x5a6a8a];
const TIMBER = 0x6a4c30;

function buildHouse({ w = 6, d = 5, h = 3.2, stories = 1, roofColor, wallColor, shop = false } = {}) {
  const g = new THREE.Group();
  wallColor = wallColor ?? WALLS[Math.floor(Math.random() * WALLS.length)];
  roofColor = roofColor ?? ROOFS[Math.floor(Math.random() * ROOFS.length)];
  const wallMat = toon(wallColor);
  const timberMat = toon(TIMBER);
  const totalH = h * stories;

  // stone footing
  const footing = box(w + 0.3, 0.6, d + 0.3, toon(0x9a948a));
  footing.position.y = 0.3;
  g.add(footing);

  for (let s = 0; s < stories; s++) {
    const y0 = 0.6 + s * h;
    const jetty = s > 0 ? 0.35 : 0; // upper floors overhang
    const body = box(w + jetty, h, d + jetty, wallMat);
    body.position.y = y0 + h / 2;
    g.add(body);
    // timber frame: corner posts + horizontal beams
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = box(0.14, h, 0.14, timberMat);
      post.position.set(sx * (w + jetty) / 2, y0 + h / 2, sz * (d + jetty) / 2);
      g.add(post);
    }
    const beam = box(w + jetty + 0.1, 0.14, d + jetty + 0.1, timberMat);
    beam.position.y = y0 + h;
    g.add(beam);
    // diagonal brace on the front
    const brace = box(0.1, h * 0.9, 0.08, timberMat);
    brace.rotation.z = 0.6;
    brace.position.set(-w / 4, y0 + h / 2, (d + jetty) / 2 + 0.02);
    g.add(brace);
    // glowing windows
    const winMat = glow(0xffd98a, 1.5);
    for (const sx of [-0.28, 0.28]) {
      const win = box(w * 0.18, 0.55, 0.06, winMat);
      win.position.set(sx * w, y0 + h * 0.55, (d + jetty) / 2 + 0.04);
      win.userData.noOutline = true;
      g.add(win);
      const frame = box(w * 0.18 + 0.08, 0.63, 0.05, timberMat);
      frame.position.set(sx * w, y0 + h * 0.55, (d + jetty) / 2 + 0.02);
      g.add(frame);
    }
  }

  // door
  const door = box(0.9, 1.7, 0.1, toon(0x5a3c22));
  door.position.set(0, 0.6 + 0.85, d / 2 + 0.06);
  const knob = sphere(0.05, toon(0xc8b46a), 6, 5);
  knob.position.set(0.28, 1.4, d / 2 + 0.14);
  g.add(door, knob);

  // hipped roof with overhang
  const roof = cone(Math.hypot(w, d) * 0.62, h * 0.8, toon(roofColor), 4);
  roof.position.y = 0.6 + totalH + h * 0.38;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  g.add(roof);
  // chimney
  const chim = box(0.5, 1.3, 0.5, toon(0x8d8478));
  chim.position.set(w * 0.28, 0.6 + totalH + h * 0.5, -d * 0.2);
  g.add(chim);

  if (shop) {
    const sign = box(0.9, 0.5, 0.06, toon(0x8a6a44));
    sign.position.set(w / 2 + 0.5, 2.2, d / 2 - 0.5);
    g.add(sign);
  }
  shadowAll(g);
  return g;
}

// ============================== landmark builders ==============================

function buildTeleportGate() {
  const g = new THREE.Group();
  // dais
  const dais = cyl(3.6, 4.2, 0.5, toon(0xb8b2a4), 24);
  dais.position.y = 0.25;
  const dais2 = cyl(2.9, 3.4, 0.45, toon(0xa39d90), 24);
  dais2.position.y = 0.7;
  // grand ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.22, 12, 40), toon(0x5a6a8a));
  ring.position.y = 3.1;
  const ringGlow = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.07, 8, 40), glow(0x6ee7ff, 2.0));
  ringGlow.position.y = 3.1;
  ringGlow.userData.noOutline = true;
  // swirling portal membrane
  const portal = new THREE.Mesh(
    new THREE.CircleGeometry(1.95, 32),
    new THREE.MeshBasicMaterial({
      color: 0x8adfff, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  portal.position.y = 3.1;
  portal.userData.noOutline = true;
  // flanking obelisks
  for (const s of [-1, 1]) {
    const ob = box(0.55, 4.6, 0.55, toon(0x4a5570));
    ob.position.set(s * 3.1, 3.2, 0);
    const cap = cone(0.42, 0.6, toon(0x4a5570), 4);
    cap.position.set(s * 3.1, 5.8, 0);
    cap.rotation.y = Math.PI / 4;
    const gem = sphere(0.14, glow(0x6ee7ff, 2.2), 8, 6);
    gem.position.set(s * 3.1, 5.5, 0);
    gem.userData.noOutline = true;
    g.add(ob, cap, gem);
  }
  g.add(dais, dais2, ring, ringGlow, portal);
  g.userData.portal = portal;
  g.userData.ring = ringGlow;
  shadowAll(g);
  return g;
}

function buildFountain() {
  const g = new THREE.Group();
  const stoneM = toon(0x9a948a);
  const waterM = toon(0x3fa8dd, { transparent: true, opacity: 0.85 });
  const basin = cyl(3.1, 3.5, 0.9, stoneM, 24);
  basin.position.y = 0.45;
  const water = cyl(2.8, 2.8, 0.15, waterM, 24);
  water.position.y = 0.85;
  const column = cyl(0.4, 0.6, 2.4, stoneM, 12);
  column.position.y = 1.9;
  const bowl = cyl(1.3, 0.9, 0.4, stoneM, 16);
  bowl.position.y = 3.0;
  const bowlWater = cyl(1.15, 1.15, 0.1, waterM, 16);
  bowlWater.position.y = 3.15;
  const spire = cone(0.25, 0.9, stoneM, 8);
  spire.position.y = 3.7;
  g.add(basin, water, column, bowl, bowlWater, spire);
  shadowAll(g);
  return g;
}

// The Black Iron Palace — the dark keep that houses the Monument of Life.
function buildBlackIronPalace() {
  const g = new THREE.Group();
  const iron = toon(0x2e3440);
  const ironDark = toon(0x232834);
  const trim = toon(0x4a5468);

  // main keep
  const keep = box(20, 14, 12, iron);
  keep.position.y = 7;
  g.add(keep);
  const keepRoof = box(21, 1, 13, ironDark);
  keepRoof.position.y = 14.5;
  g.add(keepRoof);
  // battlements
  for (let i = -4; i <= 4; i++) {
    const merlon = box(1.2, 1.2, 1, ironDark);
    merlon.position.set(i * 2.3, 15.5, 6);
    const merlonB = merlon.clone(); merlonB.position.z = -6;
    g.add(merlon, merlonB);
  }
  // corner towers
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const t = cyl(2.2, 2.6, 18, iron, 10);
    t.position.set(sx * 10.5, 9, sz * 6.5);
    const cap = cone(2.8, 3.4, ironDark, 10);
    cap.position.set(sx * 10.5, 19.7, sz * 6.5);
    const spike = cyl(0.06, 0.06, 2, trim, 6);
    spike.position.set(sx * 10.5, 22.3, sz * 6.5);
    g.add(t, cap, spike);
  }
  // central spire
  const spireBase = cyl(3, 3.6, 6, iron, 10);
  spireBase.position.y = 17;
  const spireCap = cone(3.4, 5, ironDark, 10);
  spireCap.position.y = 22.5;
  g.add(spireBase, spireCap);
  // grand entrance
  const arch = box(5, 6.5, 1.2, ironDark);
  arch.position.set(0, 3.25, 6.2);
  const doorway = box(3, 5, 1.4, new THREE.MeshBasicMaterial({ color: 0x0a0c12 }));
  doorway.position.set(0, 2.5, 6.25);
  doorway.userData.noOutline = true;
  g.add(arch, doorway);
  // narrow glowing windows
  for (const sx of [-6, -2.5, 2.5, 6]) {
    const win = box(0.5, 2.2, 0.1, glow(0xffa84a, 1.4));
    win.position.set(sx, 9, 6.05);
    win.userData.noOutline = true;
    g.add(win);
  }
  shadowAll(g);
  return g;
}

// The Monument of Life — every player's name, struck through when they die.
function buildMonument() {
  const g = new THREE.Group();
  const slabM = toon(0x1e222c);
  const base = box(6.5, 0.7, 2.4, toon(0x3a4050));
  base.position.y = 0.35;
  const slab = box(5.6, 3.6, 0.8, slabM);
  slab.position.y = 2.5;
  g.add(base, slab);
  // rows of "names"
  const lineMat = glow(0x8aa4c8, 0.7);
  for (let r = 0; r < 9; r++) {
    for (let cCol = 0; cCol < 4; cCol++) {
      const line = box(0.9, 0.07, 0.02, lineMat);
      line.position.set(-2.1 + cCol * 1.4 + rand(-0.05, 0.05), 4.0 - r * 0.34, 0.42);
      line.userData.noOutline = true;
      g.add(line);
    }
  }
  const cap = box(6, 0.5, 1.1, toon(0x3a4050));
  cap.position.y = 4.55;
  g.add(cap);
  shadowAll(g);
  return g;
}

function buildWindmill() {
  const g = new THREE.Group();
  const body = cyl(2.2, 2.9, 7.5, toon(0xdccfb4), 12);
  body.position.y = 3.75;
  const roofM = cone(2.6, 2.4, toon(0x8a4434), 12);
  roofM.position.y = 8.6;
  const door = box(0.9, 1.6, 0.1, toon(0x5a3c22));
  door.position.set(0, 1.4, 2.72);
  const win = box(0.6, 0.6, 0.08, glow(0xffd98a, 1.4));
  win.position.set(0, 5, 2.48);
  win.userData.noOutline = true;
  // blades
  const hub = new THREE.Group();
  hub.position.set(0, 7.6, 2.9);
  const hubCap = sphere(0.3, toon(0x6a4c30), 8, 6);
  hub.add(hubCap);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    const armB = box(0.14, 3.4, 0.08, toon(0x6a4c30));
    armB.position.y = 1.7;
    const sail = box(0.9, 2.6, 0.04, toon(0xf0e8d8));
    sail.position.set(0.35, 2.0, 0);
    blade.add(armB, sail);
    blade.rotation.z = (i / 4) * Math.PI * 2;
    hub.add(blade);
  }
  g.add(body, roofM, door, win, hub);
  g.userData.hub = hub;
  shadowAll(g);
  return g;
}

// The Labyrinth — the tower that connects Floor 1 to Floor 2.
function buildLabyrinthTower() {
  const g = new THREE.Group();
  const stone = toon(0x6a6a74);
  const stoneDark = toon(0x555560);

  // main shaft with a doorway gap (theta 0 faces +z, toward the road)
  const GAP = 0.34;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 28, 95, 48, 1, true, GAP / 2, Math.PI * 2 - GAP),
    new THREE.MeshToonMaterial({ color: 0x6a6a74, gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide }),
  );
  wall.position.y = 47.5;
  g.add(wall);
  // stacked upper tiers vanishing toward the ceiling of the floor
  for (let i = 0; i < 3; i++) {
    const tier = cyl(20 - i * 4, 23 - i * 4, 26, stoneDark, 32);
    tier.position.y = 95 + 13 + i * 26;
    g.add(tier);
  }
  // ring ledges
  for (const y of [24, 48, 72, 95]) {
    const ledge = new THREE.Mesh(new THREE.TorusGeometry(27.2, 1.1, 8, 40), stoneDark);
    ledge.rotation.x = Math.PI / 2;
    ledge.position.y = y;
    g.add(ledge);
  }
  // buttresses
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.4;
    const b = box(3, 22, 5, stoneDark);
    b.position.set(Math.sin(ang) * 27.5, 11, Math.cos(ang) * 27.5);
    b.rotation.y = ang;
    g.add(b);
  }
  // door arch
  const archL = box(1.6, 12, 2.2, stoneDark);
  archL.position.set(-5, 6, 26.5);
  const archR = archL.clone(); archR.position.x = 5;
  const archT = box(12.5, 2.2, 2.4, stoneDark);
  archT.position.set(0, 12.5, 26.5);
  const keystone = cone(1.2, 1.8, stone, 4);
  keystone.position.set(0, 14.2, 26.5);
  g.add(archL, archR, archT, keystone);

  // ---- interior boss chamber ----
  const floorM = new THREE.Mesh(new THREE.CircleGeometry(25.4, 40), toon(0x50505c));
  floorM.rotation.x = -Math.PI / 2;
  floorM.position.y = 0.06;
  floorM.receiveShadow = true;
  g.add(floorM);
  // chamber ceiling
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(26.2, 40),
    new THREE.MeshBasicMaterial({ color: 0x14161e, side: THREE.DoubleSide }),
  );
  ceil.rotation.x = -Math.PI / 2;
  ceil.position.y = 16;
  ceil.userData.noOutline = true;
  g.add(ceil);
  // pillar ring
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const p = cyl(1.1, 1.4, 16, stone, 10);
    p.position.set(Math.sin(ang) * 17, 8, Math.cos(ang) * 17);
    const capB = box(3, 0.8, 3, stoneDark);
    capB.position.set(Math.sin(ang) * 17, 15.8, Math.cos(ang) * 17);
    g.add(p, capB);
  }
  // braziers with glowing flames
  const flames = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const bowl = cyl(0.6, 0.3, 0.7, stoneDark, 8);
    bowl.position.set(Math.sin(ang) * 12, 1.1, Math.cos(ang) * 12);
    const stand = cyl(0.12, 0.2, 1, stoneDark, 6);
    stand.position.set(Math.sin(ang) * 12, 0.5, Math.cos(ang) * 12);
    const flame = sphere(0.4, glow(0xff8a3c, 2.4), 8, 6);
    flame.scale.y = 1.6;
    flame.position.set(Math.sin(ang) * 12, 1.9, Math.cos(ang) * 12);
    flame.userData.noOutline = true;
    flames.push(flame);
    g.add(bowl, stand, flame);
  }
  // the sealed staircase to Floor 2 behind the boss
  const stairBlock = box(8, 10, 3, stoneDark);
  stairBlock.position.set(0, 5, -22);
  const sealGlow = box(5, 6.5, 0.3, glow(0x4a5aff, 0.9));
  sealGlow.position.set(0, 4, -20.4);
  sealGlow.userData.noOutline = true;
  g.add(stairBlock, sealGlow);

  // warm interior light so the fight is readable
  const chamberLight = new THREE.PointLight(0xffb060, 220, 60, 1.8);
  chamberLight.position.set(0, 10, 0);
  g.add(chamberLight);

  g.userData.flames = flames;
  shadowAll(g);
  return g;
}

// ============================== vegetation (instanced) ==============================

function scatterVegetation(scene, colliders) {
  const mtx = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const eul = new THREE.Euler();

  const inTown = (x, z, pad = 4) =>
    ['town', 'horunka', 'tolbana', 'tower'].some((k) => {
      const p = POI[k];
      return Math.hypot(x - p.x, z - p.z) < p.r + pad;
    });
  const inLake = (x, z, pad = 2) =>
    Math.hypot(x - POI.lake.x, z - POI.lake.z) < POI.lake.r + pad;

  // ---- trees: instanced trunks + canopy blobs ----
  const treeSpots = [];
  // deep forest around Horunka
  for (let i = 0; i < 240 && treeSpots.length < 150; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(6, POI.forest.r);
    const x = POI.forest.x + Math.cos(ang) * r, z = POI.forest.z + Math.sin(ang) * r;
    if (Math.hypot(x, z) > ISLAND_R - 8 || inTown(x, z) || inLake(x, z, 6) || distToRoad(x, z) < 5.5) continue;
    treeSpots.push({ x, z, s: rand(1.1, 1.9), forest: true });
  }
  // scattered across the plains
  for (let i = 0; i < 260 && treeSpots.length < 260; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(30, ISLAND_R - 10);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (inTown(x, z) || inLake(x, z, 6) || distToRoad(x, z) < 6) continue;
    if (Math.hypot(x - POI.forest.x, z - POI.forest.z) < POI.forest.r) continue;
    treeSpots.push({ x, z, s: rand(0.75, 1.4), forest: false });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, toon(0x6d4c33), treeSpots.length);
  trunks.castShadow = true;
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const blobsPerTree = 4;
  const canopies = new THREE.InstancedMesh(
    blobGeo,
    new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap }),
    treeSpots.length * blobsPerTree,
  );
  canopies.castShadow = true;
  const greens = [new THREE.Color(0x3e8a34), new THREE.Color(0x4c9e40), new THREE.Color(0x5cb050), new THREE.Color(0x357a2e)];

  let ci = 0;
  treeSpots.forEach((t, i) => {
    const y = H(t.x, t.z);
    const trunkH = 2.2 * t.s;
    quat.setFromEuler(eul.set(0, rand(0, Math.PI * 2), 0));
    scl.set(t.s, trunkH, t.s);
    mtx.compose(new THREE.Vector3(t.x, y, t.z), quat, scl);
    trunks.setMatrixAt(i, mtx);
    colliders.push({ x: t.x, z: t.z, r: 0.5 * t.s });
    for (let b = 0; b < blobsPerTree; b++) {
      const ba = rand(0, Math.PI * 2), br = b === 0 ? 0 : rand(0.4, 1.0) * t.s;
      const bx = t.x + Math.cos(ba) * br, bz = t.z + Math.sin(ba) * br;
      const by = y + trunkH + rand(-0.3, 0.6) * t.s + (b === 0 ? 0.5 * t.s : 0);
      const bs = (b === 0 ? rand(1.3, 1.7) : rand(0.8, 1.2)) * t.s;
      quat.setFromEuler(eul.set(rand(0, 1), rand(0, Math.PI), rand(0, 1)));
      scl.set(bs, bs * rand(0.75, 0.95), bs);
      mtx.compose(new THREE.Vector3(bx, by, bz), quat, scl);
      canopies.setMatrixAt(ci, mtx);
      canopies.setColorAt(ci, greens[(i + b) % greens.length]);
      ci++;
    }
  });
  scene.add(trunks, canopies);

  // ---- rocks ----
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, toon(0x8d8d95), 42);
  rocks.castShadow = true;
  for (let i = 0; i < 42; i++) {
    let x, z, tries = 0;
    do {
      const ang = rand(0, Math.PI * 2), r = rand(25, ISLAND_R - 8);
      x = Math.cos(ang) * r; z = Math.sin(ang) * r;
    } while ((inTown(x, z) || inLake(x, z) || distToRoad(x, z) < 4) && ++tries < 12);
    const s = rand(0.4, 1.9);
    quat.setFromEuler(eul.set(rand(0, 1), rand(0, Math.PI), rand(0, 1)));
    scl.set(s, s * rand(0.6, 0.9), s);
    mtx.compose(new THREE.Vector3(x, H(x, z) + s * 0.2, z), quat, scl);
    rocks.setMatrixAt(i, mtx);
    if (s > 0.9) colliders.push({ x, z, r: s * 0.85 });
  }
  scene.add(rocks);

  // ---- grass blades ----
  const bladeGeo = new THREE.ConeGeometry(0.06, 0.55, 4);
  bladeGeo.translate(0, 0.24, 0);
  const grass = new THREE.InstancedMesh(bladeGeo, toon(0x6cbf52), 2600);
  const grassGreens = [new THREE.Color(0x6cbf52), new THREE.Color(0x5aa844), new THREE.Color(0x7ed065)];
  for (let i = 0; i < 2600; i++) {
    const ang = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (ISLAND_R - 6);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (inTown(x, z, 0) || inLake(x, z) || distToRoad(x, z) < 2.2) { i--; continue; }
    quat.setFromEuler(eul.set(rand(-0.15, 0.15), rand(0, Math.PI), rand(-0.15, 0.15)));
    const s = rand(0.7, 1.6);
    scl.set(s, s, s);
    mtx.compose(new THREE.Vector3(x, H(x, z), z), quat, scl);
    grass.setMatrixAt(i, mtx);
    grass.setColorAt(i, grassGreens[i % 3]);
  }
  scene.add(grass);

  // ---- flowers ----
  const flowerGeo = new THREE.SphereGeometry(0.09, 6, 5);
  flowerGeo.translate(0, 0.42, 0);
  const flowers = new THREE.InstancedMesh(
    flowerGeo,
    new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap }),
    700,
  );
  const petals = [0xffffff, 0xffd24a, 0xff7ab8, 0x8a6aff, 0xff6a4a].map((c) => new THREE.Color(c));
  for (let i = 0; i < 700; i++) {
    const ang = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (ISLAND_R - 8);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (inTown(x, z, 0) || inLake(x, z) || distToRoad(x, z) < 2.5) { i--; continue; }
    const s = rand(0.7, 1.3);
    quat.setFromEuler(eul.set(0, rand(0, Math.PI), 0));
    scl.set(s, s, s);
    mtx.compose(new THREE.Vector3(x, H(x, z), z), quat, scl);
    flowers.setMatrixAt(i, mtx);
    flowers.setColorAt(i, petals[i % petals.length]);
  }
  scene.add(flowers);
}

// ============================== main build ==============================

export function buildWorld(scene) {
  const colliders = [];
  const animated = { windmillHubs: [], flames: [], portal: null, portalRing: null };

  // ---------- sky ----------
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x9fcdec, 70, 420);
  const skyGeo = new THREE.SphereGeometry(800, 24, 14);
  const skyCols = [];
  const sp = skyGeo.attributes.position;
  const top = new THREE.Color(0x2f74c8), horizon = new THREE.Color(0xcfe8f8);
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i) / 800;
    const c = horizon.clone().lerp(top, Math.max(0, y) ** 0.65);
    skyCols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
  scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));

  // sun disc (bloom halo)
  const sunPos = new THREE.Vector3(300, 340, 180);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(34, 24), glow(0xfff4d8, 3));
  sunDisc.position.copy(sunPos);
  sunDisc.lookAt(0, 0, 0);
  sunDisc.material.fog = false;
  scene.add(sunDisc);

  // underside of Floor 2, far above — you are inside Aincrad
  const ceiling = new THREE.Mesh(
    new THREE.CircleGeometry(1200, 48),
    new THREE.MeshBasicMaterial({ color: 0x26456a, transparent: true, opacity: 0.4, fog: false }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 380;
  scene.add(ceiling);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xd8ecff, 0x5a7048, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0d4, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 90;
  sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
  sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
  sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  // ---------- terrain, island shell ----------
  const terrain = buildTerrain(scene);
  const under = new THREE.Mesh(new THREE.ConeGeometry(ISLAND_R, 120, 56, 4), toon(0x6b5a4a));
  under.rotation.x = Math.PI;
  under.position.y = -61;
  scene.add(under);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 4, 9, 72, 1, true),
    new THREE.MeshToonMaterial({ color: 0x7a6a58, gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide }),
  );
  rim.position.y = -3.5;
  scene.add(rim);

  // clouds below the island edge
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshToonMaterial({
    color: 0xffffff, gradientMap: toon(0xffffff).gradientMap, transparent: true, opacity: 0.92,
  });
  for (let i = 0; i < 22; i++) {
    const cluster = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 4);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(5, 11), 10, 7), cloudMat);
      puff.position.set(rand(-10, 10), rand(-2, 2), rand(-10, 10));
      puff.scale.y = 0.42;
      cluster.add(puff);
    }
    const ang = Math.random() * Math.PI * 2;
    const r = rand(140, 420);
    cluster.position.set(Math.cos(ang) * r, rand(-90, -25), Math.sin(ang) * r);
    cluster.userData.speed = rand(0.6, 1.8);
    clouds.add(cluster);
  }
  scene.add(clouds);

  const place = (obj, x, z, rotY = 0, colR = 0) => {
    obj.position.set(x, H(x, z), z);
    obj.rotation.y = rotY;
    scene.add(obj);
    if (colR > 0) colliders.push({ x, z, r: colR });
    return obj;
  };

  // ================= Town of Beginnings =================
  const T = POI.town;

  // town wall ring with north gate
  const wallMat = toon(0xa8a296);
  const wallR = 42;
  const wallSegs = 34;
  for (let i = 0; i < wallSegs; i++) {
    const ang = (i / wallSegs) * Math.PI * 2;
    // gate gap faces north (toward -z from town center → local dir (0,-1))
    const dirAng = Math.atan2(-1, 0); // -π/2
    let dd = Math.abs(ang - (dirAng + Math.PI * 2) % (Math.PI * 2));
    if (dd > Math.PI) dd = Math.PI * 2 - dd;
    if (dd < 0.09) continue;
    const x = T.x + Math.cos(ang) * wallR, z = T.z + Math.sin(ang) * wallR;
    const seg = box(8.2, 5, 1.6, wallMat);
    seg.castShadow = true;
    place(seg, x, z, -ang + Math.PI / 2, 0);
    seg.position.y += 2.5; // box is centered — lift onto the ground
    colliders.push({ x, z, r: 3.6 });
    if (i % 5 === 0) {
      const turret = cyl(1.6, 1.9, 7, toon(0x9a948a), 10);
      turret.castShadow = true;
      place(turret, x, z, 0, 2.0);
      turret.position.y += 3.5;
      const capT = cone(2.1, 2.2, toon(0x5a6a8a), 10);
      capT.position.set(x, H(x, z) + 8.1, z);
      scene.add(capT);
    }
  }
  // gate towers + arch
  const gateZ = T.z - wallR;
  for (const s of [-1, 1]) {
    const gt = cyl(2.2, 2.6, 9, toon(0x9a948a), 10);
    gt.castShadow = true;
    place(gt, s * 5.5, gateZ, 0, 2.6);
    gt.position.y += 4.5;
    const capG = cone(2.8, 2.6, toon(0x5a6a8a), 10);
    capG.position.set(s * 5.5, H(s * 5.5, gateZ) + 10.3, gateZ);
    scene.add(capG);
    place(buildBanner(0x3a6ac8), s * 3.2, gateZ + 1.5, 0, 0.2);
  }
  const gateArch = box(9, 1.8, 2.4, wallMat);
  gateArch.position.set(0, H(0, gateZ) + 7.6, gateZ);
  gateArch.castShadow = true;
  scene.add(gateArch);

  // Teleport Plaza
  const teleGate = buildTeleportGate();
  place(teleGate, T.x, T.z, 0, 4.3);
  animated.portal = teleGate.userData.portal;
  animated.portalRing = teleGate.userData.ring;
  const fountain = buildFountain();
  place(fountain, T.x - 16, T.z + 10, 0, 3.7);

  // ring of buildings (two arcs, leaving north street + south palace approach)
  let houseSeed = 0;
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + 0.19;
    let dNorth = Math.abs(ang - Math.PI * 1.5); if (dNorth > Math.PI) dNorth = Math.PI * 2 - dNorth;
    let dSouth = Math.abs(ang - Math.PI * 0.5); if (dSouth > Math.PI) dSouth = Math.PI * 2 - dSouth;
    if (dNorth < 0.28 || dSouth < 0.34) continue;
    const rr = rand(24, 33);
    const x = T.x + Math.cos(ang) * rr, z = T.z + Math.sin(ang) * rr;
    const house = buildHouse({
      w: rand(5, 7.5), d: rand(4.5, 6), h: rand(2.8, 3.4),
      stories: Math.random() > 0.45 ? 2 : 1, shop: (houseSeed++ % 3 === 0),
    });
    place(house, x, z, -ang - Math.PI / 2, 4.6);
  }
  // market stalls near the plaza
  place(buildStall(), T.x + 13, T.z - 8, -0.7, 1.3);
  place(buildStall(), T.x + 16, T.z - 2, -1.4, 1.3);
  place(buildStall(), T.x - 14, T.z - 6, 0.9, 1.3);
  // props
  for (let i = 0; i < 10; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(10, 34);
    const x = T.x + Math.cos(ang) * r, z = T.z + Math.sin(ang) * r;
    place(Math.random() > 0.5 ? buildBarrel() : buildCrate(), x, z, rand(0, 3), 0.5);
  }
  // lamps around the plaza
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.4;
    place(buildLampPost(), T.x + Math.cos(ang) * 12, T.z + Math.sin(ang) * 12, -ang, 0.3);
  }

  // Black Iron Palace + Monument of Life (south end of town)
  const palace = buildBlackIronPalace();
  place(palace, T.x, T.z + 34, Math.PI, 0);
  colliders.push({ x: T.x, z: T.z + 34, r: 13 });
  colliders.push({ x: T.x - 10.5, z: T.z + 27.5, r: 3 });
  colliders.push({ x: T.x + 10.5, z: T.z + 27.5, r: 3 });
  const monument = buildMonument();
  const monumentPos = new THREE.Vector3(T.x, 0, T.z + 22);
  place(monument, monumentPos.x, monumentPos.z, Math.PI, 3.2);
  monumentPos.y = H(monumentPos.x, monumentPos.z);

  // ================= Horunka Village =================
  const Hk = POI.horunka;
  const questHouse = buildHouse({ w: 6.5, d: 5.5, h: 3.2, stories: 1, wallColor: 0xdccfb4, roofColor: 0x7a5a3a });
  const questHousePos = new THREE.Vector3(Hk.x, 0, Hk.z - 9);
  place(questHouse, questHousePos.x, questHousePos.z, 0, 4.4);
  questHousePos.y = H(questHousePos.x, questHousePos.z);
  questHousePos.z += 4.2; // stand at the door

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.9;
    const x = Hk.x + Math.cos(ang) * rand(8, 13), z = Hk.z + Math.sin(ang) * rand(8, 13);
    place(buildHouse({ w: rand(4.5, 6), d: rand(4, 5), h: 2.9 }), x, z, -ang - Math.PI / 2, 4.2);
  }
  place(buildWell(), Hk.x, Hk.z, 0, 1.3);
  for (let i = 0; i < 5; i++) {
    place(buildFence(2.2), Hk.x - 8 + i * 2.3, Hk.z + 10, 0, 0);
  }
  place(buildLampPost(), Hk.x + 4, Hk.z + 4, 0, 0.3);
  place(buildLampPost(), Hk.x - 5, Hk.z - 3, 2, 0.3);

  // ================= Tolbana =================
  const Tb = POI.tolbana;
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.5;
    const x = Tb.x + Math.cos(ang) * 16, z = Tb.z + Math.sin(ang) * 16;
    const mill = buildWindmill();
    place(mill, x, z, -ang + Math.PI / 2, 3.2);
    animated.windmillHubs.push(mill.userData.hub);
  }
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.2;
    const x = Tb.x + Math.cos(ang) * rand(8, 12), z = Tb.z + Math.sin(ang) * rand(8, 12);
    if (i === 2) continue; // gap toward the amphitheater
    place(buildHouse({ w: rand(4.5, 6.5), d: rand(4, 5.5), h: 3, stories: Math.random() > 0.6 ? 2 : 1 }),
      x, z, -ang - Math.PI / 2, 4.2);
  }
  // amphitheater where the raid meeting happened
  const amphiC = { x: Tb.x + 18, z: Tb.z + 14 };
  for (let ringI = 0; ringI < 3; ringI++) {
    const stepR = 5 + ringI * 1.8;
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(stepR, stepR + 1.6, 0.55 + ringI * 0.45, 24, 1, false, -0.6, Math.PI * 1.4),
      toon(0xa8a296),
    );
    step.castShadow = true;
    step.position.set(amphiC.x, H(amphiC.x, amphiC.z) + (0.55 + ringI * 0.45) / 2, amphiC.z);
    scene.add(step);
  }
  colliders.push({ x: amphiC.x, z: amphiC.z, r: 3.5 });
  place(buildFountain(), Tb.x, Tb.z, 0, 3.7);
  place(buildLampPost(), Tb.x + 6, Tb.z - 6, 0, 0.3);
  place(buildLampPost(), Tb.x - 7, Tb.z + 5, 1, 0.3);
  place(buildBanner(0x4ac86a), Tb.x + 4, Tb.z + 8, 0.5, 0);

  // ================= The Labyrinth =================
  const Tw = POI.tower;
  const tower = buildLabyrinthTower();
  tower.position.set(Tw.x, H(Tw.x, Tw.z), Tw.z);
  scene.add(tower);
  animated.flames = tower.userData.flames;
  // wall colliders with a door gap facing +z
  const wallCount = 26;
  for (let i = 0; i < wallCount; i++) {
    const ang = (i / wallCount) * Math.PI * 2;
    const dx = Math.sin(ang), dz = Math.cos(ang);
    if (dz > 0.93) continue; // the doorway
    colliders.push({ x: Tw.x + dx * 26.5, z: Tw.z + dz * 26.5, r: 3.6 });
  }
  // interior pillars
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    colliders.push({ x: Tw.x + Math.sin(ang) * 17, z: Tw.z + Math.cos(ang) * 17, r: 1.6 });
  }
  // torches flanking the approach
  place(buildLampPost(), Tw.x - 4, Tw.z + 30, 0, 0.3);
  place(buildLampPost(), Tw.x + 4, Tw.z + 30, 0, 0.3);

  // ================= vegetation =================
  scatterVegetation(scene, colliders);

  // ================= villagers =================
  const npcs = [];
  const addNPC = (x, z, seed) => {
    const v = new NPC(scene, new THREE.Vector3(x, H(x, z), z), seed);
    npcs.push(v);
  };
  for (let i = 0; i < 8; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(6, 24);
    addNPC(T.x + Math.cos(ang) * r, T.z + Math.sin(ang) * r, i * 137 + 11);
  }
  addNPC(Hk.x + 4, Hk.z + 3, 901);
  addNPC(Hk.x - 6, Hk.z + 6, 407);
  for (let i = 0; i < 4; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(4, 10);
    addNPC(Tb.x + Math.cos(ang) * r, Tb.z + Math.sin(ang) * r, i * 733 + 59);
  }

  // ============================================================
  let time = 0;
  return {
    colliders,
    sun,
    monumentPos,
    questHousePos,
    teleGatePos: new THREE.Vector3(T.x, H(T.x, T.z), T.z),

    update(dt, playerPos) {
      time += dt;
      terrain.update(time);
      clouds.children.forEach((c) => {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 460) c.position.x = -460;
      });
      for (const hub of animated.windmillHubs) hub.rotation.z += dt * 0.7;
      for (let i = 0; i < animated.flames.length; i++) {
        const f = animated.flames[i];
        f.scale.setScalar(1 + Math.sin(time * 9 + i * 2.1) * 0.15);
        f.scale.y = 1.6 + Math.sin(time * 7 + i) * 0.25;
      }
      if (animated.portal) {
        animated.portal.rotation.z += dt * 0.6;
        animated.portal.material.opacity = 0.3 + Math.sin(time * 2) * 0.08;
      }
      for (const n of npcs) n.update(dt);
      // shadow camera follows the player
      if (playerPos) {
        sun.position.set(playerPos.x + 55, 95, playerPos.z + 35);
        sun.target.position.set(playerPos.x, 0, playerPos.z);
      }
    },

    clampPosition(pos, radius = 0.5) {
      const d = Math.hypot(pos.x, pos.z);
      const maxD = ISLAND_R - 3;
      if (d > maxD) { pos.x *= maxD / d; pos.z *= maxD / d; }
      for (const c of colliders) {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const dist = Math.hypot(dx, dz);
        const min = c.r + radius;
        if (dist < min && dist > 0.0001) {
          pos.x = c.x + (dx / dist) * min;
          pos.z = c.z + (dz / dist) * min;
        }
      }
    },

    isSafeZone(pos) {
      return (
        Math.hypot(pos.x - POI.town.x, pos.z - POI.town.z) < 44 ||
        Math.hypot(pos.x - POI.horunka.x, pos.z - POI.horunka.z) < POI.horunka.r ||
        Math.hypot(pos.x - POI.tolbana.x, pos.z - POI.tolbana.z) < POI.tolbana.r
      );
    },
    inBossRoom(pos) {
      return Math.hypot(pos.x - POI.tower.x, pos.z - POI.tower.z) < 24;
    },
    zoneAt(pos) {
      const d = (k) => Math.hypot(pos.x - POI[k].x, pos.z - POI[k].z);
      if (d('town') < 44) return { name: 'Town of Beginnings', tag: 'SAFE ZONE', safe: true };
      if (d('horunka') < POI.horunka.r) return { name: 'Horunka Village', tag: 'SAFE ZONE', safe: true };
      if (d('tolbana') < POI.tolbana.r) return { name: 'Tolbana', tag: 'SAFE ZONE', safe: true };
      if (d('tower') < 34) return { name: 'The Labyrinth', tag: 'BOSS AREA', safe: false };
      if (d('forest') < POI.forest.r) return { name: 'Horunka Forest', tag: 'FIELD', safe: false };
      if (d('lake') < POI.lake.r + 12) return { name: 'Lakeside Plains', tag: 'FIELD', safe: false };
      return { name: 'Starting Plains', tag: 'FIELD', safe: false };
    },
  };
}
