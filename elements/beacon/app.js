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
let currentTool = null; // { identifier, displayName } | null, structure mode only

const AIR_TOOL = "minecraft:air";

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
  buildMenuBar();
  bindShortcuts();
}

function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// ---------------- structure mode ----------------
async function bootStructureMode() {
  buildBlockPalette();
  scene = new BeaconScene(canvas);
  scene.setEditable(window.BeaconProject.canEdit);
  scene.onChange = markDirty;
  scene.onInspect = renderBlockInspector;
  scene.onHover = updateHintHover;

  let bytes = null;
  if (window.BeaconProject.currentFile) {
    setStatus("loading structure...");
    bytes = await window.BeaconProject.fetchCurrentFileBytes();
  }
  if (bytes) {
    const data = window.BeaconNbt.decodeStructure(bytes);
    scene.load(data, customBlocks);
    setStatus(`${data.size[0]}x${data.size[1]}x${data.size[2]} — loaded`);
  } else {
    scene.createEmpty(8, 8, 8, customBlocks);
    setStatus(window.BeaconProject.currentFile ? "empty file — new structure (8x8x8)" : "new structure (8x8x8) — unsaved");
    markDirty();
  }

  updateHintHover(null, null);
  $("#save-btn").onclick = () => saveStructure();
}

async function saveStructure() {
  try {
    setStatus("saving...");
    const exported = scene.exportData();
    const bytes = window.BeaconNbt.encodeStructure(exported);
    await window.BeaconProject.saveBytes(bytes, "untitled.mcstructure");
    dirty = false;
    $("#save-btn").disabled = true;
    setStatus("saved!");
  } catch (e) { setStatus("save failed: " + e.message); }
}

function exportStructureFile() {
  const exported = scene.exportData();
  const bytes = window.BeaconNbt.encodeStructure(exported);
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (window.BeaconProject.currentFile?.name || "structure").replace(/\.mcstructure$/i, "") + ".mcstructure";
  a.click();
  URL.revokeObjectURL(url);
}

function buildBlockPalette() {
  const grid = $("#block-grid");
  grid.innerHTML = "";

  grid.appendChild(makeSwatch({ identifier: AIR_TOOL, displayName: "eraser" }, "eraser"));
  customBlocks.forEach(b => grid.appendChild(makeSwatch(b, "block")));

  if (customBlocks.length === 0) {
    const hint = document.createElement("div");
    hint.className = "block-name-hint";
    hint.textContent = "no custom block textures found under your project's RP folder yet. upload pngs there and reload beacon to see them here.";
    $("#block-panel").appendChild(hint);
  }
  renderBlockInspector([], []);
}

function makeSwatch(block, kind) {
  const el = document.createElement("div");
  el.className = "block-swatch";
  el.title = block.displayName || block.identifier;
  if (kind === "eraser") {
    el.innerHTML = `<div class="fallback-color" style="background:#111;border:1px dashed #444; display:flex; align-items:center; justify-content:center; font-size:16px; color:#666;">×</div>`;
  } else if (block.textureUrl) {
    el.innerHTML = `<img src="${block.textureUrl}" alt="" onerror="this.src='https://mcbcode.com/img/undefined.png';">`;
  } else {
    el.innerHTML = `<div class="fallback-color" style="background:#3a3a3e;"></div>`;
  }
  el.onclick = () => selectSwatch(el, block);
  return el;
}

function selectSwatch(el, block) {
  document.querySelectorAll(".block-swatch.selected").forEach(s => s.classList.remove("selected"));
  el.classList.add("selected");
  scene.setSelectedBlock({ name: block.identifier, states: {}, version: 18163713 });
  currentTool = block;
  updateHintHover(null, null);
}

function cyclePalette(dir) {
  const swatches = [...document.querySelectorAll(".block-swatch")];
  if (!swatches.length) return;
  const cur = swatches.findIndex(s => s.classList.contains("selected"));
  const next = ((cur < 0 ? 0 : cur) + dir + swatches.length) % swatches.length;
  swatches[next].click();
}

function selectPaletteByIndex(n) {
  const swatches = [...document.querySelectorAll(".block-swatch")];
  if (swatches[n]) swatches[n].click();
}
function selectEraser() {
  const swatches = [...document.querySelectorAll(".block-swatch")];
  if (swatches[0]) swatches[0].click();
}
function deselectTool() {
  document.querySelectorAll(".block-swatch.selected").forEach(s => s.classList.remove("selected"));
  if (scene) scene.setSelectedBlock(null);
  currentTool = null;
  updateHintHover(null, null);
}

// ---------------- viewport hint (tool + hover) ----------------

