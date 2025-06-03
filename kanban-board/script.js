const tasks = document.querySelectorAll('.task');
const columns = document.querySelectorAll('.column');
const addTaskButton = document.getElementById('add-task-button');
const todoColumn = document.getElementById('todo');

tasks.forEach(task => {
    task.addEventListener('dragstart', () => {
        task.classList.add('dragging');
    });

    task.addEventListener('dragend', () => {
        task.classList.remove('dragging');
    });
});

columns.forEach(column => {
    column.addEventListener('dragover', event => {
        event.preventDefault();
        const draggingTask = document.querySelector('.dragging');
        const afterElement = getDragAfterElement(column, event.clientY);
        if (afterElement == null) {
            column.appendChild(draggingTask);
        } else {
            column.insertBefore(draggingTask, afterElement);
        }
    });
});

addTaskButton.addEventListener('click', () => {
    const taskName = prompt('Enter task name:');
    if (taskName) {
        const newTask = document.createElement('div');
        newTask.className = 'task';
        newTask.draggable = true;
        newTask.textContent = taskName;

        newTask.addEventListener('dragstart', () => {
            newTask.classList.add('dragging');
        });

        newTask.addEventListener('dragend', () => {
            newTask.classList.remove('dragging');
        });

        todoColumn.appendChild(newTask);
    }
});

function getDragAfterElement(column, y) {
    const draggableElements = [...column.querySelectorAll('.task:not(.dragging)')];

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