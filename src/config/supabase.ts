import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = 'https://fkvfwfmytwtykxwfoytx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_jAvR0AYJiHLnl4s_xmMTSA_7b59-kc0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Maps Supabase error messages to user-friendly messages. */
export function getSupabaseAuthErrorMessage(
  error: unknown,
  fallback = 'Authentication failed. Please try again.'
): string {
  if (!error) return fallback;
  const message = (error as { message?: string })?.message;
  if (typeof message === 'string') {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Your email address has not been confirmed yet. Please check your inbox.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'An account with this email already exists.';
    }
    if (lower.includes('password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (
      lower.includes('email rate limit') ||
      (error as { code?: string })?.code === 'over_email_send_rate_limit'
    ) {
      return 'Supabase email limit reached (max 3/hr on free tier). In your Supabase Dashboard, go to Authentication > Providers > Email and turn OFF "Confirm email" so users can register instantly without email confirmation limits.';
    }
    if (lower.includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (lower.includes('network') || lower.includes('failed to fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    return message;
  }
  return fallback;
}
