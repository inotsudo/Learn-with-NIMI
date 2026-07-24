import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function MissionLoading() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 pb-28 space-y-5">
        {/* Story title + slot breadcrumb */}
        <div className="flex items-center gap-3">
          <Bone className="h-8 w-8 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Bone className="h-5 w-48" />
            <Bone className="h-3 w-28" />
          </div>
        </div>

        {/* Progress bar */}
        <Bone className="h-2 w-full rounded-full" />

        {/* Main content area */}
        <Bone className="w-full leaf-lg" style={{ height: 320 }} />

        {/* Character/vocab strip */}
        <div className="flex items-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Bone className="w-12 h-12 rounded-2xl" />
              <Bone className="h-3 w-10" />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Bone className="h-14 leaf-lg" />
          <Bone className="h-14 leaf-lg" />
        </div>
      </div>
    </AppShell>
  );
}
