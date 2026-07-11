function Bone({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear" }} />
  );
}

export default function SchoolsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-4">
          <Bone className="h-12 w-64 mx-auto" />
          <Bone className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
              <Bone className="w-12 h-12 rounded-2xl" />
              <Bone className="h-5 w-3/4" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
