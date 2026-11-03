(function () {
  "use strict";

  const script = document.currentScript;
  if (!script || !script.parentNode) return;

  const styleId = "mcb-obsidian-button-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .mcb-obsidian {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        position: relative;
        font-family: inherit;
      }
      .mcb-obsidian__button {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        padding: 8px 12px;
        border: 1px solid #8063ad;
        border-radius: 7px;
        background: #231d32;
        color: #f1eaff;
        font: inherit;
        font-size: 12px;
        white-space: nowrap;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
      }
      .mcb-obsidian__button:hover {
        background: #302344;
        border-color: #b79ae8;
        transform: translateY(-1px);
      }
      .mcb-obsidian__button:focus-visible {
        outline: 2px solid #c8afff;
        outline-offset: 2px;
      }
      .mcb-obsidian__button:disabled {
        cursor: wait;
        opacity: 0.7;
        transform: none;
      }
      .mcb-obsidian__price {
        padding: 2px 6px;
        border-radius: 999px;
        background: #ffffff12;
        color: #d7c5f5;
        font-size: 10px;
      }
      .mcb-obsidian__message {
        margin-top: 4px;
        color: var(--ui-muted, #aaa);
        font-size: 11px;
      }
      .mcb-obsidian__message:empty {
        display: none;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  const widget = document.createElement("div");
  widget.className = "mcb-obsidian";
  widget.innerHTML = `
    <button class="mcb-obsidian__button" type="button">
      <span class="mcb-obsidian__label">get obsidian</span>
      <span class="mcb-obsidian__price">$4/mo</span>
    </button>
    <span class="mcb-obsidian__message" aria-live="polite"></span>
  `;

  const button = widget.querySelector(".mcb-obsidian__button");
  const label = widget.querySelector(".mcb-obsidian__label");
  const message = widget.querySelector(".mcb-obsidian__message");

  button.addEventListener("click", async function () {
    button.disabled = true;
    label.textContent = "loading...";
    message.textContent = "";

    try {
      const response = await fetch("https://auth.mcbcode.com/stripe/checkout", {
        method: "POST",
        credentials: "include"
      });

      if (response.status === 401) {
        window.location.href = "https://mcbcode.com/account";
        return;
      }

      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      message.textContent = data.error || "something went wrong, try again";
    } catch (error) {
      message.textContent = "something went wrong, try again";
    }

    button.disabled = false;
    label.textContent = "get obsidian";
  });

  script.insertAdjacentElement("afterend", widget);
})();
