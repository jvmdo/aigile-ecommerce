import type { CouponType } from "@aigile/shared";
import type { Faker } from "@faker-js/faker";
import { demoCouponCodes } from "./demo-shoppers.ts";

/** A Product to insert. `forJourneys: false` keeps it out of the generated Carts (edge cases, demonstrations). */
export type ProductSeed = {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  forJourneys: boolean;
};

export type CouponSeed = {
  code: string;
  type: CouponType;
  value: number;
  expiresAt: Date;
  /** Whether the generated Carts may apply it; the demonstration Coupons stay out. */
  forJourneys: boolean;
};

/** Edge-case Products, always in the catalog; their names are what `docs/seeds-report.md` lists. */
export const edgeProducts = {
  oneCent: {
    name: "Clipe de Papel Niquelado",
    description: "Clipe nº 2 vendido avulso. Ideal para organizar documentos.",
    priceCents: 1,
    stock: 5000,
    forJourneys: true,
  },
  highPrice: {
    name: "Piano Digital de 88 Teclas",
    description: "Teclas com peso de martelo, 256 vozes e banco incluso. Garantia de 24 meses.",
    priceCents: 1_299_990,
    stock: 8,
    forJourneys: true,
  },
  shortStock: {
    name: "Relógio de Bolso Vintage",
    description: "Caixa em latão envelhecido com corrente de 40 cm.",
    priceCents: 45_990,
    // The demonstration Cart asks for 3 and the seed then leaves 1 (another sale took the rest).
    stock: 4,
    forJourneys: false,
  },
  lastUnit: {
    name: "Vaso de Cerâmica Assinado",
    description: "Peça única, modelada à mão e assinada pelo ceramista.",
    priceCents: 89_000,
    stock: 1,
    forJourneys: false,
  },
  soldOut: {
    name: "Luminária Pendente de Cobre",
    description: "Cúpula de cobre escovado, 30 cm de diâmetro. Lâmpada não inclusa.",
    priceCents: 32_990,
    stock: 0,
    forJourneys: false,
  },
  soldOutNoDescription: {
    name: "Kit de Pincéis para Aquarela",
    description: "",
    priceCents: 4_990,
    stock: 0,
    forJourneys: false,
  },
  noDescription: {
    name: "Caderno Pautado Simples",
    description: "",
    priceCents: 1_290,
    stock: 300,
    forJourneys: true,
  },
} satisfies Record<string, ProductSeed>;

type Category = {
  nouns: string[];
  qualifiers: string[];
  details: string[];
  /** Price range in cents. */
  price: [number, number];
};

