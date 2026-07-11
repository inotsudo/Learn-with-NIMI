function Bone({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${className ?? ""}`}
      style={{ animation: "shimmer 1.5s infinite linear" }} />
  );
}

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
        <div className="text-center space-y-4">
          <Bone className="h-12 w-48 mx-auto" />
          <Bone className="h-6 w-80 mx-auto" />
          <Bone className="h-10 w-40 mx-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`bg-white rounded-3xl border p-8 space-y-5 ${i === 1 ? "border-green-200 shadow-lg" : "border-gray-100"}`}>
              <Bone className="h-6 w-24" />
              <Bone className="h-12 w-32" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => <Bone key={j} className="h-4 w-full" />)}
              </div>
              <Bone className="h-12 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
