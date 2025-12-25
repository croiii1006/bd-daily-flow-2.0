import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_USERS: Record<string, { password: string; name: string }> = {
  zousimin: { password: '123456', name: '邹思敏' },
  huangyi: { password: '123456', name: '黄毅' },
  yuanxiaonan: { password: '123456', name: '袁晓南' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 检查本地存储中的登录状态
    const storedUser = localStorage.getItem('bd_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const key = String(username || '').trim();
    const record = ALLOWED_USERS[key];
    if (record && record.password === password) {
      const newUser: User = {
        id: `user-${key}`,
        username: key,
        name: record.name,
      };
      setUser(newUser);
      localStorage.setItem('bd_user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bd_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
