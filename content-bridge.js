// Bridge script running in ISOLATED world - listens for messages from MAIN world
console.log('Auto Worklog: Content Bridge Active (Isolated World)')

// Listen for messages from the MAIN world script
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return

  if (
    event.data &&
    event.data.type === 'KALVIUM_TOKENS_CAPTURED' &&
    event.data.source === 'kalvium-worklog-extension'
  ) {
    console.log('Auto Worklog: Bridge received tokens from page context')

    // Forward to background script
    chrome.runtime.sendMessage({
      type: 'TOKENS_CAPTURED',
      ...event.data.payload
    })
  }
})
