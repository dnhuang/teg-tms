// Global variables
let currentUser = null;
let authToken = localStorage.getItem('auth_token');
let taskHistory = [];
let historyIndex = -1;
let dragPlaceholder = null;
let draggedElement = null;

// API configuration
const API_BASE = 'http://localhost:8000/api/v1';

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
    
    // Load tasks
    loadTasks();
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
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.target.style.opacity = '0.5';
    
    // Create placeholder element
    createDragPlaceholder(e.target);
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedElement = null;
    
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
    
    // Initially place it in the original column
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
    
    const targetContainer = targetColumn.querySelector('.task-container');
    if (targetContainer && targetContainer !== dragPlaceholder.parentNode) {
        targetContainer.appendChild(dragPlaceholder);
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
            loadTasks(); // Reload tasks to reflect the change
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
function showAddTaskPanel() {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot add tasks', 'error');
        return;
    }
    
    if (addTaskPanel) {
        addTaskPanel.classList.add('visible');
        // Set default processing type to "Normal"
        setDefaultProcessingType();
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
        
        // Reset form
        const form = document.getElementById('add-task-form');
        if (form) {
            form.reset();
            resetTaskTypeSelection();
            resetProcessingSelection();
            hideMiscInput();
        }
    }
}

async function handleAddTask(e) {
    e.preventDefault();
    
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot add tasks', 'error');
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
        processing: processing,
        status: 'todo'
    };
    
    try {
        const response = await fetch(`${API_BASE}/tasks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            hideAddTaskPanel();
            loadTasks();
            showMessage('Task created successfully!', 'success');
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Failed to create task', 'error');
        }
    } catch (error) {
        console.error('Create task error:', error);
        showMessage('Failed to create task', 'error');
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
            loadTasks();
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

// Edit task (placeholder - would need edit form)
function editTask(task) {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot edit tasks', 'error');
        return;
    }
    
    showMessage('Edit functionality coming soon!', 'info');
}

// Clear completed tasks
async function clearDoneTasks() {
    if (!currentUser || !currentUser.is_active) {
        showMessage('Inactive users cannot clear tasks', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to clear all completed tasks?')) {
        return;
    }
    
    // This would need a backend endpoint to clear done tasks
    showMessage('Clear functionality coming soon!', 'info');
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
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.padding = '12px 20px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.color = 'white';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.zIndex = '10000';
    messageDiv.style.maxWidth = '300px';
    
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
