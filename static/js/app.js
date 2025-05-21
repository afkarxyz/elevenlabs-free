document.addEventListener('DOMContentLoaded', function() {
    let apiKeys = [];
    let currentApiKeyIndex = 0;
    let currentlyPlayingAudio = null;
    let lastCharacterCount = 0;
    let lastCharacterLimit = 0;
    let lastNextReset = 0;
    let historyItems = [];
    let currentHistoryIndex = -1;
    let db;
    const dbName = 'TtsHistoryDB';
    const dbVersion = 1;
    const storeName = 'history';
    let libraryCurrentGender = localStorage.getItem("libraryCurrentGender") || "";
    let libraryCurrentLanguage = (() => {
        try {
            return JSON.parse(localStorage.getItem("libraryCurrentLanguage")) || { code: "", label: "Any Language" };
        } catch (e) { return { code: "", label: "Any Language" }; }
    })();
    let libraryCurrentSort = localStorage.getItem("libraryCurrentSort") || "trending";
    let libraryCurrentPage = 0;
    let libraryTotalLoadedItems = 0;
    let libraryCurrentSearch = "";

    const inputText = document.getElementById('inputText');
    const charCountDisplay = document.getElementById('charCount');
    const ttsForm = document.getElementById('ttsForm');
    const generatedAudioCard = document.getElementById('generatedAudioCard');
    const simpleAudioPlayer = document.getElementById('simpleAudioPlayer');
    const simpleDownloadButton = document.getElementById('simpleDownloadButton');
    const speedRange = document.getElementById('speedRange');
    const speedValueDisplay = document.getElementById('speedValue');
    const resetSpeedButton = document.getElementById('resetSpeedButton');
    const historyCard = document.getElementById('historyCard');
    const noHistoryMessage = document.getElementById('noHistoryMessage');
    const userVoiceList = document.getElementById("userVoiceList");
    const voicesTitle = document.getElementById("voicesTitle");
    const searchResultsDiv = document.getElementById("searchResults");
    const libraryVoiceList = document.getElementById("voiceList");
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    const customAlertElement = document.getElementById('customAlert');
    const customAlertOverlay = document.getElementById('customAlertOverlay');
    const modelOverlay = document.getElementById('modelOverlay');

    let themeToggleLogo; 
    const body = document.body;

    function toggleIconStyle(selector, isDark) {
        const iconElement = document.querySelector(selector);
        if (iconElement) {
            if (isDark) {
                iconElement.classList.remove('far');
                iconElement.classList.add('fas');
            } else {
                iconElement.classList.remove('fas');
                iconElement.classList.add('far');
            }
        }
    }

    function applyTheme(theme) {
        themeToggleLogo = document.getElementById('themeToggleLogo'); 
        const isDark = theme === 'dark';

        if (isDark) {
            body.classList.add('dark');
            if (themeToggleLogo) themeToggleLogo.style.filter = 'invert(1) brightness(1.5) contrast(0.9)'; 
        } else {
            body.classList.remove('dark');
            if (themeToggleLogo) themeToggleLogo.style.filter = 'none';
        }

        toggleIconStyle('#ttsForm .normal-state .fa-waveform-lines', isDark);
        toggleIconStyle('#simpleDownloadButton .fa-arrow-down-to-arc', isDark);
        toggleIconStyle('#downloadHistoryAudio .fa-arrow-down-to-arc', isDark);
    }

    function toggleTheme() {
        const currentThemeIsDark = body.classList.contains('dark');
        const newTheme = currentThemeIsDark ? 'light' : 'dark';
        localStorage.setItem('elevenlabs-theme', newTheme);
        applyTheme(newTheme);
    }

    function formatString(str) {
        if (!str || typeof str !== 'string') return "";
        const formatSegment = (segment) => segment.split(/[\s_-]+/)
            .map(word => {
                if (word.toLowerCase() === "ai" || word.toLowerCase() === "tts") return word.toUpperCase();
                if (word.length === 1) return word.toUpperCase();
                if (word.toUpperCase() === word && word.length <= 3) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(" ");
        if (str.includes(' - ')) return str.split(' - ').map(part => formatSegment(part.trim())).join(' - ');
        return formatSegment(str.trim());
    }
    function formatNumber(num) {
        if (typeof num !== 'number') return String(num);
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function formatTimeAgo(timestampMs) {
        const now = new Date();
        const date = new Date(timestampMs);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 5) return "Just now";
        if (seconds < 60) return `${seconds}s ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        if (days < 28) return `${days}d ago`; 

        const months = Math.floor(days / 30.4375); 
        if (months < 12) return `${months}mo ago`;

        const years = Math.floor(days / 365.25);
        return `${years}y ago`;
    }
    function formatShortDuration(milliseconds) {
        if (milliseconds <= 0) return "0sec";
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30.4375);
        const years = Math.floor(days / 365.25);

        if (years > 0) return `${years}y`;
        if (months > 0) return `${months}mo`;
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}hr`;
        if (minutes > 0) return `${minutes}min`;
        return `${seconds}sec`;
    }
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 KB';
        const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    function formatDate(dateValue, includeTime = true) {
        const date = new Date(dateValue);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) Object.assign(options, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        return date.toLocaleString('en-GB', options).replace(',', '');
    }
    function isRTL(s) { return /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(s); }

    function showCustomAlert(message, type = 'info', duration = 1500) {
        if (!customAlertElement || !customAlertOverlay) return;
        customAlertElement.innerHTML = `<div>${message}</div>`;
        customAlertElement.className = 'custom-alert'; 
        customAlertElement.classList.add(`custom-alert-${type}`, 'show');
        customAlertOverlay.classList.add('show');
        setTimeout(() => {
            customAlertElement.classList.remove('show');
            customAlertOverlay.classList.remove('show');
            setTimeout(() => customAlertElement.classList.add('hidden'), 200); 
        }, duration);
    }
    function showCustomConfirm(message, onConfirm, onCancel) {
        if (!customAlertElement || !customAlertOverlay) return;
        customAlertElement.className = 'custom-alert'; 
        customAlertElement.innerHTML = `<div class="custom-alert-message">${message}</div><div class="custom-alert-buttons"><button class="custom-alert-button custom-alert-cancel">Cancel</button><button class="custom-alert-button custom-alert-confirm">Confirm</button></div>`;
        customAlertElement.classList.add('show'); customAlertOverlay.classList.add('show');
        const confirmBtn = customAlertElement.querySelector('.custom-alert-confirm');
        const cancelBtn = customAlertElement.querySelector('.custom-alert-cancel');
        const close = () => {
            confirmBtn.removeEventListener('click', confirmHandler); cancelBtn.removeEventListener('click', cancelHandler);
            customAlertElement.classList.remove('show'); customAlertOverlay.classList.remove('show');
            setTimeout(() => customAlertElement.classList.add('hidden'), 200); 
        };
        const confirmHandler = () => { close(); if (onConfirm) onConfirm(); };
        const cancelHandler = () => { close(); if (onCancel) onCancel(); };
        confirmBtn.addEventListener('click', confirmHandler); cancelBtn.addEventListener('click', cancelHandler);
    }
    function showVoiceNamePopup(defaultName, onConfirm) {
        const popup = document.getElementById("voiceNamePopup");
        const overlay = document.getElementById("customAlertOverlay");
        const input = document.getElementById("voiceNameInput");
        if (!popup || !overlay || !input) return;
        input.value = defaultName;
        popup.classList.remove("hidden"); popup.classList.add("show"); overlay.classList.add("show");
        setTimeout(() => input.focus(), 100);
        const confirmBtn = popup.querySelector(".custom-alert-confirm");
        const cancelBtn = popup.querySelector(".custom-alert-cancel");
        const nConfirmBtn = confirmBtn.cloneNode(true), nCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.replaceWith(nConfirmBtn); cancelBtn.replaceWith(nCancelBtn);
        const close = () => {
            nConfirmBtn.removeEventListener('click', confirmH); nCancelBtn.removeEventListener('click', cancelH); input.removeEventListener('keyup', enterH);
            popup.classList.remove("show"); overlay.classList.remove("show"); setTimeout(() => popup.classList.add("hidden"), 200);
        };
        const confirmH = () => { const name = input.value.trim(); if (name) { close(); onConfirm(name); } else { showCustomAlert("Voice name cannot be empty.", "error", 2000); input.focus(); }};
        const cancelH = () => close();
        const enterH = e => { if (e.key === "Enter") nConfirmBtn.click(); };
        nConfirmBtn.addEventListener("click", confirmH); nCancelBtn.addEventListener("click", cancelH); input.addEventListener("keyup", enterH);
    }

    function updateApiKeyDisplay() {
        const apiKeyInput = document.getElementById('apiKey');
        const settingsCount = document.getElementById('settingsApiKeyCount');
        const labelText = document.getElementById('apiKeyLabelText');
        const toggleBtn = document.getElementById('toggleApiKey');
        if (apiKeyInput && settingsCount && labelText && toggleBtn) {
            const singleKey = apiKeys.length <= 1;
            apiKeyInput.value = singleKey && apiKeys.length === 1 ? apiKeys[0] : '';
            apiKeyInput.disabled = !singleKey;
            apiKeyInput.placeholder = singleKey ? 'Enter your ElevenLabs API key' : `Using key ${currentApiKeyIndex + 1} of ${apiKeys.length}`;
            settingsCount.textContent = apiKeys.length > 1 ? `(${apiKeys.length} Keys)` : '';
            labelText.style.display = singleKey ? 'block' : 'none';
            toggleBtn.style.display = singleKey ? 'block' : 'none';
        }
        const myVoicesCount = document.getElementById("myVoicesApiKeyCount");
        if (myVoicesCount) myVoicesCount.textContent = apiKeys.length > 1 ? `(${apiKeys.length} Keys)` : "";
    }
    function updateApiKeyNavigation() {
        const sections = [
            { nav: 'usageApiKeyNavigation', current: 'usageCurrentApiKeyIndex', total: 'usageTotalApiKeys', prev: 'usagePrevApiKey', next: 'usageNextApiKey' },
            { nav: 'myVoicesApiKeyNavigation', current: 'myVoicesCurrentApiKeyIndex', total: 'myVoicesTotalApiKeys', prev: 'myVoicesPrevApiKey', next: 'myVoicesNextApiKey' }
        ];
        sections.forEach(s => {
            const navEl = document.getElementById(s.nav), currentEl = document.getElementById(s.current), totalEl = document.getElementById(s.total), prevEl = document.getElementById(s.prev), nextEl = document.getElementById(s.next);
            if (navEl && currentEl && totalEl && prevEl && nextEl) {
                if (apiKeys.length > 1) {
                    navEl.style.display = "flex"; currentEl.value = currentApiKeyIndex + 1; totalEl.textContent = apiKeys.length;
                    prevEl.disabled = currentApiKeyIndex === 0; nextEl.disabled = currentApiKeyIndex === apiKeys.length - 1;
                } else {
                    navEl.style.display = "none";
                }
            }
        });
    }
    function switchApiKey(newIndex) {
        if (newIndex >= 0 && newIndex < apiKeys.length && newIndex !== currentApiKeyIndex) {
            currentApiKeyIndex = newIndex;
            localStorage.setItem('currentApiKeyIndex', currentApiKeyIndex);
            updateApiKeyDisplay(); updateApiKeyNavigation();
            fetchUsageInfo(); fetchVoicesForDashboard();
            if (document.getElementById('my-voices').classList.contains('active') || !document.getElementById('my-voices').classList.contains('hidden')) {
                getUserVoices();
            }
        }
    }
    function handleApiKeyChangeFromInput(inputId) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) return;
        let newIndex = parseInt(inputElement.value) - 1;
        if (!isNaN(newIndex) && newIndex >= 0 && newIndex < apiKeys.length) {
            switchApiKey(newIndex);
        } else {
            inputElement.value = currentApiKeyIndex + 1;
        }
    }

    function setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const activeTabId = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
                const activeTabContent = document.getElementById(activeTabId);
                if (activeTabContent) activeTabContent.classList.remove('hidden');
                if (activeTabId !== 'dashboard' && generatedAudioCard) generatedAudioCard.classList.add('hidden');
                if (activeTabId === 'my-voices') getUserVoices();
            });
        });
    }

    function setupGlobalAudioPlayManagement() {
        document.addEventListener('play', e => {
            if (e.target.tagName.toLowerCase() === 'audio') {
                if (currentlyPlayingAudio && currentlyPlayingAudio !== e.target) currentlyPlayingAudio.pause();
                currentlyPlayingAudio = e.target;
            }
        }, true);
    }
    function setupDashboardAudioPlayerSync() {
        const historyAudioPlayer = document.getElementById('historyAudio');
        if (historyAudioPlayer && simpleAudioPlayer && generatedAudioCard) {
            historyAudioPlayer.addEventListener('play', () => {
                simpleAudioPlayer.src = historyAudioPlayer.src;
                simpleAudioPlayer.currentTime = historyAudioPlayer.currentTime;
                const dashboardTab = document.querySelector('[data-tab="dashboard"]');
                if (dashboardTab) dashboardTab.click();
                generatedAudioCard.classList.remove('hidden');
                simpleAudioPlayer.play().catch(e => console.warn("Simple player play from history failed:", e));
            });
        }
    }

    function initializeDB() {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = e => { console.error("DB error:", e.target.error); showCustomAlert("Error initializing local history.", "error"); };
        request.onsuccess = e => { db = e.target.result; loadHistoryFromDB(); };
        request.onupgradeneeded = e => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                const os = db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
                os.createIndex("timestamp", "timestamp", { unique: false });
            }
        };
    }

    function updateCharCount() {
        if (!inputText || !charCountDisplay) return;
        const len = inputText.value.length;
        const usedFromAPI = lastCharacterCount;
        const limitFromAPI = lastCharacterLimit;
        const remainingCreditRaw = limitFromAPI - usedFromAPI;
        const selectedModel = localStorage.getItem('elevenLabsSelectedModel') || 'eleven_multilingual_v2';
        let effectiveRemainingCredit = remainingCreditRaw;

        if (selectedModel.includes('turbo') || selectedModel.includes('flash')) {
            effectiveRemainingCredit = remainingCreditRaw * 2;
        }
        effectiveRemainingCredit = Math.max(0, effectiveRemainingCredit);
        const lenSpan = document.createElement('span');
        lenSpan.textContent = formatNumber(len);
        
        if (len > effectiveRemainingCredit && limitFromAPI > 0) {
            lenSpan.classList.add('text-red-400');
        }
        charCountDisplay.innerHTML = ''; charCountDisplay.append(lenSpan, ` / ${formatNumber(effectiveRemainingCredit)}`);
        inputText.dir = isRTL(inputText.value) ? 'rtl' : 'ltr';
        inputText.style.textAlign = isRTL(inputText.value) ? 'right' : 'left';
    }
    async function fetchVoicesForDashboard() {
        const apiKey = apiKeys[currentApiKeyIndex];
        if (!apiKey) { populateVoiceSelectForDashboard([]); return; }
        try {
            const response = await fetch('/get-voices', { headers: { 'X-API-KEY': apiKey }});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            localStorage.setItem('dashboardVoicesCache', JSON.stringify(data));
            populateVoiceSelectForDashboard(data);
        } catch (error) {
            console.error('Error fetching dashboard voices:', error);
            showCustomAlert(`Failed to load voices: ${error.message}`, 'error');
            populateVoiceSelectForDashboard([]);
        }
    }
    async function fetchUsageInfo() {
        const apiKey = apiKeys[currentApiKeyIndex];
        if (!apiKey) { updateUsageInfo(0,0,0); return; }
        try {
            const response = await fetch('/get-usage-info', { headers: { 'X-API-KEY': apiKey }});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            lastCharacterCount = data.character_count;
            lastCharacterLimit = data.character_limit;
            lastNextReset = data.next_character_count_reset_unix;
            updateUsageInfo(data.character_count, data.character_limit, data.next_character_count_reset_unix);
        } catch (error) {
            console.error('Error fetching usage:', error);
            showCustomAlert(`Usage info error: ${error.message}`, 'error');
            updateUsageInfo(0,0,0);
        }
    }
    function updateUIBasedOnApiKey() {
        const hasKey = apiKeys.length > 0;
        const elementsToToggle = {
            'usageCard': hasKey, 'modelSelectContainer': hasKey, 'voiceSelectContainer': hasKey,
            'clearButton': hasKey, 'pasteButton': hasKey, 'characterCountWrapper': hasKey
        };
        Object.entries(elementsToToggle).forEach(([id, show]) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', !show);
        });
        if (inputText) { inputText.disabled = !hasKey; inputText.placeholder = hasKey ? 'Type text...' : 'Enter API key first'; }
        const genBtn = ttsForm ? ttsForm.querySelector('button[type="submit"]') : null;
        if (genBtn) genBtn.disabled = !hasKey;
    }
    function updateUsageInfo(apiCount, apiLimit, resetUnix) {
        const bar = document.getElementById('usageBar'), countEl = document.getElementById('characterCount'),
              resetDateEl = document.getElementById('resetDate'), 
              percentEl = document.getElementById('usagePercentage'),
              resetCountdownEl = document.getElementById('resetCountdown'),
              resetCountdownDesktopEl = resetCountdownEl?.querySelector('.reset-countdown-desktop-format'),
              resetCountdownMobileEl = resetCountdownEl?.querySelector('.reset-countdown-mobile-format');


        if (!bar || !countEl || !resetDateEl || !percentEl || !resetCountdownEl || !resetCountdownDesktopEl || !resetCountdownMobileEl) return;
        
        const percent = apiLimit > 0 ? (apiCount / apiLimit) * 100 : 0;
        bar.style.width = `${Math.min(100, percent)}%`;
        percentEl.textContent = `(${percent.toFixed(0)}%)`;
        bar.classList.remove('usage-danger', 'usage-warning');
        if (percent >= 90) bar.classList.add('usage-danger');
        else if (percent >= 80) bar.classList.add('usage-warning');
        
        countEl.textContent = `${formatNumber(apiCount)} / ${formatNumber(apiLimit)}`;
        
        resetCountdownEl.classList.add('text-sm');
        resetCountdownEl.classList.remove('text-xs');


        if (resetUnix > 0) {
            const resetDateFormatted = formatDate(resetUnix * 1000);
            const now = new Date();
            const resetDateObj = new Date(resetUnix * 1000);
            const diffTime = Math.max(0, resetDateObj - now);
            resetDateEl.textContent = resetDateFormatted; 
            resetCountdownDesktopEl.textContent = `(reset in ${formatShortDuration(diffTime)})`;
            resetCountdownMobileEl.textContent = `reset in ${formatShortDuration(diffTime)}`;
        } else {
            resetDateEl.textContent = '-';
            resetCountdownDesktopEl.textContent = '';
            resetCountdownMobileEl.textContent = '';
        }
        updateCharCount();
    }
    function clearUsageInfo() { updateUsageInfo(0,0,0); }
    function downloadAudio(blob, filename = 'audio.mp3') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    
    function getModelNameForDisplay(modelId) {
        const models = {
            'eleven_multilingual_v2': 'Eleven Multilingual v2',
            'eleven_turbo_v2_5': 'Eleven Turbo v2.5',
            'eleven_flash_v2_5': 'Eleven Flash v2.5',
            'eleven_turbo_v2': 'Eleven Turbo v2',
            'eleven_flash_v2': 'Eleven Flash v2'
        };
        return models[modelId] || modelId;
    }

    function getModelNameForFile(modelId) {
        const map = {'eleven_multilingual_v2':'MultiV2','eleven_turbo_v2_5':'Turbo2.5','eleven_flash_v2_5':'Flash2.5','eleven_turbo_v2':'TurboV2','eleven_flash_v2':'FlashV2'};
        return map[modelId] || modelId.replace('eleven_','');
    }

    function populateVoiceSelectForDashboard(voices) {
        const defaultCatEl = document.querySelector('#voicePopup #defaultCategory .voice-options');
        const libraryCatEl = document.querySelector('#voicePopup #libraryCategory .voice-options');
        const libContainer = document.querySelector('#voicePopup #libraryCategory');
        if (!defaultCatEl || !libraryCatEl || !libContainer) return;
        defaultCatEl.innerHTML = ''; libraryCatEl.innerHTML = '';
        const savedVoiceId = localStorage.getItem('elevenLabsSelectedVoice');
        let selVoiceName = "Select Voice", foundSel = false, hasLibVoices = false;

        (voices || []).forEach(voice => {
            if (!voice || !voice.id) return;
            const option = document.createElement('div'); option.className = 'voice-option'; option.dataset.voiceId = voice.id;
            const voiceName = formatString(voice.name || 'Unnamed');
            const labels = voice.labels || {}, tags = [
                { cls:"bg-blue-100 text-blue-800", val:formatString(labels.gender||''), show:!!labels.gender},
                { cls:"bg-green-100 text-green-800", val:formatString(labels.age||''), show:!!labels.age},
                { cls:"bg-yellow-100 text-yellow-800", val:formatString(labels.accent||''), show:!!labels.accent},
                { cls:"bg-indigo-100 text-indigo-800", val:formatString(labels.use_case||''), show:!!labels.use_case}
            ];
            const tagsHtml = tags.filter(t => t.show && t.val).map(t => `<span class="voice-tag ${t.cls}">${t.val}</span>`).join('');
            option.innerHTML = `<div class="voice-name">${voiceName}</div><div class="voice-tags">${tagsHtml}</div>`;
            if (voice.id === savedVoiceId) { selVoiceName = voiceName; foundSel = true; }
            if (voice.category === 'premade') defaultCatEl.appendChild(option);
            else { libraryCatEl.appendChild(option); hasLibVoices = true; }
        });
        libContainer.style.display = hasLibVoices ? 'block' : 'none';
        const selVoiceNameEl = document.getElementById('selectedVoiceName');
        if (selVoiceNameEl) selVoiceNameEl.textContent = foundSel ? selVoiceName : "Select Voice";
        if (!foundSel && voices.length > 0 && voices[0].id) {
            const firstVoice = voices.find(v => v.category === 'premade') || voices[0];
            localStorage.setItem('elevenLabsSelectedVoice', firstVoice.id);
            if (selVoiceNameEl) selVoiceNameEl.textContent = formatString(firstVoice.name || 'Unnamed');
        } else if (voices.length === 0) {
             localStorage.removeItem('elevenLabsSelectedVoice');
             if (selVoiceNameEl) selVoiceNameEl.textContent = "No voices available";
        }
        setupVoiceSelectionForDashboard();
    }
    function setupVoiceSelectionForDashboard() {
        const btn = document.getElementById('voiceSelectButton'), popup = document.getElementById('voicePopup'),
              search = document.getElementById('voiceSearchInputDashboard');
        if (!btn || !popup || !modelOverlay || !search) return;
        const nBtn = btn.cloneNode(true); btn.replaceWith(nBtn);
        nBtn.addEventListener('click', e => { e.stopPropagation(); popup.classList.toggle('show'); modelOverlay.classList.toggle('show'); });
        
        const clickOutsideHandler = e => {
            if (!nBtn.contains(e.target) && !popup.contains(e.target)) {
                popup.classList.remove('show'); modelOverlay.classList.remove('show');
            }
        };
        document.removeEventListener('click', clickOutsideHandler); 
        document.addEventListener('click', clickOutsideHandler);

        popup.querySelectorAll('.voice-option').forEach(opt => {
            const nOpt = opt.cloneNode(true); opt.replaceWith(nOpt);
            nOpt.addEventListener('click', () => {
                const id = nOpt.dataset.voiceId, name = (nOpt.querySelector('.voice-name') || {}).textContent || 'Selected';
                const selNameEl = document.getElementById('selectedVoiceName');
                if (selNameEl) selNameEl.textContent = name;
                localStorage.setItem('elevenLabsSelectedVoice', id);
                popup.classList.remove('show'); modelOverlay.classList.remove('show');
            });
        });
        search.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            ['#voicePopup #defaultCategory', '#voicePopup #libraryCategory'].forEach(catSel => {
                const catEl = document.querySelector(catSel);
                if (!catEl) return;
                let hasVisible = false;
                catEl.querySelectorAll('.voice-option').forEach(opt => {
                    const name = (opt.querySelector('.voice-name')||{}).textContent.toLowerCase();
                    const tags = Array.from(opt.querySelectorAll('.voice-tag')).map(t=>t.textContent.toLowerCase()).join(' ');
                    const match = name.includes(term) || tags.includes(term);
                    opt.style.display = match ? 'block' : 'none';
                    if (match) hasVisible = true;
                });
                const categoryTitleVisible = catEl.querySelector('.category-title')?.textContent.toLowerCase().includes(term);
                catEl.style.display = (hasVisible || categoryTitleVisible) ? 'block' : 'none';
            });
        });
    }
    function setupDashboardFeatures() {
        if (inputText) inputText.addEventListener('input', updateCharCount);
        const pasteBtn = document.getElementById('pasteButton');
        if (pasteBtn) pasteBtn.addEventListener('click', async () => {
            try { const text = await navigator.clipboard.readText(); if (inputText) inputText.value = text; updateCharCount(); }
            catch(e){ showCustomAlert("Failed to paste text.", "error");}
        });
        const clearBtn = document.getElementById('clearButton');
        if (clearBtn) clearBtn.addEventListener('click', () => { if (inputText) inputText.value = ''; updateCharCount(); });

        if (ttsForm) ttsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const apiKey = apiKeys[currentApiKeyIndex];
            if (!apiKey) { showCustomAlert('API key required!', 'error'); return; }
            const textVal = inputText.value, modelId = localStorage.getItem('elevenLabsSelectedModel') || 'eleven_multilingual_v2',
                  voiceId = localStorage.getItem('elevenLabsSelectedVoice'), 
                  voiceNameForFile = (document.getElementById('selectedVoiceName')||{}).textContent || "Voice",
                  speedVal = speedRange ? speedRange.value : (localStorage.getItem('elevenLabsSelectedSpeed') || '1.00');
            
            const cachedVoices = JSON.parse(localStorage.getItem('dashboardVoicesCache') || '[]');
            const selectedVoiceObject = cachedVoices.find(v => v.id === voiceId);
            const voiceNameForHistory = selectedVoiceObject ? (selectedVoiceObject.name || "Voice") : voiceNameForFile;

            if (!voiceId) { showCustomAlert('Select a voice!', 'error'); return; }

            const submitBtn = this.querySelector('button[type="submit"]'), normalState = submitBtn.querySelector('.normal-state'), loadingState = submitBtn.querySelector('.loading-state');
            submitBtn.disabled = true; normalState.classList.add('hidden'); loadingState.classList.remove('hidden');
            if (generatedAudioCard) generatedAudioCard.classList.add('hidden');

            try {
                const url = `/generate-audio?text=${encodeURIComponent(textVal)}&model_id=${encodeURIComponent(modelId)}&voice_id=${encodeURIComponent(voiceId)}&speed=${encodeURIComponent(speedVal)}`;
                const response = await fetch(url, { headers: { 'X-API-KEY': apiKey }});
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                if (simpleAudioPlayer) simpleAudioPlayer.src = audioUrl;
                if (generatedAudioCard) generatedAudioCard.classList.remove('hidden');
                if (simpleDownloadButton) simpleDownloadButton.onclick = () => {
                    const fName = `ElevenLabs_${getModelNameForFile(modelId)}_${voiceNameForFile.replace(/[^a-zA-Z0-9]/g, '')}_${formatDate(new Date(), true).replace(/[\/:]/g, '').replace(' ', '_')}.mp3`;
                    downloadAudio(audioBlob, fName);
                };
                saveToHistory(textVal, audioBlob, modelId, voiceNameForHistory);
                if (simpleAudioPlayer) simpleAudioPlayer.play().catch(err => console.warn("Audio play failed", err));
            } catch (error) {
                console.error('TTS Error:', error);
                showCustomAlert(`Audio generation failed: ${error.message}`, 'error', 3000);
            } finally {
                submitBtn.disabled = false; normalState.classList.remove('hidden'); loadingState.classList.add('hidden');
                fetchUsageInfo();
            }
        });

        if (speedRange && speedValueDisplay) {
            const savedSpeed = localStorage.getItem('elevenLabsSelectedSpeed') || '1.00';
            speedRange.value = savedSpeed; speedValueDisplay.textContent = `${parseFloat(savedSpeed).toFixed(2)}x`;
            speedRange.addEventListener('input', () => {
                speedValueDisplay.textContent = `${parseFloat(speedRange.value).toFixed(2)}x`;
                localStorage.setItem('elevenLabsSelectedSpeed', speedRange.value);
            });
        }
        if (resetSpeedButton && speedRange && speedValueDisplay) {
            resetSpeedButton.addEventListener('click', () => {
                speedRange.value = '1.00'; speedValueDisplay.textContent = '1.00x';
                localStorage.setItem('elevenLabsSelectedSpeed', '1.00');
            });
        }
        const modelBtn = document.getElementById('modelSelectButton'), modelPopup = document.getElementById('modelPopup'), selModelName = document.getElementById('selectedModelName');
        if (modelBtn && modelPopup && selModelName && modelOverlay) {
            const savedMdl = localStorage.getItem('elevenLabsSelectedModel') || 'eleven_multilingual_v2';
            const initMdlOpt = modelPopup.querySelector(`.model-option[data-value="${savedMdl}"]`);
            if (initMdlOpt) selModelName.textContent = (initMdlOpt.querySelector('.model-name')||{}).textContent || "Select Model";
            else selModelName.textContent = "Select Model";

            modelBtn.addEventListener('click', e => { e.stopPropagation(); modelPopup.classList.toggle('show'); modelOverlay.classList.toggle('show');});
            
            const clickOutsideModelHandler = e => { 
                if (!modelBtn.contains(e.target) && !modelPopup.contains(e.target)) { 
                    modelPopup.classList.remove('show'); modelOverlay.classList.remove('show');
                }
            };
            document.removeEventListener('click', clickOutsideModelHandler); 
            document.addEventListener('click', clickOutsideModelHandler);

            modelPopup.querySelectorAll('.model-option').forEach(opt => {
                const nOpt = opt.cloneNode(true); opt.replaceWith(nOpt);
                nOpt.addEventListener('click', () => {
                    const id = nOpt.dataset.value, name = (nOpt.querySelector('.model-name')||{}).textContent;
                    selModelName.textContent = name; localStorage.setItem('elevenLabsSelectedModel', id);
                    updateUsageInfo(lastCharacterCount, lastCharacterLimit, lastNextReset); 
                    modelPopup.classList.remove('show'); modelOverlay.classList.remove('show');
                });
            });
        }
    }

    function saveToHistory(text, audioBlob, modelId, voiceName) {
        if (!db) return;
        const tx = db.transaction([storeName], "readwrite");
        tx.objectStore(storeName).add({ text, audio: audioBlob, modelId, voiceName, timestamp: Date.now() });
        tx.oncomplete = loadHistoryFromDB;
        tx.onerror = e => console.error("Save history error:", e.target.error);
    }
    function loadHistoryFromDB() {
        if (!db) return;
        const tx = db.transaction([storeName], "readonly");
        const req = tx.objectStore(storeName).index("timestamp").openCursor(null, "prev");
        historyItems = [];
        req.onsuccess = e => {
            const cursor = e.target.result;
            if (cursor) { historyItems.push(cursor.value); cursor.continue(); }
            else { currentHistoryIndex = historyItems.length > 0 ? 0 : -1; updateHistoryUI(); }
        };
        req.onerror = e => console.error("Load history error:", e.target.error);
    }
    function updateHistoryUI() {
        const itemEl = document.getElementById('historyItem'), textElOriginal = document.getElementById('historyText'),
              audioEl = document.getElementById('historyAudio'), timeEl = document.getElementById('historyTimestamp'),
              charEl = document.getElementById('historyCharCount'), sizeEl = document.getElementById('historyAudioSize'),
              toggleTextBtnOriginal = document.getElementById('toggleFullText'), prevBtn = document.getElementById('prevHistory'),
              nextBtn = document.getElementById('nextHistory'), idxInput = document.getElementById('currentHistoryIndex'),
              countDisplay = document.getElementById('historyCount'), clearAllBtn = document.getElementById('clearAllHistory');

        if (!itemEl || !textElOriginal || !audioEl || !timeEl || !charEl || !sizeEl || !toggleTextBtnOriginal || !prevBtn || !nextBtn || !idxInput || !countDisplay || !clearAllBtn) {
             return;
        }
        
        const hasHistory = historyItems.length > 0;
        if (historyCard) historyCard.classList.toggle('hidden', !hasHistory);
        if (noHistoryMessage) noHistoryMessage.classList.toggle('hidden', hasHistory);
        countDisplay.textContent = `(${historyItems.length})`;
        clearAllBtn.classList.toggle('hidden', !hasHistory);

        if (hasHistory && currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
            itemEl.classList.remove('hidden');
            const item = historyItems[currentHistoryIndex];
            
            const formattedDate = formatDate(item.timestamp);
            const timeAgo = formatTimeAgo(item.timestamp);
            timeEl.innerHTML = `<i class="fas fa-calendar-clock mr-1"></i>${formattedDate} <span class="text-gray-500 text-sm ml-1">(${timeAgo})</span>`;
            
            charEl.innerHTML = `<i class="fas fa-text-size mr-1"></i>${formatNumber(item.text.length)}`;
            
            let fullTextShown = false;
            const textEl = textElOriginal.cloneNode(false); 
            textElOriginal.parentNode.replaceChild(textEl, textElOriginal);
            textEl.id = 'historyText'; 

            const toggleTextBtn = toggleTextBtnOriginal.cloneNode(true); 
            toggleTextBtnOriginal.parentNode.replaceChild(toggleTextBtn, toggleTextBtnOriginal);
            toggleTextBtn.id = 'toggleFullText'; 

            const updateTextDisplayLogic = () => {
                const limited = item.text.length > 300 ? item.text.slice(0,297)+'...' : item.text;
                textEl.textContent = fullTextShown ? item.text : limited;
                textEl.dir = isRTL(textEl.textContent) ? 'rtl' : 'ltr';
                textEl.style.textAlign = isRTL(textEl.textContent) ? 'right' : 'left';
                toggleTextBtn.textContent = fullTextShown ? 'Show Less' : 'Show More';
            };
            updateTextDisplayLogic();
            toggleTextBtn.classList.toggle('hidden', item.text.length <= 300);
            toggleTextBtn.addEventListener('click', () => { fullTextShown = !fullTextShown; updateTextDisplayLogic(); });

            if (item.text.length > 300) {
                 textEl.style.cursor = 'pointer';
                 textEl.addEventListener('click', () => { fullTextShown = !fullTextShown; updateTextDisplayLogic(); });
            } else {
                 textEl.style.cursor = 'default';
            }

            if (item.audio instanceof Blob) audioEl.src = URL.createObjectURL(item.audio); else audioEl.src='';
            sizeEl.innerHTML = `<span class="desktop-info"><i class="fas fa-database mr-1"></i>${formatFileSize(item.audio.size)} <i class="fas fa-microphone-lines ml-2 mr-1"></i>${getModelNameForDisplay(item.modelId)} <i class="fas fa-user-headset ml-2 mr-1"></i>${formatString(item.voiceName)}</span><span class="mobile-info"><i class="fas fa-database mr-1"></i>${formatFileSize(item.audio.size)}<br><i class="fas fa-microphone-lines mr-1"></i>${getModelNameForDisplay(item.modelId)}<br><i class="fas fa-user-headset mr-1"></i>${formatString(item.voiceName)}</span>`;
            idxInput.value = currentHistoryIndex + 1;
            prevBtn.disabled = currentHistoryIndex <= 0;
            nextBtn.disabled = currentHistoryIndex >= historyItems.length - 1;
        } else {
            itemEl.classList.add('hidden');
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            idxInput.value = "";
        }
    }
    function deleteHistoryItem(id) {
        if (!db) return;
        const tx = db.transaction([storeName], "readwrite");
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = loadHistoryFromDB;
    }
    function setupHistoryFeatures() {
        document.getElementById('prevHistory')?.addEventListener('click', () => { if (currentHistoryIndex > 0) { currentHistoryIndex--; updateHistoryUI(); }});
        document.getElementById('nextHistory')?.addEventListener('click', () => { if (currentHistoryIndex < historyItems.length - 1) { currentHistoryIndex++; updateHistoryUI(); }});
        document.getElementById('currentHistoryIndex')?.addEventListener('change', function() {
            let newIdx = parseInt(this.value) - 1;
            if (!isNaN(newIdx) && newIdx >= 0 && newIdx < historyItems.length) currentHistoryIndex = newIdx;
            else this.value = (currentHistoryIndex >=0 && historyItems.length > 0) ? currentHistoryIndex + 1 : "";
            updateHistoryUI();
        });
        document.getElementById('copyTextButton')?.addEventListener('click', function() {
            if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
                const text = historyItems[currentHistoryIndex].text;
                navigator.clipboard.writeText(text).then(() => {
                    const origIcon = this.innerHTML; this.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => this.innerHTML = origIcon, 1000);
                }).catch(e => showCustomAlert("Copy failed.", "error"));
            }
        });
        document.getElementById('reuseTextButton')?.addEventListener('click', () => {
            if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
                if (inputText) inputText.value = historyItems[currentHistoryIndex].text;
                updateCharCount(); if (generatedAudioCard) generatedAudioCard.classList.add('hidden');
                const dashboardTab = document.querySelector('[data-tab="dashboard"]');
                if (dashboardTab) dashboardTab.click();
            }
        });
        document.getElementById('downloadHistoryAudio')?.addEventListener('click', () => {
            if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
                const item = historyItems[currentHistoryIndex];
                const fName = `ElevenLabs_${getModelNameForFile(item.modelId)}_${item.voiceName.replace(/[^a-zA-Z0-9]/g, '')}_${formatDate(item.timestamp, true).replace(/[\/:]/g, '').replace(' ', '_')}.mp3`;
                downloadAudio(item.audio, fName);
            }
        });
        document.getElementById('deleteHistoryButton')?.addEventListener('click', () => {
            if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
                showCustomConfirm("Delete this history item?", () => deleteHistoryItem(historyItems[currentHistoryIndex].id));
            }
        });
        document.getElementById('clearAllHistory')?.addEventListener('click', () => {
            showCustomConfirm("Delete all history items?", () => {
                if (!db) return; const tx = db.transaction([storeName], "readwrite");
                tx.objectStore(storeName).clear(); tx.oncomplete = loadHistoryFromDB;
            });
        });
    }

    async function getUserVoices() {
        if (!userVoiceList) return;
        const apiKey = apiKeys[currentApiKeyIndex];
        if (!apiKey) { userVoiceList.innerHTML = '<div class="p-4 text-red-500">No API key. Add one in Settings.</div>'; return; }
        userVoiceList.innerHTML = '<div class="p-4 text-gray-500">Loading voices...</div>';
        try {
            const response = await fetch("/get-voices", { headers: { "X-API-KEY": apiKey }});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const allVoices = await response.json();
            const libraryVoices = allVoices.filter(voice => voice.category !== 'premade');
            displayUserVoices(libraryVoices);
        } catch (error) {
            console.error("Error fetching user voices:", error);
            userVoiceList.innerHTML = `<div class="p-4 text-red-500">Failed to load voices: ${error.message}.</div>`;
        }
    }
    function displayUserVoices(voices) {
        if (!userVoiceList || !voicesTitle) return;
        voicesTitle.textContent = "Voices";
        userVoiceList.innerHTML = "";
        if (voices.length === 0) { userVoiceList.innerHTML = '<div class="p-4 text-gray-500">No voices found in your library. Add voices from the Library tab.</div>'; return; }
        
        voices.forEach(voice => {
            const item = document.createElement("div"); item.className = "p-4 border-b border-gray-200";
            const labels = voice.labels || {}, tagOrder = ["gender", "age", "accent", "descriptive", "use_case"],
                  tagStyles = {gender:"blue",age:"green",accent:"yellow",descriptive:"pink",use_case:"indigo"};
            let tagsHtml = tagOrder.map(tag => {
                if (labels[tag]) return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 mb-1 bg-${tagStyles[tag]}-100 text-${tagStyles[tag]}-800">${formatString(labels[tag])}</span>`;
                return '';
            }).join('');
            item.innerHTML = `<div class="flex items-center justify-between"><div class="flex-1">
                <div class="flex items-center justify-between"><p class="text-sm font-medium text-gray-900">${voice.name}</p>${voice.category ? `<span class="text-xs text-gray-500">${formatString(voice.category)}</span>` : ""}</div>
                ${voice.description ? `<p class="text-sm text-gray-600 mt-1">${voice.description}</p>` : ""}<div class="mt-2 flex flex-wrap gap-1">${tagsHtml}</div>
                ${voice.preview_url ? `<div class="mt-2 audio-controls flex items-center gap-2">
                    <audio controls class="flex-grow"><source src="${voice.preview_url}" type="audio/mpeg"></audio>
                    <button class="deleteVoiceBtn bg-red-600 text-white rounded hover:bg-red-700 p-2" data-voice-id="${voice.id}"><i class="fas fa-trash-alt"></i></button>
                </div>` : ""}</div></div>`;
            userVoiceList.appendChild(item);
        });
        attachDeleteListeners();
    }
    function attachDeleteListeners() {
        document.querySelectorAll("#userVoiceList .deleteVoiceBtn").forEach(btn => {
            const nBtn = btn.cloneNode(true); btn.replaceWith(nBtn); 
            nBtn.addEventListener("click", async function() {
                const voiceId = this.dataset.voiceId;
                showCustomConfirm("Delete this voice?", async () => {
                    try {
                        const response = await fetch(`/delete-voice?voice_id=${voiceId}`, { method: "DELETE", headers: { "X-API-KEY": apiKeys[currentApiKeyIndex] }});
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        getUserVoices(); 
                        fetchVoicesForDashboard(); 
                    } catch (error) { showCustomAlert(`Delete failed: ${error.message}`, "error"); }
                });
            });
        });
    }
    async function clearAllVoices() {
        if (!userVoiceList) return;
        const voiceBtns = userVoiceList.querySelectorAll(".deleteVoiceBtn");
        if (voiceBtns.length === 0) { showCustomAlert("No voices to clear.", "info"); return; }
        showCustomConfirm(`Delete all ${voiceBtns.length} voices?`, async () => {
            try {
                const results = await Promise.allSettled(Array.from(voiceBtns).map(btn =>
                    fetch(`/delete-voice?voice_id=${btn.dataset.voiceId}`, { method: "DELETE", headers: { "X-API-KEY": apiKeys[currentApiKeyIndex] }})
                ));
                let allSuccess = true;
                results.forEach(result => {
                    if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok)) {
                        allSuccess = false;
                        console.error("Failed to delete a voice:", result.reason || result.value.statusText);
                    }
                });
                getUserVoices(); fetchVoicesForDashboard();
                if (allSuccess) showCustomAlert("All voices deleted.", "info");
                else showCustomAlert("Some voices could not be deleted. Check console.", "error");
            } catch (error) { showCustomAlert(`Clear failed: ${error.message}`, "error"); }
        });
    }
    function setupMyVoicesFeatures() {
        document.getElementById("clearAllVoices")?.addEventListener("click", clearAllVoices);
    }

    function updateToggleState(selectedGender) {
        const opts = document.querySelectorAll("#library .toggle-option"), slider = document.querySelector("#library .toggle-slider");
        if (!slider || opts.length === 0) return;
        opts.forEach(opt => {
            const optGender = opt.dataset.gender || "";
            opt.classList.toggle("active", optGender === selectedGender);
        });
        const genderOrder = ["", "male", "female"];
        const idx = genderOrder.indexOf(selectedGender);
        if (idx !== -1) {
           slider.style.transform = `translateX(${idx * 100}%)`;
        }
    }
    function setupGenderToggle() {
        const toggleOpts = document.querySelectorAll("#library .toggle-option");
        toggleOpts.forEach(opt => {
            opt.addEventListener("click", function() {
                libraryCurrentGender = this.dataset.gender || "";
                localStorage.setItem("libraryCurrentGender", libraryCurrentGender);
                updateToggleState(libraryCurrentGender);
            });
        });
    }
    async function searchVoicesInLibrary(clearExisting = true) {
        const apiKey = apiKeys[currentApiKeyIndex];
        if (!apiKey) { showCustomAlert("API key required.", "error"); if(searchResultsDiv) searchResultsDiv.classList.add("hidden"); return; }
        if (clearExisting) { libraryCurrentPage = 0; libraryTotalLoadedItems = 0; }
        
        const searchBtn = document.getElementById('searchVoicesBtn');
        if (searchBtn) { searchBtn.disabled = true; searchBtn.innerHTML = '<i class="fas fa-spinner-third fa-spin mr-2"></i>Searching...'; }
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');

        try {
            let url = `/search-voices?gender=${libraryCurrentGender}&page=${libraryCurrentPage}&sort=${libraryCurrentSort}`;
            if (libraryCurrentLanguage.code && libraryCurrentLanguage.code.toLowerCase() !== 'any') url += `&language=${libraryCurrentLanguage.code}`;
            if (libraryCurrentSearch) url += `&search=${encodeURIComponent(libraryCurrentSearch.trim())}`;
            const response = await fetch(url, { headers: { "X-API-KEY": apiKey }});
            let errorData = null;
            if (!response.ok) { 
                try { errorData = await response.json(); } catch(e) { /* ignore json parse error */ }
                throw new Error(errorData?.error || `HTTP ${response.status}`); 
            }
            const voicesData = await response.json();
            const voices = Array.isArray(voicesData) ? voicesData.filter(v => v.free_users_allowed !== false) : [];
            if (!Array.isArray(voicesData)) console.warn("API did not return an array for voices:", voicesData);
            
            displaySearchResultsInLibrary(voices, clearExisting);
        } catch (error) {
            console.error("Error searching library voices:", error);
            showCustomAlert(`Search failed: ${error.message}`, "error");
            if (libraryVoiceList && clearExisting) libraryVoiceList.innerHTML = '<div class="p-4 text-red-500">Search error.</div>';
        } finally {
            if (searchBtn) { searchBtn.disabled = false; searchBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Search'; }
        }
    }
    function displaySearchResultsInLibrary(voices, clearExisting = true) {
        if (!libraryVoiceList || !searchResultsDiv || !loadMoreBtn) return;
        if (clearExisting) { libraryVoiceList.innerHTML = ""; libraryTotalLoadedItems = 0; }
        
        searchResultsDiv.classList.remove("hidden");

        if (voices.length === 0 && clearExisting) {
            libraryVoiceList.innerHTML = '<div class="p-4 text-gray-500 text-center">No voices found matching your criteria.</div>';
            loadMoreBtn.classList.add("hidden");
            return;
        }
        if (voices.length === 0 && !clearExisting) {
            loadMoreBtn.classList.add("hidden");
            showCustomAlert("No more voices to load.", "info", 2000);
            return;
        }

        voices.forEach((voice, idx) => {
            const item = document.createElement("div"); item.className = "p-4";
            if (idx < voices.length -1 || libraryTotalLoadedItems + voices.length > voices.length) item.classList.add("border-b", "border-gray-200");

            const itemNum = libraryTotalLoadedItems + idx + 1;
            const labels = voice.labels || {}, tagOrder = ["gender", "age", "accent", "descriptive", "use_case"],
                  tagStyles = {gender:"blue",age:"green",accent:"yellow",descriptive:"pink",use_case:"indigo"};
            let tagsHtml = tagOrder.map(tag => {
                if (labels[tag]) return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 mb-1 bg-${tagStyles[tag]}-100 text-${tagStyles[tag]}-800">${formatString(labels[tag])}</span>`;
                return '';
            }).join('');
            item.innerHTML = `<div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-sm font-medium text-gray-900 truncate"><span class="text-gray-500 mr-2">${itemNum}.</span>${voice.name}</p>
                        ${voice.category ? `<span class="text-xs text-gray-500 ml-2 flex-shrink-0">${formatString(voice.category)}</span>` : ""}
                    </div>
                    ${voice.description ? `<p class="text-sm text-gray-600 mt-1 mb-2">${voice.description}</p>` : ""}
                    <div class="mt-2 flex flex-wrap">${tagsHtml}</div>
                    <div class="mt-2 flex flex-wrap items-center text-xs sm:text-sm text-gray-500 gap-x-3 gap-y-1">
                        <span class="flex items-center whitespace-nowrap"><i class="fas fa-calendar-clock mr-1"></i>${formatDate(voice.date_unix * 1000)}</span>
                        <span class="flex items-center whitespace-nowrap"><i class="fas fa-clock mr-1"></i>${formatTimeAgo(voice.date_unix * 1000)}</span>
                        <span class="flex items-center whitespace-nowrap"><i class="fas fa-users mr-1"></i>${formatNumber(voice.cloned_by_count)}</span>
                    </div>
                    ${voice.preview_url ? `<div class="mt-2 audio-controls">
                        <audio controls><source src="${voice.preview_url}" type="audio/mpeg"></audio>
                        <button class="addVoiceBtn" data-voice-id="${voice.voice_id}" data-public-user-id="${voice.public_owner_id}" data-voice-name="${voice.name}"><i class="fas fa-plus"></i></button>
                    </div>` : ""}
                </div></div>`;
            libraryVoiceList.appendChild(item);
        });
        libraryTotalLoadedItems += voices.length;
        loadMoreBtn.classList.toggle("hidden", voices.length === 0);
        attachAddVoiceListeners();
    }
    function attachAddVoiceListeners() {
        document.querySelectorAll("#voiceList .addVoiceBtn").forEach(btn => {
            const nBtn = btn.cloneNode(true); btn.replaceWith(nBtn); 
            nBtn.addEventListener("click", function() {
                const id = this.dataset.voiceId, pubId = this.dataset.publicUserId, name = this.dataset.voiceName;
                showVoiceNamePopup(name, newName => { if (newName) addVoiceToUserLibrary(pubId, id, newName); });
            });
        });
    }
    async function addVoiceToUserLibrary(publicUserId, voiceId, newName) {
        const apiKey = apiKeys[currentApiKeyIndex];
        if (!apiKey) { showCustomAlert("API Key required.", "error"); return; }
        try {
            const response = await fetch("/add-voice", { method: "POST", headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({ public_user_id: publicUserId, voice_id: voiceId, new_name: newName }) });
            if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Failed to add voice"); }
            const result = await response.json();
            if (result.success) {
                showCustomAlert("Voice added to 'My Voices'.", "success");
                getUserVoices(); 
                fetchVoicesForDashboard(); 
            } else throw new Error(result.error || "Failed to add voice");
        } catch (error) { showCustomAlert(`Add voice error: ${error.message}`, "error"); }
    }
    function setupLibraryFeatures() {
        setupGenderToggle();
        updateToggleState(libraryCurrentGender);

        const searchInput = document.getElementById("searchInput");
        const clearSearchBtn = document.getElementById("clearSearchBtn");
        if (searchInput && clearSearchBtn) {
            searchInput.addEventListener("input", function() { libraryCurrentSearch = this.value; clearSearchBtn.style.display = this.value ? "block" : "none"; });
            clearSearchBtn.addEventListener("click", () => { searchInput.value = ""; libraryCurrentSearch = ""; clearSearchBtn.style.display = "none"; });
            searchInput.addEventListener("keypress", e => { if (e.key === "Enter") document.getElementById("searchVoicesBtn")?.click(); });
        }
        document.getElementById("searchVoicesBtn")?.addEventListener("click", () => searchVoicesInLibrary(true));
        if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => { libraryCurrentPage++; searchVoicesInLibrary(false); });

        const sortBtn = document.getElementById("sortButton"), sortPopup = document.getElementById("sortPopup"), sortOverlayEl = document.getElementById("sortOverlay"),
              selSort = document.getElementById("selectedSort"), selSortIcon = document.getElementById("selectedSortIcon");
        if (sortBtn && sortPopup && sortOverlayEl && selSort && selSortIcon) {
            const initSortOpt = sortPopup.querySelector(`.sort-option[data-value="${libraryCurrentSort}"]`);
            if (initSortOpt) { selSort.textContent = initSortOpt.textContent.trim(); selSortIcon.className = initSortOpt.querySelector('i').className; }
            
            const openSortPopup = () => { sortPopup.classList.add("show"); sortOverlayEl.classList.add("show"); };
            const closeSortPopup = () => { sortPopup.classList.remove("show"); sortOverlayEl.classList.remove("show"); };
            sortBtn.addEventListener("click", openSortPopup);
            sortOverlayEl.addEventListener("click", closeSortPopup);
            
            sortPopup.querySelectorAll(".sort-option").forEach(opt => {
                const nOpt = opt.cloneNode(true); opt.replaceWith(nOpt); 
                nOpt.addEventListener("click", () => {
                    const val = nOpt.dataset.value, iconCls = nOpt.querySelector('i').className;
                    selSort.textContent = nOpt.textContent.trim(); selSortIcon.className = iconCls;
                    libraryCurrentSort = val; localStorage.setItem("libraryCurrentSort", libraryCurrentSort);
                    closeSortPopup();
                });
            });
        }
        const langBtn = document.getElementById("languageButton"), langPopup = document.getElementById("languagePopup"), langOverlayEl = document.getElementById("languageOverlay"),
              selLang = document.getElementById("selectedLanguage"), selLangIcon = document.getElementById("selectedLanguageIcon");
        if (langBtn && langPopup && langOverlayEl && selLang && selLangIcon) {
            const initLangOpt = langPopup.querySelector(`.language-option[data-value="${libraryCurrentLanguage.code}"]`);
            if (initLangOpt) {
                selLang.textContent = initLangOpt.textContent.trim();
                const iconEl = initLangOpt.querySelector('.inline-flex .fi, .inline-flex .fas');
                if (iconEl) { selLangIcon.innerHTML = ''; selLangIcon.appendChild(iconEl.cloneNode(true));}
            }
            const openLangPopup = () => { langPopup.classList.add("show"); langOverlayEl.classList.add("show"); };
            const closeLangPopup = () => { langPopup.classList.remove("show"); langOverlayEl.classList.remove("show"); };
            langBtn.addEventListener("click", openLangPopup);
            langOverlayEl.addEventListener("click", closeLangPopup);
            
            langPopup.querySelectorAll(".language-option").forEach(opt => {
                const nOpt = opt.cloneNode(true); opt.replaceWith(nOpt); 
                nOpt.addEventListener("click", () => {
                    const val = nOpt.dataset.value; selLang.textContent = nOpt.textContent.trim();
                    const iconEl = nOpt.querySelector('.inline-flex .fi, .inline-flex .fas');
                    if (iconEl) { selLangIcon.innerHTML = ''; selLangIcon.appendChild(iconEl.cloneNode(true));} else { selLangIcon.innerHTML = '<i class="fas fa-globe text-gray-600"></i>';}
                    libraryCurrentLanguage = { code: val, label: nOpt.textContent.trim() }; localStorage.setItem("libraryCurrentLanguage", JSON.stringify(libraryCurrentLanguage));
                    closeLangPopup();
                });
            });
        }
    }

    function setupSettingsFeatures() {
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) apiKeyInput.addEventListener('input', function() {
            if (apiKeys.length <= 1) {
                const key = this.value.trim();
                if (key.startsWith('sk_') || key === "") {
                    apiKeys = key ? [key] : [];
                    localStorage.setItem('elevenLabsApiKeys', JSON.stringify(apiKeys));
                    currentApiKeyIndex = apiKeys.length > 0 ? 0 : -1;
                    localStorage.setItem('currentApiKeyIndex', String(currentApiKeyIndex));
                    updateUIBasedOnApiKey(); updateApiKeyDisplay(); updateApiKeyNavigation();
                    if (apiKeys.length > 0) { fetchVoicesForDashboard(); fetchUsageInfo(); } else { clearUsageInfo(); populateVoiceSelectForDashboard([]); }
                }
            }
        });
        document.getElementById('toggleApiKey')?.addEventListener('click', function() {
            const input = document.getElementById('apiKey'), icon = this.querySelector('i');
            if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye'; }
            else { input.type = 'password'; icon.className = 'fas fa-eye-slash'; }
        });
        document.getElementById('clearApiKey')?.addEventListener('click', () => {
            if (apiKeys.length === 0) { showCustomAlert("No API keys to clear.", "info"); return;}
            const msg = apiKeys.length > 1 ? "Clear all API Keys?" : "Clear the API Key?";
            showCustomConfirm(msg, () => {
                apiKeys = []; localStorage.removeItem('elevenLabsApiKeys'); currentApiKeyIndex = -1; localStorage.setItem('currentApiKeyIndex', '-1');
                updateUIBasedOnApiKey(); updateApiKeyDisplay(); updateApiKeyNavigation(); clearUsageInfo(); populateVoiceSelectForDashboard([]);
                const apiKeyField = document.getElementById('apiKey'); if(apiKeyField) apiKeyField.value = "";
            });
        });
        document.getElementById('importApiKey')?.addEventListener('click', () => {
            const input = document.createElement('input'); input.type = 'file'; input.accept = '.txt';
            input.onchange = e => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = re => {
                        const newKeys = (re.target.result.trim().split('\n') || []).map(k => k.trim()).filter(k => k.startsWith('sk_'));
                        if (newKeys.length > 0) {
                            apiKeys = [...new Set(newKeys)]; localStorage.setItem('elevenLabsApiKeys', JSON.stringify(apiKeys));
                            currentApiKeyIndex = 0; localStorage.setItem('currentApiKeyIndex', '0');
                            updateUIBasedOnApiKey(); updateApiKeyDisplay(); updateApiKeyNavigation();
                            fetchVoicesForDashboard(); fetchUsageInfo();
                            showCustomAlert(`${newKeys.length} API key(s) imported.`, "success");
                        } else {
                            showCustomAlert("No valid API keys found in the file.", "error");
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });

        ['usagePrevApiKey', 'myVoicesPrevApiKey'].forEach(id => document.getElementById(id)?.addEventListener('click', () => switchApiKey(currentApiKeyIndex - 1)));
        ['usageNextApiKey', 'myVoicesNextApiKey'].forEach(id => document.getElementById(id)?.addEventListener('click', () => switchApiKey(currentApiKeyIndex + 1)));
        ['usageCurrentApiKeyIndex', 'myVoicesCurrentApiKeyIndex'].forEach(id => document.getElementById(id)?.addEventListener('change', function() { handleApiKeyChangeFromInput(id); }));
    }

    function initializeApp() {
        apiKeys = JSON.parse(localStorage.getItem('elevenLabsApiKeys') || '[]');
        currentApiKeyIndex = parseInt(localStorage.getItem('currentApiKeyIndex') || '0');
        if (isNaN(currentApiKeyIndex) || currentApiKeyIndex >= apiKeys.length || currentApiKeyIndex < (apiKeys.length > 0 ? 0 : -1) ) {
             currentApiKeyIndex = apiKeys.length > 0 ? 0 : -1;
        }
        localStorage.setItem('currentApiKeyIndex', String(currentApiKeyIndex));

        themeToggleLogo = document.getElementById('themeToggleLogo');
        if (themeToggleLogo) {
            themeToggleLogo.addEventListener('click', toggleTheme);
        }

        const savedTheme = localStorage.getItem('elevenlabs-theme');
        applyTheme(savedTheme || 'light');

        setupTabNavigation();
        setupGlobalAudioPlayManagement();
        setupDashboardAudioPlayerSync();
        initializeDB();

        updateApiKeyDisplay();
        updateApiKeyNavigation();

        setupDashboardFeatures();
        setupHistoryFeatures();
        setupMyVoicesFeatures();
        setupLibraryFeatures();
        setupSettingsFeatures();

        updateUIBasedOnApiKey();
        if (apiKeys.length > 0 && currentApiKeyIndex !== -1 && apiKeys[currentApiKeyIndex]) {
            fetchUsageInfo();
            fetchVoicesForDashboard();
        } else {
            clearUsageInfo();
            populateVoiceSelectForDashboard([]);
        }
        
        const initialTab = document.querySelector('.tab[data-tab="dashboard"]');
        if (initialTab) initialTab.click();
        else {
            const firstTab = document.querySelector('.tab');
            if(firstTab) firstTab.click();
        }
    }

    initializeApp();
});