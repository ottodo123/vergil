// Mobile menu functionality
// Note: This code is currently in main.js but could be moved here for better organization

function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.add('active');
            mobileMenuOverlay.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
    }

    function closeMobileMenu() {
        mobileMenu.classList.remove('active');
        mobileMenuOverlay.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
    }

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    // Mobile navigation buttons
    mobileNavBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.getAttribute('data-page');

            // Update active state
            mobileNavBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Navigate to page
            switch(page) {
                case 'glossary':
                    showMainPage();
                    updateURL({ page: null, list: null, q: null });
                    break;
                case 'grammar':
                    showGrammarPage();
                    updateURL({ page: 'grammar' });
                    break;
                case 'figures':
                    showFiguresPage();
                    updateURL({ page: 'figures' });
                    break;
                case 'about':
                    showAboutPage();
                    updateURL({ page: 'about' });
                    break;
            }

            // Close menu
            closeMobileMenu();
        });
    });
}

// Call this function in main.js DOMContentLoaded
// initializeMobileMenu();
