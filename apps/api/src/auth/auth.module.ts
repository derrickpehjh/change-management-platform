import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GitlabStrategy } from "./gitlab.strategy";

const providers = [AuthService];
if ((process.env.AUTH_MODE ?? "mock") === "gitlab") {
  providers.push(GitlabStrategy as any);
}

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "12h" },
    }),
  ],
  controllers: [AuthController],
  providers,
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
