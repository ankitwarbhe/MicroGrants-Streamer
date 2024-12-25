import { supabase } from './supabase';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'applicant'
      }
    }
  });
  
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : error.message
    );
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please check your credentials and try again.'
        : error.message
    );
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}