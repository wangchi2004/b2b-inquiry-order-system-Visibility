import Link from "next/link";
import type { ReactNode } from "react";
import { BulkVariantSaveButton } from "@/components/BulkVariantSaveButton";
import { Header } from "@/components/Header";
import { ProductImageUploadCard } from "@/components/ProductImageUploadCard";
import { ProductSaveButton } from "@/components/ProductSaveButton";
import { checkAdminAccess } from "@/lib/admin";
import { getAdminProducts } from "@/lib/adminProducts";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_CATEGORY_TREE,
  categoryMatchesSelection,
  getCategoryAncestorNames,
  getKnownCategorySet,
  normalizeProductCategory,
  type ProductCategoryNode
} from "@/lib/productCategories";
import type { ProductWithVariants } from "@/lib/types";
import {
  deleteProduct,
  deleteProductVariant,
  saveProduct,
  saveProductVariant,
  saveProductVariantsBulk,
  toggleProductStatus
} from "./actions";

const PRODUCT_COLOR_OPTIONS = [
  "Black",
  "White",
  "Ivory",
  "Brown",
  "Clear",
  "Beige",
  "Gray",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Custom"
];

const PRODUCT_UNIT_OPTIONS = [
  "piece",
  "pair",
  "set",
  "sheet",
  "roll",
  "sq ft",
  "meter",
  "kg",
  "g",
  "bottle",
  "tube",
  "box",
  "carton"
];

type AdminProductsPageProps = {
  searchParams: Promise<{
    password?: string;
    message?: string;
    category?: string;
    product?: string;
  }>;
};

