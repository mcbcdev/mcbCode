(function () {
  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : null;
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/';
  }

  function apply(useMojangles, persist) {
    var root = document.documentElement.style;
    if (useMojangles) {
      root.setProperty('--mcfont', 'Mojangles');
      root.setProperty('--mcfontb', 'Mojangles Bold');
      root.setProperty('--mcfontwide', 'Mojangles Wide');
    } else {
      root.setProperty('--mcfont', 'var(--normal)');
      root.setProperty('--mcfontb', 'var(--normalb)');
      root.setProperty('--mcfontwide', 'var(--normalwide)');
    }
    if (persist !== false) setCookie('use_mojangles_font', useMojangles ? '1' : '0', 365);
  }

  // exposed globally so any page/settings toggle can call this instantly,
  // without a refresh
  window.mcbFont = { apply: apply };

  // run immediately (this script must be loaded un-deferred, un-async,
  // in <head>, so this runs before first paint and nothing flashes)
  apply(getCookie('use_mojangles_font') === '1', false);
})();
