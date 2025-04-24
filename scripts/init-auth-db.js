/**
 * Firebase Auth Migration Script
 * 
 * This script helps migrate from hardcoded emails to a Firestore-based
 * authorization system. Run it once to initialize your authorized_users collection.
 * 
 * Usage:
 * 1. Update the 'adminEmails' and 'regularUserEmails' arrays below with your authorized users
 * 2. Make sure you have Firebase Admin SDK credentials
 * 3. Run: node scripts/init-auth-db.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Path to your Firebase service account key
// IMPORTANT: Never commit this file to version control!
const serviceAccountPath = path.join(__dirname, '../service-account-key.json');

// Check if service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: service-account-key.json not found!');
  console.error('Please download your Firebase service account key and save it to:');
  console.error(serviceAccountPath);
  console.error('You can download it from the Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
  });
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = admin.firestore();

// Add your admin emails here (will have full access)
const adminEmails = [
  // e.g. 'admin@example.com'
  // Add your admin emails here
];

// Add your regular user emails here (read-only access)
const regularUserEmails = [
  // e.g. 'user@example.com'
  // Add your regular user emails here
];

// Process all emails
async function initializeAuthUsers() {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  
  // Add admins
  for (const email of adminEmails) {
    const normalizedEmail = email.toLowerCase();
    const docRef = db.collection('authorized_users').doc(normalizedEmail);
    
    batch.set(docRef, {
      email: normalizedEmail,
      isAdmin: true,
      createdAt: now,
      updatedAt: now
    });
    
    console.log(`Adding admin user: ${normalizedEmail}`);
  }
  
  // Add regular users
  for (const email of regularUserEmails) {
    const normalizedEmail = email.toLowerCase();
    const docRef = db.collection('authorized_users').doc(normalizedEmail);
    
    batch.set(docRef, {
      email: normalizedEmail,
      isAdmin: false,
      createdAt: now,
      updatedAt: now
    });
    
    console.log(`Adding regular user: ${normalizedEmail}`);
  }
  
  // Commit all changes
  try {
    await batch.commit();
    console.log(`Successfully added ${adminEmails.length + regularUserEmails.length} users to the database.`);
  } catch (error) {
    console.error('Error adding users to the database:', error);
  }
}

// Run the initialization
initializeAuthUsers()
  .then(() => {
    console.log('Authorization database setup complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to setup authorization database:', error);
    process.exit(1);
  });
