import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isAuthorizedUser: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState({ isAdmin: false, isAuthorizedUser: false });

  // This function checks user access from Firestore instead of hardcoded emails
  async function checkUserAccess(email: string | null): Promise<{ isAdmin: boolean; isAuthorizedUser: boolean }> {
    if (!email) return { isAdmin: false, isAuthorizedUser: false };
    
    try {
      // Check if user exists in authorized_users collection
      const normalizedEmail = email.toLowerCase();
      const userRef = collection(db, 'authorized_users');
      const q = query(userRef, where('email', '==', normalizedEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { isAdmin: false, isAuthorizedUser: false };
      }
      
      // Get user data and check if they're an admin
      const userData = querySnapshot.docs[0].data();
      return { 
        isAdmin: userData.isAdmin === true, 
        isAuthorizedUser: true 
      };
    } catch (error) {
      console.error("Error checking user access:", error);
      return { isAdmin: false, isAuthorizedUser: false };
    }
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userAccess = await checkUserAccess(result.user.email);
      
      if (!userAccess.isAuthorizedUser) {
        // Unauthorized user, sign them out and show error
        await signOut(auth);
        throw new Error('Unauthorized access. Please use an authorized email address.');
      }
      
      if (!userAccess.isAdmin && !window.location.pathname.startsWith('/country/')) {
        // Non-admin user trying to access admin routes, redirect to default country
        window.location.href = '/country/egypt';
      }

      setCurrentUser(result.user);
      setAccessStatus(userAccess);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAccessStatus({ isAdmin: false, isAuthorizedUser: false });
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userAccess = await checkUserAccess(user.email);
        setCurrentUser(user);
        setAccessStatus(userAccess);
      } else {
        setCurrentUser(null);
        setAccessStatus({ isAdmin: false, isAuthorizedUser: false });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin: accessStatus.isAdmin,
    isAuthorizedUser: accessStatus.isAuthorizedUser,
    loading,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
