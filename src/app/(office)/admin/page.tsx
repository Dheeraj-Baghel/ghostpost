import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
export default async function LegacyAdmin() { await requireUser(); redirect("/rooms/00000000-0000-4000-8000-000000000001/admin"); }
