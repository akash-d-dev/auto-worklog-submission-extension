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
    tokensCapturedOn: new Date().toISOString()
  })

  console.log('Background: Tokens saved to local storage')
}
