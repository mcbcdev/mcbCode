/* scene.js
 * Requires three.js + OrbitControls loaded first (see index.html importmap).
 * This is "structure mode": editing a 3D grid of blocks (.mcstructure).
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const VANILLA_COLOR = 0x3a3a3e;
const AIR_NAME = "minecraft:air";
const UNDEFINED_TEXTURE_URL = "https://mcbcode.com/img/undefined.png";

export class BeaconScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0e0f);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
    this.camera.position.set(10, 10, 14);

    this.controls = new OrbitControls(this.camera, canvas);
    // damping was causing the camera to keep drifting for a bit after you
    // let go of the mouse button — turning it off makes it stop instantly.
    this.controls.enableDamping = false;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222226, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 4);
    this.scene.add(dir);

    this.gridHelper = null;
    this.borderHelper = null;
    this.borderDashOffset = 0;
    this.blockGroup = new THREE.Group();
    this.highlightGroup = new THREE.Group();
    this.scene.add(this.blockGroup);
    this.scene.add(this.highlightGroup);

    this.size = [0, 0, 0];
    this.palette = []; // [{name, states, version}]
    this.indices = new Int32Array(0);
    this.materialCache = new Map(); // identifier -> THREE.Material
    this.textureLoader = new THREE.TextureLoader();

    this.selectedPaletteEntry = null; // no tool selected = clicking just inspects/selects
    this.selected = new Set();        // multi-selection, keys are "x,y,z"
    this.onChange = null;             // fired after edits, for the save button
    this.onInspect = null;            // fired on selection change: (positions[], entries[])

    // raycasting for placing/removing/selecting
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    canvas.addEventListener("pointerdown", e => this._onPointerDown(e));

    this._buildGizmo();
    this._dragState = null;
    window.addEventListener("pointermove", e => this._onPointerMove(e));
    window.addEventListener("pointerup", () => this._onPointerUp());

    this._resize();
    window.addEventListener("resize", () => this._resize());
    this._animate();
  }

  _resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.controls.update();
    if (this.borderHelper && this.borderHelper.material.visible !== false) {
      this.borderDashOffset -= 0.006;
      this.borderHelper.material.dashOffset = this.borderDashOffset;
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** loads a decoded structure (from BeaconNbt.decodeStructure) into the scene */
  load(structData, customBlockList) {
    this.size = structData.size;
    this.palette = structData.palette;
    this.indices = structData.indices;
    this.customBlocks = customBlockList || [];
    this._rebuildGrid();
    this._rebuildBlocks();
  }

  /** starts a brand new empty structure of the given size, all air */
  createEmpty(sx, sy, sz, customBlockList) {
    this.size = [sx, sy, sz];
    this.palette = [{ name: AIR_NAME, states: {}, version: 18163713 }];
    this.indices = new Int32Array(sx * sy * sz).fill(0);
    this.customBlocks = customBlockList || [];
    this._rebuildGrid();
    this._rebuildBlocks();
  }

  _rebuildGrid() {
    if (this.gridHelper) this.scene.remove(this.gridHelper);
    if (this.borderHelper) this.scene.remove(this.borderHelper);
    const [sx, sy, sz] = this.size;
    const maxDim = Math.max(sx, sz);
    this.gridHelper = new THREE.GridHelper(maxDim + 2, maxDim + 2, 0x2a2a2e, 0x1a1a1e);
    this.gridHelper.position.set(sx / 2 - 0.5, -0.51, sz / 2 - 0.5);
    this.scene.add(this.gridHelper);
    const center = new THREE.Vector3(sx / 2, sy / 4, sz / 2);
    this.controls.target.copy(center);

    // slow-moving dashed outline around the whole structure, 25% opacity
    const boxGeo = new THREE.BoxGeometry(sx, sy, sz);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const mat = new THREE.LineDashedMaterial({ color: 0x05ee93, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.25 });
    this.borderHelper = new THREE.LineSegments(edges, mat);
    this.borderHelper.position.set(sx / 2 - 0.5, sy / 2 - 0.5, sz / 2 - 0.5);
    this.borderHelper.computeLineDistances();
    this.scene.add(this.borderHelper);
  }

  toggleGrid() { this.gridHelper.visible = !this.gridHelper.visible; }
  toggleBorder() { this.borderHelper.visible = !this.borderHelper.visible; }

  resetCamera() {
    const [sx, sy, sz] = this.size;
    this.camera.position.set(sx + 4, sy + 4, sz + 6);
    this.controls.target.set(sx / 2, sy / 4, sz / 2);
  }

  frameSelection() {
    if (!this.selected.size) return;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const key of this.selected) { const [x, y, z] = key.split(",").map(Number); sx += x; sy += y; sz += z; n++; }
    this.controls.target.set(sx / n + 0.5, sy / n + 0.5, sz / n + 0.5);
  }

  _idx(x, y, z) {
    const [sx, sy, sz] = this.size;
    // Bedrock structure files are stored y-major, then z, then x (matches decode order)
    return (x * sy * sz) + (y * sz) + z;
  }

  _materialFor(paletteEntry) {
    const key = paletteEntry.name;
    if (this.materialCache.has(key)) return this.materialCache.get(key);
    const custom = this.customBlocks.find(b => b.identifier === key);
    let mat;
    if (custom) {
      mat = this._texturedMaterial(custom.textureUrl);
    } else if (key.includes(":") && key.split(":")[0] !== "minecraft") {
      // namespaced custom block but no matching texture found under RP — fallback image
      mat = this._texturedMaterial(UNDEFINED_TEXTURE_URL);
    } else {
      // vanilla block, no texture atlas wired up yet — deterministic pseudo-color
      let hash = 0;
      for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
      const color = new THREE.Color().setHSL((hash % 360) / 360, 0.35, 0.42);
      mat = new THREE.MeshLambertMaterial({ color });
    }
    this.materialCache.set(key, mat);
    return mat;
  }

  _texturedMaterial(url) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.textureLoader.load(
      url,
      tex => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        mat.map = tex;
        mat.needsUpdate = true;
      },
      undefined,
      () => {
        // texture failed to load (broken/missing file) — swap to fallback
        this.textureLoader.load(UNDEFINED_TEXTURE_URL, tex => {
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          mat.map = tex;
          mat.needsUpdate = true;
        });
      }
    );
    return mat;
  }

  _rebuildBlocks() {
    this.blockGroup.clear();
    const [sx, sy, sz] = this.size;
    const geo = new THREE.BoxGeometry(1, 1, 1);

    const counts = new Map();
    for (let i = 0; i < this.indices.length; i++) {
      const pi = this.indices[i];
      if (pi < 0 || this.palette[pi]?.name === AIR_NAME) continue;
      counts.set(pi, (counts.get(pi) || 0) + 1);
    }

    const cursors = new Map();
    const meshes = new Map();
    for (const [pi, count] of counts) {
      const mat = this._materialFor(this.palette[pi]);
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.userData.paletteIndex = pi;
      meshes.set(pi, mesh);
      cursors.set(pi, 0);
      this.blockGroup.add(mesh);
    }

    const m = new THREE.Matrix4();
    for (let x = 0; x < sx; x++) {
      for (let y = 0; y < sy; y++) {
        for (let z = 0; z < sz; z++) {
          const pi = this.indices[this._idx(x, y, z)];
          if (pi < 0 || this.palette[pi]?.name === AIR_NAME) continue;
          const mesh = meshes.get(pi);
          const cur = cursors.get(pi);
          m.setPosition(x, y, z);
          mesh.setMatrixAt(cur, m);
          mesh.userData[`pos_${cur}`] = [x, y, z];
          cursors.set(pi, cur + 1);
        }
      }
    }
    for (const mesh of meshes.values()) mesh.instanceMatrix.needsUpdate = true;
    this._rebuildSelectionHighlight();
  }

  _rebuildSelectionHighlight() {
    this.highlightGroup.clear();
    if (!this.selected.size) return;
    const geo = new THREE.BoxGeometry(1.03, 1.03, 1.03);
    const mat = new THREE.MeshBasicMaterial({ color: 0x05ee93, wireframe: true });
    for (const key of this.selected) {
      const [x, y, z] = key.split(",").map(Number);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.highlightGroup.add(mesh);
    }
  }

  _paletteIndexFor(entry) {
    let idx = this.palette.findIndex(p => p.name === entry.name && JSON.stringify(p.states) === JSON.stringify(entry.states));
    if (idx === -1) { this.palette.push(entry); idx = this.palette.length - 1; }
    return idx;
  }

  // ---------------- selection ----------------

  _entryAt(pos) {
    const pi = this.indices[this._idx(...pos)];
    return this.palette[pi];
  }

  _fireInspect() {
    if (!this.onInspect) return;
    const positions = [...this.selected].map(k => k.split(",").map(Number));
    const entries = positions.map(p => this._entryAt(p));
    this.onInspect(positions, entries);
  }

  selectAll() {
    this.selected.clear();
    const [sx, sy, sz] = this.size;
    for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) {
      const pi = this.indices[this._idx(x, y, z)];
      if (pi >= 0 && this.palette[pi]?.name !== AIR_NAME) this.selected.add(`${x},${y},${z}`);
    }
    this._rebuildSelectionHighlight();
    this._updateGizmoPosition();
    this._fireInspect();
  }

  clearSelection() {
    this.selected.clear();
    this._rebuildSelectionHighlight();
    this._updateGizmoPosition();
    this._fireInspect();
  }

  deleteSelection() {
    if (!this.selected.size) return;
    const airIdx = this._paletteIndexFor({ name: AIR_NAME, states: {}, version: 18163713 });
    for (const key of this.selected) {
      const [x, y, z] = key.split(",").map(Number);
      this.indices[this._idx(x, y, z)] = airIdx;
    }
    this.selected.clear();
    this._rebuildBlocks();
    this._updateGizmoPosition();
    if (this.onChange) this.onChange();
    this._fireInspect();
  }

  /** moves every selected block by (dx,dy,dz) in grid units; no-ops (returns false) on overlap/out of bounds */
  moveSelection(dx, dy, dz) {
    if (!this.selected.size || (dx === 0 && dy === 0 && dz === 0)) return false;
    const [sx, sy, sz] = this.size;
    const moves = [];
    for (const key of this.selected) {
      const [x, y, z] = key.split(",").map(Number);
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < 0 || ny < 0 || nz < 0 || nx >= sx || ny >= sy || nz >= sz) return false;
      moves.push({ from: [x, y, z], to: [nx, ny, nz] });
    }
    const fromSet = new Set(moves.map(m => m.from.join(",")));
    for (const m of moves) {
      const toKey = m.to.join(",");
      if (fromSet.has(toKey)) continue; // moving block into a cell another selected block is vacating — fine
      const pi = this.indices[this._idx(...m.to)];
      if (pi >= 0 && this.palette[pi]?.name !== AIR_NAME) return false; // overlap with a non-selected block
    }
    const airIdx = this._paletteIndexFor({ name: AIR_NAME, states: {}, version: 18163713 });
    const carried = moves.map(m => this.indices[this._idx(...m.from)]);
    moves.forEach(m => { this.indices[this._idx(...m.from)] = airIdx; });
    moves.forEach((m, i) => { this.indices[this._idx(...m.to)] = carried[i]; });
    this.selected = new Set(moves.map(m => m.to.join(",")));
    this._rebuildBlocks();
    this._updateGizmoPosition();
    if (this.onChange) this.onChange();
    return true;
  }

  // ---------------- move gizmo ----------------

  _buildGizmo() {
    this.gizmo = new THREE.Group();
    const axes = [
      { dir: [1, 0, 0], color: 0xff5555 },
      { dir: [0, 1, 0], color: 0x55ff55 },
      { dir: [0, 0, 1], color: 0x5599ff }
    ];
    this.gizmoParts = [];
    axes.forEach(a => {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(...a.dir), new THREE.Vector3(0, 0, 0), 1.6, a.color, 0.4, 0.22);
      arrow.line.userData.axis = a.dir;
      arrow.cone.userData.axis = a.dir;
      this.gizmoParts.push(arrow.line, arrow.cone);
      this.gizmo.add(arrow);
    });
    this.gizmo.visible = false;
    this.gizmo.renderOrder = 999;
    this.scene.add(this.gizmo);
  }

  _updateGizmoPosition() {
    if (!this.selected.size) { this.gizmo.visible = false; return; }
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const key of this.selected) { const [x, y, z] = key.split(",").map(Number); sx += x; sy += y; sz += z; n++; }
    this.gizmo.position.set(sx / n + 0.5, sy / n + 0.5, sz / n + 0.5);
    this.gizmo.visible = true;
  }

  _onPointerMove(e) {
    if (!this._dragState) return;
    const rect = this.canvas.getBoundingClientRect();
    const pt = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(pt, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this._dragState.plane, hit)) return;
    const t = hit.clone().sub(this._dragState.origin).dot(this._dragState.axisVec);
    const delta = Math.round(t);
    if (delta === this._dragState.lastDelta) return;
    // revert last preview move, apply new one, without touching undo state
    const prevDelta = this._dragState.lastDelta;
    const undo = [-prevDelta * this._dragState.axisVec.x, -prevDelta * this._dragState.axisVec.y, -prevDelta * this._dragState.axisVec.z];
    if (prevDelta !== 0) this.moveSelection(...undo.map(Math.round));
    const apply = [delta * this._dragState.axisVec.x, delta * this._dragState.axisVec.y, delta * this._dragState.axisVec.z].map(Math.round);
    if (apply.some(v => v !== 0)) {
      const ok = this.moveSelection(...apply);
      this._dragState.lastDelta = ok ? delta : prevDelta;
    }
  }

  _onPointerUp() {
    this._dragState = null;
  }

  _tryStartGizmoDrag(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.params.Line.threshold = 0.08;
    const hits = this.raycaster.intersectObjects(this.gizmoParts, false);
    if (!hits.length) return false;
    const axis = hits[0].object.userData.axis;
    const axisVec = new THREE.Vector3(...axis);
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const planeNormal = new THREE.Vector3().crossVectors(axisVec, camDir).cross(axisVec).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, this.gizmo.position);
    this._dragState = { axisVec, plane, origin: this.gizmo.position.clone(), lastDelta: 0 };
    return true;
  }

  _onPointerDown(e) {
    if (!this.editable) return;
    if (this.gizmo.visible && this._tryStartGizmoDrag(e)) return;

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(this.blockGroup.children, false);
    const [sx, sy, sz] = this.size;

    if (hits.length === 0) return;
    const hit = hits[0];
    const mesh = hit.object;
    const pos = mesh.userData[`pos_${hit.instanceId}`];
    if (!pos) return;
    const key = pos.join(",");

    // ctrl/cmd-click always erases, regardless of tool
    if (e.ctrlKey || e.metaKey) {
      this.indices[this._idx(...pos)] = this._paletteIndexFor({ name: AIR_NAME, states: {}, version: 18163713 });
      this.selected.delete(key);
      this._rebuildBlocks();
      this._updateGizmoPosition();
      if (this.onChange) this.onChange();
      this._fireInspect();
      return;
    }

    // shift-click: add/remove this block from the multi-selection, no placing
    if (e.shiftKey) {
      if (this.selected.has(key)) this.selected.delete(key); else this.selected.add(key);
      this._rebuildSelectionHighlight();
      this._updateGizmoPosition();
      this._fireInspect();
      return;
    }

    // no tool selected: plain click selects just this block (for inspecting/moving)
    if (!this.selectedPaletteEntry) {
      this.selected.clear();
      this.selected.add(key);
      this._rebuildSelectionHighlight();
      this._updateGizmoPosition();
      this._fireInspect();
      return;
    }

    // a tool is selected: place/erase as before
    const erasing = this.selectedPaletteEntry.name === AIR_NAME;
    let target;
    if (erasing) {
      target = pos;
    } else {
      const n = hit.face.normal.clone().transformDirection(mesh.matrixWorld).round();
      target = [pos[0] + n.x, pos[1] + n.y, pos[2] + n.z];
    }
    const [tx, ty, tz] = target;
    if (tx < 0 || ty < 0 || tz < 0 || tx >= sx || ty >= sy || tz >= sz) return;

    this.indices[this._idx(tx, ty, tz)] = this._paletteIndexFor(this.selectedPaletteEntry);
    this._rebuildBlocks();
    if (this.onChange) this.onChange();
  }

  setSelectedBlock(entry) { this.selectedPaletteEntry = entry; }
  setEditable(v) { this.editable = v; }

  /** explicit removal, used by the inspector's "Remove this block" button */
  removeAt(pos) {
    this.indices[this._idx(...pos)] = this._paletteIndexFor({ name: AIR_NAME, states: {}, version: 18163713 });
    this.selected.delete(pos.join(","));
    this._rebuildBlocks();
    this._updateGizmoPosition();
    if (this.onChange) this.onChange();
  }

  /** replaces every selected block's type with the currently selected palette tool */
  replaceSelectionWithTool() {
    if (!this.selectedPaletteEntry || !this.selected.size) return;
    const pi = this._paletteIndexFor(this.selectedPaletteEntry);
    for (const key of this.selected) {
      const [x, y, z] = key.split(",").map(Number);
      this.indices[this._idx(x, y, z)] = pi;
    }
    this._rebuildBlocks();
    if (this.onChange) this.onChange();
    this._fireInspect();
  }

  // ---------------- resize ----------------

  /** grows or shrinks the structure. keeps the (0,0,0) corner fixed; new cells are air. */
  resizeStructure(newSize) {
    const [nsx, nsy, nsz] = newSize.map(v => Math.max(1, Math.round(v)));
    const [osx, osy, osz] = this.size;
    const airIdx = this._paletteIndexFor({ name: AIR_NAME, states: {}, version: 18163713 });
    const newIndices = new Int32Array(nsx * nsy * nsz).fill(airIdx);
    const idxNew = (x, y, z) => (x * nsy * nsz) + (y * nsz) + z;
    const cx = Math.min(osx, nsx), cy = Math.min(osy, nsy), cz = Math.min(osz, nsz);
    for (let x = 0; x < cx; x++) for (let y = 0; y < cy; y++) for (let z = 0; z < cz; z++) {
      newIndices[idxNew(x, y, z)] = this.indices[this._idx(x, y, z)];
    }
    this.size = [nsx, nsy, nsz];
    this.indices = newIndices;
    this.selected.clear();
    this._rebuildGrid();
    this._rebuildBlocks();
    this._updateGizmoPosition();
    if (this.onChange) this.onChange();
  }

  /** returns the current state in the shape BeaconNbt.encodeStructure expects */
  exportData() {
    const used = new Set(Array.from(this.indices).filter(i => i >= 0));
    const remap = new Map();
    const newPalette = [];
    used.forEach(oldIdx => { remap.set(oldIdx, newPalette.length); newPalette.push(this.palette[oldIdx]); });
    const newIndices = Int32Array.from(this.indices, i => (i < 0 ? -1 : remap.get(i)));
    return { size: this.size, palette: newPalette, indices: newIndices, waterLayer: null };
  }
}
