import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests through a review tunnel (Cloudflare or ngrok) for review.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app"],
};

export default nextConfig;
