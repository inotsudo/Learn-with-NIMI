"use client";

import { SchoolProvider } from "@/components/school/SchoolContext";
import SchoolShell from "@/components/school/SchoolShell";

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchoolProvider>
      <SchoolShell>{children}</SchoolShell>
    </SchoolProvider>
  );
}
