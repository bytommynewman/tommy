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
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512?maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lock a take", url: "/create", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
      { name: "Leaderboards", url: "/leaderboards" },
    ],
  };
}
