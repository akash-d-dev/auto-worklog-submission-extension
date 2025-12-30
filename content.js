// Running in MAIN world - this script is part of the page context
console.log('Auto Worklog: Token Interceptor Injected into Page Context')

// Intercept fetch to capture token responses
const originalFetch = window.fetch

window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args)

  const url = args[0]?.url || args[0]

  if (
    typeof url === 'string' &&
    url.includes('auth.kalvium.community') &&
    url.includes('openid-connect/token')
  ) {
    console.log('Auto Worklog: Detected token endpoint call!')

    try {
      const clonedResponse = response.clone()
      const data = await clonedResponse.json()

      if (data.access_token && data.refresh_token) {
        console.log('Auto Worklog: Tokens captured!', {
          accessTokenLength: data.access_token.length,
          refreshTokenLength: data.refresh_token.length,
          expiresIn: data.expires_in,
          refreshExpiresIn: data.refresh_expires_in
        })

        // Send to content-bridge via postMessage
        window.postMessage(
          {
            type: 'KALVIUM_TOKENS_CAPTURED',
            source: 'kalvium-worklog-extension',
            payload: {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresIn: data.expires_in,
              refreshExpiresIn: data.refresh_expires_in
            }
          },
          '*'
        )
      }
    } catch (e) {
      console.error('Auto Worklog: Error parsing token response:', e)
    }
  }

  return response
}

// Also intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open
const originalXHRSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._url = url
  return originalXHROpen.apply(this, [method, url, ...rest])
}

XMLHttpRequest.prototype.send = function (...args) {
  if (
    this._url &&
    this._url.includes('auth.kalvium.community') &&
    this._url.includes('openid-connect/token')
  ) {
    this.addEventListener('load', function () {
      try {
        const data = JSON.parse(this.responseText)
        if (data.access_token && data.refresh_token) {
          console.log('Auto Worklog: Tokens captured via XHR!')

          window.postMessage(
            {
              type: 'KALVIUM_TOKENS_CAPTURED',
              source: 'kalvium-worklog-extension',
              payload: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in,
                refreshExpiresIn: data.refresh_expires_in
              }
            },
            '*'
          )
        }
      } catch (e) {
        console.error('Auto Worklog: Error parsing XHR token response:', e)
      }
    })
  }
  return originalXHRSend.apply(this, args)
}

console.log('Auto Worklog: Interceptors installed successfully')
