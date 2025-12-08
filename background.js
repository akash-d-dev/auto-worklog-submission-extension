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

