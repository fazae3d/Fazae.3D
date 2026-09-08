import bcrypt from "bcryptjs";
import type { Category, Material } from "@/lib/types";
import type { Coupon, Customer, DemoUser, ProductMaterialUsage, RawMaterial, StoredProduct } from "./types";

export function seedUsers(): DemoUser[] {
  return [
    {
      id: "demo-user-1",
      name: "Cliente Demo",
      email: "demo@fazae3d.com.br",
      passwordHash: bcrypt.hashSync("fazae1234", 10),
      role: "customer",
      addresses: [
        {
          id: "addr-1",
          label: "Casa",
          recipient: "Cliente Demo",
          cpf: "529.982.247-25",
          street: "Rua das Dunas",
          number: "120",
          neighborhood: "Ponta Negra",
          city: "Natal",
          state: "RN",
          zip: "59090-000",
        },
      ],
    },
    {
      id: "demo-admin-1",
      name: "Admin Fazaê",
      email: "teste@fazae.com",
      passwordHash: bcrypt.hashSync("teste123", 10),
      role: "admin",
      addresses: [],
    },
  ];
}

export function seedCoupons(): Coupon[] {
  return [
    { code: "FAZAE10", type: "percentual", value: 10, usageCount: 0, active: true },
    { code: "BEMVINDO20", type: "fixo", value: 20, minSubtotal: 100, usageCount: 0, active: true },
    { code: "FRETEGRATIS", type: "frete-gratis", value: 0, usageCount: 0, active: true },
  ];
}

export function seedCategories(): Category[] {
  return [
    {
      slug: "decoracao",
      name: "Decoração",
      description: "Peças decorativas para dar personalidade a qualquer ambiente.",
    },
    {
      slug: "geek-pop",
      name: "Geek & Pop",
      description: "Colecionáveis, esculturas geométricas e cultura geek em 3D.",
    },
    {
      slug: "casa-decor",
      name: "Casa & Decor",
      description: "Vasos, organizadores e objetos que combinam forma e função.",
    },
    {
      slug: "utilidades",
      name: "Utilidades",
      description: "Suportes, ganchos e soluções práticas para o dia a dia.",
    },
  ];
}

export function seedMaterials(): Material[] {
  return [
    {
      slug: "pla",
      name: "PLA",
      colors: [
        { name: "Preto", hex: "#111111" },
        { name: "Branco", hex: "#f4f4f0" },
        { name: "Verde Limão", hex: "#b6ff00" },
        { name: "Vermelho", hex: "#c0392b" },
      ],
    },
    {
      slug: "petg",
      name: "PETG",
      colors: [
        { name: "Preto", hex: "#111111" },
        { name: "Branco", hex: "#f4f4f0" },
        { name: "Transparente", hex: "#dfe6e0" },
      ],
    },
    {
      slug: "abs",
      name: "ABS",
      colors: [
        { name: "Preto", hex: "#111111" },
        { name: "Cinza", hex: "#666666" },
      ],
    },
    {
      slug: "resina",
      name: "Resina",
      colors: [
        { name: "Cinza", hex: "#8a8a8a" },
        { name: "Branco", hex: "#f4f4f0" },
      ],
    },
  ];
}

/** All products below are DEMO content for development — swap for real catalog data before launch. */
export function seedProducts(): StoredProduct[] {
  return [
    {
      slug: "caveira-geo",
      name: "Capacete Geo",
      categorySlug: "decoracao",
      type: "pronta_entrega",
      price: 79.9,
      stock: 12,
      materials: [{ material: "PLA", colors: ["Preto", "Branco"] }],
      scaleOptions: ["Pequeno (10cm)", "Médio (15cm)"],
      weightGrams: 120,
      description: "Capacete tech estilizado em baixo-poli, com detalhes em verde-limão e acabamento fosco.",
      isBestSeller: true,
      tags: ["decoração", "geométrico", "geek"],
      images: [],
      relatedSlugs: ["dragao-articulado", "vaso-prisma"],
    },
    {
      slug: "dragao-articulado",
      name: "Losango Suspenso",
      categorySlug: "geek-pop",
      type: "pronta_entrega",
      price: 119.9,
      stock: 6,
      materials: [{ material: "PLA", colors: ["Verde Limão", "Preto"] }],
      scaleOptions: ["30cm"],
      weightGrams: 210,
      description: "Escultura vazada em losango sobre base preta, acabamento em verde-limão. Peça de destaque para estante ou mesa.",
      isNew: true,
      tags: ["geek", "colecionável", "geométrico"],
      images: [],
      relatedSlugs: ["caveira-geo"],
    },
    {
      slug: "vaso-prisma",
      name: "Vaso Prisma",
      categorySlug: "casa-decor",
      type: "pronta_entrega",
      price: 89.9,
      stock: 20,
      materials: [{ material: "PETG", colors: ["Branco", "Preto"] }],
      scaleOptions: ["Pequeno", "Médio"],
      weightGrams: 180,
      dimensions: "12x12x18cm",
      description: "Vaso de faces prismáticas, impermeável, ideal para plantas pequenas ou suculentas.",
      tags: ["decoração", "casa", "plantas"],
      images: [],
      relatedSlugs: ["organizador-modular"],
    },
    {
      slug: "suporte-pulse",
      name: "Suporte Hex Pulse",
      categorySlug: "utilidades",
      type: "pronta_entrega",
      price: 39.9,
      stock: 30,
      materials: [{ material: "PLA", colors: ["Preto"] }],
      scaleOptions: [],
      weightGrams: 60,
      description: "Base hexagonal para organizar cabos e acessórios de mesa, com detalhe em verde-limão.",
      tags: ["utilidade", "escritório"],
      images: [],
      relatedSlugs: ["gancho-parede-x3"],
    },
    {
      slug: "organizador-modular",
      name: "Organizador Modular",
      categorySlug: "casa-decor",
      type: "pronta_entrega",
      price: 69.9,
      stock: 15,
      materials: [{ material: "PETG", colors: ["Preto", "Branco"] }],
      scaleOptions: ["1 módulo", "3 módulos"],
      weightGrams: 150,
      description: "Módulos empilháveis para organizar gavetas, bancadas e estantes.",
      tags: ["organização", "casa"],
      images: [],
    },
    {
      slug: "gancho-parede-x3",
      name: "Suporte para Fita",
      categorySlug: "utilidades",
      type: "pronta_entrega",
      price: 24.9,
      stock: 50,
      materials: [{ material: "ABS", colors: ["Preto"] }],
      scaleOptions: [],
      weightGrams: 40,
      description: "Suporte de mesa para fita adesiva, com base antiderrapante e trava lateral.",
      tags: ["utilidade", "escritório"],
      images: [],
    },
    {
      slug: "miniatura-rpg-guerreiro",
      name: "Cão Low Poly",
      categorySlug: "geek-pop",
      type: "pronta_entrega",
      price: 99.9,
      stock: 10,
      materials: [{ material: "PLA", colors: ["Preto", "Verde Musgo"] }],
      scaleOptions: ["15cm"],
      weightGrams: 140,
      description: "Cão estilizado em baixo-poli, para decorar mesas, estantes ou escritório.",
      tags: ["geek", "colecionável", "geométrico"],
      images: [],
    },
    {
      slug: "luminaria-lowpoly",
      name: "Luminária Low Poly",
      categorySlug: "decoracao",
      type: "sob_encomenda",
      stock: 0,
      materials: [{ material: "PLA", colors: ["Branco", "Preto", "Verde Limão"] }],
      scaleOptions: [],
      estimatedProductionDays: 4,
      description: "Luminária de mesa com faces low poly, feita sob encomenda na cor escolhida.",
      tags: ["decoração", "iluminação"],
      images: [],
    },
  ];
}

