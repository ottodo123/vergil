// Load saved lists
async function loadSavedLists() {
    // Check login state
    if (auth && auth.currentUser) {
        // If logged in, auth.onAuthStateChanged already handles this
        // Don't do anything here
        console.log("App initialization: Logged in, Firebase data will be loaded in onAuthStateChanged");
    } else {
        // Logged out state: Load data from local storage (don't initialize)
        console.log("App initialization: Logged out, loading data from local storage");

        const savedListsJson = localStorage.getItem('saveLists');
        if (savedListsJson) {
            try {
                saveLists = JSON.parse(savedListsJson);
                console.log("Saved lists loaded from local storage");
            } catch (e) {
                console.error("Error parsing saved lists:", e);
                saveLists = { "Default List": [] };
                localStorage.setItem('saveLists', JSON.stringify(saveLists));
            }
        } else {
            // Initialize only if no saved data exists
            saveLists = { "Default List": [] };
            localStorage.setItem('saveLists', JSON.stringify(saveLists));
        }
    }
}

// Integrated data save function
function saveListsToStorage() {
    // Check login state
    if (auth && auth.currentUser) {
        // Logged in: Save to both local storage and Firebase
        localStorage.setItem('saveLists', JSON.stringify(saveLists));
        saveUserDataToFirebase(auth.currentUser.uid);
    } else {
        // Logged out: Temporarily save to local storage only
        localStorage.setItem('saveLists', JSON.stringify(saveLists));
    }
}

// Default List synchronization function - ensures Default List contains all words from all other lists
function synchronizeDefaultList() {
    // Get all words from other lists and add to Default List if not already there
    for (const listName in saveLists) {
        if (listName !== "Default List") {
            saveLists[listName].forEach(word => {
                const existsInDefault = saveLists["Default List"].some(defaultWord =>
                    defaultWord.Headword === word.Headword
                );

                if (!existsInDefault) {
                    saveLists["Default List"].push(word);
                    console.log(`Word "${word.Headword}" has been automatically added to Default List.`);
                }
            });
        }
    }

    // Find words in Default List that don't exist in any other list
    const wordsToRemoveFromDefault = [];

    saveLists["Default List"].forEach(defaultWord => {
        let existsInOtherLists = false;

        for (const listName in saveLists) {
            if (listName !== "Default List") {
                if (saveLists[listName].some(word => word.Headword === defaultWord.Headword)) {
                    existsInOtherLists = true;
                    break;
                }
            }
        }

        if (!existsInOtherLists) {
            wordsToRemoveFromDefault.push(defaultWord.Headword);
        }
    });

    // Save data
    saveListsToStorage();
}

// Create new save list
createListBtn.addEventListener('click', () => {
    const newListName = newListNameInput.value.trim();

    if (newListName === '') {
        alert('Please enter a list name');
        return;
    }

    if (saveLists[newListName]) {
        alert('A list with this name already exists');
        return;
    }

    // Create new list
    saveLists[newListName] = [];
    saveListsToStorage();

    // Update UI
    newListNameInput.value = '';
    updateSaveListTabs();
    switchSaveList(newListName);

    // Refresh main vocabulary list to update save options
    displayFilteredVocabularyItems(vocabularyData);
    synchronizeDefaultList();
});

