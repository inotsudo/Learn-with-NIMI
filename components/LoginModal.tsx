"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-xl p-6 text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-4">Login Needed</DialogTitle>
        </DialogHeader>
        <p className="mb-6">🔐 Please log in to save your mission progress and unlock rewards!</p>
        <Button
          onClick={() => {
            onClose();
            router.push("/loginpage");
          }}
        >
          Login Now
        </Button>
      </DialogContent>
    </Dialog>
  );
}
