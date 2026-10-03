import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

export const SUPABASE_URL = 'https://vdjhdmosxbccffzvqlcp.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_AH1XDqS9eobKneJuXuzqGw_u7MLNiwA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Registers a new user in Supabase Auth and updates their profile
 */
export async function registerInSupabase(params: {
  email: string;
  password: string;
  name: string;
  role: string;
  avatarUrl: string;
}): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email.trim().toLowerCase(),
      password: params.password,
      options: {
        data: {
          name: params.name.trim(),
          role: params.role.trim(),
          avatar_url: params.avatarUrl.trim(),
        },
      },
    });

    if (authError) {
      // If user already registered in Supabase, try signing in directly!
      if (authError.message.toLowerCase().includes('already registered')) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: params.email.trim().toLowerCase(),
          password: params.password,
        });

        if (signInError) {
          return { user: null, error: 'Este e-mail já está cadastrado. Faça login ou verifique a senha.' };
        }

        const appUser: User = {
          id: signInData.user.id,
          name: params.name.trim(),
          role: params.role.trim() || 'Equipe KZYRO',
          email: params.email.trim().toLowerCase(),
          avatar: params.avatarUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
          bio: 'Membro da equipe KZYRO.',
          accentColor: '#38bdf8',
          joinedDate: 'Hoje',
          supabaseUserId: signInData.user.id,
        };
        return { user: appUser, error: null };
      }
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Falha ao registrar usuário.' };
    }

    // Try updating profile in profiles table
    try {
      await supabase
        .from('profiles')
        .update({
          name: params.name.trim(),
          avatar_url: params.avatarUrl.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);
    } catch {
      // noop
    }

    const newUser: User = {
      id: authData.user.id,
      name: params.name.trim(),
      role: params.role.trim() || 'Equipe KZYRO',
      email: params.email.trim().toLowerCase(),
      avatar:
        params.avatarUrl.trim() ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
      bio: 'Membro da equipe KZYRO.',
      accentColor: '#38bdf8',
      joinedDate: 'Hoje',
      supabaseUserId: authData.user.id,
    };

    return { user: newUser, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro de conexão com o banco de dados.';
    return { user: null, error: msg };
  }
}

/**
 * Signs in a user in Supabase
 */
export async function loginInSupabase(
  email: string,
  pass: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (authError) {
      return { user: null, error: 'E-mail ou senha incorretos.' };
    }

    if (!authData.user) {
      return { user: null, error: 'Usuário não encontrado.' };
    }

    // Fetch profile if exists
    let name = authData.user.user_metadata?.name || cleanEmail.split('@')[0];
    let avatar = authData.user.user_metadata?.avatar_url || '';
    let role = authData.user.user_metadata?.role || 'Equipe KZYRO';

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        if (profile.name) name = profile.name;
        if (profile.avatar_url) avatar = profile.avatar_url;
      }
    } catch {
      // noop
    }

    const appUser: User = {
      id: authData.user.id,
      name,
      role,
      email: cleanEmail,
      avatar:
        avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
      bio: 'Membro da equipe KZYRO.',
      accentColor: '#38bdf8',
      joinedDate: 'Hoje',
      supabaseUserId: authData.user.id,
    };

    return { user: appUser, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao conectar com o Supabase.';
    return { user: null, error: msg };
  }
}

/**
 * Fetches all registered profiles from Supabase to sync team directory
 */
export async function fetchProfilesFromSupabase(): Promise<User[]> {
  const users: User[] = [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, created_at');

    if (!error && data) {
      for (const row of data) {
        if (row.id && row.email) {
          users.push({
            id: row.id,
            name: row.name || row.email.split('@')[0],
            role: 'Equipe KZYRO',
            email: row.email,
            avatar:
              row.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
            bio: 'Membro cadastrado na KZYRO Community.',
            accentColor: '#38bdf8',
            joinedDate: row.created_at
              ? new Date(row.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
              : 'Recente',
            supabaseUserId: row.id,
          });
        }
      }
    }
  } catch {
    // noop
  }
  return users;
}
