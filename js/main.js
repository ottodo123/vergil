// Global variables
let vocabularyData = []; // Will store all vocabulary data
let saveLists = {
    "Default List": []
};
let currentListName = "Default List";
let googleAuth = null;
let auth = null;
let db = null;
let currentUser = null;
let currentFlashcardIndex = 0;
let flashcardMode = false;
let currentFilter = 'alphabet'; // Default filter: alphabetical

// DOM elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const vocabularyList = document.getElementById('vocabulary-list');
const savedListsBtn = document.getElementById('saved-lists-btn');
const mainPage = document.getElementById('main-page');
const savedListsPage = document.getElementById('saved-lists-page');
const saveListTabs = document.getElementById('save-list-tabs');
const saveListContents = document.getElementById('save-list-contents');
const newListNameInput = document.getElementById('new-list-name');
const createListBtn = document.getElementById('create-list-btn');
const mainTitle = document.getElementById('main-title');
const aboutLink = document.getElementById('about-link');
const aboutPage = document.getElementById('about-page');
const newListPopup = document.getElementById('new-list-popup');
const popupListName = document.getElementById('popup-list-name');
const popupCreateBtn = document.getElementById('popup-create-btn');
const closePopupBtn = document.querySelector('.close-popup');
const filterAlphabetBtn = document.getElementById('filter-alphabet');
const filterRequiredBtn = document.getElementById('filter-required');
const filterOccurrencesBtn = document.getElementById('filter-occurrences');
const filterDropdownBtn = document.getElementById('filter-dropdown-btn');
const filterDropdownContent = document.getElementById('filter-dropdown-content');

// New const
const glossaryBtn = document.getElementById('glossary-btn');
const grammarBtn = document.getElementById('grammar-btn');
const figuresBtn = document.getElementById('figures-btn');
const aboutBtn = document.getElementById('about-btn');
const grammarPage = document.getElementById('grammar-page');
const figuresPage = document.getElementById('figures-page');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCSVData();

    // Handle the async nature of loadSavedLists
    loadSavedLists().then(() => {
        console.log("Saved lists loaded");
    }).catch(error => {
        console.error("Error loading saved lists:", error);
    });

    // Display page according to URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const list = urlParams.get('list');

    if (page === 'saved-lists') {
        showSavedListsPage(list);
    } else if (page === 'about') {
        showAboutPage();
    } else if (page === 'grammar') {
        showGrammarPage();
    } else if (page === 'figures') {
        showFiguresPage();
    } else {
        showMainPage();
    }

    // If search query is in URL
    const searchQuery = urlParams.get('q');
    if (searchQuery) {
        searchInput.value = searchQuery;
        performSearch();
    }

    // Initialize Firebase
    initializeFirebase();

    // Check login state
    checkLoginState();

    // Set up Google sign-in button event listener
    const googleSignInBtn = document.getElementById('google-sign-in');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }

    // Set up mobile Google sign-in button event listener
    const googleSignInBtnMobile = document.getElementById('google-sign-in-mobile');
    if (googleSignInBtnMobile) {
        googleSignInBtnMobile.addEventListener('click', handleGoogleSignIn);
    }

    // Set up popup-related event listeners
    console.log("Setting up popup event listeners"); // Debug log
    console.log("Popup elements:", {
        newListPopup,
        popupListName,
        popupCreateBtn,
        closePopupBtn
    }); // Debug log

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', hideNewListPopup);
    }

    // Close popup when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === newListPopup) {
            hideNewListPopup();
        }
    });

    // Create button in popup
    if (popupCreateBtn) {
        popupCreateBtn.addEventListener('click', createListFromPopup);
    }

    // Submit with Enter key in popup
    if (popupListName) {
        popupListName.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                createListFromPopup();
            }
        });
    }

    if (filterAlphabetBtn) {
        filterAlphabetBtn.addEventListener('click', () => applyFilter('alphabet'));
    }
    if (filterRequiredBtn) {
        filterRequiredBtn.addEventListener('click', () => applyFilter('required'));
    }
    if (filterOccurrencesBtn) {
        filterOccurrencesBtn.addEventListener('click', () => applyFilter('occurrences'));
    }

    // Mobile menu functionality
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

    // Filter dropdown functionality
    if (filterDropdownBtn && filterDropdownContent) {
        // Toggle dropdown
        filterDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            filterDropdownContent.classList.toggle('show');
        });

        // Handle filter selection
        document.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', function() {
                const filterType = this.getAttribute('data-filter');

                // Update active state
                document.querySelectorAll('.filter-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                this.classList.add('active');

                // Apply filter
                applyFilter(filterType);

                // Close dropdown
                filterDropdownContent.classList.remove('show');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            filterDropdownContent.classList.remove('show');
        });

        // Set initial active state
        document.querySelector('.filter-option[data-filter="alphabet"]').classList.add('active');
    }
});

