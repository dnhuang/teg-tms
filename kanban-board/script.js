// Global variables
let currentUser = null;
let authToken = localStorage.getItem('auth_token');
let taskHistory = [];
let historyIndex = -1;
let dragPlaceholder = null;
let draggedElement = null;
let originalColumn = null;
let websocket = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimeout = null;
let isEditMode = false;
let editingTaskId = null;

// API configuration
const API_BASE = 'http://localhost:8000/api/v1';
const WS_BASE = 'ws://localhost:8000/api/v1/ws';

// DOM elements will be set after DOM loads
let loginContainer, appContainer, addTaskPanel;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Get DOM elements
    loginContainer = document.getElementById('login-container');
    appContainer = document.getElementById('app-container');
    addTaskPanel = document.getElementById('add-task-panel');

    // Check if user is already logged in
    if (authToken) {
        const user = await getCurrentUser();
        if (user) {
            currentUser = user;
            showApp();
        } else {
            showLogin();
        }
    } else {
        showLogin();
    }

    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Add task button - only for active users
    const addTaskButton = document.getElementById('add-task-button');
    if (addTaskButton) {
        addTaskButton.addEventListener('click', function() {
            if (currentUser && currentUser.is_active) {
                showAddTaskPanel();
            } else {
                showMessage('Inactive users cannot add tasks', 'error');
            }
        });
    }

    // Clear done button - only for active users
    const clearDoneButton = document.getElementById('clear-done-button');
    if (clearDoneButton) {
        clearDoneButton.addEventListener('click', function() {
            if (currentUser && currentUser.is_active) {
                clearDoneTasks();
            } else {
                showMessage('Inactive users cannot clear tasks', 'error');
            }
        });
    }

    // History buttons - only for active users
    const undoButton = document.getElementById('undo-button');
    const redoButton = document.getElementById('redo-button');
    
    if (undoButton) {
        undoButton.addEventListener('click', function() {
            if (currentUser && currentUser.is_active) {
                undoLastAction();
            } else {
                showMessage('Inactive users cannot undo actions', 'error');
            }
        });
    }
    
    if (redoButton) {
        redoButton.addEventListener('click', function() {
            if (currentUser && currentUser.is_active) {
                redoLastAction();
            } else {
                showMessage('Inactive users cannot redo actions', 'error');
            }
        });
    }

    // Add task form
    const addTaskForm = document.getElementById('add-task-form');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', handleAddTask);
    }

    // Cancel button
    const cancelButton = document.getElementById('cancel-button');
    if (cancelButton) {
        cancelButton.addEventListener('click', hideAddTaskPanel);
    }

    // Task type selection
    setupTaskTypeSelection();
    setupProcessingSelection();

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';
    }

    // Close add task panel when clicking outside
    if (addTaskPanel) {
        addTaskPanel.addEventListener('click', function(e) {
            if (e.target === addTaskPanel) {
                hideAddTaskPanel();
            }
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const errorContainer = document.getElementById('login-error');
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="button-loader">⟳</span> Signing in...';
    
    // Clear previous errors
    if (errorContainer) {
        errorContainer.remove();
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/login-json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.access_token;
            localStorage.setItem('auth_token', authToken);
            
            // Get user info
            currentUser = await getCurrentUser();
            
            if (currentUser) {
                showApp();
            } else {
                throw new Error('Failed to get user information');
            }
        } else {
            throw new Error(data.detail || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(error.message);
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButton.innerHTML = '🔐 Sign In';
    }
}

function showLoginError(message) {
    const loginForm = document.getElementById('login-form');
    let errorContainer = document.getElementById('login-error');
    
    // Remove existing error
    if (errorContainer) {
        errorContainer.remove();
    }
    
    // Create new error message
    errorContainer = document.createElement('div');
    errorContainer.id = 'login-error';
    errorContainer.className = 'error-message';
    errorContainer.textContent = message;
    
    loginForm.appendChild(errorContainer);
}

async function getCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            return null;
        }
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Disconnect WebSocket
        disconnectWebSocket();
        
        // Clear local data regardless of API response
        authToken = null;
        currentUser = null;
        localStorage.removeItem('auth_token');
        showLogin();
    }
}

