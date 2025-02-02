import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDvgFvOWGPDiMo-4avx_1RP4xiGCSg9RPw",
  authDomain: "schedule-management-dashboard.firebaseapp.com",
  projectId: "schedule-management-dashboard",
  storageBucket: "schedule-management-dashboard.firebasestorage.app",
  messagingSenderId: "675140425717",
  appId: "1:675140425717:web:3123f46e73a6b3a53472bc",
  measurementId: "G-J6DFEE5RFC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
