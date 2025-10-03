# Admin Panel Setup Guide

## How to Access the Admin Panel

### Creating an Admin User

Since this application uses role-based authentication, you need to have an admin role assigned to access the admin panel.

**Important:** The first user needs to be manually assigned the admin role in the database.

### Steps to Create Admin Access:

1. **Sign Up a New User**
   - Go to `/auth` and create a new account using the Sign Up tab
   - Use a valid email and password

2. **Assign Admin Role in Database**
   - Access your backend dashboard by clicking the button below:
   
   <lov-actions>
     <lov-open-backend>View Backend</lov-open-backend>
   </lov-actions>
   
   - Navigate to the **Table Editor**
   - Find the `user_roles` table
   - Click **Insert** → **Insert row**
   - Fill in:
     - `user_id`: Copy your user ID from the `profiles` table
     - `role`: Select `admin` from dropdown
   - Click **Save**

3. **Login as Admin**
   - Go to `/auth`
   - Login with your credentials
   - You'll be automatically redirected to `/admin` (admin dashboard)

### Normal Users vs Admin Users

- **Normal Users** (role: `user`): Redirected to `/dashboard`
  - Can create and manage their own projects
  - Can enter daily data in project sheets
  - Can chat with admin
  - Can view their own profile

- **Admin Users** (role: `admin`): Redirected to `/admin`
  - Can view all users
  - Can see all user chats
  - Can manage app integrations
  - Full system overview and analytics

## About the Backend (Database)

### **Important: No Node.js JSON Files**

This application **does not use Node.js with JSON files** for the backend. Instead, it uses:

**Lovable Cloud** - A powerful, cloud-based database system (powered by Supabase) that provides:

- ✅ **PostgreSQL Database**: Enterprise-grade relational database
- ✅ **Real-time subscriptions**: Live data updates
- ✅ **Row Level Security (RLS)**: Built-in data protection
- ✅ **Authentication**: Secure user management
- ✅ **Edge Functions**: Serverless backend logic
- ✅ **File Storage**: Secure file uploads

### Viewing Your Database

To view and manage your data:

<lov-actions>
  <lov-open-backend>View Backend Dashboard</lov-open-backend>
</lov-actions>

In the backend dashboard you can:
- View all tables and data
- Edit records directly
- Run SQL queries
- Monitor authentication
- Check logs and analytics
- Configure security policies

### Database Structure

Your application has these main tables:

1. **profiles** - User profile information
2. **user_roles** - Role assignments (admin/user)
3. **projects** - User projects
4. **project_data** - Daily data entries per project
5. **chat_messages** - Chat communication
6. **app_integrations** - Third-party app connections

### Why Not JSON Files?

JSON files are:
- ❌ Not scalable for multiple users
- ❌ Difficult to query and search
- ❌ No built-in security
- ❌ No real-time updates
- ❌ Risk of data corruption

Lovable Cloud provides:
- ✅ Scales automatically
- ✅ Fast queries and indexes
- ✅ Built-in security (RLS policies)
- ✅ Real-time data sync
- ✅ Automatic backups
- ✅ ACID transactions (data integrity)

## Features Implemented

### ✅ Authentication System
- Login page
- Sign up page
- Forgot password (separate page)
- Role-based routing

### ✅ Admin Dashboard
- Overview with charts
- User management
- All user chat monitoring
- App integrations

### ✅ User Dashboard  
- Personal overview
- Project management
- Google Sheets-like data entry
- Chat with admin
- Profile settings

### ✅ Design Features
- Dark/Light mode toggle (fully functional)
- Modern, responsive UI
- Professional color scheme

### ✅ AI Integration
- Gemini AI chat support (via Lovable AI)
- Streaming responses
- Edge function backend

## Next Steps

1. **Create your first admin user** (follow steps above)
2. **Login and explore** the admin panel
3. **Create test users** to see the user experience
4. **Test the chat system** between users and admin
5. **Create projects** and add daily data entries

## Need Help?

If you need to modify the database structure or add new features, you can:
1. Ask for database migrations
2. Request new RLS policies for security
3. Add new tables or columns
4. Implement additional features

The backend is fully managed and scalable - no need to worry about server setup or JSON file management!
