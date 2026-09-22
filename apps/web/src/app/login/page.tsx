"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingInAs, setSigningInAs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: mode } = useQuery({ queryKey: ["auth-mode"], queryFn: api.authMode });
  const { data: devUsers } = useQuery({
    queryKey: ["dev-users"],
    queryFn: api.devUsers,
    enabled: mode?.mode === "mock",
  });

  async function signInAs(userId: string) {
    setError(null);
    setSigningInAs(userId);
    try {
      await api.devLogin(userId);
      // Switching accounts via the picker (no sign-out in between) must not leak the
      // previous session's cached CR lists / conflict results into the new one.
      queryClient.clear();
      router.replace("/change-requests");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setSigningInAs(null);
    }
  }

  const grouped = new Map<string, typeof devUsers>();
  for (const u of devUsers ?? []) {
    const key = u.vendorOrgName ?? "HTX Global Governance";
    grouped.set(key, [...(grouped.get(key) ?? []), u]);
  }

  return (
    <div className="min-h-screen bg-surface-canvas font-body text-on-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-7">
          <span className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center font-headline font-bold text-lg mb-4 shadow-sm">
            C
          </span>
          <h1 className="font-headline text-2xl font-bold text-primary tracking-tight mb-1.5">Sign in to ChangeOps</h1>
          <p className="text-sm text-slate-500">
            {mode?.mode === "gitlab" ? "Continue with your HTX GitLab account." : "Choose an account to sign in as."}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm p-6">
          {mode?.mode === "gitlab" && (
            <a
              href={api.gitlabLoginUrl()}
              className="flex items-center justify-center gap-2 w-full rounded-md bg-primary text-white font-medium py-2.5 text-sm hover:bg-slate-800 transition-colors"
            >
              Continue with GitLab SSO
            </a>
          )}

          {mode?.mode === "mock" && (
            <div className="space-y-5">
              <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-code px-3 py-1.5 w-fit mx-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                AUTH_MODE=mock — local dev only
              </div>
              {[...grouped.entries()].map(([org, users]) => (
                <div key={org}>
                  <p className="font-code text-[11px] uppercase tracking-wide text-slate-400 mb-2">{org}</p>
                  <div className="space-y-1.5">
                    {users?.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => signInAs(u.id)}
                        disabled={signingInAs !== null}
                        className="w-full flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 hover:border-slate-400 hover:bg-white transition-colors px-3.5 py-2.5 text-left disabled:opacity-50"
                      >
                        <span>
                          <span className="block text-sm font-medium text-slate-900">{u.name}</span>
                          <span className="block text-xs text-slate-400 font-code">{u.email}</span>
                        </span>
                        <span className="text-[11px] font-code px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                          {u.role ? ROLE_LABELS[u.role] : "Pending"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
