import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cloudvault_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall back to default student
      }
    }
    return {
      name: 'Alex Rivera',
      email: 'alex.rivera@campus.edu',
      studentId: 'STU-84920',
      degree: 'B.Sc. Computer Science',
      department: 'Computer Science & Engineering',
      semester: 'Semester 6',
      role: 'Student',
      storageUsedBytes: 2472000000, // 2.47 GB
      storageTotalBytes: 10737418240, // 10 GB
      ssoVerified: true,
      lastLogin: new Date().toISOString(),
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const login = async (email, password) => {
    if (!email || !password) {
      throw new Error('Please provide both institutional email and passcode.');
    }
    const updatedUser = {
      ...user,
      email,
      lastLogin: new Date().toISOString(),
    };
    setUser(updatedUser);
    setIsAuthenticated(true);
    localStorage.setItem('cloudvault_user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const register = async (userData) => {
    const newUser = {
      ...user,
      ...userData,
      lastLogin: new Date().toISOString(),
    };
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('cloudvault_user', JSON.stringify(newUser));
    return newUser;
  };

  const updateUser = (updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('cloudvault_user', JSON.stringify(next));
      return next;
    });
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
