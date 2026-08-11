console.log("Obsidian Loading...");
const thisScript = document.currentScript;

fetch("/elements/obsidian.html")
  .then(res => res.text())
  .then(html => {
    thisScript.insertAdjacentHTML("beforebegin", html);

    document.getElementById("get-obsidian-btn").addEventListener("click", async () => {
      const res = await fetch("https://auth.mcbcode.com/stripe/checkout", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || "something went wrong starting checkout");
      }
    });
  });
