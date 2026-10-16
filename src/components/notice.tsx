"use client";
import { useEffect } from "react";
import { toast } from "sonner";

export function Notice({ notice }: { notice?: string }) {
  useEffect(() => {
    if (notice === "welcome") toast.success("Welcome to your room's conversation.", { id: "welcome" });
    if (notice === "admin-only") toast.error("That page is for this room's moderators.", { id: "admin-only" });
    if (notice === "room-unavailable") toast.error("That room is unavailable. Join with a valid room key first.", { id: "room-unavailable" });
  }, [notice]);
  return null;
}