import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';

export class TriGrid {
  constructor() {
    this.lod = 0;
    this.faces = this.buildLOD0();
  }

  buildLOD0() {
    const geometry = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
    const p = geometry.attributes.position;
    const faces = [];
    for (let i = 0; i < p.count; i += 3) {
      const index = i / 3;
      faces.push({
        index,
        address: String(index),
        vertices: [
          new THREE.Vector3().fromBufferAttribute(p, i),
          new THREE.Vector3().fromBufferAttribute(p, i + 1),
          new THREE.Vector3().fromBufferAttribute(p, i + 2)
        ]
      });
    }
    geometry.dispose();
    return faces;
  }

  get count() {
    return this.faces.length;
  }

  face(index) {
    return this.faces[index] || null;
  }

  vertices(index) {
    return this.face(index)?.vertices || null;
  }

  childAddress(parentAddress, childIndex) {
    return `${parentAddress}.${childIndex}`;
  }

  parentAddress(address) {
    const parts = String(address).split('.');
    return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
  }

  buildGeometry(withColor = false) {
    const positions = [];
    for (const face of this.faces) {
      for (const v of face.vertices) positions.push(v.x, v.y, v.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (withColor) {
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.faces.length * 9), 3));
    }
    geometry.computeVertexNormals();
    return geometry;
  }
}