export function seedRawMaterials(): RawMaterial[] {
  return [
    {
      id: "rm-pla-preto",
      name: "Filamento PLA Preto 1kg",
      unit: "g",
      stock: 4200,
      costPerUnit: 0.09,
      minStock: 500,
      createdAt: "2024-01-10T00:00:00.000Z",
    },
    {
      id: "rm-pla-branco",
      name: "Filamento PLA Branco 1kg",
      unit: "g",
      stock: 3100,
      costPerUnit: 0.09,
      minStock: 500,
      createdAt: "2024-01-10T00:00:00.000Z",
    },
    {
      id: "rm-pla-verde-limao",
      name: "Filamento PLA Verde Limão 1kg",
      unit: "g",
      stock: 800,
      costPerUnit: 0.11,
      minStock: 500,
      createdAt: "2024-01-10T00:00:00.000Z",
    },
    {
      id: "rm-petg-branco",
      name: "Filamento PETG Branco 1kg",
      unit: "g",
      stock: 1500,
      costPerUnit: 0.13,
      minStock: 400,
      createdAt: "2024-01-10T00:00:00.000Z",
    },
    {
      id: "rm-abs-preto",
      name: "Filamento ABS Preto 1kg",
      unit: "g",
      stock: 2000,
      costPerUnit: 0.1,
      minStock: 300,
      createdAt: "2024-01-10T00:00:00.000Z",
    },
  ];
}

export function seedProductMaterialUsages(): ProductMaterialUsage[] {
  return [
    { id: "pmu-1", productSlug: "caveira-geo", rawMaterialId: "rm-pla-preto", quantity: 120 },
    { id: "pmu-2", productSlug: "dragao-articulado", rawMaterialId: "rm-pla-verde-limao", quantity: 210 },
    { id: "pmu-3", productSlug: "vaso-prisma", rawMaterialId: "rm-petg-branco", quantity: 160 },
    { id: "pmu-4", productSlug: "vaso-prisma", rawMaterialId: "rm-pla-preto", quantity: 20 },
    { id: "pmu-5", productSlug: "suporte-pulse", rawMaterialId: "rm-pla-preto", quantity: 60 },
    { id: "pmu-6", productSlug: "organizador-modular", rawMaterialId: "rm-petg-branco", quantity: 150 },
    { id: "pmu-7", productSlug: "gancho-parede-x3", rawMaterialId: "rm-abs-preto", quantity: 40 },
    { id: "pmu-8", productSlug: "miniatura-rpg-guerreiro", rawMaterialId: "rm-pla-preto", quantity: 140 },
    { id: "pmu-9", productSlug: "luminaria-lowpoly", rawMaterialId: "rm-pla-branco", quantity: 90 },
  ];
}

export function seedCustomers(): Customer[] {
  return [
    {
      id: "customer-1",
      name: "Marina Alves",
      phone: "5584991234567",
      email: "marina.alves@gmail.com",
      notes: "Já comprou 3 vezes, sempre pede caixa presente.",
      tags: ["fiel"],
      createdAt: "2024-03-02T00:00:00.000Z",
    },
    {
      id: "customer-2",
      name: "João Pedro Souza",
      phone: "5584998765432",
      email: "jp.souza@hotmail.com",
      notes: "",
      tags: ["atacado"],
      createdAt: "2024-05-18T00:00:00.000Z",
    },
    {
      id: "customer-3",
      name: "Camila Ferreira",
      phone: "5584992223344",
      notes: "",
      tags: [],
      createdAt: "2024-07-09T00:00:00.000Z",
    },
  ];
}