// Navigation button event listeners
glossaryBtn.addEventListener('click', function() {
    showMainPage();
    updateURL({ page: null, list: null, q: null });
});

grammarBtn.addEventListener('click', function() {
    showGrammarPage();
    updateURL({ page: 'grammar' });
});

figuresBtn.addEventListener('click', function() {
    showFiguresPage();
    updateURL({ page: 'figures' });
});

aboutBtn.addEventListener('click', function() {
    showAboutPage();
    updateURL({ page: 'about' });
});

// Main title click event
mainTitle.addEventListener('click', function() {
    showMainPage();
    updateURL({ page: null, list: null, q: null });
});

// Save lists button click event (page transition, not popup)
savedListsBtn.addEventListener('click', function() {
    showSavedListsPage();
    updateSaveListTabs();
    updateURL({ page: 'saved-lists', list: null });
});

// Page display functions
function showAboutPage() {
    hideAllPages();
    aboutPage.style.display = 'block';
    updateActiveNavButton('about');
}

function showGrammarPage() {
    hideAllPages();
    grammarPage.style.display = 'block';
    updateActiveNavButton('grammar');
}

function showFiguresPage() {
    hideAllPages();
    figuresPage.style.display = 'block';
    updateActiveNavButton('figures');
}

function hideAllPages() {
    mainPage.style.display = 'none';
    savedListsPage.style.display = 'none';
    aboutPage.style.display = 'none';
    grammarPage.style.display = 'none';
    figuresPage.style.display = 'none';
}

function updateActiveNavButton(activePage) {
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to the appropriate button
    switch(activePage) {
        case 'glossary':
            glossaryBtn.classList.add('active');
            break;
        case 'grammar':
            grammarBtn.classList.add('active');
            break;
        case 'figures':
            figuresBtn.classList.add('active');
            break;
        case 'about':
            aboutBtn.classList.add('active');
            break;
    }

    // Also update mobile nav buttons
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === activePage ||
            (activePage === 'glossary' && btn.getAttribute('data-page') === 'glossary')) {
            btn.classList.add('active');
        }
    });
}

// Display main page
function showMainPage() {
    hideAllPages();
    mainPage.style.display = 'block';
    updateActiveNavButton('glossary');
}

// Display saved lists page
function showSavedListsPage(activeList = null) {
    hideAllPages();
    savedListsPage.style.display = 'block';
    updateSaveListTabs(activeList);
    // Don't update nav buttons for saved lists page
}

// URL update function
function updateURL(params) {
    const url = new URL(window.location);

    // Update each parameter
    for (const [key, value] of Object.entries(params)) {
        if (value === null) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    }

    // Change URL (using history API)
    window.history.pushState({}, '', url);
}

// Browser back button handling
window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const list = urlParams.get('list');
    const searchQuery = urlParams.get('q');

    if (page === 'saved-lists') {
        showSavedListsPage(list);
    } else if (page === 'about') {
        showAboutPage();
    } else {
        showMainPage();
        if (searchQuery) {
            searchInput.value = searchQuery;
            performSearch();
        } else {
            searchInput.value = '';
            displayFilteredVocabularyItems(vocabularyData);
        }
    }
});

// Error handling for missing CSV file
window.addEventListener('error', function(e) {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        vocabularyList.innerHTML = `
            <div class="no-results">
                <p>Could not load vocabulary data. Make sure the CSV file exists.</p>
                <p>The file should be named: <code>vocabulary_deduplicated.csv</code> and placed in the same directory as this HTML file.</p>
            </div>
        `;
    }
});