function showLogin() {
    if (loginContainer) loginContainer.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
}

function showApp() {
    if (loginContainer) loginContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    
    // Update user info in the UI
    updateUserInfo();
    
    // Connect WebSocket
    connectWebSocket();
    
    // Load tasks
    loadTasks();
}

// WebSocket connection management
function connectWebSocket() {
    if (!authToken) {
        console.log('No auth token available for WebSocket connection');
        return;
    }

    try {
        const wsUrl = `${WS_BASE}/ws?token=${encodeURIComponent(authToken)}`;
        websocket = new WebSocket(wsUrl);

        websocket.onopen = function(event) {
            console.log('WebSocket connected');
            reconnectAttempts = 0;
            showMessage('Real-time updates connected', 'success');
            
            // Clear any existing reconnection timeout
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
        };

        websocket.onmessage = function(event) {
            try {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        websocket.onclose = function(event) {
            console.log('WebSocket disconnected:', event.code, event.reason);
            websocket = null;
            
            // Attempt to reconnect if not intentionally closed
            if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                attemptReconnect();
            }
        };

        websocket.onerror = function(error) {
            console.error('WebSocket error:', error);
            showMessage('Real-time connection error', 'error');
        };

    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
    }
}

function attemptReconnect() {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
    
    console.log(`Attempting WebSocket reconnection ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
    
    reconnectTimeout = setTimeout(() => {
        if (authToken && currentUser) {
            connectWebSocket();
        }
    }, delay);
}

function disconnectWebSocket() {
    if (websocket) {
        websocket.close(1000, 'User logged out');
        websocket = null;
    }
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    
    reconnectAttempts = 0;
}

function handleWebSocketMessage(message) {
    console.log('WebSocket message received:', message);
    
    switch (message.type) {
        case 'connection_established':
            console.log('WebSocket connection established for user:', message.user);
            break;
            
        case 'task_created':
            handleTaskCreated(message.data);
            break;
            
        case 'task_updated':
            handleTaskUpdated(message.data);
            break;
            
        case 'task_deleted':
            handleTaskDeleted(message.data);
            break;
            
        case 'task_moved':
            handleTaskMoved(message.data);
            break;
            
        case 'tasks_cleared':
            handleTasksCleared(message.data);
            break;
            
        case 'pong':
            // Response to ping - connection is alive
            break;
            
        default:
            console.log('Unknown WebSocket message type:', message.type);
    }
}

function handleTaskCreated(taskData) {
    console.log('Task created:', taskData);
    
    // Add the new task to the appropriate column
    const container = document.querySelector(`#${taskData.status} .task-container`);
    if (container) {
        const taskElement = createTaskElement(taskData);
        container.appendChild(taskElement);
    }
}

function handleTaskUpdated(taskData) {
    console.log('Task updated:', taskData);
    
    // Find and update the existing task element
    const existingElement = document.querySelector(`[data-task-id="${taskData.id}"]`);
    if (existingElement) {
        const newElement = createTaskElement(taskData);
        existingElement.parentNode.replaceChild(newElement, existingElement);
    }
}

function handleTaskDeleted(taskData) {
    console.log('Task deleted:', taskData);
    
    // Remove the task element from the DOM
    const taskElement = document.querySelector(`[data-task-id="${taskData.id}"]`);
    if (taskElement) {
        taskElement.remove();
    }
}

function handleTaskMoved(taskData) {
    console.log('Task moved:', taskData);
    
    // Remove from current position
    const existingElement = document.querySelector(`[data-task-id="${taskData.id}"]`);
    if (existingElement) {
        existingElement.remove();
    }
    
    // Add to new position
    const container = document.querySelector(`#${taskData.status} .task-container`);
    if (container) {
        const taskElement = createTaskElement(taskData);
        container.appendChild(taskElement);
    }
}

function handleTasksCleared(data) {
    console.log('Tasks cleared:', data);
    
    // Remove all cleared task elements
    data.deleted_task_ids.forEach(taskId => {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.remove();
        }
    });
}

function updateUserInfo() {
    const userNameElement = document.getElementById('user-name');
    const userRoleElement = document.getElementById('user-role');
    
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.full_name || currentUser.username;
    }
    
    if (userRoleElement && currentUser) {
        if (currentUser.is_admin) {
            userRoleElement.textContent = 'Admin';
            userRoleElement.style.backgroundColor = '#ff9800';
        } else if (currentUser.is_active) {
            userRoleElement.textContent = 'Active User';
            userRoleElement.style.backgroundColor = '#4caf50';
        } else {
            userRoleElement.textContent = 'Inactive User';
            userRoleElement.style.backgroundColor = '#757575';
        }
    }
    
    // Update UI based on user status
    updateUIForUserStatus();
}

