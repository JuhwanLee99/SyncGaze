import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { auth, onAuthStateChanged } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={{ user, initializing }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);