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
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
