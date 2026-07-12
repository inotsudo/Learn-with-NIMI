import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function SettingsLoading() {
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24 space-y-4">
        <Bone className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          <Bone className="h-48 leaf-lg" />
          <Bone className="h-48 leaf-lg" />
        </div>
        <Bone className="h-24 leaf-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Bone className="h-40 leaf-lg" />
          <Bone className="h-40 leaf-lg" />
        </div>
      </div>
    </AppShell>
  );
}