function updateUIForUserStatus() {
    const addTaskButton = document.getElementById('add-task-button');
    const clearDoneButton = document.getElementById('clear-done-button');
    const undoButton = document.getElementById('undo-button');
    const redoButton = document.getElementById('redo-button');
    
    const isActive = currentUser && currentUser.is_active;
    
    // Update button states
    if (addTaskButton) {
        addTaskButton.disabled = !isActive;
        addTaskButton.style.opacity = isActive ? '1' : '0.5';
        addTaskButton.title = isActive ? 'Add new task' : 'Inactive users cannot add tasks';
    }
    
    if (clearDoneButton) {
        clearDoneButton.disabled = !isActive;
        clearDoneButton.style.opacity = isActive ? '1' : '0.5';
        clearDoneButton.title = isActive ? 'Clear completed tasks' : 'Inactive users cannot clear tasks';
    }
    
    if (undoButton) {
        undoButton.disabled = !isActive;
        undoButton.style.opacity = isActive ? '1' : '0.5';
        undoButton.title = isActive ? 'Undo last action' : 'Inactive users cannot undo';
    }
    
    if (redoButton) {
        redoButton.disabled = !isActive;
        redoButton.style.opacity = isActive ? '1' : '0.5';
        redoButton.title = isActive ? 'Redo last action' : 'Inactive users cannot redo';
    }
}

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks/`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const tasks = await response.json();
            displayTasks(tasks);
        } else {
            console.error('Failed to load tasks');
        }
    } catch (error) {
        console.error('Load tasks error:', error);
    }
}

function displayTasks(tasks) {
    // Clear existing tasks
    const columns = ['todo', 'in-review', 'awaiting-documents', 'done'];
    columns.forEach(status => {
        const container = document.querySelector(`#${status} .task-container`);
        if (container) {
            container.innerHTML = '';
        }
    });
    
    // Group tasks by status
    const tasksByStatus = {
        'todo': [],
        'in-review': [],
        'awaiting-documents': [],
        'done': []
    };
    
    tasks.forEach(task => {
        if (tasksByStatus[task.status]) {
            tasksByStatus[task.status].push(task);
        }
    });
    
    // Display tasks in each column
    Object.keys(tasksByStatus).forEach(status => {
        const container = document.querySelector(`#${status} .task-container`);
        if (container) {
            tasksByStatus[status].forEach(task => {
                const taskElement = createTaskElement(task);
                container.appendChild(taskElement);
            });
        }
    });
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task';
    taskDiv.draggable = currentUser && currentUser.is_active; // Only draggable for active users
    taskDiv.dataset.taskId = task.id;
    
    // Create task content
    const clientDiv = document.createElement('div');
    clientDiv.className = 'task-client';
    clientDiv.textContent = task.client_name;
    
    const labelsDiv = document.createElement('div');
    labelsDiv.className = 'task-labels';
    
    const typeSpan = document.createElement('span');
    typeSpan.className = 'task-type';
    typeSpan.dataset.type = task.task_type.split(' ')[0];
    typeSpan.textContent = task.task_type;
    
    labelsDiv.appendChild(typeSpan);
    
    if (task.processing === 'expedited') {
        const expeditedSpan = document.createElement('span');
        expeditedSpan.className = 'task-expedited';
        expeditedSpan.textContent = 'EXPEDITED';
        labelsDiv.appendChild(expeditedSpan);
    }
    
    const addressDiv = document.createElement('div');
    addressDiv.className = 'task-address';
    addressDiv.textContent = task.address || '';
    
    taskDiv.appendChild(clientDiv);
    taskDiv.appendChild(labelsDiv);
    if (task.address) {
        taskDiv.appendChild(addressDiv);
    }
    
    // Add owner info (since all users can see all tasks)
    const ownerDiv = document.createElement('div');
    ownerDiv.className = 'task-owner';
    ownerDiv.style.fontSize = '0.8em';
    ownerDiv.style.color = 'var(--text-color)';
    ownerDiv.style.opacity = '0.7';
    ownerDiv.style.marginTop = '5px';
    ownerDiv.textContent = `Owner: ${task.owner?.full_name || task.owner?.username || 'Unknown'}`;
    taskDiv.appendChild(ownerDiv);
    
    // Add edit and delete buttons (only for active users)
    if (currentUser && currentUser.is_active) {
        const editButton = document.createElement('button');
        editButton.className = 'task-btn edit-task-btn';
        editButton.innerHTML = '✏️';
        editButton.title = 'Edit task';
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            editTask(task);
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'task-btn delete-task-btn';
        deleteButton.innerHTML = '✕';
        deleteButton.title = 'Delete task';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });
        
        taskDiv.appendChild(editButton);
        taskDiv.appendChild(deleteButton);
    }
    
    // Add drag and drop event listeners (only for active users)
    if (currentUser && currentUser.is_active) {
        taskDiv.addEventListener('dragstart', handleDragStart);
        taskDiv.addEventListener('dragend', handleDragEnd);
    }
    
    return taskDiv;
}

