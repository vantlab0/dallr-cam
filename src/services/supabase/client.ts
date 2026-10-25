import { createClient, type SupabaseClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/services/security/vault';
import type { User } from '@/types';
import { createDefaultUser } from '@/lib/defaults';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;
  const config = getSupabaseConfig();
  supabaseInstance = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });
  return supabaseInstance;
}

export function mapSupabaseUserToProfile(sbUser: SupabaseAuthUser, fallbackName?: string): User {
  const meta = sbUser.user_metadata || {};
  const name =
    meta.full_name ||
    meta.name ||
    fallbackName ||
    sbUser.email?.split('@')[0] ||
    'Dallr Creator';

  const defaultUser = createDefaultUser();

  return {
    ...defaultUser,
    id: sbUser.id,
    name,
    email: sbUser.email || defaultUser.email,
    plan: (meta.plan as User['plan']) || 'Standard',
  };
}

export async function signUpWithSupabase(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ user: User; confirmationRequired?: boolean }> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        name: params.name?.trim() || 'Creator',
        full_name: params.name?.trim() || 'Creator',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Supabase failed to create user record.');
  }

  const profile = mapSupabaseUserToProfile(data.user, params.name);
  const confirmationRequired = !data.session;

  return {
    user: profile,
    confirmationRequired,
  };
}

export async function signInWithSupabase(params: {
  email: string;
  password: string;
}): Promise<User> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('User not found.');
  }

  return mapSupabaseUserToProfile(data.user);
}

export async function signOutFromSupabase(): Promise<void> {
  try {
    const client = getSupabaseClient();
    await client.auth.signOut();
  } catch (err) {
    console.warn('[Supabase] Sign-out warning:', err);
  }
}

export async function getInitialSupabaseUser(): Promise<User | null> {
  try {
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    if (data?.session?.user) {
      return mapSupabaseUserToProfile(data.session.user);
    }
  } catch (err) {
    console.warn('[Supabase] Session restore notice:', err);
  }
  return null;
}
