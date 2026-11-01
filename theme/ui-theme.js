(function () {
  const STORAGE_KEY = "mcbcode-ui-theme-v1";
  const DEFAULT_THEME = {
    mode: "dark",
    colors: { bg: "#0c0c0c", surface: "#161719", text: "#c8c8c8", accent: "#05ee93" }
  };
  const PRESETS = {
    dark: { bg: "#0c0c0c", surface: "#161719", text: "#c8c8c8", accent: "#05ee93" },
    light: { bg: "#f4f6f8", surface: "#ffffff", text: "#344054", accent: "#006b52" },
    ocean: { bg: "#0c1720", surface: "#122631", text: "#cadce5", accent: "#33d6c0" },
    sunset: { bg: "#24151d", surface: "#35202c", text: "#f0dce5", accent: "#ff9b72" },
    forest: { bg: "#102018", surface: "#1b3025", text: "#d5e9dc", accent: "#73d99a" },
    lavender: { bg: "#1b1727", surface: "#292337", text: "#e7def7", accent: "#bba2ff" },
    rose: { bg: "#281720", surface: "#39212e", text: "#f3dce6", accent: "#ff8ab6" },
    ember: { bg: "#201512", surface: "#30211b", text: "#f4e2d8", accent: "#ff9c5b" },
    sandstone: { bg: "#f3ead9", surface: "#fffaf0", text: "#47392e", accent: "#80542f" }
  };
  const STATIC_TOKEN_THEMES = new Set(["dark", "light", "ocean"]);
  const COLOR_KEYS = ["bg", "surface", "text", "accent"];
  let savedTheme = readSavedTheme();

  function isKnownTheme(mode) {
    return mode === "custom" || Object.prototype.hasOwnProperty.call(PRESETS, mode);
  }

  function isColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  function normalizeHex(value) {
    const trimmed = String(value || "").trim();
    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toLowerCase() : null;
  }

  function readSavedTheme() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!value || !isKnownTheme(value.mode)) return { mode: DEFAULT_THEME.mode, colors: { ...DEFAULT_THEME.colors } };
      const colors = {};
      for (const key of COLOR_KEYS) colors[key] = isColor(value.colors?.[key]) ? value.colors[key] : DEFAULT_THEME.colors[key];
      return { mode: value.mode, colors };
    } catch {
      return { mode: DEFAULT_THEME.mode, colors: { ...DEFAULT_THEME.colors } };
    }
  }

  function luminance(hex) {
    const channels = hex.slice(1).match(/.{2}/g).map(part => parseInt(part, 16) / 255).map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2
    );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrastRatio(first, second) {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }

  function applyTheme(theme, persist) {
    const root = document.documentElement;
    const mode = isKnownTheme(theme.mode) ? theme.mode : "dark";
    const colors = mode === "custom" ? theme.colors : (PRESETS[mode] || PRESETS.dark);
    const backgroundTone = luminance(colors.bg) > 0.46 ? "light" : "dark";
    const accentInk = contrastRatio("#111214", colors.accent) >= contrastRatio("#ffffff", colors.accent) ? "#111214" : "#ffffff";

    root.dataset.uiTheme = mode;
    root.dataset.uiTone = backgroundTone;
    for (const key of COLOR_KEYS) root.style.setProperty(`--ui-${key}`, colors[key]);
    root.style.setProperty("--ui-on-accent", accentInk);

    const toneSemanticColors = backgroundTone === "light" ? {
      info: "#006ca8", danger: "#b42318", success: "#167a4a", warning: "#8b5a00",
      purple: "#7042a0", pink: "#ad286d", overlay: "rgba(24, 33, 43, .34)",
      "overlay-strong": "rgba(24, 33, 43, .52)", "shadow-soft": "rgba(24, 33, 43, .08)", shadow: "rgba(24, 33, 43, .16)"
    } : {
      info: "#00b2ff", danger: "#ff7373", success: "#45c993", warning: "#f2bd4b",
      purple: "#c58be8", pink: "#ed66b5", overlay: "rgba(0, 0, 0, .65)",
      "overlay-strong": "rgba(0, 0, 0, .78)", "shadow-soft": "rgba(0, 0, 0, .16)", shadow: "rgba(0, 0, 0, .48)"
    };
    const dynamicTokenKeys = ["info", "danger", "success", "success-soft", "warning", "purple", "pink", "overlay", "overlay-strong", "shadow-soft", "shadow", "text-strong", "premium-border", "topbar", "ink"];
    if (mode === "custom" || !STATIC_TOKEN_THEMES.has(mode)) {
      for (const key of dynamicTokenKeys) root.style.removeProperty(`--ui-${key}`);
      for (const [key, value] of Object.entries(toneSemanticColors)) root.style.setProperty(`--ui-${key}`, value);
      root.style.setProperty("--ui-success-soft", `color-mix(in srgb, var(--ui-success) 9%, transparent)`);
      root.style.setProperty("--ui-text-strong", colors.text);
      root.style.setProperty("--ui-topbar", `color-mix(in srgb, ${colors.surface} 90%, transparent)`);
      root.style.setProperty("--ui-premium-border", `color-mix(in srgb, var(--ui-purple) 38%, var(--ui-surface))`);
      root.style.setProperty("--ui-ink", backgroundTone === "light" ? "#111827" : "#111214");
    } else {
      for (const key of dynamicTokenKeys) root.style.removeProperty(`--ui-${key}`);
    }

    savedTheme = { mode, colors: { ...colors } };
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTheme)); } catch {}
    }
    updatePreview(colors);
  }

  function updatePreview(colors) {
    const preview = document.querySelector(".ui-theme-preview");
    if (!preview) return;
    const main = preview.querySelector("[data-preview-main]");
    const surface = preview.querySelector("[data-preview-surface]");
    const accent = preview.querySelector("[data-preview-accent]");
    main.style.backgroundColor = colors.bg;
    main.style.color = colors.text;
    surface.style.backgroundColor = colors.surface;
    surface.style.color = colors.text;
    accent.style.backgroundColor = colors.accent;
    const accentInk = contrastRatio("#111214", colors.accent) >= contrastRatio("#ffffff", colors.accent) ? "#111214" : "#ffffff";
    accent.style.color = accentInk;
    document.querySelectorAll(".ui-theme-dialog [data-swatch]").forEach(swatch => {
      swatch.style.backgroundColor = colors[swatch.dataset.swatch];
    });
    const warning = document.querySelector(".ui-theme-contrast");
    if (warning) {
      const readable = contrastRatio(colors.bg, colors.text) >= 4.5 && contrastRatio(colors.surface, colors.text) >= 4.5 && contrastRatio(colors.accent, accentInk) >= 4.5;
      warning.textContent = readable ? "text contrast looks good." : "some text may be hard to read; try a lighter or darker text color.";
      warning.classList.toggle("warning", !readable);
    }
  }

  function addPicker() {
    const trigger = document.querySelector("#ui-theme-trigger");
    if (!trigger) return;

    const dialog = document.createElement("dialog");
    dialog.className = "ui-theme-dialog";
    dialog.id = "ui-theme-dialog";
    dialog.setAttribute("aria-labelledby", "ui-theme-title");
    const presetOptions = Object.keys(PRESETS).map(name => `<option value="${name}">${name}</option>`).join("");
    dialog.innerHTML = `
      <div class="ui-theme-dialog-inner">
        <div class="ui-theme-heading">
          <h2 id="ui-theme-title">appearance</h2>
          <button class="ui-theme-close" type="button" aria-label="close theme settings">x</button>
        </div>
        <div class="ui-theme-field">
          <label for="ui-theme-mode">theme</label>
          <select class="ui-theme-select" id="ui-theme-mode">
            ${presetOptions}
            <option value="custom">custom</option>
          </select>
        </div>
        <div class="ui-theme-colors" id="ui-theme-colors" hidden>
          <label class="ui-theme-color">background<span class="ui-theme-color-control"><span class="ui-theme-swatch" data-swatch="bg" aria-hidden="true"></span><input data-color="bg" type="text" inputmode="text" maxlength="7" autocomplete="off" spellcheck="false" placeholder="#0c0c0c" aria-label="background hex color"></span></label>
          <label class="ui-theme-color">surface<span class="ui-theme-color-control"><span class="ui-theme-swatch" data-swatch="surface" aria-hidden="true"></span><input data-color="surface" type="text" inputmode="text" maxlength="7" autocomplete="off" spellcheck="false" placeholder="#161719" aria-label="surface hex color"></span></label>
          <label class="ui-theme-color">text<span class="ui-theme-color-control"><span class="ui-theme-swatch" data-swatch="text" aria-hidden="true"></span><input data-color="text" type="text" inputmode="text" maxlength="7" autocomplete="off" spellcheck="false" placeholder="#c8c8c8" aria-label="text hex color"></span></label>
          <label class="ui-theme-color">accent<span class="ui-theme-color-control"><span class="ui-theme-swatch" data-swatch="accent" aria-hidden="true"></span><input data-color="accent" type="text" inputmode="text" maxlength="7" autocomplete="off" spellcheck="false" placeholder="#05ee93" aria-label="accent hex color"></span></label>
        </div>
        <p class="ui-theme-input-message" id="ui-theme-input-message" role="status" aria-live="polite" hidden></p>
        <div class="ui-theme-preview" aria-label="theme color preview">
          <div class="ui-theme-preview-tile" data-preview-main>page text</div>
          <div class="ui-theme-preview-tile" data-preview-surface>surface</div>
          <div class="ui-theme-preview-tile" data-preview-accent>accent</div>
        </div>
        <p class="ui-theme-contrast" role="status" aria-live="polite"></p>
        <p class="ui-theme-note">your selection is saved in this browser and shared across mcbCode pages with theme support.</p>
        <button class="ui-theme-reset" type="button">reset to dark</button>
      </div>`;
    document.body.appendChild(dialog);

    const modeSelect = dialog.querySelector("#ui-theme-mode");
    const colorFields = dialog.querySelector("#ui-theme-colors");
    const colorInputs = dialog.querySelectorAll("[data-color]");
    const closeButton = dialog.querySelector(".ui-theme-close");
    const inputMessage = dialog.querySelector("#ui-theme-input-message");

    function setInputMessage(message) {
      inputMessage.textContent = message;
      inputMessage.hidden = !message;
    }

    function syncPicker(theme) {
      modeSelect.value = theme.mode;
      colorFields.hidden = theme.mode !== "custom";
      for (const input of colorInputs) {
        input.value = theme.colors[input.dataset.color];
        input.removeAttribute("aria-invalid");
      }
      setInputMessage("");
      updatePreview(theme.mode === "custom" ? theme.colors : PRESETS[theme.mode]);
    }

    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", dialog.id);
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      syncPicker(savedTheme);
      dialog.showModal();
      trigger.setAttribute("aria-expanded", "true");
      closeButton.focus();
    });
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    modeSelect.addEventListener("change", () => {
      const mode = modeSelect.value;
      const theme = { mode, colors: mode === "custom" ? { ...savedTheme.colors } : { ...PRESETS[mode] } };
      colorFields.hidden = mode !== "custom";
      applyTheme(theme, true);
      syncPicker(savedTheme);
    });
    colorInputs.forEach(input => {
      input.addEventListener("input", () => {
        const value = normalizeHex(input.value);
        if (!value) {
          input.setAttribute("aria-invalid", "true");
          setInputMessage("enter a 6-digit hex color, such as #05ee93.");
          return;
        }
        input.value = value;
        input.removeAttribute("aria-invalid");
        setInputMessage("");
        const colors = { ...savedTheme.colors, [input.dataset.color]: value };
        applyTheme({ mode: "custom", colors }, true);
      });
      input.addEventListener("blur", () => {
        if (input.getAttribute("aria-invalid") !== "true") return;
        input.value = savedTheme.colors[input.dataset.color];
        input.removeAttribute("aria-invalid");
        setInputMessage("");
      });
    });
    dialog.querySelector(".ui-theme-reset").addEventListener("click", () => {
      applyTheme({ mode: "dark", colors: { ...PRESETS.dark } }, true);
      syncPicker(savedTheme);
    });
  }

  applyTheme(savedTheme, false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addPicker, { once: true });
  else addPicker();
})();
