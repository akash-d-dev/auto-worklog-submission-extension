# Auto Worklog Submitter for Kalvium

**Auto Worklog Submitter** is a Chrome extension designed to automate the daily routine of submitting worklogs on the Kalvium Community platform.

Instead of manually navigating to the portal every evening, this extension captures your authentication tokens, allows you to pre-define a pool of tasks, and works with a backend service to automatically submit your log daily at **7:00 PM IST**. You will receive an email notification confirming success or detailing any errors.

## 🚀 Features

- **Automatic Token Capture**: Captures both Access Token and Refresh Token from `kalvium.community` automatically when you log in.
- **Server-Side Token Refresh**: The backend automatically refreshes expired access tokens using your refresh token - no need to log in frequently.
- **Smart Automation**: Runs a backend job daily at 7:00 PM IST to submit your worklog.
- **Task Randomization**: You provide a list of tasks (e.g., "Debugging", "Frontend UI", "API Integration"). The system randomly selects one each day to ensure variety in your logs.
- **Context Aware**: Supports different working modes:
  - Working Remotely (Not in the Kalvium environment)
  - Working from Class
  - Working On-site (Company Location)
- **Email Reports**: Receive daily status emails confirming success or alerting you to any issues.
  
<img width="444" height="616" alt="image" src="https://github.com/user-attachments/assets/95798dc8-b369-44a6-9eb5-2a048b76fbdd" />
<img width="445" height="610" alt="image" src="https://github.com/user-attachments/assets/1261281a-362f-41a4-929b-0c4dcc1f3777" />

## 🛠️ How It Works

1. **Token Capture**: The extension injects scripts into `kalvium.community`. When you log in, it intercepts the authentication response and securely captures both the `access_token` and `refresh_token`.
2. **Configuration**: You use the extension popup to set your "Work Mode" and add a list of tasks.
3. **Synchronization**: Clicking "Save & Activate" sends your tokens, Work Mode, and Tasks to the backend server.
4. **Automatic Token Refresh**: When your access token is about to expire (within 24 hours), the backend automatically uses your refresh token to obtain a new access token.
5. **Execution**: The backend runs a scheduled job daily at 7:00 PM IST. It retrieves your user profile, picks a random task, and submits it to the Kalvium Student API.

## 📥 Installation

Since this is a custom extension, you need to load it into Chrome manually (Developer Mode).

1. **Clone or Download** this repository to your computer.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Toggle **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the folder containing the `manifest.json` file from this repository.

## 📖 Usage Guide

### 1. Initial Setup

1. Click the **Auto Worklog Submitter** extension icon in your browser toolbar.
2. You will likely see a status: `Tokens: Not Captured`.
3. Click the link in the extension to open [kalvium.community](https://kalvium.community/).
4. **Log in** to your Kalvium account if not already logged in.
5. The extension will automatically capture your tokens in the background.
6. Return to the extension popup - it should now show `Tokens: Captured` with the full tokens displayed.

### 2. Configure Tasks

1. Open the extension popup.
2. **Status** should show: `Tokens: Captured` with a timestamp.
3. You can see your captured **Access Token** and **Refresh Token** in scrollable containers.
4. Select your **Working Mode** (e.g., Remote, On-site, or From Class).
5. **Add Tasks**: Enter descriptions of your daily work.
   - _Tip: Add multiple variations (e.g., "Fixed UI bugs," "Backend API optimization," "Team meeting") so the logs don't look identical every day._
6. Click **Save & Activate**.

### 3. How Token Refresh Works

- Your **access token** expires after approximately 3 days.
- Your **refresh token** is valid for approximately 6 days.
- The server automatically checks token expiry before each submission.
- If your access token expires within 24 hours, the server uses your refresh token to get a new one.
- You only need to log in again if your refresh token expires (approximately every 6 days).

### 4. Monitoring

- You will receive an email every evening after 7:00 PM IST regarding the status of your submission.
- **Success emails** confirm the task that was submitted.
- **Failure emails** provide detailed error information and possible causes.

### Error Handling

If the submission fails, the backend analyzes the error code:

- **400**: Bad Request (Malformed data).
- **401**: Token Expired (Both tokens expired - please log in to `kalvium.community` to capture new tokens).
- **404**: No pending worklog found (already submitted or worklog period not started).
- **500**: Kalvium Server Error (temporary issue on Kalvium's side).

## 🔒 Security & Privacy

- Tokens are stored locally in your browser's extension storage.
- Tokens are transmitted securely to the backend server via HTTPS.
- The backend stores tokens encrypted in MongoDB.
- Only you receive email notifications about your submissions.

## 🔧 Deactivation

To stop automatic submissions:

1. Open the extension popup.
2. Click **Deactivate & Delete**.
3. This removes your data from the server and stops all automatic submissions.

## ⚠️ Disclaimer

This tool is intended to simplify the logging process for routine tasks. Please ensure you manually verify your logs occasionally and keep your task list updated to accurately reflect your actual work. The developer is not responsible for missed logs due to server downtime, changed API endpoints, or expired tokens.

---

**Developed by Akash Singh**
