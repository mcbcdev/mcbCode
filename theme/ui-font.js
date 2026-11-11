(function () {
  const STORAGE_KEY = "mcbcode-ui-font-v1";
  const DEFAULT_FONT = "mcfont";
  const FONTS = {
    mcfont: { label: "Mojangles", regular: "mcfont", bold: "mcfontb", wide: "mcfontwide" },
    noto: { label: "Noto Sans", regular: "noto", bold: "notob", wide: "notowide" },
    crimson: { label: "Crimson Pro", regular: "crimson", bold: "crimsonb", wide: "crimsonwide" }
  };
  const FONT_URL = "/theme/font/";
  let savedFont = readSavedFont();

  function isKnownFont(font) {
    return Object.prototype.hasOwnProperty.call(FONTS, font);
  }

  function readSavedFont() {
    try {
      const font = localStorage.getItem(STORAGE_KEY);
      return isKnownFont(font) ? font : DEFAULT_FONT;
    } catch {
      return DEFAULT_FONT;
    }
  }

  function writeFontFaces(font) {
    const faceSet = FONTS[font] || FONTS[DEFAULT_FONT];
    let style = document.getElementById("ui-font-faces");
    if (!style) {
      style = document.createElement("style");
      style.id = "ui-font-faces";
      document.head.appendChild(style);
    }
    style.textContent = [
      ["mcfont", faceSet.regular],
      ["mcfontb", faceSet.bold],
      ["mcfontwide", faceSet.wide]
    ].map(([alias, file]) =>
      `@font-face{font-family:'${alias}';src:url('${FONT_URL}${file}.ttf') format('truetype');font-weight:normal;font-style:normal;font-display:swap}`
    ).join("\n");
  }

  function applyFont(font, persist) {
    savedFont = isKnownFont(font) ? font : DEFAULT_FONT;
    document.documentElement.dataset.uiFont = savedFont;
    writeFontFaces(savedFont);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, savedFont); } catch {}
    }
    const select = document.querySelector("#ui-font-choice");
    if (select) select.value = savedFont;
  }

  function addPicker() {
    const trigger = document.querySelector("#ui-font-trigger");
    if (!trigger) return;

    const dialog = document.createElement("dialog");
    dialog.className = "ui-font-dialog";
    dialog.id = "ui-font-dialog";
    dialog.setAttribute("aria-labelledby", "ui-font-title");
    dialog.innerHTML = `
      <div class="ui-font-dialog-inner">
        <div class="ui-font-heading">
          <h2 id="ui-font-title">choose a font</h2>
          <button class="ui-font-close" type="button" aria-label="close font settings">x</button>
        </div>
        <label class="ui-font-field" for="ui-font-choice">site font
          <select id="ui-font-choice" class="ui-font-select">
            <option value="mcfont">Mojangles</option>
            <option value="noto">Noto Sans</option>
            <option value="crimson">Crimson Pro</option>
          </select>
        </label>
        <p class="ui-font-note">your choice is saved in this browser and used across mcbCode pages with shared font support.</p>
      </div>`;
    document.body.appendChild(dialog);

    const select = dialog.querySelector("#ui-font-choice");
    const closeButton = dialog.querySelector(".ui-font-close");
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", dialog.id);
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      select.value = savedFont;
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
    select.addEventListener("change", () => applyFont(select.value, true));
  }

  applyFont(savedFont, false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addPicker, { once: true });
  else addPicker();
})();
