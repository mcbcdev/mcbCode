document.body.insertAdjacentHTML('beforeend', `
  <textarea id="search-tabs" rows="1" placeholder="Search..."></textarea>
  <div id="search-results" class="results-panel"></div>
`);

async function loadSearchHTML() {
    const response = await fetch('tools/search.html');
    const html = await response.text();
    document.body.insertAdjacentHTML('beforeend', html);
    
    window.searchArea = document.querySelector('#search-tabs');
    window.resultsPanel = document.querySelector('#search-results');
    
}

loadSearchHTML();



const searchArea = document.querySelector('#search-tabs');
const resultsPanel = document.querySelector('#search-results');

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
