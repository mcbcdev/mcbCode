(function () {
    const POPUP_HTML_URL = "https://mcbcode.com/elements/feedback.html";
    const AUTH_BASE = "https://auth.mcbcode.com";
    const API_BASE = "https://feedback-data.mcbcode.com";
    const STORAGE_KEY = "mcb_fb_popup_state";
    const SHOW_CHANCE = 0.25;
    const COOLDOWN_LOADS = 10;

    function getState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { loadsSinceShown: COOLDOWN_LOADS }; // eligible on very first visit
            return JSON.parse(raw);
        } catch {
            return { loadsSinceShown: COOLDOWN_LOADS };
        }
    }

    function saveState(state) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    }

    function shouldShowThisLoad() {
        const state = getState();

        if (state.loadsSinceShown < COOLDOWN_LOADS) {
            // still in cooldown, just count this load and don't show
            state.loadsSinceShown += 1;
            saveState(state);
            return false;
        }

        // eligible - roll the dice
        if (Math.random() < SHOW_CHANCE) {
            state.loadsSinceShown = 0; // reset cooldown starting now
            saveState(state);
            return true;
        } else {
            // not shown this time, but keep counting (stays >= COOLDOWN_LOADS, still eligible next load)
            state.loadsSinceShown += 1;
            saveState(state);
            return false;
        }
    }

    async function injectPopup() {
        let html;
        try {
            const res = await fetch(POPUP_HTML_URL);
            html = await res.text();
        } catch (err) {
            console.error("feedback popup failed to load:", err);
            return;
        }

        document.body.insertAdjacentHTML("beforeend", html);
        wireUpPopup();
    }

    function removePopup() {
        const el = document.getElementById("master-fb");
        if (el) el.remove();
    }

    function wireUpPopup() {
        const closeBtn = document.getElementById("fb-close");
        const submitBtn = document.getElementById("fb-btn");
        const textarea = document.getElementById("fb-box");
        const status = document.getElementById("fb-status");

        if (closeBtn) closeBtn.addEventListener("click", removePopup);

        if (submitBtn) {
            submitBtn.addEventListener("click", async () => {
                const message = (textarea.value || "").trim();
                if (!message) return;

                submitBtn.disabled = true;
                status.textContent = "posting...";
                status.classList.remove("is-error");

                try {
                    const res = await fetch(`${API_BASE}/feedback`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "other", message })
                    });
                    const data = await res.json();

                    if (!res.ok || !data.ok) {
                        throw new Error(data.error || "something went wrong");
                    }

                    status.textContent = "thanks for the feedback!";
                    status.classList.remove("is-error");
                    textarea.value = "";
                    setTimeout(removePopup, 1500);
                } catch (err) {
                    status.textContent = err.message || "couldn't post that.";
                    status.classList.add("is-error");
                } finally {
                    submitBtn.disabled = false;
                }
            });
        }
    }

    if (shouldShowThisLoad()) {
        injectPopup();
    }
})();
