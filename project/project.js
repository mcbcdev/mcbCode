    // ---- restore real url after 404.html spa redirect ----
    // this MUST run before shareCode/path parsing below
    (function restoreSpaPath() {
      const saved = sessionStorage.getItem("spa-redirect");
      if (saved) {
        sessionStorage.removeItem("spa-redirect");
        history.replaceState(null, "", saved);
      }
    })();

    const AUTH = "https://auth.mcbcode.com";
    let shareCode = location.pathname.split("/").filter(Boolean)[1] || "";
    const urlBase = location.pathname.split("/").filter(Boolean)[0] || "project"; // "project" or "s"

    let project         = null;
    let allFiles        = [];
    let isOwner         = false;
    let isCollab        = false;
    let currentPath     = [];
    let pendingDelId    = null;
    let pendingDelIsCritical = false;
    let newFileType     = "folder";
    let newFileParentId = null;
    let exportFileData  = null;
    let collabAcDebounce = null;
    let pendingRenameId   = null;
    let pendingRenameType = null;
    let currentTags       = [];
    let pendingDangerAction = null;
    let openImagePreview = null;

    // filenames that get an extra "are you sure" nudge before deleting, since
    // beginners often don't realize these are load-bearing for the pack
    const CRITICAL_FILENAMES = ["manifest.json", "pack_icon.png"];

    function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
    function fmtDate(s) {
      if (!s) return "—";
      const d = new Date(s.endsWith("Z") ? s : s + "Z");
      return d.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" });
    }
    // full local date + time, used as a hover tooltip / exact-time fallback
    function fmtDateTime(s) {
      if (!s) return "—";
      const d = new Date(s.endsWith("Z") ? s : s + "Z");
      return d.toLocaleString(undefined, { month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit" });
    }
    // relative "x minutes/hours/days/weeks/months/years ago" — this is what
    // gets shown in the UI; fmtDateTime is kept as the title="" tooltip
    function timeAgo(s) {
      if (!s) return "—";
      const d = new Date(s.endsWith("Z") ? s : s + "Z");
      const secs = Math.round((Date.now() - d.getTime()) / 1000);
      if (secs < 5) return "just now";
      const units = [
        ["year",   31536000],
        ["month",  2592000],
        ["week",   604800],
        ["day",    86400],
        ["hour",   3600],
        ["minute", 60],
      ];
      for (const [label, secsPer] of units) {
        const n = Math.floor(secs / secsPer);
        if (n >= 1) return `${n} ${label}${n > 1 ? "s" : ""} ago`;
      }
      return `${secs} second${secs === 1 ? "" : "s"} ago`;
    }
    // newest updated_at among all files nested under a given folder id
    // (recursive; used so folders show the most recent activity inside them)
    function newestUpdateInFolder(folderId) {
      let newest = null;
      const stack = [folderId];
      while (stack.length) {
        const pid = stack.pop();
        for (const f of allFiles) {
          if (String(f.parent_id) !== String(pid)) continue;
          if (f.type === "folder") { stack.push(f.id); continue; }
          if (f.updated_at && (!newest || f.updated_at > newest)) newest = f.updated_at;
        }
      }
      return newest;
    }
    function editorUrl(file) {
      const n = file.name.toLowerCase();
    
      if (n === "manifest.json")     return `/editor/manifest?save=${file.save_id}`;
      if (n.endsWith(".mcfunction")) return `/editor/mcfunction?save=${file.save_id}`;
      if (n.endsWith(".js"))         return `/editor/javascript?save=${file.save_id}`;

      return `/editor/json?save=${file.save_id}`;
    }

    function isPng(f) {
      return typeof f.name === "string" && f.name.toLowerCase().endsWith(".png");
    }

    function isBeaconFile(f) {
      if (typeof f.name !== "string") return false;
      const n = f.name.toLowerCase();
      return n.endsWith(".mcstructure") || n.endsWith(".geo.json");
    }
    function beaconModeFor(f) {
      return f.name.toLowerCase().endsWith(".mcstructure") ? "structure" : "model";
    }
    
    // ---- URL <-> folder path helpers ----
    function buildPathUrl(pathArr) {
      const base = `/project/${shareCode}`;
      if (!pathArr.length) return base;
      return base + "/" + pathArr.map(c => encodeURIComponent(c.name)).join("/");
    }

    // pushes a NEW history entry (use for user-initiated navigation: clicks)
    function pushPath(pathArr) {
      const url = buildPathUrl(pathArr);
      if (location.pathname !== url) history.pushState({ path: pathArr.map(c => c.name) }, "", url);
    }

    // resolves a list of folder-name segments (from the url) into real folder
    // objects using allFiles, following parent_id chain from root. stops at
    // the first segment that doesn't match (handles bad/stale urls gracefully).
    function resolveFolderNames(names) {
      let parentId = null;
      const resolved = [];
      for (const name of names) {
        const parentKey = parentId === null ? null : String(parentId);
        const folder = allFiles.find(f =>
          f.type === "folder" &&
          (f.parent_id === null ? null : String(f.parent_id)) === parentKey &&
          f.name === name
          );
        if (!folder) break;
        resolved.push({ id: folder.id, name: folder.name });
        parentId = folder.id;
        }
     return resolved;
    }

    function getFolderNamesFromLocation() {
      const parts = location.pathname.split("/").filter(Boolean); // ["project", code, ...folders]
      return parts.slice(2).map(p => decodeURIComponent(p));
    }

    // used once on page load: resolves currentPath from the url, then
    // normalizes the url via replaceState in case some segments didn't match
    function resolveInitialPath() {
      const names = getFolderNamesFromLocation();
      currentPath = resolveFolderNames(names);
      const normalizedUrl = buildPathUrl(currentPath);
      if (location.pathname !== normalizedUrl) {
        history.replaceState({ path: currentPath.map(c => c.name) }, "", normalizedUrl);
      }
    }

    // ---- GUARDRAILS (beginner-friendly file placement rules) ----
    // loaded from /project/guardrails.json; this default is used as a
    // fallback if that file can't be reached, so the guardrail system
    // still works even if the config request fails.
    const DEFAULT_GUARDRAILS = {
      "manifest.json": ["/BP/", "/RP/"]
    };
    let guardrails = DEFAULT_GUARDRAILS;

    async function loadGuardrails() {
      try {
        const r = await fetch("/project/guardrails.json");
        if (r.ok) guardrails = await r.json();
      } catch { /* fall back to defaults */ }
    }

    // turns a glob-style pattern (supports * and **) into a RegExp
    function globToRegex(pattern) {
      let re = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      re = re.replace(/\*\*/g, "§§DBL§§");
      re = re.replace(/\*/g, "[^/]*");
      re = re.replace(/§§DBL§§/g, ".*");
      return new RegExp("^" + re + "$");
    }

    function normFolder(p) { return (p.endsWith("/") ? p : p + "/"); }

    // returns { ok: true } or { ok: false, message } for creating `fileName`
    // inside folder path `folderSegments` (array of folder name strings)
    function checkGuardrail(fileName, folderSegments) {
      const folderPath = "/" + folderSegments.join("/") + (folderSegments.length ? "/" : "");
      const rules = guardrails || {};

      // 1. exact filename rule takes priority over extension rules
      const exactKey = Object.keys(rules).find(k => !k.startsWith(".") && k.toLowerCase() === fileName.toLowerCase());
      if (exactKey) {
        const patterns = rules[exactKey];
        const ok = patterns.some(p => globToRegex(normFolder(p)).test(folderPath));
        if (!ok) {
          return { ok: false, message: `${exactKey} can only exist in one of these locations: ${patterns.join(", ")}` };
        }
        return { ok: true };
      }

      // 2. extension rule
      const dot = fileName.lastIndexOf(".");
      const ext = dot === -1 ? "" : fileName.slice(dot).toLowerCase();
      const extKey = Object.keys(rules).find(k => k.startsWith(".") && k.toLowerCase() === ext);
      if (extKey) {
        const patterns = rules[extKey];
        const fullPath = folderPath + fileName;
        const ok = patterns.some(p => globToRegex(p).test(fullPath));
        if (!ok) {
          return { ok: false, message: `${extKey} files belong inside one of these folders: ${patterns.map(p => p.replace(/\*+$/, "")).join(", ")}` };
        }
        return { ok: true };
      }

      // no matching rule defined — allow it
      return { ok: true };
    }

    // ---- INIT ----
    (async () => {
      // /s/{slug} pretty share links resolve to the real project share_code first
      if (urlBase === "s" && shareCode) {
        try {
          const r = await fetch(`${AUTH}/project/resolve-slug?slug=${encodeURIComponent(shareCode)}`);
          if (r.ok) { const d = await r.json(); shareCode = d.share_code; }
          else return showErr("that share link doesn't exist.");
        } catch { return showErr("failed to resolve share link."); }
      }
      if (!shareCode) return showErr("No project ID in URL.");
      loadGuardrails();
      loadQtools();
      try {
        const r = await fetch(`${AUTH}/me`, { credentials: "include" });
        if (r.ok) {
          const d = await r.json();
          document.getElementById("nav-user").textContent = d.email;
          window._myId = d.id;
          window._isObsidian = d.is_obsidian || false;
          try {
            const sres = await fetch(`${AUTH}/settings`, { credentials: "include" });
            if (sres.ok) { const sd = await sres.json(); window._editorMode = sd.settings.editor_mode || "inline"; }
          } catch {}
        }
      } catch {}
      if (!window._editorMode) window._editorMode = "inline"; // default, also covers logged-out viewers
      try {
        const r = await fetch(`${AUTH}/project?code=${encodeURIComponent(shareCode)}`, { credentials: "include" });
        if (!r.ok) { const d = await r.json(); return showErr(d.error || "Not found."); }
        const d = await r.json();
        project  = d.project;
        allFiles = d.files || [];
        isOwner  = window._myId && project.owner_id === window._myId;
        isCollab = !!d.is_collaborator;
        resolveInitialPath();
        render();
      } catch { showErr("Failed to load project."); }
    })();

    // ---- back/forward support ----
    window.addEventListener("popstate", () => {
      if (!allFiles.length && !project) return; // nothing loaded yet, nothing to do
      const names = getFolderNamesFromLocation();
      currentPath = resolveFolderNames(names);
      renderFileList();
    });

    function showErr(msg) {
      document.getElementById("file-list").innerHTML = `<div class="err-msg">${esc(msg)}</div>`;
      document.getElementById("proj-title").textContent = "Error";
    }

    function render() {
      document.title = `mcbCode | ${project.name}`;
      document.getElementById("proj-title").textContent = project.name;
      document.getElementById("bc-project").textContent = project.name;
      const isPublic = project.is_public === 1 || project.is_public === true;
      const badge = document.getElementById("proj-badge");
      badge.textContent = isPublic ? "public" : "private";
      badge.classList.toggle("public", isPublic);
      document.getElementById("m-desc").textContent    = project.description || "No description.";
      renderContributors();
      document.getElementById("m-updated").textContent = timeAgo(project.updated_at);
      document.getElementById("m-updated").title = fmtDateTime(project.updated_at);
      document.getElementById("m-code").textContent    = project.share_code;
      updateStats();

      const canEditNow = isOwner || isCollab;
      if (canEditNow) document.getElementById("owner-toolbar").style.display = "flex";
      if (isOwner) {
        document.getElementById("tab-settings-btn").style.display = "";
        document.getElementById("set-name").value = project.name;
        document.getElementById("set-desc").value = project.description || "";
        currentTags = Array.isArray(project.tags) ? project.tags.slice(0, 10) : [];
        renderTags();
        loadCollaborators();
        initObsidianFeatures();
      }

      const pngInput = document.getElementById("png-upload-input");
      if (pngInput) pngInput.addEventListener("change", handlePngUpload);
      const mcsInput = document.getElementById("mcstructure-upload-input");
      if (mcsInput) mcsInput.addEventListener("change", handleMcstructureUpload);

      // collab autocomplete
      const ci = document.getElementById("collab-input");
      ci.addEventListener("input", () => {
        clearTimeout(collabAcDebounce);
        const q = ci.value.trim();
        if (!q) { closeCollabAc(); return; }
        collabAcDebounce = setTimeout(() => fetchCollabAc(q), 180);
      });
      ci.addEventListener("keydown", e => { if (e.key === "Enter") addCollab(); if (e.key === "Escape") closeCollabAc(); });
      document.addEventListener("click", e => { if (!e.target.closest(".collab-input-wrap")) closeCollabAc(); });

      renderFileList();
    }

function renderContributors() {
  const ownerName = project.owner_username || (isOwner ? "you" : `#${project.owner_id}`);

  document.getElementById("m-owner").innerHTML =
    `[<a href="https://mcbcode.com/profile?u=${encodeURIComponent(ownerName)}">${ownerName}</a>]`;

  const collabs = project.collaborator_usernames || [];

  const collabHTML = collabs
    .map(username =>
      `<a href="https://mcbcode.com/profile?u=${encodeURIComponent(username)}">${username}</a>`
    )
    .join(", ");

  document.getElementById("m-collaborators").innerHTML =
    collabs.length ? `, ${collabHTML}` : "";
}

    async function copyProjectLink() {
      const url = `https://mcbcode.com/project/${project.share_code}/`;
      const el = document.getElementById("m-code");
      try {
        await navigator.clipboard.writeText(url);
        const original = el.textContent;
        el.textContent = "copied!";
        setTimeout(() => { el.textContent = original; }, 1200);
      } catch { alert(url); }
    }

    function updateStats() {
      document.getElementById("s-files").textContent   = allFiles.filter(f => f.type === "file").length;
      document.getElementById("s-folders").textContent = allFiles.filter(f => f.type === "folder").length;
    }

    // ---- FILE LIST ----
    function currentFolderId() { return currentPath.length ? currentPath[currentPath.length - 1].id : null; }
    function isAtRoot() { return currentPath.length === 0; }
    const canEdit = () => isOwner || isCollab;
    const isLoggedIn = () => !!window._myId;

function renderToolbar() {
  const toolbar = document.querySelector(".proj-header-actions");
  toolbar.innerHTML = "";

  if (canEdit()) {
    // "+ Add Files" dropdown: Folder / File / Image / Structure
    const addWrap = document.createElement("div");
    addWrap.className = "share-wrap";
    const addBtn = document.createElement("button");
    addBtn.className = "sm-btn";
    addBtn.textContent = "+ Add Files";
    addBtn.onclick = e => { e.stopPropagation(); toggleAddFilesMenu(); };

    const addMenu = document.createElement("div");
    addMenu.className = "share-menu";
    addMenu.id = "add-files-menu";

    const items = [
      { label: "+ Folder", action: () => openNewFile("folder"), needsSubfolder: false },
      { label: "+ File", action: () => openNewFile("file"), needsSubfolder: true },
      { label: "+ Image", action: () => document.getElementById("png-upload-input").click(), needsSubfolder: true },
      { label: "+ Structure", action: () => document.getElementById("mcstructure-upload-input").click(), needsSubfolder: true },
    ];
    items.forEach(item => {
      if (item.needsSubfolder && isAtRoot()) return; // same rule as before: files/images/structures need a folder
      const el = document.createElement("div");
      el.className = "share-menu-item";
      el.textContent = item.label;
      el.onclick = () => { closeAddFilesMenu(); item.action(); };
      addMenu.appendChild(el);
    });

    addWrap.appendChild(addBtn);
    addWrap.appendChild(addMenu);
    toolbar.appendChild(addWrap);

    // "+" create dropdown (block/entity/item) — unchanged, sits right after Add Files
    const createWrap = document.createElement("div");
    createWrap.className = "create-wrap";
    const cbtn = document.createElement("button");
    cbtn.className = "sm-btn create-btn";
    cbtn.title = "create a block, entity, or item";
    cbtn.innerHTML = `<img src="https://mcbcode.com/img/icons/dots.png" alt="create">`;
    cbtn.onclick = e => { e.stopPropagation(); toggleCreateMenu(); };
    const cmenu = document.createElement("div");
    cmenu.className = "create-menu";
    cmenu.id = "create-menu";
    cmenu.innerHTML = `
      <div class="create-menu-item" onclick="closeCreateMenu(); openCreator('block');">
        <img src="https://mcbcode.com/img/icons/block.png" alt="">
        <span>Create Block</span>
      </div>
      <div class="create-menu-item" onclick="closeCreateMenu(); openCreator('entity');">
        <img src="https://mcbcode.com/img/icons/entity.png" alt="">
        <span>Create Entity</span>
      </div>
      <div class="create-menu-item" onclick="closeCreateMenu(); openCreator('item');">
        <img src="https://mcbcode.com/img/icons/item.png" alt="">
        <span>Create Item</span>
      </div>
    `;
    createWrap.appendChild(cbtn);
    createWrap.appendChild(cmenu);
    toolbar.appendChild(createWrap);
  }

  // export button: visible to everyone, but greyed out / disabled if not logged in
  const bexport = document.createElement("button");
  bexport.id = "export-btn";
  bexport.className = "sm-btn export-highlight";
  bexport.textContent = "Export";
  if (isLoggedIn()) {
    bexport.onclick = startExport;
    bexport.title = "download this project as a .mcaddon or .mcpack";
  } else {
    bexport.disabled = true;
    bexport.title = "log in to export this project";
  }
  toolbar.appendChild(bexport);

  // share button + dropdown, right of Export
  const shareWrap = document.createElement("div");
  shareWrap.className = "share-wrap";
  const bshare = document.createElement("button");
  bshare.className = "sm-btn";
  bshare.textContent = "Share";
  bshare.title = "get a link to this project";
  bshare.onclick = e => { e.stopPropagation(); toggleShareMenu(); };
  const shareMenu = document.createElement("div");
  shareMenu.className = "share-menu";
  shareMenu.id = "share-menu";
  shareMenu.innerHTML = `
    <div class="share-menu-item" onclick="openSharePopup()">share link...</div>
    <div class="share-menu-item" onclick="copyProjectLink(); closeShareMenu();">copy link</div>
  `;
  shareWrap.appendChild(bshare);
  shareWrap.appendChild(shareMenu);
  toolbar.appendChild(shareWrap);
}

function toggleAddFilesMenu() {
  document.getElementById("add-files-menu")?.classList.toggle("open");
}
function closeAddFilesMenu() {
  document.getElementById("add-files-menu")?.classList.remove("open");
}
document.addEventListener("click", e => { if (!e.target.closest(".share-wrap")) closeAddFilesMenu(); });

function toggleAddFilesMenu() {
  document.getElementById("add-files-menu")?.classList.toggle("open");
}
function closeAddFilesMenu() {
  document.getElementById("add-files-menu")?.classList.remove("open");
}
document.addEventListener("click", e => { if (!e.target.closest(".share-wrap")) { closeAddFilesMenu(); } });

function toggleShareMenu() {
  document.getElementById("share-menu").classList.toggle("open");
}
function closeShareMenu() {
  document.getElementById("share-menu")?.classList.remove("open");
}
document.addEventListener("click", e => { if (!e.target.closest(".share-wrap")) closeShareMenu(); });

function openSharePopup() {
  closeShareMenu();
  document.getElementById("share-popup-link").value = `https://mcbcode.com/project/${project.share_code}/`;
  document.getElementById("share-popup-overlay").classList.add("open");
}
document.getElementById("share-popup-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal("share-popup-overlay"); });

// ---- CREATE dropdown (block/entity/item) ----
function toggleCreateMenu() {
  document.getElementById("create-menu")?.classList.toggle("open");
}
function closeCreateMenu() {
  document.getElementById("create-menu")?.classList.remove("open");
}
document.addEventListener("click", e => { if (!e.target.closest(".create-wrap")) closeCreateMenu(); });
// on mobile there's no real "hover", so tapping the dots button toggles it (handled by cbtn.onclick above already)

// ---- qtools.json (hover-help definitions for components) ----
let qtoolsData = {};
async function loadQtools() {
  try {
    const r = await fetch("https://mcbcode.com/elements/qtools.json");
    if (r.ok) qtoolsData = await r.json();
  } catch { /* tooltips just won't have custom text if this fails */ }
}
function qtoolsDef(componentId) {
  const d = qtoolsData && qtoolsData[componentId];
  if (d && typeof d === "object" && d.definition) return d.definition;
  if (typeof d === "string") return d;
  return "no definition available yet for this component.";
}

// ---- component lists (pulled from the block/item component docs) ----
const BLOCK_COMPONENT_CATEGORIES = {
  "Appearance": ["minecraft:display_name","minecraft:geometry","minecraft:item_visual","minecraft:embedded_visual","minecraft:material_instances","minecraft:map_color","minecraft:light_emission","minecraft:light_dampening","minecraft:transformation","minecraft:random_offset","minecraft:destruction_particles"],
  "Physics & Collision": ["minecraft:collision_box","minecraft:selection_box","minecraft:friction","minecraft:movable","minecraft:entity_fall_on","minecraft:support"],
  "Interaction": ["minecraft:crafting_table","minecraft:flower_pottable","minecraft:chest_obstruction","minecraft:leashable","minecraft:placement_filter","minecraft:connection_rule"],
  "Redstone": ["minecraft:redstone_conductivity","minecraft:redstone_consumer","minecraft:redstone_producer"],
  "Durability & Destruction": ["minecraft:destructible_by_explosion","minecraft:destructible_by_mining","minecraft:flammable"],
  "World Behavior": ["minecraft:liquid_detection","minecraft:precipitation_interactions","minecraft:replaceable","minecraft:tick"],
  "Misc": ["minecraft:loot","minecraft:tags"]
};

const ITEM_COMPONENT_CATEGORIES = {
  "Appearance": ["minecraft:display_name","minecraft:icon","minecraft:glint","minecraft:hand_equipped","minecraft:hover_text_color","minecraft:wearable","minecraft:dyeable"],
  "Usage & Interaction": ["minecraft:interact_button","minecraft:use_animation","minecraft:use_modifiers","minecraft:cooldown","minecraft:food","minecraft:fuel"],
  "Combat": ["minecraft:damage","minecraft:damage_absorption","minecraft:digger","minecraft:kinetic_weapon","minecraft:piercing_weapon","minecraft:shooter","minecraft:projectile","minecraft:swing_duration","minecraft:swing_sounds","minecraft:throwable"],
  "Durability & Repair": ["minecraft:durability","minecraft:durability_sensor","minecraft:repairable","minecraft:enchantable"],
  "Storage & Stacking": ["minecraft:max_stack_size","minecraft:stacked_by_data","minecraft:storage_item","minecraft:storage_weight_limit","minecraft:storage_weight_modifier","minecraft:bundle_interaction"],
  "Placement": ["minecraft:block_placer","minecraft:entity_placer","minecraft:can_destroy_in_creative","minecraft:compostable","minecraft:fire_resistant","minecraft:liquid_clipped"],
  "Misc": ["minecraft:allow_off_hand","minecraft:rarity","minecraft:record","minecraft:should_despawn","minecraft:tags"]
};

let creatorKind = null;

function openCreator(kind) {
  creatorKind = kind;
  const body = document.getElementById("creator-body");
  const title = document.getElementById("creator-title");
  const saveBtn = document.getElementById("creator-save-btn");

  if (kind === "entity") {
    title.textContent = "Create Entity";
    saveBtn.style.display = "none";
    body.innerHTML = `<div class="creator-soon">Coming Soon</div>`;
    document.getElementById("creator-overlay").classList.add("open");
    return;
  }

  saveBtn.style.display = "";
  title.textContent = kind === "block" ? "Create Block" : "Create Item";
  const categories = kind === "block" ? BLOCK_COMPONENT_CATEGORIES : ITEM_COMPONENT_CATEGORIES;
  const textureFolder = kind === "block" ? "blocks" : "items";

  let html = `
    <div class="set-field">
      <label>Name</label>
      <textarea id="creator-name" rows="1" maxlength="72" placeholder="e.g. Ruby Block"></textarea>
    </div>
    <div class="set-field">
      <label>Identifier</label>
      <textarea id="creator-identifier" rows="1" maxlength="128" placeholder="e.g. wiki:${kind}_identifier"></textarea>
      <div class="field-hint" id="creator-identifier-hint" style="color:#666; font-size:10px; margin-top:4px;">must be in "namespace:identifier" format, e.g. wiki:ruby_block</div>
      <div class="modal-err" id="creator-identifier-err"></div>
    </div>
    <div class="set-field">
      <label>Texture (upload new)</label>
      <input type="file" id="creator-texture-file" accept="image/png">
      <div class="field-hint" style="color:#666; font-size:10px; margin-top:4px;">uploads to RP/textures/${textureFolder}/ and registers it automatically. leave empty to use an existing texture instead.</div>
    </div>
    <div class="set-field">
      <label>Texture Path / Shortname (used if no upload above)</label>
      <textarea id="creator-texture-path" rows="1" placeholder="e.g. wiki:existing_texture"></textarea>
    </div>

    <div class="creator-section-label">Components</div>
  `;

  let first = true;
  Object.keys(categories).forEach(catName => {
    const ids = categories[catName];
    const catKey = catName.replace(/[^a-zA-Z0-9]/g, "");
    html += `
      <div class="creator-cat">
        <div class="creator-cat-header" onclick="toggleCreatorCat('${catKey}')">
          <span class="creator-cat-arrow" id="cat-arrow-${catKey}">${first ? "v" : ">"}</span>
          <span>${esc(catName)}</span>
        </div>
        <div class="creator-cat-body" id="cat-body-${catKey}" style="display:${first ? "block" : "none"};">
    `;
    ids.forEach(id => {
      html += `
        <div class="creator-comp-row">
          <div class="creator-comp-name">${esc(id)}</div>
          <textarea rows="1" data-component-id="${esc(id)}" placeholder="value / json for this component"></textarea>
          <div class="creator-qmark" tabindex="0">?
            <div class="creator-tooltip">${esc(qtoolsDef(id))}</div>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
    first = false;
  });

  html += `
    <div class="creator-cat">
      <div class="creator-cat-header" onclick="toggleCreatorCat('loot')">
        <span class="creator-cat-arrow" id="cat-arrow-loot">></span>
        <span>Loot Table (optional)</span>
      </div>
      <div class="creator-cat-body" id="cat-body-loot" style="display:none;">
        <div class="field-hint" style="color:#666; font-size:11px; margin-bottom:10px;">add items this ${kind} should drop. leave empty to skip.</div>
        <div id="loot-rows"></div>
        <button class="sm-btn" type="button" onclick="addLootRow()">+ Add Drop</button>
      </div>
    </div>
  `;

  html += `
    <div class="creator-cat">
      <div class="creator-cat-header" onclick="toggleCreatorCat('recipe')">
        <span class="creator-cat-arrow" id="cat-arrow-recipe">></span>
        <span>Crafting Recipe (optional)</span>
      </div>
      <div class="creator-cat-body" id="cat-body-recipe" style="display:none;">
        <div class="field-hint" style="color:#666; font-size:11px; margin-bottom:10px;">fill in the 3x3 grid with item identifiers (e.g. wiki:ectoplasm). leave a cell empty for no ingredient there.</div>
        <div id="recipe-grid" class="recipe-grid"></div>
        <div class="set-field" style="margin-top:12px; max-width:260px;">
          <label>Result Count</label>
          <textarea id="recipe-result-count" rows="1" placeholder="1">1</textarea>
        </div>
      </div>
    </div>
  `;

  body.innerHTML = html;
  document.getElementById("creator-overlay").classList.add("open");
  buildRecipeGrid();

  body.querySelectorAll(".creator-qmark").forEach(q => {
    q.addEventListener("click", e => {
      e.stopPropagation();
      const wasOpen = q.classList.contains("open");
      body.querySelectorAll(".creator-qmark.open").forEach(o => o.classList.remove("open"));
      if (!wasOpen) q.classList.add("open");
    });
  });
}

function toggleCreatorCat(key) {
  const bodyEl = document.getElementById(`cat-body-${key}`);
  const arrowEl = document.getElementById(`cat-arrow-${key}`);
  if (!bodyEl) return;
  const isOpen = bodyEl.style.display !== "none";
  bodyEl.style.display = isOpen ? "none" : "block";
  arrowEl.textContent = isOpen ? ">" : "v";
}

function addLootRow(itemVal, minVal, maxVal, weightVal) {
  const container = document.getElementById("loot-rows");
  const rowId = "loot-row-" + Date.now() + Math.floor(Math.random() * 1000);
  const row = document.createElement("div");
  row.className = "creator-comp-row";
  row.id = rowId;
  row.innerHTML = `
    <textarea rows="1" class="loot-item" placeholder="item identifier, e.g. wiki:ectoplasm">${esc(itemVal || "")}</textarea>
    <textarea rows="1" class="loot-min" placeholder="min count" style="max-width:80px;">${esc(minVal || "1")}</textarea>
    <textarea rows="1" class="loot-max" placeholder="max count" style="max-width:80px;">${esc(maxVal || "1")}</textarea>
    <textarea rows="1" class="loot-weight" placeholder="weight" style="max-width:80px;">${esc(weightVal || "1")}</textarea>
    <button class="sm-btn" type="button" onclick="document.getElementById('${rowId}').remove()">remove</button>
  `;
  container.appendChild(row);
}

function buildRecipeGrid() {
  const grid = document.getElementById("recipe-grid");
  if (!grid) return;
  let html = "";
  for (let i = 0; i < 9; i++) {
    html += `<textarea rows="1" class="recipe-cell" data-cell="${i}" placeholder=""></textarea>`;
  }
  grid.innerHTML = html;
}

function closeCreator() {
  document.getElementById("creator-overlay").classList.remove("open");
  creatorKind = null;
}
document.getElementById("creator-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeCreator(); });

function validateIdentifier(value) {
  return /^[a-z0-9_]+:[a-z0-9_]+$/.test(value.trim());
}

async function ensureFolderPath(segments) {
  let parentId = null;
  for (const seg of segments) {
    const parentKey = parentId === null ? null : String(parentId);
    let folder = allFiles.find(f =>
      f.type === "folder" &&
      (f.parent_id === null ? null : String(f.parent_id)) === parentKey &&
      f.name.toLowerCase() === seg.toLowerCase()
    );
    if (!folder) {
      const res = await fetch(`${AUTH}/project/file`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_code: shareCode, parent_id: parentId, name: seg, type: "folder" })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `failed to create folder "${seg}"`);
      folder = { id: d.file_id, project_id: project.id, parent_id: parentId, name: seg, type: "folder", save_id: null, updated_at: new Date().toISOString() };
      allFiles.push(folder);
    }
    parentId = folder.id;
  }
  return parentId;
}

function findFileInFolder(parentId, filename) {
  const parentKey = parentId === null ? null : String(parentId);
  return allFiles.find(f =>
    f.type === "file" &&
    (f.parent_id === null ? null : String(f.parent_id)) === parentKey &&
    f.name.toLowerCase() === filename.toLowerCase()
  );
}

async function readFileContent(fileObj) {
  if (!fileObj || !fileObj.save_id) return null;
  try {
    const res = await fetch(`${AUTH}/save?id=${encodeURIComponent(fileObj.save_id)}`, { credentials: "include" });
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d.content === "string" ? d.content : null;
  } catch { return null; }
}

async function writeJSONFile(parentId, filename, obj) {
  const existing = findFileInFolder(parentId, filename);
  const content = JSON.stringify(obj, null, 4);
  const body = { project_code: shareCode, name: filename, type: "file", content };
  if (existing) body.file_id = existing.id; else body.parent_id = parentId;

  const res = await fetch(`${AUTH}/project/file`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || `failed to save ${filename}`);

  if (existing) {
    existing.updated_at = new Date().toISOString();
  } else {
    allFiles.push({ id: d.file_id, project_id: project.id, parent_id: parentId, name: filename, type: "file", save_id: d.save_id || null, updated_at: new Date().toISOString() });
  }
  return d;
}

async function uploadPngFile(parentId, filename, data) {
  const params = new URLSearchParams({ project_code: shareCode, name: filename });
  if (parentId) params.set("parent_id", parentId);
  const res = await fetch(`${AUTH}/project/file/upload?${params.toString()}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "image/png" },
    body: data
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || "texture upload failed");
  allFiles.push({ id: d.file_id, project_id: project.id, parent_id: parentId, name: filename, type: "file", save_id: null, r2_key: d.r2_key, updated_at: new Date().toISOString() });
  return d;
}

async function creatorSave() {
  if (creatorKind !== "block" && creatorKind !== "item") return;

  const nameEl = document.getElementById("creator-name");
  const idEl = document.getElementById("creator-identifier");
  const idErr = document.getElementById("creator-identifier-err");
  const status = document.getElementById("creator-status");
  const saveBtn = document.getElementById("creator-save-btn");
  idErr.textContent = "";
  idErr.classList.remove("show");

  const name = nameEl.value.trim();
  const identifier = idEl.value.trim();

  if (!name) { alert("enter a name."); return; }
  if (!validateIdentifier(identifier)) {
    idErr.textContent = 'identifier must be in "namespace:identifier" format, e.g. wiki:ruby_block';
    idErr.classList.add("show");
    return;
  }

  const idPart = identifier.split(":")[1];

  const componentValues = {};
  document.querySelectorAll("#creator-body textarea[data-component-id]").forEach(ta => {
    const v = ta.value.trim();
    if (!v) return;
    let parsed;
    try { parsed = JSON.parse(v); } catch { parsed = v; }
    componentValues[ta.dataset.componentId] = parsed;
  });

  const textureFileEl = document.getElementById("creator-texture-file");
  const texturePathEl = document.getElementById("creator-texture-path");
  const textureFile = textureFileEl && textureFileEl.files && textureFileEl.files[0] ? textureFileEl.files[0] : null;
  const texturePath = texturePathEl ? texturePathEl.value.trim() : "";

  saveBtn.disabled = true;
  status.textContent = "saving...";

  try {
    const kindFolder = creatorKind === "block" ? "blocks" : "items";
    const bpFolderId = await ensureFolderPath(["BP", kindFolder]);

    let textureShortname = null;

    if (textureFile) {
      if (textureFile.type !== "image/png") throw new Error("texture must be a PNG file.");
      status.textContent = "uploading texture...";
      textureShortname = identifier;

      const texFolderId = await ensureFolderPath(["RP", "textures", kindFolder]);
      const buf = await textureFile.arrayBuffer();
      await uploadPngFile(texFolderId, `${idPart}.png`, buf);

      const atlasFolderId = await ensureFolderPath(["RP", "textures"]);
      const atlasFilename = creatorKind === "block" ? "terrain_texture.json" : "item_texture.json";
      const existingAtlas = findFileInFolder(atlasFolderId, atlasFilename);
      const existingContent = existingAtlas ? await readFileContent(existingAtlas) : null;

      let atlasObj = null;
      try { atlasObj = existingContent ? JSON.parse(existingContent) : null; } catch { atlasObj = null; }
      if (!atlasObj || typeof atlasObj !== "object") {
        atlasObj = creatorKind === "block"
          ? { resource_pack_name: "vanilla", texture_name: "atlas.terrain", texture_data: {} }
          : { resource_pack_name: "vanilla", texture_name: "atlas.items", texture_data: {} };
      }
      atlasObj.texture_data = atlasObj.texture_data || {};
      atlasObj.texture_data[textureShortname] = { textures: `textures/${kindFolder}/${idPart}` };

      status.textContent = "registering texture...";
      await writeJSONFile(atlasFolderId, atlasFilename, atlasObj);
    } else if (texturePath) {
      textureShortname = texturePath;
    }

    if (textureShortname) {
      if (creatorKind === "block" && !componentValues["minecraft:material_instances"]) {
        componentValues["minecraft:material_instances"] = { "*": { texture: textureShortname } };
      } else if (creatorKind === "item" && !componentValues["minecraft:icon"]) {
        componentValues["minecraft:icon"] = textureShortname;
      }
    }

    const lootRowEls = document.querySelectorAll("#loot-rows .creator-comp-row");
    if (lootRowEls.length > 0) {
      status.textContent = "writing loot table...";
      const entries = [];
      lootRowEls.forEach(row => {
        const item = row.querySelector(".loot-item").value.trim();
        if (!item) return;
        const min = parseInt(row.querySelector(".loot-min").value, 10) || 1;
        const max = parseInt(row.querySelector(".loot-max").value, 10) || min;
        const weight = parseInt(row.querySelector(".loot-weight").value, 10) || 1;
        entries.push({
          type: "item",
          name: item,
          weight: weight,
          functions: [{ function: "set_count", count: { min: min, max: max } }]
        });
      });
      if (entries.length > 0) {
        const lootFolderId = await ensureFolderPath(["BP", "loot_tables", kindFolder]);
        const lootObj = { pools: [{ rolls: 1, entries: entries }] };
        await writeJSONFile(lootFolderId, `${idPart}.json`, lootObj);
        if (!componentValues["minecraft:loot"]) {
          componentValues["minecraft:loot"] = { table: `loot_tables/${kindFolder}/${idPart}.json` };
        }
      }
    }

    const rootKey = creatorKind === "block" ? "minecraft:block" : "minecraft:item";
    const fileObj = {
      format_version: "1.26.30",
      [rootKey]: {
        description: {
          identifier,
          menu_category: { category: "items" }
        },
        components: componentValues
      }
    };

    status.textContent = "writing file...";
    await writeJSONFile(bpFolderId, `${idPart}.json`, fileObj);

    const recipeCells = document.querySelectorAll("#recipe-grid .recipe-cell");
    const cellValues = Array.from(recipeCells).map(c => c.value.trim());
    const hasRecipe = cellValues.some(v => v);
    if (hasRecipe) {
      status.textContent = "writing recipe...";
      const key = {};
      const letters = "ABCDEFGHI";
      let letterIndex = 0;
      const symbolFor = {};
      const patternCells = cellValues.map(v => {
        if (!v) return " ";
        if (!symbolFor[v]) {
          const letter = letters[letterIndex++];
          symbolFor[v] = letter;
          key[letter] = { item: v };
        }
        return symbolFor[v];
      });
      const pattern = [
        patternCells.slice(0, 3).join(""),
        patternCells.slice(3, 6).join(""),
        patternCells.slice(6, 9).join("")
      ];
      const resultCount = parseInt(document.getElementById("recipe-result-count").value, 10) || 1;
      const recipeObj = {
        format_version: "1.20.10",
        "minecraft:recipe_shaped": {
          description: { identifier: `${identifier}_recipe` },
          tags: ["crafting_table"],
          pattern: pattern,
          key: key,
          result: { item: identifier, count: resultCount }
        }
      };
      const recipeFolderId = await ensureFolderPath(["BP", "recipes"]);
      await writeJSONFile(recipeFolderId, `${idPart}.json`, recipeObj);
    }

    updateStats();
    renderFileList();
    status.textContent = "saved!";
    setTimeout(() => { closeCreator(); }, 700);
  } catch (e) {
    status.textContent = e.message || "something went wrong.";
  }
  saveBtn.disabled = false;
}

    function toggleImagePreview(file, row) {
      const existing = document.querySelector(".image-preview-row");
      const wasOpenForThisFile = openImagePreview === file.id;

      // close whatever preview is currently open (if any)
      if (existing) {
        document.querySelectorAll(".file-icon").forEach(icon => {
          if (icon.textContent === "v") icon.textContent = ">";
        });
        existing.classList.remove("open");
        setTimeout(() => { existing.remove(); }, 180);
        openImagePreview = null;
      }

      // if the click was on the image that was already open, just leave it closed
      if (wasOpenForThisFile) return;

      const preview = document.createElement("div");
      preview.className = "image-preview-row";

      preview.innerHTML = `
        <div class="image-preview-inner">
          <img src="${AUTH}/project/asset?file_id=${file.id}" alt="${esc(file.name)}">
        </div>
      `;

      row.after(preview);

      requestAnimationFrame(() => {
        preview.classList.add("open");
      });

      row.querySelector(".file-icon").textContent = "v";
      openImagePreview = file.id;
    }

    function toggleBeaconPreview(file, row) {
      const existing = document.querySelector(".image-preview-row");
      const wasOpenForThisFile = openImagePreview === file.id;

      if (existing) {
        document.querySelectorAll(".file-icon").forEach(icon => {
          if (icon.textContent === "v") icon.textContent = ">";
        });
        existing.classList.remove("open");
        setTimeout(() => { existing.remove(); }, 180);
        openImagePreview = null;
      }
      if (wasOpenForThisFile) return;

      const preview = document.createElement("div");
      preview.className = "image-preview-row";
      const mode = beaconModeFor(file);
      const url = `https://mcbcode.com/editor/beacon?project=${encodeURIComponent(shareCode)}&file=${file.id}&mode=${mode}`;

      preview.innerHTML = `
        <div class="image-preview-inner" style="flex-direction:column; gap:10px;">
          <span style="font-size:12px; color:#888;">${mode === "structure" ? "3D block structure" : "3D custom model"}</span>
          <a class="primary-btn" href="${url}" style="display:inline-block;">Open Beacon Editor</a>
        </div>
      `;
      row.after(preview);
      requestAnimationFrame(() => preview.classList.add("open"));
      row.querySelector(".file-icon").textContent = "v";
      openImagePreview = file.id;
    }
function renderFileList() {
  renderPathBar();
  renderToolbar();
  const list = document.getElementById("file-list");
  list.innerHTML = "";
  const parentId = currentFolderId();
  // coerce to string for comparison — protects against id/parent_id
  // being mixed number/string types from the API
  const parentKey = parentId === null ? null : String(parentId);
  const children = allFiles
    .filter(f => (f.parent_id === null ? null : String(f.parent_id)) === parentKey)
    .sort((a, b) => { if (a.type !== b.type) return a.type === "folder" ? -1 : 1; return a.name.localeCompare(b.name); });

  // beginner hint at the project root explaining BP/RP structure, plus
  // quick-create shortcuts, if those folders don't exist yet
  if (isAtRoot()) {
    const hasBP = children.some(f => f.type === "folder" && f.name.toUpperCase() === "BP");
    const hasRP = children.some(f => f.type === "folder" && f.name.toUpperCase() === "RP");
    if (!hasBP || !hasRP) {
      const hint = document.createElement("div");
      hint.className = "root-hint";
      hint.innerHTML = `most addons are made of a <b>BP</b> (Behavior Pack) folder and an <b>RP</b> (Resource Pack) folder at the root. ${canEdit() ? "create whichever ones you're missing:" : ""}`;
      if (canEdit()) {
        const actions = document.createElement("div");
        actions.className = "hint-actions";
        if (!hasBP) {
          const b = document.createElement("button");
          b.className = "sm-btn"; b.textContent = "+ BP folder";
          b.onclick = () => quickCreateRootFolder("BP");
          actions.appendChild(b);
        }
        if (!hasRP) {
          const b = document.createElement("button");
          b.className = "sm-btn"; b.textContent = "+ RP folder";
          b.onclick = () => quickCreateRootFolder("RP");
          actions.appendChild(b);
        }
        hint.appendChild(actions);
      }
      list.appendChild(hint);
    }
  }

  if (currentPath.length > 0) {
    const up = document.createElement("div");
    up.className = "file-row";
    up.innerHTML = `<span class="file-icon folder">^</span><span class="file-name folder">..</span>`;
    up.onclick = () => { currentPath.pop(); pushPath(currentPath); renderFileList(); };
    list.appendChild(up);
  }
  if (children.length === 0) {
    list.innerHTML += `<div class="file-list-empty">${canEdit() ? (isAtRoot() ? 'No folders yet. Add one above.' : 'Empty. Use the buttons above to add files.') : 'Nothing here.'}</div>`;
    return;
  }
  children.forEach(f => {
    const row = document.createElement("div");
    row.className = "file-row";
    row.dataset.fileId = f.id;
    const icon = f.type === "folder" ? "+" : ">";
    const nameClass = f.type === "folder" ? "file-name folder" : "file-name";
    const pngBadge = (f.type === "file" && isPng(f)) ? `<span class="file-badge">image</span>` : "";
    const beaconBadge = (f.type === "file" && isBeaconFile(f)) ? `<span class="file-badge" style="color:#05ee93;border-color:#0a3a2a;">3d</span>` : "";    const rowTime = f.type === "folder" ? newestUpdateInFolder(f.id) : f.updated_at;
    row.innerHTML = `
      <span class="file-icon${f.type === 'folder' ? ' folder' : ''}">${icon}</span>
      <span class="${nameClass}">${esc(f.name)}</span>
      ${pngBadge}
      ${beaconBadge}
      <span class="file-updated" title="${esc(fmtDateTime(rowTime))}">${rowTime ? esc(timeAgo(rowTime)) : "—"}</span>
      ${canEdit() ? `<button class="file-del" onclick="askRename(event,${f.id},'${esc(f.name)}','${f.type}')">ren</button>` : ""}
      ${canEdit() ? `<button class="file-del" onclick="askDelete(event,${f.id},'${esc(f.name)}')">del</button>` : ""}
    `;
    if (f.type === "folder") {
      row.onclick = e => { if (e.target.classList.contains("file-del")) return; currentPath.push({id: f.id, name: f.name}); pushPath(currentPath); renderFileList(); };
    } else if (isPng(f)) {
      row.onclick = e => {
        if (e.target.classList.contains("file-del")) return;
        toggleImagePreview(f, row);
      };
    } else if (isBeaconFile(f)) {
      row.onclick = e => {
        if (e.target.classList.contains("file-del")) return;
        toggleBeaconPreview(f, row);
      };
    } else {
      row.onclick = e => {
        if (e.target.classList.contains("file-del")) return;
        if (!f.save_id) return;
        if (window._editorMode === "legacy") {
          window.location.href = editorUrl(f);
        } else {
          openInlineEditor(f);
        }
      };
      if (!f.save_id) { row.style.opacity = "0.4"; row.style.cursor = "default"; }
    }
    list.appendChild(row);
  });
}

    // creates a root-level BP or RP folder directly, used by the root hint shortcuts
    async function quickCreateRootFolder(name) {
      try {
        const res = await fetch(`${AUTH}/project/file`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode, parent_id: null, name, type: "folder" })
        });
        const d = await res.json();
        if (!res.ok) { alert(d.error || "failed to create folder."); return; }
        allFiles.push({ id: d.file_id, project_id: project.id, parent_id: null, name, type: "folder", save_id: null, updated_at: new Date().toISOString() });
        updateStats(); renderFileList();
      } catch { alert("something went wrong."); }
    }

    function renderPathBar() {
      const seg = document.getElementById("path-segments");
      seg.innerHTML = "";
      currentPath.forEach((crumb, i) => {
        const sep = document.createElement("span"); sep.className = "path-sep"; sep.textContent = "/"; seg.appendChild(sep);
        const el = document.createElement("span"); el.className = "path-crumb"; el.textContent = crumb.name;
        el.onclick = () => { currentPath = currentPath.slice(0, i + 1); pushPath(currentPath); renderFileList(); };
        seg.appendChild(el);
      });
    }

    function navToRoot() { currentPath = []; pushPath(currentPath); renderFileList(); }

    // ---- NEW FILE/FOLDER ----
    function openNewFile(type) {
      newFileType = type; newFileParentId = currentFolderId();
      document.getElementById("nf-title").textContent = type === "folder" ? "New Folder" : "New File";
      document.getElementById("nf-name").value = "";
      document.getElementById("nf-name").placeholder = type === "folder" ? "e.g. functions" : "e.g. player.mcfunction";
      document.getElementById("nf-hint").textContent = type === "folder" ? "" : "include the file extension, e.g. .mcfunction, .json, .png";
      document.getElementById("nf-err").textContent = "";
      document.getElementById("nf-err").classList.remove("show");
      document.getElementById("new-file-overlay").classList.add("open");
      setTimeout(() => document.getElementById("nf-name").focus(), 50);
    }

    async function submitNewFile() {
      const name = document.getElementById("nf-name").value.trim();
      const err  = document.getElementById("nf-err");
      const btn  = document.getElementById("nf-submit");
      if (!name) { err.textContent = "Name is required."; err.classList.add("show"); return; }

      // beginner guardrail check — only applies to files, not folders
      if (newFileType === "file") {
        const folderSegments = currentPath.map(c => c.name);
        const check = checkGuardrail(name, folderSegments);
        if (!check.ok) {
          err.textContent = "";
          err.classList.remove("show");
          document.getElementById("guardrail-warn-text").textContent = check.message;
          document.getElementById("guardrail-warn-overlay").classList.add("open");
          return;
        }
      }

      btn.disabled = true;
      try {
        const res = await fetch(`${AUTH}/project/file`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode, parent_id: newFileParentId, name, type: newFileType })
        });
        const d = await res.json();
        if (!res.ok) { err.textContent = d.error || "Failed."; err.classList.add("show"); btn.disabled = false; return; }
        allFiles.push({ id: d.file_id, project_id: project.id, parent_id: newFileParentId, name, type: newFileType, save_id: d.save_id || null, updated_at: new Date().toISOString() });
        closeModal("new-file-overlay"); updateStats(); renderFileList();
      } catch { err.textContent = "Something went wrong."; err.classList.add("show"); }
      btn.disabled = false;
    }

    // ---- PNG UPLOAD ----
    async function handlePngUpload(e) {
      const file = e.target.files[0];
      e.target.value = ""; // reset so same file can be picked again
      if (!file) return;
      if (file.type !== "image/png") { alert("Only PNG files are allowed."); return; }

      // beginner guardrail check applies to uploaded images too
      const folderSegments = currentPath.map(c => c.name);
      const check = checkGuardrail(file.name, folderSegments);
      if (!check.ok) {
        document.getElementById("guardrail-warn-text").textContent = check.message;
        document.getElementById("guardrail-warn-overlay").classList.add("open");
        return;
      }

      const parentId = currentFolderId();
      const params = new URLSearchParams({ project_code: shareCode, name: file.name });
      if (parentId) params.set("parent_id", parentId);

      try {
        const res = await fetch(`${AUTH}/project/file/upload?${params.toString()}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "image/png" },
          body: file
        });
        const d = await res.json();
        if (!res.ok) { alert(d.error || "Upload failed."); return; }
        allFiles.push({
          id: d.file_id, project_id: project.id, parent_id: parentId,
          name: file.name.toLowerCase().endsWith(".png") ? file.name : file.name + ".png",
          type: "file", save_id: null, r2_key: d.r2_key, updated_at: new Date().toISOString()
        });
        updateStats(); renderFileList();
      } catch { alert("Something went wrong uploading the image."); }
    }

    
    async function handleMcstructureUpload(e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".mcstructure")) { alert("Only .mcstructure files are allowed."); return; }

      const folderSegments = currentPath.map(c => c.name);
      const check = checkGuardrail(file.name, folderSegments);
      if (!check.ok) {
        document.getElementById("guardrail-warn-text").textContent = check.message;
        document.getElementById("guardrail-warn-overlay").classList.add("open");
        return;
      }

      const parentId = currentFolderId();
      const buf = await file.arrayBuffer();
      const params = new URLSearchParams({ project_code: shareCode, new: "1", name: file.name });
      if (parentId) params.set("parent_id", parentId);

      try {
        const res = await fetch(`${AUTH}/project/structure/save?${params.toString()}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/octet-stream" },
          body: buf
        });
        const d = await res.json();
        if (!res.ok) { alert(d.error || "Upload failed."); return; }
        allFiles.push({
          id: d.file_id, project_id: project.id, parent_id: parentId,
          name: file.name, type: "file", save_id: null, updated_at: new Date().toISOString()
        });
        updateStats(); renderFileList();
      } catch { alert("Something went wrong uploading the structure."); }
    }
    
    // ---- DELETE FILE ----
    function askDelete(e, id, name) {
      e.stopPropagation(); pendingDelId = id;
      document.getElementById("del-name").textContent = name;
      const warnEl = document.getElementById("del-critical-warn");
      pendingDelIsCritical = CRITICAL_FILENAMES.includes(name.toLowerCase());
      if (pendingDelIsCritical) {
        warnEl.textContent = "heads up — this file is important for your pack to work. deleting it may break your project.";
        warnEl.style.display = "block";
      } else {
        warnEl.style.display = "none";
      }
      document.getElementById("del-overlay").classList.add("open");
    }

    async function confirmDelete() {
      if (!pendingDelId) return closeModal("del-overlay");
      const id = pendingDelId; closeModal("del-overlay");
      try {
        const res = await fetch(`${AUTH}/project/file?file_id=${encodeURIComponent(id)}&project_code=${encodeURIComponent(shareCode)}`, { method: "DELETE", credentials: "include" });
        if (res.ok) { removeFromCache(id); updateStats(); renderFileList(); }
      } catch {}
    }

    // ---- RENAME FILE ----
    function askRename(e, id, name, type) {
      e.stopPropagation();
      pendingRenameId = id;
      pendingRenameType = type;
      document.getElementById("rn-name").value = name;
      document.getElementById("rn-err").textContent = "";
      document.getElementById("rn-err").classList.remove("show");
      document.getElementById("rename-overlay").classList.add("open");
      setTimeout(() => {
        const inp = document.getElementById("rn-name");
        inp.focus();
        const dot = name.lastIndexOf(".");
        if (dot > 0) inp.setSelectionRange(0, dot); else inp.select();
      }, 50);
    }

    async function submitRename() {
      const name = document.getElementById("rn-name").value.trim();
      const err  = document.getElementById("rn-err");
      const btn  = document.getElementById("rn-submit");
      if (!name) { err.textContent = "name is required."; err.classList.add("show"); return; }
      if (!pendingRenameId) return closeModal("rename-overlay");

      // guardrail check applies on rename too (folder stays the same, name changes)
      if (pendingRenameType === "file") {
        const check = checkGuardrail(name, currentPath.map(c => c.name));
        if (!check.ok) {
          err.textContent = "";
          err.classList.remove("show");
          document.getElementById("guardrail-warn-text").textContent = check.message;
          document.getElementById("guardrail-warn-overlay").classList.add("open");
          return;
        }
      }

      btn.disabled = true;
      try {
        const res = await fetch(`${AUTH}/project/file`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode, file_id: pendingRenameId, name, type: pendingRenameType })
        });
        const d = await res.json();
        if (!res.ok) { err.textContent = d.error || "failed."; err.classList.add("show"); btn.disabled = false; return; }
        const f = allFiles.find(x => x.id === pendingRenameId);
        if (f) f.name = name;
        closeModal("rename-overlay");
        // if a folder in currentPath was renamed, keep the path/url in sync
        const idxInPath = currentPath.findIndex(c => c.id === pendingRenameId);
        if (idxInPath !== -1) { currentPath[idxInPath].name = name; pushPath(currentPath); }
        renderFileList();
      } catch { err.textContent = "something went wrong."; err.classList.add("show"); }
      btn.disabled = false;
    }

    function removeFromCache(id) {
      allFiles.filter(f => f.parent_id === id).forEach(c => removeFromCache(c.id));
      const i = allFiles.findIndex(f => f.id === id);
      if (i !== -1) allFiles.splice(i, 1);
    }

    // ---- COLLABORATORS ----
    async function loadCollaborators() {
      const list = document.getElementById("collab-list");
      try {
        const res = await fetch(`${AUTH}/project/collaborators?code=${encodeURIComponent(shareCode)}`, { credentials: "include" });
        if (!res.ok) { list.innerHTML = `<div class="collab-empty">Failed to load.</div>`; return; }
        const d = await res.json();
        renderCollabList(d.collaborators || []);
      } catch { list.innerHTML = `<div class="collab-empty">Failed to load.</div>`; }
    }

    function renderCollabList(collabs) {
      const list = document.getElementById("collab-list");
      if (!collabs.length) { list.innerHTML = `<div class="collab-empty">No collaborators yet.</div>`; return; }
      list.innerHTML = collabs.map(c => `
        <div class="collab-row" id="collab-${c.user_id}">
          <span class="collab-name">${esc(c.username)}</span>
          <span class="collab-date">added ${fmtDate(c.added_at)}</span>
          <button class="collab-remove" onclick="removeCollab(${c.user_id}, '${esc(c.username)}')">remove</button>
        </div>
      `).join("");
    }

    async function fetchCollabAc(q) {
      try {
        const r = await fetch(`${AUTH}/profile/search?q=${encodeURIComponent(q)}`);
        if (!r.ok) return;
        const d = await r.json();
        const ac = document.getElementById("collab-ac");
        if (!d.results.length) { closeCollabAc(); return; }
        ac.innerHTML = d.results.map(u => `<div class="collab-ac-item" onclick="pickCollabAc('${esc(u)}')">${esc(u)}</div>`).join("");
        ac.classList.add("open");
      } catch {}
    }

    function pickCollabAc(username) {
      document.getElementById("collab-input").value = username;
      closeCollabAc();
    }

    function closeCollabAc() {
      document.getElementById("collab-ac").classList.remove("open");
      document.getElementById("collab-ac").innerHTML = "";
    }

    async function addCollab() {
      const username = document.getElementById("collab-input").value.trim();
      const err = document.getElementById("collab-err");
      err.classList.remove("show");
      if (!username) { err.textContent = "Enter a username."; err.classList.add("show"); return; }
      try {
        const res = await fetch(`${AUTH}/project/collaborators`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode, username })
        });
        const d = await res.json();
        if (!res.ok) { err.textContent = d.error || "Failed."; err.classList.add("show"); return; }
        document.getElementById("collab-input").value = "";
        await loadCollaborators();
      } catch { err.textContent = "Something went wrong."; err.classList.add("show"); }
    }

    async function removeCollab(userId, username) {
      try {
        const res = await fetch(`${AUTH}/project/collaborators?code=${encodeURIComponent(shareCode)}&user_id=${encodeURIComponent(userId)}`, {
          method: "DELETE", credentials: "include"
        });
        if (res.ok) { const row = document.getElementById(`collab-${userId}`); if (row) row.remove(); await loadCollaborators(); }
      } catch {}
    }

    // ---- EXPORT ----
    async function startExport() {
      if (!isLoggedIn()) return;
      const btn = document.getElementById("export-btn");
      btn.disabled = true; btn.textContent = "Loading...";
      try {
        const res = await fetch(`${AUTH}/project/export?code=${encodeURIComponent(shareCode)}`, { credentials: "include" });
        if (!res.ok) { alert("Failed to fetch project data."); return; }
        exportFileData = await res.json();
        const rootFiles = exportFileData.files.filter(f => f.parent_id === null && f.type === "file");
        if (rootFiles.length > 0) {
          document.getElementById("export-warn-list").innerHTML = rootFiles.map(f => `<li>${esc(f.name)}</li>`).join("");
          document.getElementById("export-warn-overlay").classList.add("open");
        } else { await doExport(); }
      } catch { alert("Export failed."); }
      btn.disabled = false; btn.textContent = "Export";
    }

    // writes a file into a zip, handling base64 (png) vs plain text content
    function addFileToZip(zip, path, f) {
      if (f.is_base64) {
        zip.file(path, f.content || "", { base64: true });
      } else {
        zip.file(path, f.content || "");
      }
    }

    async function doExport() {
      closeModal("export-warn-overlay");
      const btn = document.getElementById("export-btn");
      btn.disabled = true; btn.textContent = "Zipping...";
      try {
        const files = exportFileData.files;
        const projectName = exportFileData.project_name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "project";
        const rootFolders = files.filter(f => f.parent_id === null && f.type === "folder");
        const hasBP = rootFolders.some(f => f.name.toUpperCase() === "BP");
        const hasRP = rootFolders.some(f => f.name.toUpperCase() === "RP");
        const fileMap = {};
        files.forEach(f => fileMap[f.id] = f);

        function getRelativeParts(file, stopId) {
          const parts = [file.name];
          let cur = file;
          while (cur.parent_id !== stopId) {
            cur = fileMap[cur.parent_id];
            if (!cur) break;
            parts.unshift(cur.name);
          }
          return parts;
        }

        function isUnderFolder(file, folderId) {
          let cur = file;
          while (cur.parent_id !== null) {
            cur = fileMap[cur.parent_id];
            if (!cur) return false;
          }
          return cur.id === folderId;
        }

        if (hasBP && hasRP) {
          const addon = new JSZip();
          for (const packName of ["BP", "RP"]) {
            const packFolder = rootFolders.find(f => f.name.toUpperCase() === packName);
            if (!packFolder) continue;
            const packZip = new JSZip();
            files.filter(f => f.type === "file" && isUnderFolder(f, packFolder.id))
                 .forEach(f => addFileToZip(packZip, getRelativeParts(f, packFolder.id).join("/"), f));
            addon.file(`${projectName}_${packName}.mcpack`, await packZip.generateAsync({ type: "blob" }));
          }
          triggerDownload(await addon.generateAsync({ type: "blob" }), `${projectName}.mcaddon`);
        } else {
          const zip = new JSZip();
          const onlyPack = hasBP ? rootFolders.find(f => f.name.toUpperCase() === "BP") : rootFolders.find(f => f.name.toUpperCase() === "RP");
          if (!onlyPack) {
            files.filter(f => f.type === "file" && f.parent_id !== null).forEach(f => addFileToZip(zip, getRelativeParts(f, null).join("/"), f));
          } else {
            files.filter(f => f.type === "file" && isUnderFolder(f, onlyPack.id))
                 .forEach(f => addFileToZip(zip, getRelativeParts(f, onlyPack.id).join("/"), f));
          }
          triggerDownload(await zip.generateAsync({ type: "blob" }), `${projectName}.mcpack`);
        }
      } catch(e) { alert("Export failed: " + e.message); }
      btn.disabled = false; btn.textContent = "Export";
    }

    function triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    // ---- SETTINGS ----
    async function saveSettings() {
      const name = document.getElementById("set-name").value.trim();
      const desc = document.getElementById("set-desc").value.trim();
      const msg  = document.getElementById("set-msg");
      if (!name) return;
      try {
        const res = await fetch(`${AUTH}/project/settings`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode, name, description: desc, is_public: true })
        });
        if (res.ok) {
          project.name = name; project.description = desc;
          document.getElementById("proj-title").textContent = name;
          document.getElementById("bc-project").textContent = name;
          document.getElementById("m-desc").textContent = desc || "No description.";
          msg.textContent = "Saved!"; msg.className = "inline-msg ok";
        } else {
          const d = await res.json();
          msg.textContent = d.error || "Failed."; msg.className = "inline-msg err";
        }
      } catch { msg.textContent = "Error."; msg.className = "inline-msg err"; }
      setTimeout(() => { msg.textContent = ""; msg.className = "inline-msg"; }, 3000);
    }

    // ---- TAGS ----
    function renderTags() {
      document.getElementById("tag-count").textContent = `(${currentTags.length}/10)`;
      const list = document.getElementById("tag-list");
      if (!currentTags.length) { list.innerHTML = `<span style="font-size:12px; color:#444;">no tags yet.</span>`; return; }
      list.innerHTML = currentTags.map((t, i) => `
        <span class="tag-chip">${esc(t)}<button onclick="removeTag(${i})">x</button></span>
      `).join("");
    }

    function addTag() {
      const input = document.getElementById("tag-input");
      const err = document.getElementById("tag-err");
      err.classList.remove("show");
      let val = input.value.trim().toLowerCase().replace(/[^a-z0-9\- ]/g, "").slice(0, 24);
      if (!val) { err.textContent = "enter a tag."; err.classList.add("show"); return; }
      if (currentTags.includes(val)) { err.textContent = "already added."; err.classList.add("show"); return; }
      if (currentTags.length >= 10) { err.textContent = "10 tag max."; err.classList.add("show"); return; }
      currentTags.push(val);
      input.value = "";
      renderTags();
      saveTags();
    }

    function removeTag(i) {
      currentTags.splice(i, 1);
      renderTags();
      saveTags();
    }

    async function saveTags() {
      const err = document.getElementById("tag-err");
      try {
        const res = await fetch(`${AUTH}/project/settings`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode, tags: currentTags })
        });
        if (!res.ok) { const d = await res.json(); err.textContent = d.error || "failed to save tags."; err.classList.add("show"); }
      } catch { err.textContent = "something went wrong saving tags."; err.classList.add("show"); }
    }

    document.getElementById("tag-input")?.addEventListener("keydown", e => { if (e.key === "Enter") addTag(); });

    // ---- OBSIDIAN FEATURES (github sync + custom slug) ----
    function initObsidianFeatures() {
      const on = !!window._isObsidian;
      document.getElementById("obsidian-features").style.display = on ? "" : "none";
      document.getElementById("obsidian-locked-msg").style.display = on ? "none" : "";
      if (!on) return;

      if (project.custom_slug) document.getElementById("set-slug").value = project.custom_slug;

      const statusEl = document.getElementById("github-sync-status");
      if (project.github_repo_owner && project.github_repo_name) {
        statusEl.textContent = `linked to github.com/${project.github_repo_owner}/${project.github_repo_name}`;
        document.getElementById("github-link-btn").style.display = "none";
        document.getElementById("github-sync-btn").style.display = "";
      } else {
        statusEl.textContent = "not linked yet.";
        document.getElementById("github-link-btn").style.display = "";
        document.getElementById("github-sync-btn").style.display = "none";
      }
    }

    async function saveSlug() {
      const slug = document.getElementById("set-slug").value.trim().toLowerCase();
      const msg = document.getElementById("slug-msg");
      try {
        const res = await fetch(`${AUTH}/project/slug`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode, slug })
        });
        const d = await res.json();
        if (res.ok) { msg.textContent = "saved! new url: /s/" + slug; msg.className = "inline-msg ok"; project.custom_slug = slug; }
        else { msg.textContent = d.error || "failed."; msg.className = "inline-msg err"; }
      } catch { msg.textContent = "error."; msg.className = "inline-msg err"; }
    }

    async function linkGithub() {
      const btn = document.getElementById("github-link-btn");
      btn.disabled = true; btn.textContent = "Linking...";
      try {
        const res = await fetch(`${AUTH}/project/github/link`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_code: shareCode })
        });
        const d = await res.json();

        console.log("github link response", res.status, d);        if (res.ok) {
          project.github_repo_owner = d.repo_owner; project.github_repo_name = d.repo_name;
          initObsidianFeatures();
} else {
  if (d.error === "You haven't installed the mcbCode GitHub App yet.") {
    window.location.href = "https://github.com/apps/mcbcode-sync/installations/new";
    return;
  }

  alert(d.error || "failed to link github.");
}      } catch { alert("something went wrong."); }
      btn.disabled = false; btn.textContent = "Link to GitHub";
    }

    async function syncGithub() {
      const btn = document.getElementById("github-sync-btn");
      btn.disabled = true; btn.textContent = "Syncing...";
      try {
        const res = await fetch(`${AUTH}/project/github/sync?code=${encodeURIComponent(shareCode)}`, {
          method: "POST", credentials: "include"
        });
        const d = await res.json();
        if (res.ok) {
          if (d.conflicts && d.conflicts.length) alert("synced, but these files conflicted and were skipped: " + d.conflicts.join(", "));
          else alert("synced!");
        } else { alert(d.error || "sync failed."); }
      } catch { alert("something went wrong."); }
      btn.disabled = false; btn.textContent = "Sync Now";
    }

    // ---- DANGER ZONE ----
    function confirmDangerAction(action) {
      pendingDangerAction = action;
      const title = document.getElementById("danger-confirm-title");
      const sub   = document.getElementById("danger-confirm-sub");
      if (action === "remove_collabs") {
        title.textContent = "Remove all collaborators?";
        sub.textContent = "they'll lose access to this project immediately.";
      } else if (action === "reset_files") {
        title.textContent = "Reset all files?";
        sub.textContent = "every file and folder (including pngs) will be deleted. this can't be undone.";
      } else if (action === "delete_project") {
        title.textContent = "Delete this project?";
        sub.textContent = "this permanently deletes the project, its files, and its share link.";
      }
      document.getElementById("danger-confirm-overlay").classList.add("open");
    }

    async function runDangerAction() {
      const action = pendingDangerAction;
      closeModal("danger-confirm-overlay");
      if (!action) return;
      try {
        if (action === "remove_collabs") {
          const res = await fetch(`${AUTH}/project/collaborators/all?code=${encodeURIComponent(shareCode)}`, { method: "DELETE", credentials: "include" });
          if (res.ok) loadCollaborators(); else alert("Failed to remove collaborators.");
        } else if (action === "reset_files") {
          const res = await fetch(`${AUTH}/project/files/all?code=${encodeURIComponent(shareCode)}`, { method: "DELETE", credentials: "include" });
          if (res.ok) { location.reload(); } else alert("Failed to reset files.");
        } else if (action === "delete_project") {
          const res = await fetch(`${AUTH}/project?code=${encodeURIComponent(shareCode)}`, { method: "DELETE", credentials: "include" });
          if (res.ok) { window.location.href = "/dashboard"; } else alert("Failed to delete project.");
        }
      } catch { alert("Something went wrong."); }
      pendingDangerAction = null;
    }

    // ---- TABS ----
    function switchTab(tab, el) {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      el.classList.add("active");
      document.getElementById("tab-files").style.display = tab === "files" ? "flex" : "none";
      document.getElementById("tab-settings").classList.toggle("active", tab === "settings");
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove("open");
      if (id === "del-overlay") pendingDelId = null;
      if (id === "rename-overlay") { pendingRenameId = null; pendingRenameType = null; }
    }
    document.getElementById("new-file-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal("new-file-overlay"); });
    document.getElementById("del-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal("del-overlay"); });
    document.getElementById("rename-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal("rename-overlay"); });
    document.getElementById("export-warn-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal("export-warn-overlay"); });
    document.getElementById("guardrail-warn-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal("guardrail-warn-overlay"); });
    document.getElementById("danger-confirm-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal("danger-confirm-overlay"); });

    // ---- RESIZABLE FILE EXPLORER (meta panel width, desktop) ----
    (function initResize() {
      const handle = document.getElementById("meta-resize-handle");
      const panel = document.querySelector(".meta-panel");
      let dragging = false;
      const saved = localStorage.getItem("metaPanelWidth");
      if (saved) panel.style.width = saved + "px";
      handle.addEventListener("mousedown", e => {
        dragging = true;
        handle.classList.add("dragging");
        e.preventDefault();
      });
      window.addEventListener("mousemove", e => {
        if (!dragging) return;
        const w = Math.min(460, Math.max(180, e.clientX));
        panel.style.width = w + "px";
      });
      window.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove("dragging");
        localStorage.setItem("metaPanelWidth", parseInt(panel.style.width, 10));
      });
    })();

    // ---- MOBILE FILE EXPLORER DRAWER ----
    function openMobileDrawer() {
      // fix: the meta-panel lives inside #tab-files, which gets display:none
      // when the Settings tab is active. a display:none parent hides its
      // fixed-position children too, so the drawer would never appear.
      // make sure #tab-files is laid out (flex) whenever the drawer opens,
      // regardless of which tab is currently marked "active".
      const filesPanel = document.getElementById("tab-files");
      if (filesPanel.style.display === "none") filesPanel.style.display = "flex";
      document.querySelector(".meta-panel").classList.add("drawer-open");
      document.getElementById("drawer-scrim").classList.add("open");
    }
    function closeMobileDrawer() {
      document.querySelector(".meta-panel").classList.remove("drawer-open");
      document.getElementById("drawer-scrim").classList.remove("open");
      // if settings tab is the active tab, restore tab-files to hidden now
      // that the drawer is closed, so we're back to the normal single-tab view
      const settingsActive = document.getElementById("tab-settings-btn").classList.contains("active");
      if (settingsActive) document.getElementById("tab-files").style.display = "none";
    }

    async function doLogout() {
      await fetch(`${AUTH}/logout`, { method: "POST", credentials: "include" });
      window.location.href = "/account";
    }

    // fix: force a real reload if page is restored from bfcache (back/forward),
    // since the init script above won't re-run and currentPath / allFiles can
    // be stale, showing a folder that no longer exists until "root" is clicked.
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) location.reload();
    });

    // ---- INLINE EDITOR ----
    let ieCurrentFile = null;
    let ieOriginalContent = "";
    let ieWrap = false;
    let mcHighlighterReady = false;
    let ieCanEditFile = false;

    function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    function getExt(name) { const i = name.lastIndexOf("."); return i === -1 ? "" : name.slice(i + 1).toLowerCase(); }

    function highlightPlain(code) { return escHtml(code); }

function highlightJSON(code) {
    let out = "";
    let i = 0;
    const n = code.length;

    while (i < n) {
        const c = code[i];

        // strings (keys get tok-key, values get tok-str)
        if (c === '"') {
            let j = i + 1;
            while (j < n) {
                if (code[j] === '\\') { j += 2; continue; }
                if (code[j] === '"') { j++; break; }
                j++;
            }
            let k = j;
            while (k < n && /\s/.test(code[k])) k++;
            const isKey = code[k] === ':';
            out += `<span class="${isKey ? 'tok-key' : 'tok-str'}">${escHtml(code.slice(i, j))}</span>`;
            i = j;
            continue;
        }

        // numbers
        if (c === '-' || /\d/.test(c)) {
            let j = i;
            if (code[j] === '-') j++;
            while (j < n && /[\d.eE+-]/.test(code[j])) j++;
            out += `<span class="tok-num">${escHtml(code.slice(i, j))}</span>`;
            i = j;
            continue;
        }

        // true / false / null
        if (code.startsWith('true', i) || code.startsWith('false', i) || code.startsWith('null', i)) {
            const word = code.startsWith('true', i) ? 'true' : code.startsWith('false', i) ? 'false' : 'null';
            out += `<span class="tok-kw">${word}</span>`;
            i += word.length;
            continue;
        }

        out += escHtml(c);
        i++;
    }
    return out;
}

function highlightJS(code) {
    let out = "";
    let i = 0;
    const n = code.length;
    const keywords = new Set([
        "function","return","const","let","var","if","else","for","while","new",
        "class","extends","import","export","default","async","await","try",
        "catch","finally","typeof","instanceof","null","true","false","undefined",
        "this","break","continue","switch","case","in","of","do","yield","static",
        "get","set","super","void","delete","throw"
    ]);

    while (i < n) {
        const c = code[i];

        // line comment
        if (c === '/' && code[i + 1] === '/') {
            let j = i;
            while (j < n && code[j] !== '\n') j++;
            out += `<span class="tok-com">${escHtml(code.slice(i, j))}</span>`;
            i = j;
            continue;
        }

        // block comment
        if (c === '/' && code[i + 1] === '*') {
            const end = code.indexOf('*/', i + 2);
            const j = end === -1 ? n : end + 2;
            out += `<span class="tok-com">${escHtml(code.slice(i, j))}</span>`;
            i = j;
            continue;
        }

        // strings (single, double, template literals)
        if (c === '"' || c === "'" || c === '`') {
            const quote = c;
            let j = i + 1;
            while (j < n) {
                if (code[j] === '\\') { j += 2; continue; }
                if (code[j] === quote) { j++; break; }
                j++;
            }
            out += `<span class="tok-str">${escHtml(code.slice(i, j))}</span>`;
            i = j;
            continue;
        }

        // numbers (incl. hex, decimals, exponents)
        if (/\d/.test(c)) {
            let j = i;
            if (c === '0' && (code[j + 1] === 'x' || code[j + 1] === 'X')) {
                j += 2;
                while (j < n && /[0-9a-fA-F]/.test(code[j])) j++;
            } else {
                while (j < n && /[\d.]/.test(code[j])) j++;
                if (code[j] === 'e' || code[j] === 'E') {
                    j++;
                    if (code[j] === '+' || code[j] === '-') j++;
                    while (j < n && /\d/.test(code[j])) j++;
                }
            }
            out += `<span class="tok-num">${escHtml(code.slice(i, j))}</span>`;
            i = j;
            continue;
        }

        // identifiers / keywords
        if (/[a-zA-Z_$]/.test(c)) {
            let j = i;
            while (j < n && /[a-zA-Z0-9_$]/.test(code[j])) j++;
            const word = code.slice(i, j);
            out += keywords.has(word) ? `<span class="tok-kw">${word}</span>` : escHtml(word);
            i = j;
            continue;
        }

        out += escHtml(c);
        i++;
    }
    return out;
}
    // basic fallback in case grammar.js/highlight.js don't expose what we expect
    function highlightMcfunctionFallback(code) {
      let out = escHtml(code);
      out = out.replace(/(#[^\n]*)/g, '<span class="tok-com">$1</span>');
      out = out.replace(/^(\/?\w+)/gm, '<span class="tok-cmd">$1</span>');
      return out;
    }

    // this matches the legacy /editor/mcfunction page exactly: grammar.js
    // loads first, then highlight.js, and the resulting global is an async
    // function called applyHighlighting(code) that returns highlighted HTML.
    function loadMcfunctionHighlighter() {
      if (mcHighlighterReady || window._mcHighlightLoading) return;
      window._mcHighlightLoading = true;
      const grammar = document.createElement("script");
      grammar.src = "https://mcbcode.com/backend/grammar.js";
      grammar.onload = () => {
        const core = document.createElement("script");
        core.src = "https://mcbcode.com/backend/highlight.js";
        core.onload = () => {
          mcHighlighterReady = true;
          window._mcHighlightLoading = false;
          if (ieCurrentFile && getExt(ieCurrentFile.name) === "mcfunction") renderHighlight();
        };
        core.onerror = () => { window._mcHighlightLoading = false; console.error("failed to load highlight.js"); };
        document.head.appendChild(core);
      };
      grammar.onerror = () => { window._mcHighlightLoading = false; console.error("failed to load grammar.js"); };
      document.head.appendChild(grammar);
    }

    // cache of the last-highlighted result per render cycle, since
    // applyHighlighting is async and renderHighlight() itself is not.
    let ieHighlightToken = 0;

    function highlightMcfunction(code) {
      if (mcHighlighterReady && typeof window.applyHighlighting === "function") {
        const myToken = ++ieHighlightToken;
        window.applyHighlighting(code).then(html => {
          // only apply if nothing newer has come in since (avoids flicker/out-of-order writes on fast typing)
          if (myToken === ieHighlightToken) {
            document.getElementById("ie-highlight-code").innerHTML = html;
          }
        }).catch(err => {
          console.error("mcfunction highlight failed:", err);
          document.getElementById("ie-highlight-code").innerHTML = highlightMcfunctionFallback(code);
        });
        // return the fallback synchronously for the immediate paint; the
        // async result above will replace it a moment later.
        return highlightMcfunctionFallback(code);
      }
      loadMcfunctionHighlighter();
      return highlightMcfunctionFallback(code);
    }

    function highlightForExt(ext) {
      if (ext === "json") return highlightJSON;
      if (ext === "js") return highlightJS;
      if (ext === "mcfunction") return highlightMcfunction;
      return highlightPlain;
    }

    function renderHighlight() {
      if (!ieCurrentFile) return;
      const code = document.getElementById("ie-textarea").value;
      const ext = getExt(ieCurrentFile.name);
      const fn = highlightForExt(ext);
      document.getElementById("ie-highlight-code").innerHTML = fn(code) + "\n";
    }

    async function openInlineEditor(fileRef) {
      // re-find the file in the live allFiles array by id, rather than trusting
      // the object captured in the row's click closure — it's cheap and avoids
      // ever binding the editor to a stale/renamed copy of the file.
      const f = allFiles.find(x => x.id === fileRef.id) || fileRef;

      if (!f.save_id) {
        alert("This file doesn't have any save data yet.");
        return;
      }

      ieCurrentFile = f;
      const editorEl = document.getElementById("inline-editor");
      const textarea = document.getElementById("ie-textarea");

      // ---- permissions ----
      // owner/collaborator: full view + edit
      // logged in, not a collaborator: view only, no editing
      // not logged in: no viewing at all — blurred + blocked with a login prompt
      ieCanEditFile = isOwner || isCollab;
      const canView = isLoggedIn(); // owners/collabs are always logged in too

      editorEl.classList.toggle("ie-readonly", !ieCanEditFile);
      editorEl.classList.toggle("ie-blocked", !canView);
      textarea.readOnly = !ieCanEditFile;
      document.getElementById("ie-save-btn").style.display = ieCanEditFile ? "" : "none";
      document.getElementById("ie-undo-btn").style.display = ieCanEditFile ? "" : "none";
      document.getElementById("ie-redo-btn").style.display = ieCanEditFile ? "" : "none";

      document.getElementById("ie-filename").textContent = f.name;
      document.getElementById("ie-status").textContent = canView ? "loading..." : "";
      document.getElementById("ie-textarea").value = "";
      document.getElementById("ie-highlight-code").innerHTML = "";
      document.getElementById("inline-editor-overlay").classList.add("open");

      // not logged in: never fetch file contents at all
      if (!canView) return;

      try {
        const res = await fetch(`${AUTH}/save?id=${encodeURIComponent(f.save_id)}`, { credentials: "include" });
        let d = null;
        try { d = await res.json(); } catch (parseErr) { console.error("save response wasn't JSON:", parseErr); }

        if (!res.ok || !d) {
          const errMsg = (d && d.error) ? d.error : `failed to load (status ${res.status}).`;
          document.getElementById("ie-status").textContent = errMsg;
          console.error("inline editor load failed:", res.status, d);
          return;
        }

        ieOriginalContent = typeof d.content === "string" ? d.content : "";
        document.getElementById("ie-textarea").value = ieOriginalContent;
        document.getElementById("ie-status").textContent = ieCanEditFile ? "" : "you can view this file, but only the owner or collaborators can edit it.";
        renderHighlight();
      } catch (err) {
        console.error("inline editor load threw:", err);
        document.getElementById("ie-status").textContent = "failed to load file.";
      }
    }

    function closeInlineEditor() {
      if (ieCanEditFile && ieCurrentFile && document.getElementById("ie-textarea").value !== ieOriginalContent) {
        if (!confirm("you have unsaved changes. close anyway?")) return;
      }
      document.getElementById("inline-editor-overlay").classList.remove("open");
      document.getElementById("inline-editor").classList.remove("ie-readonly", "ie-blocked");
      ieCurrentFile = null;
    }

    function ieToggleWrap() {
      ieWrap = !ieWrap;
      const ws = ieWrap ? "pre-wrap" : "pre";
      document.getElementById("ie-textarea").style.whiteSpace = ws;
      document.getElementById("ie-highlight").style.whiteSpace = ws;
    }

    function ieUndo() { if (ieCanEditFile) document.execCommand("undo"); }
    function ieRedo() { if (ieCanEditFile) document.execCommand("redo"); }

    async function saveInlineFile() {
      if (!ieCurrentFile || !ieCanEditFile) return;
      const status = document.getElementById("ie-status");
      status.textContent = "saving...";
      try {
        const content = document.getElementById("ie-textarea").value;
        const res = await fetch(`${AUTH}/save`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ save_id: ieCurrentFile.save_id, filename: ieCurrentFile.name, content })
        });
        if (res.ok) {
          ieOriginalContent = content;
          status.textContent = "saved!";
          ieCurrentFile.updated_at = new Date().toISOString();
          renderFileList();
          setTimeout(() => { status.textContent = ""; }, 2000);
        } else {
          const d = await res.json();
          status.textContent = d.error || "failed to save.";
        }
      } catch { status.textContent = "error saving."; }
    }

    document.getElementById("ie-textarea")?.addEventListener("input", () => { if (ieCanEditFile) renderHighlight(); });
    document.getElementById("ie-textarea")?.addEventListener("scroll", () => {
      const hl = document.getElementById("ie-highlight");
      const ta = document.getElementById("ie-textarea");
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    });
    // block typing entirely when read-only, as an extra guard beyond the
    // readOnly attribute (covers paste-via-keyboard-shortcut edge cases)
    document.getElementById("ie-textarea")?.addEventListener("keydown", e => {
      if (!ieCanEditFile && !(e.ctrlKey || e.metaKey) && e.key.length === 1) e.preventDefault();
    });
    document.getElementById("ie-textarea")?.addEventListener("copy", e => {
      if (!isLoggedIn()) e.preventDefault();
    });
    document.getElementById("inline-editor-overlay").addEventListener("click", e => { if (e.target === e.currentTarget) closeInlineEditor(); });

    // ---- FIRST-TIME TUTORIAL ----
    let tutorialActive = false;
    let tutorialStep = 0;
    let tutorialWaitTimer = null;
    let tutorialCreatedId = null;

    const TUT_STEPS = [
      null,
      { text: "This is your project's file tree. Create a file or folder to continue.",
        target: () => unionRect(document.querySelector(".proj-header-actions"), document.querySelector(".file-panel")) },
      { text: "Click files here to open them.",
        target: () => document.querySelector(`.file-row[data-file-id="${tutorialCreatedId}"]`) || document.querySelector(".file-row") },
      { text: "This is where you'll write your file.", target: () => document.querySelector(".inline-editor") },
      { text: "Save stores your changes to your project.", target: () => document.querySelector(".ie-toolbar-actions .export-highlight") },
      { text: "Close the editor when you're done with it.", target: () => document.getElementById("ie-close-btn") },
      { text: "Project Settings lets you manage collaborators, tags, and danger-zone actions.", target: () => document.getElementById("tab-settings-btn") },
    ];

    // combines two elements' bounding boxes into one rect, so a highlight
    // can span, e.g., the toolbar buttons AND the file list beneath them
    function unionRect(elA, elB) {
      if (!elA && !elB) return null;
      if (!elA) return elB.getBoundingClientRect();
      if (!elB) return elA.getBoundingClientRect();
      const a = elA.getBoundingClientRect(), b = elB.getBoundingClientRect();
      const left = Math.min(a.left, b.left), top = Math.min(a.top, b.top);
      const right = Math.max(a.right, b.right), bottom = Math.max(a.bottom, b.bottom);
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }

    function shouldShowTutorial() {
      return isOwner && localStorage.getItem("tutorialComplete") !== "true";
    }

    function startTutorial() {
      tutorialActive = true;
      tutorialStep = 1;
      tutorialCreatedId = null;
      document.getElementById("tut-overlay").classList.add("open");
      renderTutorialStep();
    }

    function restartTutorial() {
      localStorage.removeItem("tutorialComplete");
      switchTab("files", document.getElementById("tab-files-btn"));
      startTutorial();
    }

    function skipTutorial() { completeTutorial(); }

    function completeTutorial() {
      tutorialActive = false;
      clearTimeout(tutorialWaitTimer);
      localStorage.setItem("tutorialComplete", "true");
      document.getElementById("tut-overlay").classList.remove("open");
    }

    function tutorialAdvance() {
      if (tutorialStep >= TUT_STEPS.length - 1) { completeTutorial(); return; }
      tutorialStep++;
      renderTutorialStep();
    }

    function renderTutorialStep() {
      const step = TUT_STEPS[tutorialStep];
      if (!step) return;
      document.getElementById("tut-card-step").textContent = `Step ${tutorialStep}/6`;
      document.getElementById("tut-card-text").textContent = step.text;
      const nextBtn = document.getElementById("tut-next-btn");
      nextBtn.style.display = "";
      nextBtn.textContent = tutorialStep === 6 ? "Finish" : "Next";
      positionTutorialSpotlight();
    }

    function positionTutorialSpotlight() {
      const step = TUT_STEPS[tutorialStep];
      const r = step && step.target();
      if (!r) { setTimeout(() => { if (tutorialActive) positionTutorialSpotlight(); }, 150); return; }
      const pad = 6;
      const x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
      const w = r.width + pad * 2, h = r.height + pad * 2;

      document.getElementById("tut-dim-top").style.cssText    = `left:0; top:0; right:0; height:${y}px;`;
      document.getElementById("tut-dim-bottom").style.cssText = `left:0; top:${y + h}px; right:0; bottom:0;`;
      document.getElementById("tut-dim-left").style.cssText   = `left:0; top:${y}px; width:${x}px; height:${h}px;`;
      document.getElementById("tut-dim-right").style.cssText  = `left:${x + w}px; top:${y}px; right:0; height:${h}px;`;
      document.getElementById("tut-hole").style.cssText = `left:${x}px; top:${y}px; width:${w}px; height:${h}px;`;

      const card = document.getElementById("tut-card");
      let cardTop = y + h + 12;
      let cardLeft = Math.min(Math.max(x, 8), window.innerWidth - 296);
      if (cardTop + 160 > window.innerHeight) cardTop = Math.max(8, y - 160);
      card.style.left = cardLeft + "px";
      card.style.top = cardTop + "px";
    }

    window.addEventListener("resize", () => { if (tutorialActive) positionTutorialSpotlight(); });

    // hook: creating a file/folder completes step 1, remembers which one was made
    const _origSubmitNewFile = submitNewFile;
    submitNewFile = async function() {
      const before = allFiles.length;
      await _origSubmitNewFile();
      if (tutorialActive && tutorialStep === 1 && allFiles.length > before) {
        tutorialCreatedId = allFiles[allFiles.length - 1].id;
        tutorialStep = 2;
        renderTutorialStep();
      }
    };

    // hook: opening a file completes step 2
    const _origOpenInlineEditor = openInlineEditor;
    openInlineEditor = async function(fileRef) {
      await _origOpenInlineEditor(fileRef);
      if (tutorialActive && tutorialStep === 2) { tutorialStep = 3; renderTutorialStep(); }
    };

    // hook: typing in the editor + a 3s pause completes step 3
    document.getElementById("ie-textarea")?.addEventListener("input", () => {
      if (!tutorialActive || tutorialStep !== 3) return;
      const ta = document.getElementById("ie-textarea");
      clearTimeout(tutorialWaitTimer);
      if (ta.value.trim().length > 0) {
        tutorialWaitTimer = setTimeout(() => {
          if (tutorialActive && tutorialStep === 3) { tutorialStep = 4; renderTutorialStep(); }
        }, 3000);
      }
    });

    // hook: saving completes step 4
    const _origSaveInlineFile = saveInlineFile;
    saveInlineFile = async function() {
      await _origSaveInlineFile();
      if (tutorialActive && tutorialStep === 4 && document.getElementById("ie-status").textContent === "saved!") {
        tutorialStep = 5; renderTutorialStep();
      }
    };

    // hook: closing the editor completes step 5
    const _origCloseInlineEditor = closeInlineEditor;
    closeInlineEditor = function() {
      const wasOpen = document.getElementById("inline-editor-overlay").classList.contains("open");
      _origCloseInlineEditor();
      const isNowClosed = !document.getElementById("inline-editor-overlay").classList.contains("open");
      if (tutorialActive && tutorialStep === 5 && wasOpen && isNowClosed) {
        tutorialStep = 6; renderTutorialStep();
      }
    };

    // kick off once the project has actually rendered
    const _origRender = render;
    render = function() {
      _origRender();
      if (shouldShowTutorial()) startTutorial();
    };
