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

// DOM elements - will be populated after DOMContentLoaded
let searchInput, searchBtn, vocabularyList, savedListsBtn, mainPage, savedListsPage;
let individualListPage, savedListsDirectory, addNewListBtn, backToListsBtn;
let individualListTitle, individualListContent, wordCountInfo, mainTitle;
let aboutLink, aboutPage, newListPopup, popupListName, popupCreateBtn, closePopupBtn;
let filterAlphabetBtn, filterRequiredBtn, filterOccurrencesBtn, filterDropdownBtn;
let filterDropdownContent, glossaryBtn, grammarBtn, figuresBtn, aboutBtn;
let grammarPage, figuresPage;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM element references
    searchInput = document.getElementById('search-input');
    searchBtn = document.getElementById('search-btn');
    vocabularyList = document.getElementById('vocabulary-list');
    savedListsBtn = document.getElementById('saved-lists-btn');
    mainPage = document.getElementById('main-page');
    savedListsPage = document.getElementById('saved-lists-page');
    individualListPage = document.getElementById('individual-list-page');
    savedListsDirectory = document.getElementById('saved-lists-directory');
    addNewListBtn = document.getElementById('add-new-list-btn');
    backToListsBtn = document.getElementById('back-to-lists-btn');
    individualListTitle = document.getElementById('individual-list-title');
    individualListContent = document.getElementById('individual-list-content');
    wordCountInfo = document.getElementById('word-count-info');
    mainTitle = document.getElementById('main-title');
    aboutLink = document.getElementById('about-link');
    aboutPage = document.getElementById('about-page');
    newListPopup = document.getElementById('new-list-popup');
    popupListName = document.getElementById('popup-list-name');
    popupCreateBtn = document.getElementById('popup-create-btn');
    closePopupBtn = document.querySelector('.close-popup');
    filterAlphabetBtn = document.getElementById('filter-alphabet');
    filterRequiredBtn = document.getElementById('filter-required');
    filterOccurrencesBtn = document.getElementById('filter-occurrences');
    filterDropdownBtn = document.getElementById('filter-dropdown-btn');
    filterDropdownContent = document.getElementById('filter-dropdown-content');
    glossaryBtn = document.getElementById('glossary-btn');
    grammarBtn = document.getElementById('grammar-btn');
    figuresBtn = document.getElementById('figures-btn');
    aboutBtn = document.getElementById('about-btn');
    grammarPage = document.getElementById('grammar-page');
    figuresPage = document.getElementById('figures-page');

    // Load CSV data
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
        showSavedListsPage();
    } else if (page === 'list' && list) {
        showIndividualListPage(list);
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

    // Set up event listeners
    setupEventListeners();
});

