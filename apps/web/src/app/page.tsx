"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user || isError) router.replace("/login");
    else router.replace("/change-requests");
  }, [user, isLoading, isError, router]);

  return (
    <div className="flex h-screen items-center justify-center text-slate-400 font-code text-sm bg-surface-canvas">Loading…</div>
  );
}
