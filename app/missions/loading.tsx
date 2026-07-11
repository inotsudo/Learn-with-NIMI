import AppShell from "@/components/layout/AppShell";

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear", ...style }}
    />
  );
}

export default function MissionsLoading() {
  return (
    <AppShell>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 pb-24">
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
          {/* Main column */}
          <div className="space-y-4">
            {/* Banner */}
            <Bone className="h-36 leaf-lg" />
            {/* Mission grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Bone key={i} className="h-36 leaf" />
              ))}
            </div>
            {/* CTA */}
            <Bone className="h-20 leaf" />
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block space-y-4 mt-0">
            <Bone className="h-64 leaf-lg" />
            <Bone className="h-40 leaf-lg" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
