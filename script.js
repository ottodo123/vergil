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
let currentFilter = 'alphabet'; // 기본 필터: 알파벳순

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

//new const
const glossaryBtn = document.getElementById('glossary-btn');
const grammarBtn = document.getElementById('grammar-btn');
const figuresBtn = document.getElementById('figures-btn');
const aboutBtn = document.getElementById('about-btn');
const grammarPage = document.getElementById('grammar-page');
const figuresPage = document.getElementById('figures-page');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCSVData();

    // Change this to handle the async nature of loadSavedLists
    loadSavedLists().then(() => {
        console.log("Saved lists loaded");
    }).catch(error => {
        console.error("Error loading saved lists:", error);
    });

    // URL 파라미터에 따라 페이지 표시
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

    // 검색어가 URL에 있는 경우
    const searchQuery = urlParams.get('q');
    if (searchQuery) {
        searchInput.value = searchQuery;
        performSearch();
    }

   // Firebase 초기화
    initializeFirebase();

    // 로그인 상태 확인
    checkLoginState();

    // 구글 로그인 버튼 이벤트 리스너 설정
    const googleSignInBtn = document.getElementById('google-sign-in');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }

    // 모바일 구글 로그인 버튼 이벤트 리스너 설정
    const googleSignInBtnMobile = document.getElementById('google-sign-in-mobile');
    if (googleSignInBtnMobile) {
        googleSignInBtnMobile.addEventListener('click', handleGoogleSignIn);
    }

    // 팝업 관련 이벤트 리스너 설정
    console.log("Setting up popup event listeners"); // 디버깅 로그
    console.log("Popup elements:", {
        newListPopup,
        popupListName,
        popupCreateBtn,
        closePopupBtn
    }); // 디버깅 로그

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', hideNewListPopup);
    }

    // 팝업 외부 클릭으로 닫기
    window.addEventListener('click', function(e) {
        if (e.target === newListPopup) {
            hideNewListPopup();
        }
    });

    // 팝업에서 생성 버튼
    if (popupCreateBtn) {
        popupCreateBtn.addEventListener('click', createListFromPopup);
    }

    // 팝업에서 Enter 키로 제출
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
});

// Firebase 초기화 함수
function initializeFirebase() {
    // Firebase 설정 (복사한 값으로 업데이트)
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
        // 기존 초기화 코드...
        auth = firebase.auth();
        db = firebase.firestore();

        // 중요: 폴링 방식으로 변경
        db.settings({
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true,
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });

        // 인증 상태 변경 리스너
        auth.onAuthStateChanged((user) => {
        if (user) {
            // 사용자가 로그인한 경우
            currentUser = user;
            localStorage.setItem('userName', user.displayName || user.email);
            localStorage.setItem('userEmail', user.email);

            // UI 업데이트
            updateLoginUI(user.displayName || user.email);

            // 중요: 로그인 시 Firebase에서 데이터 로드
            // 이 함수 내에서 로컬 데이터를 Firebase 데이터로 대체
            loadUserDataFromFirebase(user.uid);
          } else {
              // 로그아웃 상태
              currentUser = null;
              localStorage.removeItem('userName');
              localStorage.removeItem('userEmail');

              // 로그아웃 시 로컬 데이터 유지 - 초기화하지 않음
              const savedListsJson = localStorage.getItem('saveLists');
              if (savedListsJson) {
                  try {
                      saveLists = JSON.parse(savedListsJson);
                  } catch (e) {
                      console.error("저장된 리스트 파싱 오류:", e);
                      saveLists = { "Default List": [] };
                      localStorage.setItem('saveLists', JSON.stringify(saveLists));
                  }
              } else {
                  saveLists = { "Default List": [] };
                  localStorage.setItem('saveLists', JSON.stringify(saveLists));
              }

              // UI 업데이트
              displayFilteredVocabularyItems(vocabularyData);
              if (document.getElementById('saved-lists-page').style.display !== 'none') {
                  updateSaveListTabs();
              }

              // 헤더의 로그인 버튼 표시
              const firebaseAuthContainer = document.querySelector('.firebase-auth-container-header');
              if (firebaseAuthContainer) {
                  firebaseAuthContainer.style.display = 'block';
              }

              // 헤더에서 사용자 정보 제거
              const headerAuth = document.querySelector('.header-auth');
              if (headerAuth) {
                  const userInfo = headerAuth.querySelector('.user-info-header');
                  const logoutBtn = headerAuth.querySelector('.logout-btn-header');
                  if (userInfo) userInfo.remove();
                  if (logoutBtn) logoutBtn.remove();
              }

              // 모바일 메뉴의 로그인 버튼 표시
              const mobileAuth = document.querySelector('.mobile-auth');
              if (mobileAuth) {
                  mobileAuth.innerHTML = `
                      <div class="firebase-auth-container-mobile">
                          <button id="google-sign-in-mobile" class="google-sign-in-btn-mobile">
                              <span class="google-icon">G</span> Sign in with Google
                          </button>
                      </div>
                  `;

                  // 이벤트 리스너 재설정
                  const googleSignInBtnMobile = document.getElementById('google-sign-in-mobile');
                  if (googleSignInBtnMobile) {
                      googleSignInBtnMobile.addEventListener('click', handleGoogleSignIn);
                  }
              }
          }
    });
    }
}

// Google 로그인 함수
function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // 로그인 성공
            const user = result.user;
            console.log("로그인 성공:", user.displayName);
        })
        .catch((error) => {
            console.error("Google 로그인 오류:", error);
            alert("로그인 중 오류가 발생했습니다: " + error.message);
        });
}

