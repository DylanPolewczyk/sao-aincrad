import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Model kit: toon materials, outline helper, and reusable part builders.
// The whole game is cel-shaded — this module owns that look.
// ---------------------------------------------------------------------------

let gradientMap = null;
function getGradientMap() {
  if (gradientMap) return gradientMap;
  // 4-step toon ramp
  const data = new Uint8Array([90, 140, 200, 255]);
  gradientMap = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

const matCache = new Map();

// Cel-shaded material. Cached by color+options so meshes share materials.
export function toon(color, opts = {}) {
  const key = `${color}|${opts.emissive || 0}|${opts.emissiveIntensity || 0}|${opts.transparent || 0}|${opts.opacity ?? 1}`;
  if (!opts.noCache && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  if (!opts.noCache) matCache.set(key, m);
  return m;
}

export function glow(color, intensity = 1) {
  // Bright unlit material — picked up by the bloom pass.
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity),
    toneMapped: false,
  });
}

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x101018, side: THREE.BackSide });

// Anime-style inverted-hull outline for every mesh in a group.
// Call AFTER the model is fully assembled.
export function addOutline(root, thickness = 0.035) {
  const targets = [];
  root.traverse((m) => { if (m.isMesh && !m.userData.noOutline) targets.push(m); });
  for (const m of targets) {
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    const o = new THREE.Mesh(m.geometry, outlineMat);
    o.scale.setScalar(1 + thickness / Math.max(0.3, m.geometry.boundingSphere.radius));
    o.userData.noOutline = true;
    o.castShadow = false;
    m.add(o);
  }
  return root;
}

export function shadowAll(root) {
  root.traverse((m) => {
    if (m.isMesh && !m.userData.noOutline) m.castShadow = true;
  });
  return root;
}

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

export function capsule(r, len, mat, radialSegs = 10) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, radialSegs), mat);
}
export function sphere(r, mat, w = 14, h = 10) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat);
}
export function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
export function cyl(rt, rb, h, mat, segs = 12) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
}
export function cone(r, h, mat, segs = 10) {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), mat);
}

// ---------------------------------------------------------------------------
// weapons
// ---------------------------------------------------------------------------

// A proper sword with a diamond-profile extruded blade.
// Origin at the grip; blade points +Y.
export function buildSword({
  length = 1.0, width = 0.09, bladeColor = 0xbfc8d8, edgeGlow = 0x9fd8ff,
  guardColor = 0x5a5f73, gripColor = 0x1c1e28, pommel = true, curve = 0,
} = {}) {
  const g = new THREE.Group();
  // diamond cross-section blade
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width / 2, 0.02);
  shape.lineTo(0, 0.04);
  shape.lineTo(-width / 2, 0.02);
  shape.closePath();
  const pts = [];
  const segs = 8;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(new THREE.Vector3(Math.sin(t * Math.PI) * curve * 0, t * curve, t * length));
  }
  const curvePath = new THREE.CatmullRomCurve3(pts);
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { steps: 12, extrudePath: curvePath, bevelEnabled: false });
  const blade = new THREE.Mesh(bladeGeo, toon(bladeColor));
  blade.rotation.x = -Math.PI / 2; // extrude path z → up y
  blade.position.y = 0.12;
  // glowing edge line
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, length * 0.92, 0.012),
    glow(edgeGlow, 1.6),
  );
  edge.position.set(0, 0.12 + length / 2, width / 2 * 0.9);
  edge.userData.noOutline = true;
  const edge2 = edge.clone();
  edge2.position.z = -width / 2 * 0.9;
  // guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.09), toon(guardColor));
  guard.position.y = 0.1;
  const grip = cyl(0.028, 0.032, 0.22, toon(gripColor), 8);
  grip.position.y = -0.03;
  g.add(blade, edge, edge2, guard, grip);
  if (pommel) {
    const p = sphere(0.045, toon(guardColor), 8, 6);
    p.position.y = -0.15;
    g.add(p);
  }
  return g;
}

// Curved talwar for Illfang's last phase.
export function buildTalwar(scale = 1) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(0.07, 0.02); shape.lineTo(0, 0.05); shape.lineTo(-0.07, 0.02);
  shape.closePath();
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new THREE.Vector3(Math.pow(t, 1.7) * 0.5, 0, t * 1.9));
  }
  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    steps: 14, extrudePath: new THREE.CatmullRomCurve3(pts), bevelEnabled: false,
  });
  const blade = new THREE.Mesh(bladeGeo, toon(0xd8dde8));
  blade.rotation.x = -Math.PI / 2;
  blade.position.y = 0.15;
  const guard = cyl(0.09, 0.09, 0.04, toon(0x6a4a20), 10);
  guard.position.y = 0.12;
  const grip = cyl(0.04, 0.045, 0.3, toon(0x3a2818), 8);
  grip.position.y = -0.05;
  g.add(blade, guard, grip);
  g.scale.setScalar(scale);
  return g;
}

// Illfang's Bone Axe — huge double-headed axe with a bone haft.
export function buildBoneAxe(scale = 1) {
  const g = new THREE.Group();
  const haft = cyl(0.06, 0.075, 2.4, toon(0xd8cdb4), 8);
  haft.position.y = 0.6;
  const headMatl = toon(0xe8e0cc);
  const mkBlade = (side) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.45);
    shape.quadraticCurveTo(side * 0.75, 0, 0, 0.45);
    shape.lineTo(0, -0.45);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    const m = new THREE.Mesh(geo, headMatl);
    m.rotation.y = Math.PI / 2;
    m.position.set(0, 1.55, -0.045);
    return m;
  };
  const spike = cone(0.07, 0.4, headMatl, 8);
  spike.position.y = 1.95;
  g.add(haft, mkBlade(1), mkBlade(-1), spike);
  g.scale.setScalar(scale);
  return g;
}

export function buildBuckler(scale = 1) {
  const g = new THREE.Group();
  const disc = cyl(0.42, 0.36, 0.08, toon(0x7a5230), 18);
  disc.rotation.x = Math.PI / 2;
  const boss = sphere(0.12, toon(0x9a8a6a), 10, 8);
  boss.position.z = 0.06;
  boss.scale.z = 0.5;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 20), toon(0x5a3c20));
  g.add(disc, boss, rim);
  g.scale.setScalar(scale);
  return g;
}

export function buildHalberd(scale = 1) {
  const g = new THREE.Group();
  const pole = cyl(0.035, 0.045, 2.3, toon(0x5a4028), 8);
  pole.position.y = 0.5;
  const head = box(0.05, 0.55, 0.3, toon(0xb8bcc8));
  head.position.set(0, 1.6, 0.1);
  const point = cone(0.05, 0.35, toon(0xb8bcc8), 8);
  point.position.y = 1.95;
  g.add(pole, head, point);
  g.scale.setScalar(scale);
  return g;
}

export function buildMace(scale = 1) {
  const g = new THREE.Group();
  const handle = cyl(0.04, 0.05, 1.0, toon(0x4a3420), 8);
  handle.position.y = 0.3;
  const head = sphere(0.16, toon(0x8a8e9a), 10, 8);
  head.position.y = 0.95;
  for (let i = 0; i < 6; i++) {
    const stud = cone(0.045, 0.14, toon(0x6a6e7a), 6);
    const ang = (i / 6) * Math.PI * 2;
    stud.position.set(Math.cos(ang) * 0.17, 0.95, Math.sin(ang) * 0.17);
    stud.rotation.z = -ang - Math.PI / 2;
    g.add(stud);
  }
  g.add(handle, head);
  g.scale.setScalar(scale);
  return g;
}
