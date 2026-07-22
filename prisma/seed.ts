import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoUserId = "demo-user-id";

  await prisma.companyProfile.upsert({
    where: { userId: demoUserId },
    create: {
      userId: demoUserId,
      companyName: "示例科技有限公司",
      mainProducts: "LED 照明产品、消费电子配件",
      coreAdvantages: "15 年制造经验，ISO9001 认证，支持 OEM/ODM，交期快",
      targetCustomerType: "品牌商、批发商、电商卖家",
      targetMarkets: "北美、欧洲、东南亚",
      unsuitableClients: "单笔订单低于 1000 USD 的小客户",
      isCompleted: true,
    },
    update: {},
  });

  console.log("Seed data created successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
