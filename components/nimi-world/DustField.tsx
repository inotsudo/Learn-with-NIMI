"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import type { WorldTheme } from "./themes";

const BOX = { x: 9, y: 5.5, z: 4 };

/** Seeded PRNG (module scope so render stays pure). */
function seeded(seed: number) {
  let a = seed;
  return () => (a = (a * 16807) % 2147483647) / 2147483647;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uRise;
  uniform float uDpr;
  uniform vec3 uBox;
  attribute vec4 aSeed; // x speed, y phase, z size, w colour mix
  varying float vAlpha;
  varying float vMix;
  void main() {
    vec3 p = position;
    float t = uTime * (0.18 + aSeed.x * 0.42) * uRise;
    p.y = mod(p.y + uBox.y + t, uBox.y * 2.0) - uBox.y;
    p.x += sin(uTime * 0.35 + aSeed.y * 6.2831) * 0.4;
    p.z += cos(uTime * 0.27 + aSeed.y * 3.1) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uDpr * (0.35 + aSeed.z) * (7.0 / -mv.z);
    float twinkle = 0.5 + 0.5 * sin(uTime * (0.8 + aSeed.x * 2.2) + aSeed.y * 12.0);
    // fade near the top/bottom of the volume so motes never pop
    float edge = smoothstep(uBox.y, uBox.y * 0.7, abs(p.y));
    vAlpha = (0.25 + 0.75 * twinkle) * edge;
    vMix = aSeed.w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAlpha;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 2.2) * vAlpha;
    vec3 col = mix(uColorA, uColorB, vMix);
    gl_FragColor = vec4(col * a, a);
  }
`;

function Dust({ theme, px, py }: { theme: WorldTheme; px: MotionValue<number>; py: MotionValue<number> }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { count, size, rise, colorA, colorB } = theme.dust;
  const { positions, seeds } = useMemo(() => {
    const r = seeded(1337);
    const pos = new Float32Array(count * 3);
    const sd = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() * 2 - 1) * BOX.x;
      pos[i * 3 + 1] = (r() * 2 - 1) * BOX.y;
      pos[i * 3 + 2] = (r() * 2 - 1) * BOX.z;
      sd[i * 4] = r();
      sd[i * 4 + 1] = r();
      sd[i * 4 + 2] = Math.pow(r(), 2.5); // mostly fine dust, a few bright motes
      sd[i * 4 + 3] = r();
    }
    return { positions: pos, seeds: sd };
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSize: { value: size },
    uRise: { value: rise },
    uDpr: { value: 1 },
    uBox: { value: new THREE.Vector3(BOX.x, BOX.y, BOX.z) },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
  }), [size, rise, colorA, colorB]);

  const mat = useRef<THREE.ShaderMaterial>(null);
  const look = useRef(new THREE.Vector3());
  useFrame((st, dt) => {
    const m = mat.current;
    if (m) {
      m.uniforms.uTime.value += Math.min(dt, 0.05);
      m.uniforms.uDpr.value = dpr;
    }
    // the dust layer sits "in front" of the art → stronger parallax than the plate
    const cam = st.camera;
    cam.position.x += (px.get() * 0.9 - cam.position.x) * 0.06;
    cam.position.y += (-py.get() * 0.55 - cam.position.y) * 0.06;
    cam.lookAt(look.current);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 4]} />
      </bufferGeometry>
      <shaderMaterial
        key={`${colorA}-${colorB}-${size}-${rise}`}
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Pure CSS motes — only used when the browser has no WebGL. */
function CssDust({ theme }: { theme: WorldTheme }) {
  const motes = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: 34 }, () => ({ left: r() * 100, top: 40 + r() * 60, size: 2 + r() * 4, dur: 10 + r() * 14, delay: -r() * 24, b: r() > 0.5 }));
  }, []);
  return (
    <div className="nw-layer" aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="nw-rise"
          style={{
            position: "absolute", left: `${m.left}%`, top: `${m.top}%`, width: m.size, height: m.size, borderRadius: 999,
            background: m.b ? theme.dust.colorB : theme.dust.colorA,
            boxShadow: `0 0 ${m.size * 3}px ${theme.dust.colorA}`,
            mixBlendMode: "screen",
            animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Floating light particles in front of the artwork (theme-coloured; never covers it). */
export default function DustField({
  theme, px, py, webgl, reduced,
}: {
  theme: WorldTheme; px: MotionValue<number>; py: MotionValue<number>; webgl: boolean; reduced: boolean;
}) {
  if (reduced) return null;
  if (!webgl) return <CssDust theme={theme} />;
  return (
    <div className="nw-layer" aria-hidden="true">
      <Canvas
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        camera={{ position: [0, 0, 8], fov: 55 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      >
        <Dust theme={theme} px={px} py={py} />
      </Canvas>
    </div>
  );
}
