import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VendorOrgsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.vendorOrg.findMany({ orderBy: { name: "asc" } });
  }

  create(name: string) {
    return this.prisma.vendorOrg.create({ data: { name } });
  }
}
