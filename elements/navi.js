fetch("/components/navbar.html")
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
