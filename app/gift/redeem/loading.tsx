export default function GiftRedeemLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #fef3c7 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-pulse">
          {/* Card header shimmer */}
          <div className="h-52 rounded-t-3xl" style={{ background: "linear-gradient(135deg, #fda4af 0%, #f9a8d4 45%, #fcd34d 100%)" }}>
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
              <div className="text-6xl">🎁</div>
            </div>
          </div>
          {/* Body shimmer */}
          <div className="p-7 space-y-4">
            <div className="h-5 bg-gray-100 rounded-full w-2/3 mx-auto" />
            <div className="h-24 bg-rose-50 rounded-2xl" />
            <div className="h-14 bg-gray-100 rounded-2xl" />
            <div className="h-4 bg-gray-100 rounded-full w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
