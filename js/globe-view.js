import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';

const MAX_LAT = Math.PI / 2 - .03;

export class GlobeView {
  constructor(container, triGrid, selection) {
    this.container = container;
    this.grid = triGrid;
    this.selection = selection;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10242b);
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 20);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x26363b, 1.8));
    const dl = new THREE.DirectionalLight(0xffffff, 1.8);
    dl.position.set(3, 3, 5);
    this.scene.add(dl);

    this.geometry = this.grid.buildGeometry(true);
    this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: .82,
      side: THREE.FrontSide
    }));
    this.wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.geometry),
      new THREE.LineBasicMaterial({ color: 0x41575b, depthTest: true })
    );
    this.group.add(this.mesh, this.wire);

    this.ray = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.previewOutline = null;
    this.viewLon = 0;
    this.viewLat = 0;
    this.radius = 3.2;
    this.targetView = null;
    this.applyView();
  }

  get element() {
    return this.renderer.domElement;
  }

  applyView() {
    const cl = Math.cos(this.viewLat);
    this.camera.position.set(
      this.radius * cl * Math.sin(this.viewLon),
      this.radius * Math.sin(this.viewLat),
      this.radius * cl * Math.cos(this.viewLon)
    );
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
  }

  faceAt(x, y) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height * 2 - 1));
    this.ray.setFromCamera(this.mouse, this.camera);
    const hit = this.ray.intersectObject(this.mesh, false)[0];
    return hit ? hit.faceIndex : -1;
  }

  disposePreviewOutline() {
    if (!this.previewOutline) return;
    this.group.remove(this.previewOutline);
    this.previewOutline.geometry.dispose();
    this.previewOutline.material.dispose();
    this.previewOutline = null;
  }

  updatePreviewOutline(previewFace) {
    this.disposePreviewOutline();
    if (previewFace == null) return;
    const t = this.grid.vertices(previewFace);
    if (!t) return;
    const ab = t[1].clone().sub(t[0]);
    const ac = t[2].clone().sub(t[0]);
    const normal = ab.cross(ac).normalize().multiplyScalar(.003);
    const a = t[0].clone().add(normal);
    const b = t[1].clone().add(normal);
    const c = t[2].clone().add(normal);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      a.x,a.y,a.z,b.x,b.y,b.z,
      b.x,b.y,b.z,c.x,c.y,c.z,
      c.x,c.y,c.z,a.x,a.y,a.z
    ], 3));
    this.previewOutline = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ color: 0x9edfff, depthTest: true, depthWrite: false })
    );
    this.previewOutline.renderOrder = 10;
    this.group.add(this.previewOutline);
  }

  render(previewFace = null) {
    const col = this.geometry.attributes.color;
    for (const face of this.grid.faces) {
      const rgb = this.selection.isSelected(face.index) ? [.89,.79,.43] : [.70,.63,.49];
      for (let k = 0; k < 3; k++) col.setXYZ(face.index * 3 + k, ...rgb);
    }
    col.needsUpdate = true;
    this.updatePreviewOutline(previewFace);
  }

  recenterSelection(ids) {
    if (!ids.length) {
      this.targetView = null;
      return;
    }
    const m = new THREE.Vector3();
    for (const id of ids) {
      const t = this.grid.vertices(id);
      if (!t) continue;
      m.add(t[0]).add(t[1]).add(t[2]);
    }
    if (m.lengthSq() < 1e-9) {
      this.targetView = null;
      return;
    }
    m.normalize();
    this.targetView = {
      lon: Math.atan2(m.x, m.z),
      lat: THREE.MathUtils.clamp(Math.asin(m.y), -MAX_LAT, MAX_LAT)
    };
  }

  stopRecenter() {
    this.targetView = null;
  }

  drag(dx, dy) {
    this.targetView = null;
    this.viewLon -= dx * .008;
    this.viewLat = THREE.MathUtils.clamp(this.viewLat + dy * .008, -MAX_LAT, MAX_LAT);
    this.applyView();
  }

  angleDelta(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  tick() {
    if (this.targetView) {
      this.viewLon += this.angleDelta(this.viewLon, this.targetView.lon) * .14;
      this.viewLat += (this.targetView.lat - this.viewLat) * .14;
      if (Math.abs(this.angleDelta(this.viewLon, this.targetView.lon)) < .001 && Math.abs(this.targetView.lat - this.viewLat) < .001) {
        this.viewLon = this.targetView.lon;
        this.viewLat = this.targetView.lat;
        this.targetView = null;
      }
      this.applyView();
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
  }
}
