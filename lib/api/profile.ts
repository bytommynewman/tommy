import { supabase } from '../supabase';
import type { Profile } from '../../types/database.types';

export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(input: Partial<Pick<Profile, 'display_name' | 'context_summary' | 'timezone' | 'birthdate'>>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update(input).eq('user_id', userId);
  if (error) throw error;
}
