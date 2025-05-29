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

// Search functionality
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

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

// Display vocabulary items
function displayFilteredVocabularyItems(items) {
    if (items.length === 0) {
        vocabularyList.innerHTML = '<div class="no-results">No results found.</div>';
        return;
    }

    const sortedItems = [...items]; // Copy array

    switch (currentFilter) {
        case 'alphabet':
            // Sort alphabetically
            sortedItems.sort((a, b) => a.Headword.localeCompare(b.Headword));
            break;
        case 'required':
            // Sort required words first
            sortedItems.sort((a, b) => {
                const aRequired = a.Required === 1 || a.Required === "1";
                const bRequired = b.Required === 1 || b.Required === "1";

                if (aRequired && !bRequired) return -1;
                if (!aRequired && bRequired) return 1;
                return a.Headword.localeCompare(b.Headword); // Alphabetical if same Required status
            });
            break;
        case 'occurrences':
            // Sort by frequency (highest first)
            sortedItems.sort((a, b) => {
                // Convert to number for sorting (might be string)
                const aOccur = parseInt(a["Occurrences in the Aeneid"]) || 0;
                const bOccur = parseInt(b["Occurrences in the Aeneid"]) || 0;
                return bOccur - aOccur; // Descending order
            });
            break;
    }

    vocabularyList.innerHTML = '';

    sortedItems.forEach(item => {
        // Check if saved in any list
        let savedInLists = [];
        for (const listName in saveLists) {
            if (saveLists[listName].some(word => word.Headword === item.Headword)) {
                savedInLists.push(listName);
            }
        }

        // Check if required word (Required column is 1)
        const isRequired = item.Required === 1 || item.Required === "1";

        const vocabularyItem = document.createElement('div');
        vocabularyItem.className = 'vocabulary-item';
        vocabularyItem.innerHTML = `
            <div class="vocabulary-info ${isRequired ? 'required-word' : ''}">
                <div class="word">
                    ${isRequired ? '<span class="required-star"></span>' : ''}
                    ${item.Headword}
                </div>
                <div class="definition">${item.Definitions}</div>
                <div class="occurrence">Occurrences in the Aeneid: ${item["Occurrences in the Aeneid"]}</div>
            </div>
            <button class="save-btn ${savedInLists.length > 0 ? 'saved' : ''}" data-word="${item.Headword}">
                ${savedInLists.length > 0 ? '★' : '☆'}
            </button>
            <div class="save-options" id="save-options-${item.Headword.replace(/[^a-zA-Z0-9]/g, '')}">
                ${Object.keys(saveLists).map(listName => {
                    const isSaved = saveLists[listName].some(word => word.Headword === item.Headword);
                    return `<button class="save-option-btn" data-list="${listName}" data-word="${item.Headword}">
                        ${listName} ${isSaved ? '(★)' : '(☆)'}
                    </button>`;
                }).join('')}
            </div>
        `;

        vocabularyList.appendChild(vocabularyItem);
    });

    // Add event listeners to save buttons
    document.querySelectorAll('.save-btn').forEach(btn => {
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

    // Add event listeners to save option buttons
    document.querySelectorAll('.save-option-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordToToggle = this.getAttribute('data-word');
            const listName = this.getAttribute('data-list');
            const wordData = vocabularyData.find(item => item.Headword === wordToToggle);

            if (!wordData) return;

            const wordIndex = saveLists[listName].findIndex(word => word.Headword === wordToToggle);

            if (wordIndex === -1) {
                // Add to list
                saveLists[listName].push(wordData);
                this.innerHTML = `${listName} (★)`;

                // If not Default list, also add to Default list
                if (listName !== "Default List") {
                    const defaultListIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToToggle);
                    if (defaultListIndex === -1) {
                        saveLists["Default List"].push(wordData);
                    }
                }
            } else {
                // Remove from list
                saveLists[listName].splice(wordIndex, 1);
                this.innerHTML = `${listName} (☆)`;

                // If removing from Default list, remove from all lists
                if (listName === "Default List") {
                    // Remove word from all lists
                    for (const list in saveLists) {
                        if (list !== "Default List") {  // Default list already handled above
                            const indexInList = saveLists[list].findIndex(word => word.Headword === wordToToggle);
                            if (indexInList !== -1) {
                                saveLists[list].splice(indexInList, 1);
                            }
                        }
                    }

                    // Update option button text (all list buttons)
                    document.querySelectorAll(`.save-option-btn[data-word="${wordToToggle}"]`).forEach(optBtn => {
                        optBtn.innerHTML = `${optBtn.getAttribute('data-list')} (☆)`;
                    });
                } else {
                    // If removing from specific list, check if it exists in other lists
                    let existsInOtherLists = false;
                    for (const list in saveLists) {
                        if (list !== "Default List" && list !== listName) {
                            if (saveLists[list].some(word => word.Headword === wordToToggle)) {
                                existsInOtherLists = true;
                                break;
                            }
                        }
                    }

                    // If not in other lists, remove from Default list too
                    if (!existsInOtherLists) {
                        const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToToggle);
                        if (defaultIndex !== -1) {
                            saveLists["Default List"].splice(defaultIndex, 1);

                            // Update Default list button
                            const defaultBtn = document.querySelector(`.save-option-btn[data-list="Default List"][data-word="${wordToToggle}"]`);
                            if (defaultBtn) {
                                defaultBtn.innerHTML = `Default List (☆)`;
                            }
                        }
                    }
                }
            }

            // Update star icon
            let savedInAnyList = false;
            for (const list in saveLists) {
                if (saveLists[list].some(word => word.Headword === wordToToggle)) {
                    savedInAnyList = true;
                    break;
                }
            }

            const saveBtn = this.closest('.vocabulary-item').querySelector('.save-btn');
            if (savedInAnyList) {
                saveBtn.textContent = '★';
                saveBtn.classList.add('saved');
            } else {
                saveBtn.textContent = '☆';
                saveBtn.classList.remove('saved');
            }
            synchronizeDefaultList();
            // Update local storage
            saveListsToStorage();
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
