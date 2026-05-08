// 1. Inject CSS immediately (No DOMContentLoaded wrapper needed for styles)
const style = document.createElement('style');
style.textContent = `
* {
    font-family: mcfont;
  }
#search-tabs {
  /* Visibility & Animation */
  opacity: 0;
  visibility: hidden;
  pointer-events: none; /* Keeps it from blocking clicks while hidden */
  transform: translateY(-20px);
  /* Combined transitions into one property to prevent overrides */
  transition: opacity 0.2s ease-in-out, 
              visibility 0.2s ease-in-out, 
              transform 0.2s ease-in-out, 
              width 0.3s ease-in-out, 
              border 0.2s ease-in-out;
  top: 10%;
  position: fixed;
  left: 0;
  right: 0;
  margin: auto;
  width: 25%;
  background-color: #232323;
  color: #ffffff;
  font-size: 18px;
  padding: 8px;
  border: 3px solid #454545;
  outline: none;
  resize: none;
  white-space: nowrap;
}

#search-tabs.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto; /* Enables interaction when shown */
  transform: translateY(0);
  width: 50%;
  border: 3px solid #05ee93;
}

/* Container for the search panel */
.results-panel {
  opacity: 0;
  visibility: hidden;
  position: fixed;
  top: calc(10% + 50px); /* Adjust '50px' based on your textarea's height */
  left: 0;
  right: 0;
  margin: auto;
  width: 25%; /* Matches your textarea's expanded width */
  max-height: 300px;
  overflow-y: auto;
  background-color: #232323;
  border: 3px solid #454545;
  border-top: none; /* Merges it with the textarea */
  transition: all 0.2s ease-in-out, width 0.3s ease-in-out;
  z-index: 999;
  text-align: left;
}

/* Show when active */
#search-tabs.is-visible ~ .results-panel {
  opacity: 1;
  visibility: visible;
  width: 50%;
}

/* Individual result styling */
.result-item {
  padding: 10px 15px;
  color: white;
  cursor: pointer;
  border-bottom: 1px solid #333;
  transition: all 0.2s ease-in-out;
}

.result-item:hover {
  color: #05ee93;
}
`;
document.head.appendChild(style);

// 2. Inject HTML as soon as the body is ready
document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', `
        <textarea id="search-tabs" rows="1" placeholder="Search..."></textarea>
        <div id="search-results" class="results-panel"></div>
    `);

    // ... (Your existing T-toggle and filtering logic goes here) ...
    const searchArea = document.querySelector('#search-tabs');
    const resultsPanel = document.querySelector('#search-results');
    
    // Logic remains the same as before
});


const data = [
  { name: "Dashboard", url: "https://mcbcode.com/dashboard" },
  { name: "Profile", url: "https://mcbcode.com/profile" },
  { name: "Profiles", url: "https://mcbcode.com/profile" },
  { name: "Editor", url: "https://mcbcode.com/editor" },
  { name: "Account", url: "https://mcbcode.com/account" },
  { name: "Login", url: "https://mcbcode.com/account" },
  { name: "Sign Up", url: "https://mcbcode.com/account" },
  { name: "Source Code", url: "https://github.com/xyztoast/mcbCode" },
  { name: "Terms", url: "https://mcbcode.com/terms-of-use" },
  { name: "Roadmap", url: "https://roadmap.mcbcode.com" },
  { name: "Home", url: "https://mcbcode.com" },
  { name: "About", url: "https://mcbcode.com/about"}
];

function closeSearch() {
  searchArea.classList.remove('is-visible');
  searchArea.value = '';
  resultsPanel.innerHTML = '';
  searchArea.blur();
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 't' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    const isOpening = !searchArea.classList.contains('is-visible');
    
    if (isOpening) {
      searchArea.classList.add('is-visible');
      searchArea.addEventListener('transitionend', () => searchArea.focus(), { once: true });
      setTimeout(() => searchArea.focus(), 50);
    } else {
      closeSearch();
    }
  }
});

searchArea.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  resultsPanel.innerHTML = ''; 

  if (query.length > 0) {
    const filtered = data.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
    
    if (filtered.length > 0) {
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.textContent = item.name;
        div.onclick = () => window.location.href = item.url;
        resultsPanel.appendChild(div);
      });
    } else {
      // "No results found" message
      const noResult = document.createElement('div');
      noResult.className = 'result-item';
      noResult.style.fontStyle = 'italic';
      noResult.style.cursor = 'default';
      noResult.textContent = 'No results found';
      resultsPanel.appendChild(noResult);
    }
  }
});

document.addEventListener('click', (e) => {
  if (searchArea.classList.contains('is-visible') && e.target !== searchArea && !resultsPanel.contains(e.target)) {
    closeSearch();
  }
});
