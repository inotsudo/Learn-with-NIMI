import AppShell from "@/components/layout/AppShell";
import { Bone } from "@/components/ui/Bone";

export default function TalkToNimiLoading() {
  return (
    <AppShell>
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pb-24 space-y-3 pt-4">
        <Bone className="h-14 leaf-lg" />
        <div className="flex-1 space-y-3">
          <Bone className="h-16 w-3/4 leaf-lg" />
          <Bone className="h-12 w-2/3 leaf-lg ml-auto" />
          <Bone className="h-16 w-4/5 leaf-lg" />
          <Bone className="h-12 w-1/2 leaf-lg" />
        </div>
        <Bone className="h-14 leaf-lg mt-auto" />
      </div>
    </AppShell>
  );
}
