/* models.js
 * "model mode": mini blockbench-style cube builder, exports bedrock geometry.json
 * (single bone named "root" — bone hierarchy/animation is a future addition,
 * not in this v1 per the current scope).
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

// bedrock model space: 16 units per block, so we scale down by 16 for display
const UNIT = 1 / 16;

export class BeaconModel {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0e0f);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 200);
    this.camera.position.set(2.4, 2, 2.8);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.5, 0);

    this.transformControls = new TransformControls(this.camera, canvas);
    this.transformControls.setMode("translate");
    this.transformControls.setSpace("local");
    this.scene.add(this.transformControls);
    this.transformMode = "translate";
    this.snapEnabled = false;
    this.dragSnapshot = null;
    this.transformControls.addEventListener("dragging-changed", event => {
      this.controls.enabled = !event.value;
      if (event.value) this._beginTransform();
      else this._finishTransform();
    });

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222226, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 5, 2);
    this.scene.add(dir);
    this.scene.add(new THREE.GridHelper(4, 16, 0x2a2a2e, 0x1a1a1e));

    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);
    this.cubeNodes = [];

    this.identifier = "geometry.custom";
    this.textureSize = [16, 16];
    this.cubes = []; // { name, origin:[x,y,z], size:[x,y,z], pivot:[x,y,z], rotation:[x,y,z], mesh }
    this.selectedIndex = -1;
    this.onSelectionChange = null;
    this.onChange = null;
    this.undoStack = [];
    this.redoStack = [];

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

  createEmpty(identifier) {
    this.identifier = identifier || "geometry.custom";
    this.cubes = [];
    this.addCube(); // start with one cube so there's something to see/edit
  }

  /** loads from a parsed geometry.json object (single geometry, single bone assumed) */
  load(geoJsonObj) {
    const geo = geoJsonObj["minecraft:geometry"]?.[0];
    if (!geo) throw new Error("no minecraft:geometry entry found in this file.");
    this.identifier = geo.description?.identifier || "geometry.custom";
    this.textureSize = [geo.description?.texture_width || 16, geo.description?.texture_height || 16];
    const bone = geo.bones?.[0];
    this.cubes = (bone?.cubes || []).map(c => ({
      name: c.name || "cube",
      origin: c.origin || [-4, 0, -4],
      size: c.size || [8, 8, 8],
      pivot: c.pivot || [0, 0, 0],
      rotation: c.rotation || [0, 0, 0],
      uv: c.uv || [0, 0]
    }));
    this._rebuild();
    this.select(this.cubes.length ? 0 : -1);
  }

  addCube() {
    this._recordHistory();
    this.cubes.push({
      name: `cube${this.cubes.length}`,
      origin: [-4, 0, -4],
      size: [8, 8, 8],
      pivot: [0, 4, 0],
      rotation: [0, 0, 0],
      uv: [0, 0]
    });
    this._rebuild();
    this.select(this.cubes.length - 1);
    if (this.onChange) this.onChange();
  }

  removeCube(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this.cubes.length) return;
    this._recordHistory();
    this.cubes.splice(i, 1);
    this._rebuild();
    const next = this.cubes.length ? Math.min(i, this.cubes.length - 1) : -1;
    this.select(next);
    if (this.onChange) this.onChange();
  }

  duplicateSelected() {
    if (this.selectedIndex < 0) return;
    this._recordHistory();
    const source = this.cubes[this.selectedIndex];
    const copy = {
      name: `${source.name || "cube"}_copy`,
      origin: [...source.origin],
      size: [...source.size],
      pivot: [...source.pivot],
      rotation: [...source.rotation],
      uv: Array.isArray(source.uv) ? [...source.uv] : source.uv
    };
    copy.origin[0] += 1;
    copy.pivot[0] += 1;
    this.cubes.splice(this.selectedIndex + 1, 0, copy);
    this._rebuild();
    this.select(this.selectedIndex + 1);
    if (this.onChange) this.onChange();
  }

  setTransformMode(mode) {
    if (!["select", "translate", "rotate", "scale"].includes(mode)) return;
    this.transformMode = mode;
    if (mode !== "select") this.transformControls.setMode(mode);
    this._attachTransform();
    this._applySnap();
  }

  setSnapEnabled(enabled) {
    this.snapEnabled = !!enabled;
    this._applySnap();
  }

  _applySnap() {
    this.transformControls.setTranslationSnap(this.snapEnabled ? UNIT : null);
    this.transformControls.setRotationSnap(this.snapEnabled ? THREE.MathUtils.degToRad(15) : null);
    this.transformControls.setScaleSnap(null);
  }

  _attachTransform() {
    if (this.transformMode === "select" || this.selectedIndex < 0 || !this.cubeNodes[this.selectedIndex]) {
      this.transformControls.detach();
      return;
    }
    const { group, mesh } = this.cubeNodes[this.selectedIndex];
    this.transformControls.attach(this.transformMode === "scale" ? mesh : group);
  }

  _beginTransform() {
    if (this.selectedIndex < 0 || !this.cubeNodes[this.selectedIndex]) return;
    const { group, mesh } = this.cubeNodes[this.selectedIndex];
    this.dragSnapshot = {
      index: this.selectedIndex,
      mode: this.transformMode,
      position: group.position.clone(),
      meshScale: mesh.scale.clone(),
      origin: [...this.cubes[this.selectedIndex].origin],
      size: [...this.cubes[this.selectedIndex].size],
      pivot: [...this.cubes[this.selectedIndex].pivot]
    };
  }

  _finishTransform() {
    const snapshot = this.dragSnapshot;
    this.dragSnapshot = null;
    if (!snapshot || !this.cubes[snapshot.index]) return;
    const cube = this.cubes[snapshot.index];
    const { group, mesh } = this.cubeNodes[snapshot.index];

    if (snapshot.mode === "translate") {
      const delta = group.position.clone().sub(snapshot.position).toArray().map(v => v / UNIT);
      cube.origin = snapshot.origin.map((v, axis) => v + delta[axis]);
      cube.pivot = snapshot.pivot.map((v, axis) => v + delta[axis]);
    } else if (snapshot.mode === "rotate") {
      cube.rotation = [group.rotation.x, group.rotation.y, group.rotation.z]
        .map(value => THREE.MathUtils.radToDeg(value));
    } else if (snapshot.mode === "scale") {
      const scale = mesh.scale.toArray();
      cube.size = snapshot.size.map((v, axis) => Math.max(0.01, v * Math.abs(scale[axis])));
      cube.origin = snapshot.origin.map((v, axis) => v + (snapshot.size[axis] - cube.size[axis]) / 2);
    }

    this._rebuild();
    this._attachTransform();
    if (this.onChange) this.onChange();
  }

  _recordHistory() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.cubes)));
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.cubes)));
    this.cubes = this.undoStack.pop();
    this.selectedIndex = this.cubes.length ? Math.min(this.selectedIndex, this.cubes.length - 1) : -1;
    this._rebuild();
    this.select(this.selectedIndex);
    if (this.onChange) this.onChange();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.parse(JSON.stringify(this.cubes)));
    this.cubes = this.redoStack.pop();
    this.selectedIndex = this.cubes.length ? Math.min(this.selectedIndex, this.cubes.length - 1) : -1;
    this._rebuild();
    this.select(this.selectedIndex);
    if (this.onChange) this.onChange();
  }

  frameSelection() {
    const targetObjects = this.selectedIndex >= 0 && this.cubeNodes[this.selectedIndex]
      ? [this.cubeNodes[this.selectedIndex].group]
      : this.cubeNodes.map(node => node.group);
    if (!targetObjects.length) return;
    const bounds = new THREE.Box3();
    targetObjects.forEach(object => bounds.expandByObject(object));
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() * 0.8, 0.5);
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(direction.multiplyScalar(radius * 2.8));
    this.camera.near = Math.max(0.01, radius / 100);
    this.camera.far = Math.max(200, radius * 20);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  resetCamera() {
    this.camera.position.set(2.4, 2, 2.8);
    this.controls.target.set(0, 0.5, 0);
    this.camera.near = 0.01;
    this.camera.far = 200;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  select(i) {
    this.selectedIndex = Number.isInteger(i) && i >= 0 && i < this.cubes.length ? i : -1;
    this._updateSelectionHighlight();
    this._attachTransform();
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedIndex, this.selectedIndex >= 0 ? this.cubes[this.selectedIndex] : null);
    }
  }

  _updateSelectionHighlight() {
    this.cubeGroup.traverse(object => {
      if (!object.isMesh) return;
      const selected = object.userData.cubeIndex === this.selectedIndex;
      object.material.emissive?.setHex(selected ? 0x05ee93 : 0x000000);
      if (object.material.emissiveIntensity !== undefined) {
        object.material.emissiveIntensity = selected ? 0.35 : 0;
      }
    });
  }

  updateSelected(field, value) {
    if (this.selectedIndex < 0) return;
    this._recordHistory();
    this.cubes[this.selectedIndex][field] = value;
    this._rebuild();
    if (this.onChange) this.onChange();
  }

  _rebuild() {
    this.transformControls.detach();
    this.cubeGroup.traverse(object => {
      if (!object.isMesh) return;
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose();
    });
    this.cubeGroup.clear();
    this.cubeNodes = [];
    this.cubes.forEach((c, i) => {
      const [sx, sy, sz] = c.size;
      const geo = new THREE.BoxGeometry(Math.max(sx, 0.01) * UNIT, Math.max(sy, 0.01) * UNIT, Math.max(sz, 0.01) * UNIT);
      const mat = new THREE.MeshLambertMaterial({ color: 0x6d9cf6, emissive: 0x000000 });
      const mesh = new THREE.Mesh(geo, mat);

      // position the box center = origin + size/2, offset by pivot, then rotate about pivot
      const center = [
        (c.origin[0] + sx / 2) * UNIT,
        (c.origin[1] + sy / 2) * UNIT,
        (c.origin[2] + sz / 2) * UNIT
      ];
      const pivot = c.pivot.map(v => v * UNIT);
      mesh.position.set(center[0] - pivot[0], center[1] - pivot[1], center[2] - pivot[2]);
      const group = new THREE.Group();
      group.position.set(pivot[0], pivot[1], pivot[2]);
      group.rotation.set(
        THREE.MathUtils.degToRad(c.rotation[0]),
        THREE.MathUtils.degToRad(c.rotation[1]),
        THREE.MathUtils.degToRad(c.rotation[2])
      );
      group.add(mesh);
      group.userData.cubeIndex = i;
      mesh.userData.cubeIndex = i;
      this.cubeGroup.add(group);
      this.cubeNodes.push({ group, mesh });
    });
    this._updateSelectionHighlight();
    this._attachTransform();
  }

  _onPointerDown(e) {
    if (e.button !== 0 || this.transformControls.axis !== null) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [];
    this.cubeGroup.traverse(o => { if (o.isMesh) meshes.push(o); });
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length) this.select(hits[0].object.userData.cubeIndex);
  }

  /** returns a full geometry.json-shaped object ready for JSON.stringify */
  exportData() {
    return {
      format_version: "1.16.0",
      "minecraft:geometry": [{
        description: {
          identifier: this.identifier,
          texture_width: this.textureSize[0],
          texture_height: this.textureSize[1],
          visible_bounds_width: 4,
          visible_bounds_height: 4,
          visible_bounds_offset: [0, 1, 0]
        },
        bones: [{
          name: "root",
          pivot: [0, 0, 0],
          cubes: this.cubes.map(c => ({
            origin: c.origin, size: c.size, pivot: c.pivot, rotation: c.rotation, uv: c.uv
          }))
        }]
      }]
    };
  }
}
