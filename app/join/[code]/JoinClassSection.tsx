"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, LogIn, Users, X } from "lucide-react";
import supabase from "@/lib/supabaseClient";

interface Props {
  teacherId: string;
  classCode: string;
  className: string | null;
  teacherName: string;
}

interface ChildRow {
  id: string;
  name: string;
  language: string;
  age: number | null;
  teacher_id: string | null;
}

const LANG_FLAG: Record<string, string> = { en: "🇬🇧", fr: "🇫🇷", rw: "🇷🇼" };
const LANG_FULL: Record<string, string> = { en: "English", fr: "French", rw: "Kinyarwanda" };

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

type ViewState = "loading" | "guest" | "parent" | "is_teacher";

export default function JoinClassSection({ teacherId, classCode, className, teacherName }: Props) {
  const [view, setView]         = useState<ViewState>("loading");
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [busy, setBusy]         = useState<string | null>(null);
  const [err, setErr]           = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setView("guest"); return; }

      // Check if this user is a teacher — teachers can't join as students
      const { data: tp } = await supabase
        .from("teacher_profiles").select("id").eq("id", user.id).maybeSingle();
      if (tp) { setView("is_teacher"); return; }

      // Fetch parent's children
      const { data: kids } = await supabase
        .from("children")
        .select("id, name, language, age, teacher_id")
        .eq("parent_id", user.id)
        .order("name");
      setChildren((kids ?? []) as ChildRow[]);
      setView("parent");
    }).catch(() => setView("guest"));
  }, []);

  async function joinClass(childId: string) {
    setBusy(childId); setErr("");
    const { error } = await supabase
      .from("children")
      .update({ teacher_id: teacherId })
      .eq("id", childId);
    if (error) { setErr(error.message); setBusy(null); return; }
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, teacher_id: teacherId } : c));
    setBusy(null);
  }

  async function leaveClass(childId: string) {
    setBusy(childId); setErr("");
    const { error } = await supabase
      .from("children")
      .update({ teacher_id: null })
      .eq("id", childId);
    if (error) { setErr(error.message); setBusy(null); return; }
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, teacher_id: null } : c));
    setBusy(null);
  }

  /* ── Loading ────────────────────────────────────────────────── */
  if (view === "loading") return (
    <div className="mt-10 flex justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#15803d" }} />
    </div>
  );

  /* ── Guest ──────────────────────────────────────────────────── */
  if (view === "guest") return (
    <div className="mt-10 p-7 text-center"
      style={{ background: "#FFFFFF", borderRadius: "var(--leaf-r,20px 20px 20px 5px)", border: "1px solid var(--ds-border-primary,#E5E7EB)" }}>
      <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 text-[28px]"
        style={{ background: "var(--ds-brand-subtle,#F0FDF4)", borderRadius: "var(--leaf-r,20px 20px 20px 5px)" }}>
        🎒
      </div>
      <h2 className="font-baloo font-black text-[20px] mb-2" style={{ color: "#111827" }}>
        Join {className ?? "this class"}
      </h2>
      <p className="font-nunito text-[14px] mb-6 leading-relaxed" style={{ color: "#6B7280" }}>
        Sign in to link your child to <strong>{teacherName}</strong>&apos;s class.<br />
        They&apos;ll appear on the teacher&apos;s dashboard automatically.
      </p>
      <Link href={`/loginpage?next=/join/${classCode}`}
        className="inline-flex items-center gap-2 font-nunito font-bold text-[14px] text-white px-7 py-3.5"
        style={{ background: "#15803d", borderRadius: "var(--leaf-r,20px 20px 20px 5px)" }}>
        <LogIn className="w-4 h-4" /> Sign in to join
      </Link>
      <p className="font-nunito text-[12px] mt-4" style={{ color: "#9CA3AF" }}>
        No account?{" "}
        <Link href={`/register?next=/join/${classCode}`} className="font-bold hover:underline" style={{ color: "#15803d" }}>
          Create one free
        </Link>
      </p>
    </div>
  );

  /* ── Is a teacher ───────────────────────────────────────────── */
  if (view === "is_teacher") return (
    <div className="mt-10 px-6 py-5"
      style={{ background: "var(--ds-brand-subtle,#F0FDF4)", borderRadius: "var(--leaf-r,20px 20px 20px 5px)", border: "1px solid #bbf7d0" }}>
      <p className="font-nunito font-bold text-[14px]" style={{ color: "#15803d" }}>
        You&apos;re signed in as a teacher. Only parent accounts can link children to a class.
      </p>
    </div>
  );

  /* ── Parent ─────────────────────────────────────────────────── */
  const inThisClass  = children.filter(c => c.teacher_id === teacherId);
  const inOtherClass = children.filter(c => c.teacher_id && c.teacher_id !== teacherId);
  const noClass      = children.filter(c => !c.teacher_id);

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" style={{ color: "#15803d" }} />
        <h2 className="font-baloo font-black text-[20px]" style={{ color: "#111827" }}>
          Join {className ?? "this class"}
        </h2>
      </div>

      {err && (
        <div className="mb-4 px-4 py-3 font-nunito text-[13px] text-red-600 flex items-center gap-2"
          style={{ background: "#fef2f2", borderRadius: "14px 14px 14px 4px", border: "1px solid #fecaca" }}>
          <X className="w-4 h-4 shrink-0" /> {err}
        </div>
      )}

      {children.length === 0 ? (
        <div className="px-6 py-8 text-center"
          style={{ background: "#FFFFFF", borderRadius: "var(--leaf-r,20px 20px 20px 5px)", border: "1px solid var(--ds-border-primary,#E5E7EB)" }}>
          <p className="font-nunito text-[14px] mb-4" style={{ color: "#6B7280" }}>
            You don&apos;t have any children on NIMIPIKO yet.
          </p>
          <Link href="/user-profile"
            className="inline-flex items-center gap-2 font-nunito font-bold text-[13px] text-white px-6 py-3"
            style={{ background: "#15803d", borderRadius: "14px 14px 14px 4px" }}>
            Add a child profile
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* In this class */}
          {inThisClass.map(c => (
            <ChildCard key={c.id} child={c} state="in" busy={busy === c.id}
              onLeave={() => leaveClass(c.id)} />
          ))}
          {/* No class yet */}
          {noClass.map(c => (
            <ChildCard key={c.id} child={c} state="none" busy={busy === c.id}
              onJoin={() => joinClass(c.id)} />
          ))}
          {/* In a different class */}
          {inOtherClass.map(c => (
            <ChildCard key={c.id} child={c} state="other" busy={busy === c.id}
              onJoin={() => joinClass(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Child card ─────────────────────────────────────────────────── */
function ChildCard({ child, state, busy, onJoin, onLeave }: {
  child: ChildRow;
  state: "in" | "none" | "other";
  busy: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4"
      style={{
        background: state === "in" ? "var(--ds-brand-subtle,#F0FDF4)" : "#FFFFFF",
        borderRadius: "var(--leaf-r,20px 20px 20px 5px)",
        border: `1px solid ${state === "in" ? "#bbf7d0" : "var(--ds-border-primary,#E5E7EB)"}`,
      }}>
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-baloo font-black text-[13px]"
        style={{ background: state === "in" ? "#bbf7d0" : "#F0FDF4", color: "#15803d" }}>
        {initials(child.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-baloo font-black text-[15px] truncate" style={{ color: "#111827" }}>{child.name}</p>
        <p className="font-nunito text-[12px]" style={{ color: "#6B7280" }}>
          {LANG_FLAG[child.language] ?? ""} {LANG_FULL[child.language] ?? child.language}
          {child.age ? ` · Age ${child.age}` : ""}
        </p>
      </div>

      {/* Action */}
      {state === "in" && (
        <div className="flex items-center gap-3">
          <span className="font-nunito font-bold text-[12px] flex items-center gap-1.5 px-3 py-1.5"
            style={{ background: "#dcfce7", color: "#15803d", borderRadius: "100px" }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Joined
          </span>
          <button onClick={onLeave} disabled={busy}
            className="font-nunito text-[12px] hover:underline disabled:opacity-50" style={{ color: "#9CA3AF" }}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Leave"}
          </button>
        </div>
      )}

      {state === "none" && (
        <button onClick={onJoin} disabled={busy}
          className="font-nunito font-bold text-[13px] text-white px-5 py-2.5 flex items-center gap-2 disabled:opacity-60 transition-all"
          style={{ background: "#15803d", borderRadius: "14px 14px 14px 4px" }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {busy ? "Joining…" : "Join class"}
        </button>
      )}

      {state === "other" && (
        <div className="flex flex-col items-end gap-1.5">
          <span className="font-nunito text-[11px]" style={{ color: "#9CA3AF" }}>In another class</span>
          <button onClick={onJoin} disabled={busy}
            className="font-nunito font-bold text-[12px] px-4 py-2 flex items-center gap-1.5 disabled:opacity-60"
            style={{ border: "1px solid #E5E7EB", borderRadius: "100px", color: "#374151" }}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {busy ? "Switching…" : "Switch to this class"}
          </button>
        </div>
      )}
    </div>
  );
}
