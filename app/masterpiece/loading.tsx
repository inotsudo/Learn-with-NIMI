import AppShell from "@/components/layout/AppShell";
import MagicLoader from "@/components/magic/MagicLoader";

export default function MasterpieceLoading() {
  return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <MagicLoader variant="shop" fullPage={false} />
      </div>
    </AppShell>
  );
}
