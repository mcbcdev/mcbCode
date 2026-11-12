
console.log("navi html loading");

fetch("https://mcbcode.com/elements/navi.html")
  .then((res) => {
    if (!res.ok) throw new Error(`navigation failed to load: ${res.status}`);
    return res.text();
  })
  .then(async (html) => {
    document.body.insertAdjacentHTML("afterbegin", html);

    // Load the custom font
    if (!document.querySelector('script[src="https://mcbcode.com/theme/mcfont.js"]')) {
      const fontScript = document.createElement("script");
      fontScript.src = "https://mcbcode.com/theme/mcfont.js";
      document.head.appendChild(fontScript);
    }

    const dropdownBtn = document.getElementById("dd");
    const dropdownMenu = document.querySelector(".dropdown");
    const nav = document.getElementById("mcbcode-navi");

    const closeDropdown = () => {
      dropdownBtn.classList.remove("active");
      dropdownMenu.classList.remove("active");
      dropdownBtn.setAttribute("aria-expanded", "false");
    };

    const toggleDropdown = (event) => {
      event.stopPropagation();
      const isOpen = dropdownBtn.classList.toggle("active");
      dropdownMenu.classList.toggle("active", isOpen);
      dropdownBtn.setAttribute("aria-expanded", String(isOpen));
    };

    dropdownBtn.addEventListener("click", toggleDropdown);

    dropdownBtn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDropdown(event);
      } else if (event.key === "Escape") {
        closeDropdown();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        !dropdownMenu.contains(event.target) &&
        !dropdownBtn.contains(event.target)
      ) {
        closeDropdown();
      }
    });

    // Initialize LiquidGlass
    try {
      const { LiquidGlass } = await import(
        "https://cdn.jsdelivr.net/npm/@ybouane/liquidglass/dist/index.js"
      );

      nav.dataset.config = JSON.stringify({
        blurAmount: 0.16,
        refraction: 0.24,
        chromAberration: 0.012,
        edgeHighlight: 0.16,
        specular: 0.18,
        fresnel: 0.72,
        distortion: 0.008,
        cornerRadius: 0,
        zRadius: 12,
        opacity: 1,
        saturation: 0.12,
        tintStrength: 0.08,
        brightness: 0.025,
        shadowOpacity: 0.16,
        shadowSpread: 14,
        shadowOffsetY: 3
      });

      window.mcbCodeLiquidGlass = await LiquidGlass.init({
        root: document.body,
        glassElements: [nav]
      });

    } catch (error) {
      console.warn(
        "LiquidGlass could not initialize; using CSS fallback.",
        error
      );
    }
  })
  .catch((error) => {
    console.error("Could not load mcbCode navigation:", error);
  });

// Obsidian checkout
const obsidianButton = document.getElementById("get-obsidian-btn");

if (obsidianButton) {
  obsidianButton.addEventListener("click", async () => {
    try {
      const res = await fetch(
        "https://auth.mcbcode.com/stripe/checkout",
        {
          method: "POST",
          credentials: "include"
        }
      );

      const data = await res.json();

      if (data.ok) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.error || "something went wrong starting checkout");
      }
    } catch (error) {
      console.error("Could not start checkout:", error);
      alert("something went wrong starting checkout");
    }
  });
}
