"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCheck } from "lucide-react";
import supabase from "@/lib/supabaseClient";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  url: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  achievement: "🏆",
  reminder: "📖",
  challenge: "⭐",
  story: "📚",
  info: "💜",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export default function NotificationPanel({ isOpen, onClose, onCountChange }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data);
      onCountChange(data.filter(n => !n.read).length);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen]);

  useEffect(() => {
    void load();
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    onCountChange(notifications.filter(n => !n.read && n.id !== id).length);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unread);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onCountChange(0);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[320px] sm:w-[360px] theme-card border theme-border rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b theme-border">
              <h3 className="font-baloo font-black text-white text-[18px]">Notifications</h3>
              <div className="flex items-center gap-2">
                <button onClick={markAllRead} className="theme-text-muted hover:text-white text-[11px] font-nunito font-bold flex items-center gap-1 transition">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
                <button onClick={onClose} className="w-7 h-7 rounded-full theme-card-active hover:theme-accent/50 flex items-center justify-center theme-text-muted transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 theme-border-strong border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="text-3xl">🔔</span>
                  <p className="font-nunito theme-text-muted text-[14px] font-bold mt-2">No notifications yet</p>
                  <p className="font-nunito theme-text-muted text-[12px] mt-1">We&apos;ll let you know when something happens!</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button key={n.id} onClick={() => markRead(n.id)}
                    className={`w-full text-left px-4 py-3 flex gap-3 transition border-b theme-border ${
                      n.read ? "opacity-60" : "theme-accent/5 hover:theme-accent/10"
                    }`}>
                    <span className="text-[20px] shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? "💜"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-nunito text-[13px] font-bold leading-tight ${n.read ? "theme-text-muted" : "text-white"}`}>{n.title}</p>
                      <p className="font-nunito theme-text-muted text-[12px] mt-0.5 leading-snug">{n.body}</p>
                      <p className="font-nunito theme-text-muted text-[10px] mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <div className="w-2.5 h-2.5 bg-blue-400 rounded-full shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
