import AppShell from "@/components/layout/AppShell";

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear", ...style }}
    />
  );
}

export default function UserProfileLoading() {
  return (
    <AppShell>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="max-w-lg mx-auto w-full pb-24 px-4 space-y-4 pt-2">
        {/* Greeting card skeleton */}
        <div className="rounded-3xl border border-gray-100 p-5 flex items-center gap-4">
          <Bone className="w-16 h-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-5 w-36" />
            <Bone className="h-3 w-24" />
          </div>
        </div>

        {/* Stats row */}
        <div className="rounded-3xl border border-gray-100 p-5 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Bone className="h-7 w-12 mx-auto" />
              <Bone className="h-2.5 w-10 mx-auto" />
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="h-9 flex-1 rounded-full" />
          ))}
        </div>

        {/* Today's progress card */}
        <div className="rounded-3xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-4">
            <Bone className="w-[72px] h-[72px] rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-28" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-1">
              <Bone className="w-6 h-6 rounded-lg shrink-0" />
              <Bone className="h-3 flex-1" />
              <Bone className="w-5 h-5 rounded-full shrink-0" />
            </div>
          ))}
        </div>

        {/* Week streak + chart row */}
        <div className="grid grid-cols-2 gap-3">
          <Bone className="h-28 rounded-3xl" />
          <Bone className="h-28 rounded-3xl" />
        </div>

        {/* Badges */}
        <div className="rounded-3xl border border-gray-100 p-5 space-y-3">
          <Bone className="h-4 w-28" />
          <Bone className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Bone key={i} className="aspect-square rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
