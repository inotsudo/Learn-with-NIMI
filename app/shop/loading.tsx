import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function ShopLoading() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full pb-24 space-y-6">
        {/* Balance bar */}
        <div className="leaf-lg border border-gray-100 p-5 flex items-center gap-4">
          <Bone className="w-12 h-12 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Bone className="h-5 w-32" />
            <Bone className="h-4 w-20" />
          </div>
          <Bone className="h-10 w-28 rounded-full" />
        </div>

        {/* Three sections */}
        {Array.from({ length: 3 }).map((_, s) => (
          <div key={s} className="leaf-lg border border-gray-100 p-5 space-y-4">
            <Bone className="h-6 w-40" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="leaf border border-gray-100 p-3 space-y-3">
                  <Bone className="w-16 h-16 rounded-2xl mx-auto" />
                  <Bone className="h-4 w-full" />
                  <Bone className="h-4 w-2/3 mx-auto" />
                  <Bone className="h-8 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
