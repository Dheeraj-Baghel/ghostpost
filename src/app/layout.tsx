import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GhostPost — your people, your private rooms", template: "%s · GhostPost" },
  description: "say it without saying who you are. Private, code-joined rooms for your people. A different ghost in every room.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#fbfbf9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[16px] focus:bg-ink focus:p-3 focus:text-white">Skip to content</a>
    {children}
    <Toaster theme="light" closeButton position="bottom-right" toastOptions={{ style: { background: "#fff", borderColor: "#dadad3", color: "#262622", borderRadius: "16px" } }} />
  </body></html>;
}