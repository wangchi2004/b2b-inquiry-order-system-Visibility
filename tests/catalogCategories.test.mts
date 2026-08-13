import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryMatchesSelection,
  getCategoryAncestorNames,
  getKnownCategorySet,
  type ProductCategoryNode
} from "../src/lib/productCategories.ts";

const tree: ProductCategoryNode[] = [
  {
    id: "root",
    name: "Root",
    slug: "root",
    status: "active",
    translations: { zh: "根分类" },
    children: [
      {
        id: "child",
        name: "Child",
        slug: "child",
        status: "active",
        translations: { zh: "子分类" },
        children: [
          {
            id: "grandchild",
            name: "Grandchild",
            slug: "grandchild",
            status: "active",
            translations: { zh: "孙分类" },
            children: []
          }
        ]
      }
    ]
  }
];

test("represents a three-level category hierarchy", () => {
  assert.equal(tree.length, 1);
  assert.equal(tree[0].name, "Root");
  assert.equal(tree[0].children?.[0].name, "Child");
  assert.equal(tree[0].children?.[0].children?.[0].name, "Grandchild");
});

test("parent selection includes all descendant products", () => {
  assert.equal(categoryMatchesSelection("Grandchild", "Root", tree), true);
  assert.equal(categoryMatchesSelection("Root", "Child", tree), false);
  assert.deepEqual(getCategoryAncestorNames("Grandchild", tree), ["Root", "Child"]);
});

test("known category names come from the database tree", () => {
  const known = getKnownCategorySet(tree);

  assert.deepEqual([...known], ["Root", "Child", "Grandchild"]);
});
