// SERVER URL
// const SERVER_URL = 'http://localhost:3000';
const SERVER_URL = 'https://auto-worklog-submission.onrender.com';

// Sync lock to prevent concurrent operations
let syncInProgress = false;

// LISTEN FOR LONG-LIVED TOKEN FROM app.kalvium.community
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_BETTER_CREDENTIALS') {
    handleTokenCapture(message.token);
  }
});

async function handleTokenCapture(newToken) {
    const now = new Date();
    const capturedOn = now.toISOString();
    
    console.log('Received token from content script');
    
    // 1. ALWAYS Update Local Storage with latest captured token
    // We do this first to ensure the UI always shows the fresh state
    await chrome.storage.local.set({ 
        authToken: newToken,
        authTokenCapturedOn: capturedOn
    });
    console.log('Local storage updated with latest token and timestamp.');

    // 2. Fetch Server State to decide on Refresh
    try {
        const userInfoResponse = await fetch(`${SERVER_URL}/api/user-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authToken: newToken })
        });

        if (userInfoResponse.status === 404) {
            console.log('User not found on server. Waiting for manual registration.');
            return;
        }

        if (!userInfoResponse.ok) {
            console.error('Failed to fetch user info for decision.');
            return;
        }

        const userData = await userInfoResponse.json();
        
        // 3. Decision Logic
        // Inputs: 
        // - isTokenMatch: boolean (from server)
        
        const isTokenMatch = userData.isTokenMatch;
        console.log(`Decision Inputs - TokenMatch: ${isTokenMatch}`);

        // Condition to Refresh:
        // Only if Token Changed on Client (!isTokenMatch) -> MUST Update
        
        if (!isTokenMatch) {
            console.log('Refresh condition met (Token Mismatch). triggering sync...');
            scheduleSync();
        } else {
            console.log('Token matches server. No action.');
        }

    } catch (error) {
        console.error('Error during decision phase:', error);
    }
}

function scheduleSync() {
  if (syncInProgress) {
    console.log('Sync in progress, skipping duplicate request.');
    return;
  }
  syncLatestTokenToServer();
}

async function syncLatestTokenToServer() {
  syncInProgress = true;
  
  try {
    // Read latest from storage (guaranteed to be there from Step 1)
    const storageData = await chrome.storage.local.get(['authToken']);
    const currentToken = storageData.authToken;
    
    if (!currentToken) {
      console.log('No token in storage? Should not happen.');
      return;
    }
    
    console.log('Syncing token to server...');
    
    const response = await fetch(`${SERVER_URL}/api/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken: currentToken })
    });

    const data = await response.json();

    if (response.ok) {
        console.log('Server Sync Response:', data);
        if (data.updated) {
            console.log('Token successfully updated/refreshed on server.');
            // We can optionally update a local "lastServerUpdate" timestamp if needed for UI
            await chrome.storage.local.set({ 
                lastServerUpdate: new Date().toISOString()
            });
        }
    } else {
        console.error('Failed to sync token:', data);
    }

  } catch (error) {
    console.error('Error syncing token:', error);
  } finally {
    syncInProgress = false;
  }
}
