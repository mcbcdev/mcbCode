console.log("Obsidian Loading...");
const thisScript = document.currentScript;
fetch("/elements/obsidian.html")
  .then(res => res.text())
  .then(html => {
    thisScript.insertAdjacentHTML("beforebegin", html);

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

      document.getElementById("obsidian-token-display").textContent = data.token;
      document.getElementById("obsidian-instructions").style.display = "block";
      document.getElementById("get-obsidian-btn").style.display = "none";

      window.open(data.kofi_url, "_blank");
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
