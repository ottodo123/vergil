// Load user data from Firebase
async function loadUserDataFromFirebase(userId) {
    try {
        console.log("Attempting to load data from Firebase:", userId);
        const docRef = db.collection("userData").doc(userId);
        const docSnap = await docRef.get();

        // Backup local data before login
        const localSaveLists = JSON.parse(JSON.stringify(saveLists));

        if (docSnap.exists) {
            // If data exists in Firebase, merge with local data
            const userData = docSnap.data().saveLists;
            if (userData) {
                // Merge instead of completely replacing local data
                mergeSaveLists(localSaveLists, userData);

                // Update UI
                displayFilteredVocabularyItems(vocabularyData);
                if (document.getElementById('saved-lists-page').style.display !== 'none') {
                    updateSavedListsDirectory();
                }

                // Also backup to local storage
                localStorage.setItem('saveLists', JSON.stringify(saveLists));

                // Save merged data back to Firebase
                await saveUserDataToFirebase(userId);

                console.log("Firebase data and local data have been merged");
                return true;
            }
        } else {
            console.log("No data found in Firebase. Using local data.");

            // If no data in Firebase, keep current local data and save to Firebase
            await saveUserDataToFirebase(userId);

            // Update UI
            displayFilteredVocabularyItems(vocabularyData);
            if (document.getElementById('saved-lists-page').style.display !== 'none') {
                updateSaveListTabs();
            }

            console.log("Local data has been saved to Firebase");
            return true;
        }
    } catch (error) {
        console.error("Error loading data from Firebase:", error);
        return false;
    }
}

// Merge local data and Firebase data
function mergeSaveLists(localLists, firebaseLists) {
    // Handle items that exist in both lists
    for (const listName in localLists) {
        if (firebaseLists.hasOwnProperty(listName)) {
            // For lists that exist in both, merge the words
            const firebaseWords = firebaseLists[listName];
            const localWords = localLists[listName];

            // Add local words that don't exist in Firebase
            for (const localWord of localWords) {
                const exists = firebaseWords.some(firebaseWord =>
                    firebaseWord.Headword === localWord.Headword
                );

                if (!exists) {
                    firebaseLists[listName].push(localWord);
                    console.log(`Word "${localWord.Headword}" has been added to Firebase's "${listName}" list`);
                }
            }
        } else {
            // Local lists that don't exist in Firebase are added as is
            firebaseLists[listName] = localLists[listName];
            console.log(`Local list "${listName}" has been added to Firebase`);
        }
    }

    // Apply result to current saveLists
    saveLists = firebaseLists;

    return saveLists;
}

// Save user data to Firebase
async function saveUserDataToFirebase(userId) {
    try {
        // Backup to local storage
        localStorage.setItem('saveLists', JSON.stringify(saveLists));

        // Don't save if user is not logged in
        if (!auth.currentUser) {
            console.log("Not logged in, skipping Firebase save");
            return false;
        }

        // Save data to Firestore
        await db.collection("userData").doc(userId).set({
            saveLists: saveLists,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("Data saved to Firebase successfully");
        return true;
    } catch (error) {
        console.error("Error saving data to Firebase:", error);
        return false;
    }
}