// 로그인 UI 업데이트 함수
function updateLoginUI(userName) {
    // Desktop: Firebase 로그인 컨테이너 숨기기 (헤더의 컨테이너)
    const firebaseAuthContainer = document.querySelector('.firebase-auth-container-header');
    if (firebaseAuthContainer) {
        firebaseAuthContainer.style.display = 'none';
    }

    // Desktop: 헤더 auth 영역에 사용자 정보와 로그아웃 버튼 추가
    const headerAuth = document.querySelector('.header-auth');
    if (headerAuth) {
        // 기존 사용자 정보 제거
        const existingUserInfo = headerAuth.querySelector('.user-info-header');
        const existingLogoutBtn = headerAuth.querySelector('.logout-btn-header');
        if (existingUserInfo) existingUserInfo.remove();
        if (existingLogoutBtn) existingLogoutBtn.remove();

        // 사용자 정보 표시
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info-header';
        userInfo.textContent = `${userName}`;

        // 로그아웃 버튼 생성
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn-header';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);

        // 헤더 auth 영역에 추가
        headerAuth.appendChild(userInfo);
        headerAuth.appendChild(logoutBtn);
    }

    // Mobile: 모바일 메뉴의 auth 영역 업데이트
    const mobileAuth = document.querySelector('.mobile-auth');
    if (mobileAuth) {
        // 기존 내용 제거
        mobileAuth.innerHTML = '';

        // 사용자 정보 표시
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info-mobile';
        userInfo.textContent = `${userName}`;

        // 로그아웃 버튼 생성
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn-mobile';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);

        // 모바일 auth 영역에 추가
        mobileAuth.appendChild(userInfo);
        mobileAuth.appendChild(logoutBtn);
    }
}

// 로그아웃 처리 함수
function handleLogout() {
    auth.signOut()
        .then(() => {
            console.log("로그아웃 성공");

            // 로그아웃 시 로컬 스토리지 유지 (완전히 삭제하지 않음)
            // 기존 데이터를 그대로 사용할 수 있도록 함

            // UI 업데이트 - 단어 목록 갱신
            displayFilteredVocabularyItems(vocabularyData);

            // 페이지 새로고침
            window.location.reload();
        })
        .catch((error) => {
            console.error("로그아웃 오류:", error);
            alert("로그아웃 중 오류가 발생했습니다: " + error.message);
        });
}

// 로그인 상태 확인 함수
function checkLoginState() {
    // Firebase auth.onAuthStateChanged 리스너가 이미 처리해줌
    // 이 함수는 처음 페이지 로드 시 호출되며, 로컬 스토리지 정보로 UI를 초기화
    const userName = localStorage.getItem('userName');

    if (userName) {
        updateLoginUI(userName);
    }
}

