export const catalogCategories = [
  "Soles",
  "Leather & Heel",
  "Adhesives",
  "Fabrics & Insoles",
  "Tools & Accessories"
] as const;

export type CatalogCategory = (typeof catalogCategories)[number];

export type CatalogFile = {
  id: string;
  title: string;
  category: CatalogCategory;
  fileName: string;
  updatedAt: string;
  isNew: boolean;
};

export const catalogRelease = {
  versionDate: "2026-07-28",
  nextUpdateDate: "2026-08-12",
  files: [
    {
      id: "luxury-sneaker-soles",
      title: "Luxury Sneaker Replacement Soles",
      category: "Soles",
      fileName: "luxury-sneaker-soles.pdf",
      updatedAt: "2026-07-28",
      isNew: true
    },
    {
      id: "rubber-sole-sheets",
      title: "Rubber Sole Sheets & Colors",
      category: "Soles",
      fileName: "rubber-sole-sheets.pdf",
      updatedAt: "2026-07-15",
      isNew: false
    },
    {
      id: "heel-repair-materials",
      title: "Heel Repair Materials",
      category: "Leather & Heel",
      fileName: "heel-repair-materials.pdf",
      updatedAt: "2026-07-28",
      isNew: true
    },
    {
      id: "leather-repair-sheets",
      title: "Leather Repair Sheets",
      category: "Leather & Heel",
      fileName: "leather-repair-sheets.pdf",
      updatedAt: "2026-07-28",
      isNew: true
    },
    {
      id: "shoe-repair-adhesives",
      title: "Shoe Repair Adhesives",
      category: "Adhesives",
      fileName: "shoe-repair-adhesives.pdf",
      updatedAt: "2026-07-15",
      isNew: false
    },
    {
      id: "sneaker-mesh-fabrics",
      title: "Sneaker Mesh Fabrics",
      category: "Fabrics & Insoles",
      fileName: "sneaker-mesh-fabrics.pdf",
      updatedAt: "2026-07-15",
      isNew: false
    },
    {
      id: "insoles-and-cushioning",
      title: "Insoles & Cushioning Materials",
      category: "Fabrics & Insoles",
      fileName: "insoles-and-cushioning.pdf",
      updatedAt: "2026-07-15",
      isNew: false
    },
    {
      id: "tools-and-accessories",
      title: "Repair Tools & Accessories",
      category: "Tools & Accessories",
      fileName: "tools-and-accessories.pdf",
      updatedAt: "2026-07-15",
      isNew: false
    }
  ] satisfies CatalogFile[]
};

export function getCatalogFileHref(fileName: string) {
  return `/catalog-files/${fileName}`;
}
