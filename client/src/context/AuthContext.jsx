import { createContext, useContext, useState } from 'react';
import { loginUser, logoutUser, registerUser, updateUserProfile } from '../api/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cloudvault_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem('cloudvault_user'))
  );

  const login = async (email, password, rememberMe = false) => {
    if (!email || !password) {
      throw new Error('Please provide both institutional email and passcode.');
    }

    const res = await loginUser({ email, password, rememberMe });
    const loggedInUser = res?.data?.user || null;

    setUser(loggedInUser);
    setIsAuthenticated(Boolean(loggedInUser));
    if (loggedInUser) {
      localStorage.setItem('cloudvault_user', JSON.stringify(loggedInUser));
    }
    return loggedInUser;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('cloudvault_user');
    }
  };

 

  const register = async (userData) => {
    const res = await registerUser(userData);
    const createdUser = res?.data?.user || null;

    setUser(createdUser);
    setIsAuthenticated(Boolean(createdUser));
    if (createdUser) {
      localStorage.setItem('cloudvault_user', JSON.stringify(createdUser));
    }
    return createdUser;
  };

 const updateUser = async (updates) => {
    const res = await updateUserProfile(updates);
    const updatedUser = res?.data || null;

    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('cloudvault_user', JSON.stringify(updatedUser));
    }
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
