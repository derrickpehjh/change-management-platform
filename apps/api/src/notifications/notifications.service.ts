import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger("Email");

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates the in-app notification and "sends" the email. The email side is
   * a stub — it logs instead of calling an SMTP/SES provider — swap
   * `sendEmail` for a real provider when one is available; nothing else in
   * the call chain needs to change.
   */
  async notify(userId: string, params: { type: string; title: string; body: string; link?: string }) {
    const [notification, user] = await Promise.all([
      this.prisma.notification.create({
        data: { userId, type: params.type, title: params.title, body: params.body, link: params.link },
      }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (user) this.sendEmail(user.email, params.title, params.body);
    return notification;
  }

  async notifyMany(userIds: string[], params: { type: string; title: string; body: string; link?: string }) {
    await Promise.all(userIds.map((id) => this.notify(id, params)));
  }

  private sendEmail(to: string, subject: string, body: string) {
    this.logger.log(`[stub] to=${to} subject="${subject}" body="${body}"`);
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
}
