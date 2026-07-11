import { useEffect, useState } from "react";

export function useSwUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // When a new SW takes control, the page code is stale — offer a reload.
    const onControllerChange = () => setUpdateReady(true);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Also catch the case where a new SW is already in "waiting" when this
    // component mounts (e.g. the tab was backgrounded during deployment).
    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
        return;
      }
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return { updateReady };
}
