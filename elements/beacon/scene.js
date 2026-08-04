/* scene.js
 * This is "structure mode": editing a 3D grid of blocks (.mcstructure).
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const VANILLA_COLOR = 0x3a3a3e;
const AIR_NAME = "minecraft:air";

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
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222226, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 4);
    this.scene.add(dir);

    this.gridHelper = null;
    this.blockGroup = new THREE.Group();
    this.scene.add(this.blockGroup);

    this.size = [0, 0, 0];
    this.palette = []; // [{name, states, version}]
    this.indices = new Int32Array(0);
    this.materialCache = new Map(); // identifier -> THREE.Material
    this.textureLoader = new THREE.TextureLoader();

    this.selectedPaletteEntry = { name: AIR_NAME, states: {}, version: 18163713 }; // "eraser" by default
    this.onChange = null; // callback fired after edits, for the save button

    // raycasting for placing/removing
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    canvas.addEventListener("pointerdown", e => this._onPointerDown(e));

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
    const [sx, , sz] = this.size;
    const maxDim = Math.max(sx, sz);
    this.gridHelper = new THREE.GridHelper(maxDim + 2, maxDim + 2, 0x2a2a2e, 0x1a1a1e);
    this.gridHelper.position.set(sx / 2 - 0.5, -0.51, sz / 2 - 0.5);
    this.scene.add(this.gridHelper);
    const center = new THREE.Vector3(sx / 2, this.size[1] / 4, sz / 2);
    this.controls.target.copy(center);
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
      const tex = this.textureLoader.load(custom.textureUrl);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      mat = new THREE.MeshLambertMaterial({ map: tex });
    } else {
      // deterministic pseudo-color per vanilla block name so different blocks
      // are at least visually distinguishable before a texture is wired up
      let hash = 0;
      for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
      const color = new THREE.Color().setHSL((hash % 360) / 360, 0.35, 0.42);
      mat = new THREE.MeshLambertMaterial({ color });
    }
    this.materialCache.set(key, mat);
    return mat;
  }

  _rebuildBlocks() {
    this.blockGroup.clear();
    const [sx, sy, sz] = this.size;
    const geo = new THREE.BoxGeometry(1, 1, 1);

    // group instances by palette index so each distinct block type is one
    // InstancedMesh draw call — keeps this fast even for large structures
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
          mesh.userData[`pos_${cur}`] = [x, y, z]; // cheap lookup for raycast hits
          cursors.set(pi, cur + 1);
        }
      }
    }
    for (const mesh of meshes.values()) mesh.instanceMatrix.needsUpdate = true;
  }

  _paletteIndexFor(entry) {
    let idx = this.palette.findIndex(p => p.name === entry.name && JSON.stringify(p.states) === JSON.stringify(entry.states));
    if (idx === -1) { this.palette.push(entry); idx = this.palette.length - 1; }
    return idx;
  }

  _onPointerDown(e) {
    if (!this.editable) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(this.blockGroup.children, false);
    const [sx, sy, sz] = this.size;

    if (hits.length === 0) {
      // clicked empty space / ground grid: only allow placing on the y=0 plane
      return;
    }
    const hit = hits[0];
    const mesh = hit.object;
    const pos = mesh.userData[`pos_${hit.instanceId}`];
    if (!pos) return;

    const erasing = e.shiftKey || this.selectedPaletteEntry.name === AIR_NAME;
    let target;
    if (erasing) {
      target = pos;
    } else {
      // place adjacent to the clicked face
      const n = hit.face.normal.clone().transformDirection(mesh.matrixWorld).round();
      target = [pos[0] + n.x, pos[1] + n.y, pos[2] + n.z];
    }
    const [tx, ty, tz] = target;
    if (tx < 0 || ty < 0 || tz < 0 || tx >= sx || ty >= sy || tz >= sz) return;

    const newEntry = erasing ? { name: AIR_NAME, states: {}, version: 18163713 } : this.selectedPaletteEntry;
    this.indices[this._idx(tx, ty, tz)] = this._paletteIndexFor(newEntry);
    this._rebuildBlocks();
    if (this.onChange) this.onChange();
  }

  setSelectedBlock(entry) { this.selectedPaletteEntry = entry; }
  setEditable(v) { this.editable = v; }

  /** returns the current state in the shape BeaconNbt.encodeStructure expects */
  exportData() {
    // drop unused palette entries to keep the file small
    const used = new Set(Array.from(this.indices).filter(i => i >= 0));
    const remap = new Map();
    const newPalette = [];
    used.forEach(oldIdx => { remap.set(oldIdx, newPalette.length); newPalette.push(this.palette[oldIdx]); });
    const newIndices = Int32Array.from(this.indices, i => (i < 0 ? -1 : remap.get(i)));
    return { size: this.size, palette: newPalette, indices: newIndices, waterLayer: null };
  }
}