// Set up all event listeners
function setupEventListeners() {
    // Google sign-in buttons
    const googleSignInBtn = document.getElementById('google-sign-in');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }

    const googleSignInBtnMobile = document.getElementById('google-sign-in-mobile');
    if (googleSignInBtnMobile) {
        googleSignInBtnMobile.addEventListener('click', handleGoogleSignIn);
    }

    // Navigation buttons
    if (glossaryBtn) {
        glossaryBtn.addEventListener('click', function() {
            showMainPage();
            updateURL({ page: null, list: null, q: null });
        });
    }

    if (grammarBtn) {
        grammarBtn.addEventListener('click', function() {
            showGrammarPage();
            updateURL({ page: 'grammar' });
        });
    }

    if (figuresBtn) {
        figuresBtn.addEventListener('click', function() {
            showFiguresPage();
            updateURL({ page: 'figures' });
        });
    }

    if (aboutBtn) {
        aboutBtn.addEventListener('click', function() {
            showAboutPage();
            updateURL({ page: 'about' });
        });
    }

    // Main title click
    if (mainTitle) {
        mainTitle.addEventListener('click', function() {
            showMainPage();
            updateURL({ page: null, list: null, q: null });
        });
    }

    // Save lists button
    if (savedListsBtn) {
        savedListsBtn.addEventListener('click', function() {
            showSavedListsPage();
            updateURL({ page: 'saved-lists' });
        });
    }

    // Add new list button
    if (addNewListBtn) {
        addNewListBtn.addEventListener('click', showNewListPopup);
    }

    // Back to lists button
    if (backToListsBtn) {
        backToListsBtn.addEventListener('click', function() {
            showSavedListsPage();
            updateURL({ page: 'saved-lists' });
        });
    }

    // Individual list page action buttons
    const flashcardBtn = document.getElementById('flashcard-btn');
    const copyBtn = document.getElementById('copy-btn');
    const printBtn = document.getElementById('print-btn');

    if (flashcardBtn) {
        flashcardBtn.addEventListener('click', function() {
            if (currentListName) {
                const flashcardContainer = document.getElementById('flashcard-container');
                if (flashcardContainer && flashcardContainer.style.display !== 'none') {
                    exitFlashcardMode(currentListName);
                    this.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
                } else {
                    startFlashcards(currentListName);
                    this.innerHTML = '<span class="btn-icon">🔄</span> Back to List';
                }
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            if (currentListName) {
                copyList(currentListName);
            }
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', function() {
            if (currentListName) {
                printList(currentListName);
            }
        });
    }

    // Popup-related event listeners
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

    // Filter buttons
    if (filterAlphabetBtn) {
        filterAlphabetBtn.addEventListener('click', () => applyFilter('alphabet'));
    }
    if (filterRequiredBtn) {
        filterRequiredBtn.addEventListener('click', () => applyFilter('required'));
    }
    if (filterOccurrencesBtn) {
        filterOccurrencesBtn.addEventListener('click', () => applyFilter('occurrences'));
    }

    // Filter dropdown
    if (filterDropdownBtn && filterDropdownContent) {
        filterDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            filterDropdownContent.classList.toggle('show');
        });

        document.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', function() {
                const filterType = this.getAttribute('data-filter');
                document.querySelectorAll('.filter-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                this.classList.add('active');
                applyFilter(filterType);
                filterDropdownContent.classList.remove('show');
            });
        });

        document.addEventListener('click', function() {
            filterDropdownContent.classList.remove('show');
        });

        // Set initial active state
        const alphabetOption = document.querySelector('.filter-option[data-filter="alphabet"]');
        if (alphabetOption) {
            alphabetOption.classList.add('active');
        }
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
            document.body.style.overflow = 'hidden';
        });
    }

    function closeMobileMenu() {
        mobileMenu.classList.remove('active');
        mobileMenuOverlay.style.display = 'none';
        document.body.style.overflow = '';
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
            mobileNavBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

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

            closeMobileMenu();
        });
    });
    // Hide save options when clicking outside (add this once in setupEventListeners)
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.save-btn') && !e.target.closest('.save-options')) {
            document.querySelectorAll('.save-options').forEach(div => {
                div.style.display = 'none';
            });
        }
    });
}

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
    individualListPage.style.display = 'none';
    aboutPage.style.display = 'none';
    grammarPage.style.display = 'none';
    figuresPage.style.display = 'none';
}

function updateActiveNavButton(activePage) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

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
function showSavedListsPage() {
    hideAllPages();
    savedListsPage.style.display = 'block';
    updateSavedListsDirectory();
}

