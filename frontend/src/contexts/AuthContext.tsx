import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'restaurant' | 'volunteer' | 'ngo';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  supabaseUserId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, role: UserRole, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

const MOCK_USERS = [
  { id: 'rest_001', email: 'restaurant@test.com', name: 'Test Restaurant', password: simpleHash('password123'), role: 'restaurant' as UserRole },
  { id: 'vol_001', email: 'volunteer@test.com', name: 'Test Volunteer', password: simpleHash('password123'), role: 'volunteer' as UserRole },
  { id: 'ngo_001', email: 'ngo@test.com', name: 'Test NGO', password: simpleHash('password123'), role: 'ngo' as UserRole },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to restore user session:', err);
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: UserRole, name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const passwordHash = simpleHash(password);
      const mockUser = MOCK_USERS.find(
        u => u.email === email && u.password === passwordHash && u.role === role
      );

      let supabaseUserId: string | undefined;

      try {
        // Try to fetch user from app_users table (if migration is applied)
        const { data: existingUser, error: queryError } = await (supabase
          .from('app_users' as any)
          .select('id')
          .eq('email', email)
          .eq('role', role)
          .single() as any);

        if (queryError && queryError.code !== 'PGRST116') {
          console.warn('Query error (non-critical):', queryError);
        }

        if (existingUser?.id) {
          supabaseUserId = existingUser.id;
        } else {
          // Create new user in Supabase
          const { data: newUser, error: insertError } = await (supabase
            .from('app_users' as any)
            .insert([{ email, name, role }])
            .select('id')
            .single() as any);

          if (!insertError && newUser?.id) {
            supabaseUserId = newUser.id;
          }
        }
      } catch (err) {
        console.warn('Supabase app_users error (non-critical):', err);
        // Continue without Supabase user ID - this is not critical
      }

      const userData: User = {
        id: mockUser?.id || `${role.substring(0, 3)}_${String(Math.random()).substring(2, 7)}`,
        email,
        name,
        role,
        supabaseUserId,
      };

      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};