function baseHintText() {
  if (!currentTool) return "no tool: click a block to select it, drag the arrows to move it. shift-click to multi-select. right-click always selects.";
  if (currentTool.identifier === AIR_TOOL) return "eraser tool: click a block to erase it. right-click a block to select it instead.";
  return `placing: ${currentTool.displayName || currentTool.identifier} — click a face to place. right-click a block to select it instead.`;
}

let lastHover = null;
function updateHintHover(pos, entry) {
  lastHover = (pos && entry) ? entry : null;
  const el = document.querySelector(".viewport-hint");
  if (!el) return;
  let text = baseHintText();
  if (lastHover && lastHover.name !== "minecraft:air") text += ` | hovering: ${lastHover.name}`;
  el.textContent = text;
}

// renderBlockInspector(positions, entries) — arrays, may be empty (none selected),
// length 1 (single block), or length N (multi-selection)
function renderBlockInspector(positions, entries) {
  const insp = $("#inspector");
  if (!positions || positions.length === 0) {
    insp.innerHTML = `<div class="insp-empty">click a block to select it.<br><br>shift-click or right-click to select more than one. pick a block (or the eraser) from the left panel to place/erase instead.</div>`;
    return;
  }

  if (positions.length === 1) {
    const pos = positions[0], entry = entries[0];
    const statesHtml = Object.keys(entry.states || {}).length
      ? Object.entries(entry.states).map(([k, v]) => `<div class="state-chip"><span>${escHtml(k)}</span><span>${escHtml(String(v))}</span></div>`).join("")
      : `<div class="state-chip"><span>no states</span></div>`;
    insp.innerHTML = `
      <div class="panel-section">
        <div class="panel-label">Selected Block</div>
        <div class="insp-field"><label>Block ID</label><input type="text" id="block-id-input" value="${escHtml(entry.name)}"></div>
        <div class="meta-value" style="margin-bottom:10px; color:#555;">position: ${pos.join(", ")}</div>
        <div class="panel-label">States</div>
        ${statesHtml}
        <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
          <button class="sm-btn" id="remove-block-btn" style="color:#ff5555;">Remove this block</button>
        </div>
      </div>`;
    $("#block-id-input").onchange = e => scene.setBlockIdentifier(pos, e.target.value);
    $("#remove-block-btn").onclick = () => scene.removeAt(pos);
    return;
  }

  insp.innerHTML = `
    <div class="panel-section">
      <div class="panel-label">Selected Blocks</div>
      <div class="meta-value" style="margin-bottom:10px;">${positions.length} blocks selected</div>
      <div class="meta-value" style="margin-bottom:10px; color:#555;">drag the colored arrows in the viewport to move all of them together, or use the arrow keys.</div>
      <div style="margin-top:4px; display:flex; flex-direction:column; gap:6px;">
        <button class="sm-btn" id="replace-selection-btn">Replace all with active tool</button>
        <button class="sm-btn" id="remove-selection-btn" style="color:#ff5555;">Remove all selected</button>
      </div>
    </div>`;
  $("#replace-selection-btn").onclick = () => scene.replaceSelectionWithTool();
  $("#remove-selection-btn").onclick = () => scene.deleteSelection();
}