// Display individual list content
function displayIndividualListContent(listName) {
    const words = saveLists[listName];
    individualListContent.innerHTML = '';

    if (words.length === 0) {
        individualListContent.innerHTML = '<p>No words saved in this list.</p>';
        return;
    }

    words.forEach(word => {
        const isRequired = word.Required === 1 || word.Required === "1";

        const wordItem = document.createElement('div');
        wordItem.className = 'vocabulary-item';
        wordItem.innerHTML = `
            <div class="vocabulary-info ${isRequired ? 'required-word' : ''}">
                <div class="word">
                    ${isRequired ? '<span class="required-star"></span>' : ''}
                    ${word.Headword}
                </div>
                <div class="definition">${word.Definitions}</div>
                <div class="occurrence">Occurrences in the Aeneid: ${word["Occurrences in the Aeneid"]}</div>
            </div>
            <button class="save-btn saved" data-word="${word.Headword}">★</button>
            <div class="save-options" id="save-options-${word.Headword.replace(/[^a-zA-Z0-9]/g, '')}">
                ${Object.keys(saveLists).map(list => {
                    const displayName = list === "Default List" ? "All Saved Terms" : list;
                    const isSaved = saveLists[list].some(w => w.Headword === word.Headword);
                    return `<button class="save-option-btn" data-list="${list}" data-word="${word.Headword}">
                        ${displayName} ${isSaved ? '(★)' : '(☆)'}
                    </button>`;
                }).join('')}
            </div>
        `;
        individualListContent.appendChild(wordItem);
    });

    // Add event listeners for save buttons to show dropdown
    individualListContent.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordId = this.getAttribute('data-word');
            const optionsDiv = document.getElementById(`save-options-${wordId.replace(/[^a-zA-Z0-9]/g, '')}`);

            // Hide all other option divs first
            document.querySelectorAll('.save-options').forEach(div => {
                if (div !== optionsDiv) {
                    div.style.display = 'none';
                }
            });

            // Toggle the options div for this word
            optionsDiv.style.display = optionsDiv.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Add event listeners for save option buttons
    individualListContent.querySelectorAll('.save-option-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordToToggle = this.getAttribute('data-word');
            const list = this.getAttribute('data-list');

            // Find the word data from vocabularyData instead of words
            const wordData = vocabularyData.find(item => item.Headword === wordToToggle);
            if (!wordData) return;

            const wordIndex = saveLists[list].findIndex(w => w.Headword === wordToToggle);

            if (wordIndex === -1) {
                // Add to list
                saveLists[list].push(wordData);
                this.innerHTML = `${list === "Default List" ? "All Saved Terms" : list} (★)`;

                // Also update synchronizeDefaultList
                synchronizeDefaultList();
                saveListsToStorage();
            } else {
                // Remove from list
                removeWordFromList(wordToToggle, list);

                // Update the button text
                const displayName = list === "Default List" ? "All Saved Terms" : list;
                this.innerHTML = `${displayName} (☆)`;

                // If removed from current list being viewed, refresh the display
                if (list === listName) {
                    displayIndividualListContent(listName);
                    wordCountInfo.textContent = `${saveLists[listName].length} words in this list`;
                }
            }

            // Update main vocabulary list if visible
            if (mainPage.style.display !== 'none') {
                displayFilteredVocabularyItems(vocabularyData);
            }
        });
    });
}

// URL update function
function updateURL(params) {
    const url = new URL(window.location);

    for (const [key, value] of Object.entries(params)) {
        if (value === null) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    }

    window.history.pushState({}, '', url);
}

