console.log("notifications loading");

(function () {
    // avoid duplicate init if this script gets loaded into the placeholder more than once
    if (window.__notifSystemLoaded) return;
    window.__notifSystemLoaded = true;

    const WORKER_ORIGIN = "https://auth.mcbcode.com"; // change if ur worker lives elsewhere

    let currentFilter = "All";
    let notifications = [];

    // ---- auth check, same pattern as the rest of the site (/me endpoint) ----
    fetch(`${WORKER_ORIGIN}/me`, { credentials: "include" })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
            if (!data || !data.ok) return; // not logged in, render nothing
            init();
        })
        .catch(() => {});

    function init() {
        fetch("/elements/notifications.html")
            .then(res => res.text())
            .then(html => {
                const placeholder = document.currentScript
                    ? document.currentScript.parentElement
                    : document.body;
                placeholder.insertAdjacentHTML("beforeend", html);
                buildModal();
                attachButtonEvents();
                refreshUnreadBadge();
            });
    }

    function attachButtonEvents() {
        const btn = document.getElementById("notif-btn");
        if (!btn) return;
        btn.addEventListener("click", openModal);
    }

    // ---- modal construction (built once, reused) ----
    function buildModal() {
        if (document.getElementById("notif-modal-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "notif-modal-overlay";
        overlay.style.cssText = `
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        `;

        overlay.innerHTML = `
            <div id="notif-modal" role="dialog" aria-modal="true" aria-label="Notifications"
                 style="
                    background: inherit;
                    background-color: var(--notif-bg, #1a1a1a);
                    color: inherit;
                    width: 90vw;
                    max-width: 600px;
                    height: 85vh;
                    max-height: 700px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    font-family: inherit;
                 ">
                <div style="display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; border-bottom: 1px solid rgba(128,128,128,0.3);">
                    <strong style="font-size: 1.1em;">Notifications</strong>
                    <button id="notif-close-btn" aria-label="Close" style="background:none; border:none; font-size: 1.3em; cursor:pointer; color: inherit;">&times;</button>
                </div>

                <div id="notif-filter-bar" style="display:flex; gap: 6px; padding: 10px 16px; overflow-x:auto; border-bottom: 1px solid rgba(128,128,128,0.2);">
                    ${["All", "Activity", "Points", "Unread", "Read"].map(f =>
                        `<button class="notif-filter-btn" data-filter="${f}" style="
                            padding: 6px 12px;
                            border-radius: 20px;
                            border: 1px solid rgba(128,128,128,0.4);
                            background: ${f === "All" ? "rgba(128,128,128,0.3)" : "transparent"};
                            color: inherit;
                            cursor: pointer;
                            white-space: nowrap;
                            font-size: 0.85em;
                        ">${f}</button>`
                    ).join("")}
                </div>

                <div style="padding: 8px 16px; display:flex; justify-content:flex-end; border-bottom: 1px solid rgba(128,128,128,0.15);">
                    <button id="notif-mark-all-btn" style="background:none; border:none; color: inherit; opacity:0.8; cursor:pointer; font-size:0.85em; text-decoration:underline;">
                        Mark All Read
                    </button>
                </div>

                <div id="notif-list" style="flex:1; overflow-y:auto; padding: 8px 16px;">
                    <p style="opacity:0.6; text-align:center; margin-top: 40px;">Loading...</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // close on outside click
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeModal();
        });
        // close button
        overlay.querySelector("#notif-close-btn").addEventListener("click", closeModal);
        // escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && overlay.style.display !== "none") closeModal();
        });
        // filter buttons
        overlay.querySelectorAll(".notif-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                currentFilter = btn.dataset.filter;
                overlay.querySelectorAll(".notif-filter-btn").forEach(b => {
                    b.style.background = b === btn ? "rgba(128,128,128,0.3)" : "transparent";
                });
                renderList();
            });
        });
        // mark all read
        overlay.querySelector("#notif-mark-all-btn").addEventListener("click", markAllRead);
    }

    function openModal() {
        const overlay = document.getElementById("notif-modal-overlay");
        overlay.style.display = "flex";
        trapFocus(overlay);
        loadNotifications();
    }

    function closeModal() {
        const overlay = document.getElementById("notif-modal-overlay");
        overlay.style.display = "none";
        document.getElementById("notif-btn")?.focus();
    }

    function trapFocus(overlay) {
        const focusable = overlay.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        first.focus();
        overlay.onkeydown = (e) => {
            if (e.key !== "Tab") return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
    }

    // ---- data loading ----
    function loadNotifications() {
        const list = document.getElementById("notif-list");
        list.innerHTML = `<p style="opacity:0.6; text-align:center; margin-top: 40px;">Loading...</p>`;

        fetch(`${WORKER_ORIGIN}/notifications`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                if (!data.ok) {
                    list.innerHTML = `<p style="opacity:0.6; text-align:center; margin-top: 40px;">Couldn't load notifications.</p>`;
                    return;
                }
                notifications = data.notifications;
                updateBadge(data.unread_count);
                renderList();
            })
            .catch(() => {
                list.innerHTML = `<p style="opacity:0.6; text-align:center; margin-top: 40px;">Couldn't load notifications.</p>`;
            });
    }

    function refreshUnreadBadge() {
        fetch(`${WORKER_ORIGIN}/notifications?filter=unread`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                if (data.ok) updateBadge(data.unread_count);
            })
            .catch(() => {});
    }

    function updateBadge(count) {
        const badge = document.getElementById("notif-badge");
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? "99+" : String(count);
            badge.style.display = "inline-block";
        } else {
            badge.style.display = "none";
        }
    }

    // ---- rendering ----
    function renderList() {
        const list = document.getElementById("notif-list");
        let filtered = notifications;

        if (currentFilter === "Unread") {
            filtered = notifications.filter(n => !n.is_read);
        } else if (currentFilter === "Read") {
            filtered = notifications.filter(n => n.is_read);
        } else if (currentFilter !== "All") {
            filtered = notifications.filter(n => n.category === currentFilter);
        }

        if (!filtered.length) {
            list.innerHTML = `<p style="opacity:0.6; text-align:center; margin-top: 40px;">No notifications here.</p>`;
            return;
        }

        list.innerHTML = filtered.map(n => `
            <div class="notif-item" data-id="${n.id}" style="
                display:flex;
                gap: 10px;
                padding: 12px 8px;
                border-bottom: 1px solid rgba(128,128,128,0.15);
                cursor: pointer;
                background: ${n.is_read ? "transparent" : "rgba(100,150,255,0.08)"};
            ">
                ${n.icon ? `<img src="${escapeAttr(n.icon)}" alt="" style="width:32px; height:32px; border-radius:6px; flex-shrink:0;">` : ""}
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${!n.is_read ? `<span style="width:8px; height:8px; border-radius:50%; background:#4a9dff; flex-shrink:0;"></span>` : ""}
                        <strong style="font-size:0.95em;">${escapeHtml(n.title)}</strong>
                    </div>
                    ${n.description ? `<p style="margin:4px 0 0; opacity:0.75; font-size:0.85em;">${escapeHtml(n.description)}</p>` : ""}
                    <span style="opacity:0.5; font-size:0.75em;">${formatTime(n.created_at)}</span>
                </div>
                <button class="notif-delete-btn" data-id="${n.id}" aria-label="Delete notification" style="
                    background:none; border:none; color: inherit; opacity:0.5; cursor:pointer; font-size:1em; flex-shrink:0;
                ">&times;</button>
            </div>
        `).join("");

        list.querySelectorAll(".notif-item").forEach(item => {
            item.addEventListener("click", (e) => {
                if (e.target.classList.contains("notif-delete-btn")) return;
                const id = item.dataset.id;
                const n = notifications.find(x => String(x.id) === id);
                markRead(id);
                if (n && n.url) window.location.href = n.url;
            });
        });
        list.querySelectorAll(".notif-delete-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteNotification(btn.dataset.id);
            });
        });
    }

    // ---- actions ----
    function markRead(id) {
        const n = notifications.find(x => String(x.id) === String(id));
        if (n && n.is_read) return; // already read, skip the request
        fetch(`${WORKER_ORIGIN}/notifications/read`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        }).then(() => {
            if (n) n.is_read = true;
            renderList();
            refreshUnreadBadge();
        });
    }

    function markAllRead() {
        fetch(`${WORKER_ORIGIN}/notifications/read-all`, {
            method: "POST",
            credentials: "include",
        }).then(() => {
            notifications.forEach(n => (n.is_read = true));
            renderList();
            refreshUnreadBadge();
        });
    }

    function deleteNotification(id) {
        fetch(`${WORKER_ORIGIN}/notifications?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            credentials: "include",
        }).then(() => {
            notifications = notifications.filter(n => String(n.id) !== String(id));
            renderList();
            refreshUnreadBadge();
        });
    }

    // ---- tiny utils ----
    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str || "";
        return div.innerHTML;
    }
    function escapeAttr(str) {
        return (str || "").replace(/"/g, "&quot;");
    }
    function formatTime(iso) {
        const d = new Date(iso + "Z");
        const diffMs = Date.now() - d.getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString();
    }
})();
