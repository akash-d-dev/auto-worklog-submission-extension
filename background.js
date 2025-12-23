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
        
        // Check if we need to sync with server (based on server's updatedAt date)
        checkAndRefreshToken(message.token); 
    });
  }
});

async function checkAndRefreshToken(token) {
  try {
    // 1. Check Local Storage for last server update
    // This avoids hitting the DB every time if we already know it's updated today
    const storageData = await chrome.storage.local.get(['lastServerUpdate']);
    if (!storageData.lastServerUpdate) {
        console.log('No last server update found...skipping token sync.');
        return;
    }
    const lastUpdate = storageData.lastServerUpdate;

    const todayStr = new Date().toISOString().split('T')[0];
    let lastUpdateStr = '';

    if (lastUpdate) {
        lastUpdateStr = new Date(lastUpdate).toISOString().split('T')[0];
    }

    // 2. If locally stored date is TODAY, we assume we are synced. Skip.
    if (lastUpdateStr === todayStr) {
        console.log('Token sync skipped (Local storage says updated today).');
        return;
    }

    console.log(`Local data outdated (Last: ${lastUpdateStr || 'Never'}). Syncing token...`);
    
    // 3. Call refresh endpoint
    const response = await fetch(`${SERVER_URL}/api/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken: token })
    });

    if (response.ok) {
        console.log('Token synced successfully to server.');
        // Update local storage so we don't hit server again today
        // NOTE: Ideally we should use the server's response time, but local time is fine for this check
        const nowIso = new Date().toISOString();
        await chrome.storage.local.set({ lastServerUpdate: nowIso });
    } else {
        const errData = await response.json().catch(() => ({}));
        console.error('Failed to sync token:', errData);
    }

  } catch (error) {
    console.error('Error syncing token:', error);
  }
}
