"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, BellOff, Bell, Send } from "lucide-react";

interface PushHook {
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
}

interface NotifPref {
  dailyReminder: boolean;
  achievements: boolean;
  weeklyReport: boolean;
}

const PREF_KEY = "nimipiko-notif-prefs";

function loadPrefs(): NotifPref {
  try { return { dailyReminder: true, achievements: true, weeklyReport: true, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") }; }
  catch { return { dailyReminder: true, achievements: true, weeklyReport: true }; }
}

function getReminderLocalTime() {
  // Server sends at 17:00 UTC — show in user's local time
  const utc17 = new Date();
  utc17.setUTCHours(17, 0, 0, 0);
  return utc17.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

interface Props { push: PushHook; childName: string }

export default function PushNotificationsCard({ push, childName }: Props) {
  const [prefs, setPrefs] = useState<NotifPref>({ dailyReminder: true, achievements: true, weeklyReport: true });
  const [testSent, setTestSent] = useState(false);

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  const togglePref = (key: keyof NotifPref) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sendTest = async () => {
    if (testSent) return;
    setTestSent(true);
    try {
      await Notification.requestPermission();
      new Notification("🌿 NIMIPIKO Reminder", {
        body: `Time to practice with ${childName}! Keep that streak going 🔥`,
        icon: "/icons/icon-192x192.png",
      });
    } catch { /* permission denied or not supported */ }
    setTimeout(() => setTestSent(false), 3000);
  };

  const reminderTime = getReminderLocalTime();

  return (
    <div className="bg-white border border-ds-border p-5 shadow-ds-card" style={{ borderRadius: "var(--leaf-r-lg)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔔</span>
        <h2 className="font-black text-ds-text text-[18px]">Learning Reminders</h2>
        {push.isSubscribed && (
          <span className="ml-auto text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Bell className="w-3 h-3" /> On · {reminderTime} daily
          </span>
        )}
      </div>

      {/* Not supported */}
      {!push.supported && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <BellOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-amber-800 text-[13px]">Not supported in this browser</p>
            <p className="text-amber-700 text-[11px] mt-0.5 font-nunito">
              Open NimiPiko from your phone&apos;s home screen (Add to Home Screen) to get push notifications.
            </p>
          </div>
        </div>
      )}

      {/* Permission denied */}
      {push.supported && push.permission === "denied" && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <BellOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-red-700 text-[13px]">Notifications blocked</p>
            <p className="text-red-600 text-[11px] mt-0.5 font-nunito">
              Go to your browser settings → Site permissions → Notifications → Allow for this site, then come back here.
            </p>
          </div>
        </div>
      )}

      {/* Main toggle */}
      {push.supported && push.permission !== "denied" && (
        <>
          <div className="flex items-center gap-4 p-4 rounded-2xl border transition-colors"
            style={{ background: push.isSubscribed ? "var(--ds-brand-subtle)" : "#f9fafb", borderColor: push.isSubscribed ? "var(--ds-border-brand)" : "var(--ds-border)" }}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0 transition-all ${push.isSubscribed ? "bg-gradient-to-br from-[var(--ds-brand-primary)] to-[var(--ds-brand-hover)]" : "bg-gradient-to-br from-gray-400 to-gray-500"}`}>
              {push.isSubscribed ? "🔔" : "🔕"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-ds-text text-[14px]">
                {push.isSubscribed ? "Reminders are on" : "Daily learning reminders"}
              </p>
              <p className="text-gray-500 text-[11px] mt-0.5 font-nunito">
                {push.isSubscribed
                  ? `We'll nudge you to practice with ${childName} at ${reminderTime} every day`
                  : `Get a daily nudge at ${reminderTime} to keep the learning streak going`}
              </p>
              {push.error && <p className="text-red-500 text-[11px] mt-1 font-nunito">{push.error}</p>}
            </div>
            {push.loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 shrink-0" />
            ) : (
              <button
                onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${push.isSubscribed ? "bg-[var(--nimi-green)]" : "bg-gray-300"}`}>
                <motion.div
                  animate={{ x: push.isSubscribed ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full shadow" />
              </button>
            )}
          </div>

          {/* Notification types — only when subscribed */}
          <AnimatePresence>
            {push.isSubscribed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden">
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">What we notify you about</p>
                  {([
                    { key: "dailyReminder" as const,  label: "Daily practice reminder",      emoji: "⏰", desc: `Every day at ${reminderTime}` },
                    { key: "achievements"  as const,  label: "Achievement unlocked",          emoji: "🏆", desc: "When your child earns a badge or certificate" },
                    { key: "weeklyReport"  as const,  label: "Weekly progress report",        emoji: "📊", desc: "Every Monday morning" },
                  ]).map(item => (
                    <div key={item.key} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-ds-border rounded-xl">
                      <span className="text-base shrink-0">{item.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-ds-text">{item.label}</p>
                        <p className="text-[10px] text-gray-400 font-nunito">{item.desc}</p>
                      </div>
                      <button onClick={() => togglePref(item.key)}
                        className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${prefs[item.key] ? "bg-[var(--nimi-green)]" : "bg-gray-200"}`}>
                        <motion.div
                          animate={{ x: prefs[item.key] ? 16 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-5 h-5 bg-white rounded-full shadow" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Test notification */}
                <button onClick={sendTest} disabled={testSent}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-[12px] font-bold text-gray-500 hover:text-gray-700 border border-ds-border hover:border-gray-300 rounded-xl py-2 transition disabled:opacity-50">
                  <Send className="w-3.5 h-3.5" />
                  {testSent ? "Notification sent ✓" : "Send test notification"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
