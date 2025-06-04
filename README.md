# Entrust RE Kanban Board

A specialized Kanban board application designed for managing real estate processing workflows. Built with vanilla HTML, CSS, and JavaScript for optimal performance and simplicity.

## 🚀 Features

### Task Management
- **Real Estate Task Types**: BDL, SDL, nBDL, nPO, and custom Misc categories
- **Priority Processing**: Normal and Expedited task handling with visual indicators
- **Workflow Stages**: To Do → In Review → Awaiting Documents → Done
- **Client Information**: Track client names and property addresses

### User Experience
- **Drag & Drop Interface**: Intuitive task movement between workflow columns
- **Responsive Design**: Optimized for desktop and tablet usage
- **Dark/Light Theme**: Toggle between themes with persistent preference
- **History Management**: Undo/Redo functionality for accidental deletions

### Data Management
- **Local Storage**: All data persists in browser localStorage
- **Real-time Updates**: Immediate visual feedback for all interactions
- **Task Editing**: In-place editing of existing tasks
- **Bulk Operations**: Clear completed tasks with confirmation

## 🏃‍♂️ Quick Start

### Prerequisites
- Modern web browser with JavaScript enabled
- No additional software or dependencies required

### Running the Application

1. **Clone or download the repository**:
   ```bash
   git clone <repository-url>
   cd entrust-re-kanban
   ```

2. **Open the application**:
   ```bash
   # Option 1: Open directly in browser
   open kanban-board/index.html
   
   # Option 2: Serve with a local web server (recommended)
   # Using Python 3
   python -m http.server 8000
   # Then visit: http://localhost:8000/kanban-board/
   
   # Using Node.js (if you have npx)
   npx serve kanban-board
   ```

3. **Start managing tasks**:
   - Click "Add Task" to create your first task
   - Fill in client information and select task type
   - Drag tasks between columns to update their status
   - Use the theme toggle in the top-right to switch between light/dark modes

## 📁 Project Structure

```
entrust-re-kanban/
├── README.md                 # This file
├── ARCHITECTURE.md          # Detailed technical documentation
├── .gitignore              # Git ignore rules
├── requirements.txt        # Empty (legacy file)
└── kanban-board/           # Main application directory
    ├── index.html          # Application structure and markup
    ├── script.js           # Core application logic
    └── style.css           # Styling and theme definitions
```

## 🎯 Usage Guide

### Creating Tasks

1. Click the **"Add Task"** button in the To Do column
2. Fill in the required information:
   - **Client Name**: Required field for client identification
   - **Task Type**: Select from BDL, SDL, nBDL, nPO, or Misc
   - **Address**: Optional property address
   - **Processing**: Choose Normal or Expedited priority
3. Click the ✓ button to save or ✕ to cancel

### Managing Tasks

- **Move Tasks**: Drag and drop tasks between columns to update their workflow status
- **Edit Tasks**: Click the ✎ button on any task to modify its details
- **Delete Tasks**: Click the × button to remove tasks (with undo capability)
- **Undo/Redo**: Use the ⟲ and ⟳ buttons in the top-left for deletion history

### Task Types & Processing

#### Task Types
- **BDL**: Buy Direction Letter 
- **SDL**: Sell Direction Letter
- **nBDL**: Note Buy Direction Letter
- **nPO**: Note Payoff
- **Misc**: Custom task types with optional subtypes

#### Processing Priority
- **Normal**: Standard processing timeline (gray indicator)
- **Expedited**: Priority processing (red indicator with "expedited" label)

### Theme Management

Toggle between light and dark themes using the ☀/☽ switch in the top-right corner. Your preference will be saved and restored when you return to the application.

## 💻 Development

### Code Organization

The application follows a modular architecture pattern:

- **[`index.html`](kanban-board/index.html)**: Semantic HTML structure with accessibility features
- **[`script.js`](kanban-board/script.js)**: Vanilla JavaScript with ES6+ features
- **[`style.css`](kanban-board/style.css)**: Modern CSS with custom properties for theming

### Key Technical Features

- **No Dependencies**: Pure vanilla JavaScript for maximum compatibility
- **Local Storage API**: Persistent data storage in the browser
- **CSS Custom Properties**: Dynamic theming system
- **Event Delegation**: Efficient event handling for dynamic content
- **Drag & Drop API**: Native HTML5 drag and drop implementation

### Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Required APIs**: localStorage, Drag & Drop API, CSS Custom Properties
- **Progressive Enhancement**: Core functionality works without JavaScript

### Customization

The application can be easily customized:

1. **Task Types**: Modify the type options in [`index.html`](kanban-board/index.html:20-31)
2. **Workflow Columns**: Adjust column structure in [`index.html`](kanban-board/index.html:75-104)
3. **Styling**: Update CSS custom properties in [`style.css`](kanban-board/style.css:1-29)
4. **Business Logic**: Extend functionality in [`script.js`](kanban-board/script.js)

## 📋 Data Storage

All task data is stored locally in your browser using the localStorage API:

- **Persistent**: Data survives browser restarts
- **Private**: Data never leaves your device
- **Portable**: Export/import functionality can be added for data portability

### Data Structure

Each task contains:
```javascript
{
  id: "unique-identifier",
  clientName: "Client Name",
  type: "BDL|SDL|nBDL|nPO|Misc|Misc - CustomType",
  address: "Optional address",
  processing: "normal|expedited", 
  status: "todo|in-review|awaiting-documents|done",
  createdAt: timestamp
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Tasks not saving**: Check if localStorage is enabled in your browser
2. **Drag & drop not working**: Ensure you're using a supported browser
3. **Theme not persisting**: Verify localStorage permissions
4. **Performance issues**: Clear browser cache and reload

### Data Recovery

If you encounter data issues:

1. Check browser console for error messages
2. Verify localStorage contains task data: `localStorage.getItem('allTasks')`
3. Clear corrupted data if necessary: `localStorage.clear()`

## 🚀 Future Enhancements

Potential improvements for future versions:

- **Backend Integration**: Server-side data persistence and sync
- **Multi-user Support**: Real-time collaboration features
- **Advanced Filtering**: Search and filter capabilities
- **Reporting Dashboard**: Task completion analytics
- **Mobile App**: Native mobile application
- **Data Export**: CSV/PDF export functionality

## 📖 Documentation

For detailed technical information, see [`ARCHITECTURE.md`](ARCHITECTURE.md) which includes:

- Comprehensive system architecture diagrams
- Data flow documentation  
- Component breakdown and relationships
- Performance considerations
- Security guidelines

## 🤝 Contributing

This is a specialized application for Entrust RE workflows. For modifications:

1. Review the architecture documentation
2. Test changes across supported browsers
3. Ensure accessibility compliance
4. Maintain performance standards

## 📄 License

MIT License
