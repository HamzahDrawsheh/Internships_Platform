import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Repo root also has a package-lock.json; pin Turbopack to this app folder so `npm run dev` here stays stable.
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
