import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';

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

  function checkUserAccess(email: string | null): { isAdmin: boolean; isAuthorizedUser: boolean } {
    if (!email) return { isAdmin: false, isAuthorizedUser: false };
    
    // Admin users
    const adminEmails = [
      'medslaoui14563@gmail.com',
      'assem.al-sh@indriver.com',
      'ali.selim@indriver.com',
      'ahmed.esslaoui@indriver.com',
      'yusef.muhamed@indriver.com',
      'n-e.hassadi@indriver.com',
      'ali.cokkonusur@indriver.com',
      'nourhan.wahby@indriver.com',
      'amr.shawqy@indriver.com',
      'abdelrahman.nabil@indriver.com',
      'hossam.aboelela@indriver.com',
      'mohamed.essam@indriver.com',
      'youssef.benelouakil@indriver.com',
      'soukaina.arif@indriver.com',
      'khaled.shaban@indriver.com',
      'abanoub.guevara@indriver.com',
      'kareem.hesham@indriver.com',
      'mohamed.assem@indriver.com',
      'ahmed.esslaoui@indriver.com'
    ];
    
    // Convert email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase();
    
    if (adminEmails.map(e => e.toLowerCase()).includes(normalizedEmail)) {
      return { isAdmin: true, isAuthorizedUser: true };
    }
    
    // Non-admin authorized users
    const authorizedEmails = [
      'mohammed.hamdy@indriver.com',
      'mayan.yasser@indriver.com',
      'abudlaziz.mohamed@indriver.com',
      'ahmed.gamal@indriver.com',
      'nouran.ramadan@indriver.com',
      'alaa.elsayed@indriver.com',
      'mahmoud.ataf@indriver.com',
      'youmna.yousef@indriver.com',
      'ahmed.sobhy@indriver.com',
      'yasmine.tarek@indriver.com',
      'hisham.adawy@indriver.com',
      'fatma.habashy@indriver.com',
      'amr.morsy@indriver.com',
      'eslam.nasser@indriver.com',
      'sara.ahmed@indriver.com',
      'norhan.mohamed@indriver.com',
      'omnia.ahmed@indriver.com',
      'eman.anwer@indriver.com',
      'ibrahim.zaki@indriver.com',
      'a.abdulhamid@indriver.com',
      'rawan.abdelbast@indriver.com',
      'moaz.yousef@indriver.com',
      'ahmed.moustafa@indriver.com',
      'mohamed.osama@indriver.com',
      'esraa.usama@indriver.com',
      'eslam.awad@indriver.com',
      'kareem.abubakr@indriver.com',
      'ahmed.osama@indriver.com',
      'ahmed.emam@indriver.com',
      'abdel.khamis@indriver.com',
      'mohamed.isawi@indriver.com',
      'heba.raafat@indriver.com',
      'mahmoud.gamil@indriver.com',
      'rahma.hassan@indriver.com',
      'mohamed.abdelghany@indriver.com',
      'mai.tariq@indriver.com',
      'asmaa.mohamed@indriver.com',
      'amira.tarek@indriver.com',
      'ahmed.abdullah@indriver.com',
      'abdulrahman.gomaa@indriver.com',
      'eman.mohsen@indriver.com',
      'asmaa.gamal@indriver.com',
      'sara.mourad@indriver.com',
      'sameh.adel@indriver.com',
      'mohamed.ali.ali@indriver.com',
      'kerolos.reda@indriver.com',
      'hazem.naeem@indriver.com',
      'mohamed.loqman@indriver.com',
      'ahmed.ehab@indriver.com',
      'mai.abdelwahed@indriver.com',
      'nada.khaled@indriver.com',
      'nada.bennis@indriver.com',
      'kenza.abbadi@indriver.com',
      'ougrni.mohamed@indriver.com',
      'bajbouji.marouan@indriver.com',
      'mohamed.elhachmi@indriver.com',
      'nouhaila.essalih@indriver.com',
      'sahraoui.hamza@indriver.com',
      'mohammad.aznague@indriver.com',
      'yasser.marrou@indriver.com',
      'meryem.mazroui@indriver.com',
      'achraf.tazi@indriver.com',
      'mariem.abdelhakmi@indriver.com',
      'zaynab.adil@indriver.com',
      'marina.alaa@indriver.com',
      'nora.khaled@indriver.com',
      'mostafa.essam@indriver.com',
      'hossam.yasser@indriver.com',
      'youssef.osama@indriver.com',
      'doaa.ghani@indriver.com',
      'omar.khalifa@indriver.com',
      'ahmed.mohamed@indriver.com',
      'mostafa.ali.mohamed@indriver.com',
      'ziad.ashraf@indriver.com',
      'mai.a.farag@indriver.com',
      'mahmoud.nabil@indriver.com',
      'yasmin.adel@indriver.com',
      'moataz.mohamed@indriver.com',
      'karim.mahmoud@indriver.com',
      'mazen.abo.bakr@indriver.com',
      'kawthar.lfayres@indriver.com'
    ];

    if (authorizedEmails.map(e => e.toLowerCase()).includes(normalizedEmail)) {
      return { isAdmin: false, isAuthorizedUser: true };
    }
    
    // Any other user
    return { isAdmin: false, isAuthorizedUser: false };
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userAccess = checkUserAccess(result.user.email);
      
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAccessStatus(checkUserAccess(user?.email || null));
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
