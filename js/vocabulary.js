// Load CSV data
async function loadCSVData() {
    try {
        vocabularyList.innerHTML = '<div class="loading">Loading vocabulary data...</div>';

        // Fetch the CSV file
        const response = await fetch('vocabulary_deduplicated_3.csv');
        const data = await response.text();

        // Parse CSV using PapaParse
        Papa.parse(data, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.data && results.data.length > 0) {
                    // Check if the data is valid (has expected columns)
                    if (results.meta.fields.includes('Headword') &&
                        results.meta.fields.includes('Definitions') &&
                        results.meta.fields.includes('Occurrences in the Aeneid')) {

                        vocabularyData = results.data;
                        console.log(`Loaded ${vocabularyData.length} vocabulary items`);
                        // Log whether Headword_Data column exists
                        console.log(`Headword_Data column found: ${results.meta.fields.includes('Headword_Data')}`);
                        displayFilteredVocabularyItems(vocabularyData); // Use modified function
                    } else {
                        console.error('CSV file does not contain expected columns');
                        vocabularyList.innerHTML = '<div class="no-results">Error: CSV file format is incorrect.</div>';
                    }
                } else {
                    console.error('No data found in CSV file');
                    vocabularyList.innerHTML = '<div class="no-results">No vocabulary data found.</div>';
                }
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
                vocabularyList.innerHTML = '<div class="no-results">Error parsing vocabulary data.</div>';
            }
        });
    } catch (error) {
        console.error('Error loading CSV file:', error);
        vocabularyList.innerHTML = '<div class="no-results">Failed to load vocabulary data.</div>';
    }
}

function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm === '') {
        displayFilteredVocabularyItems(vocabularyData);
        // Remove q parameter from URL if no search term
        updateURL({ q: null });
        return;
    }

    // Add search term to URL
    updateURL({ q: searchTerm });

    const filteredVocabulary = vocabularyData.filter(item =>
        item.Headword.toLowerCase().includes(searchTerm) ||
        item.Definitions.toLowerCase().includes(searchTerm) ||
        (item.Headword_Data && item.Headword_Data.toLowerCase().includes(searchTerm))
    );

    // Add back button if it doesn't exist
    if (!document.getElementById('back-btn')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'back-btn';
        backBtn.className = 'back-btn';
        backBtn.textContent = 'Back to All Words';
        backBtn.addEventListener('click', function() {
            searchInput.value = '';
            displayFilteredVocabularyItems(vocabularyData);
            this.remove(); // Remove button
        });

        // Add button above vocabulary list
        vocabularyList.parentNode.insertBefore(backBtn, vocabularyList);
    }

    displayFilteredVocabularyItems(filteredVocabulary);
}

function applyFilter(filterType) {
    // Update current filter
    currentFilter = filterType;

    // Update active button styles
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));

    switch (filterType) {
        case 'alphabet':
            if (filterAlphabetBtn) filterAlphabetBtn.classList.add('active');
            break;
        case 'required':
            if (filterRequiredBtn) filterRequiredBtn.classList.add('active');
            break;
        case 'occurrences':
            if (filterOccurrencesBtn) filterOccurrencesBtn.classList.add('active');
            break;
    }

    // Re-sort currently displayed word list
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm === '') {
        // Display entire list if no search term
        displayFilteredVocabularyItems(vocabularyData);
    } else {
        // Display filtered list if search term exists
        const filteredVocabulary = vocabularyData.filter(item =>
            item.Headword.toLowerCase().includes(searchTerm) ||
            item.Definitions.toLowerCase().includes(searchTerm) ||
            (item.Headword_Data && item.Headword_Data.toLowerCase().includes(searchTerm))
        );
        displayFilteredVocabularyItems(filteredVocabulary);
    }
}

