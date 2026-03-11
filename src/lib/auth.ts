import { getSetting, setSetting } from './supabase';

const SESSION_KEY = 'perfume_auth';

export function isLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(password: string): Promise<boolean> {
  const stored = await getSetting('password');
  // Default password if not set
  const correct = stored ?? 'admin123';
  if (password === correct) {
    localStorage.setItem(SESSION_KEY, 'true');
    return true;
  }
  return false;
}

export async function changePassword(newPassword: string): Promise<void> {
  await setSetting('password', newPassword);
}
