import { supabase } from './supabase';

/* =========================================================
   TYPES
   ========================================================= */

export type Role = 'student' | 'teacher';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

/* =========================================================
   GET PROFILE
   ========================================================= */

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error('Error loading profile:', error);
    return null;
  }

  return data as Profile;
}

/* =========================================================
   GET CURRENT USER ROLE
   ========================================================= */

export async function getCurrentUserRole(): Promise<Role | null> {
  // 1. Get the currently logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // 2. Get that user's profile
  const profile = await getProfile(user.id);

  if (!profile) {
    return null;
  }

  // 3. Return only the role
  return profile.role;
}

/* =========================================================
   UPDATE PROFILE
   ========================================================= */

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    role?: Role;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return {
    error: error?.message ?? null,
  };
}