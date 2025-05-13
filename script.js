// Global variables
let vocabularyData = []; // Will store all vocabulary data
let saveLists = {
    "Default List": []
};
let currentListName = "Default List";
let googleAuth = null;

// NEW: Add these Google Drive API variables
let gapiInitialized = false;
let userFileId = null;
const GOOGLE_CLIENT_ID = '490034991238-p0cp8dchjdl14pk0su5gh79eruipkpdk.apps.googleusercontent.com'; // Your client ID
const GOOGLE_API_KEY = 'blank'; // Replace with your API key from Google Cloud Console
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

// NEW: Add these Google Drive API initialization functions
// 1. Initialize the Google API client
function initializeGoogleAPI() {
  if (gapiInitialized) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInitialized = true;
        console.log('Google API client initialized');
        resolve();
      } catch (error) {
        console.error('Error initializing Google API client:', error);
        reject(error);
      }
    });
  });
}

// 2. Function to get access token from Google auth
async function getAccessToken() {
  // Get the ID token from localStorage
  const idToken = localStorage.getItem('googleToken');
  if (!idToken) {
    throw new Error('User not signed in');
  }
  
  // Exchange the ID token for access token
  return new Promise((resolve, reject) => {
    // Use the tokenClient to get an access token
    google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          reject(tokenResponse);
        } else {
          resolve(tokenResponse.access_token);
        }
      },
    }).requestAccessToken();
  });
}

// 3. Function to find existing data file in user's appdata folder
async function findUserDataFile() {
  try {
    // Initialize Google API if needed
    await initializeGoogleAPI();
    
    // Set the access token
    const accessToken = await getAccessToken();
    gapi.client.setToken({ access_token: accessToken });
    
    // Search for the file
    const response = await gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name)',
      q: "name='vergil_glossary_data.json'"
    });
    
    const files = response.result.files;
    if (files && files.length > 0) {
      userFileId = files[0].id;
      console.log('Found user data file:', userFileId);
      return userFileId;
    } else {
      console.log('No user data file found');
      return null;
    }
  } catch (error) {
    console.error('Error finding user data file:', error);
    return null;
  }
}

// 4. Function to load user data from Google Drive
async function loadUserDataFromDrive() {
  try {
    // Initialize Google API
    await initializeGoogleAPI();
    
    // Find user data file
    const fileId = await findUserDataFile();
    if (!fileId) {
      console.log('No user data file to load');
      return false;
    }
    
    // Set the access token
    const accessToken = await getAccessToken();
    gapi.client.setToken({ access_token: accessToken });
    
    // Get file content
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    
    // Parse the data
    const userData = JSON.parse(response.body);
    console.log('Loaded user data from Drive:', userData);
    
    if (userData) {
      // Update local data
      saveLists = userData;
      
      // Update UI
      displayVocabularyItems(vocabularyData);
      if (document.getElementById('saved-lists-page').style.display !== 'none') {
        updateSaveListTabs();
      }
      
      // Also update localStorage as backup
      localStorage.setItem('saveLists', JSON.stringify(saveLists));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error loading user data from Drive:', error);
    return false;
  }
}

// 5. Function to save user data to Google Drive
async function saveUserDataToDrive() {
  try {
    // Save to localStorage as backup
    localStorage.setItem('saveLists', JSON.stringify(saveLists));
    
    // Check if user is signed in
    const token = localStorage.getItem('googleToken');
    if (!token) {
      console.log('User not signed in, skipping Drive save');
      return false;
    }
    
    // Initialize Google API
    await initializeGoogleAPI();
    
    // Set the access token
    const accessToken = await getAccessToken();
    gapi.client.setToken({ access_token: accessToken });
    
    // Prepare file metadata and content
    const fileMetadata = {
      name: 'vergil_glossary_data.json',
      mimeType: 'application/json'
    };
    
    // Check if we need to create or update the file
    let fileId = await findUserDataFile();
    
    if (fileId) {
      // Update existing file
      console.log('Updating existing file:', fileId);
      const response = await gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: {
          uploadType: 'media'
        },
        body: JSON.stringify(saveLists)
      });
      console.log('File updated successfully:', response);
    } else {
      // Create new file in appDataFolder
      console.log('Creating new file in appDataFolder');
      fileMetadata.parents = ['appDataFolder'];
      
      const response = await gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: {
          uploadType: 'multipart'
        },
        headers: {
          'Content-Type': 'multipart/related; boundary=foo'
        },
        body: '--foo\n' +
              'Content-Type: application/json\n\n' +
              JSON.stringify(fileMetadata) +
              '\n\n' +
              '--foo\n' +
              'Content-Type: application/json\n\n' +
              JSON.stringify(saveLists) +
              '\n\n' +
              '--foo--'
      });
      
      userFileId = response.result.id;
      console.log('File created successfully:', userFileId);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user data to Drive:', error);
    return false;
  }
}

