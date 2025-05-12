// Global variables
let vocabularyData = []; // Will store all vocabulary data
let saveLists = {
    "Default List": []
};
let currentListName = "Default List";
let googleAuth = null;
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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCSVData();
    loadSavedLists();

    // URL 파라미터에 따라 페이지 표시
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const list = urlParams.get('list');
    
    if (page === 'saved-lists') {
        showSavedListsPage(list);
    } else {
        showMainPage();
    }
    
    // 검색어가 URL에 있는 경우
    const searchQuery = urlParams.get('q');
    if (searchQuery) {
        searchInput.value = searchQuery;
        performSearch();
    }
});

// Google Sign-In 초기화 함수
function initGoogleSignIn() {
    // Google 클라이언트 ID 설정 (실제 ID로 변경 필요)
    const CLIENT_ID = '당신의_구글_클라이언트_ID';
    
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false
        });
        
        // 기존 로그인 버튼의 이벤트 리스너를 변경
        if (signInBtn) {
            // 기존 이벤트 리스너 제거
            const newSignInBtn = signInBtn.cloneNode(true);
            signInBtn.parentNode.replaceChild(newSignInBtn, signInBtn);
            
            // 새 이벤트 리스너 추가
            newSignInBtn.addEventListener('click', () => {
                google.accounts.id.prompt();
            });
        }
    }
}

// Google Sign-In handler
window.handleCredentialResponse = function(response) {
    const token = response.credential;
    console.log("ID Token:", token);
    
    // 토큰을 로컬 스토리지에 저장
    localStorage.setItem('googleToken', token);
    
    // 토큰에서 사용자 정보 추출
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userName = payload.name;
    const userEmail = payload.email;
    
    // 사용자 정보 저장
    localStorage.setItem('userName', userName);
    localStorage.setItem('userEmail', userEmail);
    
    // 로그인 상태 UI 업데이트
    updateLoginUI(userName);
};

// 로그인 UI 업데이트 함수
function updateLoginUI(userName) {
    if (signInBtn) {
        // 로그인 상태로 버튼 변경
        signInBtn.textContent = `${userName}님`;
        signInBtn.classList.add('logged-in');
        
        // 로그아웃 버튼 추가
        addLogoutButton();
    }
}
// 로그아웃 버튼 추가 함수
function addLogoutButton() {
    // 이미 로그아웃 버튼이 있는지 확인
    if (!document.getElementById('logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = '로그아웃';
        logoutBtn.addEventListener('click', handleLogout);
        
        // 로그인 버튼 옆에 로그아웃 버튼 추가
        if (signInBtn && signInBtn.parentNode) {
            signInBtn.parentNode.insertBefore(logoutBtn, signInBtn.nextSibling);
        }
        
        // 계정 전환 버튼 추가
        const switchBtn = document.createElement('button');
        switchBtn.id = 'switch-account-btn';
        switchBtn.className = 'switch-account-btn';
        switchBtn.textContent = '계정 전환';
        switchBtn.addEventListener('click', switchAccount);
        
        if (logoutBtn && logoutBtn.parentNode) {
            logoutBtn.parentNode.insertBefore(switchBtn, logoutBtn);
        }
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
    
    // UI 리셋
    resetLoginUI();
    
    // 선택적으로 페이지 새로고침
    // window.location.reload();
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

// 로그인 UI 리셋 함수
function resetLoginUI() {
    if (signInBtn) {
        // 원래 로그인 버튼 텍스트로 복원
        signInBtn.textContent = 'Sign In';
        signInBtn.classList.remove('logged-in');
    }
    
    // 로그아웃 버튼 제거
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.remove();
    }
    
    // 계정 전환 버튼 제거
    const switchBtn = document.getElementById('switch-account-btn');
    if (switchBtn) {
        switchBtn.remove();
    }
}

// 페이지 로드 시 로그인 상태 확인
document.addEventListener('DOMContentLoaded', function() {
    // 기존 DOMContentLoaded 코드와 함께...
    
    // 로그인 상태 확인
    checkLoginState();
    
    // Google API 로드 확인 및 초기화
    if (typeof google !== 'undefined' && google.accounts) {
        initGoogleSignIn();
    } else {
        // Google API 스크립트를 동적으로 로드
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogleSignIn;
        document.head.appendChild(script);
    }
});

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
                resetLoginUI();
            }
        } catch (e) {
            console.error("토큰 처리 오류:", e);
            localStorage.removeItem('googleToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            resetLoginUI();
        }
    }
}

// Function to update UI based on login state
function updateLoginState(isLoggedIn, userName = '') {
    if (isLoggedIn) {
        // Update sign-in button or show user info
        if (signInBtn) {
            signInBtn.textContent = `Signed in as ${userName}`;
            signInBtn.disabled = true; // Optional: disable the button when logged in
        }
        
        // You can also add a logout button here if needed
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.textContent = 'Sign Out';
        logoutBtn.addEventListener('click', handleLogout);
        
        // Add logout button near the sign-in button
        if (signInBtn && signInBtn.parentNode) {
            signInBtn.parentNode.appendChild(logoutBtn);
        }
    }
}

// Handle logout
function handleLogout() {
    // Clear token from local storage
    localStorage.removeItem('googleToken');
    
    // Sign out from Google
    google.accounts.id.disableAutoSelect();
    
    // Refresh page to reflect logged-out state
    window.location.reload();
}

