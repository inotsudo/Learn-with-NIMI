import AppShell from "@/components/layout/AppShell";

function Bone({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear" }} />
  );
}

export default function ThemesLoading() {
  return (
    <AppShell>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="max-w-4xl mx-auto w-full pb-24 space-y-6">
        <Bone className="h-10 w-40 mt-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="leaf-lg border border-gray-100 overflow-hidden space-y-3">
              <Bone className="h-36 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Bone className="h-5 w-2/3" />
                <Bone className="h-4 w-full" />
                <Bone className="h-9 w-full rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