// Firebase에서 사용자 데이터 로드
async function loadUserDataFromFirebase(userId) {
    try {
        console.log("Attempting to load data from Firebase:", userId);
        const docRef = db.collection("userData").doc(userId);
        const docSnap = await docRef.get();

        // 로그인 전 로컬 데이터 백업
        const localSaveLists = JSON.parse(JSON.stringify(saveLists));

        if (docSnap.exists) {
            // Firebase에 저장된 데이터가 있으면 로컬 데이터와 병합
            const userData = docSnap.data().saveLists;
            if (userData) {
                // 이제 로컬 데이터를 완전히 대체하는 대신 병합
                mergeSaveLists(localSaveLists, userData);

                // UI 업데이트
                displayFilteredVocabularyItems(vocabularyData);
                if (document.getElementById('saved-lists-page').style.display !== 'none') {
                    updateSaveListTabs();
                }

                // 로컬 스토리지에도 백업
                localStorage.setItem('saveLists', JSON.stringify(saveLists));

                // 병합된 데이터를 Firebase에 다시 저장
                await saveUserDataToFirebase(userId);

                console.log("Firebase data and local data have been merged");
                return true;
            }
        } else {
            console.log("No data found in Firebase. Using local data.");

            // Firebase에 데이터가 없으면 현재 로컬 데이터를 유지하고 Firebase에 저장
            await saveUserDataToFirebase(userId);

            // UI 업데이트
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

// 로컬 데이터와 Firebase 데이터 병합
function mergeSaveLists(localLists, firebaseLists) {
    // 두 리스트 모두에 있는 항목 처리
    for (const listName in localLists) {
        if (firebaseLists.hasOwnProperty(listName)) {
            // 두 목록 모두에 있는 리스트의 경우, 단어들을 병합
            const firebaseWords = firebaseLists[listName];
            const localWords = localLists[listName];

            // 로컬 단어 중 Firebase에 없는 것들 추가
            for (const localWord of localWords) {
                const exists = firebaseWords.some(firebaseWord =>
                    firebaseWord.Headword === localWord.Headword
                );

                if (!exists) {
                    firebaseLists[listName].push(localWord);
                    console.log(`단어 "${localWord.Headword}"가 Firebase의 "${listName}" 리스트에 추가되었습니다`);
                }
            }
        } else {
            // Firebase에 없는 로컬 리스트는 그대로 추가
            firebaseLists[listName] = localLists[listName];
            console.log(`로컬 리스트 "${listName}"가 Firebase에 추가되었습니다`);
        }
    }

    // 결과를 현재 saveLists에 적용
    saveLists = firebaseLists;

    return saveLists;
}

// Firebase에 사용자 데이터 저장
async function saveUserDataToFirebase(userId) {
    try {
        // 로컬 스토리지 백업
        localStorage.setItem('saveLists', JSON.stringify(saveLists));

        // 사용자가 로그인되어 있지 않으면 저장하지 않음
        if (!auth.currentUser) {
            console.log("로그인되지 않아 Firebase 저장을 건너뜁니다");
            return false;
        }

        // Firestore에 데이터 저장
        await db.collection("userData").doc(userId).set({
            saveLists: saveLists,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log("Firebase에 데이터 저장 완료");
        return true;
    } catch (error) {
        console.error("Firebase 데이터 저장 오류:", error);
        return false;
    }
}

// Load CSV data
async function loadCSVData() {
    try {
        vocabularyList.innerHTML = '<div class="loading">Loading vocabulary data...</div>';

        // Fetch the CSV file
        const response = await fetch('vocabulary_deduplicated_3.csv');
        const data = await response.text();

        // Parse CSV using PapaParse
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
                        displayFilteredVocabularyItems(vocabularyData); // 수정된 함수 사용
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


// Sign In button fallback (not used now)
const signInBtn = document.getElementById('sign-in-btn');
if (signInBtn) {
    signInBtn.addEventListener('click', () => {
        alert('Sign In feature is now handled via Google Sign-In.');
    });
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
        // 검색어가 없으면 URL에서 q 파라미터 제거
        updateURL({ q: null });
        return;
    }

    // 검색어를 URL에 추가
    updateURL({ q: searchTerm });

    const filteredVocabulary = vocabularyData.filter(item =>
        item.Headword.toLowerCase().includes(searchTerm) ||
        item.Definitions.toLowerCase().includes(searchTerm) ||
        (item.Headword_Data && item.Headword_Data.toLowerCase().includes(searchTerm))
    );

    // Add back button code here
    // 뒤로가기 버튼이 없으면 추가
    if (!document.getElementById('back-btn')) {
        const backBtn = document.createElement('button');
        backBtn.id = 'back-btn';
        backBtn.className = 'back-btn';
        backBtn.textContent = 'Back to All Words';
        backBtn.addEventListener('click', function() {
            searchInput.value = '';
            displayFilteredVocabularyItems(vocabularyData);
            this.remove(); // 버튼 제거
        });

        // 어휘 목록 위에 버튼 추가
        vocabularyList.parentNode.insertBefore(backBtn, vocabularyList);
    }

    displayFilteredVocabularyItems(filteredVocabulary);
}

function applyFilter(filterType) {
    // 현재 필터 업데이트
    currentFilter = filterType;

    // 활성 버튼 스타일 업데이트
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

    // 현재 표시된 단어 목록 재정렬
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm === '') {
        // 검색어가 없으면 전체 목록 표시
        displayFilteredVocabularyItems(vocabularyData);
    } else {
        // 검색어가 있으면 필터링된 목록 표시
        const filteredVocabulary = vocabularyData.filter(item =>
            item.Headword.toLowerCase().includes(searchTerm) ||
            item.Definitions.toLowerCase().includes(searchTerm) ||
            (item.Headword_Data && item.Headword_Data.toLowerCase().includes(searchTerm))
        );
        displayFilteredVocabularyItems(filteredVocabulary);
    }
}


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

// 메인 타이틀 클릭 이벤트
mainTitle.addEventListener('click', function() {
    showMainPage();
    updateURL({ page: null, list: null, q: null });
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

// 저장 리스트 버튼 클릭 이벤트 (팝업이 아닌 페이지 전환)
savedListsBtn.addEventListener('click', function() {
    showSavedListsPage();
    updateSaveListTabs();
    updateURL({ page: 'saved-lists', list: null });
});

// 메인 페이지 표시
function showMainPage() {
    hideAllPages();
    mainPage.style.display = 'block';
    updateActiveNavButton('glossary');
}
// 저장 리스트 페이지 표시
function showSavedListsPage(activeList = null) {
    hideAllPages();
    savedListsPage.style.display = 'block';
    updateSaveListTabs(activeList);
    // Don't update nav buttons for saved lists page
}

// URL 업데이트 함수
function updateURL(params) {
    const url = new URL(window.location);

    // 각 파라미터 업데이트
    for (const [key, value] of Object.entries(params)) {
        if (value === null) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    }

    // URL 변경 (history API 사용)
    window.history.pushState({}, '', url);
}

// 데이터 저장 통합 함수
function saveListsToStorage() {
    // 로그인 상태 확인
    if (auth && auth.currentUser) {
        // 로그인 상태: 로컬 스토리지와 Firebase에 모두 저장
        localStorage.setItem('saveLists', JSON.stringify(saveLists));
        saveUserDataToFirebase(auth.currentUser.uid);
    } else {
        // 로그아웃 상태: 임시로 로컬 스토리지에만 저장
        localStorage.setItem('saveLists', JSON.stringify(saveLists));
    }
}

// Display vocabulary items
function displayFilteredVocabularyItems(items) {
    if (items.length === 0) {
        vocabularyList.innerHTML = '<div class="no-results">No results found.</div>';
        return;
    }

    const sortedItems = [...items]; // 배열 복사

    switch (currentFilter) {
        case 'alphabet':
            // 알파벳순으로 정렬
            sortedItems.sort((a, b) => a.Headword.localeCompare(b.Headword));
            break;
        case 'required':
            // Required 단어 우선 정렬
            sortedItems.sort((a, b) => {
                const aRequired = a.Required === 1 || a.Required === "1";
                const bRequired = b.Required === 1 || b.Required === "1";

                if (aRequired && !bRequired) return -1;
                if (!aRequired && bRequired) return 1;
                return a.Headword.localeCompare(b.Headword); // 같은 Required 상태면 알파벳순
            });
            break;
        case 'occurrences':
            // 출현 빈도 높은 순 정렬
            sortedItems.sort((a, b) => {
                // 숫자로 변환하여 정렬 (문자열일 수 있으므로)
                const aOccur = parseInt(a["Occurrences in the Aeneid"]) || 0;
                const bOccur = parseInt(b["Occurrences in the Aeneid"]) || 0;
                return bOccur - aOccur; // 내림차순 정렬
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

        // 필수 단어 여부 확인 (Required 열이 1인 경우)
        const isRequired = item.Required === 1 || item.Required === "1";

        const vocabularyItem = document.createElement('div');
        vocabularyItem.className = 'vocabulary-item';
        vocabularyItem.innerHTML = `
            <div class="vocabulary-info ${isRequired ? 'required-word' : ''}">
                ${isRequired ? '<span class="required-star">★</span>' : ''}
                <div class="word">${item.Headword}</div>
                <div class="definition">${item.Definitions}</div>
                <div class="occurrence">Occurrences in the Aeneid: ${item["Occurrences in the Aeneid"]}</div>
            </div>
            <div style="position: relative;">
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
    // 약 180-220줄 근처의 save-option-btn 이벤트 리스너 부분
    document.querySelectorAll('.save-option-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const wordToToggle = this.getAttribute('data-word');
            const listName = this.getAttribute('data-list');
            const wordData = vocabularyData.find(item => item.Headword === wordToToggle);

            if (!wordData) return;

            const wordIndex = saveLists[listName].findIndex(word => word.Headword === wordToToggle);

            if (wordIndex === -1) {
                // 리스트에 추가
                saveLists[listName].push(wordData);
                this.innerHTML = `${listName} (★)`;

                // Default 리스트가 아닌 경우 Default 리스트에도 추가
                if (listName !== "Default List") {
                    const defaultListIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToToggle);
                    if (defaultListIndex === -1) {
                        saveLists["Default List"].push(wordData);
                    }
                }
            } else {
                // 리스트에서 제거
                saveLists[listName].splice(wordIndex, 1);
                this.innerHTML = `${listName} (☆)`;

                // Default 리스트에서 제거하는 경우 모든 리스트에서 제거
                if (listName === "Default List") {
                    // 모든 리스트에서 해당 단어 제거
                    for (const list in saveLists) {
                        if (list !== "Default List") {  // Default 리스트는 이미 위에서 처리했으므로 제외
                            const indexInList = saveLists[list].findIndex(word => word.Headword === wordToToggle);
                            if (indexInList !== -1) {
                                saveLists[list].splice(indexInList, 1);
                            }
                        }
                    }

                    // 옵션 버튼 텍스트 업데이트 (모든 리스트 버튼)
                    document.querySelectorAll(`.save-option-btn[data-word="${wordToToggle}"]`).forEach(optBtn => {
                        optBtn.innerHTML = `${optBtn.getAttribute('data-list')} (☆)`;
                    });
                } else {
                    // 특정 리스트에서 제거하는 경우, 다른 리스트에 있는지 확인
                    let existsInOtherLists = false;
                    for (const list in saveLists) {
                        if (list !== "Default List" && list !== listName) {
                            if (saveLists[list].some(word => word.Headword === wordToToggle)) {
                                existsInOtherLists = true;
                                break;
                            }
                        }
                    }

                    // 다른 리스트에 없으면 Default 리스트에서도 제거
                    if (!existsInOtherLists) {
                        const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToToggle);
                        if (defaultIndex !== -1) {
                            saveLists["Default List"].splice(defaultIndex, 1);

                            // Default 리스트 버튼 업데이트
                            const defaultBtn = document.querySelector(`.save-option-btn[data-list="Default List"][data-word="${wordToToggle}"]`);
                            if (defaultBtn) {
                                defaultBtn.innerHTML = `Default List (☆)`;
                            }
                        }
                    }
                }
            }

            // 별표 아이콘 업데이트
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
            // 로컬 스토리지 업데이트
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

// Default List 동기화 함수 - Default List가 다른 모든 리스트의 모든 단어를 포함하도록 함
function synchronizeDefaultList() {
    // 모든 다른 리스트의 단어들을 가져와서 Default List에 없는 것만 추가
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

    // Default List의 단어들 중 다른 어떤 리스트에도 없는 단어들 찾기
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


    // 데이터 저장
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

    // 탭 컨테이너 생성 (탭들을 포함할 컨테이너)
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';

    // 새 리스트 추가 버튼 생성
    const addListBtn = document.createElement('button');
    addListBtn.className = 'add-list-btn';
    addListBtn.innerHTML = '+';
    addListBtn.title = 'Create new list';
    addListBtn.addEventListener('click', showNewListPopup);

    // 탭들 생성 및 탭 컨테이너에 추가
    Object.keys(saveLists).forEach(listName => {
        const tab = document.createElement('div');
        tab.className = `save-list-tab ${listName === activeListName ? 'active' : ''}`;
        tab.textContent = listName;
        tab.setAttribute('data-list', listName);

        // 탭 클릭 이벤트 (기존 코드 유지)
        tab.addEventListener('click', function() {
            const listName = this.getAttribute('data-list');

            // 리스트 전환 시 플래시카드가 있으면 제거
            const flashcardContainer = document.getElementById('flashcard-container');
            if (flashcardContainer) {
                flashcardContainer.remove();

                // Flashcards 버튼 텍스트 초기화
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
                // 기존 삭제 코드 유지
                if (confirm(`Delete list "${listName}"?`)) {
                    // 삭제할 리스트의 단어들 가져오기
                    const wordsInListToDelete = saveLists[listName];

                    // 각 단어에 대해 다른 리스트에 존재하는지 확인
                    wordsInListToDelete.forEach(wordToCheck => {
                        // 다른 사용자 정의 리스트에 단어가 존재하는지 확인
                        let existsInOtherLists = false;
                        for (const otherListName in saveLists) {
                            // 현재 삭제할 리스트와 Default List는 제외
                            if (otherListName !== listName && otherListName !== "Default List") {
                                if (saveLists[otherListName].some(word => word.Headword === wordToCheck.Headword)) {
                                    existsInOtherLists = true;
                                    break;
                                }
                            }
                        }

                        // 다른 리스트에 없으면 Default List에서도 제거
                        if (!existsInOtherLists) {
                            const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToCheck.Headword);
                            if (defaultIndex !== -1) {
                                saveLists["Default List"].splice(defaultIndex, 1);
                            }
                        }
                    });

                    // 리스트 삭제
                    delete saveLists[listName];
                    saveListsToStorage();

                    // Switch to Default List
                    switchSaveList("Default List");
                    updateURL({ list: "Default List" });
                    updateSaveListTabs("Default List");

                    // 단어 목록 UI 업데이트
                    displayFilteredVocabularyItems(vocabularyData);

                    // 사용자에게 알림
                    alert(`List "${listName}" has been deleted. Words that were only in this list have also been removed from Default List.`);
                }
            });
            tab.appendChild(deleteBtn);
        }

        tabsContainer.appendChild(tab);
    });

    // 요소들을 saveListTabs에 추가
    saveListTabs.appendChild(tabsContainer);
    saveListTabs.appendChild(addListBtn);

        // 리스트 컨텐츠 생성
    Object.keys(saveLists).forEach(listName => {
        // 기존 컨텐츠 생성 코드 유지
        const content = document.createElement('div');
        content.className = `save-list-content ${listName === activeListName ? 'active' : ''}`;
        content.id = `save-list-content-${listName.replace(/\s+/g, '-')}`;

        // 액션 버튼 추가
        const actionButtons = document.createElement('div');
        actionButtons.className = 'list-action-buttons';

        // 플래시카드 버튼
        const flashcardButton = document.createElement('button');
        flashcardButton.className = 'action-btn flashcard-btn';
        flashcardButton.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
        flashcardButton.addEventListener('click', function() {
            // 플래시카드 컨테이너 확인
            const flashcardContainer = document.getElementById('flashcard-container');

            // 플래시카드가 이미 표시되고 있는 경우
            if (flashcardContainer && flashcardContainer.style.display !== 'none') {
                exitFlashcardMode(listName); // 플래시카드 모드 종료 (숨김)

                // 버튼 텍스트 변경
                this.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
            } else {
                // 플래시카드가 없거나 숨겨져 있는 경우
                startFlashcards(listName); // 플래시카드 시작

                // 버튼 텍스트 변경
                this.innerHTML = '<span class="btn-icon">🔄</span> Back to List';
            }
        });
        actionButtons.appendChild(flashcardButton);

        // 복사 버튼
        const copyButton = document.createElement('button');
        copyButton.className = 'action-btn copy-btn';
        copyButton.innerHTML = '<span class="btn-icon">📋</span> Copy List';
        copyButton.addEventListener('click', function() {
            copyList(listName);
        });
        actionButtons.appendChild(copyButton);

        // 인쇄 버튼
        const printButton = document.createElement('button');
        printButton.className = 'action-btn print-btn';
        printButton.innerHTML = '<span class="btn-icon">🖨️</span> Print List';
        printButton.addEventListener('click', function() {
            printList(listName);
        });
        actionButtons.appendChild(printButton);

        content.appendChild(actionButtons);

        // 단어 수 정보
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
                // 필수 단어 여부 확인
                const isRequired = word.Required === 1 || word.Required === "1";

                const wordItem = document.createElement('div');
                wordItem.className = 'vocabulary-item';
                wordItem.innerHTML = `
                    <div class="vocabulary-info ${isRequired ? 'required-word' : ''}">
                        ${isRequired ? '<span class="required-star">★</span>' : ''}
                        <div class="word">${word.Headword}</div>
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
                        // Default List에서 제거하는 경우 모든 리스트에서 제거
                        if (listToRemoveFrom === "Default List") {
                            // 모든 리스트에서 해당 단어 제거
                            for (const list in saveLists) {
                                const indexInList = saveLists[list].findIndex(word => word.Headword === wordToRemove);
                                if (indexInList !== -1) {
                                    saveLists[list].splice(indexInList, 1);
                                }
                            }
                            alert(`Word "${wordToRemove}" has been removed from all lists.`);
                        } else {
                            // 특정 리스트에서만 제거
                            saveLists[listToRemoveFrom].splice(wordIndex, 1);

                            // 다른 사용자 정의 리스트에 단어가 있는지 확인
                            let existsInOtherLists = false;
                            for (const list in saveLists) {
                                if (list !== "Default List" && list !== listToRemoveFrom) {
                                    if (saveLists[list].some(word => word.Headword === wordToRemove)) {
                                        existsInOtherLists = true;
                                        break;
                                    }
                                }
                            }

                            // 다른 리스트에 없으면 Default 리스트에서도 제거
                            if (!existsInOtherLists) {
                                const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToRemove);
                                if (defaultIndex !== -1) {
                                    saveLists["Default List"].splice(defaultIndex, 1);
                                }
                            }
                        }
                        synchronizeDefaultList();
                        // 로컬 스토리지 업데이트
                        saveListsToStorage();

                        // 저장 목록 UI 업데이트
                        updateSaveListTabs(currentListName);

                        displayFilteredVocabularyItems(vocabularyData);

                        // 메인 단어 목록의 별표 아이콘 업데이트
                        const mainListBtn = document.querySelector(`.vocabulary-list .save-btn[data-word="${wordToRemove}"]`);
                        if (mainListBtn) {
                            // 아무 리스트에라도 저장되어 있는지 확인
                            let savedInAnyList = false;
                            for (const list in saveLists) {
                                if (saveLists[list].some(word => word.Headword === wordToRemove)) {
                                    savedInAnyList = true;
                                    break;
                                }
                            }

                            // 별표 아이콘 업데이트
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
    // Add delete list buttons if there's more than one list
        if (Object.keys(saveLists).length > 1) {
    document.querySelectorAll('.save-list-tab').forEach(tab => {
        const listName = tab.getAttribute('data-list');
        // Default List는 삭제할 수 없음
        if (listName !== "Default List") {
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = ' ×';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.color = '#999';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(`Delete list "${listName}"?`)) {
                    // 삭제할 리스트의 단어들 가져오기
                    const wordsInListToDelete = saveLists[listName];

                    // 각 단어에 대해 다른 리스트에 존재하는지 확인
                    wordsInListToDelete.forEach(wordToCheck => {
                        // 다른 사용자 정의 리스트에 단어가 존재하는지 확인
                        let existsInOtherLists = false;
                        for (const otherListName in saveLists) {
                            // 현재 삭제할 리스트와 Default List는 제외
                            if (otherListName !== listName && otherListName !== "Default List") {
                                if (saveLists[otherListName].some(word => word.Headword === wordToCheck.Headword)) {
                                    existsInOtherLists = true;
                                    break;
                                }
                            }
                        }

                        // 다른 리스트에 없으면 Default List에서도 제거
                        if (!existsInOtherLists) {
                            const defaultIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToCheck.Headword);
                            if (defaultIndex !== -1) {
                                saveLists["Default List"].splice(defaultIndex, 1);
                                console.log(`단어 "${wordToCheck.Headword}"가 Default List에서도 제거되었습니다.`);
                            }
                        }
                    });

                    // 리스트 삭제
                    delete saveLists[listName];
                    saveListsToStorage();

                    // Switch to Default List
                    switchSaveList("Default List");
                    updateURL({ list: "Default List" });
                    updateSaveListTabs("Default List");

                    // 단어 목록 UI 업데이트
                    displayFilteredVocabularyItems(vocabularyData);

                    // 사용자에게 알림
                    alert(`List "${listName}" has been deleted. Words that were only in this list have also been removed from Default List.`);
                }
            });
            tab.appendChild(deleteBtn);
        }
    });
}


// Switch between save lists
function switchSaveList(listName) {
    currentListName = listName;

    // 탭 업데이트
    document.querySelectorAll('.save-list-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-list') === listName);
    });

    // 컨텐츠 업데이트
    document.querySelectorAll('.save-list-content').forEach(content => {
        content.classList.toggle('active', content.id === `save-list-content-${listName.replace(/\s+/g, '-')}`);
    });
}

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

// Load saved lists from Google Drive
// 저장된 리스트 불러오기
async function loadSavedLists() {
    // 로그인 상태 확인
    if (auth && auth.currentUser) {
        // 로그인 상태인 경우는 이미 auth.onAuthStateChanged에서 처리됨
        // 여기서는 아무 작업도 하지 않음
        console.log("App initialization: Logged in, Firebase data will be loaded in onAuthStateChanged");
    } else {
        // 로그아웃 상태: 로컬 스토리지에서 데이터 로드 (초기화하지 않음)
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
            // 저장된 데이터가 없는 경우에만 초기화
            saveLists = { "Default List": [] };
            localStorage.setItem('saveLists', JSON.stringify(saveLists));
        }
    }
}

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

// Flashcard 기능 구현 (수정된 부분)
function startFlashcards(listName) {
    const words = saveLists[listName];

    if (words.length === 0) {
        alert('There are no words in this list.');
        return;
    }

    // 이미 플래시카드 컨테이너가 있는지 확인
    const existingFlashcardContainer = document.getElementById('flashcard-container');

    // 이미 플래시카드가 있으면 새로 생성하지 않고 기존 것을 보여줌
    if (existingFlashcardContainer) {
        existingFlashcardContainer.style.display = 'block';

        // 관련 단어 컨테이너 숨기기
        const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
        const wordItemsContainer = listContent.querySelector('.word-items-container');
        if (wordItemsContainer) {
            wordItemsContainer.style.display = 'none';
        }

        // 필요하다면 현재 리스트의 단어로 플래시카드 내용 업데이트
        if (currentListName !== listName) {
            currentListName = listName;
            currentFlashcardIndex = 0; // 새 리스트의 첫 번째 단어부터 시작
            updateFlashcard(listName);
        }

        // 플래시카드 모드 활성화 및 키보드 제어 설정
        flashcardMode = true;
        setupFlashcardKeyboardControls();

        return; // 기존 플래시카드가 있으므로 여기서 함수 종료
    }

    // 플래시카드가 없는 경우에만 아래 코드 실행

    // 현재 리스트 내용 숨기기
    const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
    const wordItemsContainer = listContent.querySelector('.word-items-container');

    if (wordItemsContainer) {
        wordItemsContainer.style.display = 'none';
    }

    // 플래시카드 모드 활성화
    flashcardMode = true;
    currentFlashcardIndex = 0;

    // 키보드 제어 설정
    setupFlashcardKeyboardControls();

    // 플래시카드 컨테이너 생성
    const flashcardContainer = document.createElement('div');
    flashcardContainer.className = 'flashcard-container';
    flashcardContainer.id = 'flashcard-container';

    // 진행 상태 표시
    const progressDiv = document.createElement('div');
    progressDiv.className = 'flashcard-progress';
    progressDiv.textContent = `Word ${currentFlashcardIndex + 1} / ${words.length}`;

    // 컨트롤 버튼 추가
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'flashcard-controls';

    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.className = 'flashcard-btn prev-btn';
    prevBtn.textContent = '← Previous';
    prevBtn.addEventListener('click', () => {
        if (currentFlashcardIndex > 0) {
            currentFlashcardIndex--;
            updateFlashcard(listName);
        }
    });

    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.className = 'flashcard-btn next-btn';
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', () => {
        if (currentFlashcardIndex < words.length - 1) {
            currentFlashcardIndex++;
            updateFlashcard(listName);
        }
    });

    // 종료 버튼
    const exitBtn = document.createElement('button');
    exitBtn.className = 'flashcard-btn exit-btn';
    exitBtn.textContent = 'Exit';
    exitBtn.addEventListener('click', () => {
        exitFlashcardMode(listName);

        // Flashcards 버튼 텍스트 원래대로 변경
        const flashcardBtn = document.querySelector('.action-btn.flashcard-btn');
        if (flashcardBtn) {
            flashcardBtn.innerHTML = '<span class="btn-icon">🔄</span> Flashcards';
        }
    });

    // 섞기 버튼
    const shuffleBtn = document.createElement('button');
    shuffleBtn.className = 'flashcard-btn shuffle-btn';
    shuffleBtn.textContent = 'Shuffle';
    shuffleBtn.addEventListener('click', () => {
        shuffleFlashcards(listName);
    });

    // 컨트롤 버튼 추가
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
            // 최소 스와이프 거리 (픽셀)
            const minSwipeDistance = 50;

            if (touchEndX < touchStartX - minSwipeDistance) {
                // 왼쪽에서 오른쪽으로 스와이프: 다음 카드
                if (currentFlashcardIndex < saveLists[currentListName].length - 1) {
                    currentFlashcardIndex++;
                    updateFlashcard(currentListName);
                }
            } else if (touchEndX > touchStartX + minSwipeDistance) {
                // 오른쪽에서 왼쪽으로 스와이프: 이전 카드
                if (currentFlashcardIndex > 0) {
                    currentFlashcardIndex--;
                    updateFlashcard(currentListName);
                }
            } else {
                // 탭: 카드 뒤집기
                flashcardDiv.classList.toggle('flipped');
            }
        }
    }

    // 플래시카드 생성
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
//Delite this Part if you want to delete keyboardsign
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
//delete until this part

    addTouchSupport(flashcardDiv);


    // 플래시카드 클릭 이벤트
    flashcardDiv.addEventListener('click', function() {
        this.classList.toggle('flipped');
    });

    // 플래시카드 컨테이너에 요소들 추가
    flashcardContainer.appendChild(progressDiv);
    flashcardContainer.appendChild(controlsDiv);
    flashcardContainer.appendChild(flashcardDiv);

    // 리스트 내용 자리에 플래시카드 컨테이너 추가
    if (wordItemsContainer) {
        wordItemsContainer.parentNode.insertBefore(flashcardContainer, wordItemsContainer.nextSibling);
    } else {
        // 워드 컨테이너가 없는 경우 리스트 컨텐츠에 직접 추가
        listContent.appendChild(flashcardContainer);
    }
}

