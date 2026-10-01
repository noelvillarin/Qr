import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

/* =========================================================
   TYPES
   ========================================================= */

export type UserRole = 'student' | 'teacher';

export type SignUpProfile = {
  full_name: string;
  role: UserRole;
};

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
};

/* =========================================================
   SIGN IN
   ========================================================= */

export async function signIn(
  email: string,
  password: string
) {
  return supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
}

/* =========================================================
   SIGN UP
   ========================================================= */

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const cleanEmail = email.trim();

  const { data, error } =
    await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

  if (error) {
    console.error(
      'Sign up failed:',
      error
    );

    return {
      data,
      error,
    };
  }

  if (profile && data.user) {
    const { error: profileError } =
      await supabase
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            full_name: profile.full_name.trim(),
            role: profile.role,
          },
          {
            onConflict: 'id',
          }
        );

    if (profileError) {
      console.error(
        'Failed to save profile:',
        profileError
      );

      return {
        data,
        error: profileError,
      };
    }
  }

  return {
    data,
    error: null,
  };
}

/* =========================================================
   SIGN OUT
   ========================================================= */

export async function signOut() {
  return supabase.auth.signOut();
}

/* =========================================================
   GET CURRENT USER
   ========================================================= */

export async function getCurrentUser(): Promise<User | null> {
  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      'Failed to get current user:',
      error
    );

    return null;
  }

  return data.user ?? null;
}

/* =========================================================
   GET PROFILE
   ========================================================= */

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error(
      'Failed to get profile:',
      error
    );

    return null;
  }

  return data as Profile | null;
}

/* =========================================================
   AUTH HOOK
   ========================================================= */

export function useAuth() {
  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          'Failed to get session:',
          error
        );

        setUser(null);
      } else {
        setUser(
          data.session?.user ?? null
        );
      }

      setLoading(false);
    };

    loadSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          setUser(
            session?.user ?? null
          );

          setLoading(false);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
  };
}

