import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "cloudflare:workers": "./lib/cf-shim.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "cloudflare:workers": path.resolve(__dirname, "lib/cf-shim.ts"),
    };
    return config;
  },
};

export default nextConfig;