// ---------------- model mode ----------------
async function bootModelMode() {
  $("#side-panel").innerHTML = document.getElementById("cube-panel-template").innerHTML;
  model = new BeaconModel(canvas);
  model.onChange = markDirty;
  model.onSelectionChange = renderInspector;

  let bytes = null;
  if (window.BeaconProject.currentFile) {
    setStatus("loading model...");
    bytes = await window.BeaconProject.fetchCurrentFileBytes();
  }
  if (bytes) {
    const text = new TextDecoder().decode(bytes);
    model.load(JSON.parse(text));
    setStatus(`${model.cubes.length} cube(s) — loaded`);
  } else {
    model.createEmpty("geometry.custom");
    setStatus(window.BeaconProject.currentFile ? "empty file — new model" : "new model — unsaved");
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
    row.innerHTML = `<span class="cube-row-name">${escHtml(c.name)}</span><button title="delete this cube" style="color:#ff5555;">✕ delete</button>`;
    row.querySelector("span").onclick = () => { model.select(i); renderCubeList(); };
    row.querySelector("button").onclick = e => { e.preventDefault(); e.stopPropagation(); model.removeCube(i); renderCubeList(); };
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

// ---------------- menu bar (File / Edit / View / Tools / Extensions) ----------------

function buildMenuBar() {
  const bar = document.createElement("div");
  bar.className = "menu-bar";

  const fileItems = [
    { label: "Save", action: () => (mode === "structure" ? saveStructure() : $("#save-btn").click()) },
    { label: "Export .mcstructure", action: () => (mode === "structure" ? exportStructureFile() : alert("export is only available in structure mode.")) }
  ];

  const editItems = mode === "structure" ? [
    { label: "Undo (Ctrl+Z)", action: () => scene.undo() },
    { label: "Redo (Ctrl+Y)", action: () => scene.redo() },
    { label: "Select all blocks (Ctrl+A)", action: () => scene.selectAll() },
    { label: "Clear selection (Esc)", action: () => scene.clearSelection() },
    { label: "Delete selection (Del)", action: () => scene.deleteSelection() }
  ] : [
    { label: "Add cube", action: () => { model.addCube(); renderCubeList(); } }
  ];

  const viewItems = mode === "structure" ? [
    { label: "Toggle grid (G)", action: () => scene.toggleGrid() },
    { label: "Toggle border outline (B)", action: () => scene.toggleBorder() },
    { label: "Frame selection (F)", action: () => scene.frameSelection() },
    { label: "Reset camera (R)", action: () => scene.resetCamera() }
  ] : [];

  const toolsItems = mode === "structure" ? [
    { label: "Resize structure...", action: () => openResizeModal() },
    { label: "Show keyboard shortcuts (?)", action: () => showShortcutsOverlay() }
  ] : [
    { label: "Show keyboard shortcuts (?)", action: () => showShortcutsOverlay() }
  ];

  bar.appendChild(makeMenu("File", fileItems));
  bar.appendChild(makeMenu("Edit", editItems));
  bar.appendChild(makeMenu("View", viewItems));
  bar.appendChild(makeMenu("Tools", toolsItems));
  bar.appendChild(makeMenu("Extensions", [{ label: "Coming soon", action: null, disabled: true }]));

  const tabs = $(".mode-tabs");
  tabs.parentElement.insertBefore(bar, tabs);
}

function makeMenu(label, items) {
  const wrap = document.createElement("div");
  wrap.className = "menu-item";
  const btn = document.createElement("button");
  btn.className = "menu-btn";
  btn.textContent = label;
  const dropdown = document.createElement("div");
  dropdown.className = "menu-dropdown";
  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "menu-dropdown-item" + (item.disabled ? " disabled" : "");
    row.textContent = item.label;
    if (!item.disabled) row.onclick = () => { closeAllMenus(); item.action(); };
    dropdown.appendChild(row);
  });
  btn.onclick = e => {
    e.stopPropagation();
    const wasOpen = wrap.classList.contains("open");
    closeAllMenus();
    if (!wasOpen) wrap.classList.add("open");
  };
  wrap.appendChild(btn);
  wrap.appendChild(dropdown);
  return wrap;
}

function closeAllMenus() {
  document.querySelectorAll(".menu-item.open").forEach(m => m.classList.remove("open"));
}
document.addEventListener("click", closeAllMenus);

// ---------------- resize modal (custom, not a system prompt) ----------------

function openResizeModal() {
  closeModal();
  const [sx, sy, sz] = scene.size;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "resize-modal";
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="panel-label">Resize Structure</div>
      <div class="meta-value" style="margin-bottom:12px; color:#888;">growing keeps the (0,0,0) corner fixed. shrinking crops from the far corner — blocks past the new edge are lost.</div>
      <div class="insp-row3" style="margin-bottom:16px;">
        <div class="insp-field"><label>X</label><input type="number" id="resize-x" min="1" value="${sx}"></div>
        <div class="insp-field"><label>Y</label><input type="number" id="resize-y" min="1" value="${sy}"></div>
        <div class="insp-field"><label>Z</label><input type="number" id="resize-z" min="1" value="${sz}"></div>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="sm-btn" id="resize-cancel">Cancel</button>
        <button class="primary-btn" id="resize-apply">Apply</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = e => { if (e.target === overlay) closeModal(); };
  $("#resize-cancel").onclick = closeModal;
  $("#resize-apply").onclick = () => {
    const nx = +$("#resize-x").value, ny = +$("#resize-y").value, nz = +$("#resize-z").value;
    if (![nx, ny, nz].every(n => Number.isFinite(n) && n >= 1)) { alert("each dimension must be 1 or greater."); return; }
    scene.resizeStructure([nx, ny, nz]);
    setStatus(`resized to ${nx}x${ny}x${nz}`);
    closeModal();
  };
}

function closeModal() {
  document.getElementById("resize-modal")?.remove();
}

