// ============================================================================
// STATE.JS - Global state, initialization, and core data management
// ============================================================================
// Handles: project data, file cache, user permissions, URL/history management,
// guardrails system, initial page load, and back/forward navigation

const AUTH = "https://auth.mcbcode.com";
let shareCode = location.pathname.split("/").filter(Boolean)[1] || "";
const urlBase = location.pathname.split("/").filter(Boolean)[0] || "project";

let project         = null;
let allFiles        = [];
let isOwner         = false;
let isCollab        = false;
let currentPath     = [];

// pending actions
let pendingDelId    = null;
let pendingDelIsCritical = false;
let newFileType     = "folder";
let newFileParentId = null;
let pendingRenameId   = null;
let pendingRenameType = null;
let pendingDangerAction = null;
let pendingSnapshotAction = null;
let openImagePreview = null;
let collabAcDebounce = null;

const CRITICAL_FILENAMES = ["manifest.json", "pack_icon.png"];

const DEFAULT_GUARDRAILS = {
  "manifest.json": ["/BP/", "/RP/"]
};
let guardrails = DEFAULT_GUARDRAILS;

// ---- URL <-> folder path helpers ----
function buildPathUrl(pathArr) {
  const base = `/project/${shareCode}`;
  if (!pathArr.length) return base;
  return base + "/" + pathArr.map(c => encodeURIComponent(c.name)).join("/");
}

function pushPath(pathArr) {
  const url = buildPathUrl(pathArr);
  if (location.pathname !== url) history.pushState({ path: pathArr.map(c => c.name) }, "", url);
}

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
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.slice(2).map(p => decodeURIComponent(p));
}

function resolveInitialPath() {
  const names = getFolderNamesFromLocation();
  currentPath = resolveFolderNames(names);
  const normalizedUrl = buildPathUrl(currentPath);
  if (location.pathname !== normalizedUrl) {
    history.replaceState({ path: currentPath.map(c => c.name) }, "", normalizedUrl);
  }
}

// ---- GUARDRAILS (beginner-friendly file placement rules) ----
async function loadGuardrails() {
  try {
    const r = await fetch("/project/guardrails.json");
    if (r.ok) guardrails = await r.json();
  } catch { /* fall back to defaults */ }
}

function globToRegex(pattern) {
  let re = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  re = re.replace(/\*\*/g, "§§DBL§§");
  re = re.replace(/\*/g, "[^/]*");
  re = re.replace(/§§DBL§§/g, ".*");
  return new RegExp("^" + re + "$");
}

function normFolder(p) { return (p.endsWith("/") ? p : p + "/"); }

function checkGuardrail(fileName, folderSegments) {
  const folderPath = "/" + folderSegments.join("/") + (folderSegments.length ? "/" : "");
  const rules = guardrails || {};

  const exactKey = Object.keys(rules).find(k => !k.startsWith(".") && k.toLowerCase() === fileName.toLowerCase());
  if (exactKey) {
    const patterns = rules[exactKey];
    const ok = patterns.some(p => globToRegex(normFolder(p)).test(folderPath));
    if (!ok) {
      return { ok: false, message: `${exactKey} can only exist in one of these locations: ${patterns.join(", ")}` };
    }
    return { ok: true };
  }

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

  return { ok: true };
}

// ---- restore real url after 404.html spa redirect ----
(function restoreSpaPath() {
  const saved = sessionStorage.getItem("spa-redirect");
  if (saved) {
    sessionStorage.removeItem("spa-redirect");
    history.replaceState(null, "", saved);
  }
})();

// ---- INIT ----
(async () => {
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
  
  if (!window._editorMode) window._editorMode = "inline";
  
  try {
    const r = await fetch(`${AUTH}/project?code=${encodeURIComponent(shareCode)}`, { credentials: "include" });
    if (!r.ok) { const d = await r.json(); return showErr(d.error || "Not found."); }
    const d = await r.json();
    project  = d.project;
    allFiles = d.files || [];
    isOwner  = window._myId && project.owner_id === window._myId;
    isCollab = !!d.is_collaborator;
    project.watcher_count = d.watcher_count || 0;
    project.is_watching = !!d.is_watching;
    resolveInitialPath();
    render();
  } catch { showErr("Failed to load project."); }
})();

// ---- back/forward support ----
window.addEventListener("popstate", () => {
  if (!allFiles.length && !project) return;
  const names = getFolderNamesFromLocation();
  currentPath = resolveFolderNames(names);
  renderFileList();
});

// ---- fix: force a real reload if page is restored from bfcache ----
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

function removeFromCache(id) {
  allFiles.filter(f => f.parent_id === id).forEach(c => removeFromCache(c.id));
  const i = allFiles.findIndex(f => f.id === id);
  if (i !== -1) allFiles.splice(i, 1);
}

function currentFolderId() { return currentPath.length ? currentPath[currentPath.length - 1].id : null; }
function isAtRoot() { return currentPath.length === 0; }
const canEdit = () => isOwner || isCollab;
const isLoggedIn = () => !!window._myId;
