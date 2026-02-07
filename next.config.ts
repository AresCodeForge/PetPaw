import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Compiler for automatic optimizations
  reactCompiler: true,
  
  // External packages that should not be bundled
  serverExternalPackages: ["pdfkit"],
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "srqmbjwqzmubcbevxeir.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
    ],
    // Faster image loading in development
    unoptimized: process.env.NODE_ENV === "development",
  },
  
  // Turbopack configuration (used with --turbo flag)
  turbopack: {
    // Resolve aliases for faster module resolution
    resolveAlias: {
      "@": "./src",
    },
  },
  
  // Experimental features for better performance
  experimental: {
    // Enable optimized package imports to reduce bundle size
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@tremor/react",
      "date-fns",
    ],
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
