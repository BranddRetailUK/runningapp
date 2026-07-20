import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Runline",
    short_name: "Runline",
    description: "Private treadmill run tracking and analytics.",
    start_url: "/",
    display: "standalone",
    background_color: "#08110f",
    theme_color: "#08110f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
