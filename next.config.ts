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
    // pdf-parse's real canvas dependency is @napi-rs/canvas (provides the
    // DOMMatrix polyfill pdfjs-dist needs) — NOT the "canvas" package, which
    // isn't even installed here. Listing the wrong name here is exactly why
    // PDF report generation throws "DOMMatrix is not defined" in production:
    // Turbopack was left free to mangle @napi-rs/canvas's dynamic native
    // binary require(), which only works when Node resolves it untouched.
    "@napi-rs/canvas",
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
  // @napi-rs/canvas ships a platform-specific native .node binary
  // (@napi-rs/canvas-linux-x64-gnu on Vercel's runtime) that it requires
  // dynamically at runtime based on process.platform/arch — a pattern
  // Next.js's automatic serverless file tracing can miss entirely, since it
  // can't statically see which binary package will be required. Force it in.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*"],
  },
};

export default nextConfig;