// 플래시카드 업데이트
function updateFlashcard(listName) {
    const words = saveLists[listName];
    const flashcardContainer = document.getElementById('flashcard-container');

    if (!flashcardContainer) return;

    // 진행 상태 업데이트
    const progressDiv = flashcardContainer.querySelector('.flashcard-progress');
    if (progressDiv) {
        progressDiv.textContent = `Word ${currentFlashcardIndex + 1} / ${words.length}`;
    }

    // 현재 플래시카드 업데이트
    const flashcardDiv = flashcardContainer.querySelector('.flashcard');
    if (flashcardDiv) {
        // 플래시카드가 뒤집혀있으면 다시 앞면으로
        flashcardDiv.classList.remove('flipped');

        // 내용 업데이트
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

// 플래시카드 모드 종료 (수정된 부분)
function exitFlashcardMode(listName) {
    // 플래시카드 모드 비활성화
    flashcardMode = false;

    // 키보드 이벤트 리스너 제거
    document.removeEventListener('keydown', handleFlashcardKeydown);

    // 플래시카드 컨테이너를 제거하지 않고 숨김
    const flashcardContainer = document.getElementById('flashcard-container');
    if (flashcardContainer) {
        flashcardContainer.style.display = 'none';
    }

    // 단어 목록 다시 표시
    const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
    const wordItemsContainer = listContent.querySelector('.word-items-container');

    if (wordItemsContainer) {
        wordItemsContainer.style.display = 'block';
    }
}

// 플래시카드 섞기
function shuffleFlashcards(listName) {
    // Fisher-Yates shuffle 알고리즘 사용
    const words = saveLists[listName];

    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }

    // 첫 번째 카드부터 시작
    currentFlashcardIndex = 0;
    updateFlashcard(listName);

    // 저장 (선택 사항 - 섞인 순서를 유지하려면 주석 해제)
    // saveListsToStorage();
}

// Function to copy list to clipboard
function copyList(listName) {
    const words = saveLists[listName];

    if (words.length === 0) {
        alert('No words to copy in this list.');
        return;
    }

    // Format the text to copy
    let copyText = `${listName} - Vergil Glossary\n\n`;

    words.forEach(word => {
        const isRequired = word.Required === 1 || word.Required === "1";
        copyText += `${isRequired ? '★ ' : ''}${word.Headword}: ${word.Definitions}\n`;
        copyText += `(Occurrences: ${word["Occurrences in the Aeneid"]})\n\n`;
    });

    // Copy to clipboard
    navigator.clipboard.writeText(copyText)
        .then(() => {
            // Show success message
            const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
            const copyBtn = listContent.querySelector('.copy-btn');

            // Change button text temporarily
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';

            // Reset button text after 2 seconds
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy to clipboard. Please try again.');
        });
}

// Function to generate and download a PDF
function printList(listName) {
    const words = saveLists[listName];

    if (words.length === 0) {
        alert('No words to print in this list.');
        return;
    }

    // Show loading indicator
    const listContent = document.getElementById(`save-list-content-${listName.replace(/\s+/g, '-')}`);
    const printBtn = listContent.querySelector('.print-btn');
    const originalText = printBtn.innerHTML;
    printBtn.innerHTML = '<span class="btn-icon">⏳</span> Preparing PDF...';

    // Debug the jsPDF library availability - log more details
    console.log("jsPDF availability check:",
                "window.jspdf =", typeof window.jspdf,
                "jsPDF direct =", typeof jsPDF);

    // Try to load jsPDF synchronously first
    try {
        generatePDF(listName, words, printBtn, originalText);
    } catch (error) {
        console.error("Error in initial PDF generation attempt:", error);

        // If failed, try loading the library again
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

        script.onload = function() {
            console.log("jsPDF loaded via script tag, retrying...");
            try {
                generatePDF(listName, words, printBtn, originalText);
            } catch (retryError) {
                console.error("Error in retry PDF generation:", retryError);
                alert("Failed to generate PDF. Please try again or refresh the page.");
                printBtn.innerHTML = originalText;
            }
        };

        script.onerror = function(e) {
            console.error("Failed to load jsPDF script:", e);
            alert("Failed to load PDF generation library. Please try again later or check your internet connection.");
            printBtn.innerHTML = originalText;
        };

        document.head.appendChild(script);
    }
}

// Helper function to generate PDF
function generatePDF(listName, words, printBtn, originalBtnText) {
    try {
        // Check what's available in the global scope
        console.log("jsPDF availability check:",
                   "window.jspdf =", typeof window.jspdf,
                   "window.jspdf.jsPDF =", window.jspdf ? typeof window.jspdf.jsPDF : "N/A",
                   "jsPDF direct =", typeof jsPDF);

        let doc;

        // Try different ways to access jsPDF
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function') {
            // Use window.jspdf.jsPDF if available (our preferred setup)
            const { jsPDF } = window.jspdf;
            doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
        } else if (typeof jsPDF === 'function') {
            // Direct global jsPDF
            doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
        } else if (typeof window.jsPDF === 'function') {
            // Try window.jsPDF
            doc = new window.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            });
        } else {
            throw new Error("jsPDF not found in any expected location. Make sure it's properly loaded.");
        }

        console.log("PDF document created successfully");

        // Rest of your function remains the same - no changes needed below this comment

        // Set font sizes
        const titleFontSize = 16;
        const wordFontSize = 11;
        const defFontSize = 10;

        // Page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Use 1-inch margins (25.4mm = 1 inch)
        const margin = {
            left: 25.4,   // 1 inch
            right: 25.4,  // 1 inch
            top: 25.4,    // 1 inch
            bottom: 25.4  // 1 inch
        };

        // Title
        doc.setFontSize(titleFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(`${listName} - Vergil Glossary`, margin.left, margin.top);

        // Word count
        doc.setFontSize(defFontSize);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total words: ${words.length}`, margin.left, margin.top + 7);

        // Date
        const today = new Date();
        const dateStr = today.toLocaleDateString();
        doc.text(`Generated: ${dateStr}`, pageWidth - margin.right - 40, margin.top + 7);

        // Draw a line
        doc.setLineWidth(0.3);
        doc.line(margin.left, margin.top + 10, pageWidth - margin.right, margin.top + 10);

        // Start position for words
        let y = margin.top + 20;
        let currentPage = 1;

        // Text processing helpers
        function cleanDefinition(text) {
            // Remove any problematic characters or sequences
            if (!text) return "";
            return text.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
        }

        // Process each word
        words.forEach((word, index) => {
            const isRequired = word.Required === 1 || word.Required === "1";

            // Use Headword_Data instead of Headword
            const headwordText = word.Headword_Data || word.Headword;
            const headword = isRequired ? `★ ${headwordText}` : headwordText;

            // Clean definition text
            const definition = cleanDefinition(word.Definitions);

            // Calculate available width for text with exact 1-inch margins
            const textWidth = pageWidth - margin.left - margin.right;

            // Split definition into multiple lines with proper width constraint
            const definitionLines = doc.splitTextToSize(definition, textWidth);

            // Calculate total height needed for this entry (without occurrences line)
            const lineHeight = 5;
            const definitionHeight = definitionLines.length * lineHeight;
            const estimatedHeight = 10 + definitionHeight + 5; // Reduced since we removed occurrences

            // Check if we need a new page - leave adequate space at bottom margin
            if (y + estimatedHeight > pageHeight - margin.bottom) {
                doc.addPage();
                currentPage++;

                // Reset position for new page
                y = margin.top + 10;

                // Add header to new page
                doc.setFontSize(defFontSize);
                doc.setFont('helvetica', 'italic');
                doc.text(`${listName} (continued) - Page ${currentPage}`, margin.left, margin.top);
                doc.line(margin.left, margin.top + 3, pageWidth - margin.right, margin.top + 3);
                y += 10;
            }

            // Headword
            doc.setFontSize(wordFontSize);
            doc.setFont('helvetica', 'bold');
            doc.text(headword, margin.left, y);

            // Definition
            doc.setFontSize(defFontSize);
            doc.setFont('helvetica', 'normal');
            doc.text(definitionLines, margin.left, y + 5);

            // Update y position for next word
            y += 5 + definitionHeight + 10;

            // Add a separator line between words (except the last one)
            if (index < words.length - 1) {
                doc.setDrawColor(200, 200, 200); // Light gray
                doc.setLineWidth(0.1);
                doc.line(margin.left, y - 5, pageWidth - margin.right, y - 5);
            }
        });

        // Save the PDF with a proper name
        const filename = `${listName.replace(/\s+/g, '_')}_vergil_glossary.pdf`;
        doc.save(filename);

        // Reset button text
        printBtn.innerHTML = '<span class="btn-icon">✓</span> PDF Downloaded!';

        // Reset button text after 2 seconds
        setTimeout(() => {
            printBtn.innerHTML = originalBtnText;
        }, 2000);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while generating the PDF: " + error.message);
        printBtn.innerHTML = originalBtnText;
    }
}

// Add this to the document load event to make sure jsPDF is available
document.addEventListener('DOMContentLoaded', function() {
    // Load jsPDF library at startup - FIXED: Check for window.jspdf not jsPDF
    if (typeof window.jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
    }

});

// 팝업 표시 함수
function showNewListPopup() {
    console.log("showNewListPopup called", newListPopup); // 디버깅 로그
    if (newListPopup) {
        popupListName.value = ''; // 입력 필드 초기화
        newListPopup.style.display = 'block';
        setTimeout(() => {
            popupListName.focus(); // 입력 필드에 포커스
        }, 100);
    } else {
        console.error("Popup element not found!");
    }
}

// 팝업 숨기기 함수
function hideNewListPopup() {
    console.log("hideNewListPopup called"); // 디버깅 로그
    if (newListPopup) {
        newListPopup.style.display = 'none';
        popupListName.value = ''; // 입력 필드 초기화
    }
}


// 팝업에서 리스트 생성 처리
function createListFromPopup() {
    console.log("createListFromPopup called"); // 디버깅 로그
    const newListName = popupListName.value.trim();
    console.log("New list name:", newListName); // 디버깅 로그

    if (newListName === '') {
        alert('Please enter a list name');
        return;
    }

    if (saveLists[newListName]) {
        alert('A list with this name already exists');
        return;
    }

    console.log(`Creating new list: ${newListName}`);

    // 새 리스트 생성
    saveLists[newListName] = [];
    synchronizeDefaultList(); // Default List 동기화
    saveListsToStorage();

    // UI 업데이트
    hideNewListPopup(); // 팝업 닫기
    updateSaveListTabs();
    switchSaveList(newListName);

    // 단어 목록 업데이트
    displayFilteredVocabularyItems(vocabularyData);
}

// 전역 플래시카드 키보드 이벤트 처리 함수
function setupFlashcardKeyboardControls() {
    // 기존 이벤트 리스너 제거 (중복 방지)
    document.removeEventListener('keydown', handleFlashcardKeydown);

    // 새 이벤트 리스너 추가
    document.addEventListener('keydown', handleFlashcardKeydown);
}

// 키보드 이벤트 핸들러
function handleFlashcardKeydown(e) {
    // 플래시카드 모드가 활성화되지 않았으면 무시
    if (!flashcardMode) return;

    // 입력 필드에 포커스가 있는 경우 무시 (검색창 등)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowRight': // 오른쪽 화살표: 다음 카드
            if (currentFlashcardIndex < saveLists[currentListName].length - 1) {
                currentFlashcardIndex++;
                updateFlashcard(currentListName);
            }
            e.preventDefault(); // 기본 스크롤 동작 방지
            break;

        case 'ArrowLeft': // 왼쪽 화살표: 이전 카드
            if (currentFlashcardIndex > 0) {
                currentFlashcardIndex--;
                updateFlashcard(currentListName);
            }
            e.preventDefault(); // 기본 스크롤 동작 방지
            break;

        case ' ': // 스페이스바: 카드 뒤집기
            const flashcardDiv = document.querySelector('.flashcard');
            if (flashcardDiv) {
                flashcardDiv.classList.toggle('flipped');
            }
            e.preventDefault(); // 기본 스크롤 동작 방지
            break;
    }
}
