import type { Product } from "./types";
export const demoProducts: Product[] = [
  {
    id: "sample-1",
    name: "Premium rubber sole sheet",
    category: "Soles",
    description:
      "Preview product. Durable rubber sheet for professional shoe repairs.",
    images: [],
    variants: [
      {
        id: "sample-1-a",
        sku: "RB-001",
        size: "2 mm",
        color: "Black",
        unit: "sheet",
        price: 8.5,
        stock: "in_stock",
      },
      {
        id: "sample-1-b",
        sku: "RB-002",
        size: "3 mm",
        color: "Brown",
        unit: "sheet",
        price: 10,
        stock: "in_stock",
      },
    ],
  },
  {
    id: "sample-2",
    name: "Leather heel blocks",
    category: "Heels",
    description: "Preview product. Layered leather heel blocks.",
    images: [],
    variants: [
      {
        id: "sample-2-a",
        sku: "HL-001",
        size: "Medium",
        color: "Natural",
        unit: "pair",
        price: 6.2,
        stock: "in_stock",
      },
    ],
  },
  {
    id: "sample-3",
    name: "Finishing brush",
    category: "Tools",
    description:
      "Preview product. A finishing brush for everyday workshop use.",
    images: [],
    variants: [
      {
        id: "sample-3-a",
        sku: "TL-001",
        size: null,
        color: "Natural",
        unit: "piece",
        price: 4.8,
        stock: "in_stock",
      },
    ],
  },
];