// Update save list tabs
function updateSaveListTabs(activeListName = null) {
    saveListTabs.innerHTML = '';
    saveListContents.innerHTML = '';

    if (!activeListName) {
        activeListName = currentListName;
    }

    // Create tabs container (container for tabs)
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';

    // Create new list add button
    const addListBtn = document.createElement('button');
    addListBtn.className = 'add-list-btn';
    addListBtn.innerHTML = '+';
    addListBtn.title = 'Create new list';
    addListBtn.addEventListener('click', showNewListPopup);

    // Create tabs and add to tabs container
    Object.keys(saveLists).forEach(listName => {
        const tab = document.createElement('div');
        tab.className = `save-list-tab ${listName === activeListName ? 'active' : ''}`;
        tab.textContent = listName;
        tab.setAttribute('data-list', listName);

        // Tab click event (keep existing code)
        tab.addEventListener('click', function() {
            const listName = this.getAttribute('data-list');

            // Remove flashcard if exists when switching lists
            const flashcardContainer = document.getElementById('flashcard-container');
            if (flashcardContainer) {
                flashcardContainer.remove();

                // Reset Flashcards button text
                const flashcardBtn = document.querySelector('.action-btn.flashcard-btn');
                if (flashcardBtn) {
                    flashcardBtn.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
                }
            }

            switchSaveList(listName);
            updateURL({ list: listName });
        });

        if (Object.keys(saveLists).length > 1 && listName !== "Default List") {
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = ' ×';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.color = '#999';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Keep existing delete code
                if (confirm(`Delete list "${listName}"?`)) {
                    // Get words from list to delete
                    const wordsInListToDelete = saveLists[listName];

                    // Check if each word exists in other lists
                    wordsInListToDelete.forEach(wordToCheck => {
                        // Check if word exists in other custom lists
                        let existsInOtherLists = false;
                        for (const otherListName in saveLists) {
                            // Exclude current list to delete and Default List
                            if (otherListName !== listName && otherListName !== "Default List") {
                                if (saveLists[otherListName].some(word => word.Headword === wordToCheck.Headword)) {
                                    existsInOtherLists = true;
                                    break;
                                }
                            }
                        }

                        // If not in other lists, remove from Default List too
                        if (!existsInOtherLists) {
                            const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToCheck.Headword);
                            if (defaultIndex !== -1) {
                                saveLists["Default List"].splice(defaultIndex, 1);
                            }
                        }
                    });

                    // Delete list
                    delete saveLists[listName];
                    saveListsToStorage();

                    // Switch to Default List
                    switchSaveList("Default List");
                    updateURL({ list: "Default List" });
                    updateSaveListTabs("Default List");

                    // Update word list UI
                    displayFilteredVocabularyItems(vocabularyData);

                    // Notify user
                    alert(`List "${listName}" has been deleted. Words that were only in this list have also been removed from Default List.`);
                }
            });
            tab.appendChild(deleteBtn);
        }

        tabsContainer.appendChild(tab);
    });

    // Add elements to saveListTabs
    saveListTabs.appendChild(tabsContainer);
    saveListTabs.appendChild(addListBtn);

    // Create list contents
    Object.keys(saveLists).forEach(listName => {
        // Keep existing content creation code
        const content = document.createElement('div');
        content.className = `save-list-content ${listName === activeListName ? 'active' : ''}`;
        content.id = `save-list-content-${listName.replace(/\s+/g, '-')}`;

        // Add action buttons
        const actionButtons = document.createElement('div');
        actionButtons.className = 'list-action-buttons';

        // Flashcard button
        const flashcardButton = document.createElement('button');
        flashcardButton.className = 'action-btn flashcard-btn';
        flashcardButton.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
        flashcardButton.addEventListener('click', function() {
            // Check flashcard container
            const flashcardContainer = document.getElementById('flashcard-container');

            // If flashcard is already displayed
            if (flashcardContainer && flashcardContainer.style.display !== 'none') {
                exitFlashcardMode(listName); // Exit flashcard mode (hide)

                // Change button text
                this.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
            } else {
                // If flashcard doesn't exist or is hidden
                startFlashcards(listName); // Start flashcards

                // Change button text
                this.innerHTML = '<span class="btn-icon">🔄</span> Back to List';
            }
        });
        actionButtons.appendChild(flashcardButton);

        // Copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'action-btn copy-btn';
        copyButton.innerHTML = '<span class="btn-icon">📋</span> Copy List';
        copyButton.addEventListener('click', function() {
            copyList(listName);
        });
        actionButtons.appendChild(copyButton);

        // Print button
        const printButton = document.createElement('button');
        printButton.className = 'action-btn print-btn';
        printButton.innerHTML = '<span class="btn-icon">🖨️</span> Print List';
        printButton.addEventListener('click', function() {
            printList(listName);
        });
        actionButtons.appendChild(printButton);

        content.appendChild(actionButtons);

        // Word count info
        const wordCountInfo = document.createElement('div');
        wordCountInfo.className = 'word-count-info';
        wordCountInfo.textContent = `${saveLists[listName].length} words in this list`;
        content.appendChild(wordCountInfo);

        if (saveLists[listName].length === 0) {
            content.innerHTML += '<p>No words saved in this list.</p>';
        } else {
            // Create a container for all the word items (to preserve existing content)
            const wordItemsContainer = document.createElement('div');
            wordItemsContainer.className = 'word-items-container';

            saveLists[listName].forEach(word => {
                // Check if required word
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
                    <button class="save-btn saved" data-word="${word.Headword}" data-list="${listName}">★</button>
                `;
                wordItemsContainer.appendChild(wordItem);
            });

            content.appendChild(wordItemsContainer);

            // Remove word from list
            content.querySelectorAll('.save-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const wordToRemove = this.getAttribute('data-word');
                    const listToRemoveFrom = this.getAttribute('data-list');
                    const wordIndex = saveLists[listToRemoveFrom].findIndex(word => word.Headword === wordToRemove);

                    if (wordIndex !== -1) {
                        // If removing from Default List, remove from all lists
                        if (listToRemoveFrom === "Default List") {
                            // Remove word from all lists
                            for (const list in saveLists) {
                                const indexInList = saveLists[list].findIndex(word => word.Headword === wordToRemove);
                                if (indexInList !== -1) {
                                    saveLists[list].splice(indexInList, 1);
                                }
                            }
                            alert(`Word "${wordToRemove}" has been removed from all lists.`);
                        } else {
                            // Remove from specific list only
                            saveLists[listToRemoveFrom].splice(wordIndex, 1);

                            // Check if word exists in other custom lists
                            let existsInOtherLists = false;
                            for (const list in saveLists) {
                                if (list !== "Default List" && list !== listToRemoveFrom) {
                                    if (saveLists[list].some(word => word.Headword === wordToRemove)) {
                                        existsInOtherLists = true;
                                        break;
                                    }
                                }
                            }

                            // If not in other lists, remove from Default list too
                            if (!existsInOtherLists) {
                                const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToRemove);
                                if (defaultIndex !== -1) {
                                    saveLists["Default List"].splice(defaultIndex, 1);
                                }
                            }
                        }
                        synchronizeDefaultList();
                        // Update local storage
                        saveListsToStorage();

                        // Update saved list UI
                        updateSaveListTabs(currentListName);

                        displayFilteredVocabularyItems(vocabularyData);

                        // Update star icon in main word list
                        const mainListBtn = document.querySelector(`.vocabulary-list .save-btn[data-word="${wordToRemove}"]`);
                        if (mainListBtn) {
                            // Check if saved in any list
                            let savedInAnyList = false;
                            for (const list in saveLists) {
                                if (saveLists[list].some(word => word.Headword === wordToRemove)) {
                                    savedInAnyList = true;
                                    break;
                                }
                            }

                            // Update star icon
                            if (!savedInAnyList) {
                                mainListBtn.textContent = '☆';
                                mainListBtn.classList.remove('saved');
                            }
                        }
                    }
                });
            });
        }

        saveListContents.appendChild(content);
    });
}

// Switch between save lists
function switchSaveList(listName) {
    currentListName = listName;

    // Update tabs
    document.querySelectorAll('.save-list-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-list') === listName);
    });

    // Update contents
    document.querySelectorAll('.save-list-content').forEach(content => {
        content.classList.toggle('active', content.id === `save-list-content-${listName.replace(/\s+/g, '-')}`);
    });
}

// Show new list popup function
function showNewListPopup() {
    console.log("showNewListPopup called", newListPopup); // Debug log
    if (newListPopup) {
        popupListName.value = ''; // Reset input field
        newListPopup.style.display = 'block';
        setTimeout(() => {
            popupListName.focus(); // Focus on input field
        }, 100);
    } else {
        console.error("Popup element not found!");
    }
}

// Hide new list popup function
function hideNewListPopup() {
    console.log("hideNewListPopup called"); // Debug log
    if (newListPopup) {
        newListPopup.style.display = 'none';
        popupListName.value = ''; // Reset input field
    }
}

// Create list from popup
function createListFromPopup() {
    console.log("createListFromPopup called"); // Debug log
    const newListName = popupListName.value.trim();
    console.log("New list name:", newListName); // Debug log

    if (newListName === '') {
        alert('Please enter a list name');
        return;
    }

    if (saveLists[newListName]) {
        alert('A list with this name already exists');
        return;
    }

    console.log(`Creating new list: ${newListName}`);

    // Create new list
    saveLists[newListName] = [];
    synchronizeDefaultList(); // Synchronize Default List
    saveListsToStorage();

    // Update UI
    hideNewListPopup(); // Close popup
    updateSaveListTabs();
    switchSaveList(newListName);

    // Update word list
    displayFilteredVocabularyItems(vocabularyData);
}
