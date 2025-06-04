// Theme management
const themeToggle = document.getElementById('theme-toggle');

// Load saved theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.checked = savedTheme === 'dark';

// Handle theme toggle
themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// History tracking
const deletedTasks = [];
const restoredTasks = [];

// Get DOM elements
const columns = document.querySelectorAll('.column');
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button');
const clearDoneButton = document.getElementById('clear-done-button');

// Update history button states
function updateHistoryButtons() {
    undoButton.disabled = deletedTasks.length === 0;
    redoButton.disabled = restoredTasks.length === 0;
}

// Initialize button states
updateHistoryButtons();

// Create a map from status to container elements
const columnContainers = {
    'todo': document.querySelector('#todo .task-container'),
    'in-review': document.querySelector('#in-review .task-container'),
    'awaiting-documents': document.querySelector('#awaiting-documents .task-container'),
    'done': document.querySelector('#done .task-container')
};

// Load and normalize all tasks from localStorage
let allTasks = JSON.parse(localStorage.getItem('allTasks')) || [];
// Add createdAt to any existing tasks that don't have it
allTasks = allTasks.map(task => ({
    ...task,
    createdAt: task.createdAt || Date.now()
}));
localStorage.setItem('allTasks', JSON.stringify(allTasks));

// Clear all task containers (optional, if your HTML is not empty on load)
Object.values(columnContainers).forEach(container => container.innerHTML = '');

// Track tasks by ID to avoid duplicates
const uniqueTasks = new Map();

allTasks.forEach(taskData => {
    if (!uniqueTasks.has(taskData.id)) {
        uniqueTasks.set(taskData.id, taskData);

        // Find the right container based on task status, default to todo if missing/invalid
        const container = columnContainers[taskData.status] || columnContainers['todo'];

        addTaskCard(taskData, container);
    }
});

// Drag and drop handlers
columns.forEach(column => {
    // Allow dragging over column
    column.addEventListener('dragover', event => {
        event.preventDefault();
        const draggingTask = document.querySelector('.dragging');
        const afterElement = getDragAfterElement(column, event.clientY);
        if (afterElement == null) {
            column.querySelector('.task-container').appendChild(draggingTask);
        } else {
            column.querySelector('.task-container').insertBefore(draggingTask, afterElement);
        }
    });

    // When drop occurs, update task status in localStorage
    column.addEventListener('drop', (event) => {
        const draggingTask = document.querySelector('.dragging');
        if (!draggingTask) return;

        const taskId = draggingTask.dataset.id;
        if (!taskId) return;

        const newStatus = column.id;

        // Clear redo history when a new action is performed
        restoredTasks.length = 0;
        updateHistoryButtons();

        // Load all tasks
        const allTasks = JSON.parse(localStorage.getItem('allTasks')) || [];

        // Find and update the dragged task's status
        const taskIndex = allTasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            const targetContainer = column.querySelector('.task-container');
            const draggedTask = allTasks[taskIndex];
            draggedTask.status = newStatus;
            
            // Remove task card from DOM
            draggingTask.remove();
            
            // Re-add it to maintain priority order
            addTaskCard(draggedTask, targetContainer);
            
            localStorage.setItem('allTasks', JSON.stringify(allTasks));
        }
    });
});

// Task Panel Management
const taskPanel = document.getElementById('add-task-panel');
const addTaskButton = document.getElementById('add-task-button');
let editingTaskId = null;
const cancelButton = document.getElementById('cancel-button');
const submitButton = document.getElementById('submit-button');
const clientNameInput = document.getElementById('client-name');
const typeOptions = document.querySelectorAll('.type-box');
const miscInputContainer = document.getElementById('misc-input-container');
const miscTypeInput = document.getElementById('misc-type');

let selectedType = null;
let selectedProcessing = 'normal'; // Default to normal processing
let customMiscType = '';

