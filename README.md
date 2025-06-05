# TEG Task Management System

A comprehensive task management system designed specifically for real estate processing workflows at The Entrust Group. Built with FastAPI backend, PostgreSQL database, and modern JavaScript frontend.

## 🌐 Live Application

### **Production Access:**
- **Staff Portal**: https://teg-tms.onrender.com/
- **Client Lookup**: https://teg-tms.onrender.com/guest-lookup.html
- **API Health**: https://teg-tms.onrender.com/api/v1/health

## 🚀 Features

### Task Management
- **Real Estate Task Types**: BDL, SDL, nBDL, nPO, and custom Misc categories
- **Priority Processing**: Normal and Expedited task handling with visual indicators
- **Workflow Stages**: To Do → In Review → Awaiting Documents → Done
- **Client Information**: Track client names and property addresses
- **Custom Task IDs**: Auto-generated RE-XXXXXX format for client reference

### User Management & Security
- **Multi-user Authentication**: Secure login with role-based permissions
- **User Roles**: Admin, Active Users, and Inactive (Read-only) Users
- **JWT Authentication**: Secure session management
- **Permission Controls**: Active users can create/edit/move tasks, inactive users view only

### Real-time Collaboration
- **WebSocket Updates**: Real-time task updates across all connected users
- **Live Notifications**: Instant feedback when tasks are created, moved, or deleted
- **Concurrent Editing**: Multiple users can work simultaneously

### Client Experience
- **Guest Task Lookup**: Clients can check task status using RE-XXXXXX IDs
- **No Login Required**: Simple status checking without account creation
- **Professional Interface**: Clean, branded experience for client interactions

### Data Management
- **PostgreSQL Database**: Production-grade data persistence
- **Task History**: Complete audit trail of all task changes
- **Automatic Backups**: Database backups and redundancy
- **FIFO Ordering**: Tasks ordered by priority (expedited first) then creation time

## 🏗️ Technology Stack

### Production Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Security**: HTTPS, JWT tokens, bcrypt password hashing

### Key Components
- **Authentication System**: Secure user management with JWT
- **WebSocket Manager**: Real-time updates and notifications
- **Task Engine**: CRUD operations with permission checking
- **Guest API**: Public endpoint for task status lookup
- **Static File Server**: Integrated frontend serving

## 📁 Project Structure

```
teg-tms/
├── README.md                    # This file
├── ARCHITECTURE.md             # System design documentation
├── requirements.txt            # Python dependencies
├── render.yaml                 # Cloud deployment configuration
├── render_start.py             # Production startup script
├── serve_frontend.py           # Local development server
├── init_db.py                  # Database initialization script
├── run_server.py               # Local development runner
├── .env.example                # Environment variables template
├── backend/                    # FastAPI backend
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── config.py               # Configuration management
│   ├── database.py             # Database connection and setup
│   ├── models.py               # SQLAlchemy data models
│   ├── schemas.py              # Pydantic data schemas
│   ├── auth.py                 # Authentication utilities
│   ├── utils.py                # Utility functions
│   ├── websocket_manager.py    # Real-time communication
│   └── routers/                # API route handlers
│       ├── __init__.py
│       ├── auth.py             # Authentication endpoints
│       ├── tasks.py            # Task management endpoints
│       ├── websocket.py        # WebSocket endpoints
│       └── guest.py            # Public guest endpoints
└── frontend/                   # Web interface
    ├── index.html              # Main application interface
    ├── script.js               # Application logic and API calls
    ├── style.css               # Styling and responsive design
    ├── guest-lookup.html       # Client task lookup page
    └── guest-lookup.js         # Guest lookup functionality
```

## 🎯 Usage Guide

### For Staff Members

#### **Accessing the System**
1. Visit https://teg-tms.onrender.com/
2. Login with your assigned credentials
3. Begin managing tasks immediately

#### **Creating Tasks**
1. Click **"Add Task"** button
2. Fill in required information:
   - **Client Name**: Required for identification
   - **Task Type**: BDL, SDL, nBDL, nPO, or custom Misc
   - **Address**: Optional property address
   - **Processing**: Normal or Expedited priority
3. Task automatically receives unique RE-XXXXXX ID
4. Share task ID with client for status tracking

