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
