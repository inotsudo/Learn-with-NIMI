import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teacher Dashboard – NIMIPIKO",
  description: "Manage your class, track student progress, and generate reports.",
};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
