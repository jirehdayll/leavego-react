# LeaveGo React Application - Structure & Technology Stack

## 🏗️ **Website Architecture**

### **Frontend Framework**
- **React 18** - Modern component-based UI framework
- **Vite** - Fast build tool and development server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### **Backend Services**
- **Supabase** - Backend-as-a-Service (BaaS)
  - Authentication (Auth)
  - Database (PostgreSQL)
  - Real-time subscriptions
  - File storage
  - Edge functions

### **Development Tools**
- **ESLint** - Code linting and formatting
- **Git** - Version control
- **Vercel** - Deployment platform

---

## 📁 **Folder Structure (Reorganized)**

```
src/
├── 📄 api/                    # API Layer (Business Logic)
│   ├── auth.js               # Authentication operations
│   ├── leaveRequests.js      # Leave/Travel request operations
│   └── profiles.js           # User profile operations
├── 📄 constants/               # Application Constants
│   └── index.js              # Leave types, months, roles, etc.
├── 📄 components/             # Reusable UI Components
│   └── AdminLayout.jsx       # Admin dashboard layout
├── 📄 contexts/               # React Context (Future)
├── 📄 hooks/                  # Custom React Hooks
├── 📄 lib/                    # Core Libraries & Utilities
│   ├── supabaseClient.js     # Supabase client configuration
│   └── pdfGenerator.js       # PDF generation utilities
├── 📄 pages/                  # Page Components
│   ├── Login.jsx             # User authentication
│   ├── Selection.jsx          # Form selection page
│   ├── LeaveForm.jsx         # Leave application form
│   ├── TravelForm.jsx        # Travel order form
│   ├── FormSuccessful.jsx    # Success confirmation
│   ├── AdminDashboard.jsx    # Admin main dashboard
│   ├── AccountManagement.jsx  # User account management
│   ├── ApprovedForms.jsx     # Approved requests view
│   ├── Archive.jsx           # Archived requests view
│   ├── MonthlySummary.jsx    # Monthly reports
│   └── Records.jsx          # Records management
├── 📄 store/                  # State Management (Future)
├── 📄 types/                  # TypeScript Types (Future)
├── 📄 assets/                 # Static Assets
│   ├── react.svg
│   └── denr-logo.png
├── 📄 App.jsx                 # Main App Component
├── 📄 main.jsx                # Application Entry Point
└── 📄 index.css               # Global Styles & Animations
```

---

## 🔧 **Key Features Implemented**

### **✅ User Management**
- User authentication with Supabase Auth
- Account creation with duplicate prevention
- Role-based access (Admin/Employee)
- Account activation/deactivation
- Profile management

### **✅ Form System**
- Leave application form (13 leave types)
- Travel order form with per diems
- Form validation and submission
- PDF generation for approved requests

### **✅ Admin Dashboard**
- Real-time request monitoring
- Status management (Pending/Approved/Declined)
- Request archiving
- Statistics and analytics
- PDF download functionality

### **✅ Database Integration**
- Supabase PostgreSQL database
- Real-time updates via subscriptions
- Proper data relationships
- Error handling and fallbacks

### **✅ UI/UX Enhancements**
- Responsive design (mobile-first)
- Smooth animations and transitions
- Loading states and error handling
- Modern card-based layouts
- Professional color schemes

---

## 🗄️ **Database Schema**

### **Tables**
1. **`auth.users`** - Supabase authentication
2. **`profiles`** - Extended user information
3. **`leave_requests`** - Leave & travel requests

### **Key Fields**
- User authentication & roles
- Request types & statuses
- Form details & metadata
- Timestamps & audit trail

---

## 🚀 **Deployment & Development**

### **Development Server**
- `npm run dev` - Vite development server
- Hot module replacement
- Fast refresh on changes

### **Production Build**
- `npm run build` - Optimized production build
- Static asset optimization
- Tree shaking and minification

### **Environment Variables**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

---

## 🎯 **Current Status**

### **✅ Completed Features**
- [x] Folder structure reorganization
- [x] API layer abstraction
- [x] Constants centralization
- [x] Account management functionality
- [x] Form submission integration
- [x] Real-time dashboard updates
- [x] PDF generation
- [x] Animations and transitions

### **🔧 Working On**
- Account management debugging
- Form-to-dashboard connectivity testing
- Error handling improvements

### **📋 Next Steps**
- [ ] TypeScript migration
- [ ] Advanced search and filtering
- [ ] Email notifications
- [ ] Mobile app development
- [ ] Performance optimization

---

## 🛠️ **Technical Implementation**

### **State Management**
- React Hooks (useState, useEffect, useCallback)
- Local component state
- Supabase real-time subscriptions

### **Styling**
- Tailwind CSS utility classes
- Custom CSS animations
- Responsive breakpoints
- Dark mode support (future)

### **Error Handling**
- Try-catch blocks
- User-friendly error messages
- Graceful degradation
- Console logging for debugging

### **Performance**
- Code splitting with React.lazy
- Optimized re-renders with useCallback
- Efficient data fetching
- Minimal bundle size

---

**LeaveGo** is a modern, full-stack web application built with React and Supabase, providing efficient leave and travel request management for DENR employees.
