import AppShell from "@/components/layout/AppShell";

function Bone({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear" }} />
  );
}

export default function HelpLoading() {
  return (
    <AppShell>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="max-w-3xl mx-auto w-full pb-24 space-y-5 mt-4">
        <Bone className="h-10 w-56" />
        <Bone className="h-12 w-full rounded-xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="leaf border border-gray-100 p-5 space-y-3">
            <Bone className="h-5 w-1/2" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </AppShell>
  );
}