const categories: Category[] = [
  {
    nouns: [
      "Caneca",
      "Panela",
      "Frigideira",
      "Jogo de Facas",
      "Tábua de Corte",
      "Garrafa Térmica",
      "Chaleira",
      "Assadeira",
      "Escorredor de Louça",
      "Pote Hermético",
      "Jarra",
      "Cafeteira Italiana",
    ],
    qualifiers: [
      "de Cerâmica",
      "de Inox",
      "Antiaderente",
      "de Bambu",
      "de Vidro",
      "de Ferro Fundido",
      "Esmaltada",
    ],
    details: ["350 ml", "24 cm", "5 Peças", "1 L", "com Tampa", "Vermelha", "Preta"],
    price: [1_990, 49_990],
  },
  {
    nouns: [
      "Vaso",
      "Luminária",
      "Almofada",
      "Manta",
      "Tapete",
      "Espelho",
      "Cesto Organizador",
      "Porta-Retrato",
      "Relógio de Parede",
      "Cortina",
      "Castiçal",
      "Bandeja",
    ],
    qualifiers: [
      "de Barro",
      "de Linho",
      "de Algodão",
      "de Vime",
      "de Madeira",
      "de Tricô",
      "de Macramê",
    ],
    details: ["Bege", "Terracota", "Verde Musgo", "45x45 cm", "Grande", "Pequeno", "Off-White"],
    price: [2_990, 89_990],
  },
  {
    nouns: [
      "Camiseta",
      "Calça",
      "Jaqueta",
      "Tênis de Corrida",
      "Bolsa",
      "Mochila",
      "Boné",
      "Cinto",
      "Vestido",
      "Meia",
      "Moletom",
      "Sandália",
    ],
    qualifiers: [
      "de Algodão Orgânico",
      "de Couro",
      "Corta-Vento",
      "Básica",
      "Estampada",
      "Slim",
      "de Linho",
    ],
    details: ["Preta", "Azul-Marinho", "Branca", "Tam. M", "Tam. 42", "Unissex", "Mescla"],
    price: [2_990, 59_990],
  },
  {
    nouns: [
      "Fone de Ouvido Bluetooth",
      "Carregador USB-C",
      "Caixa de Som Portátil",
      "Teclado Mecânico",
      "Mouse Sem Fio",
      "Smartwatch",
      "Webcam Full HD",
      "Power Bank",
      "Hub USB",
      "Suporte para Notebook",
      "Monitor",
      "Roteador Wi-Fi",
    ],
    qualifiers: ["Compacto", "Profissional", "Gamer", "Slim", "à Prova d'Água", "Recarregável"],
    details: [
      "65 W",
      "10.000 mAh",
      "com Cancelamento de Ruído",
      "Preto",
      "Branco",
      "ABNT2",
      "27 Polegadas",
    ],
    price: [4_990, 399_990],
  },
  {
    nouns: [
      "Tapete de Yoga",
      "Halter",
      "Garrafa Squeeze",
      "Corda de Pular",
      "Bola de Futebol",
      "Luvas de Treino",
      "Bicicleta Ergométrica",
      "Faixa Elástica",
      "Rolo de Liberação",
      "Bermuda de Ciclismo",
      "Barraca de Camping",
      "Saco de Dormir",
    ],
    qualifiers: ["Antiderrapante", "Emborrachado", "Profissional", "Dobrável", "Leve", "Térmico"],
    details: ["2 kg", "750 ml", "Tam. G", "Oficial", "Kit com 3", "para 4 Pessoas", "Azul"],
    price: [1_990, 249_990],
  },
  {
    nouns: [
      "Caderno",
      "Agenda 2027",
      "Kit de Canetas",
      "Livro de Receitas",
      "Planner Semanal",
      "Estojo",
      "Marca-Texto",
      "Bloco de Notas",
      "Quebra-Cabeça",
      "Lápis de Cor",
      "Fichário",
      "Mochila Escolar",
    ],
    qualifiers: ["Capa Dura", "Universitário", "Ilustrado", "Pastel", "Ecológico", "Espiral"],
    details: [
      "200 Folhas",
      "1.000 Peças",
      "Pontilhado",
      "36 Cores",
      "A5",
      "Kit com 6",
      "Tamanho Ofício",
    ],
    price: [990, 19_990],
  },
  {
    nouns: [
      "Café em Grãos",
      "Chocolate",
      "Azeite Extra Virgem",
      "Mel",
      "Chá",
      "Granola",
      "Doce de Leite",
      "Queijo Canastra",
      "Cachaça",
      "Geleia",
      "Biscoito Amanteigado",
      "Castanha-do-Pará",
    ],
    qualifiers: [
      "Orgânico",
      "Artesanal",
      "Sem Açúcar",
      "Torra Média",
      "70% Cacau",
      "de Minas Gerais",
      "da Serra Gaúcha",
    ],
    details: ["250 g", "500 g", "500 ml", "300 g", "Caixa com 20", "1 kg", "Lata"],
    price: [890, 12_990],
  },
];

const descriptionSentences = [
  "Ideal para o dia a dia.",
  "Garantia de 12 meses contra defeitos de fabricação.",
  "Produzido no Brasil.",
  "Acabamento artesanal, cada peça é única.",
  "Fácil de limpar.",
  "Leve e resistente.",
  "Acompanha embalagem para presente.",
  "Material certificado e de origem responsável.",
  "Ótimo custo-benefício.",
  "Um dos mais vendidos da loja.",
  "Combina com qualquer ambiente.",
  "Pronta entrega para todo o Brasil.",
];

/** The catalog: the edge-case Products first, then generated ones up to `total`. */
export function generateProducts(faker: Faker, total: number): ProductSeed[] {
  const edges = Object.values(edgeProducts);
  const products: ProductSeed[] = [...edges];
  const names = new Set(edges.map((product) => product.name));
  let attempts = 0;
  while (products.length < total) {
    attempts += 1;
    if (attempts > total * 50) {
      throw new Error(`Could not generate ${total} distinct Product names`);
    }
    const category = faker.helpers.arrayElement(categories);
    const noun = faker.helpers.arrayElement(category.nouns);
    const parts = [noun];
    if (faker.datatype.boolean(0.8)) parts.push(faker.helpers.arrayElement(category.qualifiers));
    if (faker.datatype.boolean(0.6)) parts.push(faker.helpers.arrayElement(category.details));
    const name = parts.join(" ");
    if (names.has(name)) {
      continue;
    }
    names.add(name);
    products.push({
      name,
      description: faker.datatype.boolean(0.15) ? "" : describe(faker, name),
      priceCents: priceIn(faker, category.price),
      stock: stockLevel(faker),
      forJourneys: true,
    });
  }
  return products.slice(0, total);
}

