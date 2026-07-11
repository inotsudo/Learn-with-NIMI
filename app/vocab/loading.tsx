import AppShell from "@/components/layout/AppShell";

function Bone({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear" }} />
  );
}

export default function VocabLoading() {
  return (
    <AppShell>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="max-w-4xl mx-auto w-full pb-24 space-y-6">
        <Bone className="h-10 w-48 mt-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="leaf border border-gray-100 p-4 space-y-3">
              <Bone className="w-14 h-14 rounded-2xl mx-auto" />
              <Bone className="h-5 w-3/4 mx-auto" />
              <Bone className="h-4 w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
