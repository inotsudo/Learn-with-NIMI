import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function MasterpieceLoading() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">
        {/* Step bar */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="h-8 flex-1 rounded-full" />
          ))}
        </div>

        {/* Story picker grid */}
        <Bone className="h-10 w-56" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-44 leaf-lg" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