// Drag and drop functionality (only for active users)
function handleDragStart(e) {
    if (!currentUser || !currentUser.is_active) {
        e.preventDefault();
        return;
    }
    
    draggedElement = e.target;
    originalColumn = e.target.closest('.column');
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.target.style.opacity = '0.5';
    
    // Create placeholder element
    createDragPlaceholder(e.target);
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedElement = null;
    originalColumn = null;
    
    // Clean up placeholder
    removeDragPlaceholder();
}

function createDragPlaceholder(originalElement) {
    // Create a placeholder element that looks like the original task
    dragPlaceholder = originalElement.cloneNode(true);
    dragPlaceholder.classList.add('drag-placeholder');
    dragPlaceholder.removeAttribute('draggable');
    dragPlaceholder.removeAttribute('data-task-id');
    
    // Remove any button functionality from the placeholder
    const buttons = dragPlaceholder.querySelectorAll('button');
    buttons.forEach(btn => btn.remove());
    
    // Remove any event listeners by replacing with cloned element
    const cleanPlaceholder = dragPlaceholder.cloneNode(true);
    dragPlaceholder = cleanPlaceholder;
    
    // Initially hide the placeholder since we don't want it in the original column
    dragPlaceholder.style.display = 'none';
    
    // Place it in the original column but hidden
    const originalContainer = originalElement.closest('.task-container');
    if (originalContainer) {
        originalContainer.appendChild(dragPlaceholder);
    }
}

function removeDragPlaceholder() {
    if (dragPlaceholder && dragPlaceholder.parentNode) {
        dragPlaceholder.parentNode.removeChild(dragPlaceholder);
        dragPlaceholder = null;
    }
}

function movePlaceholderToColumn(targetColumn) {
    if (!dragPlaceholder || !targetColumn) return;
    
    // Don't show placeholder in the original column
    if (originalColumn && targetColumn === originalColumn) {
        // Hide the placeholder instead of removing it
        dragPlaceholder.style.display = 'none';
        return;
    }
    
    // Show the placeholder if it was hidden
    dragPlaceholder.style.display = 'block';
    
    const targetContainer = targetColumn.querySelector('.task-container');
    if (targetContainer) {
        // If placeholder is not in DOM yet, or in a different container, move it
        if (!dragPlaceholder.parentNode || targetContainer !== dragPlaceholder.parentNode) {
            targetContainer.appendChild(dragPlaceholder);
        }
    }
}

// Set up drop zones
document.addEventListener('DOMContentLoaded', function() {
    const columns = document.querySelectorAll('.task-container');
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('drop', handleDrop);
    });
    
    // Also add dragenter to the column headers for better UX
    const columnElements = document.querySelectorAll('.column');
    columnElements.forEach(column => {
        column.addEventListener('dragenter', handleColumnDragEnter);
    });
    
    // Add global dragend listener to ensure cleanup
    document.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('task')) {
            handleDragEnd(e);
        }
    });
});

