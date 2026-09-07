import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';

export class TriGrid {
  constructor() {
    this.lod = 0;
    this.vertices = this.buildCanonicalVertices();
    this.faces = this.buildLOD0();
  }

  buildCanonicalVertices() {
    const y = 1 / Math.sqrt(5);
    const r = 2 / Math.sqrt(5);
    const vertices = new Map();

    vertices.set('N', new THREE.Vector3(0, 1, 0));
    vertices.set('S', new THREE.Vector3(0, -1, 0));

    for (let i = 0; i < 5; i++) {
      const upperAngle = i * Math.PI * 2 / 5;
      const lowerAngle = (i + .5) * Math.PI * 2 / 5;
      vertices.set(`U${i}`, new THREE.Vector3(
        r * Math.sin(upperAngle), y, r * Math.cos(upperAngle)
      ));
      vertices.set(`L${i}`, new THREE.Vector3(
        r * Math.sin(lowerAngle), -y, r * Math.cos(lowerAngle)
      ));
    }

    return vertices;
  }

  makeFace(index, vertexIds, mapVertices) {
    return {
      index,
      address: String(index),
      vertexIds,
      vertices: vertexIds.map(id => this.vertices.get(id).clone()),
      mapVertices
    };
  }

  buildLOD0() {
    const faces = [];
    const upperY = .27639320225;
    const lowerY = .72360679775;
    let index = 0;

    // Five north-cap triangles. N is a real physical vertex at +Y.
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      const x0 = i / 5;
      const x1 = (i + 1) / 5;
      faces.push(this.makeFace(index++, ['N', `U${i}`, `U${j}`], [
        { u: (x0 + x1) * .5, v: 0 },
        { u: x0, v: upperY },
        { u: x1, v: upperY }
      ]));
    }

    // Ten middle-band triangles. Each five-column cell remains two explicit tris.
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      const x0 = i / 5;
      const x1 = (i + 1) / 5;
      faces.push(this.makeFace(index++, [`U${i}`, `L${i}`, `U${j}`], [
        { u: x0, v: upperY },
        { u: x0, v: lowerY },
        { u: x1, v: upperY }
      ]));
      faces.push(this.makeFace(index++, [`U${j}`, `L${i}`, `L${j}`], [
        { u: x1, v: upperY },
        { u: x0, v: lowerY },
        { u: x1, v: lowerY }
      ]));
    }

    // Five south-cap triangles. S is a real physical vertex at -Y.
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      const x0 = i / 5;
      const x1 = (i + 1) / 5;
      faces.push(this.makeFace(index++, ['S', `L${j}`, `L${i}`], [
        { u: (x0 + x1) * .5, v: 1 },
        { u: x1, v: lowerY },
        { u: x0, v: lowerY }
      ]));
    }

    return faces;
  }

  get count() {
    return this.faces.length;
  }

  face(index) {
    return this.faces[index] || null;
  }

  faceVertices(index) {
    return this.face(index)?.vertices || null;
  }

  verticesForFace(index) {
    return this.faceVertices(index);
  }

  // Compatibility with the existing views.
  vertices(index) {
    return this.faceVertices(index);
  }

  mapVertices(index) {
    return this.face(index)?.mapVertices || null;
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
