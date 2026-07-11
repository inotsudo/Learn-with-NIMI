import AppShell from "@/components/layout/AppShell";
import MagicLoader from "@/components/magic/MagicLoader";

export default function TalkToNimiLoading() {
  return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <MagicLoader variant="default" fullPage={false} />
      </div>
    </AppShell>
  );
}
