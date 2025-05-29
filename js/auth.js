// Initialize Firebase function
function initializeFirebase() {
    // Firebase configuration (updated with copied values)
    if (firebase.apps.length) {
        firebase.app().delete().then(() => {
            firebase.initializeApp(firebaseConfig);
            continueInitialization();
        });
    } else {
        firebase.initializeApp(firebaseConfig);
        continueInitialization();
    }

    function continueInitialization() {
        // Existing initialization code...
        auth = firebase.auth();
        db = firebase.firestore();

        // Important: Changed to polling method
        db.settings({
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true,
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });

        // Authentication state change listener
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is logged in
                currentUser = user;
                localStorage.setItem('userName', user.displayName || user.email);
                localStorage.setItem('userEmail', user.email);

                // Update UI
                updateLoginUI(user.displayName || user.email);

                // Important: Load data from Firebase when logged in
                loadUserDataFromFirebase(user.uid);
            } else {
                // Logged out state
                currentUser = null;
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');

                // Maintain local data when logged out - don't initialize
                const savedListsJson = localStorage.getItem('saveLists');
                if (savedListsJson) {
                    try {
                        saveLists = JSON.parse(savedListsJson);
                    } catch (e) {
                        console.error("Error parsing saved lists:", e);
                        saveLists = { "Default List": [] };
                        localStorage.setItem('saveLists', JSON.stringify(saveLists));
                    }
                } else {
                    saveLists = { "Default List": [] };
                    localStorage.setItem('saveLists', JSON.stringify(saveLists));
                }

                // Update UI
                displayFilteredVocabularyItems(vocabularyData);
                if (savedListsPage && savedListsPage.style.display !== 'none') {
                    updateSavedListsDirectory();
                }

                // Show login button in header
                const firebaseAuthContainer = document.querySelector('.firebase-auth-container-header');
                if (firebaseAuthContainer) {
                    firebaseAuthContainer.style.display = 'block';
                }

                // Remove user info from header
                const headerAuth = document.querySelector('.header-auth');
                if (headerAuth) {
                    const userInfo = headerAuth.querySelector('.user-info-header');
                    const logoutBtn = headerAuth.querySelector('.logout-btn-header');
                    if (userInfo) userInfo.remove();
                    if (logoutBtn) logoutBtn.remove();
                }

                // Show login button in mobile menu
                const mobileAuth = document.querySelector('.mobile-auth');
                if (mobileAuth) {
                    mobileAuth.innerHTML = `
                        <div class="firebase-auth-container-mobile">
                            <button id="google-sign-in-mobile" class="google-sign-in-btn-mobile">
                                <span class="google-icon">G</span> Sign in with Google
                            </button>
                        </div>
                    `;

                    // Reset event listener
                    const googleSignInBtnMobile = document.getElementById('google-sign-in-mobile');
                    if (googleSignInBtnMobile) {
                        googleSignInBtnMobile.addEventListener('click', handleGoogleSignIn);
                    }
                }
            }
        });
    }
}

// Google login function
function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Login successful
            const user = result.user;
            console.log("Login successful:", user.displayName);
        })
        .catch((error) => {
            console.error("Google login error:", error);
            alert("An error occurred during login: " + error.message);
        });
}

// Update login UI function
function updateLoginUI(userName) {
    // Desktop: Hide Firebase login container (header container)
    const firebaseAuthContainer = document.querySelector('.firebase-auth-container-header');
    if (firebaseAuthContainer) {
        firebaseAuthContainer.style.display = 'none';
    }

    // Desktop: Add user info and logout button to header auth area
    const headerAuth = document.querySelector('.header-auth');
    if (headerAuth) {
        // Remove existing user info
        const existingUserInfo = headerAuth.querySelector('.user-info-header');
        const existingLogoutBtn = headerAuth.querySelector('.logout-btn-header');
        if (existingUserInfo) existingUserInfo.remove();
        if (existingLogoutBtn) existingLogoutBtn.remove();

        // Display user info
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info-header';
        userInfo.textContent = `${userName}`;

        // Create logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn-header';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);

        // Add to header auth area
        headerAuth.appendChild(userInfo);
        headerAuth.appendChild(logoutBtn);
    }

    // Mobile: Update mobile menu auth area
    const mobileAuth = document.querySelector('.mobile-auth');
    if (mobileAuth) {
        // Remove existing content
        mobileAuth.innerHTML = '';

        // Display user info
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info-mobile';
        userInfo.textContent = `${userName}`;

        // Create logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn-mobile';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);

        // Add to mobile auth area
        mobileAuth.appendChild(userInfo);
        mobileAuth.appendChild(logoutBtn);
    }
}

// Logout handler function
function handleLogout() {
    auth.signOut()
        .then(() => {
            console.log("Logout successful");

            // Maintain local storage when logged out (don't completely delete)
            // Allow existing data to be used

            // Update UI - refresh word list
            displayFilteredVocabularyItems(vocabularyData);

            // Refresh page
            window.location.reload();
        })
        .catch((error) => {
            console.error("Logout error:", error);
            alert("An error occurred during logout: " + error.message);
        });
}

// Check login state function
function checkLoginState() {
    // Firebase auth.onAuthStateChanged listener already handles this
    // This function is called on initial page load to initialize UI with local storage info
    const userName = localStorage.getItem('userName');

    if (userName) {
        updateLoginUI(userName);
    }
}

// Sign In button fallback (not used now)
const signInBtn = document.getElementById('sign-in-btn');
if (signInBtn) {
    signInBtn.addEventListener('click', () => {
        alert('Sign In feature is now handled via Google Sign-In.');
    });
}
