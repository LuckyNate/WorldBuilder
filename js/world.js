export const CURRENT_RESOLUTION = 'GLOBAL';

export class WorldStore {
  constructor(key = 'worldbuilder.world.v1') {
    this.key = key;
    this.world = this.load();
  }

  fresh() {
    return { version: 1, lod: 0, selected: [], areas: [] };
  }

  load() {
    try {
      const x = JSON.parse(localStorage.getItem(this.key));
      if (!x || x.version !== 1) return this.fresh();
      return {
        version: 1,
        lod: 0,
        selected: Array.isArray(x.selected) ? x.selected : [],
        areas: Array.isArray(x.areas) ? x.areas : []
      };
    } catch {
      return this.fresh();
    }
  }

  save() {
    localStorage.setItem(this.key, JSON.stringify(this.world));
  }

  selectionKey(ids = this.world.selected) {
    return [...ids].sort((a, b) => a - b).join(',');
  }

  areaForSelection(ids = this.world.selected) {
    const key = this.selectionKey(ids);
    return this.world.areas.find(a => this.selectionKey(a.triangles) === key) || null;
  }

  metadataForFace(faceId, resolution = CURRENT_RESOLUTION) {
    return this.world.areas.filter(a =>
      a.resolution === resolution &&
      Array.isArray(a.triangles) &&
      a.triangles.includes(faceId)
    );
  }

  upsertArea(selectedIds, existingArea, fields) {
    if (!selectedIds.length) return null;
    const rec = {
      triangles: [...selectedIds],
      name: fields.name.trim(),
      resolution: fields.resolution,
      metadata: fields.metadata.trim()
    };
    if (existingArea) Object.assign(existingArea, rec);
    else this.world.areas.push(rec);
    this.save();
    return existingArea || rec;
  }

  exportJSON(filename = 'worldbuilder.json') {
    this.save();
    const blob = new Blob([JSON.stringify(this.world, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
