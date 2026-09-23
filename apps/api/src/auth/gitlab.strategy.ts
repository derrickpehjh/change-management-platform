import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, type VerifyCallback } from "passport-openidconnect";
import { AuthService } from "./auth.service";
import { OidcCookieStateStore } from "./oidc-cookie-state.store";

/**
 * Real self-hosted GitLab SSO, registered only when AUTH_MODE=gitlab (see
 * auth.module.ts). Requires GITLAB_ISSUER_URL / GITLAB_CLIENT_ID /
 * GITLAB_CLIENT_SECRET / GITLAB_CALLBACK_URL — register the OAuth application
 * on your GitLab instance first (User Settings or Admin Area > Applications)
 * with scopes "openid email profile" and the callback URL above.
 */
@Injectable()
export class GitlabStrategy extends PassportStrategy(Strategy, "gitlab") {
  constructor(private readonly authService: AuthService) {
    super({
      issuer: process.env.GITLAB_ISSUER_URL,
      authorizationURL: `${process.env.GITLAB_ISSUER_URL}/oauth/authorize`,
      tokenURL: `${process.env.GITLAB_ISSUER_URL}/oauth/token`,
      userInfoURL: `${process.env.GITLAB_ISSUER_URL}/oauth/userinfo`,
      clientID: process.env.GITLAB_CLIENT_ID,
      clientSecret: process.env.GITLAB_CLIENT_SECRET,
      callbackURL: process.env.GITLAB_CALLBACK_URL,
      scope: "openid email profile",
      // No express-session in this app — keep the OIDC state in a signed cookie.
      store: new OidcCookieStateStore(process.env.JWT_SECRET as string),
    });
  }

  async validate(
    _issuer: string,
    profile: { id: string; emails?: { value: string }[]; displayName?: string },
    done: VerifyCallback,
  ) {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("GitLab profile did not include an email"));
      const user = await this.authService.findOrCreateFromGitlab({
        id: profile.id,
        email,
        displayName: profile.displayName ?? email,
      });
      done(null, user as unknown as Express.User);
    } catch (err) {
      done(err as Error);
    }
  }
}
