import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Game Receipts",
    short_name: "Receipts",
    description: "Call it. Lock it. Prove it. Lock timestamped sports predictions and build a permanent reputation.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050607",
    theme_color: "#050607",
    categories: ["sports", "social", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lock a take", url: "/create", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Leaderboards", url: "/leaderboards" },
    ],
  };
}
