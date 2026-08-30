console.log("Obsidian Loading...");
const thisScript = document.currentScript;
fetch("/elements/obsidian.html")
  .then(res => res.text())
  .then(html => {
    thisScript.insertAdjacentHTML("beforebegin", html);

    let kofiUrl = null;

    document.getElementById("get-obsidian-btn").addEventListener("click", async () => {
      const res = await fetch("https://auth.mcbcode.com/obsidian/checkout-start", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "something went wrong starting checkout");
        return;
      }

      kofiUrl = data.kofi_url;
      document.getElementById("obsidian-token-display").textContent = data.token;
      document.getElementById("obsidian-instructions").style.display = "block";
      document.getElementById("get-obsidian-btn").style.display = "none";
    });

    document.getElementById("obsidian-copy-btn").addEventListener("click", () => {
      const token = document.getElementById("obsidian-token-display").textContent;
      navigator.clipboard.writeText(token).then(() => {
        const btn = document.getElementById("obsidian-copy-btn");
        const original = btn.textContent;
        btn.textContent = "copied!";
        setTimeout(() => { btn.textContent = original; }, 1500);
      });
    });

    document.getElementById("obsidian-continue-btn").addEventListener("click", () => {
      window.open(kofiUrl, "_blank");
      document.getElementById("obsidian-continue-btn").style.display = "none";
      document.getElementById("obsidian-copy-btn").style.display = "none";
      document.getElementById("obsidian-status-text").style.display = "block";
      pollObsidianStatus();
    });
  });

async function pollObsidianStatus() {
  const res = await fetch("https://auth.mcbcode.com/obsidian/status", {
    credentials: "include"
  });
  const data = await res.json();
  const statusEl = document.getElementById("obsidian-status-text");
  if (!data.ok) return;

  if (data.state === "activated") {
    statusEl.textContent = "obsidian activated! expires " + (data.expires_at || "never");
    return;
  }
  if (data.state === "processing") {
    statusEl.textContent = "waiting for payment to process...";
  } else {
    statusEl.textContent = "waiting for you to complete checkout...";
  }
  setTimeout(pollObsidianStatus, 4000);
}
