"use client";

import Image from "next/image";
import { motion, useMotionTemplate, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Official art turned into a physical object: a card or book with thickness
 * that tilts in 3D toward the finger / pointer (and floats on its own when
 * nobody touches it), with a moving light glare. Pure CSS 3D — runs on every
 * phone, no WebGL needed.
 */
export default function Tilt3D({
  src,
  alt,
  width,
  height,
  maxTilt = 16,
  float = true,
  thickness = true,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  maxTilt?: number;
  float?: boolean;
  thickness?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const reduced = !!useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 120, damping: 14 });
  const ry = useSpring(0, { stiffness: 120, damping: 14 });
  const gx = useTransform(ry, [-maxTilt, maxTilt], [80, 20]);
  const gy = useTransform(rx, [-maxTilt, maxTilt], [20, 80]);
  const glare = useMotionTemplate`radial-gradient(60% 50% at ${gx}% ${gy}%, rgba(255,255,255,0.7), transparent 70%)`;

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let touching = false;
    let raf = 0;
    const idle = (t: number) => {
      if (!touching && float) { ry.set(Math.sin(t / 1600) * maxTilt * 0.55); rx.set(Math.cos(t / 2100) * maxTilt * 0.3); }
      raf = requestAnimationFrame(idle);
    };
    raf = requestAnimationFrame(idle);
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      if (Math.abs(px) > 1.2 || Math.abs(py) > 1.2) { touching = false; return; }
      touching = true;
      ry.set(px * maxTilt * 2); rx.set(-py * maxTilt * 2);
    };
    const leave = () => { touching = false; };
    window.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [reduced, float, maxTilt, rx, ry]);

  return (
    <div ref={ref} className={`wui-tilt ${className}`}>
      <motion.div className="wui-tilt__body" style={{ rotateX: rx, rotateY: ry, aspectRatio: `${width} / ${height}` }}>
        {thickness && <span className="wui-tilt__edge" aria-hidden="true" />}
        <Image src={src} alt={alt} width={width} height={height} priority={priority} className="wui-tilt__face"
          style={{ boxShadow: "0 2px 0 rgba(255,255,255,0.25) inset, 0 40px 70px rgba(0,0,0,0.55)" }} />
        <motion.span className="wui-tilt__glare" style={{ background: glare }} aria-hidden="true" />
      </motion.div>
    </div>
  );
}