function handleDragOver(e) {
    if (!currentUser || !currentUser.is_active) return;
    
    e.preventDefault();
}

function handleDragEnter(e) {
    if (!currentUser || !currentUser.is_active) return;
    if (!dragPlaceholder) return;
    
    e.preventDefault();
    
    const targetColumn = e.target.closest('.column');
    if (targetColumn) {
        movePlaceholderToColumn(targetColumn);
    }
}

function handleColumnDragEnter(e) {
    if (!currentUser || !currentUser.is_active) return;
    if (!dragPlaceholder) return;
    
    e.preventDefault();
    
    const targetColumn = e.target.closest('.column');
    if (targetColumn) {
        movePlaceholderToColumn(targetColumn);
    }
}

async function handleDrop(e) {
    if (!currentUser || !currentUser.is_active) return;
    
    e.preventDefault();
    
    const taskId = e.dataTransfer.getData('text/plain');
    const targetColumn = e.target.closest('.column');
    const newStatus = targetColumn.id;
    
    // Clean up placeholder before moving task
    removeDragPlaceholder();
    
    if (taskId && newStatus) {
        await moveTask(parseInt(taskId), newStatus);
    }
}

async function moveTask(taskId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}/move?new_status=${encodeURIComponent(newStatus)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            // WebSocket will handle real-time updates, no need to reload
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Failed to move task', 'error');
        }
    } catch (error) {
        console.error('Move task error:', error);
        showMessage('Failed to move task', 'error');
    }
}

// Add task functionality
function showAddTaskPanel(editMode = false, taskData = null) {
    if (!currentUser || !currentUser.is_active) {
        showMessage(editMode ? 'Inactive users cannot edit tasks' : 'Inactive users cannot add tasks', 'error');
        return;
    }
    
    if (addTaskPanel) {
        addTaskPanel.classList.add('visible');
        
        // Update panel title and button text based on mode
        const panelTitle = document.querySelector('.add-task-panel h2');
        const submitButton = document.getElementById('submit-button');
        
        if (editMode && taskData) {
            if (panelTitle) panelTitle.textContent = 'Edit Task';
            if (submitButton) submitButton.title = 'Update Task';
            populateFormWithTaskData(taskData);
        } else {
            if (panelTitle) panelTitle.textContent = 'Configure Task';
            if (submitButton) submitButton.title = 'Submit';
            // Reset edit mode
            isEditMode = false;
            editingTaskId = null;
            // Set default processing type to "Normal"
            setDefaultProcessingType();
        }
        
        document.getElementById('client-name').focus();
    }
}

function setDefaultProcessingType() {
    // Clear any existing selections
    const processingBoxes = document.querySelectorAll('.processing-box');
    processingBoxes.forEach(box => box.classList.remove('selected'));
    
    // Select "Normal" processing by default
    const normalProcessingBox = document.querySelector('.processing-box[data-processing="normal"]');
    if (normalProcessingBox) {
        normalProcessingBox.classList.add('selected');
    }
}

function hideAddTaskPanel() {
    if (addTaskPanel) {
        addTaskPanel.classList.remove('visible');
        
        // Reset edit mode
        isEditMode = false;
        editingTaskId = null;
        
        // Reset form
        const form = document.getElementById('add-task-form');
        if (form) {
            form.reset();
            resetTaskTypeSelection();
            resetProcessingSelection();
            hideMiscInput();
        }
        
        // Reset panel title and button text
        const panelTitle = document.querySelector('.add-task-panel h2');
        const submitButton = document.getElementById('submit-button');
        if (panelTitle) panelTitle.textContent = 'Configure Task';
        if (submitButton) submitButton.title = 'Submit';
    }
}

// Helper function to populate form with existing task data
function populateFormWithTaskData(task) {
    // Populate client name
    const clientNameInput = document.getElementById('client-name');
    if (clientNameInput) {
        clientNameInput.value = task.client_name || '';
    }
    
    // Populate address
    const addressInput = document.getElementById('address');
    if (addressInput) {
        addressInput.value = task.address || '';
    }
    
    // Parse and select task type
    selectTaskType(task.task_type);
    
    // Select processing type
    selectProcessingType(task.processing);
}

