import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SystemAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.systemAsset.findMany({ orderBy: { name: "asc" } });
  }

  create(name: string, description?: string) {
    return this.prisma.systemAsset.create({ data: { name, description } });
  }

  delete(id: string) {
    return this.prisma.systemAsset.delete({ where: { id } });
  }
}
