import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
export default async function Join() { await requireUser(); redirect("/rooms#join-room"); }