// Browser back button handling
window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const list = urlParams.get('list');
    const searchQuery = urlParams.get('q');

    if (page === 'saved-lists') {
        showSavedListsPage();
    } else if (page === 'list' && list) {
        showIndividualListPage(list);
    } else if (page === 'about') {
        showAboutPage();
    } else if (page === 'grammar') {
        showGrammarPage();
    } else if (page === 'figures') {
        showFiguresPage();
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

// Update saved lists directory
function updateSavedListsDirectory() {
    savedListsDirectory.innerHTML = '';

    // First, create array of list names with Default List renamed and sorted
    const listNames = Object.keys(saveLists);

    // Separate Default List and other lists
    const defaultListIndex = listNames.indexOf("Default List");
    if (defaultListIndex > -1) {
        listNames.splice(defaultListIndex, 1);
    }

    // Sort other lists alphabetically
    listNames.sort();

    // Add "Default List" (displayed as "All Saved Terms") at the beginning
    if (saveLists["Default List"] !== undefined) {
        listNames.unshift("Default List");
    }

    listNames.forEach(listName => {
        const displayName = listName === "Default List" ? "All Saved Terms" : listName;

        const listItem = document.createElement('div');
        listItem.className = 'list-item';

        const listInfo = document.createElement('div');
        listInfo.className = 'list-info';
        listInfo.innerHTML = `
            <div class="list-name">${displayName}</div>
            <div class="list-count">${saveLists[listName].length} words</div>
        `;

        listInfo.style.cursor = 'pointer';
        listInfo.addEventListener('click', function() {
            showIndividualListPage(listName);
            updateURL({ page: 'list', list: listName });
        });

        const listActions = document.createElement('div');
        listActions.className = 'list-actions';

        if (listName !== "Default List") {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-list-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(`Delete list "${displayName}"?`)) {
                    deleteList(listName);
                }
            });
            listActions.appendChild(deleteBtn);
        }

        listItem.appendChild(listInfo);
        listItem.appendChild(listActions);
        savedListsDirectory.appendChild(listItem);
    });
}

// Display individual list content
function displayIndividualListContent(listName) {
    const words = saveLists[listName];
    individualListContent.innerHTML = '';

    if (words.length === 0) {
        individualListContent.innerHTML = '<p>No words saved in this list.</p>';
        return;
    }

    words.forEach(word => {
        const isRequired = word.Required === 1 || word.Required === "1";

        const wordItem = document.createElement('div');
        wordItem.className = 'vocabulary-item';
        wordItem.innerHTML = `
            <div class="vocabulary-info ${isRequired ? 'required-word' : ''}">
                <div class="word">
                    ${isRequired ? '<span class="required-star"></span>' : ''}
                    ${word.Headword}
                </div>
                <div class="definition">${word.Definitions}</div>
                <div class="occurrence">Occurrences in the Aeneid: ${word["Occurrences in the Aeneid"]}</div>
            </div>
            <button class="save-btn saved" data-word="${word.Headword}">★</button>
            <div class="save-options" id="save-options-${word.Headword.replace(/[^a-zA-Z0-9]/g, '')}">
                ${Object.keys(saveLists).map(list => {
                    const displayName = list === "Default List" ? "All Saved Terms" : list;
                    const isSaved = saveLists[list].some(w => w.Headword === word.Headword);
                    return `<button class="save-option-btn" data-list="${list}" data-word="${word.Headword}">
                        ${displayName} ${isSaved ? '(★)' : '(☆)'}
                    </button>`;
                }).join('')}
            </div>
        `;
        individualListContent.appendChild(wordItem);
    });

    // Add event listeners for save buttons to show dropdown
    individualListContent.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordId = this.getAttribute('data-word');
            const optionsDiv = document.getElementById(`save-options-${wordId.replace(/[^a-zA-Z0-9]/g, '')}`);

            // Hide all other option divs first
            document.querySelectorAll('.save-options').forEach(div => {
                if (div !== optionsDiv) {
                    div.style.display = 'none';
                }
            });

            // Toggle the options div for this word
            optionsDiv.style.display = optionsDiv.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Add event listeners for save option buttons
    individualListContent.querySelectorAll('.save-option-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordToToggle = this.getAttribute('data-word');
            const list = this.getAttribute('data-list');

            // Find the word data
            const wordData = words.find(w => w.Headword === wordToToggle);
            if (!wordData) return;

            const wordIndex = saveLists[list].findIndex(w => w.Headword === wordToToggle);

            if (wordIndex === -1) {
                // Add to list
                saveLists[list].push(wordData);
                this.innerHTML = `${list === "Default List" ? "All Saved Terms" : list} (★)`;
            } else {
                // Remove from list
                removeWordFromList(wordToToggle, list);

                // Update the button text
                const displayName = list === "Default List" ? "All Saved Terms" : list;
                this.innerHTML = `${displayName} (☆)`;

                // If removed from current list being viewed, refresh the display
                if (list === listName) {
                    displayIndividualListContent(listName);
                    wordCountInfo.textContent = `${saveLists[listName].length} words in this list`;
                }
            }
        });
    });

    // Hide save options when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.save-btn') && !e.target.closest('.save-options')) {
            document.querySelectorAll('.save-options').forEach(div => {
                div.style.display = 'none';
            });
        }
    });
}

