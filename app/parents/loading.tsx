import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function ParentsLoading() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-5 pb-24 space-y-4">
        <div className="flex items-center gap-3">
          <Bone className="w-16 h-16 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Bone className="h-5 w-40" />
            <Bone className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-20 leaf-lg" />
          ))}
        </div>
        <Bone className="h-52 leaf-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Bone className="h-36 leaf-lg" />
          <Bone className="h-36 leaf-lg" />
        </div>
      </div>
    </AppShell>
  );
}
