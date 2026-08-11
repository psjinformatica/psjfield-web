import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PSJField",
    short_name: "PSJField",
    description: "Gestão mobile de chamados técnicos",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#0F3D63",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