// Helper function to parse and select task type
function selectTaskType(taskType) {
    // Clear existing selections
    resetTaskTypeSelection();
    
    let typeToSelect = taskType;
    let miscValue = '';
    
    // Handle "Misc - CustomType" format
    if (taskType.startsWith('Misc - ')) {
        typeToSelect = 'Misc';
        miscValue = taskType.substring(7); // Remove "Misc - " prefix
    } else if (taskType === 'Misc') {
        typeToSelect = 'Misc';
    }
    
    // Select the appropriate type box
    const typeBox = document.querySelector(`.type-box[data-type="${typeToSelect}"]`);
    if (typeBox) {
        typeBox.classList.add('selected');
        
        // If it's Misc, show the input and populate it
        if (typeToSelect === 'Misc') {
            showMiscInput();
            const miscInput = document.getElementById('misc-type');
            if (miscInput) {
                miscInput.value = miscValue;
            }
        }
    }
}

// Helper function to select processing type
function selectProcessingType(processing) {
    // Clear existing selections
    const processingBoxes = document.querySelectorAll('.processing-box');
    processingBoxes.forEach(box => box.classList.remove('selected'));
    
    // Select the appropriate processing box
    const processingBox = document.querySelector(`.processing-box[data-processing="${processing}"]`);
    if (processingBox) {
        processingBox.classList.add('selected');
    }
}

async function handleAddTask(e) {
    e.preventDefault();
    
    if (!currentUser || !currentUser.is_active) {
        showMessage(isEditMode ? 'Inactive users cannot edit tasks' : 'Inactive users cannot add tasks', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const clientName = formData.get('client-name');
    const address = formData.get('address');
    
    // Get selected task type
    const selectedType = document.querySelector('.type-box.selected');
    if (!selectedType) {
        showValidationMessage('Please select a task type');
        return;
    }
    
    let taskType = selectedType.dataset.type;
    if (taskType === 'Misc') {
        const miscType = formData.get('misc-type');
        if (miscType && miscType.trim()) {
            taskType = `Misc - ${miscType.trim()}`;
        } else {
            taskType = 'Misc';
        }
    }
    
    // Get selected processing
    const selectedProcessing = document.querySelector('.processing-box.selected');
    if (!selectedProcessing) {
        showValidationMessage('Please select processing type');
        return;
    }
    
    const processing = selectedProcessing.dataset.processing;
    
    const taskData = {
        client_name: clientName,
        task_type: taskType,
        address: address || null,
        processing: processing
    };
    
    // Only add status for new tasks (edit mode preserves existing status)
    if (!isEditMode) {
        taskData.status = 'todo';
    }
    
    try {
        let response;
        let successMessage;
        
        if (isEditMode && editingTaskId) {
            // Update existing task
            response = await fetch(`${API_BASE}/tasks/${editingTaskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(taskData)
            });
            successMessage = 'Task updated successfully!';
        } else {
            // Create new task
            response = await fetch(`${API_BASE}/tasks/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(taskData)
            });
            successMessage = 'Task created successfully!';
        }
        
        if (response.ok) {
            hideAddTaskPanel();
            showMessage(successMessage, 'success');
        } else {
            const error = await response.json();
            showMessage(error.detail || `Failed to ${isEditMode ? 'update' : 'create'} task`, 'error');
        }
    } catch (error) {
        console.error(`${isEditMode ? 'Update' : 'Create'} task error:`, error);
        showMessage(`Failed to ${isEditMode ? 'update' : 'create'} task`, 'error');
    }
}

// Task type selection
function setupTaskTypeSelection() {
    const typeBoxes = document.querySelectorAll('.type-box');
    typeBoxes.forEach(box => {
        box.addEventListener('click', function() {
            // Remove selected class from all boxes
            typeBoxes.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked box
            this.classList.add('selected');
            
            // Show/hide misc input
            if (this.dataset.type === 'Misc') {
                showMiscInput();
            } else {
                hideMiscInput();
            }
        });
    });
}

function resetTaskTypeSelection() {
    const typeBoxes = document.querySelectorAll('.type-box');
    typeBoxes.forEach(box => box.classList.remove('selected'));
    hideMiscInput();
}

function showMiscInput() {
    const miscContainer = document.getElementById('misc-input-container');
    if (miscContainer) {
        miscContainer.style.display = 'block';
        document.getElementById('misc-type').focus();
    }
}

function hideMiscInput() {
    const miscContainer = document.getElementById('misc-input-container');
    if (miscContainer) {
        miscContainer.style.display = 'none';
        document.getElementById('misc-type').value = '';
    }
}

// Processing selection
function setupProcessingSelection() {
    const processingBoxes = document.querySelectorAll('.processing-box');
    processingBoxes.forEach(box => {
        box.addEventListener('click', function() {
            // Remove selected class from all boxes
            processingBoxes.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked box
            this.classList.add('selected');
        });
    });
}

function resetProcessingSelection() {
    const processingBoxes = document.querySelectorAll('.processing-box');
    processingBoxes.forEach(box => box.classList.remove('selected'));
    
    // Set "Normal" as default
    const normalProcessingBox = document.querySelector('.processing-box[data-processing="normal"]');
    if (normalProcessingBox) {
        normalProcessingBox.classList.add('selected');
    }
}

// Theme toggle
function toggleTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const theme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Delete task
async function deleteTask(taskId) {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot delete tasks', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showSuccessMessage('Task deleted successfully!');
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('Delete task error:', error);
        showMessage('Failed to delete task', 'error');
    }
}

