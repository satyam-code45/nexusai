import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Keep heavy server-only packages out of the Turbopack bundle so they load
  // directly from Node.js at runtime (avoids DOMMatrix / worker-path errors).
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "canvas",
    // Agenda job queue — uses MongoDB native driver internals Turbopack can't bundle
    "agenda",
    "@agendajs/mongo-backend",
    // Google Cloud / googleapis use dynamic requires
    "@google-cloud/pubsub",
    "googleapis",
    // Document processing packages with native bindings
    "mammoth",
    "word-extractor",
    "officeparser",
    // Cloudinary server SDK
    "cloudinary",
  ],
};

export default nextConfig;