function describe(faker: Faker, name: string): string {
  const sentences = faker.helpers.arrayElements(descriptionSentences, { min: 1, max: 3 });
  return `${name}. ${sentences.join(" ")}`;
}

/** A shop-like price: the reais within the range, ending in 90 cents. */
function priceIn(faker: Faker, [min, max]: [number, number]): number {
  const reais = faker.number.int({ min: Math.floor(min / 100), max: Math.floor(max / 100) });
  return reais * 100 + 90;
}

function stockLevel(faker: Faker): number {
  return faker.helpers.weightedArrayElement([
    { weight: 5, value: 0 },
    { weight: 10, value: faker.number.int({ min: 2, max: 19 }) },
    { weight: 55, value: faker.number.int({ min: 20, max: 200 }) },
    { weight: 25, value: faker.number.int({ min: 201, max: 1000 }) },
    { weight: 5, value: faker.number.int({ min: 2000, max: 9999 }) },
  ]);
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** The Coupons: the fixed edge cases and demonstration ones first, then generated ones up to `total`. */
export function generateCoupons(faker: Faker, total: number, now: Date): CouponSeed[] {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);
  const fixed: CouponSeed[] = [
    // Used by demonstration Shopper "Coupon already used" and by generated Carts.
    {
      code: demoCouponCodes.alreadyUsed,
      type: "percentage",
      value: 10,
      expiresAt: at(60 * DAY),
      forJourneys: true,
    },
    // Expires an hour before the seed runs, after the demonstration Cart applied it.
    {
      code: demoCouponCodes.expiredAfterApplied,
      type: "percentage",
      value: 25,
      expiresAt: at(-1 * HOUR),
      forJourneys: false,
    },
    {
      code: demoCouponCodes.fullDiscount,
      type: "percentage",
      value: 100,
      expiresAt: at(30 * DAY),
      forJourneys: false,
    },
    {
      code: demoCouponCodes.fixedOverSubtotal,
      type: "fixed",
      value: 50_000,
      expiresAt: at(90 * DAY),
      forJourneys: true,
    },
    {
      code: "DESCONTINHO1",
      type: "percentage",
      value: 1,
      expiresAt: at(45 * DAY),
      forJourneys: true,
    },
    {
      code: "RELAMPAGO20",
      type: "percentage",
      value: 20,
      expiresAt: at(4 * HOUR),
      forJourneys: true,
    },
    {
      code: "ULTIMAHORA10",
      type: "percentage",
      value: 10,
      expiresAt: at(9 * HOUR),
      forJourneys: true,
    },
    {
      code: "PRIMAVERA15",
      type: "percentage",
      value: 15,
      expiresAt: at(-10 * DAY),
      forJourneys: true,
    },
    {
      code: "INVERNO20",
      type: "percentage",
      value: 20,
      expiresAt: at(-45 * DAY),
      forJourneys: true,
    },
  ];
  const coupons = [...fixed];
  const codes = new Set(fixed.map((coupon) => coupon.code));
  const prefixes = [
    "FRETE",
    "NATAL",
    "VERAO",
    "OUTONO",
    "CASA",
    "MODA",
    "TECH",
    "ESPORTE",
    "LEITURA",
    "CAFE",
    "FIDELIDADE",
    "ANIVERSARIO",
    "SEMANA",
    "CLIENTEVIP",
    "VOLTEI",
    "PIX",
    "APP",
    "NEWSLETTER",
    "INDICACAO",
    "SALDAO",
  ];
  let attempts = 0;
  while (coupons.length < total) {
    attempts += 1;
    if (attempts > total * 50) {
      throw new Error(`Could not generate ${total} distinct Coupon codes`);
    }
    const prefix = faker.helpers.arrayElement(prefixes);
    const percentage = faker.datatype.boolean(0.6);
    const value = percentage
      ? faker.helpers.arrayElement([5, 10, 15, 20, 25, 30])
      : faker.number.int({ min: 2, max: 30 }) * 500;
    const code = percentage ? `${prefix}${value}` : `${prefix}${value / 100}REAIS`;
    if (codes.has(code)) {
      continue;
    }
    codes.add(code);
    const expired = faker.datatype.boolean(0.25);
    coupons.push({
      code,
      type: percentage ? "percentage" : "fixed",
      value,
      expiresAt: expired
        ? at(-faker.number.int({ min: 1 * DAY, max: 80 * DAY }))
        : at(faker.number.int({ min: 7 * DAY, max: 180 * DAY })),
      forJourneys: true,
    });
  }
  return coupons.slice(0, Math.max(total, fixed.length));
}
