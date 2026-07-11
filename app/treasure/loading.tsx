import AppShell from "@/components/layout/AppShell";

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear", ...style }}
    />
  );
}

export default function TreasureLoading() {
  return (
    <AppShell>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="max-w-5xl mx-auto w-full pb-24">
        {/* Green hero panel */}
        <div className="leaf-lg overflow-hidden mb-6">
          <Bone className="w-full rounded-none" style={{ height: 200 }} />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="leaf border border-gray-100 p-4 space-y-2 text-center">
              <Bone className="w-10 h-10 rounded-xl mx-auto" />
              <Bone className="h-5 w-16 mx-auto" />
              <Bone className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>

        {/* Badge grid */}
        <div className="leaf-lg border border-gray-100 p-5 space-y-4 mb-6">
          <Bone className="h-6 w-36" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="leaf border border-gray-100 p-4 flex flex-col items-center gap-2">
                <Bone className="w-16 h-16 rounded-2xl" />
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Streak section */}
        <div className="leaf-lg border border-gray-100 p-5 space-y-4">
          <Bone className="h-6 w-28" />
          <div className="flex items-center justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <Bone key={i} className="w-10 h-10 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
