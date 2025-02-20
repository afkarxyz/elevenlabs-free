document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(tab.dataset.tab).classList.remove('hidden');
        });
    });

    let historyItems = [];
    let currentHistoryIndex = -1;

    let db;
    const dbName = 'TtsHistoryDB';
    const dbVersion = 1;
    const storeName = 'history';

    let apiKeys = [];
    let currentApiKeyIndex = 0;

    function initializeApp() {
        apiKeys = JSON.parse(localStorage.getItem('elevenLabsApiKeys') || '[]');
        currentApiKeyIndex = parseInt(localStorage.getItem('currentApiKeyIndex') || '0');
        
        updateApiKeyDisplay();
        updateApiKeyNavigation();
        updateUIBasedOnApiKey();
    
        const savedModel = localStorage.getItem('elevenLabsSelectedModel');
        if (savedModel) {
            const modelOption = document.querySelector(`.model-option[data-value="${savedModel}"]`);
            if (modelOption) {
                const modelName = modelOption.querySelector('.model-name').textContent;
                document.getElementById('selectedModelName').textContent = modelName;
            }
        }
    
        const inputText = document.getElementById('inputText');
    
        inputText.addEventListener('input', updateCharCount);
        inputText.setAttribute('dir', 'auto');
    
        document.getElementById('pasteButton').addEventListener('click', function() {
            navigator.clipboard.readText().then(function(clipText) {
                inputText.value = clipText;
                updateCharCount();
            });
        });
    
        document.getElementById('clearButton').addEventListener('click', function() {
            inputText.value = '';
            updateCharCount();
        });
    }

    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = function(event) {
        console.error("IndexedDB error:", event.target.error);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadHistoryFromDB();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
    };

    function updateCharCount() {
        const inputText = document.getElementById('inputText');
        const charCount = document.getElementById('charCount');
        const inputLength = inputText.value.length;
        const [usedCredit, totalCredit] = document.getElementById('characterCount').textContent.split('/').map(s => parseInt(s.trim().replace(/,/g, '')));
        const remainingCredit = totalCredit - usedCredit;
        
        const selectedModel = localStorage.getItem('elevenLabsSelectedModel') || 'eleven_multilingual_v2';
        
        let adjustedRemainingCredit = remainingCredit;
        if (selectedModel !== 'eleven_multilingual_v2') {
            adjustedRemainingCredit = remainingCredit * 2;
        }
        
        const inputLengthSpan = document.createElement('span');
        inputLengthSpan.textContent = formatNumber(inputLength);
        
        if (inputLength > adjustedRemainingCredit) {
            inputLengthSpan.classList.add('text-red-400');
        }
        
        charCount.innerHTML = '';
        charCount.appendChild(inputLengthSpan);
        charCount.appendChild(document.createTextNode(` / ${formatNumber(adjustedRemainingCredit)}`));
    
        if (isRTL(inputText.value)) {
            inputText.style.direction = 'rtl';
            inputText.style.textAlign = 'right';
        } else {
            inputText.style.direction = 'ltr';
            inputText.style.textAlign = 'left';
        }
    }

    function fetchVoices() {
        const apiKey = apiKeys[currentApiKeyIndex] || localStorage.getItem('elevenLabsApiKey');
        if (!apiKey) {
            console.error('API key not found');
            return;
        }
    
        fetch('/get-voices', {
            headers: {
                'X-API-KEY': apiKey,
                'Referer': window.location.href
            }
        })
        .then(response => response.json())
        .then(data => {
            populateVoiceSelect(data);
        })
        .catch(error => {
            console.error('Error fetching voices:', error);
        });
    }

    function fetchUsageInfo() {
        const apiKey = apiKeys[currentApiKeyIndex] || localStorage.getItem('elevenLabsApiKey');
        if (!apiKey) {
            updateUsageInfo(0, 0, 0);
            return;
        }

        fetch('/get-usage-info', {
            headers: {
                'X-API-KEY': apiKey
            }
        })
        .then(response => response.json())
        .then(data => {
            updateUsageInfo(data.character_count, data.character_limit, data.next_character_count_reset_unix);
        })
        .catch(error => {
            console.error('Error fetching usage info:', error);
            updateUsageInfo(0, 0, 0);
        });
    }

    initializeApp();

    fetchVoices();
    fetchUsageInfo();

    function downloadAudio(audioBlob, filename = 'audio.mp3') {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    document.getElementById('toggleApiKey').addEventListener('click', function() {
        const apiKeyInput = document.getElementById('apiKey');
        const eyeIcon = this.querySelector('i');
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        } else {
            apiKeyInput.type = 'password';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        }
    });

    document.getElementById('clearApiKey').addEventListener('click', function() {
        if (apiKeys.length > 1) {
            showCustomConfirm("Are you sure you want to clear all API Keys?", function() {
                apiKeys = [];
                localStorage.removeItem('elevenLabsApiKeys');
                localStorage.removeItem('currentApiKeyIndex');
                currentApiKeyIndex = 0;
                updateUIBasedOnApiKey();
                updateApiKeyDisplay();
                updateApiKeyNavigation();
                clearUsageInfo();
            });
        } else if (apiKeys.length === 1) {
            showCustomConfirm("Are you sure you want to clear the API Key?", function() {
                apiKeys = [];
                localStorage.removeItem('elevenLabsApiKeys');
                localStorage.removeItem('currentApiKeyIndex');
                currentApiKeyIndex = 0;
                updateUIBasedOnApiKey();
                updateApiKeyDisplay();
                updateApiKeyNavigation();
                clearUsageInfo();
            });
        }
    });

    document.getElementById('importApiKey').addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result.trim();
                    const newKeys = content.split('\n')
                        .map(key => key.trim())
                        .filter(key => key.startsWith('sk_'));
                    
                    if (newKeys.length > 0) {
                        apiKeys = [];
                        localStorage.removeItem('elevenLabsApiKey');
                        
                        apiKeys = [...new Set(newKeys)];
                        localStorage.setItem('elevenLabsApiKeys', JSON.stringify(apiKeys));
                        
                        currentApiKeyIndex = 0;
                        localStorage.setItem('currentApiKeyIndex', currentApiKeyIndex);
                        
                        updateUIBasedOnApiKey();
                        updateApiKeyDisplay();
                        updateApiKeyNavigation();
                        fetchVoices();
                        fetchUsageInfo();
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    });

    function updateUIBasedOnApiKey() {
        const hasApiKey = apiKeys.length > 0;
        const usageCard = document.getElementById('usageCard');
        const inputText = document.getElementById('inputText');
        const modelSelectContainer = document.getElementById('modelSelectContainer');
        const voiceSelectContainer = document.getElementById('voiceSelectContainer');
        const generateButton = document.querySelector('#ttsForm button[type="submit"]');
        const clearButton = document.getElementById('clearButton');
        const pasteButton = document.getElementById('pasteButton');
        const characterCountWrapper = document.getElementById('characterCountWrapper');
        const manageApiButton = document.getElementById('manageApiButton');
    
        usageCard.classList.toggle('hidden', !hasApiKey);
        inputText.disabled = !hasApiKey;
        inputText.placeholder = hasApiKey ? 'Type or paste your text here...' : 'Please enter your API key first';
        modelSelectContainer.classList.toggle('hidden', !hasApiKey);
        voiceSelectContainer.classList.toggle('hidden', !hasApiKey);
        generateButton.disabled = !hasApiKey;
        clearButton.classList.toggle('hidden', !hasApiKey);
        pasteButton.classList.toggle('hidden', !hasApiKey);
        characterCountWrapper.classList.toggle('hidden', !hasApiKey);
        manageApiButton.classList.toggle('hidden', !hasApiKey);
    }

    function updateApiKeyDisplay() {
        const apiKeyInput = document.getElementById('apiKey');
        const apiKeyCount = document.getElementById('apiKeyCount');
        const apiKeyLabelText = document.getElementById('apiKeyLabelText');
        const toggleApiKey = document.getElementById('toggleApiKey');
        
        if (apiKeys.length === 0 || apiKeys.length === 1) {
            apiKeyInput.value = apiKeys.length === 1 ? apiKeys[0] : '';
            apiKeyInput.disabled = false;
            apiKeyInput.placeholder = 'Enter your ElevenLabs API key';
            apiKeyCount.textContent = '';
            apiKeyLabelText.style.display = 'block';
            apiKeyLabelText.textContent = 'ElevenLabs API Key:';
            toggleApiKey.style.display = 'block';
        } else {
            apiKeyInput.value = '';
            apiKeyInput.disabled = true;
            apiKeyInput.placeholder = `Currently using API key ${currentApiKeyIndex + 1} of ${apiKeys.length}`;
            apiKeyCount.textContent = `(${apiKeys.length} Keys)`;
            apiKeyLabelText.style.display = 'none';
            toggleApiKey.style.display = 'none';
        }
    }

    function updateApiKeyNavigation() {
        const apiKeyNavigation = document.getElementById('apiKeyNavigation');
        const currentApiKeyIndexInput = document.getElementById('currentApiKeyIndex');
        const totalApiKeys = document.getElementById('totalApiKeys');
        const prevApiKey = document.getElementById('prevApiKey');
        const nextApiKey = document.getElementById('nextApiKey');

        if (apiKeys.length > 1) {
            apiKeyNavigation.classList.remove('hidden');
            currentApiKeyIndexInput.value = currentApiKeyIndex + 1;
            totalApiKeys.textContent = apiKeys.length;
            prevApiKey.disabled = currentApiKeyIndex === 0;
            nextApiKey.disabled = currentApiKeyIndex === apiKeys.length - 1;
        } else {
            apiKeyNavigation.classList.add('hidden');
        }
    }

    document.getElementById('apiKey').addEventListener('input', function() {
        if (apiKeys.length <= 1) {
            const apiKey = this.value.trim();
            if (apiKey.startsWith('sk_')) {
                apiKeys[0] = apiKey;
                localStorage.setItem('elevenLabsApiKeys', JSON.stringify(apiKeys));
                
                updateUIBasedOnApiKey();
                updateApiKeyDisplay();
                updateApiKeyNavigation();
                fetchVoices();
                fetchUsageInfo();
            }
        }
    });

    function formatNumber(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function formatFileSize(bytes) {
        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
    }

    function updateUsageInfo(characterCount, characterLimit, nextReset) {
        const usageBar = document.getElementById('usageBar');
        const characterCountElement = document.getElementById('characterCount');
        const resetDateElement = document.getElementById('resetDate');

        const usagePercentage = (characterCount / characterLimit) * 100;
        usageBar.style.width = `${usagePercentage}%`;

        document.getElementById('usagePercentage').textContent = `(${usagePercentage.toFixed(0)}%)`;

        if (usagePercentage >= 90) {
            usageBar.classList.add('usage-danger');
            usageBar.classList.remove('usage-warning');
        } else if (usagePercentage >= 80) {
            usageBar.classList.add('usage-warning');
            usageBar.classList.remove('usage-danger');
        } else {
            usageBar.classList.remove('usage-danger', 'usage-warning');
        }

        const formattedCharCount = formatNumber(characterCount);
        const formattedCharLimit = formatNumber(characterLimit);
        characterCountElement.textContent = `${formattedCharCount} / ${formattedCharLimit}`;

        const resetDate = formatDate(nextReset * 1000);
        resetDateElement.textContent = `${resetDate}`;

        updateCharCount();
    }

    function clearUsageInfo() {
        const usageBar = document.getElementById('usageBar');
        if (usageBar) {
            usageBar.style.width = '0%';
            usageBar.classList.remove('usage-danger', 'usage-warning');
        }
    
        const characterCountElement = document.getElementById('characterCount');
        if (characterCountElement) {
            characterCountElement.textContent = '0 / 0';
        }
    
        const resetDateElement = document.getElementById('resetDate');
        if (resetDateElement) {
            resetDateElement.textContent = '-';
        }
    
        const usagePercentage = document.getElementById('usagePercentage');
        if (usagePercentage) {
            usagePercentage.textContent = '(0%)';
        }
    
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect) {
            voiceSelect.innerHTML = '';
        }
    
        updateCharCount();
    }

    document.getElementById('apiKeyForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const apiKey = document.getElementById('apiKey').value.trim();
        if (apiKey) {
            apiKeys = [apiKey];
            localStorage.setItem('elevenLabsApiKeys', JSON.stringify(apiKeys));
            localStorage.removeItem('elevenLabsApiKey');
            
            currentApiKeyIndex = 0;
            localStorage.setItem('currentApiKeyIndex', currentApiKeyIndex);
            
            updateUIBasedOnApiKey();
            updateApiKeyDisplay();
            updateApiKeyNavigation();
            fetchVoices();
            fetchUsageInfo();
            
            document.getElementById('apiKey').value = '';
            showCustomAlert('API Key saved successfully!', 'success');
        }
    });

    document.getElementById('ttsForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const apiKey = apiKeys[currentApiKeyIndex] || localStorage.getItem('elevenLabsApiKey');
        if (!apiKey) {
            showCustomAlert('Please configure your API key first!', 'error');
            return;
        }
    
        const text = document.getElementById('inputText').value;
        const modelId = localStorage.getItem('elevenLabsSelectedModel') || 'eleven_multilingual_v2';
        const voiceId = localStorage.getItem('elevenLabsSelectedVoice');
        const voiceName = document.getElementById('selectedVoiceName').textContent;
        
        if (!voiceId) {
            showCustomAlert('Please select a voice first!', 'error');
            return;
        }
    
        const submitButton = this.querySelector('button[type="submit"]');
        const normalState = submitButton.querySelector('.normal-state');
        const loadingState = submitButton.querySelector('.loading-state');
        const audioContainer = document.getElementById('audioContainer');
        const audioPlayer = document.getElementById('audioPlayer');
        const downloadButton = document.getElementById('downloadButton');
        
        submitButton.disabled = true;
        normalState.classList.add('hidden');
        loadingState.classList.remove('hidden');
        audioContainer.classList.add('hidden');
        downloadButton.classList.add('hidden');
    
        try {
            const response = await fetch(`/generate-audio?text=${encodeURIComponent(text)}&model_id=${encodeURIComponent(modelId)}&voice_id=${encodeURIComponent(voiceId)}`, {
                headers: {
                    'X-API-KEY': apiKey
                }
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const audioBlob = await response.blob();
            
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            
            audioContainer.classList.remove('hidden');
            downloadButton.classList.remove('hidden');
    
            saveToHistory(text, audioBlob, modelId, voiceName);
    
        } catch (error) {
            console.error('Error:', error);
            showCustomAlert('Error generating audio. Please check your API key and try again.', 'error');
        } finally {
            submitButton.disabled = false;
            normalState.classList.remove('hidden');
            loadingState.classList.add('hidden');
            fetchUsageInfo(); 
            updateCharCount(); 
        }
    });

    document.getElementById('audioPlayer').addEventListener('error', function(e) {
        console.error('Audio playback error:',e);
        showCustomAlert('Error playing audio. Please try again.', 'error');
    });

    document.getElementById('downloadButton').addEventListener('click', function() {
        const audioPlayer = document.getElementById('audioPlayer');
        if (!audioPlayer.src) {
            showCustomAlert('No audio available to download', 'error');
            return;
        }
        fetch(audioPlayer.src)
            .then(response => response.blob())
            .then(blob => {
                const modelId = document.getElementById('modelSelect').value;
                const voiceSelect = document.getElementById('voiceSelect');
                const voiceName = voiceSelect.options[voiceSelect.selectedIndex].text.split(' (')[0];
                const date = new Date();
                const formattedDate = formatDate(date, true).replace(/[/:]/g, '').replace(' ', '_');
                const fileName = `ElevenLabsFree_${getModelName(modelId)}_${voiceName}_${formattedDate}.mp3`;
                downloadAudio(blob, fileName);
            });
    });

    function formatDate(date, includeTime = true) {
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };
        if (includeTime) {
            Object.assign(options, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        return new Date(date).toLocaleString('en-GB', options).replace(/\//g, '/').replace(',', '');
    }

    function updateHistoryUI() {
        const historyCard = document.getElementById('historyCard');
        const noHistoryMessage = document.getElementById('noHistoryMessage');
        const historyItem = document.getElementById('historyItem');
        const historyText = document.getElementById('historyText');
        const historyAudio = document.getElementById('historyAudio');
        const historyTimestamp = document.getElementById('historyTimestamp');
        const historyCharCount = document.getElementById('historyCharCount');
        const historyAudioSize = document.getElementById('historyAudioSize');
        const toggleFullText = document.getElementById('toggleFullText');
        const prevButton = document.getElementById('prevHistory');
        const nextButton = document.getElementById('nextHistory');
        const currentHistoryIndexInput = document.getElementById('currentHistoryIndex');
    
        if (historyItems.length === 0) {
            historyCard.classList.add('hidden');
            noHistoryMessage.classList.remove('hidden');
            prevButton.classList.add('opacity-50');
            nextButton.classList.add('opacity-50');
            updateHistoryCount();
            return;
        }
    
        historyCard.classList.remove('hidden');
        noHistoryMessage.classList.add('hidden');
    
        if (currentHistoryIndex >= 0) {
            historyItem.classList.remove('hidden');
            const item = historyItems[currentHistoryIndex];
            
            historyTimestamp.innerHTML = `<i class="fas fa-calendar-clock mr-1"></i>${formatDate(item.timestamp)}`;
            
            historyCharCount.innerHTML = `<i class="fas fa-font mr-1"></i>${formatNumber(item.text.length)}`;
            
            const fullText = item.text;
            const limitedText = fullText.length > 300 ? fullText.slice(0, 297) + '...' : fullText;
            
            let isFullTextShown = false;
            
            function updateTextDisplay() {
                if (isFullTextShown) {
                    historyText.textContent = fullText;
                    toggleFullText.textContent = 'Show Less';
                    if (isRTL(fullText)) {
                        historyText.style.direction = 'rtl';
                        historyText.style.textAlign = 'right';
                    } else {
                        historyText.style.direction = 'ltr';
                        historyText.style.textAlign = 'left';
                    }
                } else {
                    historyText.textContent = limitedText;
                    toggleFullText.textContent = 'Show More';
                    if (isRTL(limitedText)) {
                        historyText.style.direction = 'rtl';
                        historyText.style.textAlign = 'right';
                    } else {
                        historyText.style.direction = 'ltr';
                        historyText.style.textAlign = 'left';
                    }
                }
            }
            
            updateTextDisplay();
            
            if (fullText.length > 300) {
                toggleFullText.classList.remove('hidden');
                
                toggleFullText.onclick = function() {
                    isFullTextShown = !isFullTextShown;
                    updateTextDisplay();
                };
                
                historyText.style.cursor = 'pointer';
                historyText.onclick = function() {
                    isFullTextShown = !isFullTextShown;
                    updateTextDisplay();
                };
            } else {
                toggleFullText.classList.add('hidden');
            }
            
            historyAudio.src = URL.createObjectURL(item.audio);
            
            historyAudioSize.innerHTML = `
                <span class="desktop-info">
                    <i class="fas fa-database mr-1"></i>${formatFileSize(item.audio.size)}
                    <i class="fas fa-microphone-lines ml-2 mr-1"></i>${getModelName(item.modelId)}
                    <i class="fas fa-user-headset ml-2 mr-1"></i>${item.voiceName}
                </span>
                <span class="mobile-info">
                    <i class="fas fa-database mr-1"></i>${formatFileSize(item.audio.size)}<br>
                    <i class="fas fa-microphone-lines mr-1"></i>${getModelName(item.modelId)}<br>
                    <i class="fas fa-user-headset mr-1"></i>${item.voiceName}
                </span>`;
    
            currentHistoryIndexInput.value = currentHistoryIndex + 1;
            prevButton.classList.toggle('opacity-50', currentHistoryIndex <= 0);
            nextButton.classList.toggle('opacity-50', currentHistoryIndex >= historyItems.length - 1);
        } else {
            historyItem.classList.add('hidden');
            prevButton.classList.add('opacity-50');
            nextButton.classList.add('opacity-50');
        }
    
        updateHistoryCount();
        updateClearAllButtonVisibility();
    }

    function saveToHistory(text, audioBlob, modelId, voiceName) {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        
        const request = objectStore.add({
            text: text,
            audio: audioBlob,
            modelId: modelId,
            voiceName: voiceName,
            timestamp: new Date().getTime()
        });
    
        request.onsuccess = function(event) {
            loadHistoryFromDB();
        };
    
        request.onerror = function(event) {
            console.error("Error adding history item to the database:", event.target.error);
        };
    }

    function loadHistoryFromDB() {
        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const index = objectStore.index("timestamp");
        const request = index.openCursor(null, "prev");

        historyItems = [];

        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                historyItems.push(cursor.value);
                cursor.continue();
            } else {
                currentHistoryIndex = historyItems.length > 0 ? 0 : -1;
                updateHistoryCount();
                updateHistoryUI();
                updateClearAllButtonVisibility();
            }
        };

        request.onerror = function(event) {
            console.error("Error loading history from the database:", event.target.error);
        };
    }

    document.getElementById('prevHistory').addEventListener('click', function() {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            updateHistoryUI();
        }
    });

    document.getElementById('nextHistory').addEventListener('click', function() {
        if (currentHistoryIndex < historyItems.length - 1) {
            currentHistoryIndex++;
            updateHistoryUI();
        }
    });

    document.getElementById('copyTextButton').addEventListener('click', function() {
        const copyButton = document.getElementById('copyTextButton');
        const originalIcon = copyButton.innerHTML;
        
        if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
            const text = historyItems[currentHistoryIndex].text;
            navigator.clipboard.writeText(text).then(function() {
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyButton.innerHTML = originalIcon;
                }, 1000);
            });
        }
    });

    document.getElementById('downloadHistoryAudio').addEventListener('click', function() {
        if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
            const item = historyItems[currentHistoryIndex];
            const date = new Date(item.timestamp);
            const formattedDate = formatDate(item.timestamp, true).replace(/[/:]/g, '').replace(' ', '_');
            const fileName = `ElevenLabsFree_${getModelName(item.modelId)}_${item.voiceName}_${formattedDate}.mp3`;
            downloadAudio(item.audio, fileName);
        }
    });

    document.getElementById('reuseTextButton').addEventListener('click', function() {
        if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
            const text = historyItems[currentHistoryIndex].text;
            document.getElementById('inputText').value = text;
            updateCharCount();
            document.querySelector('[data-tab="dashboard"]').click();
        }
    });

    document.getElementById('currentHistoryIndex').addEventListener('change', function() {
        let newIndex = parseInt(this.value) - 1;
        if (!isNaN(newIndex) && newIndex >= 0 && newIndex < historyItems.length) {
            currentHistoryIndex = newIndex;
            updateHistoryUI();
        } else {
            this.value = currentHistoryIndex + 1;
        }
    });

    function updateHistoryCount() {
        const historyCount = document.getElementById('historyCount');
        historyCount.textContent = `(${historyItems.length})`;
    }

    function deleteHistoryItem(id) {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(id);

        request.onsuccess = function(event) {
            loadHistoryFromDB();
        };

        request.onerror = function(event) {
            console.error("Error deleting history item from the database:", event.target.error);
        };
    }

    document.getElementById('deleteHistoryButton').addEventListener('click', function() {
        if (currentHistoryIndex >= 0 && currentHistoryIndex < historyItems.length) {
            showCustomConfirm("Are you sure you want to delete this history item?", function() {
                deleteHistoryItem(historyItems[currentHistoryIndex].id);
            });
        }
    });

    const clearAllHistoryButton = document.getElementById('clearAllHistory');
    clearAllHistoryButton.addEventListener('click', function() {
        showCustomConfirm("Are you sure you want to delete all history items?", function() {
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.clear();
    
            request.onsuccess = function(event) {
                loadHistoryFromDB();
            };
    
            request.onerror = function(event) {
                console.error("Error deleting all history items from the database:", event.target.error);
                showCustomAlert('Error deleting history items. Please try again.', 'error');
            };
        });
    });

    function updateClearAllButtonVisibility() {
        const clearAllHistoryButton = document.getElementById('clearAllHistory');
        clearAllHistoryButton.classList.toggle('hidden', historyItems.length <= 0);
    }

    function getModelName(modelId) {
        const models = {
            'eleven_multilingual_v2': 'Eleven Multilingual v2',
            'eleven_turbo_v2_5': 'Eleven Turbo v2.5',
            'eleven_flash_v2_5': 'Eleven Flash v2.5',
            'eleven_turbo_v2': 'Eleven Turbo v2',
            'eleven_flash_v2': 'Eleven Flash v2'
        };
        return models[modelId] || modelId;
    }

    function handleModelSelect(modelId) {
        localStorage.setItem('elevenLabsSelectedModel', modelId);
    }

    function formatString(str) {
        if (str.includes(' - ')) {
            const parts = str.split(' - ');
            return parts.map(part => {
                const words = part.split(/[\s_-]+/);
                return words.map(word => {
                    if (word.length === 1) return word.toUpperCase();
                    if (word.toUpperCase() === word && word.length <= 3) return word;
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join(' ');
            }).join(' - ');
        }
        
        const words = str.split(/[\s_-]+/);
        return words.map(word => {
            if (word.length === 1) return word.toUpperCase();
            if (word.toUpperCase() === word && word.length <= 3) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }
    
    function populateVoiceSelect(voices) {
        const defaultCategory = document.querySelector('#defaultCategory .voice-options');
        const libraryCategory = document.querySelector('#libraryCategory .voice-options');
        const libraryCategoryContainer = document.querySelector('#libraryCategory');
        
        if (!defaultCategory || !libraryCategory) {
            console.error('Voice category elements not found');
            return;
        }
        
        defaultCategory.innerHTML = '';
        libraryCategory.innerHTML = '';
        
        const savedVoice = localStorage.getItem('elevenLabsSelectedVoice');
        
        if (!Array.isArray(voices)) {
            console.error('Invalid voices data received');
            return;
        }
    
        const tagStyles = {
            gender: "bg-blue-100 text-blue-800",
            age: "bg-green-100 text-green-800",
            accent: "bg-yellow-100 text-yellow-800",
            description: "bg-pink-100 text-pink-800",
            usecase: "bg-indigo-100 text-indigo-800"
        };
        
        let hasLibraryVoices = false;
        
        voices.forEach(voice => {
            if (!voice || !voice.id) {
                console.warn('Invalid voice object encountered');
                return;
            }
    
            const option = document.createElement('div');
            option.className = 'voice-option';
            option.dataset.voiceId = voice.id;
            
            const voiceName = formatString(voice.name || 'Unnamed Voice');
            
            const labels = voice.labels || {};
            
            const tags = [
                { class: tagStyles.gender, value: formatString(labels.gender || 'Unspecified'), show: labels.gender && labels.gender !== 'Unspecified' },
                { class: tagStyles.age, value: formatString(labels.age || 'Unspecified'), show: labels.age && labels.age !== 'Unspecified' },
                { class: tagStyles.accent, value: formatString(labels.accent || 'Unspecified'), show: labels.accent && labels.accent !== 'Unspecified' },
                { class: tagStyles.description, value: formatString(labels.description || 'No description'), show: labels.description && labels.description !== 'No description' },
                { class: tagStyles.usecase, value: formatString(labels.use_case || 'General'), show: labels.use_case && labels.use_case !== 'General' }
            ];
            
            const tagsHtml = tags
                .filter(tag => tag.show)
                .map(tag => `<span class="voice-tag ${tag.class}">${tag.value}</span>`)
                .join('');
            
            option.innerHTML = `
                <div class="voice-name">${voiceName}</div>
                <div class="voice-tags">${tagsHtml}</div>
            `;
            
            if (voice.id === savedVoice) {
                const selectedVoiceNameElement = document.getElementById('selectedVoiceName');
                if (selectedVoiceNameElement) {
                    selectedVoiceNameElement.textContent = voiceName;
                }
            }
            
            if (voice.category === 'premade') {
                defaultCategory.appendChild(option);
            } else {
                libraryCategory.appendChild(option);
                hasLibraryVoices = true;
            }
        });
    
        if (libraryCategoryContainer) {
            libraryCategoryContainer.style.display = hasLibraryVoices ? 'block' : 'none';
        }
    
        setupVoiceSelection();
    }
    
    function setupVoiceSelection() {
        const voiceButton = document.getElementById('voiceSelectButton');
        const voicePopup = document.getElementById('voicePopup');
        const modelOverlay = document.getElementById('modelOverlay');
        const voiceSearch = document.getElementById('voiceSearch');
    
        if (!voiceButton || !voicePopup || !modelOverlay || !voiceSearch) {
            console.error('Required elements not found');
            return;
        }
    
        const newVoiceButton = voiceButton.cloneNode(true);
        voiceButton.parentNode.replaceChild(newVoiceButton, voiceButton);
    
        newVoiceButton.addEventListener('click', (e) => {
            e.stopPropagation();
            voicePopup.classList.toggle('show');
            modelOverlay.classList.toggle('show');
        });
    
        const handleDocumentClick = (e) => {
            if (!newVoiceButton.contains(e.target) && !voicePopup.contains(e.target)) {
                voicePopup.classList.remove('show');
                modelOverlay.classList.remove('show');
            }
        };
    
        document.addEventListener('click', handleDocumentClick);
    
        document.querySelectorAll('.voice-option').forEach(option => {
            option.addEventListener('click', () => {
                const voiceId = option.dataset.voiceId;
                const voiceNameElement = option.querySelector('.voice-name');
                const voiceName = voiceNameElement ? voiceNameElement.textContent : 'Selected Voice';
                
                const selectedVoiceNameElement = document.getElementById('selectedVoiceName');
                if (selectedVoiceNameElement) {
                    selectedVoiceNameElement.textContent = voiceName;
                }
                
                localStorage.setItem('elevenLabsSelectedVoice', voiceId);
                
                voicePopup.classList.remove('show');
                modelOverlay.classList.remove('show');
            });
        });
    
        voiceSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const defaultCategory = document.getElementById('defaultCategory');
            const libraryCategory = document.getElementById('libraryCategory');
    
            [defaultCategory, libraryCategory].forEach(category => {
                let hasVisibleVoices = false;
                category.querySelectorAll('.voice-option').forEach(option => {
                    const voiceNameElement = option.querySelector('.voice-name');
                    const voiceName = voiceNameElement ? voiceNameElement.textContent.toLowerCase() : '';
                    const tags = Array.from(option.querySelectorAll('.voice-tag'))
                        .map(tag => tag.textContent.toLowerCase())
                        .join(' ');
                    
                    const matches = voiceName.includes(searchTerm) || tags.includes(searchTerm);
                    option.style.display = matches ? 'block' : 'none';
                    if (matches) hasVisibleVoices = true;
                });
                category.style.display = hasVisibleVoices ? 'block' : 'none';
            });
        });
    }

    document.getElementById('prevApiKey').addEventListener('click', function() {
        if (currentApiKeyIndex > 0) {
            currentApiKeyIndex--;
            localStorage.setItem('currentApiKeyIndex', currentApiKeyIndex);
            updateApiKeyNavigation();
            updateApiKeyDisplay();
            fetchVoices();
            fetchUsageInfo();
        }
    });

    document.getElementById('nextApiKey').addEventListener('click', function() {
        if (currentApiKeyIndex < apiKeys.length - 1) {
            currentApiKeyIndex++;
            localStorage.setItem('currentApiKeyIndex', currentApiKeyIndex);
            updateApiKeyNavigation();
            updateApiKeyDisplay();
            fetchVoices();
            fetchUsageInfo();
        }
    });

    document.getElementById('currentApiKeyIndex').addEventListener('change', function() {
        let newIndex = parseInt(this.value) - 1;
        if (!isNaN(newIndex) && newIndex >= 0 && newIndex < apiKeys.length) {
            currentApiKeyIndex = newIndex;
            localStorage.setItem('currentApiKeyIndex', currentApiKeyIndex);
            
            updateApiKeyNavigation();
            updateApiKeyDisplay();
            fetchVoices();
            fetchUsageInfo();
        } else {
            this.value = currentApiKeyIndex + 1;
        }
    });

    function showCustomAlert(message, type = 'info') {
        const alertElement = document.getElementById('customAlert');
        const overlayElement = document.getElementById('customAlertOverlay');
        
        alertElement.innerHTML = `<div>${message}</div>`;
        alertElement.classList.remove('hidden', 'custom-alert-success', 'custom-alert-error', 'custom-alert-info');
        alertElement.classList.add(`custom-alert-${type}`, 'show');
        overlayElement.classList.add('show');
    
        setTimeout(() => {
            alertElement.classList.remove('show');
            overlayElement.classList.remove('show');
            setTimeout(() => {
                alertElement.classList.add('hidden');
            }, 200);
        }, 1000);
    }

    function showCustomConfirm(message, onConfirm, onCancel) {
        const alertElement = document.getElementById('customAlert');
        const overlayElement = document.getElementById('customAlertOverlay');
        
        alertElement.innerHTML = `
            <div class="custom-alert-message">${message}</div>
            <div class="custom-alert-buttons">
                <button class="custom-alert-button custom-alert-cancel">Cancel</button>
                <button class="custom-alert-button custom-alert-confirm">Confirm</button>
            </div>
        `;
        alertElement.classList.remove('hidden');
        alertElement.classList.add('show');
        overlayElement.classList.add('show');
    
        const confirmButton = alertElement.querySelector('.custom-alert-confirm');
        const cancelButton = alertElement.querySelector('.custom-alert-cancel');
    
        confirmButton.addEventListener('click', () => {
            alertElement.classList.remove('show');
            overlayElement.classList.remove('show');
            setTimeout(() => {
                alertElement.classList.add('hidden');
                if (onConfirm) onConfirm();
            }, 200);
        });
    
        cancelButton.addEventListener('click', () => {
            alertElement.classList.remove('show');
            overlayElement.classList.remove('show');
            setTimeout(() => {
                alertElement.classList.add('hidden');
                if (onCancel) onCancel();
            }, 200);
        });
    }

    const modelButton = document.getElementById('modelSelectButton');
    const modelPopup = document.getElementById('modelPopup');
    const modelOverlay = document.getElementById('modelOverlay');
    const selectedModelName = document.getElementById('selectedModelName');

    const savedModel = localStorage.getItem('elevenLabsSelectedModel') || 'eleven_multilingual_v2';
    const initialModelOption = document.querySelector(`.model-option[data-value="${savedModel}"]`);
    if (initialModelOption) {
        selectedModelName.textContent = initialModelOption.querySelector('.model-name').textContent;
    }

    modelButton.addEventListener('click', (e) => {
        e.stopPropagation();
        modelPopup.classList.toggle('show');
        modelOverlay.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!modelButton.contains(e.target) && !modelPopup.contains(e.target)) {
            modelPopup.classList.remove('show');
            modelOverlay.classList.remove('show');
        }
    });

    document.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', () => {
            const modelId = option.dataset.value;
            const modelName = option.querySelector('.model-name').textContent;
            
            selectedModelName.textContent = modelName;
            handleModelSelect(modelId);
            updateCharCount(); 
            modelPopup.classList.remove('show');
            modelOverlay.classList.remove('show');
        });
    });

    function isRTL(s) {
        const rtlChars = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFD\uFE70-\uFEFC]/;
        return rtlChars.test(s);
    }
});