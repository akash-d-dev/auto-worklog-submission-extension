document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const tasksContainer = document.getElementById('tasks-container');
    const saveBtn = document.getElementById('save-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const messageDiv = document.getElementById('message');

    // SERVER URL
    const SERVER_URL = 'http://localhost:3000/api/register';

    // 1. Check for Auth Token in Storage
    chrome.storage.local.get(['authToken', 'worklogTasks'], (result) => {
        if (result.authToken) {
            statusDiv.textContent = 'Auth Token: Captured';
            statusDiv.classList.remove('status-inactive');
            statusDiv.classList.add('status-active');
        } else {
            statusDiv.textContent = 'Auth Token: Missing';
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
            return;
        }

        // Save Tasks to Local Storage
        chrome.storage.local.set({ worklogTasks: tasks });

        // Send to Server
        try {
            const response = await fetch(SERVER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    authToken: authToken,
                    worklogTasks: tasks
                })
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.textContent = 'Success! Worklogs configured and sent to server.';
                messageDiv.style.color = 'green';
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
});

