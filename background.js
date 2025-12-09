// SERVER URL
// const SERVER_URL = 'http://localhost:3000';
const SERVER_URL = 'https://auto-worklog-submission.onrender.com';


// Listen for web requests to capture the Authorization header
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    for (let header of details.requestHeaders) {
      if (header.name.toLowerCase() === 'authorization') {
        const token = header.value;
        if (token && token.startsWith('Bearer ')) {
          console.log('Captured Auth Token:', token);
          
          // Save token to storage
          chrome.storage.local.set({ authToken: token }, () => {
            console.log('Token saved to storage');
            // Attempt to refresh token on server (if needed)
            checkAndRefreshToken(token);
          });
        }
        break;
      }
    }
  },
  {
    urls: [
      "https://*.kalvium.community/*"
    ]
  },
  ["requestHeaders"]
);

async function checkAndRefreshToken(token) {
  try {
    const data = await chrome.storage.local.get(['lastTokenRefreshDate']);
    const lastRefreshDate = data.lastTokenRefreshDate;
    
    const now = new Date();
    // Format date as "YYYY-MM-DD" to compare calendar days
    const todayStr = now.toISOString().split('T')[0];

    // Check if we need to refresh (if never refreshed or date is different)
    if (!lastRefreshDate || lastRefreshDate !== todayStr) {
      console.log(`Attempting to refresh token on server (Last: ${lastRefreshDate}, Today: ${todayStr})...`);
      
      const response = await fetch(`${SERVER_URL}/api/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ authToken: token })
      });

      if (response.ok) {
        console.log('Token refreshed successfully on server.');
        // Update timestamp to today's date string
        await chrome.storage.local.set({ lastTokenRefreshDate: todayStr });
      } else {
        const errData = await response.json();
        console.error('Failed to refresh token:', errData);
        // If 404 (User not found), we might want to ignore or log specific warning
        // that they need to setup the extension popup first.
      }
    } else {
      console.log('Token refresh skipped (already done today).');
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
}
