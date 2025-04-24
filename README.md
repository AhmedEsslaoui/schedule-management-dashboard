# Schedule Management Dashboard

A modern, responsive web application for managing employee schedules across different countries. Built with React, TypeScript, Material-UI, and Firebase.

## Live Platform
You can access the published platform at: [https://sites.google.com/indriver.com/schedule-management/shifts-maker](https://sites.google.com/indriver.com/schedule-management/shifts-maker)

## Author
**Ahmed Esslaoui**  
Support Contact: ahmed.esslaoui@indriver.com

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
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Build for production:
   ```bash
   npm run build
   ```

## Security Setup Guide

### Firestore Authorization Structure

This application uses a collection-based authorization system instead of hardcoded emails. Follow these steps to set up your authorization structure:

1. Set up the `authorized_users` collection in Firestore with the following structure:
   ```
   authorized_users/{email}
   ```

   Each document should have:
   - Document ID: The user's email address (in lowercase)
   - Fields:
     - `email` (string): The user's email address
     - `isAdmin` (boolean): Whether the user has admin privileges
     - `createdAt` (timestamp): When the user was added
     - `updatedAt` (timestamp): When the user was last updated

2. To add your first admin user (do this before deploying):
   - Create a document in the `authorized_users` collection
   - Set the document ID to your email address (lowercase)
   - Add the fields above, setting `isAdmin` to `true`

3. After deployment, you can use the application's admin interface to manage users

### Firebase Security Rules

Deploy the following security rules in your Firebase Console:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    // Use a dedicated collection for authorization checks
    function isAuthorizedUser() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/authorized_users/$(request.auth.token.email.lower()));
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/authorized_users/$(request.auth.token.email.lower())) &&
        get(/databases/$(database)/documents/authorized_users/$(request.auth.token.email.lower())).data.isAdmin == true;
    }

    // Authorized users collection - only admins can modify
    match /authorized_users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Rest of your rules...
  }
}
```

### Security Best Practices

1. **Environment Variables**: 
   - Never commit `.env` files to version control
   - Use `.env.example` as a template
   - Keep API keys and secrets in environment variables

2. **Authentication**:
   - Only allow authorized users to access your application
   - Implement proper role-based access control
   - Regularly audit user access

3. **Firestore Security**:
   - Always use security rules to protect your data
   - Follow the principle of least privilege
   - Test your security rules thoroughly

4. **Frontend Security**:
   - Don't store sensitive information in localStorage or sessionStorage
   - Implement proper input validation
   - Use HTTPS for all communications

5. **Deployment**:
   - Regularly update dependencies
   - Configure proper CORS settings
   - Enable Firebase App Check in production

## Initial Setup

1. After deploying, sign in with your Google account
2. Add your email to the `authorized_users` collection in Firestore to grant access (with `isAdmin: true` field to get admin privileges)
3. Add initial employees through the Employee Management interface
4. Create your first schedule through the Schedule Management interface

## License

MIT License
