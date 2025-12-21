document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const workModeSelect = document.getElementById('work-mode');
    const tasksContainer = document.getElementById('tasks-container');
    const saveBtn = document.getElementById('save-btn');
    const deactivateBtn = document.getElementById('deactivate-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const messageDiv = document.getElementById('message');

    // Captured Token Elements
    const statusText = document.getElementById('status-text');
    const capturedTokenScroll = document.getElementById('captured-token-scroll');
    const capturedTokenValue = document.getElementById('captured-token-value');

    // User Info Elements
    const userInfoSection = document.getElementById('user-info-section');
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
            const response = await fetch(`${SERVER_URL}/api/user-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authToken })
            });

            if (response.ok) {
                const data = await response.json();
                userInfoSection.style.display = 'block';
                infoEmail.textContent = data.email || '-';
                // Collapse multiple asterisks to just "***"
                const maskedToken = data.maskedToken || '-';
                infoToken.textContent = maskedToken.replace(/^\*+/, '***');
                infoCreated.textContent = formatDate(data.createdAt);
                infoUpdated.textContent = formatDate(data.updatedAt);
                infoLastSubmitted.textContent = data.lastSubmittedAt ? formatDate(data.lastSubmittedAt) : 'Never';
                
                // Compare captured token with server token
                const visiblePart = maskedToken.replace(/^\*+/, ''); // Remove leading asterisks
                const isLatest = authToken.includes(visiblePart);
                infoUsingLatest.textContent = isLatest ? 'Yes' : "No (don't worry if updated today)";
                infoUsingLatest.style.color = isLatest ? '#90EE90' : '#FFB6C1';
            } else {
                // User not registered yet, hide the section
                userInfoSection.style.display = 'none';
            }
        } catch (error) {
            console.log('Could not fetch user info:', error);
            userInfoSection.style.display = 'none';
        }
    }

    // 1. Check for Auth Token in Storage
    chrome.storage.local.get(['authToken', 'worklogTasks', 'workMode'], (result) => {
        if (result.authToken) {
            statusText.textContent = 'Auth Token: Captured';
            statusDiv.classList.remove('status-inactive');
            statusDiv.classList.add('status-active');
            
            // Show full captured token
            capturedTokenScroll.style.display = 'block';
            capturedTokenValue.textContent = result.authToken;
            
            // Fetch user info from server
            fetchUserInfo(result.authToken);
        } else {
            statusText.textContent = 'Auth Token: Missing';
            capturedTokenScroll.style.display = 'none';
            userInfoSection.style.display = 'none';
        }

        // Load saved work mode
        if (result.workMode) {
            workModeSelect.value = result.workMode;
        }

        // Load saved tasks if any
        if (result.worklogTasks && Array.isArray(result.worklogTasks)) {
            // Clear default textareas
            tasksContainer.innerHTML = '';
            result.worklogTasks.forEach(task => {
                addTaskTextarea(task);
            });
            // Ensure at least one empty box if array was empty (edge case)
            if (result.worklogTasks.length === 0) addTaskTextarea();
        }
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

        // Save Tasks and WorkMode to Local Storage
        chrome.storage.local.set({ worklogTasks: tasks, workMode: workMode });

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
});

