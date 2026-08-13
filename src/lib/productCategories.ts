export type ProductCategoryNode = {
  id?: string;
  name: string;
  slug?: string;
  status?: "active" | "inactive";
  translations?: Record<string, string>;
  children?: ProductCategoryNode[];
};

export const PRODUCT_CATEGORY_TREE: ProductCategoryNode[] = [
  {
    name: "Replacement Soles",
    children: [
      { name: "Sneaker Soles" },
      { name: "Leather Shoe Soles" },
      { name: "Sole Accessories" }
    ]
  },
  {
    name: "Rubber Sheets"
  },
  {
    name: "Insole Materials"
  },
  {
    name: "Heel Materials"
  },
  {
    name: "Adhesives & Chemicals",
    children: [
      { name: "Contact Cement" },
      { name: "Resin Adhesive" },
      { name: "Hardener" }
    ]
  },
  {
    name: "Leather & Linings"
  },
  {
    name: "Shoe Repair Accessories",
    children: [
      {
        name: "Shoe Repair Mesh Fabric",
        children: [
          { name: "Heel Fish-Eye Mesh" },
          { name: "Heel Round-Eye Mesh" },
          { name: "Heel Plain Mesh" },
          { name: "Satin Nike Heel Fabric" },
          {
            name: "Upper Mesh Fabric",
            children: [
              { name: "Diamond Lattice" }
            ]
          },
          { name: "Terry Cloth Fabric" }
        ]
      }
    ]
  },
  {
    name: "Shoe Care Products"
  },
  {
    name: "Zipper Puller Hardware Accessories"
  },
  {
    name: "Plastic Accessories"
  },
  {
    name: "Tools & Equipment"
  }
];

export const PRODUCT_CATEGORY_OPTIONS = flattenCategoryNames(PRODUCT_CATEGORY_TREE);

const CATEGORY_ALIASES: Record<string, string> = {
  Adhesives: "Adhesives & Chemicals",
  Insoles: "Insole Materials",
  Leather: "Leather & Linings",
  Tools: "Tools & Equipment",
  Zippers: "Shoe Repair Accessories"
};

export function normalizeProductCategory(value: string | null | undefined) {
  const category = value?.trim() || "";

  return CATEGORY_ALIASES[category] ?? category;
}

export function categoryMatchesSelection(
  productCategory: string | null | undefined,
  selectedCategory: string,
  tree: ProductCategoryNode[] = PRODUCT_CATEGORY_TREE
) {
  if (selectedCategory === "all") {
    return true;
  }

  const normalizedProductCategory = normalizeProductCategory(productCategory);

  if (selectedCategory === "Uncategorized") {
    return !normalizedProductCategory;
  }

  if (normalizedProductCategory === selectedCategory) {
    return true;
  }

  const selectedNode = findCategoryNode(selectedCategory, tree);

  return selectedNode ? categoryNodeIncludes(selectedNode, normalizedProductCategory) : false;
}

export function getCategoryGroupName(
  category: string | null | undefined,
  tree: ProductCategoryNode[] = PRODUCT_CATEGORY_TREE
) {
  const normalizedCategory = normalizeProductCategory(category);
  const parentNode = findCategoryParent(normalizedCategory, tree);

  return parentNode?.name ?? normalizedCategory;
}

export function getCategoryAncestorNames(
  category: string | null | undefined,
  tree: ProductCategoryNode[] = PRODUCT_CATEGORY_TREE
) {
  const normalizedCategory = normalizeProductCategory(category);

  if (!normalizedCategory) {
    return [];
  }

  return findCategoryPath(normalizedCategory, tree).slice(0, -1);
}

export function getKnownCategorySet(
  tree: ProductCategoryNode[] = PRODUCT_CATEGORY_TREE
) {
  return new Set(flattenCategoryNames(tree));
}

export function flattenCategoryTree(
  nodes: ProductCategoryNode[]
): ProductCategoryNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenCategoryTree(node.children ?? [])
  ]);
}

function flattenCategoryNames(nodes: ProductCategoryNode[]): string[] {
  return nodes.flatMap((node) => [
    node.name,
    ...flattenCategoryNames(node.children ?? [])
  ]);
}

function findCategoryNode(
  name: string,
  tree: ProductCategoryNode[]
): ProductCategoryNode | null {
  return findCategoryNodeInTree(tree, name);
}

function findCategoryNodeInTree(
  nodes: ProductCategoryNode[],
  name: string
): ProductCategoryNode | null {
  for (const node of nodes) {
    if (node.name === name) {
      return node;
    }

    const childNode = findCategoryNodeInTree(node.children ?? [], name);

    if (childNode) {
      return childNode;
    }
  }

  return null;
}

function categoryNodeIncludes(node: ProductCategoryNode, category: string): boolean {
  return node.children?.some(
    (childNode) =>
      childNode.name === category || categoryNodeIncludes(childNode, category)
  ) ?? false;
}

function findCategoryParent(
  name: string,
  tree: ProductCategoryNode[]
): ProductCategoryNode | null {
  return findCategoryParentInTree(tree, name);
}

function findCategoryParentInTree(
  nodes: ProductCategoryNode[],
  name: string,
  parent?: ProductCategoryNode
): ProductCategoryNode | null {
  for (const node of nodes) {
    if (node.name === name) {
      return parent ?? null;
    }

    const childParent = findCategoryParentInTree(node.children ?? [], name, node);

    if (childParent) {
      return childParent;
    }
  }

  return null;
}

function findCategoryPath(name: string, tree: ProductCategoryNode[]): string[] {
  return findCategoryPathInTree(tree, name) ?? [];
}

function findCategoryPathInTree(
  nodes: ProductCategoryNode[],
  name: string,
  path: string[] = []
): string[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.name];

    if (node.name === name) {
      return nextPath;
    }

    const childPath = findCategoryPathInTree(node.children ?? [], name, nextPath);

    if (childPath) {
      return childPath;
    }
  }

  return null;
}
