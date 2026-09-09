/* project-api.js
 * Beacon is opened like this:
 *   mcbcode.com/editor/beacon?project=SHARE_CODE&file=FILE_ID&mode=structure
 *   mcbcode.com/editor/beacon?project=SHARE_CODE&file=FILE_ID&mode=model
 * (mode is inferred from the file extension if omitted: .mcstructure -> structure, .geo.json -> model)
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
  // recursively finds every block json under any root folder literally named RP
  // (case-insensitive), reads each one to get its REAL identifier and the
  // texture short-name it references, then matches that to the matching png
  // (also under RP) to build the custom block picker.
  async findCustomBlocks() {
    const byId = {};
    this.allFiles.forEach(f => byId[f.id] = f);
    const rp = this.allFiles.find(f => f.type === "folder" && f.parent_id === null && f.name.toUpperCase() === "RP");
    const bp = this.allFiles.find(f => f.type === "folder" && f.parent_id === null && f.name.toUpperCase() === "BP");
    if (!rp || !bp) return [];

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
    const blockJsons = this.allFiles.filter(f => f.type === "file" && f.name.toLowerCase().endsWith(".json") && isUnder(f, bp.id));

    // quick lookup: png "short name" (filename without extension) -> png file
    const pngByShortName = {};
    pngs.forEach(png => {
      const shortName = png.name.replace(/\.png$/i, "").toLowerCase();
      pngByShortName[shortName] = png;
    });

    const results = [];
    console.log("[findCustomBlocks] found", blockJsons.length, "json files under RP:", blockJsons.map(f => f.name));

    for (const jsonFile of blockJsons) {
      try {
        if (!jsonFile.save_id) continue; // json file with no content saved yet, skip
        const res = await fetch(`${AUTH}/save?id=${jsonFile.save_id}&_=${Date.now()}`, { credentials: "include", cache: "no-store" });
        if (!res.ok) continue;
        const saveData = await res.json();
        const data = JSON.parse(saveData.content);

        const block = data["minecraft:block"];
        if (!block) { console.log("[findCustomBlocks] skipped", jsonFile.name, "- no minecraft:block key"); continue; }

        const identifier = block.description && block.description.identifier;
        if (!identifier) { console.log("[findCustomBlocks] skipped", jsonFile.name, "- no identifier"); continue; }

        // grab the texture reference out of material_instances (usually under "*")
        const mats = block.components && block.components["minecraft:material_instances"];
        let textureRef = null;
        if (mats) {
          const firstKey = Object.keys(mats)[0];
          if (firstKey) textureRef = mats[firstKey].texture;
        }
        if (!textureRef) { console.log("[findCustomBlocks] skipped", jsonFile.name, "- no textureRef, mats was", mats); continue; }

        // textureRef looks like "pa:ceiling_tile_two" - we only need the part after the colon
        const textureShortName = textureRef.includes(":") ? textureRef.split(":")[1] : textureRef;
        const png = pngByShortName[textureShortName.toLowerCase()];
        if (!png) { console.log("[findCustomBlocks] skipped", jsonFile.name, "- textureShortName", textureShortName, "not found in pngByShortName", Object.keys(pngByShortName)); continue; }

        console.log("[findCustomBlocks] matched", identifier);

        
        results.push({
          identifier: identifier,
          displayName: identifier.includes(":") ? identifier.split(":")[1] : identifier,
          fileId: png.id,
          textureUrl: `${AUTH}/project/asset?file_id=${png.id}`
        });
      } catch {
        // bad/unreadable json, just skip that one instead of breaking the whole picker
        continue;
      }
    }

    return results;
  },

  // fetches the raw bytes of the current file (mcstructure binary, or geo.json text).
  // returns null for a brand new file that hasn't been saved yet (no r2_key
  // yet, so the asset endpoint 404s) — that's a normal "blank" state, not an
  // error, and the editor should just start empty in that case.
  async fetchCurrentFileBytes() {
    if (!this.currentFile) return null;
    const res = await fetch(`${AUTH}/project/asset?file_id=${this.currentFile.id}&_=${Date.now()}`, { credentials: "include", cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("failed to load file (status " + res.status + ")");
    const buf = await res.arrayBuffer();
    return buf.byteLength === 0 ? null : buf;
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