// 6. Add a unified function to save data
function saveListsToStorage() {
  // Always save to localStorage as backup
  localStorage.setItem('saveLists', JSON.stringify(saveLists));
  
  // Try to save to Google Drive
  if (localStorage.getItem('googleToken')) {
    saveUserDataToDrive().catch(error => {
      console.error('Error in Drive save:', error);
    });
  }
}




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
    } else {
        showMainPage();
    }
    
    // 검색어가 URL에 있는 경우
    const searchQuery = urlParams.get('q');
    if (searchQuery) {
        searchInput.value = searchQuery;
        performSearch();
    }
    
    // 로그인 상태 확인 및 초기화
    checkLoginState();
    
    // Google API 초기화
    if (typeof google !== 'undefined' && google.accounts) {
        initGoogleSignIn();
    } else {
        // Google API 스크립트가 아직 로드되지 않은 경우
        window.onGoogleLibraryLoad = initGoogleSignIn;
    }
});

// Google Sign-In 초기화 함수
function initGoogleSignIn() {
    // Google 클라이언트 ID 설정
    const CLIENT_ID = '490034991238-p0cp8dchjdl14pk0su5gh79eruipkpdk.apps.googleusercontent.com';
    
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false
        });
    }
}
// handleCredentialResponse function
window.handleCredentialResponse = function(response) {
    console.log("Google Sign-In response:", response);
    
    if (response && response.credential) {
      const token = response.credential;
      console.log("ID Token:", token);
      
      try {
        // Store token in localStorage
        localStorage.setItem('googleToken', token);
        
        // Extract user information from the token
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log("User info:", payload);
        
        const userName = payload.name;
        const userEmail = payload.email;
        
        // Save user info to localStorage
        localStorage.setItem('userName', userName);
        localStorage.setItem('userEmail', userEmail);
        
        // Update UI to show logged in state
        updateLoginUI(userName);
        
        // Try to load user data from Drive
        loadUserDataFromDrive().then(success => {
          if (!success) {
            // If no Drive data, we'll use local data and upload it on next save
            console.log('No data found in Drive, will upload local data on next save');
          }
        }).catch(error => {
          console.error('Error in initial Drive sync:', error);
        });
        
      } catch (error) {
        console.error("Token processing error:", error);
      }
    } else {
      console.error("Response contains no credential:", response);
    }
  };

// 로그인 UI 업데이트 함수
function updateLoginUI(userName) {
    // Google Sign-In 버튼 숨기기
    const googleSignInButton = document.querySelector('.g_id_signin');
    if (googleSignInButton) {
        googleSignInButton.style.display = 'none';
    }
    
    // 사용자 정보와 로그아웃/계정 전환 버튼 표시
    const userActions = document.querySelector('.user-actions');
    if (userActions) {
        // 사용자 정보 표시
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.textContent = `${userName}`;
        userInfo.style.padding = '8px';
        userInfo.style.backgroundColor = '#e6f4ea';
        userInfo.style.borderRadius = '4px';
        userInfo.style.marginBottom = '8px';
        
        // 로그아웃 버튼 생성
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);

        
        // 기존 요소 제거
        while (userActions.firstChild) {
            if (userActions.firstChild.className !== 'saved-lists-btn') {
                userActions.removeChild(userActions.firstChild);
            } else {
                break;  // Saved Lists 버튼은 유지
            }
        }
        
        // 새 요소 추가
        userActions.insertBefore(logoutBtn, userActions.firstChild);
        userActions.insertBefore(userInfo, userActions.firstChild);
    }
}

// 로그아웃 처리 함수
function handleLogout() {
    // 로컬 스토리지에서 토큰 및 사용자 정보 제거
    localStorage.removeItem('googleToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    
    // 구글 자동 로그인 비활성화
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    
    // 페이지 새로고침
    window.location.reload();
}

// 계정 전환 함수
function switchAccount() {
    // 기존 계정 로그아웃 처리
    localStorage.removeItem('googleToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    
    // 구글 계정 선택 팝업 표시
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.prompt();
    }
}

// 로그인 상태 확인 함수
function checkLoginState() {
    const token = localStorage.getItem('googleToken');
    const userName = localStorage.getItem('userName');
    
    if (token && userName) {
        try {
            // 토큰 디코딩
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // 토큰 만료 확인
            const currentTime = Math.floor(Date.now() / 1000);
            if (payload.exp > currentTime) {
                // 유효한 토큰이면 UI 업데이트
                updateLoginUI(userName);
            } else {
                // 만료된 토큰 제거
                localStorage.removeItem('googleToken');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
            }
        } catch (e) {
            console.error("토큰 처리 오류:", e);
            localStorage.removeItem('googleToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
        }
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
                        displayVocabularyItems(vocabularyData);
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
        displayVocabularyItems(vocabularyData);
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
            displayVocabularyItems(vocabularyData);
            this.remove(); // 버튼 제거
        });
        
        // 어휘 목록 위에 버튼 추가
        vocabularyList.parentNode.insertBefore(backBtn, vocabularyList);
    }
    
    displayVocabularyItems(filteredVocabulary);
}

