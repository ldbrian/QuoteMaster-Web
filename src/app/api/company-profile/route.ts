import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/utils/auth/server";
import { prisma } from "@/src/utils/prisma";

export async function GET(req: Request) {
  const { user, error } = await requireAuthenticatedUser(req);
  if (error || !user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const { user, error } = await requireAuthenticatedUser(req);
  if (error || !user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await req.json();
  const { companyName, mainProducts, coreAdvantages, targetCustomerType, targetMarkets, unsuitableClients } = body;

  const data = {
    companyName,
    mainProducts,
    coreAdvantages,
    targetCustomerType,
    targetMarkets,
    unsuitableClients: unsuitableClients || "",
    isCompleted: !!(companyName && mainProducts && coreAdvantages && targetCustomerType && targetMarkets),
  };

  const profile = await prisma.companyProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  return NextResponse.json({ profile });
}
