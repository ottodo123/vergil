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
if (typeof createListBtn !== 'undefined' && createListBtn) {
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
        updateSavedListsDirectory();

        // Refresh main vocabulary list to update save options
        displayFilteredVocabularyItems(vocabularyData);
        synchronizeDefaultList();
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
    updateSavedListsDirectory();

    // Update word list
    displayFilteredVocabularyItems(vocabularyData);
}
