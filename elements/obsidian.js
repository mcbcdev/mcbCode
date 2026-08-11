console.log("Obsidian Loading...");
fetch("/elements/obsidian.html")
  .then(res => res.text())
  .then(html => {
    const thisScript = document.currentScript;
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
