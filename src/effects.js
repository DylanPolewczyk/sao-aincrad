import * as THREE from 'three';

// Visual effects: SAO polygon-shatter deaths, hit sparks, sword trails,
// level-up rings. Everything is pooled-ish and cleans itself up.

const shardGeo = new THREE.TetrahedronGeometry(0.16);
const sparkGeo = new THREE.PlaneGeometry(0.14, 0.14);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = []; // { update(dt) -> alive:boolean, dispose() }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (!this.items[i].update(dt)) {
        this.items[i].dispose();
        this.items.splice(i, 1);
      }
    }
  }

  // The iconic SAO death effect: burst of glowing blue polygon shards.
  shatter(pos, scale = 1, color = 0x7fd8ff) {
    const count = Math.floor(36 * scale);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const group = new THREE.Group();
    const shards = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(shardGeo, mat);
      m.position.copy(pos);
      m.position.y += Math.random() * 1.2 * scale;
      const dir = new THREE.Vector3(
        Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5
      ).normalize();
      const s = (0.6 + Math.random() * 1.4) * scale;
      m.scale.setScalar(s);
      shards.push({
        m,
        vel: dir.multiplyScalar(2.5 + Math.random() * 4.5),
        rot: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
      });
      group.add(m);
    }
    this.scene.add(group);
    let age = 0;
    const life = 1.1;
    this.items.push({
      update: (dt) => {
        age += dt;
        const t = age / life;
        mat.opacity = 0.95 * (1 - t * t);
        for (const s of shards) {
          s.vel.y -= 3.5 * dt;
          s.m.position.addScaledVector(s.vel, dt);
          s.m.rotation.x += s.rot.x * dt;
          s.m.rotation.y += s.rot.y * dt;
          s.m.scale.multiplyScalar(1 - 0.9 * dt);
        }
        return age < life;
      },
      dispose: () => { this.scene.remove(group); mat.dispose(); },
    });
  }

  // Small burst on a successful hit.
  hitSpark(pos, color = 0xffd070) {
    const count = 10;
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const group = new THREE.Group();
    const parts = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(sparkGeo, mat);
      m.position.copy(pos);
      parts.push({
        m,
        vel: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5)
          .normalize().multiplyScalar(3 + Math.random() * 3),
      });
      group.add(m);
    }
    this.scene.add(group);
    let age = 0;
    const life = 0.3;
    this.items.push({
      update: (dt) => {
        age += dt;
        mat.opacity = 1 - age / life;
        for (const p of parts) {
          p.m.position.addScaledVector(p.vel, dt);
          p.m.rotation.z += 10 * dt;
        }
        return age < life;
      },
      dispose: () => { this.scene.remove(group); mat.dispose(); },
    });
  }

  // Expanding glowing ring (level up / boss slam telegraph).
  ring(pos, color = 0x6ee7ff, maxR = 3, life = 0.8) {
    const geo = new THREE.RingGeometry(0.9, 1.0, 48);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos);
    m.position.y += 0.08;
    this.scene.add(m);
    let age = 0;
    this.items.push({
      update: (dt) => {
        age += dt;
        const t = age / life;
        m.scale.setScalar(0.2 + t * maxR);
        mat.opacity = 0.9 * (1 - t);
        return age < life;
      },
      dispose: () => { this.scene.remove(m); geo.dispose(); mat.dispose(); },
    });
  }

  // Vertical light pillar (level-up flourish).
  pillar(pos, color = 0x6ee7ff) {
    const geo = new THREE.CylinderGeometry(0.7, 0.9, 6, 20, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.position.y += 3;
    this.scene.add(m);
    let age = 0;
    const life = 1.2;
    this.items.push({
      update: (dt) => {
        age += dt;
        const t = age / life;
        mat.opacity = 0.5 * (1 - t);
        m.scale.x = m.scale.z = 1 + t * 0.8;
        m.rotation.y += dt * 2;
        return age < life;
      },
      dispose: () => { this.scene.remove(m); geo.dispose(); mat.dispose(); },
    });
  }
}

// Ribbon trail that follows the sword blade during swings — the glowing
// arc of an SAO sword skill.
export class SwordTrail {
  constructor(scene, color = 0x6ee7ff, maxPoints = 22) {
    this.maxPoints = maxPoints;
    this.points = []; // { tip, base, age }
    this.geo = new THREE.BufferGeometry();
    const maxVerts = (maxPoints - 1) * 6;
    this.positions = new Float32Array(maxVerts * 3);
    this.alphas = new Float32Array(maxVerts);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `
        attribute float aAlpha; varying float vA;
        void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uColor; varying float vA;
        void main() { gl_FragColor = vec4(uColor, vA); }`,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.life = 0.22;
  }

  setColor(hex) { this.mat.uniforms.uColor.value.set(hex); }

  push(tip, base) {
    this.points.push({ tip: tip.clone(), base: base.clone(), age: 0 });
    if (this.points.length > this.maxPoints) this.points.shift();
  }

  update(dt) {
    for (const p of this.points) p.age += dt;
    this.points = this.points.filter((p) => p.age < this.life);
    if (this.points.length < 2) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    let v = 0;
    const pos = this.positions, al = this.alphas;
    const put = (p3, a) => {
      pos[v * 3] = p3.x; pos[v * 3 + 1] = p3.y; pos[v * 3 + 2] = p3.z;
      al[v] = a; v++;
    };
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i], b = this.points[i + 1];
      const aA = (1 - a.age / this.life) * 0.75;
      const bA = (1 - b.age / this.life) * 0.75;
      put(a.base, aA); put(a.tip, aA); put(b.base, bA);
      put(a.tip, aA); put(b.tip, bA); put(b.base, bA);
    }
    this.geo.setDrawRange(0, v);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  clear() { this.points.length = 0; this.mesh.visible = false; }
}
