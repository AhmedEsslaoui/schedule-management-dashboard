# Schedule Management Dashboard

A modern, responsive web application for managing employee schedules across different countries. Built with React, TypeScript, Material-UI, and Firebase.

## Features

- **Authentication & Role-Based Access**
  - Google Sign-In integration
  - Admin and non-admin user roles
  - Protected routes based on user roles

- **Employee Management**
  - Add and remove employees
  - Organize employees by country (Egypt, Morocco, Africa)
  - View employee details and schedules

- **Schedule Management**
  - Create and manage work schedules
  - Customizable time frames (Morning, Day, Night)
  - Real-time updates and collaboration
  - Publish/unpublish schedule functionality

- **Analytics**
  - View employee working hours
  - Schedule distribution by country
  - Time frame distribution analysis
  - Date range and country filtering

## Tech Stack

- **Frontend**
  - React with TypeScript
  - Vite (Build tool)
  - Material-UI (Component library)
  - React Router (Navigation)
  - Recharts (Analytics visualization)

- **Backend & Services**
  - Firebase Authentication
  - Cloud Firestore
  - Real-time data synchronization

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- A Firebase project with Authentication and Firestore enabled

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd schedule-management-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase project:
   - Go to the [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Google Authentication
   - Create a Cloud Firestore database
   - Get your Firebase configuration

4. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Build for production:
   ```bash
   npm run build
   ```

## Firebase Security Rules

Add these security rules to your Firebase Console for proper access control:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isSignedIn() && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Admins collection
    match /admins/{userId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // Employees collection
    match /employees/{employeeId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // Schedules collection
    match /schedules/{scheduleId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Initial Setup

1. After deploying, sign in with your Google account
2. Add your user ID to the `admins` collection in Firestore to grant admin access
3. Add initial employees through the Employee Management interface
4. Create your first schedule through the Schedule Management interface

## License

MIT License
