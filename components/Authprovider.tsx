import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@/lib/supabaseClient';
import { ReactNode } from 'react';

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>;
}