// Remove word from list
function removeWordFromList(wordToRemove, listToRemoveFrom) {
    const wordIndex = saveLists[listToRemoveFrom].findIndex(word => word.Headword === wordToRemove);

    if (wordIndex !== -1) {
        if (listToRemoveFrom === "Default List") {
            for (const list in saveLists) {
                const indexInList = saveLists[list].findIndex(word => word.Headword === wordToRemove);
                if (indexInList !== -1) {
                    saveLists[list].splice(indexInList, 1);
                }
            }
            alert(`Word "${wordToRemove}" has been removed from all lists.`);
        } else {
            saveLists[listToRemoveFrom].splice(wordIndex, 1);

            let existsInOtherLists = false;
            for (const list in saveLists) {
                if (list !== "Default List" && list !== listToRemoveFrom) {
                    if (saveLists[list].some(word => word.Headword === wordToRemove)) {
                        existsInOtherLists = true;
                        break;
                    }
                }
            }

            if (!existsInOtherLists) {
                const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToRemove);
                if (defaultIndex !== -1) {
                    saveLists["Default List"].splice(defaultIndex, 1);
                }
            }
        }

        synchronizeDefaultList();
        saveListsToStorage();

        displayIndividualListContent(listToRemoveFrom);
        wordCountInfo.textContent = `${saveLists[listToRemoveFrom].length} words in this list`;
        displayFilteredVocabularyItems(vocabularyData);
    }
}

// Delete list
function deleteList(listName) {
    const wordsInListToDelete = saveLists[listName];

    wordsInListToDelete.forEach(wordToCheck => {
        let existsInOtherLists = false;
        for (const otherListName in saveLists) {
            if (otherListName !== listName && otherListName !== "Default List") {
                if (saveLists[otherListName].some(word => word.Headword === wordToCheck.Headword)) {
                    existsInOtherLists = true;
                    break;
                }
            }
        }

        if (!existsInOtherLists) {
            const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToCheck.Headword);
            if (defaultIndex !== -1) {
                saveLists["Default List"].splice(defaultIndex, 1);
            }
        }
    });

    delete saveLists[listName];
    saveListsToStorage();

    updateSavedListsDirectory();
    displayFilteredVocabularyItems(vocabularyData);

    alert(`List "${listName}" has been deleted. Words that were only in this list have also been removed from Default List.`);
}

// Error handling for missing CSV file
window.addEventListener('error', function(e) {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        vocabularyList.innerHTML = `
            <div class="no-results">
                <p>Could not load vocabulary data. Make sure the CSV file exists.</p>
                <p>The file should be named: <code>vocabulary_deduplicated_3.csv</code> and placed in the same directory as this HTML file.</p>
            </div>
        `;
    }
});

// Global functions needed by other modules
window.showNewListPopup = showNewListPopup;
window.hideNewListPopup = hideNewListPopup;
window.createListFromPopup = createListFromPopup;
window.updateSavedListsDirectory = updateSavedListsDirectory;
window.displayFilteredVocabularyItems = displayFilteredVocabularyItems;
window.updateURL = updateURL;
window.showMainPage = showMainPage;
window.showSavedListsPage = showSavedListsPage;
window.showIndividualListPage = showIndividualListPage;
