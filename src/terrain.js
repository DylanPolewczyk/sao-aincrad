import * as THREE from 'three';
import { toon } from './modelkit.js';

// ---------------------------------------------------------------------------
// Floor 1 terrain: a heightfield island. Every entity samples terrainHeight()
// so the world can roll. Roads and plazas are painted into vertex colors and
// the ground flattens around points of interest.
//
// Canon layout: the Town of Beginnings sits at the south edge, Horunka
// Village in the western forest, Tolbana to the north near the Labyrinth
// tower that leads up to Floor 2.
// ---------------------------------------------------------------------------

export const ISLAND_R = 190;

export const POI = {
  town:    { x: 0,   z: 130,  r: 46 },  // Town of Beginnings (safe)
  horunka: { x: -95, z: -20,  r: 20 },  // Horunka Village (safe)
  tolbana: { x: 62,  z: -95,  r: 26 },  // Tolbana (safe)
  tower:   { x: 0,   z: -152, r: 34 },  // Labyrinth of the First Floor
  lake:    { x: -80, z: 62,   r: 26 },
  forest:  { x: -95, z: -45,  r: 58 },  // Horunka's deep forest
};

// Road network as polyline segments [ax, az, bx, bz]
export const ROADS = [
  [0, 108, 0, 40],        // town gate → crossroads
  [0, 40, 0, -60],        // crossroads → north plains
  [0, -60, 0, -118],      // plains → labyrinth approach
  [0, 40, -48, 12],       // crossroads → lake pass
  [-48, 12, -88, -12],    // lake pass → Horunka
  [0, -60, 34, -78],      // plains → Tolbana road
  [34, -78, 56, -92],
  [58, -98, 28, -128],    // Tolbana → labyrinth
  [28, -128, 6, -146],
];

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t, qz = az + dz * t;
  return Math.hypot(px - qx, pz - qz);
}

export function distToRoad(x, z) {
  let d = Infinity;
  for (const r of ROADS) d = Math.min(d, distToSeg(x, z, r[0], r[1], r[2], r[3]));
  return d;
}

const smooth = (a, b, t) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

function hills(x, z) {
  return (
    2.4 * Math.sin(x * 0.033) * Math.cos(z * 0.029) +
    1.5 * Math.sin(x * 0.019 + 1.7) * Math.sin(z * 0.024 + 0.8) +
    0.7 * Math.sin(x * 0.081) * Math.cos(z * 0.077 + 2.1)
  );
}

export function terrainHeight(x, z) {
  let h = hills(x, z);
  // flatten around settlements and the tower
  for (const key of ['town', 'horunka', 'tolbana', 'tower']) {
    const p = POI[key];
    const d = Math.hypot(x - p.x, z - p.z);
    h *= smooth(p.r, p.r + 22, d);
  }
  // roads carve gently toward flat
  h *= 0.35 + 0.65 * smooth(2.5, 9, distToRoad(x, z));
  // lake bowl
  const dl = Math.hypot(x - POI.lake.x, z - POI.lake.z);
  if (dl < POI.lake.r + 14) {
    h -= 3.4 * smooth(POI.lake.r + 14, POI.lake.r - 10, dl);
  }
  return h;
}

export function buildTerrain(scene) {
  const SEG = 230;
  const geo = new THREE.PlaneGeometry(ISLAND_R * 2, ISLAND_R * 2, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // palette
  const grassA = new THREE.Color(0x5fae4a);
  const grassB = new THREE.Color(0x7cc45e);
  const grassDark = new THREE.Color(0x468a3a);
  const forestFloor = new THREE.Color(0x4a7a38);
  const dirt = new THREE.Color(0xb59468);
  const stone = new THREE.Color(0xb8b2a4);
  const stoneDark = new THREE.Color(0xa39d90);
  const sand = new THREE.Color(0xcbb98a);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), z = pos.getZ(i);
    // squash outside vertices onto the island rim
    const d0 = Math.hypot(x, z);
    if (d0 > ISLAND_R) {
      x = (x / d0) * ISLAND_R;
      z = (z / d0) * ISLAND_R;
      pos.setX(i, x); pos.setZ(i, z);
    }
    pos.setY(i, terrainHeight(x, z));

    // ---- paint ----
    const n = Math.sin(x * 0.13 + 5) * Math.cos(z * 0.11) + Math.sin(x * 0.05) * Math.sin(z * 0.06 + 2);
    c.copy(grassA).lerp(n > 0 ? grassB : grassDark, Math.min(1, Math.abs(n) * 0.6));

    // forest floor
    const df = Math.hypot(x - POI.forest.x, z - POI.forest.z);
    if (df < POI.forest.r + 12) c.lerp(forestFloor, 0.7 * smooth(POI.forest.r + 12, POI.forest.r - 15, df));

    // roads
    const dr = distToRoad(x, z);
    if (dr < 5) c.lerp(dirt, 0.9 * smooth(4.5, 1.8, dr));

    // town plaza & streets: big stone circle + checker tint
    const dt = Math.hypot(x - POI.town.x, z - POI.town.z);
    if (dt < 42) {
      const checker = ((Math.floor(x / 4) + Math.floor(z / 4)) % 2) ? stone : stoneDark;
      c.lerp(checker, 0.95 * smooth(42, 36, dt));
    }
    // village grounds
    const dh = Math.hypot(x - POI.horunka.x, z - POI.horunka.z);
    if (dh < 16) c.lerp(dirt, 0.8 * smooth(16, 9, dh));
    const dtb = Math.hypot(x - POI.tolbana.x, z - POI.tolbana.z);
    if (dtb < 20) {
      const checker = ((Math.floor(x / 3) + Math.floor(z / 3)) % 2) ? stone : stoneDark;
      c.lerp(checker, 0.85 * smooth(20, 13, dtb));
    }
    // labyrinth yard
    const dtw = Math.hypot(x - POI.tower.x, z - POI.tower.z);
    if (dtw < 32) c.lerp(stoneDark, 0.9 * smooth(32, 26, dtw));
    // lake shore sand
    const dl = Math.hypot(x - POI.lake.x, z - POI.lake.z);
    if (dl < POI.lake.r + 8 && dl > POI.lake.r - 12) {
      c.lerp(sand, 0.8 * smooth(POI.lake.r + 8, POI.lake.r - 2, dl) * smooth(POI.lake.r - 12, POI.lake.r - 6, dl));
    }

    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: toon(0xffffff).gradientMap,
  }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- water ----
  const waterGeo = new THREE.CircleGeometry(POI.lake.r + 4, 40);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshToonMaterial({
    color: 0x3fa8dd, transparent: true, opacity: 0.78,
    gradientMap: toon(0xffffff).gradientMap,
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(POI.lake.x, -1.15, POI.lake.z);
  scene.add(water);
  const foam = new THREE.Mesh(
    new THREE.RingGeometry(POI.lake.r + 3.2, POI.lake.r + 4.4, 40),
    new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.5 }),
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(POI.lake.x, -1.1, POI.lake.z);
  scene.add(foam);

  return {
    ground, water,
    update(t) {
      water.position.y = -1.15 + Math.sin(t * 0.8) * 0.06;
    },
  };
}
