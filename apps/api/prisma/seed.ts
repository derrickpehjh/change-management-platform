import { PrismaClient, OrgType, Role, CRStatus, RiskLevel } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(d: number) {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

async function main() {
  const existing = await prisma.changeRequest.count();
  if (existing > 0) {
    console.log("Database already seeded — skipping.");
    return;
  }

  console.log("Seeding...");

  const [stEngineering, ncs, singtel] = await Promise.all([
    prisma.vendorOrg.upsert({ where: { name: "ST Engineering" }, update: {}, create: { name: "ST Engineering" } }),
    prisma.vendorOrg.upsert({ where: { name: "NCS" }, update: {}, create: { name: "NCS" } }),
    prisma.vendorOrg.upsert({ where: { name: "Singtel" }, update: {}, create: { name: "Singtel" } }),
  ]);

  const upsertUser = (email: string, name: string, role: Role | null, orgType: OrgType | null, vendorOrgId: string | null) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, role: role ?? undefined, orgType: orgType ?? undefined, vendorOrgId },
    });

  const [alice, ben, marcus, priyaN, weiJie, farah, daniel, aisyah, kevinPending] = await Promise.all([
    upsertUser("alice.tan@htx.example", "Alice Tan", Role.CUSTOMER, OrgType.HTX, null),
    upsertUser("ben.ong@htx.example", "Ben Ong", Role.CUSTOMER, OrgType.HTX, null),
    upsertUser("marcus.lee@stengg.example", "Marcus Lee", Role.VENDOR, OrgType.VENDOR, stEngineering.id),
    upsertUser("priya.nair@stengg.example", "Priya Nair", Role.VENDOR, OrgType.VENDOR, stEngineering.id),
    upsertUser("weijie.tan@ncs.example", "Wei Jie Tan", Role.VENDOR, OrgType.VENDOR, ncs.id),
    upsertUser("farah.hassan@ncs.example", "Farah Hassan", Role.VENDOR, OrgType.VENDOR, ncs.id),
    upsertUser("daniel.ong@singtel.example", "Daniel Ong", Role.VENDOR, OrgType.VENDOR, singtel.id),
    upsertUser("aisyah.rahman@singtel.example", "Aisyah Rahman", Role.VENDOR, OrgType.VENDOR, singtel.id),
    upsertUser("kevin.goh@newvendor.example", "Kevin Goh", null, null, null),
  ]);

  const assetNames = [
    ["Core Network Switch A", "Primary L3 switch serving Building 1-3"],
    ["Building 3 HVAC Controller", "BMS controller for Building 3 air handling"],
    ["Payment Gateway API", "External payment processing integration"],
    ["Staff Access Control System", "Card-access control for staff areas"],
  ] as const;
  const assets = await Promise.all(
    assetNames.map(([name, description]) =>
      prisma.systemAsset.upsert({ where: { name }, update: {}, create: { name, description } }),
    ),
  );
  const [coreSwitch, hvac, paymentApi, accessControl] = assets;

  async function makeCR(opts: {
    title: string;
    description: string;
    vendorOrgId: string;
    submittedById: string;
    riskLevel: RiskLevel;
    status: CRStatus;
    plannedStart: Date;
    plannedEnd: Date;
    systemAssetIds: string[];
    rejectRemark?: string;
    vendorReference?: string;
  }) {
    const cr = await prisma.changeRequest.create({
      data: {
        title: opts.title,
        description: opts.description,
        vendorOrgId: opts.vendorOrgId,
        submittedById: opts.submittedById,
        riskLevel: opts.riskLevel,
        rollbackPlan: "Revert to prior configuration snapshot taken immediately before the change window.",
        vendorReference: opts.vendorReference,
        status: opts.status,
        plannedStart: opts.plannedStart,
        plannedEnd: opts.plannedEnd,
        systemAssets: { connect: opts.systemAssetIds.map((id) => ({ id })) },
      },
    });
    await prisma.cRAuditLog.create({
      data: { crId: cr.id, actorId: opts.submittedById, action: "CREATED", toStatus: CRStatus.DRAFT },
    });
    if (opts.status !== CRStatus.DRAFT) {
      await prisma.cRAuditLog.create({
        data: { crId: cr.id, actorId: opts.submittedById, action: "SUBMITTED", fromStatus: CRStatus.DRAFT, toStatus: CRStatus.SUBMITTED },
      });
    }
    if (opts.status === CRStatus.REJECTED) {
      await prisma.cRAuditLog.create({
        data: {
          crId: cr.id,
          actorId: ben.id,
          action: "DECISION",
          fromStatus: CRStatus.UNDER_REVIEW,
          toStatus: CRStatus.REJECTED,
          remark: opts.rejectRemark,
        },
      });
    }
    if (opts.status === CRStatus.APPROVED || opts.status === CRStatus.IMPLEMENTED || opts.status === CRStatus.CLOSED) {
      await prisma.cRAuditLog.create({
        data: { crId: cr.id, actorId: ben.id, action: "DECISION", fromStatus: CRStatus.UNDER_REVIEW, toStatus: CRStatus.APPROVED },
      });
    }
    return cr;
  }

  await makeCR({
    title: "Firmware upgrade - Core Switch A",
    description: "Apply vendor-recommended firmware patch to address a known routing table memory leak.",
    vendorOrgId: stEngineering.id,
    submittedById: marcus.id,
    riskLevel: RiskLevel.MEDIUM,
    status: CRStatus.DRAFT,
    plannedStart: daysFromNow(10),
    plannedEnd: daysFromNow(10.2),
    systemAssetIds: [coreSwitch.id],
    vendorReference: "STE-TICKET-4471",
  });

  await makeCR({
    title: "Patch Payment Gateway API TLS config",
    description: "Disable TLS 1.1 and rotate the gateway's server certificate ahead of expiry.",
    vendorOrgId: stEngineering.id,
    submittedById: priyaN.id,
    riskLevel: RiskLevel.HIGH,
    status: CRStatus.SUBMITTED,
    plannedStart: daysFromNow(6),
    plannedEnd: daysFromNow(6.1),
    systemAssetIds: [paymentApi.id],
  });

  await makeCR({
    title: "HVAC controller firmware update",
    description: "Scheduled quarterly firmware update for the Building 3 BMS controller.",
    vendorOrgId: ncs.id,
    submittedById: weiJie.id,
    riskLevel: RiskLevel.LOW,
    status: CRStatus.UNDER_REVIEW,
    plannedStart: daysFromNow(4),
    plannedEnd: daysFromNow(4.1),
    systemAssetIds: [hvac.id],
  });

  // Two approved CRs from the SAME vendor, overlapping on the same asset —
  // demonstrates within-vendor calendar conflict detection.
  await makeCR({
    title: "Switch A: VLAN reconfiguration",
    description: "Reconfigure VLAN trunking ahead of the Building 2 network expansion.",
    vendorOrgId: ncs.id,
    submittedById: farah.id,
    riskLevel: RiskLevel.MEDIUM,
    status: CRStatus.APPROVED,
    plannedStart: daysFromNow(3),
    plannedEnd: daysFromNow(3.3),
    systemAssetIds: [coreSwitch.id],
    vendorReference: "NCS-CHG-20261003-01",
  });
  await makeCR({
    title: "Switch A: QoS policy rollout",
    description: "Roll out updated QoS policies for VoIP traffic prioritization.",
    vendorOrgId: ncs.id,
    submittedById: weiJie.id,
    riskLevel: RiskLevel.MEDIUM,
    status: CRStatus.APPROVED,
    plannedStart: daysFromNow(3.1),
    plannedEnd: daysFromNow(3.4),
    systemAssetIds: [coreSwitch.id],
    vendorReference: "NCS-CHG-20261003-02",
  });

  await makeCR({
    title: "Access Control System policy change",
    description: "Widen after-hours access for the loading dock badge readers.",
    vendorOrgId: stEngineering.id,
    submittedById: priyaN.id,
    riskLevel: RiskLevel.HIGH,
    status: CRStatus.REJECTED,
    plannedStart: daysFromNow(2),
    plannedEnd: daysFromNow(2.1),
    systemAssetIds: [accessControl.id],
    rejectRemark: "Insufficient justification for widening after-hours access — please add a security sign-off and resubmit.",
  });

  await makeCR({
    title: "Q2 HVAC sensor calibration",
    description: "Routine recalibration of temperature/humidity sensors.",
    vendorOrgId: singtel.id,
    submittedById: aisyah.id,
    riskLevel: RiskLevel.LOW,
    status: CRStatus.IMPLEMENTED,
    plannedStart: daysFromNow(-5),
    plannedEnd: daysFromNow(-4.9),
    systemAssetIds: [hvac.id],
  });

  await makeCR({
    title: "Switch A firmware rollback",
    description: "Rollback of a prior firmware version that caused intermittent packet loss.",
    vendorOrgId: ncs.id,
    submittedById: weiJie.id,
    riskLevel: RiskLevel.HIGH,
    status: CRStatus.CLOSED,
    plannedStart: daysFromNow(-20),
    plannedEnd: daysFromNow(-19.9),
    systemAssetIds: [coreSwitch.id],
  });

  console.log("Seed complete.");
  console.log("Dummy users:");
  for (const u of [alice, ben, marcus, priyaN, weiJie, farah, daniel, aisyah, kevinPending]) {
    console.log(`  ${u.name.padEnd(16)} ${u.email.padEnd(30)} ${u.role ?? "PENDING"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
