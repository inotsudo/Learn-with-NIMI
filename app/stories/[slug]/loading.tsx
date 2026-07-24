import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function StoryLoading() {
  return (
    <AppShell>
      <div className="max-w-lg mx-auto w-full px-4 py-6 pb-28 space-y-5">
        {/* Cover image */}
        <Bone className="w-full leaf-lg" style={{ height: 280 }} />

        {/* Title + subtitle */}
        <div className="space-y-2">
          <Bone className="h-7 w-3/4" />
          <Bone className="h-4 w-1/2" />
        </div>

        {/* Slot progress strip */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-2 flex-1 rounded-full" />
          ))}
        </div>

        {/* Synopsis */}
        <div className="space-y-2">
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-5/6" />
          <Bone className="h-3 w-4/6" />
        </div>

        {/* Mission cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="leaf border border-ds-border p-4 flex items-center gap-4">
            <Bone className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-2/3" />
              <Bone className="h-3 w-1/3" />
            </div>
            <Bone className="w-8 h-8 rounded-xl shrink-0" />
          </div>
        ))}

        {/* CTA button */}
        <Bone className="h-14 w-full leaf-lg" />
      </div>
    </AppShell>
  );
}