// About 링크 클릭 이벤트
aboutLink.addEventListener('click', function(e) {
    e.preventDefault();
    showAboutPage();
    updateURL({ page: 'about' });
});

// 메인 타이틀 클릭 이벤트 (기존 코드 수정)
mainTitle.addEventListener('click', function() {
    showMainPage();
    updateURL({ page: null, list: null, q: null });
});

// About 페이지 표시 함수
function showAboutPage() {
    mainPage.style.display = 'none';
    savedListsPage.style.display = 'none';
    aboutPage.style.display = 'block';
}

// 저장 리스트 버튼 클릭 이벤트 (팝업이 아닌 페이지 전환)
savedListsBtn.addEventListener('click', function() {
    showSavedListsPage();
    updateSaveListTabs();
    updateURL({ page: 'saved-lists', list: null });
});

// 메인 페이지 표시
function showMainPage() {
    mainPage.style.display = 'block';
    savedListsPage.style.display = 'none';
    aboutPage.style.display = 'none';
}
// 저장 리스트 페이지 표시
function showSavedListsPage(activeList = null) {
    mainPage.style.display = 'none';
    savedListsPage.style.display = 'block';
    aboutPage.style.display = 'none';
    updateSaveListTabs(activeList);
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


// Display vocabulary items
function displayVocabularyItems(items) {
    if (items.length === 0) {
        vocabularyList.innerHTML = '<div class="no-results">No results found.</div>';
        return;
    }
    
    vocabularyList.innerHTML = '';
    
    items.forEach(item => {
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
    displayVocabularyItems(vocabularyData);
});

// Update save list tabs
function updateSaveListTabs(activeListName = null) {
    saveListTabs.innerHTML = '';
    saveListContents.innerHTML = '';
    
    if (!activeListName) {
        activeListName = currentListName;
    }
    
    Object.keys(saveLists).forEach(listName => {
        // 탭 생성
        const tab = document.createElement('div');
        tab.className = `save-list-tab ${listName === activeListName ? 'active' : ''}`;
        tab.textContent = listName;
        tab.setAttribute('data-list', listName);
        tab.addEventListener('click', function() {
            const listName = this.getAttribute('data-list');
            switchSaveList(listName);
            updateURL({ list: listName });
        });
        saveListTabs.appendChild(tab);
        
        // 컨텐츠 생성
        const content = document.createElement('div');
        content.className = `save-list-content ${listName === activeListName ? 'active' : ''}`;
        content.id = `save-list-content-${listName.replace(/\s+/g, '-')}`;
        
        // Add action buttons for Copy and Print - NEW CODE
        const actionButtons = document.createElement('div');
        actionButtons.className = 'list-action-buttons';
        
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
        
        // Add action buttons at the top of content
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
                            alert(`"${wordToRemove}" 단어가 모든 리스트에서 제거되었습니다.`);
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
                        
                        // 로컬 스토리지 업데이트
                        saveListsToStorage();
                        
                        // 저장 목록 UI 업데이트
                        updateSaveListTabs(currentListName);
                        
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
    
    // Add delete list buttons if there's more than one list
    if (Object.keys(saveLists).length > 1) {
        document.querySelectorAll('.save-list-tab').forEach(tab => {
            const listName = tab.getAttribute('data-list');
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = ' ×';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.color = '#999';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(`Delete list "${listName}"?`)) {
                    delete saveLists[listName];
                    saveListsToStorage();
                    
                    // Switch to Default List
                    switchSaveList("Default List");
                    updateURL({ list: "Default List" });
                    updateSaveListTabs("Default List");
                }
            });
            tab.appendChild(deleteBtn);
        });
    }
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
            displayVocabularyItems(vocabularyData);
        }
    }
});

// Load saved lists from Google Drive
async function loadSavedLists() {
    // First check localStorage as a fast initial load
    const storedLists = localStorage.getItem('saveLists');
    if (storedLists) {
      saveLists = JSON.parse(storedLists);
    } else {
      // Initialize with Default List
      saveLists = { "Default List": [] };
    }
    
    // If user is logged in, try to load from Drive
    if (localStorage.getItem('googleToken')) {
      try {
        // This will update the UI if successful
        await loadUserDataFromDrive();
      } catch (error) {
        console.error('Error loading from Drive:', error);
      }
    }
  }

// Sign In button event (to be implemented later)
signInBtn.addEventListener('click', () => {
    alert('Sign In feature is coming soon.');
});

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
    // ... your existing code
});