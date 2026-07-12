import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function StoriesLoading() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6">
        {/* Hero banner skeleton */}
        <Bone className="h-48 leaf-lg" />

        {/* Filter tabs */}
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-9 rounded-full" style={{ width: 80 + i * 10 }} />
          ))}
        </div>

        {/* Story grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="leaf overflow-hidden border border-gray-100 space-y-0">
              <Bone className="aspect-square rounded-none rounded-t-[24px]" />
              <div className="p-3 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
