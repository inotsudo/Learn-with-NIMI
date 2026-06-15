"use client";

import { useCallback, useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useUser } from "@/contexts/UserContext";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useUser();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
      setSupported(ok);
      if (!ok) { setLoading(false); return; }

      setPermission(Notification.permission);

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const sub = await registration?.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || !user) return;
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setError("Notification permission was not granted.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const json = subscription.toJSON();
      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          parent_id: user.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: "endpoint" }
      );
      if (dbError) throw dbError;

      setIsSubscribed(true);
    } catch (err: any) {
      console.error("[usePushNotifications] subscribe failed:", err);
      setError(err.message || "Failed to enable push notifications.");
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err: any) {
      console.error("[usePushNotifications] unsubscribe failed:", err);
      setError(err.message || "Failed to disable push notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, isSubscribed, loading, error, subscribe, unsubscribe };
}
