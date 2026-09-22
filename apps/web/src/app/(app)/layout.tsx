"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { TopNav } from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isPendingAccess, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!user || isError) router.replace("/login");
  }, [user, isLoading, isError, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 font-code text-sm bg-surface-canvas">
        Loading…
      </div>
    );
  }

  if (isPendingAccess) {
    return (
      <div className="flex h-screen items-center justify-center px-4 bg-surface-canvas">
        <div className="max-w-md text-center bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
          <p className="font-code text-xs uppercase tracking-wide text-amber-600 mb-3">Pending access</p>
          <h1 className="font-headline text-2xl font-bold text-slate-900 mb-2">Almost there, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-slate-500">
            Your GitLab account has been recognised, but a customer admin still needs to assign your organisation
            and role before you can use the platform. Reach out to your HTX contact to grant access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-canvas">
      <TopNav />
      <main className="w-full pt-14 pb-12">{children}</main>
    </div>
  );
}