// Check login state on page load
document.addEventListener('DOMContentLoaded', () => {
    // Add this to your existing DOMContentLoaded handler or create a new one
    const token = localStorage.getItem('googleToken');
    if (token) {
        try {
            // Decode token to get user info
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Check if token is expired
            const currentTime = Math.floor(Date.now() / 1000);
            if (payload.exp > currentTime) {
                // Token is valid, update UI
                updateLoginState(true, payload.name);
            } else {
                // Token is expired, remove it
                localStorage.removeItem('googleToken');
            }
        } catch (e) {
            console.error("Error processing token:", e);
            localStorage.removeItem('googleToken');
        }
    }
}); 
// Load CSV data
async function loadCSVData() {
    try {
        vocabularyList.innerHTML = '<div class="loading">Loading vocabulary data...</div>';
        
        // Fetch the CSV file
        const response = await fetch('vocabulary_deduplicated_2.csv');
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
    
    displayVocabularyItems(filteredVocabulary);
}

// 메인 타이틀 클릭 이벤트
mainTitle.addEventListener('click', function() {
    showMainPage();
    updateURL({ page: null, list: null, q: null });
});

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
}

// 저장 리스트 페이지 표시
function showSavedListsPage(activeList = null) {
    mainPage.style.display = 'none';
    savedListsPage.style.display = 'block';
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

// Search 함수 근처에 추가 (약 50-70줄 근처)
function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayVocabularyItems(vocabularyData);
        return;
    }
    
    const filteredVocabulary = vocabularyData.filter(item => 
        item.Headword.toLowerCase().includes(searchTerm) || 
        item.Definitions.toLowerCase().includes(searchTerm) ||
        (item.Headword_Data && item.Headword_Data.toLowerCase().includes(searchTerm))
    );
    
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
        
        const vocabularyItem = document.createElement('div');
        vocabularyItem.className = 'vocabulary-item';
        vocabularyItem.innerHTML = `
            <div class="vocabulary-info">
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
                // Save to this list
                saveLists[listName].push(wordData);
                this.innerHTML = `${listName} (★)`;
                
                // 여기에 Default 리스트에도 추가하는 코드 추가
                if (listName !== "Default List") {
                    // Default 리스트에 이미 있는지 확인
                    const defaultListIndex = saveLists["Default List"].findIndex(word => word.Headword === wordToToggle);
                    if (defaultListIndex === -1) {
                        // Default 리스트에 없으면 추가
                        saveLists["Default List"].push(wordData);
                    }
                }
            } else {
                // Remove from this list
                saveLists[listName].splice(wordIndex, 1);
                this.innerHTML = `${listName} (☆)`;
                
                // Default List가 아닌 경우, 다른 리스트에도 있는지 확인
                if (listName !== "Default List") {
                    // 다른 사용자 정의 리스트에 단어가 있는지 확인
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
                        }
                    }
                }
            }
            
            // Update parent save button
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
            
            // Save to local storage
            localStorage.setItem('saveLists', JSON.stringify(saveLists));
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
    localStorage.setItem('saveLists', JSON.stringify(saveLists));
    
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
        
        if (saveLists[listName].length === 0) {
            content.innerHTML = '<p>No words saved in this list.</p>';
        } else {
            saveLists[listName].forEach(word => {
                const wordItem = document.createElement('div');
                wordItem.className = 'vocabulary-item';
                wordItem.innerHTML = `
                    <div class="vocabulary-info">
                        <div class="word">${word.Headword}</div>
                        <div class="definition">${word.Definitions}</div>
                        <div class="occurrence">Occurrences in the Aeneid: ${word["Occurrences in the Aeneid"]}</div>
                    </div>
                    <button class="save-btn saved" data-word="${word.Headword}" data-list="${listName}">★</button>
                `;
                content.appendChild(wordItem);
            });
            
            // Remove word from list
            // 약 310-350줄 근처의 updateSaveListTabs 함수 내부
            content.querySelectorAll('.save-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const wordToRemove = this.getAttribute('data-word');
                    const listToRemoveFrom = this.getAttribute('data-list');
                    const wordIndex = saveLists[listToRemoveFrom].findIndex(word => word.Headword === wordToRemove);
                    
                    if (wordIndex !== -1) {
                        saveLists[listToRemoveFrom].splice(wordIndex, 1);
                        
                        // Default List가 아닌 경우, 다른 리스트에도 있는지 확인
                        if (listToRemoveFrom !== "Default List") {
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
                        
                        localStorage.setItem('saveLists', JSON.stringify(saveLists));
                        updateSaveListTabs();
                        
                        // Update main list
                        const mainListBtn = document.querySelector(`.vocabulary-list .save-btn[data-word="${wordToRemove}"]`);
                        if (mainListBtn) {
                            // Check if word is saved in any other list
                            let savedInOtherList = false;
                            for (const list in saveLists) {
                                if (saveLists[list].some(word => word.Headword === wordToRemove)) {
                                    savedInOtherList = true;
                                    break;
                                }
                            }
                            
                            if (!savedInOtherList) {
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
                    localStorage.setItem('saveLists', JSON.stringify(saveLists));
                    
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

// Load saved lists from local storage
function loadSavedLists() {
    const storedLists = localStorage.getItem('saveLists');
    if (storedLists) {
        saveLists = JSON.parse(storedLists);
    } else {
        // Initialize with Default List
        saveLists = { "Default List": [] };
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