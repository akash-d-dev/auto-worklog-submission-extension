document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const tokenStatusDiv = document.getElementById('token-status')
  const tokenStatusTitle = document.getElementById('token-status-title')
  const capturedOnValue = document.getElementById('captured-on-value')
  const tokenCapturedOn = document.getElementById('token-captured-on')

  const userInfoSection = document.getElementById('user-info-section')
  const userNotFoundSection = document.getElementById('user-not-found-section')
  const infoEmail = document.getElementById('info-email')
  const infoCreated = document.getElementById('info-created')
  const infoLastSubmitted = document.getElementById('info-last-submitted')

  const workModeSelect = document.getElementById('work-mode')
  const tasksContainer = document.getElementById('tasks-container')
  const saveBtn = document.getElementById('save-btn')
  const deactivateBtn = document.getElementById('deactivate-btn')
  const addTaskBtn = document.getElementById('add-task-btn')
  const refreshBtn = document.getElementById('refresh-btn')
  const messageDiv = document.getElementById('message')
  const loadingIndicator = document.getElementById('loading-indicator')

  // const SERVER_URL = 'http://localhost:3000'
  const SERVER_URL = 'https://auto-worklog-submission.onrender.com'

  function formatDate(dateString) {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getExpiryStatus(expiresAt) {
    if (!expiresAt) return { text: 'Unknown', class: 'warn' }
    const now = Date.now()
    const hoursLeft = (expiresAt - now) / (1000 * 60 * 60)

    if (hoursLeft <= 0) return { text: 'Expired', class: 'error' }
    if (hoursLeft <= 24)
      return { text: `${Math.round(hoursLeft)}h left`, class: 'warn' }
    if (hoursLeft <= 72)
      return { text: `${Math.round(hoursLeft)}h left`, class: 'ok' }
    return { text: `${Math.round(hoursLeft / 24)}d left`, class: 'ok' }
  }

  async function loadTokenStatus() {
    const data = await chrome.storage.local.get([
      'accessToken',
      'refreshToken',
      'tokensCapturedOn',
      'lastTokenSyncStatus',
      'lastTokenSyncOn',
      'lastTokenSyncError'
    ])

    const accessTokenDisplay = document.getElementById('access-token-display')
    const refreshTokenDisplay = document.getElementById('refresh-token-display')
    const accessTokenFull = document.getElementById('access-token-full')
    const refreshTokenFull = document.getElementById('refresh-token-full')
    const tokenSyncInfo = document.getElementById('token-sync-info')
    const tokenSyncStatus = document.getElementById('token-sync-status')
    const tokenSyncOn = document.getElementById('token-sync-on')

    if (data.accessToken && data.refreshToken) {
      tokenStatusDiv.classList.remove('missing')
      tokenStatusDiv.classList.add('captured')
      tokenStatusTitle.textContent = 'Tokens: Captured'

      tokenCapturedOn.style.display = 'block'
      capturedOnValue.textContent = formatDate(data.tokensCapturedOn)

      if (data.lastTokenSyncStatus) {
        tokenSyncInfo.style.display = 'block'
        tokenSyncStatus.textContent = getSyncStatusText(
          data.lastTokenSyncStatus,
          data.lastTokenSyncError
        )
        tokenSyncOn.textContent = data.lastTokenSyncOn
          ? `(${formatDate(data.lastTokenSyncOn)})`
          : ''
      } else {
        tokenSyncInfo.style.display = 'none'
      }

      // Show full tokens
      accessTokenDisplay.classList.add('show')
      refreshTokenDisplay.classList.add('show')
      accessTokenFull.textContent = data.accessToken
      refreshTokenFull.textContent = data.refreshToken

      return data
    } else {
      tokenStatusDiv.classList.remove('captured')
      tokenStatusDiv.classList.add('missing')
      tokenStatusTitle.textContent = 'Tokens: Not Captured'
      tokenCapturedOn.style.display = 'none'
      tokenSyncInfo.style.display = 'none'
      accessTokenDisplay.classList.remove('show')
      refreshTokenDisplay.classList.remove('show')
      return null
    }
  }

  function getSyncStatusText(status, errorMessage) {
    switch (status) {
      case 'synced':
        return 'Synced'
      case 'syncing':
        return 'Syncing...'
      case 'not_registered':
        return 'Waiting for activation'
      case 'failed':
        return errorMessage ? `Failed: ${errorMessage}` : 'Failed'
      default:
        return 'Unknown'
    }
  }

  async function fetchUserInfo(accessToken) {
    try {
      const response = await fetch(`${SERVER_URL}/api/user-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken: accessToken })
      })

      if (response.ok) {
        const data = await response.json()
        userInfoSection.style.display = 'block'
        userNotFoundSection.style.display = 'none'
        messageDiv.textContent = ''

        infoEmail.textContent = data.email || '-'
        infoCreated.textContent = formatDate(data.createdAt)
        infoLastSubmitted.textContent = data.lastSubmittedAt
          ? formatDate(data.lastSubmittedAt)
          : 'Never'

        if (data.workMode) {
          workModeSelect.value = data.workMode
        }

        tasksContainer.innerHTML = ''
        if (
          data.worklogTasks &&
          Array.isArray(data.worklogTasks) &&
          data.worklogTasks.length > 0
        ) {
          data.worklogTasks.forEach((task) => addTaskTextarea(task))
        } else {
          addTaskTextarea()
        }
      } else if (response.status === 404) {
        userInfoSection.style.display = 'none'
        userNotFoundSection.style.display = 'block'
        messageDiv.textContent = ''

        workModeSelect.value =
          'Working Remotely (Not in the Kalvium environment)'
        tasksContainer.innerHTML = ''
        addTaskTextarea()
      } else {
        userInfoSection.style.display = 'none'
        userNotFoundSection.style.display = 'none'
      }
    } catch (error) {
      console.log('Could not fetch user info:', error)
      userInfoSection.style.display = 'none'
      userNotFoundSection.style.display = 'none'
    }
  }

  async function init() {
    loadingIndicator.style.display = 'block'
    userInfoSection.style.display = 'none'
    userNotFoundSection.style.display = 'none'

    const tokenData = await loadTokenStatus()

    if (tokenData?.accessToken) {
      await fetchUserInfo(tokenData.accessToken)
    }

    loadingIndicator.style.display = 'none'
  }

  function addTaskTextarea(value = '') {
    const textarea = document.createElement('textarea')
    textarea.className = 'task-entry'
    textarea.placeholder = `Task ${
      tasksContainer.children.length + 1
    }: Enter task details...`
    textarea.value = value
    tasksContainer.appendChild(textarea)
  }

  // Add Task Button
  addTaskBtn.addEventListener('click', () => addTaskTextarea())

  // Save & Activate Button
  saveBtn.addEventListener('click', async () => {
    messageDiv.textContent = 'Saving...'
    messageDiv.style.color = 'blue'

    const storageData = await chrome.storage.local.get([
      'accessToken',
      'refreshToken'
    ])

    if (!storageData.accessToken || !storageData.refreshToken) {
      messageDiv.textContent =
        'Error: Tokens not captured yet! Please log in to kalvium.community first.'
      messageDiv.style.color = 'red'
      return
    }

    const workMode = workModeSelect.value
    const taskInputs = document.querySelectorAll('.task-entry')
    const tasks = []
    taskInputs.forEach((input) => {
      const val = input.value.trim()
      if (val) tasks.push(val)
    })

    if (tasks.length === 0) {
      messageDiv.textContent = 'Error: Please add at least one task.'
      messageDiv.style.color = 'red'
      tasksContainer.style.border = '1px solid red'
      setTimeout(() => (tasksContainer.style.border = 'none'), 2000)
      return
    }

    try {
      const response = await fetch(`${SERVER_URL}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authToken: storageData.accessToken,
          refreshToken: storageData.refreshToken,
          workMode: workMode,
          worklogTasks: tasks
        })
      })

      const data = await response.json()

      if (response.ok) {
        messageDiv.textContent = 'Success! Settings saved to server.'
        messageDiv.style.color = 'green'
        userNotFoundSection.style.display = 'none'
        fetchUserInfo(storageData.accessToken)
      } else {
        messageDiv.textContent = `Error: ${
          data.error || 'Failed to save on server'
        }`
        messageDiv.style.color = 'red'
      }
    } catch (error) {
      console.error('Network Error:', error)
      messageDiv.textContent = 'Network Error: Could not reach server.'
      messageDiv.style.color = 'red'
    }
  })

  // Deactivate Button
  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', async () => {
      if (
        !confirm(
          'Are you sure you want to deactivate and delete your data? This cannot be undone.'
        )
      ) {
        return
      }

      messageDiv.textContent = 'Deactivating...'
      messageDiv.style.color = 'blue'

      const storageData = await chrome.storage.local.get(['accessToken'])

      if (!storageData.accessToken) {
        messageDiv.textContent = 'Error: No token captured yet!'
        messageDiv.style.color = 'red'
        return
      }

      try {
        const response = await fetch(`${SERVER_URL}/api/user`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authToken: storageData.accessToken })
        })

        const data = await response.json()

        if (response.ok) {
          messageDiv.textContent = 'Success! User deactivated and data deleted.'
          messageDiv.style.color = 'green'

          chrome.storage.local.clear(() => {
            loadTokenStatus()
            userInfoSection.style.display = 'none'
            userNotFoundSection.style.display = 'none'
            tasksContainer.innerHTML = ''
            addTaskTextarea()
          })
        } else {
          messageDiv.textContent = `Error: ${
            data.error || 'Failed to deactivate'
          }`
          messageDiv.style.color = 'red'
        }
      } catch (error) {
        console.error('Network Error:', error)
        messageDiv.textContent = 'Network Error: Could not reach server.'
        messageDiv.style.color = 'red'
      }
    })
  }

  // Refresh Button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.textContent = '...'
      refreshBtn.disabled = true
      await init()
      refreshBtn.textContent = 'Refresh'
      refreshBtn.disabled = false
    })
  }

  // Initialize
  init()
})
