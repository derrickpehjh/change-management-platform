import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — is the process alive? K8s restarts the pod if this fails. */
  @Get("live")
  live() {
    return { status: "ok" };
  }

  /** Readiness — can it serve traffic? K8s holds traffic until this passes. */
  @Get("ready")
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }

  /** Legacy — kept for Docker healthcheck compatibility. */
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
