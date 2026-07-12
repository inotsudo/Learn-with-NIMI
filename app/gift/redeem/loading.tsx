import { Bone } from "@/components/ui/Bone";

export default function GiftRedeemLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Bone className="h-32 leaf-lg" />
        <Bone className="h-14 leaf-lg" />
        <Bone className="h-14 leaf-lg" />
      </div>
    </div>
  );
}
