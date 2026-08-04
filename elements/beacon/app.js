/* app.js
 * Loaded as <script type="module"> from editor/beacon/index.html.
 * Ties together project-api.js (plain script), nbt.js (plain script),
 * and scene.js / models.js (ES modules).
 */
import { BeaconScene } from "./scene.js";
import { BeaconModel } from "./models.js";

const $ = sel => document.querySelector(sel);
const canvas = $("#beacon-canvas");

let mode = "structure";
let scene = null;   // BeaconScene, structure mode
let model = null;   // BeaconModel, model mode
let customBlocks = [];
let dirty = false;

function setStatus(text) { $(".mode-tabs .status").textContent = text; }
function markDirty() {
  dirty = true;
  $("#save-btn").disabled = false;
  setStatus("unsaved changes");
}

async function boot() {
  try {
    await window.BeaconProject.init();
  } catch (e) {
    $(".layout").innerHTML = `<div class="err-msg">${e.message}</div>`;
    return;
  }

  mode = window.BeaconProject.mode;
  customBlocks = window.BeaconProject.findCustomBlocks();

  $(".beacon-crumb").innerHTML =
    `<a href="https://mcbcode.com/project/${window.BeaconProject.shareCode}">${escHtml(window.BeaconProject.project.name)}</a> <span style="color:#3a3a3e;">/</span> <b>beacon</b>`;

  document.getElementById(mode === "structure" ? "tab-structure" : "tab-model").classList.add("active");
  $("#save-btn").disabled = true;

  if (mode === "structure") await bootStructureMode();
  else await bootModelMode();

  const canEdit = window.BeaconProject.canEdit;
  $("#save-btn").style.display = canEdit ? "" : "none";
  if (!canEdit) setStatus("view only — you're not a collaborator on this project");

  $("#loading-overlay").style.display = "none";
}

function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// ---------------- structure mode ----------------
async function bootStructureMode() {
  buildBlockPalette();
  scene = new BeaconScene(canvas);
  scene.setEditable(window.BeaconProject.canEdit);
  scene.onChange = markDirty;

  if (window.BeaconProject.currentFile) {
    setStatus("loading structure...");
    const bytes = await window.BeaconProject.fetchCurrentFileBytes();
    const data = window.BeaconNbt.decodeStructure(bytes);
    scene.load(data, customBlocks);
    setStatus(`${data.size[0]}x${data.size[1]}x${data.size[2]} — loaded`);
  } else {
    scene.createEmpty(8, 8, 8, customBlocks);
    setStatus("new structure (8x8x8) — unsaved");
    markDirty();
  }

  $("#save-btn").onclick = async () => {
    try {
      setStatus("saving...");
      const exported = scene.exportData();
      const bytes = window.BeaconNbt.encodeStructure(exported);
      await window.BeaconProject.saveBytes(bytes, "untitled.mcstructure");
      dirty = false;
      $("#save-btn").disabled = true;
      setStatus("saved!");
    } catch (e) { setStatus("save failed: " + e.message); }
  };
}

function buildBlockPalette() {
  const grid = $("#block-grid");
  grid.innerHTML = "";

  // air / eraser swatch, always first
  grid.appendChild(makeSwatch({ identifier: "minecraft:air", displayName: "air (erase)" }, true));

  customBlocks.forEach(b => grid.appendChild(makeSwatch(b, false)));

  if (customBlocks.length === 0) {
    const hint = document.createElement("div");
    hint.className = "block-name-hint";
    hint.textContent = "no custom block textures found under your project's RP folder yet. upload pngs there and reload beacon to see them here.";
    $("#block-panel").appendChild(hint);
  }
}

function makeSwatch(block, isAir) {
  const el = document.createElement("div");
  el.className = "block-swatch";
  el.title = block.displayName || block.identifier;
  if (isAir) {
    el.innerHTML = `<div class="fallback-color" style="background:#111;border:1px dashed #444;"></div>`;
  } else if (block.textureUrl) {
    el.innerHTML = `<img src="${block.textureUrl}" alt="">`;
  } else {
    el.innerHTML = `<div class="fallback-color" style="background:#3a3a3e;"></div>`;
  }
  el.onclick = () => {
    document.querySelectorAll(".block-swatch.selected").forEach(s => s.classList.remove("selected"));
    el.classList.add("selected");
    scene.setSelectedBlock({ name: block.identifier, states: {}, version: 18163713 });
  };
  if (isAir) el.classList.add("selected");
  return el;
}

