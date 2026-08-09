(function () {
  const AUTH = "https://auth.mcbcode.com";

  function loadMonetag() {
    const s = document.createElement('script');
    s.dataset.zone = '11541954';
    s.src = 'https://nap5k.com/tag.min.js';
    document.body.appendChild(s);
  }

  function showSignupPopup() {
    const style = document.createElement('style');
    style.textContent = `
      #mcb-ad-popup {
        position: fixed;
        bottom: 16px;
        right: 16px;
        background: #1e1e1e;
        border: 1px solid #bebebe;
        color: #bebebe;
        font-family: 'mcfont';
        padding: 12px 14px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      }
      #mcb-ad-popup span {
        font-size: 14px;
      }
      #mcb-ad-popup a {
        border: 1px solid #bebebe;
        color: #bebebe;
        font-family: 'mcfont';
        text-decoration: none;
        padding: 6px 10px;
        font-size: 14px;
        white-space: nowrap;
      }
      #mcb-ad-popup a:hover {
        background: #bebebe;
        color: #1e1e1e;
      }
      #mcb-ad-popup button {
        background: none;
        border: none;
        color: #bebebe;
        font-family: 'mcfont';
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0;
      }
    `;
    document.head.appendChild(style);

    const popup = document.createElement('div');
    popup.id = 'mcb-ad-popup';
    popup.innerHTML = `
      <span><a href="https://mcbcode.com/account">Sign Up</a> to remove ads forever</span>
      <button aria-label="Close">x</button>
    `;
    document.body.appendChild(popup);

    popup.querySelector('button').addEventListener('click', () => popup.remove());
  }

  fetch(`${AUTH}/me`, { credentials: "include" })
    .then(res => {
      if (!res.ok) {
        loadMonetag();
        showSignupPopup();
      }
    })
    .catch(() => {
      loadMonetag();
      showSignupPopup();
    });
})();
