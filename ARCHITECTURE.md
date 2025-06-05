# TEG Task Management System - Architecture Documentation

## Table of Contents
- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Component Overview](#component-overview)
- [Data Flow](#data-flow)
- [User Experience](#user-experience)
- [Security & Authentication](#security--authentication)
- [Deployment Architecture](#deployment-architecture)

## System Overview

The TEG Task Management System is a modern web application designed for managing real estate processing workflows at The Entrust Group. It provides a collaborative Kanban-style interface with real-time updates, user authentication, and client self-service capabilities.

### Key Features
- **Multi-user Collaboration**: Real-time task updates across all connected users
- **Role-based Access**: Admin, Active Users, and Read-only User permissions
- **Real Estate Workflows**: Specialized for BDL, SDL, nBDL, nPO task types
- **Client Self-Service**: Public task status lookup without login required
- **Professional Deployment**: Production-ready with automatic backups and SSL

## Technology Stack

### Production Stack
- **Frontend**: Modern JavaScript, HTML5, CSS3
- **Backend**: FastAPI (Python) with async support
- **Database**: PostgreSQL with automatic backups
- **Hosting**: Render Cloud Platform
- **Security**: JWT authentication, HTTPS, bcrypt password hashing

### Key Benefits
- **Scalable**: Cloud-native architecture supports growth
- **Reliable**: Production database with automatic backups
- **Secure**: Industry-standard authentication and encryption
- **Fast**: Real-time updates via WebSocket connections

## System Architecture

```mermaid
graph TB
    subgraph "Client Browsers"
        A[Staff Web App<br/>Task Management]
        B[Client Lookup<br/>Status Check]
    end
    
    subgraph "Render Cloud Platform"
        subgraph "Web Service"
            C[FastAPI Backend<br/>Authentication & API]
            D[Static File Server<br/>Frontend Assets]
        end
        
        subgraph "Database Service"
            E[PostgreSQL<br/>User & Task Data]
        end
        
        subgraph "Security Layer"
            F[HTTPS/SSL<br/>Encryption]
            G[JWT Tokens<br/>Authentication]
        end
    end
    
    A -.->|HTTPS| F
    B -.->|HTTPS| F
    F --> C
    F --> D
    C --> E
    C -.->|WebSocket| A
    G -.->|Validates| C
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e9
    style E fill:#fff3e0
```

## Component Overview

### Frontend Components

#### **Staff Interface** (`frontend/index.html` & `frontend/script.js`)
- **Purpose**: Main task management interface for staff members
- **Features**: Drag-and-drop Kanban board, real-time updates, task creation/editing
- **Users**: All authenticated staff (Admin, Active, Inactive users)

#### **Client Lookup** (`frontend/guest-lookup.html` & `frontend/guest-lookup.js`)
- **Purpose**: Public task status checking for clients
- **Features**: Simple search by task ID, no login required
- **Users**: Clients and external parties

### Backend Components

#### **Authentication System** (`backend/routers/auth.py`)
- **Purpose**: User login, session management, security
- **Features**: JWT tokens, password hashing, role-based permissions
- **Security**: bcrypt password hashing, secure session management

#### **Task Management** (`backend/routers/tasks.py`)
- **Purpose**: Core task operations (create, read, update, delete, move)
- **Features**: Permission checking, task validation, status updates
- **Integration**: Real-time WebSocket notifications

#### **WebSocket Manager** (`backend/websocket_manager.py`)
- **Purpose**: Real-time communication between users
- **Features**: Live task updates, user notifications, connection management
- **Benefits**: Instant collaboration without page refreshes

#### **Guest Services** (`backend/routers/guest.py`)
- **Purpose**: Public API for client task lookup
- **Features**: Task status by ID, no authentication required
- **Security**: Read-only access, rate limiting

### Database Design

#### **Users Table**
- User accounts with roles (Admin, Active, Inactive)
- Secure password storage with bcrypt
- Full name, email, and permission settings

#### **Tasks Table**
- Task details (client, type, address, priority)
- Workflow status tracking (To Do → In Review → Awaiting Documents → Done)
- Custom ID generation (RE-XXXXXX format)
- Audit timestamps and ownership

#### **Session Management**
- JWT token validation
- Session tracking and security
- User activity monitoring

## Data Flow

### User Authentication Flow
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /auth/login
    Backend->>Database: Verify user & password
    Database-->>Backend: User data
    Backend->>Backend: Generate JWT token
    Backend-->>Frontend: Return token & user info
    Frontend->>Frontend: Store token & redirect to app
    Frontend-->>User: Show task board
```

### Real-time Task Updates
```mermaid
sequenceDiagram
    participant User1 as Staff User 1
    participant User2 as Staff User 2
    participant Backend
    participant Database
    
    User1->>Backend: Move task to "In Review"
    Backend->>Database: Update task status
    Database-->>Backend: Confirm update
    Backend->>Backend: Broadcast via WebSocket
    Backend-->>User1: Update confirmation
    Backend-->>User2: Real-time task update
    User2->>User2: UI updates automatically
```

### Client Task Lookup
```mermaid
sequenceDiagram
    participant Client
    participant Frontend
    participant Backend
    participant Database
    
    Client->>Frontend: Enter task ID (RE-XXXXXX)
    Frontend->>Backend: GET /guest/task-status/{id}
    Backend->>Database: Query task by custom_id
    Database-->>Backend: Task status & details
    Backend-->>Frontend: Status message
    Frontend-->>Client: Display current status
```

## User Experience

### Staff Workflow
1. **Login**: Secure authentication with role-based access
2. **Dashboard**: View all tasks organized by workflow stage
3. **Task Management**: Create, edit, move, and delete tasks
4. **Collaboration**: See real-time updates from other team members
5. **Client Communication**: Share task IDs for client status checking

### Client Experience
1. **Access**: Visit public lookup page (no account needed)
2. **Search**: Enter task ID received from staff
3. **Status**: View current workflow stage and details
4. **Updates**: Return anytime to check progress

### Permission Levels
- **Admin**: Full system access, user management capabilities
- **Active Users**: Create, edit, move, and delete tasks
- **Inactive Users**: View-only access to all tasks
- **Guests/Clients**: Public task status lookup only

## Security & Authentication

### Authentication Security
```mermaid
graph LR
    A[User Login] --> B[Password Verification]
    B --> C[JWT Token Generation]
    C --> D[Token Validation]
    D --> E[API Access Granted]
    
    F[Password Storage] --> G[bcrypt Hashing]
    G --> H[Secure Database]
    
    style G fill:#ffcdd2
    style C fill:#c8e6c9
    style H fill:#fff3e0
```

### Security Features
- **HTTPS Only**: All communication encrypted in transit
- **JWT Tokens**: Secure, stateless session management
- **bcrypt Hashing**: Industry-standard password protection
- **Role-based Access**: Granular permission control
- **Input Validation**: Prevents injection attacks and data corruption

### Data Protection
- **Database Backups**: Automatic daily backups via Render
- **Access Logs**: Track user activity and API usage
- **Environment Variables**: Secure configuration management
- **CORS Policy**: Controlled cross-origin requests

## Deployment Architecture

### Render Platform Services
```mermaid
graph TB
    subgraph "Render Cloud"
        subgraph "Web Service (teg-tms)"
            A[FastAPI Application]
            B[Static File Serving]
            C[Health Monitoring]
        end
        
        subgraph "Database Service (teg-tms-db)"
            D[PostgreSQL Database]
            E[Automatic Backups]
            F[Connection Pooling]
        end
        
        subgraph "Platform Services"
            G[SSL Certificate Management]
            H[Load Balancing]
            I[Auto-scaling]
        end
    end
    
    J[GitHub Repository] -->|Auto Deploy| A
    A --> D
    G --> A
    H --> A
    
    style A fill:#e8f5e9
    style D fill:#fff3e0
    style G fill:#ffcdd2
```

### Deployment Process
1. **Code Push**: Developers push changes to GitHub main branch
2. **Auto Deploy**: Render detects changes and starts deployment
3. **Build Process**: Install dependencies and prepare application
4. **Health Check**: Verify application and database connectivity
5. **Go Live**: Switch traffic to new deployment
6. **Monitoring**: Continuous health monitoring and logging

### Production Benefits
- **Zero Downtime**: Rolling deployments with health checks
- **Automatic Scaling**: Handles traffic spikes automatically
- **Monitoring**: Real-time performance and error tracking
- **Backups**: Daily database backups with point-in-time recovery
- **SSL**: Automatic certificate management and renewal

---

## Monitoring & Maintenance

### Health Monitoring
- **Application Health**: `/api/v1/health` endpoint for system status
- **Database Health**: Connection and query performance monitoring
- **User Activity**: Track login patterns and usage statistics

### Performance Optimization
- **Database Indexing**: Optimized queries for task retrieval
- **WebSocket Management**: Efficient real-time connection handling
- **Static File Caching**: Optimized frontend asset delivery
- **Connection Pooling**: Efficient database resource usage

### Maintenance Tasks
- **User Management**: Add/remove users via database scripts
- **Database Cleanup**: Archive old completed tasks
- **Security Updates**: Regular dependency updates
- **Performance Monitoring**: Track response times and resource usage

## Future Enhancements

### Planned Features
- **User Management UI**: Web interface for admin user management
- **Advanced Reporting**: Task completion analytics and dashboards
- **Email Notifications**: Automated status updates to clients
- **Mobile Application**: Native mobile app for field staff
- **Document Management**: File upload and attachment support

### Scalability Improvements
- **Caching Layer**: Redis for improved performance
- **CDN Integration**: Faster global content delivery
- **Database Optimization**: Advanced indexing and query optimization
- **Multi-region Deployment**: Geographic distribution for better performance