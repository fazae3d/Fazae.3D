import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  seedCategories,
  seedCoupons,
  seedCustomers,
  seedMaterials,
  seedProductMaterialUsages,
  seedProducts,
  seedRawMaterials,
  seedUsers,
} from "../src/server/seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const user of seedUsers()) {
    const { addresses, ...rest } = user;
    await prisma.user.create({
      data: { ...rest, addresses: { create: addresses } },
    });
  }

  for (const category of seedCategories()) {
    await prisma.category.create({ data: category });
  }

  for (const material of seedMaterials()) {
    await prisma.material.create({ data: { ...material, colors: material.colors } });
  }

  // Products reference categories via categorySlug, so categories must exist first.
  for (const product of seedProducts()) {
    await prisma.product.create({
      data: {
        ...product,
        materials: product.materials,
      },
    });
  }

  for (const coupon of seedCoupons()) {
    await prisma.coupon.create({ data: coupon });
  }

  for (const rawMaterial of seedRawMaterials()) {
    await prisma.rawMaterial.create({ data: rawMaterial });
  }

  // Usages reference both products and raw materials, so both must exist first.
  for (const usage of seedProductMaterialUsages()) {
    await prisma.productMaterialUsage.create({ data: usage });
  }

  for (const customer of seedCustomers()) {
    await prisma.customer.create({ data: customer });
  }

  await prisma.settings.create({
    data: {
      id: 1,
      freeShippingThreshold: 299.9,
      whatsappNumber: "5584999999999",
      whatsappMessageTemplate: "Olá! Tenho uma ideia para imprimir em 3D.",
      customOrderIntroText:
        "Não achou o que precisa no catálogo? Conta pra gente o que você imagina, com material, cor, tamanho e referências, e a gente monta a peça perfeita para você.",
    },
  });

  console.log("Seed completed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
