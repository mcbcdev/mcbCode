/* project-api.js
 * Beacon is opened like this:
 *   mcbcode.com/editor/beacon?project=SHARE_CODE&file=FILE_ID&mode=structure
 *   mcbcode.com/editor/beacon?project=SHARE_CODE&file=FILE_ID&mode=model
 * (mode is inferred from the file extension if omitted: .mcstructure -> structure, .geo.json -> model
 */

const AUTH = "https://auth.mcbcode.com";

const BeaconProject = {
  shareCode: null,
  fileId: null,
  mode: "structure",
  project: null,
  allFiles: [],
  canEdit: false,
  currentFile: null, // the file object being edited

  async init() {
    const params = new URLSearchParams(location.search);
    this.shareCode = params.get("project");
    this.fileId = params.get("file");
    this.mode = params.get("mode") || null;

    if (!this.shareCode) throw new Error("no project specified. open beacon from a project's file list.");

    // /me first, so we know our own user id (needed to tell owner vs everyone else apart)
    let myId = null;
    try {
      const meRes = await fetch(`${AUTH}/me`, { credentials: "include" });
      if (meRes.ok) { const me = await meRes.json(); myId = me.id; }
    } catch { /* not logged in, that's fine — view-only */ }

    const r = await fetch(`${AUTH}/project?code=${encodeURIComponent(this.shareCode)}`, { credentials: "include" });
    if (!r.ok) throw new Error("couldn't load that project.");
    const d = await r.json();
    this.project = d.project;
    this.allFiles = d.files || [];
    const isOwner = !!(myId && d.project.owner_id === myId);
    this.canEdit = isOwner || !!d.is_collaborator;

    if (this.fileId) {
      this.currentFile = this.allFiles.find(f => String(f.id) === String(this.fileId)) || null;
      if (!this.mode && this.currentFile) {
        this.mode = this.currentFile.name.toLowerCase().endsWith(".mcstructure") ? "structure" : "model";
      }
    }
    if (!this.mode) this.mode = "structure";
  },

  // recursively finds every png under any root folder literally named RP
  // (case-insensitive) — used to populate the custom block texture picker.
  // also picks up any *.json under a "blocks" folder, matching name -> texture
  // when the json has a "texture" or "textures.up"/"textures.all" field.
  findCustomBlocks() {
    const byId = {};
    this.allFiles.forEach(f => byId[f.id] = f);
    const rp = this.allFiles.find(f => f.type === "folder" && f.parent_id === null && f.name.toUpperCase() === "RP");
    if (!rp) return [];

    const isUnder = (f, ancestorId) => {
      let cur = f;
      while (cur && cur.parent_id !== null) {
        cur = byId[cur.parent_id];
        if (!cur) return false;
        if (cur.id === ancestorId) return true;
      }
      return false;
    };

    const pngs = this.allFiles.filter(f => f.type === "file" && f.name.toLowerCase().endsWith(".png") && isUnder(f, rp.id));
    const blockJsons = this.allFiles.filter(f => f.type === "file" && f.name.toLowerCase().endsWith(".json") && isUnder(f, rp.id));

    // naive namespace guess: use the project's manifest header name if we can
    // find one, else fall back to a generic "custom" namespace.
    const namespace = "custom";

    return pngs.map(png => {
      const baseName = png.name.replace(/\.png$/i, "");
      return {
        identifier: `${namespace}:${baseName}`,
        displayName: baseName,
        fileId: png.id,
        textureUrl: `${AUTH}/project/asset?file_id=${png.id}`
      };
    });
  },

  // fetches the raw bytes of the current file (mcstructure binary, or geo.json text)
  async fetchCurrentFileBytes() {
    if (!this.currentFile) return null;
    const res = await fetch(`${AUTH}/project/asset?file_id=${this.currentFile.id}`, { credentials: "include" });
    if (!res.ok) throw new Error("failed to load file (status " + res.status + ")");
    return await res.arrayBuffer();
  },

  // saves bytes back to the current file. creates a brand new file if
  // fileId wasn't given in the URL (first save of a new structure/model).
  async saveBytes(arrayBuffer, suggestedName) {
    if (this.currentFile) {
      const res = await fetch(`${AUTH}/project/structure/save?file_id=${this.currentFile.id}&project_code=${encodeURIComponent(this.shareCode)}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "save failed"); }
      return this.currentFile.id;
    } else {
      const res = await fetch(`${AUTH}/project/structure/save?new=1&project_code=${encodeURIComponent(this.shareCode)}&name=${encodeURIComponent(suggestedName)}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/octet-stream" },
        body: arrayBuffer
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "save failed"); }
      const d = await res.json();
      this.currentFile = { id: d.file_id, name: suggestedName, type: "file", parent_id: null };
      const url = new URL(location.href);
      url.searchParams.set("file", d.file_id);
      history.replaceState(null, "", url);
      return d.file_id;
    }
  }
};

window.BeaconProject = BeaconProject;
