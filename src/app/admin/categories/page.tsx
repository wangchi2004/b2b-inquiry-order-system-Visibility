import Link from "next/link";
import { ConfirmCategoryDeleteButton } from "@/components/ConfirmCategoryDeleteButton";
import { Header } from "@/components/Header";
import { SampleFileManager } from "@/components/SampleFileManager";
import { getCatalogFiles, type CatalogFile } from "@/data/catalog";
import { checkAdminAccess } from "@/lib/admin";
import {
  buildCategoryTree,
  getCatalogCategories,
  type CatalogCategory
} from "@/lib/catalogCategories";
import {
  flattenCategoryTree,
  type ProductCategoryNode
} from "@/lib/productCategories";
import {
  deleteCatalogCategory,
  saveCatalogCategory
} from "./actions";

type CategoriesPageProps = {
  searchParams: Promise<{
    password?: string;
    category?: string;
    message?: string;
  }>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const params = await searchParams;
  const access = checkAdminAccess(params.password);

  if (!access.ok) {
    return <AdminAccessMessage reason={access.reason} />;
  }

  let categories: CatalogCategory[] = [];
  let sampleFiles: CatalogFile[] = [];
  let loadError: string | null = null;
  let sampleFilesError: string | null = null;

  try {
    categories = await getCatalogCategories({
      includeInactive: true,
      includeProductCounts: true
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Categories failed to load.";
  }

  try {
    sampleFiles = await getCatalogFiles();
  } catch (error) {
    sampleFilesError = error instanceof Error
      ? error.message
      : "Sample files failed to load.";
  }

  const tree = buildCategoryTree(categories);
  const selected = categories.find((category) => category.id === params.category) ?? null;
  const descendantIds: Set<string> = selected
    ? new Set<string>(getDescendantIds(selected.id, tree))
    : new Set<string>();
  const activeCategories = categories.filter((category) => category.status === "active");
  const totalAssigned = categories.reduce(
    (total, category) => total + category.directProductCount,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Admin / 后台</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Product Categories / 产品分类目录
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage hierarchy, order, four-language names, and safe product migration.
              管理分类层级、顺序、四语名称和产品安全迁移。
            </p>
          </div>
          <Link
            href={`/admin/products?password=${encodeURIComponent(access.password)}`}
            className="inline-flex h-10 items-center justify-center rounded border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800"
          >
            Products / 产品管理
          </Link>
        </div>

        {params.message ? <MessageBanner message={params.message} /> : null}
        {loadError ? <MessageBanner message={loadError} error /> : null}
        {sampleFilesError ? <MessageBanner message={sampleFilesError} error /> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Categories / 分类" value={String(categories.length)} />
          <Metric label="Active / 前台显示" value={String(activeCategories.length)} />
          <Metric label="Assigned products / 已归类产品" value={String(totalAssigned)} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Website Directory Preview / 网站目录预览
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Active categories appear on the website in this order.
                  前台按此层级和顺序显示启用分类。
                </p>
              </div>
              <Link
                href={`/admin/categories?password=${encodeURIComponent(access.password)}`}
                className="rounded bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
              >
                + New / 新增
              </Link>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                <span>All products / 全部产品</span>
                <span>{totalAssigned}</span>
              </div>
              <CategoryPreviewTree
                nodes={tree}
                categories={categories}
                password={access.password}
                selectedId={selected?.id ?? null}
              />
            </div>

            {categories.some((category) => category.status === "inactive") ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  Hidden categories / 已隐藏分类
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories
                    .filter((category) => category.status === "inactive")
                    .map((category) => (
                      <Link
                        key={category.id}
                        href={categoryHref(access.password, category.id)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                      >
                        {category.name}
                      </Link>
                    ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-4">
            <h2 className="text-lg font-semibold text-slate-950">
              {selected ? "Edit Category / 编辑分类" : "New Category / 新增分类"}
            </h2>
            <form action={saveCatalogCategory} className="mt-5 space-y-4">
              <input type="hidden" name="password" value={access.password} />
              <input type="hidden" name="category_id" value={selected?.id ?? ""} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="English name / 英文名称" name="name" value={selected?.name} required />
                <Field label="Slug / 链接标识" name="slug" value={selected?.slug} placeholder="sneaker-soles" required />
                <Field label="中文名称" name="name_zh" value={selected?.translations.zh} />
                <Field label="한국어 이름" name="name_ko" value={selected?.translations.ko} />
                <Field label="日本語名" name="name_ja" value={selected?.translations.ja} />
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Parent / 上级分类
                  <select
                    name="parent_id"
                    defaultValue={selected?.parent_id ?? ""}
                    className="h-10 rounded border border-slate-300 bg-white px-3 font-normal"
                  >
                    <option value="">Top level / 顶级分类</option>
                    {tree.flatMap((node) =>
                      renderParentOptions(node, selected?.id, descendantIds)
                    )}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Order / 排序号
                  <input
                    type="number"
                    min="0"
                    step="10"
                    name="sort_order"
                    defaultValue={selected?.sort_order ?? nextSortOrder(categories)}
                    className="h-10 rounded border border-slate-300 px-3 font-normal"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Status / 状态
                  <select
                    name="status"
                    defaultValue={selected?.status ?? "active"}
                    className="h-10 rounded border border-slate-300 bg-white px-3 font-normal"
                  >
                    <option value="active">Active / 前台显示</option>
                    <option value="inactive">Inactive / 隐藏</option>
                  </select>
                </label>
              </div>
              <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                Smaller order numbers appear first. Changing the English name automatically updates assigned products.
                排序号越小越靠前；修改英文名时，已归类产品会自动同步。
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="h-11 rounded bg-slate-950 px-5 text-sm font-semibold text-white">
                  Save Category / 保存分类
                </button>
                {selected ? (
                  <Link
                    href={`/admin/categories?password=${encodeURIComponent(access.password)}`}
                    className="inline-flex h-11 items-center rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                  >
                    Cancel / 取消
                  </Link>
                ) : null}
              </div>
            </form>

            {selected ? (
              <form action={deleteCatalogCategory} className="mt-6 border-t border-red-100 pt-5">
                <input type="hidden" name="password" value={access.password} />
                <input type="hidden" name="category_id" value={selected.id} />
                <h3 className="text-sm font-semibold text-red-800">Safe Delete / 安全删除</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Direct products: {selected.directProductCount}. Categories with children cannot be deleted.
                  直属产品：{selected.directProductCount}。有子分类时不能删除。
                </p>
                <label className="mt-3 grid gap-1 text-sm font-semibold text-slate-700">
                  Move products to / 产品迁移到
                  <select
                    name="replacement_category_id"
                    className="h-10 rounded border border-slate-300 bg-white px-3 font-normal"
                    required={selected.directProductCount > 0}
                  >
                    <option value="">{selected.directProductCount ? "Choose replacement / 选择迁移分类" : "No replacement needed / 无需迁移"}</option>
                    {activeCategories
                      .filter((category) => category.id !== selected.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                  </select>
                </label>
                <ConfirmCategoryDeleteButton
                  categoryName={selected.name}
                  productCount={selected.directProductCount}
                />
              </form>
            ) : null}
          </section>
        </div>

        <SampleFileManager
          password={access.password}
          files={sampleFiles}
          returnCategoryId={selected?.id}
        />
      </section>
    </main>
  );
}

function CategoryPreviewTree({
  nodes,
  categories,
  password,
  selectedId,
  level = 0
}: {
  nodes: ProductCategoryNode[];
  categories: CatalogCategory[];
  password: string;
  selectedId: string | null;
  level?: number;
}) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return (
    <div className={level ? "ml-4 border-l border-slate-200 pl-2" : "space-y-1"}>
      {nodes
        .filter((node) => node.status === "active")
        .map((node) => {
          const category = node.id ? categoryMap.get(node.id) : null;
          const total = getTreeProductCount(node, categoryMap);
          return (
            <div key={node.id ?? node.name} className="mt-1">
              <Link
                href={categoryHref(password, node.id ?? "")}
                className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm ${
                  selectedId === node.id
                    ? "bg-blue-600 font-semibold text-white"
                    : "bg-white text-slate-800 hover:bg-blue-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{category?.translations.zh ?? node.name}</span>
                  <span className={`block truncate text-[11px] ${selectedId === node.id ? "text-blue-100" : "text-slate-400"}`}>
                    {node.name}
                  </span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${selectedId === node.id ? "bg-white/15" : "bg-slate-100 text-slate-600"}`}>{total}</span>
              </Link>
              {node.children?.length ? (
                <CategoryPreviewTree
                  nodes={node.children}
                  categories={categories}
                  password={password}
                  selectedId={selectedId}
                  level={level + 1}
                />
              ) : null}
            </div>
          );
        })}
    </div>
  );
}

function getTreeProductCount(
  node: ProductCategoryNode,
  categories: Map<string, CatalogCategory>
): number {
  const direct = node.id ? categories.get(node.id)?.directProductCount ?? 0 : 0;
  return direct + (node.children ?? []).reduce(
    (sum, child) => sum + getTreeProductCount(child, categories),
    0
  );
}

function getDescendantIds(id: string, tree: ProductCategoryNode[]): string[] {
  const node = flattenCategoryTree(tree).find((item) => item.id === id);
  return node ? flattenCategoryTree(node.children ?? []).flatMap((item) => item.id ?? []) : [];
}

function renderParentOptions(
  node: ProductCategoryNode,
  selectedId: string | undefined,
  descendantIds: Set<string>,
  level = 0
): React.ReactNode[] {
  const isUnavailable =
    node.status === "inactive" ||
    node.id === selectedId ||
    (node.id ? descendantIds.has(node.id) : false);
  return [
    <option key={node.id ?? node.name} value={node.id ?? ""} disabled={isUnavailable}>
      {`${"— ".repeat(level)}${node.name}${node.status === "inactive" ? " (inactive)" : ""}`}
    </option>,
    ...(node.children ?? []).flatMap((child) =>
      renderParentOptions(child, selectedId, descendantIds, level + 1)
    )
  ];
}

function Field({ label, name, value, placeholder, required = false }: {
  label: string;
  name: string;
  value?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input name={name} defaultValue={value ?? ""} placeholder={placeholder} required={required} className="h-10 rounded border border-slate-300 px-3 font-normal" />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div>;
}

function MessageBanner({ message, error = false }: { message: string; error?: boolean }) {
  const isError = error || /failed|required|cannot|choose|error/i.test(message);
  return <div className={`mt-5 rounded border p-4 text-sm ${isError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message}</div>;
}

function categoryHref(password: string, categoryId: string) {
  const params = new URLSearchParams({ password });
  if (categoryId) params.set("category", categoryId);
  return `/admin/categories?${params.toString()}`;
}

function nextSortOrder(categories: CatalogCategory[]) {
  return Math.max(0, ...categories.filter((category) => !category.parent_id).map((category) => category.sort_order)) + 10;
}

function AdminAccessMessage({ reason }: { reason: "missing_config" | "unauthorized" }) {
  return <main className="min-h-screen"><Header /><section className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-3xl font-semibold text-slate-950">Product Categories / 产品分类目录</h1><p className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{reason === "missing_config" ? "ADMIN_PASSWORD is not configured. 请先配置 ADMIN_PASSWORD。" : "Invalid admin password. 管理员密码不正确。"}</p></section></main>;
}
