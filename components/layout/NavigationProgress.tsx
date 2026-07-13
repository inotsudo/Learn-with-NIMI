"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Thin progress bar that appears at the top of the page during route transitions.
// Uses usePathname change as the "navigation complete" signal; the bar auto-starts
// on click of any <a> via a document event listener and completes when the new
// pathname is first seen by React.
export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  function clearTimers() {
    if (timerRef.current)   clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function startProgress() {
    clearTimers();
    setProgress(0);
    setVisible(true);
    let val = 0;
    intervalRef.current = setInterval(() => {
      // Asymptotic advance: fast at first, slows toward 90%
      val = val < 30 ? val + 8 : val < 60 ? val + 4 : val < 85 ? val + 1 : val;
      setProgress(val);
    }, 80);
  }

  function finishProgress() {
    clearTimers();
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }

  // Start bar on any anchor click that looks like an internal navigation
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#")) return;
      startProgress();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Finish bar when pathname changes (new page rendered)
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      finishProgress();
    }
  }, [pathname]);

  useEffect(() => () => clearTimers(), []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "var(--theme-accent, #15803D)",
          transition: progress === 100
            ? "width 0.15s ease-out"
            : "width 0.08s linear",
          boxShadow: "0 0 8px var(--theme-accent, #15803D)",
        }}
      />
    </div>
  );
}
