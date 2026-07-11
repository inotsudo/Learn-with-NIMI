// components/TodayStorybookViewer.tsx
"use client";
import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

export default function TodayStorybookViewer() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const path = `storybook/${today}.pdf`;

    const { data } = supabase.storage
      .from("storybook")
      .getPublicUrl(path);

    if (data?.publicUrl) {
      setPdfUrl(data.publicUrl);
    }
  }, []);

  if (!pdfUrl) return null;

  return (
    <div className="mt-8 p-4 bg-yellow-50 border leaf shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-4">📖 Today’s Storybook</h2>
      <div className="w-full h-[500px]">
        <iframe
          src={pdfUrl}
          className="w-full h-full rounded-lg border"
          title="Today’s Storybook"
        />
      </div>
    </div>
  );
}
