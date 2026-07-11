import AppShell from "@/components/layout/AppShell";

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear", ...style }}
    />
  );
}

export default function CommunityLoading() {
  return (
    <AppShell>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="max-w-3xl mx-auto w-full pb-24">
        {/* Friends bubbles */}
        <div className="flex items-center gap-3 mb-5 px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="w-11 h-11 rounded-full shrink-0" />
          ))}
        </div>

        {/* Upload button placeholder */}
        <Bone className="h-12 w-full mb-6 leaf" />

        {/* Creation card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="leaf-lg overflow-hidden border border-gray-100">
              <Bone className="w-full h-44 rounded-none" />
              <div className="p-4 space-y-2">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
                <div className="flex items-center gap-3 pt-1">
                  <Bone className="h-7 w-16 rounded-full" />
                  <Bone className="h-7 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
