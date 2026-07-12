import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function CertificatesLoading() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-4">
        <Bone className="h-28 leaf-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-36 leaf-lg" />
          ))}
        </div>
        <Bone className="h-48 leaf-lg" />
      </div>
    </AppShell>
  );
}
