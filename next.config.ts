import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Callback query strings carry one-time credentials. Do not emit them in
  // Next's development access/fetch/action logs. Review hosting logs separately.
  logging: {
    incomingRequests: { ignore: [/^\/auth\/(callback|confirm)(?:\?|\/|$)/] },
    fetches: { fullUrl: false },
    serverFunctions: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }, { source: "/auth/:path*", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
    ] }];
  },
};
export default config;