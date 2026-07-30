console.log("sidebar loading");

fetch("/docs/elements/sidebar.json")
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("docs-sidebar");
    if (!container) {
      console.log("no #docs-sidebar element found on this page");
      return;
    }

    const currentPath = window.location.pathname;
    let html = "";

    data.sections.forEach(section => {
      html += `<div class="sidebar-section">`;
      html += `<h4 class="sidebar-title">${section.title}</h4>`;
      html += `<ul class="sidebar-list">`;

      section.links.forEach(link => {
        const active = currentPath === link.href ? " active" : "";
        html += `<li><a class="sidebar-link${active}" href="${link.href}">${link.name}</a></li>`;
      });

      html += `</ul></div>`;
    });

    container.innerHTML = html;
  })
  .catch(err => console.log("sidebar failed to load:", err));
