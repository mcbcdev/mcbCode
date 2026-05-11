const rawHTML = `


    <div class="navi">
        <div class="navi-brand">
            <a href="https://mcbcode.com">
                <h2><ee style="color: #fff; font-family: mcfontb;">mcb</ee><g>Code</g></h2>
            </a>
        </div>
        <div class="quick-links">
            <a href="https://mcbcode.com/editor">Editor</a>
            <a href="https://mcbcode.com/account">Account</a>
            <div class="dropdown-btn" id="dd"></div>
            <div class="dropdown">
                <br>
                <div class="dropdown-content">
                    <a href="https://roadmap.mcbcode.com/terms-of-use">Terms</a>
                    <a href="https://roadmap.mcbcode.com">Roadmap</a>
                    <a href="https://github.com/xyztoast/mcbCode">Source</a>
                    <a href="https://roadmap.mcbcode.com/about">About</a>
                </div>
                <br>
            </div>
        </div>
    </div>
</div>

`;

document.body.insertAdjacentHTML('afterbegin', rawHTML);







// rest of js here
    const dropdownBtn = document.getElementById('dd');
    const dropdownMenu = document.querySelector('.dropdown');

    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Toggle active on BOTH elements
        dropdownBtn.classList.toggle('active');
        dropdownMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== dropdownBtn) {
            // Remove active from BOTH when clicking away
            dropdownBtn.classList.remove('active');
            dropdownMenu.classList.remove('active');
        }
    });