// Edit task
function editTask(task) {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot edit tasks', 'error');
        return;
    }
    
    // Set edit mode
    isEditMode = true;
    editingTaskId = task.id;
    
    // Show the panel with edit mode
    showAddTaskPanel(true, task);
}

// Clear completed tasks
async function clearDoneTasks() {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot clear tasks', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/tasks/clear-done`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            // Check if this is a warning (no tasks to clear) or success
            const messageType = result.type === 'warning' ? 'error' : 'success';
            showMessage(result.message, messageType);
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Failed to clear completed tasks', 'error');
        }
    } catch (error) {
        console.error('Clear done tasks error:', error);
        showMessage('Failed to clear completed tasks', 'error');
    }
}

// History functions (placeholders)
function undoLastAction() {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot undo actions', 'error');
        return;
    }
    
    showMessage('Undo functionality coming soon!', 'info');
}

function redoLastAction() {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot redo actions', 'error');
        return;
    }
    
    showMessage('Redo functionality coming soon!', 'info');
}

// Utility function to show validation messages at top center
function showValidationMessage(message) {
    // Remove any existing validation messages
    const existingValidation = document.querySelector('.validation-message');
    if (existingValidation) {
        existingValidation.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'validation-message';
    messageDiv.textContent = message;
    
    // Style the message for top center positioning
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '12px 24px';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.color = 'white';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.zIndex = '10001';
    messageDiv.style.backgroundColor = '#f44336';
    messageDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.maxWidth = '400px';
    messageDiv.style.textAlign = 'center';
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 4 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 4000);
}

// Utility function to show success messages at top center
function showSuccessMessage(message) {
    // Remove any existing success messages
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message';
    messageDiv.textContent = message;
    
    // Style the message for top center positioning
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '12px 24px';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.color = 'white';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.zIndex = '10001';
    messageDiv.style.backgroundColor = '#4caf50';
    messageDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.maxWidth = '400px';
    messageDiv.style.textAlign = 'center';
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Utility function to show messages
function showMessage(message, type = 'info') {
    // Remove any existing messages of the same type
    const existingMessage = document.querySelector(`.message-${type}`);
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // Style the message for top center positioning (like validation messages)
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '12px 24px';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.color = 'white';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.zIndex = '10001';
    messageDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.maxWidth = '400px';
    messageDiv.style.textAlign = 'center';
    
    // Set background color based on type
    switch (type) {
        case 'success':
            messageDiv.style.backgroundColor = '#4caf50';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#f44336';
            break;
        case 'info':
            messageDiv.style.backgroundColor = '#2196f3';
            break;
        default:
            messageDiv.style.backgroundColor = '#757575';
    }
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}
