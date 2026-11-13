/* Optional iOS-inspired theme. Disabled unless the user enables it in Settings. */
(() => {
  const STORAGE_KEY = "mcbcode-ios-styling-v1";
  const SUPPORTED_PATHS = new Set([
    "/dashboard.html", "/dripstone.html", "/explore.html",
    "/dashboard", "/dripstone", "/explore"
  ]);
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (!SUPPORTED_PATHS.has(path)) return;

  const glassGroups = new Map();
  let observer = null;
  let scanTimer = 0;
  let scanInProgress = false;
  let scanAgain = false;
  let active = false;
  let liquidGlassModule = null;

  function isEnabled() {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; }
    catch { return false; }
  }

  function setDocumentTheme(enabled) {
    if (enabled) document.documentElement.dataset.iosStyling = "true";
    else document.documentElement.removeAttribute("data-ios-styling");
  }

  function getSurfaceSpecs() {
    if (path === "/dashboard.html" || path === "/dashboard") {
      return [{ root: document.body, selector: ":scope > .topnav" }];
    }
    if (path === "/dripstone.html" || path === "/dripstone") {
      const app = document.body && document.body.querySelector(":scope > .app");
      return [
        { root: document.body, selector: ":scope > .sidebar" },
        ...(app ? [{ root: app, selector: ":scope > .mobile-bar" }] : [])
      ];
    }
    if (path === "/explore.html" || path === "/explore") {
      return [{ root: document.body, selector: ":scope > #compose-bar" }];
    }
    return [];
  }

  function getVisibleSurfaces(root, selector) {
    return Array.from(root.querySelectorAll(selector)).filter(element => {
      if (element.parentElement !== root) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
    });
  }

  function sameElements(a, b) {
    return a.length === b.length && a.every((element, index) => element === b[index]);
  }

  function restoreConfigs(record) {
    record.elements.forEach((element, index) => {
      const previous = record.previousConfigs[index];
      if (previous === null) element.removeAttribute("data-config");
      else element.setAttribute("data-config", previous);
    });
  }

  function destroyGroup(root, record) {
    if (record.contentObserver) record.contentObserver.disconnect();
    if (record.instance) record.instance.destroy();
    restoreConfigs(record);
    if (glassGroups.get(root) === record) glassGroups.delete(root);
  }

  function observeSceneChanges(root, record) {
    const glassSurfaces = new Set(record.elements);
    const dirtyChildren = new Set();
    let markFrame = 0;
    let markEverything = false;

    function rootChildFor(node) {
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      while (node && node.parentElement !== root) node = node.parentElement;
      return node && node.parentElement === root ? node : null;
    }

    function queueMark() {
      if (markFrame) return;
      markFrame = requestAnimationFrame(() => {
        markFrame = 0;
        if (!isEnabled() || glassGroups.get(root) !== record || !record.instance) return;
        if (markEverything) {
          record.instance.markChanged();
          markEverything = false;
        } else {
          dirtyChildren.forEach(element => record.instance.markChanged(element));
        }
        dirtyChildren.clear();
      });
    }

    record.contentObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.target === root) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (!glassSurfaces.has(node)) dirtyChildren.add(node);
          }
          if (mutation.removedNodes.length) markEverything = true;
          continue;
        }

        const directChild = rootChildFor(mutation.target);
        if (directChild && !glassSurfaces.has(directChild)) dirtyChildren.add(directChild);
      }
      if (dirtyChildren.size || markEverything) queueMark();
    });
    record.contentObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"]
    });
  }

  async function initGroup(root, elements, LiquidGlass) {
    const existing = glassGroups.get(root);
    if (existing && sameElements(existing.elements, elements)) return;
    if (existing) destroyGroup(root, existing);
    if (!elements.length || !isEnabled()) return;

    const record = {
      elements,
      instance: null,
      contentObserver: null,
      previousConfigs: elements.map(element => element.hasAttribute("data-config") ? element.getAttribute("data-config") : null)
    };
    glassGroups.set(root, record);

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      element.dataset.config = JSON.stringify({
        blurAmount: 0.16,
        refraction: 0.28,
        chromAberration: 0.018,
        edgeHighlight: 0.05,
        specular: 0,
        fresnel: 0.2,
        brightness: -0.16,
        tintStrength: 0.08,
        cornerRadius: Math.max(16, Math.min(28, Math.round(Math.min(rect.height / 2, rect.width / 2)))),
        shadowOpacity: 0.15,
        shadowSpread: 7,
        shadowOffsetY: 3,
        opacity: 0.3
      });
    });

    try {
      const instance = await LiquidGlass.init({
        root,
        glassElements: elements,
        defaults: { blurAmount: 0.16, refraction: 0.28, edgeHighlight: 0.05, specular: 0, fresnel: 0.2, brightness: -0.16, tintStrength: 0.08, opacity: 0.3 }
      });
      if (glassGroups.get(root) !== record || !isEnabled()) {
        instance.destroy();
        restoreConfigs(record);
        return;
      }
      record.instance = instance;
      observeSceneChanges(root, record);
      instance.markChanged();
    } catch (error) {
      if (glassGroups.get(root) === record) destroyGroup(root, record);
      console.warn("iOS styling: liquidglass did not start; CSS styling remains enabled.", error);
    }
  }

  async function scanSurfaces() {
    if (scanInProgress) {
      scanAgain = true;
      return;
    }
    scanInProgress = true;
    do {
      scanAgain = false;
      if (!isEnabled() || !liquidGlassModule) break;

      const groups = new Map();
      getSurfaceSpecs().forEach(({ root, selector }) => {
        if (!root) return;
        const surfaces = getVisibleSurfaces(root, selector);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(...surfaces);
      });

      for (const [root, record] of Array.from(glassGroups.entries())) {
        const next = groups.get(root) || [];
        if (!sameElements(record.elements, next)) destroyGroup(root, record);
      }

      for (const [root, elements] of groups) {
        if (!isEnabled()) break;
        await initGroup(root, elements, liquidGlassModule.LiquidGlass);
      }
    } while (scanAgain && isEnabled());
    scanInProgress = false;
  }

  function scheduleScan() {
    if (!isEnabled()) return;
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => { void scanSurfaces(); }, 180);
  }

  async function activate() {
    if (!isEnabled()) return;
    setDocumentTheme(true);
    active = true;
    try {
      if (!liquidGlassModule) {
        liquidGlassModule = await import("https://cdn.jsdelivr.net/npm/@ybouane/liquidglass@1.0.3/dist/index.js");
      }
      if (!isEnabled()) return;
      if (!observer && document.body) {
        observer = new MutationObserver(scheduleScan);
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "style", "hidden", "aria-hidden"]
        });
      }
      window.addEventListener("resize", scheduleScan, { passive: true });
      scheduleScan();
    } catch (error) {
      console.warn("iOS styling: liquidglass could not be loaded; CSS styling remains enabled.", error);
    }
  }

  function deactivate() {
    active = false;
    setDocumentTheme(false);
    window.clearTimeout(scanTimer);
    window.removeEventListener("resize", scheduleScan);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    for (const [root, record] of Array.from(glassGroups.entries())) destroyGroup(root, record);
  }

  function syncPreference() {
    if (isEnabled()) {
      if (!active) void activate();
    } else if (active || glassGroups.size) {
      deactivate();
    }
  }

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY || event.key === null) syncPreference();
  });
  window.addEventListener("pagehide", deactivate);
  window.addEventListener("pageshow", syncPreference);

  setDocumentTheme(isEnabled());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncPreference, { once: true });
  } else {
    syncPreference();
  }
})();
