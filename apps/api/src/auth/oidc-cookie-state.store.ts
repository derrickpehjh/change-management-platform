import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";

const COOKIE = "cmp_oidc_state";
const MAX_AGE_MS = 10 * 60 * 1000;

type StoredState = {
  handle: string;
  nonce?: string;
  maxAge?: number;
  issued?: string;
  state?: unknown;
};

type OidcCtx = { nonce?: string; maxAge?: number; issued?: Date | string };

/**
 * OIDC `state` store for passport-openidconnect that keeps the pending login
 * state in a short-lived, HMAC-signed, httpOnly cookie instead of
 * `req.session`. The default store requires express-session, which this API
 * doesn't use (auth is a stateless JWT cookie) — without this, GET
 * /auth/gitlab fails with "OpenID Connect requires session support".
 *
 * Being cookie-based it also works across multiple API replicas without a
 * shared session backend.
 */
export class OidcCookieStateStore {
  constructor(private readonly secret: string) {}

  store(
    req: Request,
    ctx: OidcCtx,
    appState: unknown,
    _meta: unknown,
    cb: (err: Error | null, handle?: string) => void,
  ) {
    const res = req.res as Response | undefined;
    if (!res) return cb(new Error("OIDC state store: response object unavailable"));

    const handle = randomBytes(24).toString("base64url");
    const payload: StoredState = { handle };
    if (ctx.nonce) payload.nonce = ctx.nonce;
    if (ctx.maxAge) payload.maxAge = ctx.maxAge;
    if (ctx.issued) payload.issued = new Date(ctx.issued).toISOString();
    if (appState) payload.state = appState;

    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    res.cookie(COOKIE, `${body}.${this.sign(body)}`, {
      httpOnly: true,
      // Lax is sent on the top-level GET redirect back from GitLab.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE_MS,
      path: "/",
    });
    cb(null, handle);
  }

  verify(
    req: Request,
    handle: string,
    cb: (err: Error | null, ctx: OidcCtx | false, stateOrInfo?: unknown) => void,
  ) {
    const raw: string | undefined = req.cookies?.[COOKIE];
    (req.res as Response | undefined)?.clearCookie(COOKIE, { path: "/" });

    const fail = (message: string) => cb(null, false, { message });
    if (!raw) return fail("Unable to verify authorization request state.");

    const [body, sig] = raw.split(".");
    if (!body || !sig || !this.safeEqual(sig, this.sign(body))) {
      return fail("Invalid authorization request state.");
    }

    let stored: StoredState;
    try {
      stored = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      return fail("Invalid authorization request state.");
    }
    if (!handle || !this.safeEqual(stored.handle, handle)) {
      return fail("Invalid authorization request state.");
    }

    const ctx: OidcCtx = { nonce: stored.nonce, maxAge: stored.maxAge };
    if (stored.issued) ctx.issued = new Date(stored.issued);
    cb(null, ctx, stored.state);
  }

  private sign(value: string) {
    return createHmac("sha256", this.secret).update(value).digest("base64url");
  }

  private safeEqual(a: string, b: string) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  }
}
