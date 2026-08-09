(function () {
  const AUTH = "https://auth.mcbcode.com";

  function loadMonetag() {
    const s = document.createElement('script');
    s.dataset.zone = '11541954';
    s.src = 'https://nap5k.com/tag.min.js';
    document.body.appendChild(s);
  }

  fetch(`${AUTH}/me`, { credentials: "include" })
    .then(res => {
      if (!res.ok) loadMonetag();
    })
    .catch(() => loadMonetag());
})();
