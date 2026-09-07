import { WorldStore, CURRENT_RESOLUTION } from './world.js';
import { TriGrid } from './tri-grid.js';
import { SelectionModel } from './selection.js';
import { MapView } from './map-view.js';
import { GlobeView } from './globe-view.js';
import { TouchController } from './touch.js';

const map = document.querySelector('#map');
const meta = document.querySelector('#meta');
const menu = document.querySelector('#menu');
const menuTitle = document.querySelector('#menuTitle');
const editPane = document.querySelector('#editPane');
const addPane = document.querySelector('#addPane');
const nameInput = document.querySelector('#name');
const resolution = document.querySelector('#resolution');
const dataInput = document.querySelector('#data');
const globeHost = document.querySelector('#globe');

const store = new WorldStore();
const grid = new TriGrid();
const selection = new SelectionModel(store);
const mapView = new MapView(map, grid, selection);
const globeView = new GlobeView(globeHost, grid, selection);

let mode = 'add';
let previewFace = null;
let contextFace = -1;
let contextArea = null;
let contextOriginal = null;
let lastPaintFace = -1;
let paintChanged = false;

function renderMetadata() {
  if (previewFace == null) {
    meta.textContent = `${CURRENT_RESOLUTION}: NULL`;
    return;
  }
  const hits = store.metadataForFace(previewFace, CURRENT_RESOLUTION);
  if (!hits.length) {
    meta.textContent = `${CURRENT_RESOLUTION} · TRI ${previewFace}: NULL`;
    return;
  }
  meta.textContent = hits.map(a => `${CURRENT_RESOLUTION} · ${a.name || 'NULL'} · ${a.metadata || 'NULL'}`).join(' | ');
}

function renderAll() {
  mapView.render(previewFace);
  globeView.render(previewFace);
  renderMetadata();
}

function recenterSelection() {
  globeView.recenterSelection(selection.ids);
}

function selectionChanged(recenter = true) {
  store.save();
  renderAll();
  if (recenter) recenterSelection();
}

function setSelected(id, on, recenter = true) {
  selection.set(id, on);
  selectionChanged(recenter);
}

function toggleSelected(id) {
  selection.toggle(id);
  selectionChanged(true);
}

function clearSelection() {
  selection.clear();
  selectionChanged(true);
}

function invertSelection() {
  closeMenu(true);
  selection.invert(grid.count);
  selectionChanged(true);
}

function preview(id) {
  previewFace = previewFace === id ? null : id;
  renderAll();
}

function snapshotEditor() {
  return { name: nameInput.value, resolution: resolution.value, metadata: dataInput.value };
}

function upsertContextArea() {
  if (!selection.ids.length) return;
  contextArea = store.upsertArea(selection.ids, contextArea, {
    name: nameInput.value,
    resolution: resolution.value,
    metadata: dataInput.value
  });
  renderAll();
}

function openMenu(x, y, id) {
  contextFace = id;
  const isSel = selection.isSelected(id);
  contextArea = isSel ? store.areaForSelection(selection.ids) : null;
  editPane.style.display = isSel ? 'block' : 'none';
  addPane.style.display = isSel ? 'none' : 'block';
  menuTitle.textContent = isSel ? 'EDIT SELECTED AREA' : `UNSELECTED TRI ${id}`;
  if (isSel) {
    nameInput.value = contextArea?.name || '';
    resolution.value = contextArea?.resolution || CURRENT_RESOLUTION;
    dataInput.value = contextArea?.metadata || '';
    contextOriginal = snapshotEditor();
  } else {
    contextOriginal = null;
  }
  menu.classList.add('open');
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + 'px';
  menu.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px';
}

function closeMenu(save = true) {
  if (!menu.classList.contains('open')) return;
  if (save && editPane.style.display !== 'none') upsertContextArea();
  menu.classList.remove('open');
  contextFace = -1;
  contextArea = null;
  contextOriginal = null;
}

function paintFace(id) {
  if (id < 0 || id === lastPaintFace) return;
  lastPaintFace = id;
  const after = mode === 'add';
  if (selection.isSelected(id) !== after) {
    selection.set(id, after);
    paintChanged = true;
    renderAll();
  }
}

for (const id of ['add', 'erase']) {
  document.querySelector('#' + id).onclick = () => {
    mode = id;
    document.querySelector('#add').classList.toggle('on', id === 'add');
    document.querySelector('#erase').classList.toggle('on', id === 'erase');
  };
}

document.querySelector('#invert').onclick = invertSelection;
document.querySelector('#clear').onclick = clearSelection;
document.querySelector('#export').onclick = () => {
  closeMenu(true);
  store.exportJSON();
};
document.querySelector('#done').onclick = () => closeMenu(true);
document.querySelector('#editInvert').onclick = invertSelection;
document.querySelector('#menuInvert').onclick = invertSelection;
document.querySelector('#menuAdd').onclick = () => {
  const id = contextFace;
  closeMenu(false);
  setSelected(id, true, true);
};
document.querySelector('#editCancel').onclick = () => {
  if (contextOriginal) {
    nameInput.value = contextOriginal.name;
    resolution.value = contextOriginal.resolution;
    dataInput.value = contextOriginal.metadata;
  }
  closeMenu(false);
};
document.querySelector('#addCancel').onclick = () => closeMenu(false);
menu.onpointerdown = e => e.stopPropagation();

map.addEventListener('pointerdown', () => closeMenu(true), { capture: true });
globeView.element.addEventListener('pointerdown', () => closeMenu(true), { capture: true });

new TouchController({
  target: map,
  faceAt: (x, y) => mapView.faceAt(x, y),
  onTap: face => preview(face),
  onDoubleTap: face => toggleSelected(face),
  onLongPress: (face, x, y) => openMenu(x, y, face),
  onDragStart: face => {
    lastPaintFace = -1;
    paintChanged = false;
    paintFace(face);
  },
  onDragMove: face => paintFace(face),
  onDragEnd: () => {
    if (paintChanged) recenterSelection();
    lastPaintFace = -1;
    paintChanged = false;
  }
});

new TouchController({
  target: globeView.element,
  faceAt: (x, y) => globeView.faceAt(x, y),
  onTap: face => preview(face),
  onDoubleTap: face => toggleSelected(face),
  onBackgroundTap: () => clearSelection(),
  onLongPress: (face, x, y) => openMenu(x, y, face),
  onDragStart: () => globeView.stopRecenter(),
  onDragMove: (_face, dx, dy) => globeView.drag(dx, dy)
});

function resize() {
  mapView.resize();
  globeView.resize();
  mapView.render(previewFace);
}

new ResizeObserver(resize).observe(document.querySelector('#app'));
resize();
renderAll();
recenterSelection();

(function loop() {
  requestAnimationFrame(loop);
  globeView.tick();
})();