// Show/Hide Panel
function showTaskPanel(taskData = null) {
    taskPanel.classList.add('visible');
    if (taskData) {
        // Edit mode
        editingTaskId = taskData.id;
        clientNameInput.value = taskData.clientName;
        const type = taskData.type.startsWith('Misc - ') ? 'Misc' : taskData.type;
        typeOptions.forEach(opt => {
            if (opt.dataset.type === type) {
                opt.click();
                if (type === 'Misc') {
                    miscTypeInput.value = taskData.type.replace('Misc - ', '');
                }
            }
        });
    } else {
        // Add mode
        editingTaskId = null;
        clientNameInput.value = '';
        selectedType = null;
        miscTypeInput.value = '';
        selectedProcessing = 'normal';
        typeOptions.forEach(opt => opt.classList.remove('selected'));
        document.querySelectorAll('.processing-box').forEach(box => {
            box.classList.remove('selected');
        });
        document.querySelector('.processing-box[data-processing="normal"]').classList.add('selected');
        miscInputContainer.style.display = 'none';
    }
}

function hideTaskPanel() {
    taskPanel.classList.remove('visible');
    editingTaskId = null;
}

// Add Task Button Click
addTaskButton.addEventListener('click', () => showTaskPanel());

// Cancel Button Click
cancelButton.addEventListener('click', hideTaskPanel);

// Type and Processing Selection
typeOptions.forEach(option => {
    option.addEventListener('click', () => {
        typeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedType = option.dataset.type;
        
        if (selectedType === 'Misc') {
            miscInputContainer.style.display = 'block';
            miscTypeInput.focus();
        } else {
            miscInputContainer.style.display = 'none';
            customMiscType = '';
        }
    });
});

// Processing type selection
document.querySelectorAll('.processing-box').forEach(box => {
    box.addEventListener('click', () => {
        document.querySelectorAll('.processing-box').forEach(b => b.classList.remove('selected'));
        box.classList.add('selected');
        selectedProcessing = box.dataset.processing;
    });
});

// Track Misc type input
miscTypeInput.addEventListener('input', (e) => {
    customMiscType = e.target.value.trim();
});

// Submit Button Click
submitButton.addEventListener('click', (event) => {
    event.preventDefault();
    const clientName = clientNameInput.value.trim();

    if (clientName && selectedType) {
        const existingTasks = JSON.parse(localStorage.getItem('allTasks')) || [];
        
        if (editingTaskId) {
            // Update existing task
            const taskIndex = existingTasks.findIndex(task => task.id === editingTaskId);
            if (taskIndex !== -1) {
                const updatedTask = {
                    ...existingTasks[taskIndex],
                    clientName,
                    type: selectedType === 'Misc' && customMiscType ? `Misc - ${customMiscType}` : selectedType,
                    processing: selectedProcessing
                };
                existingTasks[taskIndex] = updatedTask;
                
                // Update UI
                const oldTaskElement = document.querySelector(`[data-id="${editingTaskId}"]`);
                if (oldTaskElement) {
                    const container = oldTaskElement.closest('.task-container');
                    oldTaskElement.remove();
                    addTaskCard(updatedTask, container);
                }
            }
        } else {
            // Add new task
            const newTask = {
                id: crypto.randomUUID(),
                clientName,
                type: selectedType === 'Misc' && customMiscType ? `Misc - ${customMiscType}` : selectedType,
                processing: selectedProcessing,
                status: 'todo',
                createdAt: Date.now()
            };
            existingTasks.push(newTask);
            
            // Add to UI
            const container = columnContainers['todo'];
            addTaskCard(newTask, container);
        }
        
        // Save to localStorage
        localStorage.setItem('allTasks', JSON.stringify(existingTasks));
        
        // Hide the panel
        hideTaskPanel();
    } else {
        alert('Please enter a client name and type.');
    }
});

