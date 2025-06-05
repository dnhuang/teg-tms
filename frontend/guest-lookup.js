/**
 * Guest Task Lookup JavaScript
 * Handles task status lookup for guest users
 */

const API_BASE_URL = 'https://teg-tms.onrender.com/api/v1';

// DOM Elements
const lookupForm = document.getElementById('guest-lookup-form');
const taskIdInput = document.getElementById('task-id');
const lookupBtn = document.getElementById('lookup-btn');
const buttonText = document.querySelector('.button-text');
const buttonLoader = document.querySelector('.button-loader');
const errorMessage = document.getElementById('error-message');
const statusModal = document.getElementById('status-modal');
const modalTaskId = document.getElementById('modal-task-id');
const modalStatusMessage = document.getElementById('modal-status-message');
const statusOkBtn = document.getElementById('status-ok-btn');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    focusTaskIdInput();
});

function setupEventListeners() {
    // Form submission
    lookupForm.addEventListener('submit', handleFormSubmit);
    
    // Modal OK button
    statusOkBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    statusModal.addEventListener('click', function(e) {
        if (e.target === statusModal) {
            closeModal();
        }
    });
    
    // Task ID input formatting
    taskIdInput.addEventListener('input', formatTaskIdInput);
    taskIdInput.addEventListener('paste', handlePaste);
    
    // Enter key on modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && statusModal.style.display === 'flex') {
            closeModal();
        }
    });
}

function focusTaskIdInput() {
    taskIdInput.focus();
}

function formatTaskIdInput(e) {
    let value = e.target.value.toUpperCase();
    
    // Remove any characters that aren't letters, numbers, or hyphens
    value = value.replace(/[^A-Z0-9-]/g, '');
    
    // Handle different input scenarios
    if (value.length === 0) {
        // Empty input - leave it empty
        e.target.value = '';
        clearError();
        return;
    }
    
    // If user is backspacing and we have less than 3 characters, allow it
    if (value.length < 3 && !value.startsWith('RE-')) {
        e.target.value = value;
        clearError();
        return;
    }
    
    // Ensure it starts with RE- for inputs of 3+ characters
    if (value.length >= 3 && !value.startsWith('RE-')) {
        if (value.startsWith('RE')) {
            // User typed "RE" - add the hyphen
            value = 'RE-' + value.slice(2);
        } else if (value.startsWith('R')) {
            // User typed "R" followed by other chars - reconstruct
            value = 'RE-' + value.slice(1);
        } else {
            // User started typing the code directly - add RE- prefix
            value = 'RE-' + value;
        }
    }
    
    // Limit to RE-XXXXXX format (9 characters total: "RE-" + 6 chars)
    if (value.length > 9) {
        value = value.slice(0, 9);
    }
    
    e.target.value = value;
    clearError();
}

function handlePaste(e) {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().toUpperCase();
    
    // Extract task ID from pasted text
    let taskId = pasteData;
    
    // If it contains RE-, extract just the RE-XXXXXX part
    const reMatch = pasteData.match(/RE-[A-Z0-9]{6}/);
    if (reMatch) {
        taskId = reMatch[0];
    } else if (pasteData.match(/^[A-Z0-9]{6}$/)) {
        // If it's just the 6-character code, add RE-
        taskId = 'RE-' + pasteData;
    }
    
    taskIdInput.value = taskId;
    clearError();
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const taskId = taskIdInput.value.trim();
    
    if (!validateTaskId(taskId)) {
        showError('Please enter a valid task ID in the format RE-XXXXXX');
        return;
    }
    
    // Extract the 6-character custom ID (remove RE- prefix)
    const customId = taskId.slice(3);
    
    await lookupTaskStatus(customId);
}

function validateTaskId(taskId) {
    const pattern = /^RE-[A-Z0-9]{6}$/;
    return pattern.test(taskId) && taskId.length === 9;
}

async function lookupTaskStatus(customId) {
    console.log(`DEBUG Frontend: Looking up custom_id: '${customId}' (length: ${customId.length})`);
    
    setLoading(true);
    clearError();
    
    try {
        const url = `${API_BASE_URL}/guest/task-status/${customId}`;
        console.log(`DEBUG Frontend: Making request to URL: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        console.log(`DEBUG Frontend: Response status: ${response.status}`);
        
        const data = await response.json();
        console.log(`DEBUG Frontend: Response data:`, data);
        
        if (response.ok) {
            showStatusModal(data.task_id, data.message, data.status);
        } else {
            // Handle API errors
            const errorMsg = data.detail || 'An error occurred while looking up your task';
            console.log(`DEBUG Frontend: API Error: ${errorMsg}`);
            showError(errorMsg);
        }
        
    } catch (error) {
        console.error('Lookup error:', error);
        showError('Unable to connect to the server. Please try again later.');
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    lookupBtn.disabled = isLoading;
    
    if (isLoading) {
        buttonText.style.display = 'none';
        buttonLoader.style.display = 'inline-block';
    } else {
        buttonText.style.display = 'inline';
        buttonLoader.style.display = 'none';
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        clearError();
    }, 5000);
}

function clearError() {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
}

function showStatusModal(taskId, message, status) {
    modalTaskId.textContent = taskId;
    modalStatusMessage.innerHTML = message;
    
    // Reset to base class
    modalStatusMessage.className = 'status-message';
    
    statusModal.style.display = 'flex';
    statusOkBtn.focus();
}

function closeModal() {
    statusModal.style.display = 'none';
    // Clear the form and refocus for another lookup
    taskIdInput.value = '';
    taskIdInput.focus();
}

// Prevent form submission on Enter in input field (handled by form submit)
taskIdInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        lookupForm.dispatchEvent(new Event('submit'));
    }
});