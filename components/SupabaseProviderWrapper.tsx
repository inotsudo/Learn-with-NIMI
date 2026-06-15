"use client";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { ReactNode } from "react";
import supabase from "@/lib/supabaseClient";

interface Props {
  children: ReactNode;
}

export default function SupabaseProviderWrapper({ children }: Props) {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  );
}
