import type { NextConfig } from "next";

// MuJoCo's WASM engine is loaded at runtime from public/mujoco/ (see mujocoRuntime.ts), not bundled,
// so no webpack/turbopack Node-builtin stubbing is needed here.
const nextConfig: NextConfig = {};

export default nextConfig;
