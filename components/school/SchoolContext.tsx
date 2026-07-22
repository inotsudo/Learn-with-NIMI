"use client";

import { createContext, useContext, useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

export interface SchoolInfo {
  school_id:     string;
  school_name:   string;
  country:       string;
  city:          string | null;
  contact_name:  string | null;
  contact_email: string | null;
  logo_url:      string | null;
  license_type:  "trial" | "standard" | "premium" | "enterprise";
  seat_count:    number;
  license_start: string | null;
  license_end:   string | null;
  auto_renew:    boolean;
  is_active:     boolean;
  my_role:       "owner" | "admin" | "teacher" | "viewer";
}

interface Ctx {
  school:  SchoolInfo | null;
  loading: boolean;
  error:   string | null;
}

const SchoolContext = createContext<Ctx>({ school: null, loading: true, error: null });

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [school,  setSchool]  = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: e } = await supabase.rpc("get_my_school");
        if (e) throw e;
        const rows = data as SchoolInfo[] | null;
        setSchool(rows && rows.length > 0 ? rows[0] : null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load school");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return <SchoolContext.Provider value={{ school, loading, error }}>{children}</SchoolContext.Provider>;
}

export const useSchool = () => useContext(SchoolContext);
