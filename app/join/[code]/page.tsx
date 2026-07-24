import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import JoinClassSection from "./JoinClassSection";
import { getAnonClient } from "@/lib/supabase/serviceClient";

interface ClassInfo {
  teacher_id: string;
  teacher_name: string;
  school_name: string | null;
  class_name: string | null;
  class_code: string;
}
interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const { data } = await getAnonClient().rpc("get_class_by_code", { p_code: code.toUpperCase() });
  const cls = data?.[0] as ClassInfo | undefined;
  if (!cls) return { title: "Class not found – NIMIPIKO" };
  return {
    title: `${cls.class_name ?? "Class"} – NIMIPIKO`,
    description: `Announcements and updates from ${cls.teacher_name}${cls.school_name ? ` at ${cls.school_name}` : ""}`,
  };
}

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data: classRows } = await getAnonClient().rpc("get_class_by_code", { p_code: code.toUpperCase() });
  const cls = classRows?.[0] as ClassInfo | undefined;
  if (!cls) notFound();

  const { data: ann } = await getAnonClient()
    .from("class_announcements")
    .select("id,title,body,created_at")
    .eq("teacher_id", cls.teacher_id)
    .order("created_at", { ascending: false });

  const announcements = (ann ?? []) as Announcement[];

  return (
    <div className="min-h-[100dvh] font-nunito" style={{ background: "var(--ds-surface-page,#F9FAFB)" }}>
      {/* Header */}
      <header style={{ background: "#15803d" }}>
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🌿</div>
            <span className="font-baloo font-black text-white text-[16px]">NIMIPIKO</span>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* Class card */}
        <div className="mb-8 p-7 shadow-sm"
          style={{
            background: "#FFFFFF",
            borderRadius: "var(--leaf-r-lg,28px 28px 28px 7px)",
            border: "1px solid var(--ds-border-primary,#E5E7EB)",
          }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 flex items-center justify-center shrink-0 text-[28px]"
              style={{ background: "var(--ds-brand-subtle,#F0FDF4)", borderRadius: "var(--leaf-r,20px 20px 20px 5px)" }}>
              📚
            </div>
            <div>
              <h1 className="font-baloo font-black text-[24px]" style={{ color: "#111827" }}>
                {cls.class_name ?? "Class"}
              </h1>
              <p className="font-nunito text-[14px] mt-1" style={{ color: "#6B7280" }}>
                {cls.teacher_name}
                {cls.school_name && <> · {cls.school_name}</>}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5"
                style={{ background: "var(--ds-brand-subtle,#F0FDF4)", borderRadius: "100px" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#15803d" }} />
                <span className="font-nunito font-bold text-[12px]" style={{ color: "#15803d" }}>
                  Class Code: {cls.class_code}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Join section — client island (auth-aware) */}
        <JoinClassSection
          teacherId={cls.teacher_id}
          classCode={cls.class_code}
          className={cls.class_name}
          teacherName={cls.teacher_name}
        />

        {/* Announcements */}
        <div className="mt-12">
          <div className="mb-5">
            <h2 className="font-baloo font-black text-[20px]" style={{ color: "#111827" }}>
              Announcements
            </h2>
            <p className="font-nunito text-[13px] mt-0.5" style={{ color: "#6B7280" }}>
              Messages from {cls.teacher_name}
            </p>
          </div>

          {announcements.length === 0 ? (
            <div className="py-14 text-center"
              style={{
                border: "1px dashed #E5E7EB",
                borderRadius: "var(--leaf-r,20px 20px 20px 5px)",
                background: "#FFFFFF",
              }}>
              <p className="text-[32px] mb-3">📭</p>
              <p className="font-baloo font-black text-[17px]" style={{ color: "#111827" }}>No announcements yet</p>
              <p className="font-nunito text-[13px] mt-1" style={{ color: "#6B7280" }}>
                Check back soon for updates from your teacher.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map(a => (
                <div key={a.id} className="p-6 shadow-sm"
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "var(--leaf-r,20px 20px 20px 5px)",
                    border: "1px solid var(--ds-border-primary,#E5E7EB)",
                  }}>
                  {a.title && (
                    <h3 className="font-baloo font-black text-[17px] mb-2" style={{ color: "#111827" }}>
                      {a.title}
                    </h3>
                  )}
                  <p className="font-nunito text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "#374151" }}>
                    {a.body}
                  </p>
                  <p className="font-nunito text-[12px] mt-4" style={{ color: "#9CA3AF" }}>
                    {fmt(a.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-14 text-center">
          <p className="font-nunito text-[12px]" style={{ color: "#9CA3AF" }}>
            Powered by{" "}
            <Link href="/" className="font-bold hover:underline" style={{ color: "#15803d" }}>NIMIPIKO</Link>
            {" "}· Multilingual reading for children
          </p>
        </div>
      </div>
    </div>
  );
}
