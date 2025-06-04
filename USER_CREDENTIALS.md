# Entrust RE Kanban System - User Credentials

## 🔐 **Login Information**

### **System Access:**
- **Frontend URL**: http://localhost:3000
- **Backend API**: http://localhost:8000

---

## 👥 **User Accounts Created**

### **1. Admin Account**
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: admin@entrustre.com
- **Full Name**: System Administrator
- **Status**: ✅ Active
- **Role**: 🔑 Admin

### **2. Emily Pan**
- **Username**: `epan`
- **Password**: `devlogin`
- **Email**: epan@theentrustgroup.com
- **Full Name**: Emily Pan
- **Status**: ⚠️ **INACTIVE** (Cannot login)
- **Role**: 👤 User

### **3. Tim Liang**
- **Username**: `tliang`
- **Password**: `devlogin`
- **Email**: tliang@theentrustgroup.com
- **Full Name**: Tim Liang
- **Status**: ✅ Active
- **Role**: 👤 User

### **4. Irene Vann**
- **Username**: `ivann`
- **Password**: `devlogin`
- **Email**: ivann@theentrustgroup.com
- **Full Name**: Irene Vann
- **Status**: ✅ Active
- **Role**: 👤 User

### **5. Daniel Huang**
- **Username**: `dhuang`
- **Password**: `devlogin`
- **Email**: dhuang@theentrustgroup.com
- **Full Name**: Daniel Huang
- **Status**: ✅ Active
- **Role**: 👤 User

---

## 📋 **Quick Login Reference**

| Username | Password   | Status   | Role  |
|----------|------------|----------|-------|
| admin    | admin123   | Active   | Admin |
| tliang   | devlogin   | Active   | User  |
| ivann    | devlogin   | Active   | User  |
| dhuang   | devlogin   | Active   | User  |
| epan     | devlogin   | INACTIVE | User  |

---

## 🎯 **Features Available to Users:**

### **All Active Users Can:**
- ✅ Login to the Kanban system
- ✅ Create, edit, and delete their own tasks
- ✅ Move tasks between columns (Todo → In Review → Awaiting Documents → Done)
- ✅ Use all task types: BDL, SDL, nBDL, nPO, Misc
- ✅ Set processing priority: Normal or Expedited
- ✅ Add client names and addresses
- ✅ Use dark/light theme toggle
- ✅ View responsive design on mobile/tablet/desktop

### **Admin Features:**
- 🔑 Full system access
- 🔑 Can manage all users' tasks
- 🔑 Access to backend admin interface

---

## ⚠️ **Important Notes:**

1. **Emily Pan (epan)** is set as **INACTIVE** and cannot currently log in
2. All other users are **ACTIVE** and can access the system immediately
3. Each user sees only their own tasks (isolated workspaces)
4. Admin can see and manage all tasks across all users
5. All passwords are set to development defaults

---

## 🔧 **System Status:**
- ✅ Backend API running on port 8000
- ✅ Frontend application running on port 3000
- ✅ Database initialized with all users
- ✅ Authentication system fully functional
- ✅ Multi-user task isolation working
- ✅ Responsive design implemented