// Initialize search functionality - to be called after DOM is loaded
function initializeSearch() {
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

// Add this function to vocabulary.js

function displayFilteredVocabularyItems(items) {
    // Clear the vocabulary list
    vocabularyList.innerHTML = '';

    if (!items || items.length === 0) {
        vocabularyList.innerHTML = '<div class="no-results">No vocabulary items to display.</div>';
        return;
    }

    // Sort items based on current filter
    let sortedItems = [...items]; // Create a copy to avoid mutating the original

    switch (currentFilter) {
        case 'alphabet':
            sortedItems.sort((a, b) => a.Headword.localeCompare(b.Headword));
            break;
        case 'required':
            sortedItems.sort((a, b) => {
                const aRequired = a.Required === 1 || a.Required === "1";
                const bRequired = b.Required === 1 || b.Required === "1";
                if (aRequired && !bRequired) return -1;
                if (!aRequired && bRequired) return 1;
                return a.Headword.localeCompare(b.Headword);
            });
            break;
        case 'occurrences':
            sortedItems.sort((a, b) => {
                const aOccurrences = parseInt(a["Occurrences in the Aeneid"]) || 0;
                const bOccurrences = parseInt(b["Occurrences in the Aeneid"]) || 0;
                return bOccurrences - aOccurrences; // Higher occurrences first
            });
            break;
    }

    // Display each vocabulary item
    sortedItems.forEach(item => {
        const isRequired = item.Required === 1 || item.Required === "1";

        const vocabularyItem = document.createElement('div');
        vocabularyItem.className = 'vocabulary-item';

        // Check if word is saved in any list
        let isSaved = false;
        for (const listName in saveLists) {
            if (saveLists[listName].some(savedWord => savedWord.Headword === item.Headword)) {
                isSaved = true;
                break;
            }
        }

        vocabularyItem.innerHTML = `
            <div class="vocabulary-info ${isRequired ? 'required-word' : ''}">
                <div class="word">
                    ${isRequired ? '<span class="required-star"></span>' : ''}
                    ${item.Headword}
                </div>
                <div class="definition">${item.Definitions}</div>
                <div class="occurrence">Occurrences in the Aeneid: ${item["Occurrences in the Aeneid"]}</div>
            </div>
            <button class="save-btn ${isSaved ? 'saved' : ''}" data-word="${item.Headword}">★</button>
            <div class="save-options" id="save-options-${item.Headword.replace(/[^a-zA-Z0-9]/g, '')}">
                ${Object.keys(saveLists).map(list => {
                    const displayName = list === "Default List" ? "All Saved Terms" : list;
                    const isInList = saveLists[list].some(w => w.Headword === item.Headword);
                    return `<button class="save-option-btn" data-list="${list}" data-word="${item.Headword}">
                        ${displayName} ${isInList ? '(★)' : '(☆)'}
                    </button>`;
                }).join('')}
            </div>
        `;

        vocabularyList.appendChild(vocabularyItem);
    });

    // Add event listeners for save buttons
    const saveButtons = vocabularyList.querySelectorAll('.save-btn');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordId = this.getAttribute('data-word');
            const optionsDiv = document.getElementById(`save-options-${wordId.replace(/[^a-zA-Z0-9]/g, '')}`);

            // Hide all other option divs
            document.querySelectorAll('.save-options').forEach(div => {
                if (div !== optionsDiv) {
                    div.style.display = 'none';
                }
            });

            // Toggle this word's options
            if (optionsDiv) {
                optionsDiv.style.display = optionsDiv.style.display === 'block' ? 'none' : 'block';
            }
        });
    });

    // Add event listeners for save option buttons
    vocabularyList.querySelectorAll('.save-option-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordToToggle = this.getAttribute('data-word');
            const listName = this.getAttribute('data-list');

            // Find the word data
            const wordData = vocabularyData.find(item => item.Headword === wordToToggle);
            if (!wordData) {
                console.error('Could not find word data for:', wordToToggle);
                return;
            }

            const wordIndex = saveLists[listName].findIndex(w => w.Headword === wordToToggle);

            if (wordIndex === -1) {
                // Add to list
                saveLists[listName].push(wordData);
                this.innerHTML = `${listName === "Default List" ? "All Saved Terms" : listName} (★)`;

                // Update the main save button
                const mainSaveBtn = this.closest('.vocabulary-item').querySelector('.save-btn');
                if (mainSaveBtn) {
                    mainSaveBtn.classList.add('saved');
                }
            } else {
                // Remove from list
                saveLists[listName].splice(wordIndex, 1);
                this.innerHTML = `${listName === "Default List" ? "All Saved Terms" : listName} (☆)`;

                // Check if word is still in any list
                let stillSaved = false;
                for (const list in saveLists) {
                    if (saveLists[list].some(w => w.Headword === wordToToggle)) {
                        stillSaved = true;
                        break;
                    }
                }

                // Update the main save button
                const mainSaveBtn = this.closest('.vocabulary-item').querySelector('.save-btn');
                if (mainSaveBtn && !stillSaved) {
                    mainSaveBtn.classList.remove('saved');
                }
            }

            // Synchronize and save
            synchronizeDefaultList();
            saveListsToStorage();
        });
    });
}

// Make the function globally available
window.displayFilteredVocabularyItems = displayFilteredVocabularyItems;
