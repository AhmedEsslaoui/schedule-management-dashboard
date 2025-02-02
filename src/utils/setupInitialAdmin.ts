import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const INITIAL_ADMIN_EMAIL = 'medslaoui14563@gmail.com';

export const setupInitialAdmin = async (userId: string, email: string) => {
  try {
    console.log('Setting up initial admin for:', email);
    
    // Check if the admin document already exists
    const adminRef = doc(db, 'admins', userId);
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists() && email === INITIAL_ADMIN_EMAIL) {
      console.log('Creating admin document for:', email);
      await setDoc(adminRef, {
        email: email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('Admin document created successfully');
      return true;
    } else if (adminDoc.exists()) {
      console.log('Admin document already exists');
      return true;
    }
    
    console.log('Not creating admin document - email does not match initial admin');
    return false;
  } catch (error) {
    console.error('Error setting up initial admin:', error);
    return false;
  }
};
