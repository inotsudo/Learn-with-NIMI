"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BarChart3, BookOpen,
  BadgeCheck, FileText, Menu, X, School, LogOut,
} from "lucide-react";
import { useSchool } from "./SchoolContext";
import supabase from "@/lib/supabaseClient";

const G = "#15803D";

const NAV = [
  { href: "/school/dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { href: "/school/analytics",  label: "Analytics",      icon: BarChart3       },
  { href: "/school/curriculum", label: "Curriculum",     icon: BookOpen        },
  { href: "/school/licensing",  label: "Licensing",      icon: BadgeCheck      },
  { href: "/school/reports",    label: "Reports",        icon: FileText        },
];

const LICENSE_COLORS: Record<string, string> = {
  trial:      "#F59E0B",
  standard:   "#3B82F6",
  premium:    "#8B5CF6",
  enterprise: "#15803D",
};

export default function SchoolShell({ children }: { children: React.ReactNode }) {
  const pathname         = usePathname();
  const { school, loading } = useSchool();
  const [mobileOpen, setMobileOpen] = useState(false);

  const licenseColor = school ? LICENSE_COLORS[school.license_type] ?? G : G;

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/loginpage";
  }

  const sidebar = (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-gray-100 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: G }}>
          <School className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-[13px] text-gray-900 leading-tight truncate">
            {loading ? "Loading…" : (school?.school_name ?? "School Portal")}
          </p>
          {school && (
            <span
              className="inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-0.5"
              style={{ background: `${licenseColor}20`, color: licenseColor }}>
              {school.license_type}
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={{
                background: active ? `${G}12` : "transparent",
                color:      active ? G : "#6B7280",
              }}>
              <Icon className="w-4 h-4 shrink-0" style={{ color: active ? G : "#9CA3AF" }} />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: G }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1 border-t border-gray-100 pt-3">
        {school && (
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 truncate">
            {school.my_role.toUpperCase()} · {school.contact_email ?? ""}
          </div>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" style={{ fontFamily: "var(--font-nunito, system-ui)" }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex lg:hidden">
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <p className="font-black text-[15px] text-gray-900 truncate">
            {school?.school_name ?? "School Portal"}
          </p>
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 transition lg:hidden">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