// ---------------- model mode ----------------
async function bootModelMode() {
  $("#side-panel").innerHTML = document.getElementById("cube-panel-template").innerHTML;
  model = new BeaconModel(canvas);
  model.onChange = markDirty;
  model.onSelectionChange = renderInspector;

  if (window.BeaconProject.currentFile) {
    setStatus("loading model...");
    const bytes = await window.BeaconProject.fetchCurrentFileBytes();
    const text = new TextDecoder().decode(bytes);
    model.load(JSON.parse(text));
    setStatus(`${model.cubes.length} cube(s) — loaded`);
  } else {
    model.createEmpty("geometry.custom");
    setStatus("new model — unsaved");
    markDirty();
  }

  renderCubeList();
  $("#add-cube-btn").onclick = () => { model.addCube(); renderCubeList(); };

  $("#save-btn").onclick = async () => {
    try {
      setStatus("saving...");
      const json = JSON.stringify(model.exportData(), null, 2);
      const bytes = new TextEncoder().encode(json);
      await window.BeaconProject.saveBytes(bytes.buffer, "untitled.geo.json");
      dirty = false;
      $("#save-btn").disabled = true;
      setStatus("saved!");
    } catch (e) { setStatus("save failed: " + e.message); }
  };
}

function renderCubeList() {
  const list = $("#cube-list");
  if (!list) return;
  list.innerHTML = "";
  model.cubes.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "cube-row" + (i === model.selectedIndex ? " selected" : "");
    row.innerHTML = `<span class="cube-row-name">${escHtml(c.name)}</span><button title="delete">del</button>`;
    row.querySelector("span").onclick = () => { model.select(i); renderCubeList(); };
    row.querySelector("button").onclick = e => { e.stopPropagation(); model.removeCube(i); renderCubeList(); };
    list.appendChild(row);
  });
}

function renderInspector(index, cube) {
  const insp = $("#inspector");
  if (!cube) { insp.innerHTML = `<div class="insp-empty">select a cube to edit it.</div>`; return; }

  const vec3Field = (label, key) => `
    <div class="insp-field"><label>${label}</label>
      <div class="insp-row3">
        ${["x", "y", "z"].map((ax, i) => `<input type="number" data-key="${key}" data-axis="${i}" value="${cube[key][i]}">`).join("")}
      </div>
    </div>`;

  insp.innerHTML = `
    <div class="panel-section">
      <div class="panel-label">Cube</div>
      <div class="insp-field"><label>Name</label><input type="text" id="cube-name" value="${escHtml(cube.name)}"></div>
      ${vec3Field("Origin (corner, 1/16 blocks)", "origin")}
      ${vec3Field("Size", "size")}
      ${vec3Field("Pivot", "pivot")}
      ${vec3Field("Rotation (deg)", "rotation")}
    </div>`;

  $("#cube-name").oninput = e => { model.updateSelected("name", e.target.value); renderCubeList(); };
  insp.querySelectorAll("input[data-key]").forEach(input => {
    input.oninput = () => {
      const key = input.dataset.key, axis = +input.dataset.axis;
      const arr = [...model.cubes[model.selectedIndex][key]];
      arr[axis] = parseFloat(input.value) || 0;
      model.updateSelected(key, arr);
    };
  });
}

// mode switch (only meaningful when opening beacon with no file yet)
$("#tab-structure").onclick = () => { if (!window.BeaconProject.fileId) location.search = replaceParam("mode", "structure"); };
$("#tab-model").onclick = () => { if (!window.BeaconProject.fileId) location.search = replaceParam("mode", "model"); };
function replaceParam(k, v) { const p = new URLSearchParams(location.search); p.set(k, v); return "?" + p.toString(); }

window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

boot();
