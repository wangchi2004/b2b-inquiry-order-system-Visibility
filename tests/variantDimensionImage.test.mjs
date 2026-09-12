import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("each specification has one independent optional dimension image without changing the three product images", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
    const schema = (
      await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8")
    ).replace('create extension if not exists "pgcrypto";', "");
    await db.exec(schema);
    const migration = await readFile(
      new URL(
        "../supabase/migrations/20260910001328_variant_dimension_image.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const p = (
      await db.query(
        `insert into products(name,slug,image_url,image_url_2,image_url_3) values('Sole','sole','main','second','third') returning id`,
      )
    ).rows[0].id;
    await db.query(
      `insert into product_variants(product_id,sku,size,unit) values($1,'SOLE-41','41','pair'),($1,'SOLE-42','42','pair')`,
      [p],
    );
    await db.query(
      `update product_variants set dimension_image_url='https://example.test/41.png' where product_id=$1 and sku='SOLE-41'`,
      [p],
    );
    let rows = (
      await db.query(
        "select sku,dimension_image_url from product_variants order by sku",
      )
    ).rows;
    assert.equal(rows[0].dimension_image_url, "https://example.test/41.png");
    assert.equal(rows[1].dimension_image_url, null);
    await db.query(
      `update product_variants set dimension_image_url='https://example.test/41-new.png' where sku='SOLE-41'`,
    );
    const product = (
      await db.query(
        "select image_url,image_url_2,image_url_3 from products where id=$1",
        [p],
      )
    ).rows[0];
    assert.deepEqual(product, {
      image_url: "main",
      image_url_2: "second",
      image_url_3: "third",
    });
    await db.query(
      `update product_variants set dimension_image_url=null where sku='SOLE-41'`,
    );
    rows = (await db.query("select dimension_image_url from product_variants"))
      .rows;
    assert.ok(rows.every((r) => r.dimension_image_url === null));
  } finally {
    await db.close();
  }
});
