import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'restaurant' | 'volunteer' | 'ngo';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  supabaseUserId?: string;
  phone?: string;
  address?: string;
  vehicleType?: string;
  capacity?: string;
}

export interface LoginData {
  email: string;
  password?: string;
  name: string;
  phone?: string;
  address?: string;
  vehicleType?: string;
  capacity?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginData, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Restore session on mount ──────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      // 1) Check localStorage cache first (fast)
      const cached = localStorage.getItem('auth_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          localStorage.removeItem('auth_user');
        }
      }

      // 2) Also listen for Supabase auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            setUser(null);
            localStorage.removeItem('auth_user');
          }
          // SIGNED_IN is handled inside login()
        }
      );

      setIsLoading(false);
      return () => subscription.unsubscribe();
    };
    restore();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────
  const login = async (data: LoginData, role: UserRole) => {
    setIsLoading(true);
    setError(null);

    try {
      // ── Step 1: Supabase Auth (sign in or sign up) ────────────────
      let authUserId: string | undefined;

      if (data.email && data.password) {
        // Try sign-in first
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (signInError) {
          // If user doesn't exist, sign them up
          if (
            signInError.message.includes('Invalid login') ||
            signInError.message.includes('invalid_credentials') ||
            signInError.message.includes('Email not confirmed')
          ) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: data.email,
              password: data.password,
              options: {
                data: { name: data.name, role },
              },
            });

            if (signUpError) {
              throw new Error(signUpError.message);
            }
            authUserId = signUpData.user?.id;
          } else {
            throw new Error(signInError.message);
          }
        } else {
          authUserId = signInData.user?.id;
        }
      }

      // ── Step 2: Upsert profile in app_users table ─────────────────
      let supabaseUserId: string | undefined;

      try {
        const { data: existingUser, error: queryError } = await (supabase
          .from('app_users' as any)
          .select('id')
          .eq('email', data.email)
          .eq('role', role)
          .single() as any);

        if (queryError && queryError.code !== 'PGRST116') {
          console.warn('Query error (non-critical):', queryError);
        }

        if (existingUser?.id) {
          supabaseUserId = existingUser.id;

          // Update profile with latest details
          await (supabase
            .from('app_users' as any)
            .update({
              name: data.name,
              phone: data.phone || null,
              address: data.address || null,
              vehicle_type: data.vehicleType || null,
              capacity: data.capacity || null,
            })
            .eq('id', existingUser.id) as any);
        } else {
          // Insert new profile row
          const { data: newUser, error: insertError } = await (supabase
            .from('app_users' as any)
            .insert([{
              email: data.email,
              name: data.name,
              role,
              phone: data.phone || null,
              address: data.address || null,
              vehicle_type: data.vehicleType || null,
              capacity: data.capacity || null,
            }])
            .select('id')
            .single() as any);

          if (!insertError && newUser?.id) {
            supabaseUserId = newUser.id;
          }
        }
      } catch (err) {
        console.warn('Supabase app_users error (non-critical):', err);
      }

      // ── Step 3: Build local user object ───────────────────────────
      const userData: User = {
        id: supabaseUserId || authUserId || `${role.substring(0, 3)}_${Date.now()}`,
        email: data.email,
        name: data.name,
        role,
        supabaseUserId,
        phone: data.phone,
        address: data.address,
        vehicleType: data.vehicleType,
        capacity: data.capacity,
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

  // ── Logout ────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Not critical — clear local state anyway
    }
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