"use client";

import { useEffect, useId, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * DOM-over-3D bridge (replaces drei <Html>). A 3D component drops an
 * <Overlay> anchor into the scene; <OverlayHost> — rendered in the normal DOM
 * tree above the canvas — draws the content at the anchor's projected screen
 * position. One React tree (context works), no extra React roots (no
 * StrictMode unmount races), one rAF loop for every anchor.
 */
interface Entry { node: ReactNode; z: number; transform: string }

const entries = new Map<string, Entry>();
const positions = new Map<string, { x: number; y: number; visible: boolean }>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function Overlay({
  children, position, z = 20, transform = "translate(-50%, -50%)",
}: {
  children: ReactNode;
  position?: [number, number, number];
  z?: number;
  /** CSS transform of the content relative to the anchor point. */
  transform?: string;
}) {
  const id = useId();
  const g = useRef<THREE.Group>(null);
  const v = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    entries.set(id, { node: children, z, transform });
    emit();
  }, [id, children, z, transform]);
  useEffect(() => () => { entries.delete(id); positions.delete(id); emit(); }, [id]);

  useFrame(({ camera, size }) => {
    if (!g.current) return;
    g.current.getWorldPosition(v);
    v.project(camera);
    positions.set(id, { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, visible: v.z > -1 && v.z < 1 });
  });

  return <group ref={g} position={position} />;
}

export function OverlayHost({ zIndex = 4 }: { zIndex?: number }) {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const els = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      els.current.forEach((el, id) => {
        const p = positions.get(id);
        if (p?.visible) {
          el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
          el.style.visibility = "";
        } else {
          el.style.visibility = "hidden";
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="nw-layer" style={{ zIndex }}>
      {[...entries].map(([id, e]) => (
        <div
          key={id}
          ref={(el) => { if (el) els.current.set(id, el); else els.current.delete(id); }}
          style={{ position: "absolute", left: 0, top: 0, zIndex: e.z, visibility: "hidden", willChange: "transform" }}
        >
          <div style={{ transform: e.transform }}>{e.node}</div>
        </div>
      ))}
    </div>
  );
}
