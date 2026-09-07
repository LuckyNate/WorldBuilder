export class MapView {
  constructor(canvas, triGrid, selection) {
    this.canvas = canvas;
    this.grid = triGrid;
    this.selection = selection;
  }

  inside(x, y, a, b, c) {
    const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const q = { x, y };
    const a1 = s(q, a, b), a2 = s(q, b, c), a3 = s(q, c, a);
    return !((a1 < 0 || a2 < 0 || a3 < 0) && (a1 > 0 || a2 > 0 || a3 > 0));
  }

  faceAt(x, y) {
    const r = this.canvas.getBoundingClientRect();
    const u = (x - r.left) / r.width;
    const v = (y - r.top) / r.height;
    for (const face of this.grid.faces) {
      const q = face.mapVertices;
      if (this.inside(u, v,
        { x: q[0].u, y: q[0].v },
        { x: q[1].u, y: q[1].v },
        { x: q[2].u, y: q[2].v })) return face.index;
    }
    return -1;
  }

  faceColor(id) {
    return this.selection.isSelected(id) ? '#e4cb70' : '#ae9d7d';
  }

  drawFace(c, face, fill = true) {
    const w = this.canvas.width, h = this.canvas.height;
    const q = face.mapVertices;
    c.beginPath();
    c.moveTo(q[0].u * w, q[0].v * h);
    c.lineTo(q[1].u * w, q[1].v * h);
    c.lineTo(q[2].u * w, q[2].v * h);
    c.closePath();
    if (fill) {
      c.fillStyle = this.faceColor(face.index);
      c.fill();
      c.strokeStyle = '#405458';
      c.lineWidth = 1;
    }
    c.stroke();
  }

  render(previewFace = null) {
    const c = this.canvas.getContext('2d');
    const w = this.canvas.width, h = this.canvas.height;
    c.fillStyle = '#284851';
    c.fillRect(0, 0, w, h);

    for (const face of this.grid.faces) this.drawFace(c, face, true);

    if (previewFace != null) {
      const face = this.grid.face(previewFace);
      if (!face) return;
      c.save();
      c.strokeStyle = '#9edfff';
      c.lineWidth = Math.max(3, Math.min(devicePixelRatio, 2) * 2);
      this.drawFace(c, face, false);
      c.restore();
    }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const d = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.round(r.width * d);
    this.canvas.height = Math.round(r.height * d);
  }
}