#### **Managing Tasks**
- **Move Tasks**: Drag between columns or use dropdown menu
- **Edit Tasks**: Click edit button (active users only)
- **Delete Tasks**: Click delete button (active users only)
- **Real-time Updates**: See changes from other users instantly

#### **User Permissions**
- **Admin**: Full system access, user management
- **Active Users**: Create, edit, move, delete tasks
- **Inactive Users**: View-only access to all tasks

### For Clients

#### **Checking Task Status**
1. Visit https://teg-tms.onrender.com/guest-lookup.html
2. Enter your task ID (format: RE-XXXXXX)
3. View current status and stage information
4. No account or login required

## 💻 Development

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/teg-tms.git
   cd teg-tms
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local database settings
   ```

4. **Initialize database**:
   ```bash
   python init_db.py
   ```

5. **Run the application**:
   ```bash
   # Option 1: Using the run script
   python run_server.py
   
   # Option 2: Direct uvicorn command
   python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   
   # Option 3: Serve frontend separately (for development)
   python serve_frontend.py  # In another terminal
   ```

6. **Access locally**:
   - Frontend: http://localhost:3000 (if using serve_frontend.py)
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Database Management

#### **Local Development**
- Uses SQLite by default (`kanban_board.db` file)
- Automatically created on first run
- Initialize with: `python init_db.py`

#### **Production**
- PostgreSQL database
- Connection via environment variables
- User creation via SQL scripts

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://...  # Production
SQLITE_URL=sqlite:///./kanban.db  # Development

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# Application
ENVIRONMENT=development
DEBUG=true
APP_NAME=TEG Task Management System API
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8000"]
```

### API Documentation

When running in development mode (`DEBUG=true`), API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Database Setup

### User Management

Users can be managed through:
- **Database scripts**: Use provided Python/SQL scripts
- **Direct database access**: PostgreSQL admin tools
- **Future enhancement**: Web-based admin interface

## 📊 System Monitoring

### Health Checks
- **Application**: https://teg-tms.onrender.com/api/v1/health
- **Local Development**: http://localhost:8000/api/v1/health

### Performance
- **Response Time**: Optimized for <500ms typical operations
- **Concurrent Users**: Supports multiple simultaneous users
- **Real-time Updates**: WebSocket connections for live collaboration

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Secure session management
- **bcrypt Hashing**: Industry-standard password protection
- **Role-based Access**: Granular permission control
- **HTTPS**: All communication encrypted

### Data Protection
- **Input Validation**: All user inputs sanitized
- **SQL Injection Prevention**: Parameterized queries with SQLAlchemy
- **XSS Protection**: Content Security Policy headers
- **CORS Configuration**: Controlled cross-origin requests

## 🚀 Key Files

### Backend Core Files
- **`backend/main.py`**: FastAPI application setup and configuration
- **`backend/models.py`**: Database models (User, Task, TaskHistory)
- **`backend/auth.py`**: Authentication utilities and JWT handling
- **`backend/routers/tasks.py`**: Task CRUD operations and business logic
- **`backend/websocket_manager.py`**: Real-time communication management

### Frontend Core Files
- **`frontend/index.html`**: Main application interface and structure
- **`frontend/script.js`**: Task management logic and API integration
- **`frontend/guest-lookup.html`**: Client self-service interface
- **`frontend/style.css`**: Responsive design and theming

### Configuration Files
- **`requirements.txt`**: Python package dependencies
- **`render.yaml`**: Cloud deployment configuration
- **`.env.example`**: Environment variable template
- **`render_start.py`**: Production startup script

## 🤝 Support & Maintenance

### Getting Help
- **Technical Issues**: Check application health endpoints and logs
- **User Questions**: Refer to this documentation
- **Feature Requests**: Contact system administrator

### Maintenance Tasks
- **User Management**: Use provided scripts for user creation/management
- **Database Maintenance**: Regular backups and performance monitoring
- **Security Updates**: Keep dependencies updated and monitor for vulnerabilities

## 📖 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)**: System design and technical details
- **API Documentation**: Available at `/docs` endpoint in development mode

## 📄 License

Proprietary software for The Entrust Group internal use.
