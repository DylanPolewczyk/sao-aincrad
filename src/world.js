import * as THREE from 'three';

// Floor 1 of Aincrad: a floating island with the Town of Beginnings at its
// center, open fields, and the boss gate at the far edge. All geometry is
// procedural — no loaded assets.

export const WORLD_RADIUS = 130;
export const TOWN_RADIUS = 26;      // safe zone
export const BOSS_ARENA = { x: 0, z: -102, r: 17 };

const rand = (a, b) => a + Math.random() * (b - a);

function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

export function buildWorld(scene) {
  const colliders = []; // { x, z, r } cylinders the player/enemies can't pass

  // ---------- sky ----------
  scene.background = new THREE.Color(0x8fc8ee);
  scene.fog = new THREE.Fog(0xa8d4ee, 60, 340);

  const skyGeo = new THREE.SphereGeometry(600, 24, 12);
  const skyCols = [];
  const posAttr = skyGeo.attributes.position;
  const top = new THREE.Color(0x3d86d8), horizon = new THREE.Color(0xc8e6f7);
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i) / 600;
    const c = horizon.clone().lerp(top, Math.max(0, y) ** 0.7);
    skyCols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyCols, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false,
  }));
  scene.add(sky);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x596b4a, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 140;
  sun.shadow.camera.left = -S; sun.shadow.camera.right = S;
  sun.shadow.camera.top = S; sun.shadow.camera.bottom = -S;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ---------- the floating island ----------
  const groundGeo = new THREE.CircleGeometry(WORLD_RADIUS, 96);
  groundGeo.rotateX(-Math.PI / 2);
  // vertex-color noise so the grass isn't flat
  const gPos = groundGeo.attributes.position;
  const gCols = [];
  const base = new THREE.Color(0x69a84f), dark = new THREE.Color(0x4d8a3c), light = new THREE.Color(0x8cc46a);
  for (let i = 0; i < gPos.count; i++) {
    const x = gPos.getX(i), z = gPos.getZ(i);
    const n = Math.sin(x * 0.11) * Math.cos(z * 0.13) + Math.sin(x * 0.05 + z * 0.07);
    const c = base.clone().lerp(n > 0 ? light : dark, Math.min(1, Math.abs(n) * 0.55));
    gCols.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(gCols, 3));
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  // rocky underside so it reads as a floating island
  const under = new THREE.Mesh(
    new THREE.ConeGeometry(WORLD_RADIUS, 90, 48, 4),
    lambert(0x6b5a4a),
  );
  under.rotation.x = Math.PI;
  under.position.y = -45.5;
  scene.add(under);
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(WORLD_RADIUS, WORLD_RADIUS - 3, 6, 64, 1, true),
    lambert(0x7a6a58),
  );
  rim.position.y = -2.5;
  scene.add(rim);

  // clouds drifting below/around the island
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 26; i++) {
    const cluster = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 4);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(4, 9), 10, 8), cloudMat);
      puff.position.set(rand(-8, 8), rand(-2, 2), rand(-8, 8));
      puff.scale.y = 0.45;
      cluster.add(puff);
    }
    const ang = Math.random() * Math.PI * 2;
    const r = rand(90, 320);
    cluster.position.set(Math.cos(ang) * r, rand(-70, -18), Math.sin(ang) * r);
    cluster.userData.speed = rand(0.5, 1.6);
    clouds.add(cluster);
  }
  scene.add(clouds);

  // the shadowed underside of Floor 2, far overhead — you live inside Aincrad
  const ceiling = new THREE.Mesh(
    new THREE.CircleGeometry(900, 48),
    new THREE.MeshBasicMaterial({ color: 0x2a4a66, transparent: true, opacity: 0.35, fog: false }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 320;
  scene.add(ceiling);

  // ---------- Town of Beginnings ----------
  // stone plaza
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(TOWN_RADIUS, 48),
    lambert(0xb9b3a6),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // central fountain
  const fountain = new THREE.Group();
  const f1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.8, 24), lambert(0x9a948a));
  f1.position.y = 0.4;
  const f2 = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.5, 24), new THREE.MeshLambertMaterial({ color: 0x3f9fd8, transparent: true, opacity: 0.85 }));
  f2.position.y = 0.75;
  const f3 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.6, 12), lambert(0x9a948a));
  f3.position.y = 1.8;
  const f4 = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.35, 18), lambert(0x9a948a));
  f4.position.y = 3.0;
  fountain.add(f1, f2, f3, f4);
  fountain.children.forEach((m) => { m.castShadow = true; });
  scene.add(fountain);
  colliders.push({ x: 0, z: 0, r: 3.9 });

  // ring of medieval buildings around the plaza
  const wallMats = [lambert(0xd8cdb8), lambert(0xcabfa8), lambert(0xe0d6c2)];
  const roofMats = [lambert(0xa8503c), lambert(0x8a4434), lambert(0xb85c40)];
  const buildingCount = 11;
  for (let i = 0; i < buildingCount; i++) {
    const ang = (i / buildingCount) * Math.PI * 2 + 0.25;
    // leave a street gap toward the boss gate (south, -z)
    const dirToGate = Math.abs(((ang + Math.PI / 2) % (Math.PI * 2)) - Math.PI);
    if (dirToGate > Math.PI - 0.35) continue;
    const r = TOWN_RADIUS - rand(3.5, 6.5);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const w = rand(5, 8), d = rand(5, 7), h = rand(4, 7);
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMats[i % 3]);
    body.position.y = h / 2;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, h * 0.55, 4), roofMats[i % 3]);
    roof.position.y = h + h * 0.27;
    roof.rotation.y = Math.PI / 4;
    // windows: emissive strip
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.7, 0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffd98a }),
    );
    win.position.set(0, h * 0.5, d / 2 + 0.06);
    b.add(body, roof, win);
    body.castShadow = true; roof.castShadow = true;
    b.position.set(x, 0, z);
    b.lookAt(0, 0, 0);
    scene.add(b);
    colliders.push({ x, z, r: Math.max(w, d) * 0.62 });
  }

  // dirt road from town to the boss gate
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(6, Math.abs(BOSS_ARENA.z) - TOWN_RADIUS + 22),
    lambert(0xa08a62),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.015, -(TOWN_RADIUS + (Math.abs(BOSS_ARENA.z) - TOWN_RADIUS) / 2) + 4);
  road.receiveShadow = true;
  scene.add(road);

  // ---------- boss arena ----------
  const arenaFloor = new THREE.Mesh(
    new THREE.CircleGeometry(BOSS_ARENA.r, 40),
    lambert(0x8a8078),
  );
  arenaFloor.rotation.x = -Math.PI / 2;
  arenaFloor.position.set(BOSS_ARENA.x, 0.02, BOSS_ARENA.z);
  arenaFloor.receiveShadow = true;
  scene.add(arenaFloor);

  const pillarMat = lambert(0x746a60);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    // gap on the town side
    if (Math.abs(ang - Math.PI / 2) < 0.5) continue;
    const x = BOSS_ARENA.x + Math.cos(ang) * (BOSS_ARENA.r - 1);
    const z = BOSS_ARENA.z + Math.sin(ang) * (BOSS_ARENA.r - 1);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, rand(7, 10), 8), pillarMat);
    p.position.set(x, 4, z);
    p.castShadow = true;
    scene.add(p);
    colliders.push({ x, z, r: 1.3 });
  }
  // gate arch at the arena entrance
  const gate = new THREE.Group();
  const gl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9, 1.6), pillarMat);
  gl.position.set(-4, 4.5, 0);
  const gr = gl.clone(); gr.position.x = 4;
  const gt = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.6, 2), pillarMat);
  gt.position.y = 9.3;
  gate.add(gl, gr, gt);
  gate.children.forEach((m) => { m.castShadow = true; });
  gate.position.set(BOSS_ARENA.x, 0, BOSS_ARENA.z + BOSS_ARENA.r + 2);
  scene.add(gate);
  colliders.push({ x: BOSS_ARENA.x - 4, z: BOSS_ARENA.z + BOSS_ARENA.r + 2, r: 1.2 });
  colliders.push({ x: BOSS_ARENA.x + 4, z: BOSS_ARENA.z + BOSS_ARENA.r + 2, r: 1.2 });

  // ---------- vegetation & rocks ----------
  const trunkMat = lambert(0x6d4c33);
  const leafMats = [lambert(0x3e7d32), lambert(0x4c9440), lambert(0x5aa84e)];
  const inArena = (x, z) => Math.hypot(x - BOSS_ARENA.x, z - BOSS_ARENA.z) < BOSS_ARENA.r + 6;
  const onRoad = (x, z) => Math.abs(x) < 5 && z < -TOWN_RADIUS + 6 && z > BOSS_ARENA.z;

  for (let i = 0; i < 70; i++) {
    let x, z, tries = 0;
    do {
      const ang = Math.random() * Math.PI * 2;
      const r = rand(TOWN_RADIUS + 4, WORLD_RADIUS - 8);
      x = Math.cos(ang) * r; z = Math.sin(ang) * r;
    } while ((inArena(x, z) || onRoad(x, z)) && ++tries < 10);
    if (tries >= 10) continue;
    const s = rand(0.7, 1.5);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.4 * s, 2.6 * s, 7), trunkMat);
    trunk.position.y = 1.3 * s;
    trunk.castShadow = true;
    tree.add(trunk);
    const layers = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < layers; j++) {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry((2.1 - j * 0.55) * s, 2.4 * s, 8),
        leafMats[i % 3],
      );
      leaf.position.y = (2.6 + j * 1.35) * s;
      leaf.castShadow = true;
      tree.add(leaf);
    }
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    colliders.push({ x, z, r: 0.55 * s });
  }

  const rockMat = lambert(0x8d8d8d);
  for (let i = 0; i < 24; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = rand(TOWN_RADIUS + 3, WORLD_RADIUS - 6);
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (inArena(x, z) || onRoad(x, z)) continue;
    const s = rand(0.5, 1.8);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    rock.position.set(x, s * 0.45, z);
    rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    rock.castShadow = true;
    scene.add(rock);
    if (s > 0.9) colliders.push({ x, z, r: s * 0.9 });
  }

  // grass tufts — cheap little cones
  const tuftGeo = new THREE.ConeGeometry(0.09, 0.5, 4);
  const tuftMat = lambert(0x71b356);
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, 400);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < 400; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = rand(TOWN_RADIUS + 1, WORLD_RADIUS - 4);
    mtx.makeRotationY(Math.random() * Math.PI);
    mtx.setPosition(Math.cos(ang) * r, 0.22, Math.sin(ang) * r);
    tufts.setMatrixAt(i, mtx);
  }
  scene.add(tufts);

  return {
    colliders,
    update(dt) {
      clouds.children.forEach((c) => {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 360) c.position.x = -360;
      });
    },
    // keep entities on the island and out of solid props
    clampPosition(pos, radius = 0.5) {
      const d = Math.hypot(pos.x, pos.z);
      const maxD = WORLD_RADIUS - 2;
      if (d > maxD) {
        pos.x *= maxD / d;
        pos.z *= maxD / d;
      }
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
    isSafeZone(pos) { return Math.hypot(pos.x, pos.z) < TOWN_RADIUS; },
    inBossArena(pos) {
      return Math.hypot(pos.x - BOSS_ARENA.x, pos.z - BOSS_ARENA.z) < BOSS_ARENA.r;
    },
  };
}