export default async function AdminProductsPage({
  searchParams
}: AdminProductsPageProps) {
  const { password, message, category, product: selectedProductId } = await searchParams;
  const access = checkAdminAccess(password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  const products = await getAdminProducts();
  const selectedCategory = category ?? "all";
  const categories = getProductCategories(products);
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((product) =>
          categoryMatchesSelection(product.category, selectedCategory)
        );
  const selectedProduct = selectedProductId
    ? products.find((product) => product.id === selectedProductId)
    : null;

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-sm text-slate-500">Admin / 后台</p>
          <h1 className="text-3xl font-semibold text-slate-950">Products / 产品管理</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage products, active status, and product specifications. 管理产品、上下架状态和规格。
          </p>
        </div>

        {message ? (
          <p className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        <section className="mb-6 rounded border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Field Guide / 字段说明</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p><strong>name</strong> / 产品名称：前台和邮件显示的产品名。</p>
            <p><strong>slug</strong> / 链接标识：服务器里的唯一英文标识，例如 af1-sole-white。</p>
            <p><strong>image_url</strong> / 主图链接：产品主图，前台和邮件优先显示。</p>
            <p><strong>image_url_2</strong> / 副图1链接：产品第二张图片。</p>
            <p><strong>image_url_3</strong> / 副图2链接：产品第三张图片。</p>
            <p><strong>status</strong> / 产品状态：active 是上架，inactive 是下架。</p>
            <p><strong>sku</strong> / 规格编码：每个尺码/颜色规格的唯一编码。</p>
            <p><strong>stock_status</strong> / 库存状态：in_stock 有货，out_of_stock 缺货，preorder 可预订。</p>
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">New Product / 新增产品</h2>
          <ProductForm password={access.password} />
        </section>

        <section className="mt-6">
          {products.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-8 text-center">
              <h2 className="text-lg font-semibold text-slate-950">No products yet / 暂无产品</h2>
              <p className="mt-2 text-sm text-slate-600">
                Add your first product above. 请在上方添加第一个产品。
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
              <aside className="rounded border border-slate-200 bg-white p-3 lg:sticky lg:top-6 lg:self-start">
                <h2 className="text-base font-semibold text-slate-950">
                  Categories / 分类
                </h2>
                <nav className="mt-3 space-y-1.5 text-sm">
                  <CategoryLink
                    href={adminProductsHref(access.password)}
                    active={selectedCategory === "all"}
                    label="All / 全部"
                    count={products.length}
                  />
                  {PRODUCT_CATEGORY_TREE.map((item) => (
                    <CategoryTreeLink
                      key={item.name}
                      node={item}
                      password={access.password}
                      selectedCategory={selectedCategory}
                      categories={categories}
                    />
                  ))}
                  {getOtherCategories(categories).map((item) => (
                    <CategoryLink
                      key={item}
                      href={adminProductsHref(access.password, item)}
                      active={selectedCategory === item}
                      label={item}
                      count={categories.get(item) ?? 0}
                    />
                  ))}
                </nav>
              </aside>

              <div className="space-y-6">
                <div className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  Showing / 当前显示：{" "}
                  <strong>
                    {selectedCategory === "all"
                      ? "All / 全部"
                      : selectedCategory}
                  </strong>{" "}
                  ({filteredProducts.length})
                </div>
                {selectedProduct ? (
                  <ProductAdminPanel
                    password={access.password}
                    product={selectedProduct}
                    selectedCategory={selectedCategory}
                  />
                ) : (
                  <div className="grid gap-2">
                    {filteredProducts.map((product) => (
                      <ProductListRow
                        key={product.id}
                        password={access.password}
                        product={product}
                        selectedCategory={selectedCategory}
                      />
                    ))}
                  </div>
                )}
                {filteredProducts.length === 0 ? (
                  <div className="rounded border border-slate-200 bg-white p-8 text-center">
                    <h2 className="text-lg font-semibold text-slate-950">
                      No products in this category / 这个分类暂无产品
                    </h2>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function CategoryLink({
  href,
  active,
  label,
  count,
  level = 0
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  level?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-2 rounded px-2 py-2 ${
        active
          ? "bg-slate-950 font-semibold text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span
        className={`min-w-0 break-words leading-snug ${
          level > 0 ? "text-xs" : ""
        }`}
      >
        {level > 0 ? `${"  ".repeat(level - 1)}└─ ` : ""}
        {label}
      </span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

function CategoryTreeLink({
  node,
  password,
  selectedCategory,
  categories,
  level = 0
}: {
  node: ProductCategoryNode;
  password: string;
  selectedCategory: string;
  categories: Map<string, number>;
  level?: number;
}) {
  return (
    <div>
      <CategoryLink
        href={adminProductsHref(password, node.name)}
        active={selectedCategory === node.name}
        label={node.name}
        count={categories.get(node.name) ?? 0}
        level={level}
      />
      {node.children?.length ? (
        <div className="mt-1 space-y-1 pl-3">
          {node.children.map((childNode) => (
            <CategoryTreeLink
              key={childNode.name}
              node={childNode}
              password={password}
              selectedCategory={selectedCategory}
              categories={categories}
              level={level + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getProductCategories(products: ProductWithVariants[]) {
  const counts = new Map<string, number>();

  for (const product of products) {
    const category = normalizeProductCategory(product.category) || "Uncategorized";
    counts.set(category, (counts.get(category) ?? 0) + 1);

    for (const parentCategory of getCategoryAncestorNames(category)) {
      counts.set(parentCategory, (counts.get(parentCategory) ?? 0) + 1);
    }
  }

  return counts;
}

function getOtherCategories(categoryCounts: Map<string, number>) {
  const knownCategories = getKnownCategorySet();
  return Array.from(categoryCounts.keys())
    .filter((category) => !knownCategories.has(category))
    .sort((a, b) => a.localeCompare(b));
}

function adminProductsHref(password: string, category?: string) {
  const params = new URLSearchParams({
    password
  });

  if (category && category !== "all") {
    params.set("category", category);
  }

  return `/admin/products?${params.toString()}`;
}

function adminProductEditHref(password: string, productId: string, category?: string) {
  const params = new URLSearchParams({
    password,
    product: productId
  });

  if (category && category !== "all") {
    params.set("category", category);
  }

  return `/admin/products?${params.toString()}`;
}

function ProductListRow({
  password,
  product,
  selectedCategory
}: {
  password: string;
  product: ProductWithVariants;
  selectedCategory: string;
}) {
  const imageUrl = product.image_url || product.image_url_2 || product.image_url_3;

  return (
    <article className="grid gap-3 rounded border border-slate-200 bg-white p-3 text-sm md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[11px] text-slate-400">No image</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold text-slate-950">{product.name}</h2>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {product.status}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-600">{product.slug}</p>
        <p className="mt-1 text-xs text-slate-500">
          {product.category || "Uncategorized"} · {product.product_variants.length} specifications / 规格
        </p>
      </div>
      <Link
        href={adminProductEditHref(password, product.id, selectedCategory)}
        className="inline-flex h-9 items-center justify-center rounded bg-slate-950 px-4 text-sm font-semibold text-white"
      >
        Edit / 编辑
      </Link>
    </article>
  );
}

function ProductAdminPanel({
  password,
  product,
  selectedCategory
}: {
  password: string;
  product: ProductWithVariants;
  selectedCategory: string;
}) {
  const nextStatus = product.status === "active" ? "inactive" : "active";
  const bulkFormId = `save-all-variants-${product.id}`;

  return (
    <article className="rounded border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href={adminProductsHref(password, selectedCategory)}
            className="mb-2 inline-flex text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            Back to product list / 返回产品列表
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">{product.name}</h2>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
              {product.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">{product.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleProductStatus}>
            <input type="hidden" name="password" value={password} />
            <input type="hidden" name="product_id" value={product.id} />
            <input type="hidden" name="status" value={nextStatus} />
            <input type="hidden" name="return_category" value={selectedCategory} />
            <input type="hidden" name="return_product" value={product.id} />
            <button
              type="submit"
              className="h-8 rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-800"
            >
              {product.status === "active" ? "Set Inactive / 下架" : "Set Active / 上架"}
            </button>
          </form>
          <form action={deleteProduct}>
            <input type="hidden" name="password" value={password} />
            <input type="hidden" name="product_id" value={product.id} />
            <input type="hidden" name="return_category" value={selectedCategory} />
            <button
              type="submit"
              className="h-8 rounded border border-red-300 px-2.5 text-xs font-semibold text-red-700"
            >
              Delete Product / 删除产品
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(360px,0.42fr)_minmax(0,0.58fr)]">
        <section className="rounded border border-slate-200 bg-slate-50 p-2.5">
          <h3 className="text-sm font-semibold text-slate-950">Edit Product / 编辑产品</h3>
          <ProductForm
            password={password}
            product={product}
            selectedCategory={selectedCategory}
          />
        </section>

        <section className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">Specifications / 产品规格</h3>
          <div className="mt-2 overflow-x-auto rounded border border-slate-200">
            <table className="min-w-[720px] table-fixed border-collapse text-[11px]">
              <colgroup>
                <col className="w-32" />
                <col className="w-36" />
                <col className="w-28" />
                <col className="w-20" />
                <col className="w-20" />
                <col className="w-32" />
                <col className="w-24" />
              </colgroup>
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="border border-slate-200 px-1.5 py-1">sku / 规格编码</th>
                  <th className="border border-slate-200 px-1.5 py-1">size / 尺码</th>
                  <th className="border border-slate-200 px-1.5 py-1">color / 颜色</th>
                  <th className="border border-slate-200 px-1.5 py-1">unit / 单位</th>
                  <th className="border border-slate-200 px-1.5 py-1">price / 单价</th>
                  <th className="border border-slate-200 px-1.5 py-1">stock_status / 库存状态</th>
                  <th className="border border-slate-200 px-1.5 py-1">actions / 操作</th>
                </tr>
              </thead>
              <tbody>
                {product.product_variants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-slate-200 px-2 py-3 text-center text-slate-500"
                    >
                      No specifications yet. 暂无规格。
                    </td>
                  </tr>
                ) : (
                  product.product_variants.map((variant) => (
                    <tr key={variant.id} className="align-top">
                      <td className="break-words border border-slate-200 px-1.5 py-1 font-medium leading-snug text-slate-950">
                        <form id={`save-variant-${variant.id}`} action={saveProductVariant}>
                          <input type="hidden" name="password" value={password} />
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="product_slug" value={product.slug} />
                          <input type="hidden" name="variant_id" value={variant.id} />
                          <input type="hidden" name="return_category" value={selectedCategory} />
                          <input type="hidden" name="return_product" value={product.id} />
                        </form>
                        {variant.sku}
                      </td>
                      <td className="border border-slate-200 px-1 py-1 text-slate-700">
                        <input
                          form={`save-variant-${variant.id}`}
                          name="size"
                          defaultValue={variant.size ?? ""}
                          data-bulk-variant-id={variant.id}
                          data-bulk-variant-field="size"
                          className="h-7 w-32 rounded border border-slate-300 px-1.5 text-[11px] outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-1 py-1 text-slate-700">
                        <ColorSelect
                          form={`save-variant-${variant.id}`}
                          name="color"
                          defaultValue={variant.color ?? ""}
                          bulkVariantId={variant.id}
                          bulkVariantField="color"
                        />
                      </td>
                      <td className="border border-slate-200 px-1 py-1 text-slate-700">
                        <UnitSelect
                          form={`save-variant-${variant.id}`}
                          name="unit"
                          defaultValue={variant.unit}
                          bulkVariantId={variant.id}
                          bulkVariantField="unit"
                        />
                      </td>
                      <td className="border border-slate-200 px-1 py-1 text-slate-700">
                        <input
                          form={`save-variant-${variant.id}`}
                          name="price"
                          type="number"
                          step="0.01"
                          defaultValue={variant.price === null || variant.price === undefined ? "" : String(variant.price)}
                          data-bulk-variant-id={variant.id}
                          data-bulk-variant-field="price"
                          className="h-7 w-16 rounded border border-slate-300 px-1.5 text-[11px] outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-1 py-1 text-slate-700">
                        <select
                          form={`save-variant-${variant.id}`}
                          name="stock_status"
                          defaultValue={variant.stock_status}
                          data-bulk-variant-id={variant.id}
                          data-bulk-variant-field="stock_status"
                          className="h-7 w-28 rounded border border-slate-300 px-1.5 text-[11px] outline-none focus:border-slate-500"
                        >
                          <option value="in_stock">in_stock / 有货</option>
                          <option value="out_of_stock">out_of_stock / 缺货</option>
                          <option value="preorder">preorder / 可预订</option>
                        </select>
                      </td>
                      <td className="border border-slate-200 px-1 py-1">
                        <div className="flex min-w-20 flex-col gap-1">
                          <button
                            form={`save-variant-${variant.id}`}
                            type="submit"
                            className="h-7 rounded bg-slate-950 px-2 text-[11px] font-semibold text-white"
                          >
                            Save / 保存
                          </button>
                          <form action={deleteProductVariant}>
                            <input type="hidden" name="password" value={password} />
                            <input type="hidden" name="variant_id" value={variant.id} />
                            <input type="hidden" name="return_category" value={selectedCategory} />
                            <input type="hidden" name="return_product" value={product.id} />
                            <button
                              type="submit"
                              className="h-7 w-full rounded border border-red-300 px-2 text-[11px] font-semibold text-red-700"
                            >
                              Delete / 删除
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {product.product_variants.length > 0 ? (
            <form
              id={bulkFormId}
              action={saveProductVariantsBulk}
              className="mt-2 flex flex-col gap-2 rounded border border-blue-100 bg-blue-50 p-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <input type="hidden" name="password" value={password} />
              <input type="hidden" name="product_id" value={product.id} />
              <input type="hidden" name="product_slug" value={product.slug} />
              <input type="hidden" name="return_category" value={selectedCategory} />
              <input type="hidden" name="return_product" value={product.id} />
              {product.product_variants.map((variant) => (
                <input
                  key={variant.id}
                  type="hidden"
                  name="variant_ids"
                  value={variant.id}
                />
              ))}
              <p className="text-[11px] text-blue-900">
                Save all changed specification rows at once. 一次保存当前表格所有规格。
              </p>
              <BulkVariantSaveButton formId={bulkFormId} />
            </form>
          ) : null}

          <div className="mt-3 max-w-3xl">
            <div>
              <h4 className="text-xs font-semibold text-slate-950">New Specification / 新增规格</h4>
              <VariantForm
                password={password}
                productId={product.id}
                productSlug={product.slug}
                selectedCategory={selectedCategory}
              />
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

function ProductForm({
  password,
  product,
  selectedCategory
}: {
  password: string;
  product?: ProductWithVariants;
  selectedCategory?: string;
}) {
  return (
    <form
      action={saveProduct}
      className="mt-2 grid gap-2 md:grid-cols-2"
    >
      <input type="hidden" name="password" value={password} />
      {product ? <input type="hidden" name="product_id" value={product.id} /> : null}
      {product ? <input type="hidden" name="slug" value={product.slug} /> : null}
      {selectedCategory ? <input type="hidden" name="return_category" value={selectedCategory} /> : null}
      {product ? <input type="hidden" name="return_product" value={product.id} /> : null}
      <TextField label="name / 产品名称" name="name" defaultValue={product?.name} required />
      <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] leading-snug text-slate-600">
        slug is generated automatically from the product name.
        {product?.slug ? (
          <span className="mt-1 block font-semibold text-slate-800">
            Current slug: {product.slug}
          </span>
        ) : null}
      </div>
      <CategorySelect defaultValue={product?.category} />
      <div className="grid gap-1.5 md:col-span-2 md:grid-cols-3">
        <ProductImageUploadCard
          label="Main image"
          fileField="image_file"
          imageField="image_url"
          imageUrl={product?.image_url}
          password={password}
          productId={product?.id}
        />
        <ProductImageUploadCard
          label="Secondary image 1"
          fileField="image_file_2"
          imageField="image_url_2"
          imageUrl={product?.image_url_2}
          password={password}
          productId={product?.id}
        />
        <ProductImageUploadCard
          label="Secondary image 2"
          fileField="image_file_3"
          imageField="image_url_3"
          imageUrl={product?.image_url_3}
          password={password}
          productId={product?.id}
        />
      </div>
      <TextField label="material / 材质" name="material" defaultValue={product?.material} />
      <ColorSelect label="color / 默认颜色" name="color" defaultValue={product?.color} />
      <label className="block text-xs font-medium text-slate-700">
        status / 产品状态
        <select
          name="status"
          defaultValue={product?.status ?? "active"}
          className="mt-1 h-8 w-full rounded border border-slate-300 px-2 text-xs outline-none focus:border-slate-500"
        >
          <option value="active">active / 上架</option>
          <option value="inactive">inactive / 下架</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-slate-700 md:col-span-2">
        description / 产品描述
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={1}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
        />
      </label>
      <div className="md:col-span-2">
        <ProductSaveButton isEditing={Boolean(product)} />
      </div>
    </form>
  );
}

function CategorySelect({ defaultValue }: { defaultValue?: string | null }) {
  const selectedValue = normalizeProductCategory(defaultValue) ?? "";
  const options = selectedValue && !PRODUCT_CATEGORY_OPTIONS.includes(selectedValue)
    ? [selectedValue, ...PRODUCT_CATEGORY_OPTIONS]
    : [];

  return (
    <label className="block text-xs font-medium text-slate-700">
      category / 分类
      <select
        name="category"
        defaultValue={selectedValue}
        className="mt-0.5 h-7 w-full rounded border border-slate-300 px-2 text-[11px] outline-none focus:border-slate-500"
      >
        <option value="">Select category / 选择分类</option>
        {options.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
        {PRODUCT_CATEGORY_TREE.flatMap((category) =>
          renderCategoryOptions(category)
        )}
      </select>
    </label>
  );
}

function renderCategoryOptions(category: ProductCategoryNode, level = 0): ReactNode[] {
  return [
    <option key={category.name} value={category.name}>
      {level > 0 ? `${"— ".repeat(level)}${category.name}` : category.name}
    </option>,
    ...(category.children ?? []).flatMap((childCategory) =>
      renderCategoryOptions(childCategory, level + 1)
    )
  ];
}

function ColorSelect({
  label,
  name,
  defaultValue,
  form,
  bulkVariantId,
  bulkVariantField
}: {
  label?: string;
  name: string;
  defaultValue?: string | null;
  form?: string;
  bulkVariantId?: string;
  bulkVariantField?: string;
}) {
  const selectedValue = defaultValue?.trim() ?? "";
  const options = selectedValue && !PRODUCT_COLOR_OPTIONS.includes(selectedValue)
    ? [selectedValue, ...PRODUCT_COLOR_OPTIONS]
    : PRODUCT_COLOR_OPTIONS;
  const select = (
    <select
      form={form}
      name={name}
      defaultValue={selectedValue}
      data-bulk-variant-id={bulkVariantId}
      data-bulk-variant-field={bulkVariantField}
      className={
        form
          ? "h-7 w-28 rounded border border-slate-300 px-1.5 text-[11px] outline-none focus:border-slate-500"
          : "mt-0.5 h-7 w-full rounded border border-slate-300 px-2 text-[11px] outline-none focus:border-slate-500"
      }
    >
      <option value="">Select color</option>
      {options.map((color) => (
        <option key={color} value={color}>
          {color}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      {select}
    </label>
  );
}

function UnitSelect({
  label,
  name,
  defaultValue,
  form,
  bulkVariantId,
  bulkVariantField
}: {
  label?: string;
  name: string;
  defaultValue?: string | null;
  form?: string;
  bulkVariantId?: string;
  bulkVariantField?: string;
}) {
  const selectedValue = defaultValue?.trim() ?? "";
  const options = selectedValue && !PRODUCT_UNIT_OPTIONS.includes(selectedValue)
    ? [selectedValue, ...PRODUCT_UNIT_OPTIONS]
    : PRODUCT_UNIT_OPTIONS;
  const select = (
    <select
      form={form}
      name={name}
      defaultValue={selectedValue || "piece"}
      data-bulk-variant-id={bulkVariantId}
      data-bulk-variant-field={bulkVariantField}
      className={
        form
          ? "h-7 w-16 rounded border border-slate-300 px-1.5 text-[11px] outline-none focus:border-slate-500"
          : "mt-0.5 h-7 w-full rounded border border-slate-300 px-2 text-[11px] outline-none focus:border-slate-500"
      }
    >
      {options.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      {select}
    </label>
  );
}

function VariantForm({
  password,
  productId,
  productSlug,
  selectedCategory
}: {
  password: string;
  productId: string;
  productSlug: string;
  selectedCategory: string;
}) {
  return (
    <form action={saveProductVariant} className="mt-2 grid gap-2 rounded border border-slate-200 p-2">
      <input type="hidden" name="password" value={password} />
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="product_slug" value={productSlug} />
      <input type="hidden" name="return_category" value={selectedCategory} />
      <input type="hidden" name="return_product" value={productId} />
      <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
        SKU is generated automatically from product, size, and color.
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <TextField label="size / 尺码" name="size" />
        <ColorSelect label="color / 颜色" name="color" />
        <UnitSelect label="unit / 单位" name="unit" defaultValue="piece" />
        <TextField
          label="price / 单价"
          name="price"
          type="number"
          step="0.01"
        />
      </div>
      <label className="block text-xs font-medium text-slate-700">
        stock_status / 库存状态
        <select
          name="stock_status"
          defaultValue="in_stock"
          className="mt-0.5 h-7 w-full rounded border border-slate-300 px-2 text-[11px] outline-none focus:border-slate-500"
        >
          <option value="in_stock">in_stock / 有货</option>
          <option value="out_of_stock">out_of_stock / 缺货</option>
          <option value="preorder">preorder / 可预订</option>
        </select>
      </label>
      <button
        type="submit"
        className="h-8 rounded bg-slate-950 px-3 text-xs font-semibold text-white"
      >
        Add Specification / 添加规格
      </button>
    </form>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  step
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      {required ? <span className="text-red-600"> *</span> : null}
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-0.5 h-7 w-full rounded border border-slate-300 px-2 text-[11px] outline-none focus:border-slate-500"
      />
    </label>
  );
}

function AdminAccessMessage({
  reason
}: {
  reason: "missing_config" | "unauthorized";
}) {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-slate-950">Admin Products / 产品后台</h1>
        {reason === "missing_config" ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ADMIN_PASSWORD is not configured. Add it to your environment variables
            before viewing the admin product pages.
          </p>
        ) : (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Invalid admin password. Open this page with ?password=YOUR_ADMIN_PASSWORD.
          </p>
        )}
      </section>
    </main>
  );
}
