"use client";
// 로그인 배경 — tsParticles NET (노드 연결망). 감염 확산/역학 네트워크 관제 컨셉.
// Canvas 기반이라 WebGL 셰이더 경고 없음. Spline iframe 대체. (@tsparticles/react v4 — Provider 방식)
import { useMemo } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

export default function ParticlesBg() {
  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: "transparent" },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: { value: 90, density: { enable: true, width: 1200, height: 800 } },
        color: { value: ["#A50034", "#e4002b", "#94a3b8"] },
        links: { enable: true, color: "#A50034", distance: 150, opacity: 0.3, width: 1 },
        move: { enable: true, speed: 0.9, outModes: { default: "bounce" } },
        size: { value: { min: 1, max: 3 } },
        opacity: { value: { min: 0.35, max: 0.7 } },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
          onClick: { enable: true, mode: "push" },
        },
        modes: {
          grab: { distance: 170, links: { opacity: 0.55 } },
          push: { quantity: 3 },
        },
      },
    }),
    []
  );

  return (
    <ParticlesProvider init={async (engine) => { await loadSlim(engine); }}>
      <Particles id="tsparticles" options={options} className="absolute inset-0 w-full h-full" />
    </ParticlesProvider>
  );
}