// Helper to create and insert a task card
function addTaskCard(taskData, container) {
    const newCard = document.createElement('div');
    newCard.className = 'task';
    newCard.draggable = true;
    newCard.dataset.id = taskData.id;

    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'task-btn edit-task-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = 'Edit task';

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showTaskPanel(taskData);
    });
    
    // Clear Done Column
    clearDoneButton.addEventListener('click', () => {
        // Get all tasks from localStorage
        let allTasks = JSON.parse(localStorage.getItem('allTasks')) || [];
        
        // Find all tasks in the Done column
        const doneTasks = allTasks.filter(task => task.status === 'done');
        
        // Store tasks in delete history
        doneTasks.forEach(task => {
            deletedTasks.push({...task});
        });
        
        // Remove Done tasks from localStorage
        allTasks = allTasks.filter(task => task.status !== 'done');
        localStorage.setItem('allTasks', JSON.stringify(allTasks));
        
        // Clear the Done column in UI
        columnContainers['done'].innerHTML = '';
        
        // Clear redo history when a new action is performed
        restoredTasks.length = 0;
        
        // Update history buttons
        updateHistoryButtons();
    });

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-btn delete-task-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete task';

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Clear redo history when a new action is performed
        restoredTasks.length = 0;
        
        // Store the task's current state before deletion
        const taskState = {
            ...taskData,
            status: newCard.closest('.column')?.id || 'todo'
        };
        deletedTasks.push(taskState);
        
        // Remove from localStorage
        let allTasks = JSON.parse(localStorage.getItem('allTasks')) || [];
        allTasks = allTasks.filter(task => task.id !== taskData.id);
        localStorage.setItem('allTasks', JSON.stringify(allTasks));
        
        // Remove from DOM
        newCard.remove();
        
        updateHistoryButtons();
    });

    // Card content
    newCard.innerHTML = `
        <h3 class="task-client">${taskData.clientName}</h3>
        <span class="task-type" data-type="${taskData.type.split(' - ')[0]}">${taskData.type}</span>
        ${taskData.processing === 'expedited' ? '<span class="task-expedited">expedited</span>' : ''}
    `;
    newCard.appendChild(editBtn);
    newCard.appendChild(deleteBtn);

    newCard.addEventListener('dragstart', () => {
        newCard.classList.add('dragging');
    });

    newCard.addEventListener('dragend', () => {
        newCard.classList.remove('dragging');
    });

    // Insert card in correct position based on priority
    const existingCards = Array.from(container.children);
    const insertIndex = existingCards.findIndex(card => {
        const cardTask = JSON.parse(localStorage.getItem('allTasks')).find(t => t.id === card.dataset.id);
        if (!cardTask) return true; // Place at end if task not found
        
        // Expedited tasks come before normal tasks
        if (taskData.processing === 'expedited' && cardTask.processing !== 'expedited') return true;
        if (taskData.processing !== 'expedited' && cardTask.processing === 'expedited') return false;
        
        // Within same processing type, sort by creation time (FIFO)
        return taskData.createdAt < cardTask.createdAt;
    });

    if (insertIndex === -1) {
        container.appendChild(newCard);
    } else {
        container.insertBefore(newCard, existingCards[insertIndex]);
    }
}

// Undo delete
undoButton.addEventListener('click', () => {
    if (deletedTasks.length === 0) return;

    const taskToRestore = deletedTasks.pop();
    restoredTasks.push(taskToRestore);

    // Add back to localStorage
    const allTasks = JSON.parse(localStorage.getItem('allTasks')) || [];
    allTasks.push(taskToRestore);
    localStorage.setItem('allTasks', JSON.stringify(allTasks));

    // Add back to UI
    const container = columnContainers[taskToRestore.status] || columnContainers['todo'];
    addTaskCard(taskToRestore, container);

    updateHistoryButtons();
});

// Redo delete
redoButton.addEventListener('click', () => {
    if (restoredTasks.length === 0) return;

    const taskToDelete = restoredTasks.pop();
    deletedTasks.push(taskToDelete);

    // Remove from localStorage
    let allTasks = JSON.parse(localStorage.getItem('allTasks')) || [];
    allTasks = allTasks.filter(task => task.id !== taskToDelete.id);
    localStorage.setItem('allTasks', JSON.stringify(allTasks));

    // Remove from UI
    const taskElement = document.querySelector(`[data-id="${taskToDelete.id}"]`);
    if (taskElement) {
        taskElement.remove();
    }

    updateHistoryButtons();
});

// Helper to determine where to insert the dragged element
function getDragAfterElement(column, y) {
    const draggableElements = [...column.querySelectorAll('.task-container .task:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
