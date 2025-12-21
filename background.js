// SERVER URL
// const SERVER_URL = 'http://localhost:3000';
const SERVER_URL = 'https://auto-worklog-submission.onrender.com';

// LISTEN FOR LONG-LIVED TOKEN FROM app.kalvium.community
// This is the MAIN and ONLY way to capture tokens now.
// User must visit app.kalvium.community for the extension to work.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_BETTER_CREDENTIALS') {
    console.log('Received Long-Lived Token from Content Script (app.kalvium.community)');
    
    // Save token to Local Storage
    chrome.storage.local.set({ authToken: message.token }, () => {
        console.log('Long-Lived Token saved.');
        
        // Check if we need to sync with server (based on date)
        // This prevents spamming the server if user refreshes the page multiple times
        checkAndRefreshToken(message.token); 
    });
  }
});

// NOTE: We no longer passively capture tokens from kalvium.community
// because those are short-lived (3 days). The only source is app.kalvium.community.

async function checkAndRefreshToken(token) {
  try {
    const data = await chrome.storage.local.get(['lastTokenRefreshDate']);
    const lastRefreshDate = data.lastTokenRefreshDate;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check if we need to refresh (if never refreshed or date is different)
    if (!lastRefreshDate || lastRefreshDate !== todayStr) {
      console.log(`Syncing token to server (Last: ${lastRefreshDate}, Today: ${todayStr})...`);
      
      const response = await fetch(`${SERVER_URL}/api/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ authToken: token })
      });

      if (response.ok) {
        console.log('Token synced successfully to server.');
        await chrome.storage.local.set({ lastTokenRefreshDate: todayStr });
      } else {
        const errData = await response.json();
        console.error('Failed to sync token:', errData);
      }
    } else {
      console.log('Token sync skipped (already done today).');
    }
  } catch (error) {
    console.error('Error syncing token:', error);
  }
}
