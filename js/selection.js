export class SelectionModel {
  constructor(worldStore) {
    this.store = worldStore;
  }

  get ids() {
    return this.store.world.selected;
  }

  isSelected(id) {
    return this.ids.includes(id);
  }

  set(id, on) {
    const s = new Set(this.ids);
    on ? s.add(id) : s.delete(id);
    this.store.world.selected = [...s].sort((a, b) => a - b);
    this.store.save();
  }

  toggle(id) {
    this.set(id, !this.isSelected(id));
  }

  clear() {
    this.store.world.selected = [];
    this.store.save();
  }

  invert(count) {
    this.store.world.selected = Array.from({ length: count }, (_, i) => i).filter(i => !this.isSelected(i));
    this.store.save();
  }
}
