import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budgeting",
    short_name: "Budgeting",
    description: "Atur pemasukan, budget bulanan, dan pengeluaranmu",
    start_url: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#a3e635",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
