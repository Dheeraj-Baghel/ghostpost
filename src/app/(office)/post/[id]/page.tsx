import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
export default async function LegacyPost({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(); const { id } = await params; if (!idSchema.safeParse(id).success) notFound();
  redirect(`/rooms/00000000-0000-4000-8000-000000000001/post/${id}`);
}
