console.log("navi html loading");
fetch("/elements/navi.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("afterbegin", html);

    const dropdownBtn = document.getElementById("dd");
    const dropdownMenu = document.querySelector(".dropdown");

    dropdownBtn.onclick = (e) => {
      e.stopPropagation();
      dropdownBtn.classList.toggle("active");
      dropdownMenu.classList.toggle("active");
    };

    document.addEventListener("click", (e) => {
      if (!dropdownMenu.contains(e.target) && e.target !== dropdownBtn) {
        dropdownBtn.classList.remove("active");
        dropdownMenu.classList.remove("active");
      }
    });
  });

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
