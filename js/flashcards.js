// Flashcard functionality implementation (modified part)
function startFlashcards(listName) {
    const words = saveLists[listName];

    if (words.length === 0) {
        alert('There are no words in this list.');
        return;
    }

    // Check if flashcard container already exists
    const existingFlashcardContainer = document.getElementById('flashcard-container');

    // If flashcard already exists, show existing one instead of creating new
    if (existingFlashcardContainer) {
        existingFlashcardContainer.style.display = 'block';

        // Hide related word container
        const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
        const wordItemsContainer = listContent.querySelector('.word-items-container');
        if (wordItemsContainer) {
            wordItemsContainer.style.display = 'none';
        }

        // Update flashcard content with current list's words if needed
        if (currentListName !== listName) {
            currentListName = listName;
            currentFlashcardIndex = 0; // Start from first word of new list
            updateFlashcard(listName);
        }

        // Activate flashcard mode and set up keyboard controls
        flashcardMode = true;
        setupFlashcardKeyboardControls();

        return; // Exit function since existing flashcard exists
    }

    // Only execute below code if flashcard doesn't exist

    // Hide current list content
    const listContent = document.getElementById('individual-list-content');
    if (listContent) {
        listContent.style.display = 'none';
    }

    // Activate flashcard mode
    flashcardMode = true;
    currentFlashcardIndex = 0;

    // Set up keyboard controls
    setupFlashcardKeyboardControls();

    // Create flashcard container
    const flashcardContainer = document.createElement('div');
    flashcardContainer.className = 'flashcard-container';
    flashcardContainer.id = 'flashcard-container';

    // Progress display
    const progressDiv = document.createElement('div');
    progressDiv.className = 'flashcard-progress';
    progressDiv.textContent = `Word ${currentFlashcardIndex + 1} / ${words.length}`;

    // Add control buttons
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'flashcard-controls';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'flashcard-btn prev-btn';
    prevBtn.textContent = '← Previous';
    prevBtn.addEventListener('click', () => {
        if (currentFlashcardIndex > 0) {
            currentFlashcardIndex--;
            updateFlashcard(listName);
        }
    });

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'flashcard-btn next-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', () => {
        if (currentFlashcardIndex < words.length - 1) {
            currentFlashcardIndex++;
            updateFlashcard(listName);
        }
    });

    // Exit button
    const exitBtn = document.createElement('button');
    exitBtn.className = 'flashcard-btn exit-btn';
    exitBtn.textContent = 'Exit';
    exitBtn.addEventListener('click', () => {
        exitFlashcardMode(listName);

        // Change Flashcards button text back to original
        const flashcardBtn = document.querySelector('.action-btn.flashcard-btn');
        if (flashcardBtn) {
            flashcardBtn.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
        }
    });

    // Shuffle button
    const shuffleBtn = document.createElement('button');
    shuffleBtn.className = 'flashcard-btn shuffle-btn';
    shuffleBtn.textContent = 'Shuffle';
    shuffleBtn.addEventListener('click', () => {
        shuffleFlashcards(listName);
    });

    // Add control buttons
    controlsDiv.appendChild(prevBtn);
    controlsDiv.appendChild(shuffleBtn);
    controlsDiv.appendChild(exitBtn);
    controlsDiv.appendChild(nextBtn);

    function addTouchSupport(flashcardDiv) {
        let touchStartX = 0;
        let touchEndX = 0;

        flashcardDiv.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, false);

        flashcardDiv.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);

        function handleSwipe() {
            // Minimum swipe distance (pixels)
            const minSwipeDistance = 50;

            if (touchEndX < touchStartX - minSwipeDistance) {
                // Swipe left to right: next card
                if (currentFlashcardIndex < saveLists[currentListName].length - 1) {
                    currentFlashcardIndex++;
                    updateFlashcard(currentListName);
                }
            } else if (touchEndX > touchStartX + minSwipeDistance) {
                // Swipe right to left: previous card
                if (currentFlashcardIndex > 0) {
                    currentFlashcardIndex--;
                    updateFlashcard(currentListName);
                }
            } else {
                // Tap: flip card
                flashcardDiv.classList.toggle('flipped');
            }
        }
    }

    // Create flashcard
    const flashcardDiv = document.createElement('div');
    flashcardDiv.className = 'flashcard';
    flashcardDiv.innerHTML = `
        <div class="flashcard-inner">
            <div class="flashcard-front">
                ${words[currentFlashcardIndex].Headword}
            </div>
            <div class="flashcard-back">
                <div class="definition">${words[currentFlashcardIndex].Definitions}</div>
            </div>
        </div>
    `;

    // Delete this part if you want to delete keyboard shortcuts display
    const keyboardHelpDiv = document.createElement('div');
    keyboardHelpDiv.className = 'keyboard-help';
    keyboardHelpDiv.innerHTML = `
        <p>Keyboard shortcuts:
            <span class="key">←</span> Previous card |
            <span class="key">→</span> Next card |
            <span class="key">Space</span> Flip card
        </p>
    `;
    flashcardContainer.appendChild(keyboardHelpDiv);
    // Delete until this part

    addTouchSupport(flashcardDiv);

    // Flashcard click event
    flashcardDiv.addEventListener('click', function() {
        this.classList.toggle('flipped');
    });

    // Add elements to flashcard container
    flashcardContainer.appendChild(progressDiv);
    flashcardContainer.appendChild(controlsDiv);
    flashcardContainer.appendChild(flashcardDiv);

    // Add flashcard container to individual list page
    const individualListPage = document.getElementById('individual-list-page');
    if (individualListPage && listContent) {
        listContent.parentNode.insertBefore(flashcardContainer, listContent.nextSibling);
    }
}

