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
