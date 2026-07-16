"use client";

import { ReactNode } from "react";

// Thin wrapper kept for structural consistency — auth state is managed
// by the singleton supabase client in lib/supabaseClient.ts.
export default function SupabaseProviderWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
