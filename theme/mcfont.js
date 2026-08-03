(function () {
  var AUTH = "https://auth.mcbcode.com";

  // hide the page immediately so nothing flashes in the wrong font while
  // we wait on the /settings fetch. gets removed once we know the answer.
  var hideStyle = document.createElement("style");
  hideStyle.id = "mcfont-hide";
  hideStyle.textContent = "html{visibility:hidden}";
  document.head.appendChild(hideStyle);

  // maps the literal font names to whichever actual font family
  // should render, based on the toggle
  function currentFontMap(useMojangles) {
    return useMojangles
      ? { mcfont: "mcfont", mcfontb: "mcfontb", mcfontwide: "mcfontwide" }
      : { mcfont: "notofont", mcfontb: "notofontb", mcfontwide: "notofontwide" };
  }

  // catches elements like <span style="font-family: mcfontb"> where
  // someone hardcoded the raw name instead of using var(--mcfontb).
  // css vars can't reach these, so we fix them directly.
  function applyToInlineStyles(useMojangles) {
    var map = currentFontMap(useMojangles);
    var els = document.querySelectorAll('[style*="font-family"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var current = el.style.fontFamily.replace(/['"]/g, "").trim();
      if (map.hasOwnProperty(current)) {
        el.style.fontFamily = map[current];
      }
    }
  }

  function apply(useMojangles) {
    var root = document.documentElement.style;
    if (useMojangles) {
      root.setProperty("--mcfont", "mcfont");
      root.setProperty("--mcfontb", "mcfontb");
      root.setProperty("--mcfontwide", "mcfontwide");
      root.setProperty("--mcfont-weight", "normal");
      root.setProperty("--mcfontb-weight", "normal");
      root.setProperty("--mcfontwide-weight", "normal");
    } else {
      root.setProperty("--mcfont", "var(--normal)");
      root.setProperty("--mcfontb", "var(--normalb)");
      root.setProperty("--mcfontwide", "var(--normalwide)");
      root.setProperty("--mcfont-weight", "var(--normal-weight)");
      root.setProperty("--mcfontb-weight", "var(--normalb-weight)");
      root.setProperty("--mcfontwide-weight", "var(--normalwide-weight)");
    }
    applyToInlineStyles(useMojangles);
  }

  function reveal() {
    var el = document.getElementById("mcfont-hide");
    if (el) el.remove();
  }

  // exposed globally so a settings toggle can call this instantly
  // (no fetch, no cookie, just flips the vars right away)
  window.mcbFont = { apply: apply };

  fetch(AUTH + "/settings", { credentials: "include" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var useMojangles = d && d.settings ? !!d.settings.use_mojangles_font : true;
      apply(useMojangles);
    })
    .catch(function () {
      apply(true); // matches the DB default for a new user
    })
    .finally(function () {
      reveal();
    });
})();
