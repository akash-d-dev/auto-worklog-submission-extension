document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const workModeSelect = document.getElementById('work-mode');
    const tasksContainer = document.getElementById('tasks-container');
    const saveBtn = document.getElementById('save-btn');
    const deactivateBtn = document.getElementById('deactivate-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const messageDiv = document.getElementById('message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const contentDiv = document.querySelector('.content'); // To hide/show content if needed or just overlay

    // Captured Token Elements
    const statusText = document.getElementById('status-text');
    const capturedTokenScroll = document.getElementById('captured-token-scroll');
    const capturedTokenValue = document.getElementById('captured-token-value');

    // User Info Elements
    const userInfoSection = document.getElementById('user-info-section');
    const userNotFoundSection = document.getElementById('user-not-found-section'); // New element
    const infoEmail = document.getElementById('info-email');
    const infoToken = document.getElementById('info-token');
    const infoCreated = document.getElementById('info-created');
    const infoUpdated = document.getElementById('info-updated');
    const infoLastSubmitted = document.getElementById('info-last-submitted');
    const infoUsingLatest = document.getElementById('info-using-latest');

    // SERVER URL
    // const SERVER_URL = 'http://localhost:3000';
    const SERVER_URL = 'https://auto-worklog-submission.onrender.com';

    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Function to fetch and display user info
    async function fetchUserInfo(authToken) {
        try {
            // Show loading if not already shown (e.g. initial load)
            // But we might want to keep other UI visible? 
            // Let's just rely on the initial loader for the first boot.
            
            const response = await fetch(`${SERVER_URL}/api/user-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authToken })
            });

            if (response.ok) {
                const data = await response.json();
                userInfoSection.style.display = 'block';
                userNotFoundSection.style.display = 'none'; // Hide not found section

                messageDiv.textContent = ''; // Clear any previous messages
                infoEmail.textContent = data.email || '-';
                // Collapse multiple asterisks to just "***"
                const maskedToken = data.maskedToken || '-';
                infoToken.textContent = maskedToken.replace(/^\*+/, '***');
                infoCreated.textContent = formatDate(data.createdAt);
                infoUpdated.textContent = formatDate(data.updatedAt);
                infoLastSubmitted.textContent = data.lastSubmittedAt ? formatDate(data.lastSubmittedAt) : 'Never';
                
                // Logic to check if we are using the latest token
                // We compare the CURRENT date with the server's updated at date
                // If the updated date is from today, then it is latest.
                let isLatest = false;
                if (data.updatedAt) {
                    const updatedAtDateStr = new Date(data.updatedAt).toISOString().split('T')[0];
                    const todayDateStr = new Date().toISOString().split('T')[0];
                    
                    if (updatedAtDateStr === todayDateStr) {
                        isLatest = true;
                    }
                    // This allows background.js to check this date without hitting the API
                    chrome.storage.local.set({ lastServerUpdate: data.updatedAt });
                }
                
                infoUsingLatest.textContent = isLatest ? 'Yes' : "No (don't worry if updated today)";
                infoUsingLatest.style.color = isLatest ? '#90EE90' : '#FFB6C1';

                // Populate Work Mode from Server
                if (data.workMode) {
                    workModeSelect.value = data.workMode;
                }

                // Populate Tasks from Server
                tasksContainer.innerHTML = ''; // Clear existing
                if (data.worklogTasks && Array.isArray(data.worklogTasks) && data.worklogTasks.length > 0) {
                    data.worklogTasks.forEach(task => {
                        addTaskTextarea(task);
                    });
                } else {
                     // If array empty but user exists, show one empty box
                     addTaskTextarea();
                }

            } else if (response.status === 404) {
                userInfoSection.style.display = 'none';
                userNotFoundSection.style.display = 'block';
                
                // Clear main message
                messageDiv.textContent = ''; 
                
                // Set Default Work Mode
                workModeSelect.value = "Working Remotely (Not in the Kalvium environment)";

                // Clear Tasks (Show one empty field)
                tasksContainer.innerHTML = '';
                addTaskTextarea();

            } else {
                // Other errors
                userInfoSection.style.display = 'none';
                userNotFoundSection.style.display = 'none';
                const errorData = await response.json().catch(() => ({}));
                console.log('Server error:', errorData);
            }
        } catch (error) {
            console.log('Could not fetch user info:', error);
            userInfoSection.style.display = 'none';
            userNotFoundSection.style.display = 'none';
        }
    }

    // 1. Check for Auth Token in Storage
    // Show Loading
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    // Hide main content temporarily? Or just let it fill in.
    // Let's just show the loader at the top or overlay.
    // Actually, hiding the "status" and "userInfo" until loaded is cleaner.
    statusDiv.style.display = 'none';
    userInfoSection.style.display = 'none';
    if (userNotFoundSection) userNotFoundSection.style.display = 'none';

    chrome.storage.local.get(['authToken'], (result) => {
        if (result.authToken) {
            statusDiv.style.display = 'block'; // Show status again
            statusText.textContent = 'Auth Token: Captured';
            statusDiv.classList.remove('status-inactive');
            statusDiv.classList.add('status-active');
            
            // Show full captured token
            capturedTokenScroll.style.display = 'block';
            capturedTokenValue.textContent = result.authToken;
            
            // Fetch user info from server using the captured token
            fetchUserInfo(result.authToken).finally(() => {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            });
        } else {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            statusDiv.style.display = 'block'; // Show status again
            statusText.textContent = 'Auth Token: Missing';
            capturedTokenScroll.style.display = 'none';
            userInfoSection.style.display = 'none';
            if (userNotFoundSection) userNotFoundSection.style.display = 'none'; // Ensure this is also hidden
        }
        
        // We no longer load workMode or tasks from local storage here.
        // They will be populated by fetchUserInfo or set to default.
    });

    // 2. Add Task Button Logic
    addTaskBtn.addEventListener('click', () => {
        addTaskTextarea();
    });

    function addTaskTextarea(value = '') {
        const textarea = document.createElement('textarea');
        textarea.className = 'task-entry';
        textarea.placeholder = `Task ${tasksContainer.children.length + 1}: Enter task details...`;
        textarea.value = value;
        tasksContainer.appendChild(textarea);
    }

    // 3. Save & Activate Button Logic
    saveBtn.addEventListener('click', async () => {
        messageDiv.textContent = 'Saving...';
        messageDiv.style.color = 'blue';

        // Get Token
        const storageData = await chrome.storage.local.get(['authToken']);
        const authToken = storageData.authToken;

        if (!authToken) {
            messageDiv.textContent = 'Error: No Auth Token captured yet! Please login to Kalvium Community first.';
            messageDiv.style.color = 'red';
            return;
        }

        // Get Work Mode
        const workMode = workModeSelect.value;

        // Get Tasks
        const taskInputs = document.querySelectorAll('.task-entry');
        const tasks = [];
        taskInputs.forEach(input => {
            const val = input.value.trim();
            if (val) tasks.push(val);
        });

        if (tasks.length === 0) {
            messageDiv.textContent = 'Error: Please add at least one task.';
            messageDiv.style.color = 'red';
            // Visual feedback - shake or highlight container
            tasksContainer.style.border = '1px solid red';
            setTimeout(() => tasksContainer.style.border = 'none', 2000);
            return;
        }

        // Save Tasks and WorkMode to Local Storage - REMOVED per requirements
        // chrome.storage.local.set({ worklogTasks: tasks, workMode: workMode });

        // Send to Server
        try {
            const response = await fetch(`${SERVER_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    authToken: authToken,
                    workMode: workMode,
                    worklogTasks: tasks
                })
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.textContent = 'Success! Worklogs configured and sent to server.';
                messageDiv.style.color = 'green';
                // Hide the not found section immediately on success
                if (userNotFoundSection) userNotFoundSection.style.display = 'none';
                
                // Refresh user info to show updated data
                fetchUserInfo(authToken);
            } else {
                messageDiv.textContent = `Error: ${data.error || 'Failed to save on server'}`;
                messageDiv.style.color = 'red';
            }

        } catch (error) {
            console.error('Network Error:', error);
            messageDiv.textContent = 'Network Error: Check if server is running on localhost:3000';
            messageDiv.style.color = 'red';
        }
    });

    // 4. Deactivate & Delete Button Logic
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to deactivate and delete your data? This cannot be undone.')) {
                return;
            }

            messageDiv.textContent = 'Deactivating...';
            messageDiv.style.color = 'blue';

            // Get Token
            const storageData = await chrome.storage.local.get(['authToken']);
            const authToken = storageData.authToken;

            if (!authToken) {
                messageDiv.textContent = 'Error: No Auth Token captured yet!';
                messageDiv.style.color = 'red';
                return;
            }

            try {
                const response = await fetch(`${SERVER_URL}/api/user`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        authToken: authToken
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.textContent = 'Success! User deactivated and data deleted.';
                    messageDiv.style.color = 'green';
                    
                    // Optional: Clear local storage
                    chrome.storage.local.clear(() => {
                        // Refresh UI
                        statusText.textContent = 'Auth Token: Missing';
                        statusDiv.classList.remove('status-active');
                        capturedTokenScroll.style.display = 'none';
                        userInfoSection.style.display = 'none';
                        tasksContainer.innerHTML = '';
                        addTaskTextarea();
                    });
                } else {
                    messageDiv.textContent = `Error: ${data.error || 'Failed to deactivate'}`;
                    messageDiv.style.color = 'red';
                }

            } catch (error) {
                console.error('Network Error:', error);
                messageDiv.textContent = 'Network Error: Could not reach server.';
                messageDiv.style.color = 'red';
            }
        });
    }

    // 5. Refresh Button Logic
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // Add a temporary loading animation or visual feedback
            refreshBtn.textContent = '...';
            refreshBtn.disabled = true;
            
            // Show loading text
            if (loadingIndicator) loadingIndicator.style.display = 'block';

            // Hide other sections to focus on loading
            userInfoSection.style.display = 'none';
            if (userNotFoundSection) userNotFoundSection.style.display = 'none';

            // Re-run the initial load logic
            // Update to match new logic: fetch only token
            chrome.storage.local.get(['authToken'], (result) => {
                if (result.authToken) {
                    statusText.textContent = 'Auth Token: Captured';
                    statusDiv.classList.remove('status-inactive');
                    statusDiv.classList.add('status-active');
                    statusDiv.style.display = 'block';
                    
                    capturedTokenScroll.style.display = 'block';
                    capturedTokenValue.textContent = result.authToken;
                    
                    fetchUserInfo(result.authToken).finally(() => {
                        if (loadingIndicator) loadingIndicator.style.display = 'none';
                        refreshBtn.textContent = 'Refresh';
                        refreshBtn.disabled = false;
                    });
                } else {
                    statusText.textContent = 'Auth Token: Missing';
                    statusDiv.classList.remove('status-active');
                    statusDiv.classList.add('status-inactive');
                    statusDiv.style.display = 'block';
                    
                    capturedTokenScroll.style.display = 'none';
                    userInfoSection.style.display = 'none';
                    if (userNotFoundSection) userNotFoundSection.style.display = 'none';
                    // Clear user info fields
                    infoEmail.textContent = '-';
                    infoToken.textContent = '-';
                    infoCreated.textContent = '-';
                    infoUpdated.textContent = '-';
                    infoLastSubmitted.textContent = '-';
                    infoUsingLatest.textContent = '-';
                    
                    // Reset inputs to default state
                    workModeSelect.value = "Working Remotely (Not in the Kalvium environment)";
                    tasksContainer.innerHTML = '';
                    addTaskTextarea();

                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                    refreshBtn.textContent = 'Refresh';
                    refreshBtn.disabled = false;
                }
            });
        });
    }
});
