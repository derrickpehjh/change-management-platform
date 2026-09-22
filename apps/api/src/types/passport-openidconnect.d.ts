declare module "passport-openidconnect" {
  import { Strategy as PassportStrategy } from "passport";

  export type VerifyCallback = (err: Error | null, user?: unknown, info?: unknown) => void;

  export interface StrategyOptions {
    issuer?: string;
    authorizationURL: string;
    tokenURL: string;
    userInfoURL: string;
    clientID?: string;
    clientSecret?: string;
    callbackURL?: string;
    scope?: string | string[];
  }

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (issuer: string, profile: any, done: VerifyCallback) => void,
    );
    name: string;
  }
}
