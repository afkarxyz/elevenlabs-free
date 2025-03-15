document.addEventListener("DOMContentLoaded", () => {
  let apiKeys = []
  let currentApiKeyIndex = 0
  let currentGender = localStorage.getItem("currentGender") || "all"
  let currentLanguage = (() => {
    try {
      return JSON.parse(localStorage.getItem("currentLanguage")) || { code: "", label: "Any Language" }
    } catch (e) {
      console.error("Error parsing currentLanguage from localStorage:", e)
      return { code: "", label: "Any Language" }
    }
  })()
  let currentSort = localStorage.getItem("currentSort") || "trending"
  let currentPage = 0
  let totalLoadedItems = 0
  let currentSearch = ""
  let currentlyPlayingAudio = null

  function updateToggleState(selectedGender) {
    const toggleOptions = document.querySelectorAll(".toggle-option")
    const toggleSlider = document.querySelector(".toggle-slider")

    if (!toggleSlider || toggleOptions.length === 0) {
      return
    }

    toggleOptions.forEach((option) => {
      const optionGender = option.getAttribute("data-gender") || "all"
      if (optionGender === selectedGender) {
        option.classList.add("active")
        option.classList.remove("text-white")
        option.classList.add("text-black")
      } else {
        option.classList.remove("active")
        option.classList.remove("text-black")
        option.classList.add("text-white")
      }
    })

    const index = ["all", "male", "female"].indexOf(selectedGender)
    toggleSlider.style.transform = `translateX(${index * 100}%)`
  }

  function initializeApp() {
    apiKeys = JSON.parse(localStorage.getItem("elevenLabsApiKeys") || "[]")
    currentApiKeyIndex = Number.parseInt(localStorage.getItem("currentApiKeyIndex") || "0")

    updateApiKeyDisplay()
    updateApiKeyNavigation()

    const isApiPage = window.location.pathname.includes("/api")
    if (isApiPage) {
      const clearAllBtn = document.getElementById("clearAllVoices")
      if (clearAllBtn) {
        clearAllBtn.addEventListener("click", clearAllVoices)
      }

      getUserVoices()
      setupTabNavigation()
      setupGenderToggle()
      setupSearchInput()
      setupSearchButton()
      setupLoadMoreButton()
      setupSortButton()
      setupLanguageButton()
      setupAudioPlayManagement()

      const selectedSort = document.getElementById("selectedSort")
      if (selectedSort) {
        selectedSort.textContent = formatString(currentSort)
      }

      const selectedLanguage = document.getElementById("selectedLanguage")
      if (selectedLanguage) {
        selectedLanguage.textContent = currentLanguage.label
      }

      if (currentGender) {
        updateToggleState(currentGender)
      }
    }
  }

  function setupAudioPlayManagement() {
    document.addEventListener('play', function(e) {
      if (e.target.tagName.toLowerCase() === 'audio') {
        if (currentlyPlayingAudio && currentlyPlayingAudio !== e.target) {
          currentlyPlayingAudio.pause();
        }
        currentlyPlayingAudio = e.target;
      }
    }, true);
  }

  function updateApiKeyDisplay() {
    const apiKeyCount = document.getElementById("apiKeyCount")
    if (apiKeys.length > 1) {
      apiKeyCount.textContent = `(${apiKeys.length} Keys)`
    } else {
      apiKeyCount.textContent = ""
    }
  }

  function updateApiKeyNavigation() {
    const apiKeyNavigation = document.getElementById("apiKeyNavigation")
    const currentApiKeyIndexInput = document.getElementById("currentApiKeyIndex")
    const prevApiKey = document.getElementById("prevApiKey")
    const nextApiKey = document.getElementById("nextApiKey")

    if (apiKeys.length > 1) {
      apiKeyNavigation.classList.remove("hidden")
      currentApiKeyIndexInput.value = currentApiKeyIndex + 1
      prevApiKey.disabled = currentApiKeyIndex === 0
      nextApiKey.disabled = currentApiKeyIndex === apiKeys.length - 1
    } else {
      apiKeyNavigation.classList.add("hidden")
    }
  }

  function getUserVoices() {
    const userVoiceList = document.getElementById("userVoiceList")
    if (!userVoiceList) return

    try {
      const apiKey = apiKeys[currentApiKeyIndex]
      if (!apiKey) {
        userVoiceList.innerHTML =
          '<div class="p-4 text-red-500">No API key available. Please add an API key in the main page.</div>'
        return
      }

      fetch("/get-voices", {
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
          Referer: window.location.href,
        },
      })
        .then((response) => response.json())
        .then((voices) => {
          displayUserVoices(voices)
        })
        .catch((error) => {
          console.error("Error fetching voices:", error)
          userVoiceList.innerHTML = '<div class="p-4 text-red-500">Failed to load voices. Please try again later.</div>'
        })
    } catch (error) {
      console.error("Error in getUserVoices:", error)
      userVoiceList.innerHTML = '<div class="p-4 text-red-500">An error occurred. Please try again later.</div>'
    }
  }

  function setupTabNavigation() {
    const tabs = document.querySelectorAll(".tab")
    if (tabs.length === 0) return

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        switchToTab(tab.dataset.tab)
      })
    })
  }

  function setupGenderToggle() {
    const toggleOptions = document.querySelectorAll(".toggle-option")
    if (toggleOptions.length === 0) return

    toggleOptions.forEach((option) => {
      option.addEventListener("click", function () {
        const selectedGender = this.getAttribute("data-gender") || "all"
        currentGender = selectedGender
        currentPage = 0

        localStorage.setItem("currentGender", currentGender)

        updateToggleState(selectedGender)
      })
    })
  }

  function setupSearchButton() {
    const searchVoicesBtn = document.getElementById("searchVoicesBtn")

    if (!searchVoicesBtn) return

    searchVoicesBtn.addEventListener("click", async () => {
      currentPage = 0
      totalLoadedItems = 0
      try {
        const voices = await searchVoices(
          apiKeys[currentApiKeyIndex],
          currentGender,
          currentPage,
          currentSort,
          currentLanguage,
          currentSearch,
        )
        displaySearchResults(voices, true)
      } catch (error) {
        console.error("Error searching voices:", error)
        showCustomAlert("Failed to search voices. Error: " + error.message, "error")
      }
    })
  }

  function setupLoadMoreButton() {
    const loadMoreBtn = document.getElementById("loadMoreBtn")
    if (!loadMoreBtn) return

    loadMoreBtn.addEventListener("click", async () => {
      currentPage += 1
      try {
        const voices = await searchVoices(
          apiKeys[currentApiKeyIndex],
          currentGender,
          currentPage,
          currentSort,
          currentLanguage,
        )
        displaySearchResults(voices, false)
      } catch (error) {
        console.error("Error loading more voices:", error)
        showCustomAlert("Failed to load more voices. Error: " + error.message, "error")
      }
    })
  }

  function setupSortButton() {
    const sortButton = document.getElementById("sortButton")
    const sortPopup = document.getElementById("sortPopup")
    const sortOverlay = document.getElementById("sortOverlay")
    const selectedSort = document.getElementById("selectedSort")

    if (!sortButton || !sortPopup || !sortOverlay || !selectedSort) return

    sortButton.addEventListener("click", () => {
      sortPopup.classList.add("show")
      sortOverlay.classList.add("show")
    })

    sortOverlay.addEventListener("click", () => {
      sortPopup.classList.remove("show")
      sortOverlay.classList.remove("show")
    })

    const sortOptions = sortPopup.querySelectorAll(".sort-option")
    sortOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const value = option.getAttribute("data-value")
        selectedSort.textContent = option.textContent
        currentSort = value
        localStorage.setItem("currentSort", currentSort)
        sortPopup.classList.remove("show")
        sortOverlay.classList.remove("show")
        currentPage = 0
      })
    })
  }

  function setupLanguageButton() {
    const languageButton = document.getElementById("languageButton")
    const languagePopup = document.getElementById("languagePopup")
    const languageOverlay = document.getElementById("languageOverlay")
    const selectedLanguage = document.getElementById("selectedLanguage")

    if (!languageButton || !languagePopup || !languageOverlay || !selectedLanguage) return

    languageButton.addEventListener("click", () => {
      languagePopup.classList.add("show")
      languageOverlay.classList.add("show")
    })

    languageOverlay.addEventListener("click", () => {
      languagePopup.classList.remove("show")
      languageOverlay.classList.remove("show")
    })

    const languageOptions = languagePopup.querySelectorAll(".language-option")
    languageOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const value = option.getAttribute("data-value")
        selectedLanguage.textContent = option.textContent
        currentLanguage = { code: value, label: option.textContent }
        localStorage.setItem("currentLanguage", JSON.stringify(currentLanguage))
        languagePopup.classList.remove("show")
        languageOverlay.classList.remove("show")
        currentPage = 0
      })
    })
  }

  function formatString(str) {
    return str
      .split(/[\s_*]+/)
      .map((word) => {
        if (word.toLowerCase() === "ai" || word.toLowerCase() === "tts") {
          return word.toUpperCase()
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(" ")
  }

  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  function formatTimeAgo(timestamp) {
    const now = new Date()
    const date = new Date(timestamp * 1000)
    const diffInSeconds = Math.floor((now - date) / 1000)

    const years = Math.floor(diffInSeconds / (60 * 60 * 24 * 365))
    const months = Math.floor(diffInSeconds / (60 * 60 * 24 * 30))
    const days = Math.floor(diffInSeconds / (60 * 60 * 24))
    const hours = Math.floor(diffInSeconds / (60 * 60))
    const minutes = Math.floor(diffInSeconds / 60)

    if (years > 0) {
      const remainingMonths = Math.floor((diffInSeconds % (60 * 60 * 24 * 365)) / (60 * 60 * 24 * 30))
      return `${years}y ${remainingMonths}m ago`
    } else if (months > 0) {
      const remainingDays = Math.floor((diffInSeconds % (60 * 60 * 24 * 30)) / (60 * 60 * 24))
      return `${months}m ${remainingDays}d ago`
    } else if (days > 0) {
      const remainingHours = Math.floor((diffInSeconds % (60 * 60 * 24)) / (60 * 60))
      return `${days}d ${remainingHours}h ago`
    } else if (hours > 0) {
      const remainingMinutes = Math.floor((diffInSeconds % (60 * 60)) / 60)
      return `${hours}h ${remainingMinutes}m ago`
    } else {
      return `${minutes}m ago`
    }
  }

  function displaySearchResults(voices, clearExisting = true) {
    const searchResultsDiv = document.getElementById("searchResults")
    const voiceList = document.getElementById("voiceList")
    const loadMoreBtn = document.getElementById("loadMoreBtn")

    if (clearExisting) {
      voiceList.innerHTML = ""
      totalLoadedItems = 0
    }

    if (voices.length === 0 && clearExisting) {
      voiceList.innerHTML = '<div class="p-4 text-gray-500">No voices found.</div>'
      loadMoreBtn.classList.add("hidden")
      return
    }

    voices.forEach((voice, index) => {
      const listItem = document.createElement("div")
      listItem.className = "p-4 border-b border-gray-200"

      const itemNumber = totalLoadedItems + index + 1

      let tagsHtml = ""
      if (voice.labels) {
        const tagOrder = ["gender", "age", "accent", "descriptive", "use_case"]
        const tagStyles = {
          gender: "bg-blue-100 text-blue-800",
          age: "bg-green-100 text-green-800",
          accent: "bg-yellow-100 text-yellow-800",
          descriptive: "bg-pink-100 text-pink-800",
          use_case: "bg-indigo-100 text-indigo-800",
        }

        tagOrder.forEach((tag) => {
          if (voice.labels[tag]) {
            const value = voice.labels[tag]
            const formattedValue = formatString(value)
            tagsHtml += `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${tagStyles[tag]}">
                    ${formattedValue}
                </span>`
          }
        })
      }

      const date = new Date(voice.date_unix * 1000)
      const formattedDate = date
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(",", "")

      const timeAgo = formatTimeAgo(voice.date_unix)

      listItem.innerHTML = `
    <div class="flex items-center justify-between">
        <div class="flex-1">
            <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900">
                  <span class="text-gray-500 mr-2">${itemNumber}.</span>${voice.name}
                </p>
                ${voice.category ? `<span class="text-xs text-gray-500">${formatString(voice.category)}</span>` : ""}
            </div>
            ${voice.description ? `<p class="text-sm text-gray-600 mt-1">${voice.description}</p>` : ""}
            <div class="mt-2 flex flex-wrap gap-2">
                ${tagsHtml}
            </div>
            <div class="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                <span class="flex items-center">
                    <i class="fas fa-calendar-clock mr-1"></i>
                    ${formattedDate} 
                </span>
                <span class="flex items-center">
                    <i class="fas fa-clock mr-1"></i> 
                    ${timeAgo}
                </span>
                <span class="flex items-center">
                    <i class="fas fa-users mr-1"></i>
                    ${formatNumber(voice.cloned_by_count)}
                </span>
            </div>
            ${
              voice.preview_url
                ? `
                <div class="mt-2 audio-controls">
                    <audio controls>
                        <source src="${voice.preview_url}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                    <button class="addVoiceBtn bg-green-600 text-white rounded hover:bg-green-700" 
                        data-voice-id="${voice.voice_id}" 
                        data-public-user-id="${voice.public_owner_id}"
                        data-voice-name="${voice.name}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `
                : ""
            }
        </div>
    </div>
`
      voiceList.appendChild(listItem)
    })

    totalLoadedItems += voices.length
    searchResultsDiv.classList.remove("hidden")
    loadMoreBtn.classList.remove("hidden")
    attachAddVoiceListeners()
  }

  function displayUserVoices(voices) {
    const voiceList = document.getElementById("userVoiceList")
    const voicesTitle = document.getElementById("voicesTitle")

    if (!voiceList) return

    if (voicesTitle) {
      voicesTitle.textContent = voices.length > 1 ? "Your Voices" : "Your Voice"
    }

    voiceList.innerHTML = ""

    if (voices.length === 0) {
      voiceList.innerHTML = '<div class="p-4 text-gray-500">No voices found.</div>'
      return
    }

    voices.forEach((voice) => {
      const listItem = document.createElement("div")
      listItem.className = "p-4 border-b border-gray-200"

      let tagsHtml = ""
      if (voice.labels) {
        const tagOrder = ["gender", "age", "accent", "descriptive", "use_case"]
        const tagStyles = {
          gender: "bg-blue-100 text-blue-800",
          age: "bg-green-100 text-green-800",
          accent: "bg-yellow-100 text-yellow-800",
          descriptive: "bg-pink-100 text-pink-800",
          use_case: "bg-indigo-100 text-indigo-800",
        }

        tagOrder.forEach((tag) => {
          if (voice.labels[tag]) {
            const value = voice.labels[tag]
            const formattedValue = formatString(value)
            tagsHtml += `
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${tagStyles[tag]}">
                          ${formattedValue}
                      </span>`
          }
        })
      }

      listItem.innerHTML = `
          <div class="flex items-center justify-between">
              <div class="flex-1">
                  <div class="flex items-center justify-between">
                      <p class="text-sm font-medium text-gray-900">${voice.name}</p>
                      ${voice.category ? `<span class="text-xs text-gray-500">${formatString(voice.category)}</span>` : ""}
                  </div>
                  ${voice.description ? `<p class="text-sm text-gray-600 mt-1">${voice.description}</p>` : ""}
                  <div class="mt-2 flex flex-wrap gap-2">
                      ${tagsHtml}
                  </div>
                  ${
                    voice.preview_url
                      ? `
                          <div class="mt-2 audio-controls flex items-center gap-2">
                              <audio controls class="flex-grow">
                                  <source src="${voice.preview_url}" type="audio/mpeg">
                                  Your browser does not support the audio element.
                              </audio>
                              <button 
                                  class="deleteVoiceBtn bg-red-600 text-white rounded hover:bg-red-700 p-2" 
                                  data-voice-id="${voice.id}">
                                  <i class="fas fa-trash-alt"></i>
                              </button>
                          </div>
                      `
                      : ""
                  }
              </div>
          </div>
      `
      voiceList.appendChild(listItem)
    })

    attachDeleteListeners()
  }

  function setupSearchInput() {
    const searchInput = document.getElementById("searchInput")
    const clearSearchBtn = document.getElementById("clearSearchBtn")

    if (!searchInput || !clearSearchBtn) return

    searchInput.addEventListener("input", function () {
      currentSearch = this.value
      clearSearchBtn.style.display = this.value ? "block" : "none"
    })

    clearSearchBtn.addEventListener("click", function () {
      searchInput.value = ""
      currentSearch = ""
      this.style.display = "none"
    })

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        document.getElementById("searchVoicesBtn").click()
      }
    })
  }

  async function searchVoices(apiKey, gender = "all", page = 0, sort = "trending", language = "", search = "") {
    try {
      const genderParam = gender === "all" ? "" : gender
      let url = `/search-voices?gender=${genderParam}&page=${page}&sort=${sort}`

      if (language.code && language.code.toLowerCase() !== "any") {
        url += `&language=${language.code}`
      }

      if (search) {
        url += `&search=${encodeURIComponent(search.trim())}`
      }

      const response = await fetch(url, {
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const voices = await response.json()
      return voices.filter((voice) => voice.free_users_allowed !== false)
    } catch (error) {
      console.error("Error in searchVoices:", error)
      throw error
    }
  }

  function attachAddVoiceListeners() {
    document.querySelectorAll(".addVoiceBtn").forEach((button) => {
      button.addEventListener("click", function () {
        const voiceId = this.getAttribute("data-voice-id")
        const publicUserId = this.getAttribute("data-public-user-id")
        const defaultName = this.getAttribute("data-voice-name")

        showVoiceNamePopup(defaultName, (newName) => {
          if (newName) {
            addVoice(apiKeys[currentApiKeyIndex], publicUserId, voiceId, newName)
          }
        })
      })
    })
  }

  function attachDeleteListeners() {
    document.querySelectorAll(".deleteVoiceBtn").forEach((button) => {
      button.addEventListener("click", async function () {
        const voiceId = this.getAttribute("data-voice-id")
        showCustomConfirm("Are you sure you want to delete this voice?", async () => {
          try {
            const response = await fetch(`/delete-voice?voice_id=${voiceId}`, {
              method: "DELETE",
              headers: {
                "X-API-KEY": apiKeys[currentApiKeyIndex],
                "Content-Type": "application/json",
              },
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            getUserVoices()
          } catch (error) {
            console.error("Error deleting voice:", error)
            showCustomAlert("Failed to delete voice. Error: " + error.message, "error")
          }
        })
      })
    })
  }

  async function clearAllVoices() {
    const voiceList = document.getElementById("userVoiceList")
    const voices = voiceList.querySelectorAll(".deleteVoiceBtn")

    if (voices.length === 0) {
      showCustomAlert("No voices to clear", "info")
      return
    }

    showCustomConfirm(`Are you sure you want to delete all ${voices.length} voices?`, async () => {
      try {
        const deletePromises = Array.from(voices).map((voiceBtn) => {
          const voiceId = voiceBtn.getAttribute("data-voice-id")
          return fetch(`/delete-voice?voice_id=${voiceId}`, {
            method: "DELETE",
            headers: {
              "X-API-KEY": apiKeys[currentApiKeyIndex],
              "Content-Type": "application/json",
            },
          })
        })

        await Promise.all(deletePromises)
        getUserVoices()
        showCustomAlert("All voices have been deleted successfully", "info")
      } catch (error) {
        console.error("Error clearing voices:", error)
        showCustomAlert("Failed to clear all voices. Error: " + error.message, "error")
      }
    })
  }

  function switchToTab(tabId) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"))
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active")
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.add("hidden"))
    document.getElementById(tabId).classList.remove("hidden")
  }

  async function addVoice(apiKey, publicUserId, voiceId, newName) {
    try {
      const response = await fetch("/add-voice", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_user_id: publicUserId,
          voice_id: voiceId,
          new_name: newName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add voice")
      }

      const result = await response.json()
      if (result.success) {
        await getUserVoices()
        switchToTab("my-voices")
        const searchVoicesBtn = document.getElementById("searchVoicesBtn")
        if (searchVoicesBtn) {
          searchVoicesBtn.click()
        }
      } else {
        throw new Error(result.error || "Failed to add voice")
      }
    } catch (error) {
      console.error("Error adding voice:", error)
      showCustomAlert("Failed to add voice. Error: " + error.message, "error")
    }
  }

  document.getElementById("prevApiKey").addEventListener("click", () => {
    if (currentApiKeyIndex > 0) {
      currentApiKeyIndex--
      localStorage.setItem("currentApiKeyIndex", currentApiKeyIndex)
      updateApiKeyNavigation()
      getUserVoices()
    }
  })

  document.getElementById("nextApiKey").addEventListener("click", () => {
    if (currentApiKeyIndex < apiKeys.length - 1) {
      currentApiKeyIndex++
      localStorage.setItem("currentApiKeyIndex", currentApiKeyIndex)
      updateApiKeyNavigation()
      getUserVoices()
    }
  })

  document.getElementById("currentApiKeyIndex").addEventListener("change", function () {
    const newIndex = Number.parseInt(this.value) - 1
    if (!isNaN(newIndex) && newIndex >= 0 && newIndex < apiKeys.length) {
      currentApiKeyIndex = newIndex
      localStorage.setItem("currentApiKeyIndex", currentApiKeyIndex)
      updateApiKeyNavigation()
      getUserVoices()
    } else {
      this.value = currentApiKeyIndex + 1
    }
  })

  function showVoiceNamePopup(defaultName, onConfirm) {
    const popupElement = document.getElementById("voiceNamePopup")
    const overlayElement = document.getElementById("customAlertOverlay")
    const inputElement = document.getElementById("voiceNameInput")

    inputElement.value = defaultName

    popupElement.classList.remove("hidden")
    popupElement.classList.add("show", "voice-name-popup")
    overlayElement.classList.add("show")

    setTimeout(() => inputElement.focus(), 100)

    const confirmButton = popupElement.querySelector(".custom-alert-confirm")
    const cancelButton = popupElement.querySelector(".custom-alert-cancel")

    const newConfirmButton = confirmButton.cloneNode(true)
    const newCancelButton = cancelButton.cloneNode(true)
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton)
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton)

    newConfirmButton.addEventListener("click", () => {
      const newName = inputElement.value.trim()
      if (newName) {
        popupElement.classList.remove("show")
        overlayElement.classList.remove("show")
        setTimeout(() => {
          popupElement.classList.add("hidden")
          onConfirm(newName)
        }, 200)
      }
    })

    newCancelButton.addEventListener("click", () => {
      popupElement.classList.remove("show")
      overlayElement.classList.remove("show")
      setTimeout(() => {
        popupElement.classList.add("hidden")
      }, 200)
    })

    inputElement.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        newConfirmButton.click()
      }
    })
  }

  function showCustomAlert(message, type = "info") {
    const alertElement = document.getElementById("customAlert")
    const overlayElement = document.getElementById("customAlertOverlay")

    alertElement.innerHTML = `<div>${message}</div>`
    alertElement.classList.remove("hidden", "custom-alert-success", "custom-alert-error", "custom-alert-info")
    alertElement.classList.add(`custom-alert-${type}`, "show")
    overlayElement.classList.add("show")

    setTimeout(() => {
      alertElement.classList.remove("show")
      overlayElement.classList.remove("show")
      setTimeout(() => {
        alertElement.classList.add("hidden")
      }, 200)
    }, 1000)
  }

  function showCustomConfirm(message, onConfirm, onCancel) {
    const alertElement = document.getElementById("customAlert")
    const overlayElement = document.getElementById("customAlertOverlay")

    alertElement.innerHTML = `
        <div class="custom-alert-message">${message}</div>
        <div class="custom-alert-buttons">
            <button class="custom-alert-button custom-alert-cancel">Cancel</button>
            <button class="custom-alert-button custom-alert-confirm">Confirm</button>
        </div>
    `
    alertElement.classList.remove("hidden")
    alertElement.classList.add("show")
    overlayElement.classList.add("show")

    const confirmButton = alertElement.querySelector(".custom-alert-confirm")
    const cancelButton = alertElement.querySelector(".custom-alert-cancel")

    confirmButton.addEventListener("click", () => {
      alertElement.classList.remove("show")
      overlayElement.classList.remove("show")
      setTimeout(() => {
        alertElement.classList.add("hidden")
        if (onConfirm) onConfirm()
      }, 200)
    })

    cancelButton.addEventListener("click", () => {
      alertElement.classList.remove("show")
      overlayElement.classList.remove("show")
      setTimeout(() => {
        alertElement.classList.add("hidden")
        if (onCancel) onCancel()
      }, 200)
    })
  }

  initializeApp()
})