// SERVER URL
// const SERVER_URL = 'http://localhost:3000'
const SERVER_URL = 'https://auto-worklog-submission.onrender.com'

// Listen for tokens from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOKENS_CAPTURED') {
    handleTokenCapture(message)
  }
})

async function handleTokenCapture(tokenData) {
  const { accessToken, refreshToken } = tokenData

  console.log('Background: Received tokens from content script')

  // Get current stored tokens
  const stored = await chrome.storage.local.get(['accessToken', 'refreshToken'])

  // Check if tokens are different
  const accessChanged = stored.accessToken !== accessToken
  const refreshChanged = stored.refreshToken !== refreshToken

  if (!accessChanged && !refreshChanged) {
    console.log('Background: Tokens unchanged, skipping update')
    return
  }

  // Store tokens in local storage (no decoding/expiry calculation)
  await chrome.storage.local.set({
    accessToken: accessToken,
    refreshToken: refreshToken,
    tokensCapturedOn: new Date().toISOString(),
    lastTokenSyncStatus: 'syncing',
    lastTokenSyncOn: new Date().toISOString(),
    lastTokenSyncError: null
  })

  console.log('Background: Tokens saved to local storage')

  submitLatestTokens(accessToken, refreshToken)
}

async function submitLatestTokens(accessToken, refreshToken) {
  try {
    const response = await fetch(`${SERVER_URL}/api/update-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken: accessToken, refreshToken })
    })

    if (response.ok) {
      console.log('Background: Tokens synced with server')
      await chrome.storage.local.set({
        lastTokenSyncStatus: 'synced',
        lastTokenSyncOn: new Date().toISOString(),
        lastTokenSyncError: null
      })
      return
    }

    if (response.status === 404) {
      console.log('Background: User not registered yet, skip token sync')
      await chrome.storage.local.set({
        lastTokenSyncStatus: 'not_registered',
        lastTokenSyncOn: new Date().toISOString(),
        lastTokenSyncError: null
      })
      return
    }

    const data = await response.json().catch(() => ({}))
    console.warn('Background: Token sync failed', data.error || response.status)
    await chrome.storage.local.set({
      lastTokenSyncStatus: 'failed',
      lastTokenSyncOn: new Date().toISOString(),
      lastTokenSyncError: data.error || `HTTP ${response.status}`
    })
  } catch (error) {
    console.warn('Background: Token sync error', error)
    await chrome.storage.local.set({
      lastTokenSyncStatus: 'failed',
      lastTokenSyncOn: new Date().toISOString(),
      lastTokenSyncError: error?.message || 'Network error'
    })
  }
}