// Update flashcard
function updateFlashcard(listName) {
    const words = saveLists[listName];
    const flashcardContainer = document.getElementById('flashcard-container');

    if (!flashcardContainer) return;

    // Update progress
    const progressDiv = flashcardContainer.querySelector('.flashcard-progress');
    if (progressDiv) {
        progressDiv.textContent = `Word ${currentFlashcardIndex + 1} / ${words.length}`;
    }

    // Update current flashcard
    const flashcardDiv = flashcardContainer.querySelector('.flashcard');
    if (flashcardDiv) {
        // If flashcard is flipped, return to front
        flashcardDiv.classList.remove('flipped');

        // Update content
        const frontDiv = flashcardDiv.querySelector('.flashcard-front');
        const backDiv = flashcardDiv.querySelector('.flashcard-back');

        if (frontDiv && backDiv) {
            frontDiv.textContent = words[currentFlashcardIndex].Headword;
            backDiv.innerHTML = `
                <div class="definition">${words[currentFlashcardIndex].Definitions}</div>
            `;
        }
    }
}

// Exit flashcard mode (modified part)
function exitFlashcardMode(listName) {
    // Deactivate flashcard mode
    flashcardMode = false;

    // Remove keyboard event listener
    document.removeEventListener('keydown', handleFlashcardKeydown);

    // Hide flashcard container instead of removing
    const flashcardContainer = document.getElementById('flashcard-container');
    if (flashcardContainer) {
        flashcardContainer.style.display = 'none';
    }

    // Show word list again
    const listContent = document.getElementById('individual-list-content');
    if (listContent) {
        listContent.style.display = 'block';
    }
}

// Shuffle flashcards
function shuffleFlashcards(listName) {
    // Use Fisher-Yates shuffle algorithm
    const words = saveLists[listName];

    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }

    // Start from first card
    currentFlashcardIndex = 0;
    updateFlashcard(listName);

    // Save (optional - uncomment to maintain shuffled order)
    // saveListsToStorage();
}

// Global flashcard keyboard event handler function
function setupFlashcardKeyboardControls() {
    // Remove existing event listener (prevent duplication)
    document.removeEventListener('keydown', handleFlashcardKeydown);

    // Add new event listener
    document.addEventListener('keydown', handleFlashcardKeydown);
}

// Keyboard event handler
function handleFlashcardKeydown(e) {
    // Ignore if flashcard mode is not active
    if (!flashcardMode) return;

    // Ignore if focus is on input field (search box etc.)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowRight': // Right arrow: next card
            if (currentFlashcardIndex < saveLists[currentListName].length - 1) {
                currentFlashcardIndex++;
                updateFlashcard(currentListName);
            }
            e.preventDefault(); // Prevent default scroll behavior
            break;

        case 'ArrowLeft': // Left arrow: previous card
            if (currentFlashcardIndex > 0) {
                currentFlashcardIndex--;
                updateFlashcard(currentListName);
            }
            e.preventDefault(); // Prevent default scroll behavior
            break;

        case ' ': // Space bar: flip card
            const flashcardDiv = document.querySelector('.flashcard');
            if (flashcardDiv) {
                flashcardDiv.classList.toggle('flipped');
            }
            e.preventDefault(); // Prevent default scroll behavior
            break;
    }
}
