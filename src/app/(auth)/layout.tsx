import { Brand } from "@/components/brand";
import { Ghost } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col"><header className="mx-auto w-full max-w-[1280px] px-6 py-5"><Brand /></header><main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-16">{children}</main><footer className="flex items-center justify-center gap-2 px-5 pb-8 text-xs text-muted"><Ghost size={14} /> say it without saying who you are</footer></div>;
}