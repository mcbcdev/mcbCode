(function () {
  var AUTH = "https://auth.mcbcode.com";

  // hide the page immediately so nothing flashes in the wrong font while
  // we wait on the /settings fetch. gets removed once we know the answer.
  var hideStyle = document.createElement("style");
  hideStyle.id = "mcfont-hide";
  hideStyle.textContent = "html{visibility:hidden}";
  document.head.appendChild(hideStyle);

  function apply(useMojangles) {
    var root = document.documentElement.style;
    if (useMojangles) {
      root.setProperty("--mcfont", "mcfont");
      root.setProperty("--mcfontb", "mcfontb");
      root.setProperty("--mcfontwide", "mcfontwide");
    } else {
      root.setProperty("--mcfont", "var(--normal)");
      root.setProperty("--mcfontb", "var(--normalb)");
      root.setProperty("--mcfontwide", "var(--normalwide)");
    }
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
