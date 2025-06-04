# Entrust RE Kanban Backend Setup Guide

This guide will help you set up the FastAPI backend with SQLite database and multiuser authentication for the Entrust RE Kanban Board.

## 🏗️ Backend Architecture

The backend provides:
- **FastAPI REST API** with automatic documentation
- **SQLite database** for data persistence
- **JWT-based authentication** with secure session management
- **Multiuser support** with role-based access control
- **Real estate task management** with specialized workflows
- **Audit logging** for task changes and user actions

## 🚀 Quick Setup

### 1. Prerequisites

Ensure you have Python 3.8+ installed:
```bash
python --version  # Should be 3.8 or higher
```

### 2. Environment Setup

1. **Create and activate virtual environment:**
   ```bash
   python -m venv .venv
   
   # On macOS/Linux:
   source .venv/bin/activate
   
   # On Windows:
   .venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

### 3. Database Initialization

Initialize the database and create an admin user:
```bash
python init_db.py
```

This will:
- Create SQLite database tables
- Set up an admin user interactively
- Optionally create sample tasks for testing

### 4. Start the Development Server

```bash
python run_server.py
```

The server will be available at:
- **API:** http://localhost:8000
- **Documentation:** http://localhost:8000/docs
- **Alternative docs:** http://localhost:8000/redoc
- **Health check:** http://localhost:8000/health

## 🔐 Authentication System

### User Registration

Register a new user:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "secure123",
    "full_name": "John Doe"
  }'
```

### User Login

Login to get an access token:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "secure123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Using the Token

Include the token in subsequent requests:
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📋 Task Management API

### Create a Task

```bash
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Johnson Properties",
    "task_type": "BDL",
    "address": "123 Main St, Springfield, IL",
    "processing": "normal",
    "description": "Business development loan application"
  }'
```

### Get Tasks

```bash
# Get all user tasks
curl -X GET "http://localhost:8000/api/v1/tasks/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by status
curl -X GET "http://localhost:8000/api/v1/tasks/?status=todo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get paginated results
curl -X GET "http://localhost:8000/api/v1/tasks/paginated?page=1&page_size=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Move Task Between Columns

```bash
curl -X POST "http://localhost:8000/api/v1/tasks/move" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 1,
    "new_status": "in-review"
  }'
```

### Update Task

```bash
curl -X PUT "http://localhost:8000/api/v1/tasks/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Updated Client Name",
    "processing": "expedited"
  }'
```

### Delete Task

```bash
curl -X DELETE "http://localhost:8000/api/v1/tasks/1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Task Statistics

Get comprehensive task statistics:
```bash
curl -X GET "http://localhost:8000/api/v1/tasks/stats/summary" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "total_tasks": 15,
  "completed_tasks": 8,
  "expedited_tasks": 3,
  "overdue_tasks": 2,
  "completion_rate": 53.33,
  "average_completion_time": 24.5
}
```

## 🗄️ Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `full_name`
- `hashed_password`
- `is_active` (Boolean)
- `is_admin` (Boolean)
- `created_at`, `updated_at`

### Tasks Table
- `id` (Primary Key)
- `client_name`
- `task_type` (BDL, SDL, nBDL, nPO, Misc)
- `address` (Optional)
- `processing` (normal, expedited)
- `status` (todo, in-review, awaiting-documents, done)
- `description` (Optional)
- `priority_order`
- `owner_id` (Foreign Key to Users)
- `created_at`, `updated_at`, `completed_at`
- `due_date` (Optional)

### Task History Table
- `id` (Primary Key)
- `task_id` (Foreign Key)
- `user_id` (Foreign Key)
- `action` (created, updated, deleted, moved)
- `old_values`, `new_values` (JSON)
- `timestamp`

### User Sessions Table
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `session_token`
- `expires_at`
- `created_at`, `last_activity`
- `user_agent`, `ip_address`
- `is_active` (Boolean)

## 🔧 Configuration

### Environment Variables

Edit `.env` file:

```env
# Database
DATABASE_URL=sqlite:///./kanban_board.db

# Security
SECRET_KEY=your-very-secure-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
APP_NAME=Entrust RE Kanban API
DEBUG=False

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Security Recommendations

1. **Change the SECRET_KEY** in production
2. **Use HTTPS** in production
3. **Set DEBUG=False** in production
4. **Configure proper CORS origins**
5. **Use strong passwords** for admin accounts
6. **Regularly clean up expired sessions**

## 🧪 Testing

### Manual API Testing

Use the interactive documentation at http://localhost:8000/docs to test all endpoints.

### Command Line Testing

1. **Health Check:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Get API Info:**
   ```bash
   curl http://localhost:8000/
   ```

3. **Verify Token:**
   ```bash
   curl -X GET "http://localhost:8000/api/v1/auth/verify" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

## 🚀 Production Deployment

### Using Gunicorn

1. **Install Gunicorn:**
   ```bash
   pip install gunicorn
   ```

2. **Run with Gunicorn:**
   ```bash
   gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

### Environment Configuration

For production:
1. Set `DEBUG=False`
2. Use a strong `SECRET_KEY`
3. Configure proper `ALLOWED_ORIGINS`
4. Consider using PostgreSQL instead of SQLite
5. Set up proper logging
6. Configure SSL/HTTPS

## 🔍 Troubleshooting

### Common Issues

1. **"Database locked" error:**
   - Ensure only one instance is running
   - Check file permissions on the database

2. **Authentication errors:**
   - Verify token is included in Authorization header
   - Check token hasn't expired (30 minutes default)

3. **CORS errors:**
   - Add your frontend URL to `ALLOWED_ORIGINS`
   - Ensure proper preflight handling

4. **Import errors:**
   - Verify virtual environment is activated
   - Check all dependencies are installed

### Logging

Enable debug logging by setting `DEBUG=True` in `.env`:
```env
DEBUG=True
```

This will show SQL queries and detailed error information.

## 📚 API Documentation

Once the server is running, access the comprehensive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

These provide interactive documentation where you can test all endpoints directly from the browser.

## 🤝 Contributing

When making changes to the backend:

1. **Update database models:** Modify [`backend/models.py`](backend/models.py)
2. **Add new endpoints:** Create routes in [`backend/routers/`](backend/routers/)
3. **Update schemas:** Modify [`backend/schemas.py`](backend/schemas.py)
4. **Test thoroughly:** Use the interactive docs and manual testing
5. **Update documentation:** Keep this guide and the API docs current

## 🔗 Integration with Frontend

To integrate with the existing frontend:

1. **Update frontend to use API endpoints** instead of localStorage
2. **Add authentication flow** to the frontend
3. **Handle API errors** and loading states
4. **Implement real-time updates** (optional: WebSocket support)

The backend is designed to be a drop-in replacement for the localStorage-based approach while adding multiuser capabilities and proper data persistence.