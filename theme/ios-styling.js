/* Optional iOS-inspired theme. Disabled unless the user enables it in Settings. */
(() => {
  const STORAGE_KEY = "mcbcode-ios-styling-v1";
  const SUPPORTED_PATHS = new Set([
    "/dashboard.html", "/dripstone.html", "/explore.html",
    "/dashboard", "/dripstone", "/explore"
  ]);
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (!SUPPORTED_PATHS.has(path)) return;

  const CONTROL_SELECTOR = [
    "button",
    '[role="button"]',
    "a.btn",
    "a.nav-btn",
    "a.icon-btn",
    'a[class*="-btn"]',
    "a.link-item",
    "a.explore-tab",
    "a.discover-chip",
    "a.sort-btn"
  ].join(",");
  const glassGroups = new Map();
  let observer = null;
  let scanTimer = 0;
  let scanning = false;
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

  function getVisibleControls(root) {
    return Array.from(root.children).filter(element =>
      element.matches(CONTROL_SELECTOR) && element.getClientRects().length > 0
    );
  }

  function sameControls(a, b) {
    return a.length === b.length && a.every((element, index) => element === b[index]);
  }

  function destroyGroup(root, record) {
    if (record.instance) record.instance.destroy();
    record.elements.forEach((element, index) => {
      const previous = record.previousConfigs[index];
      if (previous === null) element.removeAttribute("data-config");
      else element.setAttribute("data-config", previous);
    });
    if (glassGroups.get(root) === record) glassGroups.delete(root);
  }

  async function initGroup(root, elements, LiquidGlass) {
    const existing = glassGroups.get(root);
    if (existing && sameControls(existing.elements, elements)) return;
    if (existing) destroyGroup(root, existing);
    if (!elements.length || !isEnabled()) return;

    const record = {
      elements,
      instance: null,
      previousConfigs: elements.map(element => element.hasAttribute("data-config") ? element.getAttribute("data-config") : null)
    };
    glassGroups.set(root, record);

    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      element.dataset.config = JSON.stringify({
        button: true,
        blurAmount: 0.16,
        refraction: 0.28,
        chromAberration: 0.015,
        edgeHighlight: 0.14,
        specular: 0.2,
        fresnel: 0.6,
        cornerRadius: Math.max(12, Math.round(Math.min(rect.height / 2, rect.width / 2))),
        shadowOpacity: 0.14,
        shadowSpread: 5,
        shadowOffsetY: 2,
        opacity: 0.92
      });
    });

    try {
      const instance = await LiquidGlass.init({
        root,
        glassElements: elements,
        defaults: { blurAmount: 0.16, refraction: 0.28, edgeHighlight: 0.14 }
      });
      if (glassGroups.get(root) !== record || !isEnabled()) {
        instance.destroy();
        return;
      }
      record.instance = instance;
    } catch (error) {
      if (glassGroups.get(root) === record) destroyGroup(root, record);
      console.warn("iOS styling: liquidglass did not start; CSS styling remains enabled.", error);
    }
  }

  async function scanControls() {
    if (scanning) {
      scanAgain = true;
      return;
    }
    scanning = true;
    do {
      scanAgain = false;
      if (!isEnabled() || !liquidGlassModule) break;

      const groups = new Map();
      document.querySelectorAll(CONTROL_SELECTOR).forEach(element => {
        const root = element.parentElement;
        if (!root || !element.getClientRects().length) return;
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(element);
      });

      for (const [root, record] of Array.from(glassGroups.entries())) {
        const next = groups.get(root) || [];
        if (!sameControls(record.elements, next)) destroyGroup(root, record);
      }

      for (const [root, elements] of groups) {
        if (!isEnabled()) break;
        await initGroup(root, elements, liquidGlassModule.LiquidGlass);
      }
    } while (scanAgain && isEnabled());
    scanning = false;
  }

  function scheduleScan() {
    if (!isEnabled()) return;
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => { void scanControls(); }, 140);
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
          attributeFilter: ["class", "style", "hidden", "disabled", "aria-hidden"]
        });
      }
      scheduleScan();
    } catch (error) {
      console.warn("iOS styling: liquidglass could not be loaded; CSS styling remains enabled.", error);
    }
  }

  function deactivate() {
    active = false;
    setDocumentTheme(false);
    window.clearTimeout(scanTimer);
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
  window.addEventListener("pagehide", deactivate, { once: true });

  setDocumentTheme(isEnabled());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncPreference, { once: true });
  } else {
    syncPreference();
  }
})();
