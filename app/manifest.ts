import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rs9 HRMS",
    short_name: "Rs9 HRMS",
    description: "RS9 Group Human Resource Management System",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#744868",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/rs9-hrms-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/rs9-hrms-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
