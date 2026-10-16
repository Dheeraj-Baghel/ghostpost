import { requireMember } from "@/lib/auth";
import { Avatar, Brand } from "@/components/brand";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
export const dynamic = "force-dynamic";
export default async function RoomLayout({ children, params }: { children: React.ReactNode; params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const { member, rooms } = await requireMember(roomId);
  return <div className="min-h-dvh bg-canvas">
    <header className="sticky top-0 z-20 border-b border-border bg-canvas"><div className="mx-auto flex min-h-[72px] max-w-[1280px] items-center gap-2 px-4 sm:gap-6 sm:px-6">
      <Brand href="/rooms" small /><AppNav member={member} rooms={rooms} />
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3"><Avatar alias={member.alias} size="small" /><span className="hidden max-w-[190px] truncate text-sm font-medium xl:block">{member.alias}</span><SignOutButton /></div>
    </div></header>
    <main id="main" className="mx-auto min-h-[75vh] w-full max-w-[1280px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12">{children}</main>
    <footer className="mx-auto flex max-w-[1280px] flex-col justify-between gap-3 border-t border-border px-6 py-8 text-xs leading-5 text-muted sm:flex-row"><p>GhostPost · Your people, without the name tags.</p><p className="max-w-md sm:text-right">A different ghost in every room. Not anonymous to the operator.<br />Keep personal details out. Report anything that crosses a line.</p></footer>
  </div>;
}