function showShortcutsOverlay() {
  let el = document.getElementById("shortcuts-overlay");
  if (el) { el.remove(); return; }
  el = document.createElement("div");
  el.id = "shortcuts-overlay";
  el.className = "shortcuts-overlay";
  el.innerHTML = `<div class="shortcuts-box">
    <div class="panel-label">Keyboard Shortcuts</div>
    ${SHORTCUTS.map(([k, d]) => `<div class="shortcut-row"><span class="shortcut-key">${escHtml(k)}</span><span>${escHtml(d)}</span></div>`).join("")}
    <div style="margin-top:10px; text-align:center; color:#555;">press ? again to close</div>
  </div>`;
  el.onclick = () => el.remove();
  document.body.appendChild(el);
}

// ---------------- keyboard shortcuts ----------------

const SHORTCUTS = [
  ["Ctrl/Cmd+Z", "undo"],
  ["Ctrl/Cmd+Y or Ctrl+Shift+Z", "redo"],
  ["Delete / Backspace", "delete selected block(s)"],
  ["Escape", "clear selection"],
  ["1-9", "pick block 1-9 from the palette"],
  ["0 or E", "pick the eraser tool"],
  ["Q", "deselect tool (back to click-to-select mode)"],
  ["Tab", "cycle to next palette swatch"],
  ["Shift+Tab", "cycle to previous palette swatch"],
  ["Ctrl/Cmd+S", "save"],
  ["Ctrl/Cmd+E", "export .mcstructure"],
  ["Ctrl/Cmd+A", "select all blocks"],
  ["Ctrl/Cmd+D", "clear selection"],
  ["Arrow keys", "nudge selection on the X/Z axis"],
  ["Shift+Up/Down", "nudge selection up/down (Y axis)"],
  ["G", "toggle grid visibility"],
  ["B", "toggle structure border outline"],
  ["F", "frame camera on selection"],
  ["R", "reset camera"],
  ["= or +", "grow structure by 1 block each axis"],
  ["-", "shrink structure by 1 block each axis"],
  ["H", "toggle left panel (mobile)"],
  ["I", "toggle right panel (mobile)"],
  ["Click block", "select it (only when no tool is active)"],
  ["Right-click block", "always selects it, even with a tool active"],
  ["Shift+Click / Shift+Right-click", "add/remove block from multi-selection"],
  ["Ctrl/Cmd+Click block", "quick-erase, no tool needed"],
  ["Click empty space", "deselect"],
  ["Drag colored arrows", "move the current selection"],
  ["?", "show/hide this list"],
];

function bindShortcuts() {
  window.addEventListener("keydown", e => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (document.getElementById("resize-modal")) return; // don't fire shortcuts while modal is open

    if (e.key === "?") { e.preventDefault(); showShortcutsOverlay(); return; }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); (mode === "structure" ? saveStructure() : $("#save-btn").click()); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") { e.preventDefault(); if (mode === "structure") exportStructureFile(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") { e.preventDefault(); if (mode === "structure") scene.selectAll(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); if (mode === "structure") scene.clearSelection(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); if (mode === "structure") scene.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); if (mode === "structure") scene.redo(); return; }

    if (mode !== "structure") return; // rest of the shortcuts are structure-mode only

    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); scene.deleteSelection(); return; }
    if (e.key === "Escape") { scene.clearSelection(); return; }
    if (e.key === "Tab") { e.preventDefault(); cyclePalette(e.shiftKey ? -1 : 1); return; }
    if (e.key >= "1" && e.key <= "9") { selectPaletteByIndex(+e.key); return; }
    if (e.key === "0" || e.key.toLowerCase() === "e") { selectEraser(); return; }
    if (e.key.toLowerCase() === "q") { deselectTool(); return; }
    if (e.key.toLowerCase() === "g") { scene.toggleGrid(); return; }
    if (e.key.toLowerCase() === "b") { scene.toggleBorder(); return; }
    if (e.key.toLowerCase() === "f") { scene.frameSelection(); return; }
    if (e.key.toLowerCase() === "r") { scene.resetCamera(); return; }
    if (e.key === "=" || e.key === "+") { e.preventDefault(); growShrink(1); return; }
    if (e.key === "-") { growShrink(-1); return; }
    if (e.key.toLowerCase() === "h") { $("#side-panel").classList.toggle("open"); return; }
    if (e.key.toLowerCase() === "i") { $("#inspector").classList.toggle("open"); return; }

    if (e.key === "ArrowUp") { e.preventDefault(); scene.moveSelection(0, e.shiftKey ? 1 : 0, e.shiftKey ? 0 : -1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); scene.moveSelection(0, e.shiftKey ? -1 : 0, e.shiftKey ? 0 : 1); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); scene.moveSelection(-1, 0, 0); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); scene.moveSelection(1, 0, 0); return; }
  });
}

function growShrink(delta) {
  const [sx, sy, sz] = scene.size;
  scene.resizeStructure([sx + delta, sy + delta, sz + delta]);
  setStatus(`resized to ${scene.size.join("x")}`);
}

boot();
